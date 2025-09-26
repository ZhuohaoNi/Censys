import { NextRequest, NextResponse } from 'next/server';
import { hostCache } from '@/lib/cache';
import { ErrorResponseSchema } from '@/schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const format = request.nextUrl.searchParams.get('format') || 'json';
    
    // Get host from cache
    const cached = hostCache.get(id);
    
    if (!cached) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: `Host with ID ${id} not found`,
        },
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }
    
    // Prepare export data
    const exportData = {
      host: cached.host,
      features: cached.features,
      summary: cached.summary,
      metadata: {
        analyzed_at: cached.createdAt.toISOString(),
        summarized_at: cached.summarizedAt?.toISOString(),
        risk_score: cached.features.risk_score,
        risk_level: cached.features.risk_level,
      },
    };
    
    if (format === 'json') {
      // Return as JSON download
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="host_${cached.host.ip}_analysis.json"`,
        },
      });
    } else if (format === 'md') {
      // Generate Markdown
      const markdown = generateMarkdown(exportData);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="host_${cached.host.ip}_analysis.md"`,
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
  host.services.forEach((service: any, index: number) => {
    markdown += `### Service ${index + 1}: ${service.protocol} on port ${service.port}\n\n`;
    
    if (service.banner) {
      markdown += `- **Banner**: ${service.banner}\n`;
    }
    
    if (service.software?.length) {
      markdown += `- **Software**: ${service.software[0].product} ${service.software[0].version || ''}\n`;
    }
    
    if (service.vulnerabilities?.length) {
      markdown += `- **Vulnerabilities**: ${service.vulnerabilities.length} found\n`;
      service.vulnerabilities.forEach((vuln: any) => {
        markdown += `  - ${vuln.cve_id} (${vuln.severity.toUpperCase()}, CVSS: ${vuln.cvss_score})\n`;
      });
    }
    
    if (service.malware_detected) {
      markdown += `- **🚨 Malware**: ${service.malware_detected.name} (${service.malware_detected.type})\n`;
    }
    
    markdown += `\n`;
  });
  
  if (summary) {
    markdown += `## AI-Generated Summary\n\n`;
    markdown += `### Overview\n${summary.overview}\n\n`;
    markdown += `### Security Posture\n${summary.security_posture}\n\n`;
    markdown += `### Recommendations\n`;
    summary.recommendations.forEach((rec: string, index: number) => {
      markdown += `${index + 1}. ${rec}\n`;
    });
  }
  
  markdown += `\n## Metadata\n\n`;
  markdown += `- **Analyzed At**: ${metadata.analyzed_at}\n`;
  if (metadata.summarized_at) {
    markdown += `- **Summarized At**: ${metadata.summarized_at}\n`;
  }
  
  return markdown;
}