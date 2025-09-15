# Financial Adviser AI

An AI powered Financial Adviser who will advise you to invest or not in the stocks of a specific stock of your choice.

## 🚀 Features

- **AI Financial Adviser**: Intelligent financial advice using multiple LLM providers
- **Real-time Financial Data**: Live news, stock data, and market information
- **Multi-Provider Support**: OpenAI, Groq, Google, and DeepSeek integration
- **LangSmith Integration**: Comprehensive tracing and evaluation framework
- **Tool-based Architecture**: Modular financial data tools and services
- **TypeScript**: Full TypeScript support with strict configuration
- **Modern UI**: Clean, responsive interface with Tailwind CSS
- **Testing & Quality**: Jest, ESLint, Prettier, and comprehensive test coverage

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **AI/ML**: LangChain, LangSmith, Multiple LLM Providers
- **Styling**: Tailwind CSS v4
- **Testing**: Jest + React Testing Library
- **Code Quality**: ESLint + Prettier + Husky
- **Deployment**: Vercel-ready configuration

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
- **Automatic LLM Tracing**: All model calls are automatically traced
- **Tool Usage Tracking**: Financial data tools are monitored
- **Error Tracking**: Failed calls and errors are logged
- **Performance Metrics**: Response times and token usage

### Evaluation Framework
- **Multiple Datasets**: Basic questions, advanced analysis, tool usage tests
- **Automated Scoring**: Relevance, accuracy, tool usage, completeness
- **Batch Evaluation**: Run evaluations on multiple examples
- **Feedback Collection**: Human and automated feedback

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

For detailed LangSmith integration guide, see [docs/langsmith-integration.md](./docs/langsmith-integration.md).

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

### Minimal Structure
The boilerplate provides a clean foundation with:
- **Next.js App Router**: Modern file-based routing
- **TypeScript**: Strict type checking and path aliases
- **Service Layer**: Ready for business logic implementation
- **Component Structure**: Organized React components

### Error Handling
Basic error handling setup:
- API route error responses
- HTTP status codes
- TypeScript error types

## 🔐 Security

- Input validation and sanitization
- Rate limiting (to be implemented)
- Environment variable protection
- Secure API endpoints

## 📈 Performance

- Serverless API routes
- Intelligent caching
- Optimized bundle with Turbopack
- Image optimization
- Code splitting

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
