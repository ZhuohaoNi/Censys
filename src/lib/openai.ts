import OpenAI from 'openai';
import { z } from 'zod';
import { Host, EngineeredFeatures, Summary, SummarySchema } from '@/schemas';

// Initialize OpenAI client with configuration from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
});

// Configuration
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a cybersecurity analyst API that responds ONLY in valid JSON.
Never include explanations, markdown, or text outside the JSON structure.
Your response must validate against the provided JSON schema.`;

/**
 * Generate an AI summary for a host
 */
export async function generateSummary(
  host: Host,
  features: EngineeredFeatures
): Promise<Summary> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    // Return a template-based summary if no API key
    return generateTemplateSummary(host, features);
  }
  
  const userPrompt = generateUserPrompt(host, features);
  
  try {
    // Use Responses API for GPT-5 models, Chat Completions for others
    if (MODEL.startsWith('gpt-5')) {
      return await generateSummaryWithResponsesAPI(userPrompt);
    } else {
      return await generateSummaryWithChatAPI(userPrompt);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to template-based summary
    return generateTemplateSummary(host, features);
  }
}

/**
 * Attempt to fix truncated JSON responses
 */
function attemptJSONFix(truncatedJson: string): string {
  try {
    // Try to complete basic JSON structure
    let fixed = truncatedJson.trim();
    
    // If it ends with a key but no value, remove the key
    if (fixed.endsWith('":')) {
      const lastCommaIndex = fixed.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        fixed = fixed.substring(0, lastCommaIndex);
      }
    }
    
    // Count open braces/brackets to add closing ones
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    
    // Add missing closing brackets and braces
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixed += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += '}';
    }
    
    return fixed;
  } catch (error) {
    console.error('Failed to fix JSON:', error);
    return truncatedJson;
  }
}

/**
 * Generate summary using the new Responses API (for GPT-5 models)
 */
async function generateSummaryWithResponsesAPI(userPrompt: string): Promise<Summary> {
  // Check if Responses API is available
  if (!openai.responses) {
    console.warn('Responses API not available, falling back to Chat Completions API');
    return generateSummaryWithChatAPI(userPrompt);
  }

  try {
    // First attempt with structured output
    const response = await openai.responses.create({
      model: MODEL,
      input: `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nIMPORTANT: You must return complete, valid JSON. End your response with proper closing braces and brackets.`,
      max_output_tokens: 1500, // Increased token limit
      text: {
        format: { type: "json_object" }
      },
      reasoning: { effort: "medium" }
    });

    // Extract the text content from the response
    let outputText: string | null = null;
    
    // Handle different response formats
    if (response.output_text) {
      outputText = response.output_text;
    } else if (response.output && response.output.length > 0) {
      const firstOutput = response.output[0];
      if (firstOutput.type === 'message' && firstOutput.content && firstOutput.content.length > 0) {
        const textContent = firstOutput.content.find(c => c.type === 'output_text');
        if (textContent && 'text' in textContent) {
          outputText = textContent.text;
        }
      }
    }

    if (!outputText) {
      throw new Error('No output text found in Responses API response');
    }

    // Validate that we have complete JSON before parsing
    if (!outputText.trim().endsWith('}')) {
      console.warn('JSON appears to be truncated, attempting to fix:', outputText);
      outputText = attemptJSONFix(outputText);
    }

    try {
      const parsed = JSON.parse(outputText);
      return SummarySchema.parse(parsed);
    } catch (parseError) {
      console.error('First parse attempt failed:', parseError, 'Raw output:', outputText);
      
      // Retry with error feedback using the Responses API
      const retryInput = `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nPrevious response was invalid JSON: ${outputText}\n\nError: ${parseError}\n\nReturn valid JSON only matching the schema.`;
      
      const retryResponse = await openai.responses.create({
        model: MODEL,
        input: retryInput + "\n\nIMPORTANT: Return ONLY complete, valid JSON. Ensure all braces and brackets are closed.",
        max_output_tokens: 1500, // Increased token limit
        text: {
          format: { type: "json_object" }
        },
        reasoning: { effort: "low" }
      });

      let retryOutputText: string | null = null;
      
      if (retryResponse.output_text) {
        retryOutputText = retryResponse.output_text;
      } else if (retryResponse.output && retryResponse.output.length > 0) {
        const firstOutput = retryResponse.output[0];
        if (firstOutput.type === 'message' && firstOutput.content && firstOutput.content.length > 0) {
          const textContent = firstOutput.content.find(c => c.type === 'output_text');
          if (textContent && 'text' in textContent) {
            retryOutputText = textContent.text;
          }
        }
      }

      if (!retryOutputText) {
        throw new Error('No output text in retry Responses API response');
      }

      const retryParsed = JSON.parse(retryOutputText);
      return SummarySchema.parse(retryParsed);
    }
  } catch (error) {
    console.error('Responses API failed, falling back to Chat Completions:', error);
    return generateSummaryWithChatAPI(userPrompt);
  }
}

/**
 * Generate summary using Chat Completions API (for GPT-4 models)
 */
async function generateSummaryWithChatAPI(userPrompt: string): Promise<Summary> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + "\n\nIMPORTANT: You must return complete, valid JSON. End your response with proper closing braces and brackets." },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1500, // Increased token limit
  });
  
  const content = response.choices[0].message.content;
  if (!content) throw new Error('Empty response from OpenAI');
  
  // Validate and fix JSON if needed
  let fixedContent = content.trim();
  if (!fixedContent.endsWith('}')) {
    console.warn('Chat API JSON appears truncated, attempting to fix:', fixedContent);
    fixedContent = attemptJSONFix(fixedContent);
  }
  
  try {
    const parsed = JSON.parse(fixedContent);
    return SummarySchema.parse(parsed);
  } catch (parseError) {
    // Retry with error feedback
    console.error('First parse attempt failed:', parseError);
    
    const retryResponse = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + "\n\nIMPORTANT: Return ONLY complete, valid JSON. Ensure all braces and brackets are closed." },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: fixedContent },
        { role: 'user', content: `Invalid JSON. Error: ${parseError}. Return valid JSON only matching the schema. Make sure to complete all arrays and objects properly.` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500, // Increased token limit
    });
    
    const retryContent = retryResponse.choices[0].message.content;
    if (!retryContent) throw new Error('Empty retry response from OpenAI');
    
    // Fix retry content if needed
    let fixedRetryContent = retryContent.trim();
    if (!fixedRetryContent.endsWith('}')) {
      fixedRetryContent = attemptJSONFix(fixedRetryContent);
    }
    
    const retryParsed = JSON.parse(fixedRetryContent);
    return SummarySchema.parse(retryParsed);
  }
}

/**
 * Generate the user prompt for the LLM
 */
function generateUserPrompt(host: Host, features: EngineeredFeatures): string {
  // Collect critical issues
  const criticalIssues: string[] = [];
  if (features.has_malware) criticalIssues.push('malware detected');
  if (features.has_kev) criticalIssues.push('known exploited vulnerabilities');
  if (features.vulnerability_counts.critical > 0) criticalIssues.push('critical CVEs');
  if (features.self_signed_cert_count > 0) criticalIssues.push('self-signed certificates');
  
  // Find malware details
  let malwareDetails = '';
  host.services.forEach(service => {
    if (service.malware_detected) {
      malwareDetails = `${service.malware_detected.name} (${service.malware_detected.type})`;
    }
  });
  
  return `Analyze this host and return a JSON summary:

