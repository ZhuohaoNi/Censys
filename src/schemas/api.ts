import { z } from 'zod';
import { HostSchema } from './host';
import { EngineeredFeaturesSchema } from './engineered-features';
import { SummarySchema } from './summary';

// Request/Response Schemas

// Route: POST /api/analyze
export const AnalyzeRequestSchema = z.object({
  hosts: z.array(HostSchema),
});

export const AnalyzeResponseSchema = z.object({
  analyzed_hosts: z.array(z.object({
    id: z.string().uuid(),
    ip: z.string().ip(),
    risk_level: z.enum(['critical', 'high', 'medium', 'low']),
    risk_score: z.number().min(0).max(100),
  })),
});

// Route: GET /api/hosts/[id]
export const HostResponseSchema = z.object({
  host: HostSchema,
  features: EngineeredFeaturesSchema,
  summary: SummarySchema.nullable(),
});

// Route: POST /api/hosts/[id]/summarize
export const SummaryResponseSchema = z.object({
  summary: SummarySchema,
  generated_at: z.string().datetime(),
});

// Error Response (all routes)
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.union([z.record(z.any()), z.array(z.any())]).optional(),
  }),
});

// Type exports
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type HostResponse = z.infer<typeof HostResponseSchema>;
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;