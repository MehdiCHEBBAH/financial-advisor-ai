# Financial Adviser AI

An AI-powered financial adviser that provides responsible, data-informed guidance on stocks and markets. It integrates multiple LLM providers, live market/news tools, and a built-in evaluation framework to measure quality.

## 🚀 Features

- **Core Advice Engine**: Multi-step agent that balances general guidance with live data lookups
- **Real-time Market Intelligence**: Tools for live news, stock quotes, symbol search, and historical context
- **Multi-LLM Provider Support**: OpenAI, Groq, Google Generative AI, and DeepSeek with pluggable adapters
- **Evaluation Built-in**: LangSmith-backed datasets, batch runs, scoring, and feedback generation
- **Observability & Tracing**: End-to-end trace of model calls, tools, timings, and errors
- **Strong UX**: Clean, responsive UI using Tailwind with an accessible chat experience
- **Type-safe Codebase**: End-to-end TypeScript with strict configs and clear domain types
- **Quality Tooling**: Jest + RTL tests, ESLint, Prettier; ready for CI and Vercel deployment

> Looking for the evaluation deep dive? See the dedicated guide: `docs/evaluation.md`.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) — server-centric, file-based routing, and first-class edge/serverless support
- **Language**: TypeScript — strict typing for safer financial logic and tool contracts
- **AI/ML**: Custom agent orchestration with LangSmith tracing; multiple LLM providers via lightweight adapters
- **Styling**: Tailwind CSS v4 — fast iteration, consistent design tokens
- **Testing**: Jest + React Testing Library — deterministic unit and UI tests
- **Code Quality**: ESLint + Prettier — consistent style and rules across server/client
- **Deployment**: Vercel — zero-config serverless APIs with environment separation

### Why these choices
- **Next.js App Router**: Enables colocated server actions and API routes for tools, low-latency model calls, and easy SSR/edge deployment.
- **Provider Abstraction**: Markets and model offerings evolve quickly. A pluggable LLM layer avoids lock-in and supports A/B testing.
- **LangSmith**: Provides production-grade tracing/evaluation so we can measure model behavior and iterate safely.
- **TypeScript**: Financial advice requires careful handling of inputs/outputs. Types reduce regressions and improve tooling contracts.

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd financial-adviser-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# LLM Provider API Keys (choose the providers you want to use)
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Financial Data API Keys
MEDIASTACK_API_KEY=your_mediastack_api_key_here
MARKETSTACK_API_KEY=your_marketstack_api_key_here

# LangSmith Configuration (for tracing and evaluation)
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=financial-adviser-ai
LANGSMITH_ENVIRONMENT=development
LANGSMITH_TRACING=true
```

**Quick Setup**: Run the setup script for guided configuration:
```bash
./setup-env.sh
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🔍 LangSmith Integration

This project includes comprehensive LangSmith integration for tracing and evaluation:

### Tracing
- **Automatic LLM Tracing**: All model and tool calls are traced with timings and inputs/outputs
- **Tool Usage Tracking**: Capture arguments, success flags, and downstream effects
- **Error Tracking**: Centralized visibility into failures with reproducible runs
- **Performance Metrics**: Latency and token usage to guide cost/perf trade-offs

### Evaluation Framework (high level)
- **Datasets**: Curated suites: basic, advanced, tool-usage, edge-cases, and an all-in-one set
- **Scoring**: Heuristic metrics: relevance, accuracy, tool-usage appropriateness, completeness, and an overall composite
- **Batch Runs**: CLI and API to run evaluations locally or in CI and upload to LangSmith
- **Feedback**: Auto-generated strengths/weaknesses/suggestions per example; exported with scores

For detailed evaluation methodology, metrics, and roadmap, see `docs/evaluation.md`.

### Running Evaluations

```bash
# List available evaluation datasets
pnpm tsx scripts/run-evaluation.ts --list-datasets

# Run evaluation on basic questions
pnpm tsx scripts/run-evaluation.ts --dataset basic --create-dataset --run-evaluation

# Run evaluation via API
curl -X POST http://localhost:3000/api/evaluation \
  -H "Content-Type: application/json" \
  -d '{"dataset": "basic", "runEvaluation": true}'
```

