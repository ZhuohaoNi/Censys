import { z } from 'zod';

export const SummarySchema = z.object({
  overview: z.string(),
  security_posture: z.string(),
  recommendations: z.array(z.string()),
  key_metrics: z.object({
    risk_level: z.enum(['critical', 'high', 'medium', 'low']),
    critical_issues: z.number(),
    total_vulnerabilities: z.number(),
  }),
});

export type Summary = z.infer<typeof SummarySchema>;