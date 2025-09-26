# Censys Data Summarization Agent - Technical Specification

## Executive Summary

This specification defines a full-stack AI-powered application for summarizing Censys host security data. The system processes complex host intelligence data and generates human-readable, actionable security summaries using LLM integration.

### Professional Implementation

**Stack:**
- Frontend & Backend: Next.js 14 (App Router) with Route Handlers
- Schema: Zod models with JSON Schema generation
- LLM: OpenAI API (gpt-4o-mini) with JSON-only responses
- Database: None (in-memory state)
- Deployment: Single Docker container

**Data Flow:**
1. Upload → Validate (Zod) → Process → LLM (JSON) → Display
2. In-memory caching for session
3. Schema-first validation at every boundary

**Testing:** Schema contract tests + Integration tests (80% coverage)
**Time Estimate:** 4-5 hours

# Full Specification: Professional Implementation

## 1. Objectives & Non-Goals

### Objectives
- Provide clear, actionable summaries of Censys host data
- Demonstrate full-stack development capabilities
- Showcase effective LLM prompt engineering
- Deliver production-quality code within time constraints

### Non-Goals
- Real-time data streaming from Censys API
- Multi-tenant support
- Advanced authentication/authorization
- Historical trend analysis

## 2. Assumptions

- **Environment:** Node.js 20+, modern browser support
- **LLM Access:** OpenAI API key available (gpt-4o-mini)
- **Data Format:** JSON structure matches provided sample
- **Time Constraint:** 4-hour development window
- **Review Environment:** Reviewers can run Docker or Node.js locally
- **Schema-First:** All data contracts defined in Zod, exported as JSON Schema

## 3. Architecture Overview

```
┌─────────────────────────────────┐     ┌─────────────┐
│       Next.js 14 (Unified)      │────▶│ OpenAI API  │
│  ├─ App Router (Frontend)       │     │ gpt-4o-mini │
│  ├─ Route Handlers (API)        │     └─────────────┘
│  └─ Shared Zod Schemas          │
│      ├─ Host                    │     ┌─────────────┐
│      ├─ EngineeredFeatures      │────▶│  In-Memory  │
│      └─ Summary                 │     │    Cache    │
└─────────────────────────────────┘     └─────────────┘
```

## 4. Data Model (Zod Schemas)

### Core Schemas
```typescript
// schemas/host.ts
import { z } from 'zod';

export const VulnerabilitySchema = z.object({
  cve_id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  cvss_score: z.number().min(0).max(10),
  description: z.string().optional()
});

export const ServiceSchema = z.object({
  port: z.number(),
  protocol: z.string(),
  banner: z.string().optional(),
  software: z.array(SoftwareSchema).optional(),
  vulnerabilities: z.array(VulnerabilitySchema).optional(),
  malware_detected: MalwareSchema.optional(),
  certificate: CertificateSchema.optional(),
  tls_enabled: z.boolean().optional()
});

export const HostSchema = z.object({
  ip: z.string().ip(),
  location: LocationSchema,
  autonomous_system: ASSchema,
  dns: DNSSchema.optional(),
  operating_system: OSSchema.optional(),
  services: z.array(ServiceSchema),
  threat_intelligence: ThreatIntelSchema
});

// schemas/engineered-features.ts
export const EngineeredFeaturesSchema = z.object({
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(['critical', 'high', 'medium', 'low']),
  vulnerability_counts: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number()
  }),
  has_malware: z.boolean(),
  has_kev: z.boolean(),
  service_count: z.number(),
  open_admin_ports: z.array(z.number()),
  self_signed_cert_count: z.number()
});

// schemas/summary.ts
export const SummarySchema = z.object({
  overview: z.string(),
  security_posture: z.string(),
  recommendations: z.array(z.string()),
  key_metrics: z.object({
    risk_level: z.enum(['critical', 'high', 'medium', 'low']),
    critical_issues: z.number(),
    total_vulnerabilities: z.number()
  })
});
```

## 5. Risk Scoring Algorithm (0-100 Scale)

### Scoring Table

