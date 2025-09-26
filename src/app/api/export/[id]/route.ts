import { NextRequest, NextResponse } from 'next/server';
import { persistentHostCache } from '@/lib/persistent-cache';
import { ErrorResponseSchema } from '@/schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const format = request.nextUrl.searchParams.get('format') || 'json';
    
    console.log(`Export request for ID: ${id}, format: ${format}`); // Debug log
    
    // Get host from cache
    const cached = persistentHostCache.get(id);
    
    if (!cached) {
      console.log(`Host with ID ${id} not found in cache`); // Debug log
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: `Host with ID ${id} not found`,
        },
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }
    
    console.log(`Host found in cache, IP: ${cached.host?.ip}`); // Debug log
    
    // Validate cached data
    if (!cached.host || !cached.features) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_DATA',
          message: `Incomplete host data for ID ${id}`,
        },
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Prepare export data
    const exportData = {
      host: cached.host,
      features: cached.features,
      summary: cached.summary || null,
      metadata: {
        analyzed_at: cached.createdAt.toISOString(),
        summarized_at: cached.summarizedAt?.toISOString() || null,
        risk_score: cached.features.risk_score,
        risk_level: cached.features.risk_level,
      },
    };
    
    if (format === 'json') {
      // Return as JSON download
      const jsonContent = JSON.stringify(exportData, null, 2);
      const filename = `host_${cached.host.ip.replace(/[^a-zA-Z0-9]/g, '_')}_analysis.json`;
      
      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else if (format === 'md') {
      // Generate Markdown
      const markdown = generateMarkdown(exportData);
      const filename = `host_${cached.host.ip.replace(/[^a-zA-Z0-9]/g, '_')}_analysis.md`;
      
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_FORMAT',
          message: 'Format must be either "json" or "md"',
        },
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
  } catch (error) {
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'EXPORT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export data',
      },
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

function generateMarkdown(data: any): string {
  const { host, features, summary, metadata } = data;
  
  let markdown = `# Censys Host Analysis Report\n\n`;
  markdown += `## Host Information\n\n`;
  markdown += `- **IP Address**: ${host.ip}\n`;
  markdown += `- **Location**: ${host.location.city}, ${host.location.country} (${host.location.country_code})\n`;
  markdown += `- **AS Number**: ${host.autonomous_system.asn} (${host.autonomous_system.name})\n`;
  
  if (host.dns?.hostname) {
    markdown += `- **Hostname**: ${host.dns.hostname}\n`;
  }
  
  markdown += `\n## Risk Assessment\n\n`;
  markdown += `- **Risk Score**: ${features.risk_score}/100\n`;
  markdown += `- **Risk Level**: ${features.risk_level.toUpperCase()}\n`;
  markdown += `- **Total Services**: ${features.service_count}\n`;
  markdown += `\n### Vulnerability Breakdown\n\n`;
  markdown += `- Critical: ${features.vulnerability_counts.critical}\n`;
  markdown += `- High: ${features.vulnerability_counts.high}\n`;
  markdown += `- Medium: ${features.vulnerability_counts.medium}\n`;
  markdown += `- Low: ${features.vulnerability_counts.low}\n`;
  
  if (features.has_malware) {
    markdown += `\n⚠️ **MALWARE DETECTED**\n`;
  }
  
  markdown += `\n## Services\n\n`;
  if (host.services && Array.isArray(host.services)) {
    host.services.forEach((service: any, index: number) => {
      markdown += `### Service ${index + 1}: ${service.protocol} on port ${service.port}\n\n`;
      
      if (service.banner) {
        markdown += `- **Banner**: ${service.banner}\n`;
      }
      
      if (service.software && Array.isArray(service.software) && service.software.length > 0) {
        const software = service.software[0];
        markdown += `- **Software**: ${software.product}`;
        if (software.vendor) {
          markdown += ` by ${software.vendor}`;
        }
        if (software.version) {
          markdown += ` v${software.version}`;
        }
        markdown += `\n`;
      }
      
      if (service.vulnerabilities && Array.isArray(service.vulnerabilities) && service.vulnerabilities.length > 0) {
        markdown += `- **Vulnerabilities**: ${service.vulnerabilities.length} found\n`;
        service.vulnerabilities.forEach((vuln: any) => {
          markdown += `  - ${vuln.cve_id} (${vuln.severity.toUpperCase()})`;
          if (vuln.cvss_score) {
            markdown += `, CVSS: ${vuln.cvss_score}`;
          }
          markdown += `\n`;
        });
      }
      
      if (service.malware_detected) {
        markdown += `- **🚨 Malware**: ${service.malware_detected.name} (${service.malware_detected.type})\n`;
      }
      
      if (service.certificate) {
        markdown += `- **Certificate**: ${service.certificate.subject}\n`;
        if (service.certificate.self_signed) {
          markdown += `  - ⚠️ Self-signed certificate\n`;
        }
      }
      
      markdown += `\n`;
    });
  } else {
    markdown += `No services detected.\n\n`;
  }
  
  if (summary) {
    markdown += `## AI-Generated Summary\n\n`;
    markdown += `### Overview\n${summary.overview}\n\n`;
    markdown += `### Security Posture\n${summary.security_posture}\n\n`;
    markdown += `### Recommendations\n`;
    if (summary.recommendations && Array.isArray(summary.recommendations)) {
      summary.recommendations.forEach((rec: string, index: number) => {
        markdown += `${index + 1}. ${rec}\n`;
      });
    }
    markdown += `\n`;
  }
  
  markdown += `\n## Metadata\n\n`;
  markdown += `- **Analyzed At**: ${metadata.analyzed_at}\n`;
  if (metadata.summarized_at) {
    markdown += `- **Summarized At**: ${metadata.summarized_at}\n`;
  }
  
  return markdown;
}