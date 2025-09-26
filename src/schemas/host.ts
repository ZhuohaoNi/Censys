import { z } from 'zod';

// Location schema
export const LocationSchema = z.object({
  city: z.string(),
  country: z.string(),
  country_code: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  continent: z.string().optional(),
  province: z.string().optional(),
  timezone: z.string().optional(),
  postal_code: z.string().optional(),
});

// Autonomous System schema
export const ASSchema = z.object({
  asn: z.number(),
  name: z.string(),
  country_code: z.string(),
  description: z.string().optional(),
  bgp_prefix: z.string().optional(),
});

// DNS schema
export const DNSSchema = z.object({
  hostname: z.string(),
});

// Operating System schema
export const OSSchema = z.object({
  vendor: z.string(),
  product: z.string(),
});

// Software schema
export const SoftwareSchema = z.object({
  product: z.string(),
  vendor: z.string(),
  version: z.string().optional(),
  source: z.string().optional(),
  confidence: z.number().optional(),
  evidence: z.array(z.any()).optional(),
  type: z.array(z.string()).optional(),
  part: z.string().optional(),
  cpe: z.string().optional(),
});

// Vulnerability schema
export const VulnerabilitySchema = z.object({
  cve_id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  cvss_score: z.number().min(0).max(10),
  description: z.string().optional(),
});

// Malware schema
export const MalwareSchema = z.object({
  name: z.string(),
  type: z.string(),
  confidence: z.number(),
  threat_actors: z.array(z.string()).optional(),
});

// Certificate schema
export const CertificateSchema = z.object({
  fingerprint_sha256: z.string(),
  subject: z.string(),
  issuer: z.string(),
  self_signed: z.boolean().optional(),
  subject_alt_names: z.array(z.string()).optional(),
  validity_period: z.object({
    not_before: z.string().optional(),
    not_after: z.string().optional(),
  }).optional(),
});

// Service schema
export const ServiceSchema = z.object({
  port: z.number(),
  protocol: z.string(),
  banner: z.string().optional(),
  software: z.array(SoftwareSchema).optional(),
  vulnerabilities: z.array(VulnerabilitySchema).optional(),
  malware_detected: MalwareSchema.optional(),
  certificate: CertificateSchema.optional(),
  tls_enabled: z.boolean().optional(),
  authentication_required: z.boolean().optional(),
  error_message: z.string().optional(),
  access_restricted: z.boolean().optional(),
  response_details: z.object({
    status_code: z.number(),
    title: z.string().optional(),
    content_language: z.string().optional(),
  }).optional(),
});

// Threat Intelligence schema
export const ThreatIntelSchema = z.object({
  security_labels: z.array(z.string()),
  risk_level: z.enum(['critical', 'high', 'medium', 'low']),
  malware_families: z.array(z.string()).optional(),
});

// Main Host schema
export const HostSchema = z.object({
  ip: z.string().ip(),
  location: LocationSchema,
  autonomous_system: ASSchema,
  dns: DNSSchema.optional(),
  operating_system: OSSchema.optional(),
  services: z.array(ServiceSchema),
  threat_intelligence: ThreatIntelSchema,
});

// Type exports
export type Host = z.infer<typeof HostSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type Vulnerability = z.infer<typeof VulnerabilitySchema>;
export type Location = z.infer<typeof LocationSchema>;
export type ThreatIntel = z.infer<typeof ThreatIntelSchema>;