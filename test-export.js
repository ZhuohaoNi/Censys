// Simple test to validate the export API structure
const testData = {
  host: {
    ip: "192.168.1.1",
    location: {
      city: "San Francisco",
      country: "United States",
      country_code: "US"
    },
    autonomous_system: {
      asn: 12345,
      name: "Test AS"
    },
    services: [
      {
        port: 80,
        protocol: "http",
        banner: "Apache/2.4.41"
      }
    ]
  },
  features: {
    risk_score: 75,
    risk_level: "medium",
    service_count: 1,
    vulnerability_counts: {
      critical: 0,
      high: 1,
      medium: 2,
      low: 0
    },
    has_malware: false
  },
  metadata: {
    analyzed_at: new Date().toISOString(),
    risk_score: 75,
    risk_level: "medium"
  }
};

// Test markdown generation function (copied from API)
function generateMarkdown(data) {
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
    host.services.forEach((service, index) => {
      markdown += `### Service ${index + 1}: ${service.protocol} on port ${service.port}\n\n`;
      
      if (service.banner) {
        markdown += `- **Banner**: ${service.banner}\n`;
      }
      
      markdown += `\n`;
    });
  } else {
    markdown += `No services detected.\n\n`;
  }
  
  return markdown;
}

console.log("Testing markdown generation...");
try {
  const markdown = generateMarkdown(testData);
  console.log("✅ Markdown generation successful");
  console.log("Generated markdown:");
  console.log(markdown);
} catch (error) {
  console.error("❌ Markdown generation failed:", error.message);
}

console.log("\nTesting JSON export...");
try {
  const jsonString = JSON.stringify(testData, null, 2);
  console.log("✅ JSON export successful");
  console.log("JSON size:", jsonString.length, "characters");
} catch (error) {
  console.error("❌ JSON export failed:", error.message);
}