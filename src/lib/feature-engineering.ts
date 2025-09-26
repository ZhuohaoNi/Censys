import { Host, Service, Vulnerability, EngineeredFeatures } from '@/schemas';

// Admin ports that are considered risky if exposed
const ADMIN_PORTS = [22, 3389, 5900, 5901, 3306, 5432, 27017, 6379, 9200, 8500];

/**
 * Engineer features from a host for risk scoring
 */
export function engineerFeatures(host: Host): EngineeredFeatures {
  const vulnerabilityCounts = countVulnerabilitiesBySeverity(host.services);
  const hasMalware = detectMalware(host.services);
  const hasKev = detectKevVulnerabilities(host.services);
  const serviceCount = host.services.length;
  const openAdminPorts = findOpenAdminPorts(host.services);
  const selfSignedCertCount = countSelfSignedCerts(host.services);
  const hasNonStandardSsh = detectNonStandardSsh(host.services);
  
  // Calculate risk score based on the features
  const riskScore = calculateRiskScore({
    vulnerability_counts: vulnerabilityCounts,
    has_malware: hasMalware,
    has_kev: hasKev,
    service_count: serviceCount,
    open_admin_ports: openAdminPorts,
    self_signed_cert_count: selfSignedCertCount,
    has_non_standard_ssh: hasNonStandardSsh,
    risk_score: 0, // This will be calculated
    risk_level: 'low', // This will be determined
  });
  
  const riskLevel = determineRiskLevel(riskScore);
  
  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    vulnerability_counts: vulnerabilityCounts,
    has_malware: hasMalware,
    has_kev: hasKev,
    service_count: serviceCount,
    open_admin_ports: openAdminPorts,
    self_signed_cert_count: selfSignedCertCount,
    has_non_standard_ssh: hasNonStandardSsh,
  };
}

/**
 * Count vulnerabilities by severity across all services
 */
function countVulnerabilitiesBySeverity(services: Service[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  services.forEach(service => {
    service.vulnerabilities?.forEach(vuln => {
      counts[vuln.severity]++;
    });
  });
  
  return counts;
}

/**
 * Detect if any service has malware
 */
function detectMalware(services: Service[]): boolean {
  return services.some(service => service.malware_detected !== undefined);
}

/**
 * Detect if any vulnerability is a Known Exploited Vulnerability (KEV)
 */
function detectKevVulnerabilities(services: Service[]): boolean {
  return services.some(service => 
    service.vulnerabilities?.some(vuln => 
      vuln.description?.toLowerCase().includes('known exploited') || false
    ) || false
  );
}

/**
 * Find open admin ports
 */
function findOpenAdminPorts(services: Service[]): number[] {
  return services
    .filter(service => ADMIN_PORTS.includes(service.port))
    .map(service => service.port);
}

/**
 * Count self-signed certificates
 */
function countSelfSignedCerts(services: Service[]): number {
  return services.filter(service => 
    service.certificate?.self_signed === true
  ).length;
}

/**
 * Detect SSH on non-standard port
 */
function detectNonStandardSsh(services: Service[]): boolean {
  return services.some(service => 
    service.protocol === 'SSH' && service.port !== 22
  );
}

/**
 * Calculate risk score (0-100) based on engineered features
 */
export function calculateRiskScore(features: Omit<EngineeredFeatures, 'risk_score' | 'risk_level'>): number {
  let score = 0;
  
  // Vulnerabilities scoring
  score += Math.min(features.vulnerability_counts.critical * 10, 40);
  score += Math.min(features.vulnerability_counts.high * 5, 15);
  score += Math.min(features.vulnerability_counts.medium * 2, 6);
  
  // Malware presence
  if (features.has_malware) {
    score += 25;
  }
  
  // KEV vulnerabilities
  if (features.has_kev) {
    const kevCount = features.vulnerability_counts.critical;
    score += Math.min(kevCount * 8, 24);
  }
  
  // Self-signed certificates
  score += Math.min(features.self_signed_cert_count * 3, 6);
  
  // Non-standard SSH port
  if (features.has_non_standard_ssh) {
    score += 5;
  }
  
  // Open admin ports
  score += Math.min(features.open_admin_ports.length * 2, 8);
  
  return Math.min(score, 100);
}

/**
 * Determine risk level based on risk score
 */
function determineRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}