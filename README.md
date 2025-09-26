# Censys Data Summarization Agent

<details open>
<summary><strong>🎥 Demo (inline)</strong></summary>

<!-- Inline demo video (MP4 recommended for broader GitHub playback support) -->
<video src="./demo.mp4" controls width="640" preload="metadata">
   Your browser does not support the video tag. Download the demo: <a href="./demo.mp4">demo.mp4</a>
</video>

</details>

Quick Start
1. Clone & install
   ```bash
   git clone https://github.com/ZhuohaoNi/Censys.git
   cd Censys
   npm install
   ```
2. Configure environment
   ```bash
   cp .env.example .env.local
   # then edit .env.local
   OPENAI_API_KEY=sk-your-key
   OPENAI_MODEL=gpt-5-mini  
   OPENAI_FALLBACK_MODEL=gpt-4o-mini 
   ```
3. Run
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 and upload `docs/hosts_dataset.json`.


Key Features (Short Version)
- Feature engineering: ports, CVEs (with severity & KEV flag), malware indicators, cert trust issues.
- Weighted risk scoring (capped factors) -> risk level classification.
- Per-host AI summary (gpt-5-mini) with automatic JSON schema validation & retry; fallback templated summary if model fails.
- Export (JSON + Markdown) and simple system/health endpoints.
- File-based TTL cache (default 1h) for idempotent summarization and analysis reuse.

Assignment Coverage
- Run Instructions: ✔ (Quick Start above)
- Assumptions: ✔ (see Assumptions section)
- Testing Instructions: ✔ (Manual Testing section)
- Brief AI Techniques: ✔ (AI Techniques section)
- Future Enhancements: ✔ (Concise list below)

---

A security analysis tool for Censys host data that provides risk assessment and insights using AI-powered summaries.

## Features

- **Host Data Analysis**: Upload and analyze Censys JSON host data
- **Risk Scoring**: Multi-factor risk assessment with weighted scoring
- **Observability stack**
- **Web Interface**: View and manage host analyses
- **Export Options**: Export analyzed data in JSON or Markdown format
- **Error Recovery**: JSON parsing with automatic retry mechanisms

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Validation**: Zod schemas (runtime type safety)
- **AI**: Feature engineering (ports/CVEs/KEV/malware/certs) + explainable capped risk scoring + multi-model summaries (gpt-5-mini primary, gpt-4o-mini + template fallback) + schema‑validated structured output & retry/recovery
- **Architecture**: Unified frontend/backend via Route Handlers
- **Caching**: File-based TTL cache (1h, ephemeral)

## 📚 Documentation

Complete documentation is available in the [`docs/`](./docs/) folder:

- **[Assignment Brief](./docs/assignment_brief.md)** - Original project requirements
- **[Technical Specification](./docs/SPEC.md)** - Detailed implementation specs  
- **[Dataset Description](./docs/host_dataset_description.md)** - Data format information
- **[Sample Dataset](./docs/hosts_dataset.json)** - Test data for the application

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (for AI-powered summaries)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ZhuohaoNi/Censys.git
cd Censys
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
# Optional: Configure OpenAI settings
OPENAI_MODEL=gpt-5-mini # or gpt-4o-mini
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Upload Host Data

Navigate to the upload page and either:
- Drag and drop a Censys JSON file
- Click to browse and select a file
- Paste JSON data directly

### 2. View Analysis

After upload, you'll be redirected to the hosts list where you can:
- View all analyzed hosts with risk levels
- Click on any host for detailed information
- Generate AI summaries for individual hosts

### 3. Export Data

Export analyzed data in multiple formats:
- **JSON**: Complete data with all fields
- **Markdown**: Human-readable report format

## API Endpoints

### POST /api/analyze
Analyze host data and calculate risk scores
```typescript
Request: { hosts: Host[] }
Response: { hosts: AnalyzedHost[] }
```

### GET /api/hosts
List all analyzed hosts
```typescript
Response: { hosts: HostListItem[] }
```

### GET /api/hosts/[id]
Get detailed host information
```typescript
Response: Host & EngineeredFeatures
```

### POST /api/summarize
Generate AI summaries for hosts
```typescript
Request: { hostIds: string[] }
Response: { results: SummaryResult[] }
```

