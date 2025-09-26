import { describe, it, expect } from '@jest/globals';
import { engineerFeatures, calculateRiskScore } from '../lib/feature-engineering';
import type { Host } from '../schemas/host';

describe('Feature Engineering Tests', () => {
  describe('calculateRiskScore', () => {
    it('should return 0 for host with no risks', () => {
      const features = {
        risk_score: 0,
        risk_level: 'low' as const,
        total_open_ports: 0,
        critical_ports: [],
        vulnerability_count: 0,
        critical_vulnerabilities: 0,
        high_vulnerabilities: 0,
        service_diversity: 0,
        has_web_services: false,
        has_remote_access: false,
        outdated_software_count: 0
      };

      const score = calculateRiskScore(features);
      expect(score).toBe(0);
    });

    it('should return high score for critical vulnerabilities', () => {
      const features = {
        risk_score: 0,
        risk_level: 'low' as const,
        total_open_ports: 1,
        critical_ports: [],
        vulnerability_count: 5,
        critical_vulnerabilities: 3,
        high_vulnerabilities: 2,
        service_diversity: 0.2,
        has_web_services: false,
        has_remote_access: false,
        outdated_software_count: 0
      };

      const score = calculateRiskScore(features);
      expect(score).toBeGreaterThan(50);
    });

    it('should increase score for critical ports', () => {
      const features = {
        risk_score: 0,
        risk_level: 'low' as const,
        total_open_ports: 3,
        critical_ports: [22, 3389], // SSH and RDP
        vulnerability_count: 0,
        critical_vulnerabilities: 0,
        high_vulnerabilities: 0,
        service_diversity: 0.5,
        has_web_services: false,
        has_remote_access: true,
        outdated_software_count: 0
      };

      const score = calculateRiskScore(features);
      expect(score).toBeGreaterThan(20);
    });

    it('should cap score at 100', () => {
      const features = {
        risk_score: 0,
        risk_level: 'low' as const,
        total_open_ports: 50,
        critical_ports: [22, 3389, 23, 445, 135],
        vulnerability_count: 50,
        critical_vulnerabilities: 30,
        high_vulnerabilities: 20,
        service_diversity: 1,
        has_web_services: true,
        has_remote_access: true,
        outdated_software_count: 20
      };

      const score = calculateRiskScore(features);
      expect(score).toBe(100);
    });
  });

  describe('engineerFeatures', () => {
    it('should identify critical ports correctly', () => {
      const host: Host = {
        ip: '192.168.1.1',
        location: 'United States',
        as_name: 'Test AS',
        as_number: 12345,
        services: [
          { port: 22, transport_protocol: 'TCP', service_name: 'SSH' },
          { port: 80, transport_protocol: 'TCP', service_name: 'HTTP' },
          { port: 3389, transport_protocol: 'TCP', service_name: 'RDP' }
        ]
      };

      const result = engineerFeatures(host);
      expect(result.critical_ports).toContain(22);
      expect(result.critical_ports).toContain(3389);
      expect(result.critical_ports).not.toContain(80);
    });

    it('should count vulnerabilities by severity', () => {
      const host: Host = {
        ip: '10.0.0.1',
        location: 'Germany',
        as_name: 'Test AS',
        as_number: 54321,
        services: [
          {
            port: 443,
            transport_protocol: 'TCP',
            service_name: 'HTTPS',
            vulnerabilities: [
              { cve_id: 'CVE-2023-1', severity: 'CRITICAL', description: 'Critical vuln' },
              { cve_id: 'CVE-2023-2', severity: 'HIGH', cvss_score: 7.5, description: 'High vuln' },
              { cve_id: 'CVE-2023-3', severity: 'MEDIUM', description: 'Medium vuln' },
              { cve_id: 'CVE-2023-4', severity: 'LOW', description: 'Low vuln' }
            ]
          }
        ]
      };

      const result = engineerFeatures(host);
      expect(result.vulnerability_count).toBe(4);
      expect(result.critical_vulnerabilities).toBe(1);
      expect(result.high_vulnerabilities).toBe(1);
    });

    it('should detect web services', () => {
      const host: Host = {
        ip: '172.16.0.1',
        location: 'Canada',
        as_name: 'Web Host AS',
        as_number: 11111,
        services: [
          { port: 80, transport_protocol: 'TCP', service_name: 'HTTP' },
          { port: 443, transport_protocol: 'TCP', service_name: 'HTTPS' },
          { port: 8080, transport_protocol: 'TCP', service_name: 'HTTP-PROXY' }
        ]
      };

      const result = engineerFeatures(host);
      expect(result.has_web_services).toBe(true);
    });

    it('should calculate service diversity', () => {
      const host: Host = {
        ip: '192.168.100.1',
        location: 'Japan',
        as_name: 'Diverse AS',
        as_number: 99999,
        services: [
          { port: 22, transport_protocol: 'TCP', service_name: 'SSH' },
          { port: 80, transport_protocol: 'TCP', service_name: 'HTTP' },
          { port: 443, transport_protocol: 'TCP', service_name: 'HTTPS' },
          { port: 3306, transport_protocol: 'TCP', service_name: 'MySQL' },
          { port: 5432, transport_protocol: 'TCP', service_name: 'PostgreSQL' }
        ]
      };

      const result = engineerFeatures(host);
      expect(result.service_diversity).toBe(1); // All services have unique names
    });

    it('should assign correct risk level based on score', () => {
      const lowRiskHost: Host = {
        ip: '192.168.1.1',
        location: 'Safe Location',
        as_name: 'Safe AS',
        as_number: 12345,
        services: [
          { port: 80, transport_protocol: 'TCP', service_name: 'HTTP' }
        ]
      };

      const highRiskHost: Host = {
        ip: '192.168.1.2',
        location: 'Risk Location',
        as_name: 'Risk AS',
        as_number: 12346,
        services: [
          { 
            port: 22, 
            transport_protocol: 'TCP', 
            service_name: 'SSH',
            vulnerabilities: [
              { cve_id: 'CVE-2023-1', severity: 'CRITICAL', cvss_score: 9.8, description: 'RCE vulnerability' },
              { cve_id: 'CVE-2023-2', severity: 'CRITICAL', cvss_score: 9.5, description: 'Auth bypass' }
            ]
          },
          { port: 3389, transport_protocol: 'TCP', service_name: 'RDP' },
          { port: 23, transport_protocol: 'TCP', service_name: 'Telnet' }
        ]
      };

      const lowRiskResult = engineerFeatures(lowRiskHost);
      const highRiskResult = engineerFeatures(highRiskHost);

      expect(lowRiskResult.risk_level).toBe('low');
      expect(highRiskResult.risk_score).toBeGreaterThan(50);
      expect(['high', 'critical']).toContain(highRiskResult.risk_level);
    });
  });
});