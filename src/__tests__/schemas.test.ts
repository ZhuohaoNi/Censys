import { describe, it, expect } from '@jest/globals';
import { HostSchema, EngineeredFeaturesSchema, SummarySchema } from '../schemas';

describe('Schema Validation Tests', () => {
  describe('HostSchema', () => {
    it('should validate a valid host object', () => {
      const validHost = {
        ip: '192.168.1.1',
        location: 'United States',
        as_name: 'Example AS',
        as_number: 12345,
        services: [
          {
            port: 80,
            transport_protocol: 'TCP',
            service_name: 'HTTP'
          }
        ]
      };

      const result = HostSchema.safeParse(validHost);
      expect(result.success).toBe(true);
    });

    it('should reject invalid IP address', () => {
      const invalidHost = {
        ip: 'not-an-ip',
        location: 'United States',
        as_name: 'Example AS',
        as_number: 12345,
        services: []
      };

      const result = HostSchema.safeParse(invalidHost);
      expect(result.success).toBe(false);
    });

    it('should validate host with vulnerabilities', () => {
      const hostWithVulns = {
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
              {
                cve_id: 'CVE-2023-12345',
                severity: 'HIGH',
                cvss_score: 7.5,
                description: 'Test vulnerability'
              }
            ]
          }
        ]
      };

      const result = HostSchema.safeParse(hostWithVulns);
      expect(result.success).toBe(true);
    });
  });

  describe('EngineeredFeaturesSchema', () => {
    it('should validate engineered features', () => {
      const features = {
        risk_score: 75,
        risk_level: 'high',
        total_open_ports: 5,
        critical_ports: [22, 3389],
        vulnerability_count: 3,
        critical_vulnerabilities: 1,
        high_vulnerabilities: 2,
        service_diversity: 0.8,
        has_web_services: true,
        has_remote_access: true,
        outdated_software_count: 2
      };

      const result = EngineeredFeaturesSchema.safeParse(features);
      expect(result.success).toBe(true);
    });

    it('should reject invalid risk score', () => {
      const invalidFeatures = {
        risk_score: 150, // Out of range
        risk_level: 'high',
        total_open_ports: 5,
        critical_ports: [],
        vulnerability_count: 0,
        critical_vulnerabilities: 0,
        high_vulnerabilities: 0,
        service_diversity: 0.5,
        has_web_services: false,
        has_remote_access: false,
        outdated_software_count: 0
      };

      const result = EngineeredFeaturesSchema.safeParse(invalidFeatures);
      expect(result.success).toBe(false);
    });

    it('should reject invalid risk level', () => {
      const invalidFeatures = {
        risk_score: 50,
        risk_level: 'extreme', // Not a valid enum value
        total_open_ports: 5,
        critical_ports: [],
        vulnerability_count: 0,
        critical_vulnerabilities: 0,
        high_vulnerabilities: 0,
        service_diversity: 0.5,
        has_web_services: false,
        has_remote_access: false,
        outdated_software_count: 0
      };

      const result = EngineeredFeaturesSchema.safeParse(invalidFeatures);
      expect(result.success).toBe(false);
    });
  });

  describe('SummarySchema', () => {
    it('should validate a complete summary', () => {
      const validSummary = {
        technical_summary: 'This host has multiple vulnerabilities...',
        business_impact: 'The identified vulnerabilities could lead to...',
        security_recommendations: [
          'Update all software to latest versions',
          'Close unnecessary ports',
          'Implement network segmentation'
        ],
        risk_assessment: {
          overall_risk: 'high',
          key_concerns: [
            'Outdated SSH version',
            'Multiple critical vulnerabilities'
          ],
          mitigations_required: true
        }
      };

      const result = SummarySchema.safeParse(validSummary);
      expect(result.success).toBe(true);
    });

    it('should reject empty recommendations array', () => {
      const invalidSummary = {
        technical_summary: 'Summary',
        business_impact: 'Impact',
        security_recommendations: [], // Should have at least one
        risk_assessment: {
          overall_risk: 'low',
          key_concerns: ['Some concern'],
          mitigations_required: false
        }
      };

      const result = SummarySchema.safeParse(invalidSummary);
      expect(result.success).toBe(false);
    });

    it('should reject empty key concerns', () => {
      const invalidSummary = {
        technical_summary: 'Summary',
        business_impact: 'Impact',
        security_recommendations: ['Do something'],
        risk_assessment: {
          overall_risk: 'medium',
          key_concerns: [], // Should have at least one
          mitigations_required: true
        }
      };

      const result = SummarySchema.safeParse(invalidSummary);
      expect(result.success).toBe(false);
    });
  });
});