Host IP: ${host.ip}
Location: ${host.location.city}, ${host.location.country}
Risk Score: ${features.risk_score}/100 (${features.risk_level})
Services: ${features.service_count} detected
Vulnerabilities: ${features.vulnerability_counts.critical} critical, ${features.vulnerability_counts.high} high, ${features.vulnerability_counts.medium} medium
Key Issues: ${criticalIssues.join(', ') || 'none'}
${malwareDetails ? `Malware: ${malwareDetails}` : ''}

Return JSON matching this exact schema:
{
  "overview": "One paragraph about host location, network (ASN), and apparent purpose based on services",
  "security_posture": "One paragraph analyzing vulnerabilities, malware, and overall security state",
  "recommendations": ["Action 1", "Action 2", "Action 3"],
  "key_metrics": {
    "risk_level": "${features.risk_level}",
    "critical_issues": ${criticalIssues.length},
    "total_vulnerabilities": ${features.vulnerability_counts.critical + features.vulnerability_counts.high + features.vulnerability_counts.medium + features.vulnerability_counts.low}
  }
}`;
}

/**
 * Generate a template-based summary when LLM is unavailable
 */
function generateTemplateSummary(host: Host, features: EngineeredFeatures): Summary {
  const totalVulns = features.vulnerability_counts.critical + 
                     features.vulnerability_counts.high + 
                     features.vulnerability_counts.medium + 
                     features.vulnerability_counts.low;
  
  const criticalIssues: string[] = [];
  if (features.has_malware) criticalIssues.push('malware');
  if (features.has_kev) criticalIssues.push('KEV vulnerabilities');
  if (features.vulnerability_counts.critical > 0) criticalIssues.push(`${features.vulnerability_counts.critical} critical CVEs`);
  
  // Build overview
  const overview = `This host at IP ${host.ip} is located in ${host.location.city}, ${host.location.country}, ` +
    `and belongs to AS${host.autonomous_system.asn} (${host.autonomous_system.name}). ` +
    `The host is running ${features.service_count} services${host.dns?.hostname ? ` and resolves to ${host.dns.hostname}` : ''}.`;
  
  // Build security posture
  let securityPosture = `The host has been assessed with a ${features.risk_level} risk level (score: ${features.risk_score}/100). `;
  
  if (features.has_malware) {
    const malwareService = host.services.find(s => s.malware_detected);
    if (malwareService?.malware_detected) {
      securityPosture += `Critical: ${malwareService.malware_detected.name} malware detected on port ${malwareService.port}. `;
    }
  }
  
  securityPosture += `A total of ${totalVulns} vulnerabilities were found across all services`;
  if (features.vulnerability_counts.critical > 0) {
    securityPosture += `, including ${features.vulnerability_counts.critical} critical severity vulnerabilities`;
  }
  securityPosture += '.';
  
  // Build recommendations
  const recommendations: string[] = [];
  
  if (features.has_malware) {
    recommendations.push('Immediately isolate this host and investigate the malware infection');
  }
  
  if (features.vulnerability_counts.critical > 0) {
    recommendations.push('Apply patches for all critical vulnerabilities, especially CVE-2023-38408');
  }
  
  if (features.has_kev) {
    recommendations.push('Prioritize patching Known Exploited Vulnerabilities (KEV) as they are actively exploited');
  }
  
  if (features.self_signed_cert_count > 0) {
    recommendations.push('Replace self-signed certificates with properly signed certificates from a trusted CA');
  }
  
  if (features.has_non_standard_ssh) {
    recommendations.push('Review SSH configuration and consider moving to standard port 22 with proper firewall rules');
  }
  
  if (features.open_admin_ports.length > 0) {
    recommendations.push(`Restrict access to administrative ports (${features.open_admin_ports.join(', ')}) using firewall rules`);
  }
  
  // Ensure we have at least 3 recommendations
  if (recommendations.length < 3) {
    recommendations.push('Conduct a comprehensive security audit of all services');
    recommendations.push('Implement continuous vulnerability scanning');
    recommendations.push('Review and update security policies and access controls');
  }
  
  return {
    overview,
    security_posture: securityPosture,
    recommendations: recommendations.slice(0, 3),
    key_metrics: {
      risk_level: features.risk_level,
      critical_issues: criticalIssues.length,
      total_vulnerabilities: totalVulns,
    },
  };
}