For detailed LangSmith integration guide, see [LangSmith integration](./docs/langsmith-integration.md). For the evaluation deep dive, see [Evaluation guide](./docs/evaluation.md).

## 📁 Project Structure

```
financial-adviser-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # Chat API endpoint
│   │   │   ├── evaluation/    # Evaluation API endpoint
│   │   │   ├── health/        # Health check endpoint
│   │   │   ├── models/        # Model status endpoints
│   │   │   └── status/        # Service status endpoint
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── chat/              # Chat UI components
│   │   └── ui/                # Reusable UI components
│   └── lib/
│       ├── agent/             # AI agent implementation
│       ├── evaluation/        # LangSmith evaluation framework
│       ├── services/          # Service layer
│       └── tools/             # Financial data tools
├── scripts/                   # Utility scripts
│   └── run-evaluation.ts      # Evaluation runner
├── docs/                      # Documentation
│   └── langsmith-integration.md
├── __tests__/                 # Test files
├── __mocks__/                 # Mock files
└── Configuration files
```

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Test coverage
```bash
npm run test -- --coverage
```

## 🔧 Development

### Code formatting
```bash
npm run format
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Type checking
```bash
npm run type-check
```

## 🚀 Building for Production

### Build the application
```bash
npm run build
```

### Start production server
```bash
npm run start
```

## 📊 API Endpoints

### Chat API
- **POST** `/api/chat` - Main chat endpoint for financial advice
  - Accepts OpenAI-compatible format
  - Supports multiple LLM providers
  - Includes tool usage and tracing

### Evaluation API
- **GET** `/api/evaluation?dataset=<name>` - Get evaluation dataset info
- **POST** `/api/evaluation` - Run evaluations and create datasets
  - Supports multiple evaluation datasets
  - Batch evaluation processing
  - LangSmith integration

### Model Management
- **GET** `/api/models` - List available models
- **GET** `/api/models/status` - Model status and health

### Health & Status
- **GET** `/api/health` - Service health check
- **GET** `/api/status` - Detailed service status

## 🏗️ Architecture

### High-level design
- **Agent-first**: `src/lib/agent` implements a `FinancialAgent` that can reason, call tools, and produce advisory responses.
- **Tools as Services**: Financial data access is encapsulated in `src/lib/services` and exposed as tools in `src/lib/tools` for the agent.
- **API surface**: App Router routes under `src/app/api` for chat, models, evaluation, status, and health.
- **Evaluation loop**: `src/lib/evaluation` plus `scripts/run-evaluation.ts` and `/api/evaluation` to run and analyze.

### Error handling
- Consistent error responses in API routes with proper HTTP codes
- Defensive checks (e.g., model validation, provider availability)
- Safe fallbacks if tools or providers are unavailable

## 🔐 Security

- Input validation and sanitization
- Environment variable protection
- Secure API endpoints and server-only keys
- Rate limiting (roadmap)

## 📈 Performance

- Serverless API routes and edge-friendly design
- Intelligent caching opportunities for non-sensitive market data
- Optimized bundle with Turbopack, code splitting, and deferred hydration

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- React Testing Library for testing utilities
- All contributors and users

## 📞 Support

If you have any questions or need help, please:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue if your question isn't answered
3. Contact the maintainers

---

Built with ❤️ using Next.js 15

---

## 📐 Evaluation Summary (quick reference)

Metrics computed per response (0–1):
- **Relevance**: Does the answer target the user’s question?
- **Accuracy**: Responsible financial framing (disclaimers, risk, no guarantees)
- **Tool Usage**: Appropriate use of live-data tools when expected
- **Completeness**: Depth, structure, and sufficient coverage
- **Overall**: Average of the above, used for quick comparisons

Roadmap highlights:
- Expand metrics with model-graded rubrics and semantic similarity checks
- Add hallucination checks via retrieval-grounded testing
- Scenario coverage growth (macro events, volatility regimes, earnings seasons)
- CI gating on evaluation regressions