### POST /api/export
Export data in various formats
```typescript
Request: { hostIds: string[], format: 'json' | 'markdown' }
Response: File download
```

## AI Techniques and Implementation

This project implements several AI and ML techniques:

### 1. Feature Engineering Pipeline
**Location**: `src/lib/feature-engineering.ts`

- **Risk Scoring**: Transforms raw Censys data into engineered features using weighted algorithms
- **Vulnerability Analysis**: Categorizes CVEs by severity (Critical, High, Medium, Low) with specialized scoring
- **Port Risk Assessment**: Identifies administrative and high-risk ports (SSH:22, RDP:3389, MySQL:3306, etc.)
- **Malware Detection**: Binary classification for malware presence across services
- **Certificate Analysis**: Evaluates SSL/TLS certificates for self-signed and trust issues

### 2. Large Language Model Integration
**Location**: `src/lib/openai.ts`

#### Multi-Model Support with Fallback Strategy
- **Primary**: gpt-5-mini (higher quality summaries)
- **Fallback**: gpt-4o-mini if primary times out/errors
- **Final Fallback**: Template-based summary (no external API)

#### Structured Output Generation
- **JSON Schema Validation**: Ensures consistent AI responses using Zod schemas
- **Response Format Enforcement**: Uses OpenAI's `json_object` response format
- **JSON Parser**: Automatically fixes truncated or malformed JSON responses


#### Prompt Engineering
- **System Prompts**: Specialized cybersecurity analyst persona
- **Cybersecurity analyst persona**

- **Context-Aware Prompts**: Dynamic prompt generation based on host characteristics
function generateUserPrompt(host: Host, features: EngineeredFeatures): string

- **Error Recovery**: Automatic retry with feedback loops for invalid responses

### 3. Caching System
**Location**: `src/lib/persistent-cache.ts`

- **File-Based Persistence**: Maintains state across server restarts
- **TTL Management**: Automatic expiration (1 hour default)

### 4. Risk Classification Algorithm (Assumption)
**Location**: `src/lib/feature-engineering.ts`

The system uses a multi-factor risk assessment:

| Factor | Weight | Implementation |
|--------|--------|----------------|
| Critical CVEs | 40 points max | 10 points per critical vulnerability |
| Malware Detection | 25 points | Binary classification with immediate scoring |
| KEV Vulnerabilities | 24 points max | 8 points per known exploited vulnerability |
| Admin Port Exposure | 8 points max | 2 points per exposed administrative port |
| Certificate Issues | 6 points max | 3 points per self-signed certificate |
| Non-standard SSH | 5 points | Penalty for SSH on non-standard ports |

### Risk Level Classification (Assumption)
- **Critical** (80-100): Immediate action required - malware or multiple critical CVEs
- **High** (50-79): Significant vulnerabilities present - critical CVEs or KEV
- **Medium** (25-49): Some concerns identified - multiple medium/high vulnerabilities
- **Low** (0-24): Minimal risk detected - few or no significant issues

### 5. Natural Language Generation
The AI system generates human-readable security reports with:

- **Executive Overview**: Location, network context, and service purpose analysis
- **Security Posture Assessment**: Vulnerability analysis with risk contextualization  
- **Actionable Recommendations**: Prioritized remediation steps based on risk factors
- **Metrics Dashboard**: Key performance indicators for security teams

### 6. Assumptions Made During Development

- **Data Quality**: Assumes Censys data follows documented schema structure
- **API Availability**: OpenAI API is available; implements graceful fallback to template summaries
- **Network Context**: ASN and geographic data is reliable for risk assessment
- **Vulnerability Scoring**: CVSS scores when available; severity-based fallback
- **Malware Classification**: Binary detection based on Censys malware indicators
- **Certificate Trust**: Self-signed certificates are considered security risks
- **Administrative Ports**: Standard ports (22, 3389, 3306, etc.) are higher risk when exposed

## Development