| Factor | Base Score | Max Contribution | Calculation |
|--------|------------|------------------|-------------|
| Critical CVEs | 10 | 40 | min(count × 10, 40) |
| High CVEs | 5 | 15 | min(count × 5, 15) |
| Medium CVEs | 2 | 6 | min(count × 2, 6) |
| Malware Present | 25 | 25 | if present: 25, else: 0 |
| KEV Vulnerabilities | 8 | 24 | min(count × 8, 24) |
| Self-Signed Certs | 3 | 6 | min(count × 3, 6) |
| Non-Standard SSH Port | 5 | 5 | if port ≠ 22: 5, else: 0 |
| Open Admin Ports | 2 | 8 | min(count × 2, 8) |

**Total Score:** Sum of all factors, capped at 100

**Risk Levels (Dataset-Aligned):**
- Critical: 80-100 (matches host 1.92.135.168 with malware)
- High: 50-79 (matches other hosts)
- Medium: 25-49
- Low: 0-24

**Implementation:**
```typescript
function calculateRiskScore(features: EngineeredFeatures): number {
  let score = 0;
  
  // Vulnerabilities
  score += Math.min(features.vulnerability_counts.critical * 10, 40);
  score += Math.min(features.vulnerability_counts.high * 5, 15);
  score += Math.min(features.vulnerability_counts.medium * 2, 6);
  
  // Malware
  if (features.has_malware) score += 25;
  
  // KEVs
  const kevCount = features.has_kev ? 
    features.vulnerability_counts.critical : 0;
  score += Math.min(kevCount * 8, 24);
  
  // Certificates
  score += Math.min(features.self_signed_cert_count * 3, 6);
  
  // SSH on non-standard port
  if (features.has_non_standard_ssh) score += 5;
  
  // Admin ports
  score += Math.min(features.open_admin_ports.length * 2, 8);
  
  return Math.min(score, 100);
}

## 6. LLM Summarization Contract

### System Prompt (JSON-Only)
```
You are a cybersecurity analyst API that responds ONLY in valid JSON.
Never include explanations, markdown, or text outside the JSON structure.
Your response must validate against the provided JSON schema.
```

### User Prompt Template
```
Analyze this host and return a JSON summary:

Host IP: {ip}
Location: {location.city}, {location.country}
Risk Score: {risk_score}/100 ({risk_level})
Services: {service_count} detected
Vulnerabilities: {critical} critical, {high} high, {medium} medium
Key Issues: {critical_issues}

Return JSON matching this exact schema:
{
  "overview": "One paragraph about host location, network (ASN), and apparent purpose based on services",
  "security_posture": "One paragraph analyzing vulnerabilities, malware, and overall security state",
  "recommendations": ["Action 1", "Action 2", "Action 3"],
  "key_metrics": {
    "risk_level": "critical|high|medium|low",
    "critical_issues": <number>,
    "total_vulnerabilities": <number>
  }
}
```

### Validation & Retry Logic
```typescript
async function getLLMSummary(prompt: string): Promise<Summary> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content);
    return SummarySchema.parse(parsed);
  } catch (error) {
    // One retry with error feedback
    const retryResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
        { role: 'assistant', content: response.choices[0].message.content },
        { role: 'user', content: `Invalid JSON. Error: ${error}. Return valid JSON only.` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    const retryParsed = JSON.parse(retryResponse.choices[0].message.content);
    return SummarySchema.parse(retryParsed); // Will throw if still invalid
  }
}
```

## 7. API Design (Next.js Route Handlers)

### Route Handlers

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| POST | /api/analyze | Upload & analyze hosts | `AnalyzeRequest` | `AnalyzeResponse` |
| GET | /api/hosts/[id] | Get host with features | - | `HostResponse` |
| POST | /api/hosts/[id]/summarize | Generate AI summary | - | `SummaryResponse` |
| GET | /api/hosts | List all analyzed hosts | - | `HostListResponse` |
| GET | /api/export/[id] | Export summary | ?format=json\|md | File download |

### Request/Response Schemas
```typescript
// Route: POST /api/analyze
const AnalyzeRequestSchema = z.object({
  hosts: z.array(HostSchema)
});

