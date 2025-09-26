# Censys Data Summarization Agent

An AI-powered security analysis tool for Censys host data that provides intelligent risk assessment and actionable insights.

## Features

- **Host Data Analysis**: Upload and analyze Censys JSON host data
- **Risk Scoring**: Advanced 0-100 risk scoring algorithm based on multiple factors
- **AI Summarization**: Generate executive summaries using OpenAI's GPT-4o-mini model
- **Interactive UI**: Modern web interface for viewing and managing host analyses
- **Export Options**: Export analyzed data in JSON or Markdown format

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Validation**: Zod schemas
- **AI**: OpenAI API (gpt-4o-mini)
- **Architecture**: Unified frontend/backend with Next.js Route Handlers

## 📚 Documentation

Complete documentation is available in the [`docs/`](./docs/) folder:

- **[Assignment Brief](./docs/assignment_brief.md)** - Original project requirements
- **[Technical Specification](./docs/SPEC.md)** - Detailed implementation specs  
- **[Dataset Description](./docs/host_dataset_description.md)** - Data format information
- **[Sample Dataset](./docs/hosts_dataset.json)** - Test data for the application

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd censys-data-summarization-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
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

## Risk Scoring Algorithm

The risk scoring system uses a 0-100 scale based on:

| Factor | Weight | Criteria |
|--------|--------|----------|
| Open Ports | 20% | Critical ports (22, 3389, etc.) |
| Vulnerabilities | 30% | CVE severity and CVSS scores |
| Service Exposure | 20% | Number and type of services |
| Software Versions | 15% | Outdated or vulnerable versions |
| Network Location | 15% | Geographic and AS risk factors |

### Risk Levels
- **Critical** (76-100): Immediate action required
- **High** (51-75): Significant vulnerabilities present
- **Medium** (26-50): Some concerns identified
- **Low** (0-25): Minimal risk detected

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
│   ├── app/                     # Next.js app router pages
│   │   ├── api/                # API route handlers
│   │   ├── hosts/              # Host listing and detail pages
│   │   └── page.tsx            # Upload page
│   ├── schemas/                # Zod validation schemas
│   ├── lib/                    # Utilities and core logic
│   │   ├── persistent-cache.ts # File-based cache system
│   │   ├── feature-engineering.ts  # Risk scoring
│   │   └── openai.ts           # LLM integration
│   └── __tests__/              # Test files
├── .cache/                     # Runtime cache (gitignored)
└── README.md                   # This file
```

### Schema Validation

All data is validated using Zod schemas:
- `HostSchema`: Validates input Censys data
- `EngineeredFeaturesSchema`: Defines risk scoring output
- `SummarySchema`: Structures AI-generated summaries

### Testing

Run tests:
```bash
npm test
```

Run type checking:
```bash
npm run type-check
```

## Docker Support

Build and run with Docker:

```bash
# Build image
docker build -t censys-agent .

# Run container
docker run -p 3000:3000 -e OPENAI_API_KEY=your_key censys-agent
```

## Security Considerations

- API keys are never exposed to the frontend
- All input data is validated with Zod schemas
- In-memory cache expires after 1 hour
- No persistent data storage (privacy-focused)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## License

[MIT License](LICENSE)