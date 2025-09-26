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
    // First attempt
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });
    
    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');
    
    try {
      const parsed = JSON.parse(content);
      return SummarySchema.parse(parsed);
    } catch (parseError) {
      // Retry with error feedback
      console.error('First parse attempt failed:', parseError);
      
      const retryResponse = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: content },
          { role: 'user', content: `Invalid JSON. Error: ${parseError}. Return valid JSON only matching the schema.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000,
      });
      
      const retryContent = retryResponse.choices[0].message.content;
      if (!retryContent) throw new Error('Empty retry response from OpenAI');
      
      const retryParsed = JSON.parse(retryContent);
      return SummarySchema.parse(retryParsed);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to template-based summary
    return generateTemplateSummary(host, features);
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