const AnalyzeResponseSchema = z.object({
  analyzed_hosts: z.array(z.object({
    id: z.string().uuid(),
    ip: z.string().ip(),
    risk_level: z.enum(['critical', 'high', 'medium', 'low']),
    risk_score: z.number().min(0).max(100)
  }))
});

// Route: GET /api/hosts/[id]
const HostResponseSchema = z.object({
  host: HostSchema,
  features: EngineeredFeaturesSchema,
  summary: SummarySchema.nullable()
});

// Route: POST /api/hosts/[id]/summarize
const SummaryResponseSchema = z.object({
  summary: SummarySchema,
  generated_at: z.string().datetime()
});

// Error Response (all routes)
const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  })
});
```

### Route Implementation Example
```typescript
// app/api/analyze/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = AnalyzeRequestSchema.parse(body);
    
    const analyzed = validated.hosts.map(host => {
      const features = engineerFeatures(host);
      const id = crypto.randomUUID();
      
      // Store in memory cache
      hostCache.set(id, { host, features });
      
      return {
        id,
        ip: host.ip,
        risk_level: features.risk_level,
        risk_score: features.risk_score
      };
    });
    
    return NextResponse.json(
      AnalyzeResponseSchema.parse({ analyzed_hosts: analyzed }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.errors } },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

## 8. UI Flows

### Main Flow
1. **Upload Page**
   - Drag & drop JSON file or paste data
   - Real-time validation feedback
   - "Analyze" button

2. **Host List View**
   - Table: IP, Location, Risk Level, Services Count
   - Risk badges with colors
   - Click to view details

3. **Host Detail View**
   - Header: IP, risk score visualization
   - Tabs: Overview | Services | Vulnerabilities | AI Summary
   - Action buttons: "Generate Summary" | "Export"

4. **AI Summary Panel**
   - Loading state with progress
   - Formatted summary sections
   - Copy buttons for each section
   - Export as JSON/Markdown

## 9. Testing Strategy

### Schema Contract Tests
```typescript
// tests/contracts/schemas.test.ts
import { zodToJsonSchema } from 'zod-to-json-schema';

describe('Schema Contracts', () => {
  it('generates valid JSON Schema for Host', () => {
    const jsonSchema = zodToJsonSchema(HostSchema);
    expect(jsonSchema).toMatchSnapshot();
  });

  it('validates sample dataset against schema', () => {
    const sampleData = require('../fixtures/hosts_dataset.json');
    sampleData.hosts.forEach(host => {
      expect(() => HostSchema.parse(host)).not.toThrow();
    });
  });

  it('validates LLM response contract', () => {
    const mockResponse = {
      overview: "Host located in Beijing...",
      security_posture: "Critical security issues...",
      recommendations: ["Patch CVE-2023-38408", "Remove malware", "Update SSH"],
      key_metrics: { risk_level: "critical", critical_issues: 2, total_vulnerabilities: 5 }
    };
    expect(() => SummarySchema.parse(mockResponse)).not.toThrow();
  });
});
```