### Project Structure
```
├── docs/                         # 📚 All documentation
│   ├── README.md                # Documentation index
│   ├── assignment_brief.md      # Project requirements
│   ├── SPEC.md                  # Technical specifications
│   ├── host_dataset_description.md  # Data format docs
│   └── hosts_dataset.json       # Sample test data
├── src/
│   ├── app/                     # Next.js 14 App Router
│   │   ├── api/                # API route handlers
│   │   │   ├── analyze/        # Risk analysis endpoint
│   │   │   ├── export/         # Data export endpoints
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── hosts/          # Host CRUD operations
│   │   │   └── system/         # System utilities (cache, debug)
│   │   ├── hosts/              # Host listing and detail pages
│   │   │   └── [id]/           # Dynamic host detail page
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout component
│   │   └── page.tsx            # Upload page (home)
│   ├── schemas/                # Zod validation schemas
│   │   ├── api.ts              # API request/response schemas
│   │   ├── engineered-features.ts  # Risk scoring schemas
│   │   ├── host.ts             # Host data schemas
│   │   ├── summary.ts          # AI summary schemas
│   │   └── index.ts            # Schema exports
│   └── lib/                    # Core business logic
│       ├── feature-engineering.ts  # AI risk scoring algorithms
│       ├── openai.ts           # LLM integration & prompt engineering
│       ├── persistent-cache.ts # File-based caching system
│       └── utils.ts            # Utility functions
├── .cache/                     # Runtime cache (gitignored)
├── .env.example                # Environment variables template
├── .env.local                  # Local environment variables (gitignored)
├── .gitignore                  # Git ignore rules
├── .next/                      # Next.js build output (gitignored)
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies and scripts
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   
```

### Schema Validation

All data is validated using Zod schemas:
- `HostSchema`: Validates input Censys data
- `EngineeredFeaturesSchema`: Defines risk scoring output
- `SummarySchema`: Structures AI-generated summaries

## Manual Testing 

### Basic Functionality Tests

1. **Upload Test Data**:
   ```bash
   # Use the provided sample dataset
   cp docs/hosts_dataset.json test-data.json
   ```
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Upload the `test-data.json` file
   - Verify successful parsing and redirect to hosts list

2. **Risk Scoring Verification**:
   - Check that hosts are displayed with appropriate risk levels
   - Verify risk scores are between 0-100
   - Confirm color coding matches risk levels (red=critical, orange=high, etc.)

3. **AI Summary Generation**:
   - Click on any host to view details
   - Click "Generate AI Summary" button
   - Verify summary contains all required sections:
     - Overview (location, network, services)
     - Security posture (vulnerabilities, malware)
     - Recommendations (actionable steps)
     - Key metrics (risk level, counts)

4. **Export Functionality**:
   - From hosts list, select multiple hosts
   - Test JSON export - verify complete data structure
   - Test Markdown export - verify human-readable format

5. **API Endpoint Testing**:
   ```bash
   # Test health endpoint
   curl http://localhost:3000/api/health
   
   # Test analyze endpoint with sample data
   curl -X POST http://localhost:3000/api/analyze \
     -H "Content-Type: application/json" \
     -d @docs/hosts_dataset.json
   ```

## Future Enhancements 
1. Ensemble summarization & agreement scoring (quality lift; pick best of multi-model outputs).  
   Generate 2–3 candidate summaries (e.g., gpt-5-mini + smaller local + template), score for schema validity & feature coverage, surface best + optionally show disagreements.
2. Active learning loop (ingest user edits → update weighting / prompt hints).  
   Capture human edits to recommendations / risk rationale; feed into prompt hint store or lightweight adapter to reduce repeat errors and hallucinations.
3. Explainability API (/api/explain/[id]: per-factor risk contributions + evidence).  
   Returns normalized factor weights, raw signals (e.g., critical CVE count, admin ports), and plain-language justification to improve analyst trust.
4. Unsupervised anomaly detection (cluster/outlier hosts: rare ports, cert anomalies).  
   Apply clustering (DBSCAN/HDBSCAN) on engineered feature vectors; flag outliers (uncommon port/service combos, unusual cert chains) for prioritized review.
5. Domain fine-tuned lightweight model (reduced cost, higher remediation precision, fallback chain retained).  
   LoRA/adapter fine-tune on curated security summaries to cut token cost & increase specificity; retain existing fallback chain for resilience.
