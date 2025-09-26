import { z } from 'zod';

export const EngineeredFeaturesSchema = z.object({
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(['critical', 'high', 'medium', 'low']),
  vulnerability_counts: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  has_malware: z.boolean(),
  has_kev: z.boolean(),
  service_count: z.number(),
  open_admin_ports: z.array(z.number()),
  self_signed_cert_count: z.number(),
  has_non_standard_ssh: z.boolean(),
});

export type EngineeredFeatures = z.infer<typeof EngineeredFeaturesSchema>;