### Feature Engineering Tests
```typescript
// tests/features/risk-scorer.test.ts
describe('Risk Scoring (0-100)', () => {
  it('scores host with malware as critical (80+)', () => {
    const features = {
      has_malware: true,
      vulnerability_counts: { critical: 2, high: 0, medium: 1, low: 0 },
      has_kev: true,
      self_signed_cert_count: 0,
      has_non_standard_ssh: false,
      open_admin_ports: []
    };
    const score = calculateRiskScore(features);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('caps vulnerability contributions', () => {
    const features = {
      vulnerability_counts: { critical: 10, high: 10, medium: 10, low: 0 },
      has_malware: false,
      // ... other fields
    };
    const score = calculateRiskScore(features);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

### API Integration Tests
```typescript
// tests/api/analyze.test.ts
describe('POST /api/analyze', () => {
  it('processes dataset matching expected risk levels', async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(sampleDataset),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    expect(response.status).toBe(201);
    
    // Verify host 1.92.135.168 is critical (has malware)
    const malwareHost = data.analyzed_hosts.find(h => h.ip === '1.92.135.168');
    expect(malwareHost.risk_level).toBe('critical');
    expect(malwareHost.risk_score).toBeGreaterThanOrEqual(80);
  });

  it('returns validation error for invalid schema', async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ hosts: [{ invalid: 'data' }] }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## 10. Acceptance Criteria

- [ ] Processes provided hosts_dataset.json without errors
- [ ] Correctly identifies host 1.92.135.168 as "critical" risk (malware)
- [ ] UI displays all 3 hosts with accurate risk levels
- [ ] Generates coherent summaries mentioning Cobalt Strike for host 2
- [ ] Export produces valid JSON and Markdown
- [ ] README includes setup, run, and test instructions
- [ ] Code passes linting (ESLint + Prettier)
- [ ] Docker container builds and runs successfully

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API unavailable | High | Fallback to template-based summaries |
| LLM returns invalid JSON | Medium | Retry with simplified prompt + validation |
| Rate limiting | Low | Client-side throttling, queue on backend |
| Large datasets (>100 hosts) | Medium | Pagination + streaming responses |
| LLM hallucination | Medium | Constrain output format, fact-check against data |

## 12. Future Enhancements

### Phase 1 (v1.1)
- **KEV Enrichment**: Real-time CISA KEV catalog lookup
- **Batch Analysis**: Process multiple files, compare hosts
- **Threat Actor Profiles**: Expand malware attribution context

### Phase 2 (v1.2)
- **Certificate Chain Analysis**: Validate trust chains, find related infrastructure
- **Fleet Reports**: Aggregate summaries for host groups
- **Webhook Integration**: Slack/Teams notifications for critical hosts
- **Custom Risk Weights**: User-configurable scoring

### Phase 3 (v2.0)
- **Trend Analysis**: Historical risk progression
- **Remediation Tracking**: Mark vulnerabilities as addressed
- **API Integration**: Direct Censys API connection
- **Multi-LLM Support**: Claude, Llama, Gemini providers

## 13. Implementation Timeline

| Hour | Focus |
|------|-------|
| 0-0.5 | Setup: Next.js 14 App Router, Zod schemas, TypeScript |
| 0.5-1.5 | Core: Schema definitions, feature engineering, risk scoring |
| 1.5-2.5 | API: Route handlers, validation, in-memory cache |
| 2.5-3.0 | Frontend: Upload, list, detail views with schema validation |
| 3.0-3.5 | LLM: JSON-only prompts, retry logic, contract tests |
| 3.5-4.0 | Polish: README, Docker, schema documentation |

## 14. Additional Considerations

### Unified Stack Benefits
- **Single deployment unit**: One Next.js app serves both frontend and API
- **Shared types**: Zod schemas used across frontend/backend boundary
- **Simplified debugging**: All code in one process, easier to trace
- **Type safety**: End-to-end type inference from schema to UI

### Schema-First Benefits
- **Contract clarity**: JSON Schema export for documentation
- **Validation consistency**: Same validation logic everywhere
- **LLM reliability**: Structured output with retry on schema failure
- **Testing confidence**: Contract tests ensure compatibility

### Performance Optimizations
- **In-memory cache**: Fast lookups without DB overhead
- **Streaming responses**: Next.js streaming for large exports
- **Schema validation caching**: Parse schemas once at startup
- **Parallel LLM calls**: Process multiple hosts concurrently

### Development Experience
- **Hot reload**: Next.js fast refresh for UI and API
- **Type inference**: Zod infers TypeScript types automatically
- **Error boundaries**: Schema validation provides clear error messages
- **JSON Schema docs**: Auto-generated API documentation

---

This refined specification emphasizes simplicity and consistency through a unified Next.js stack, schema-first development with Zod, and a clear 0-100 risk scoring model. The removal of the database simplifies debugging while maintaining session functionality through in-memory caching. The focus on JSON-only LLM contracts ensures reliable AI integration.