# Financial Adviser AI

An AI powered Financial Adviser who will advise you to invest or not in the stocks of a specific stock of your choice.

## 🚀 Features

- **Next.js 15 Boilerplate**: Clean, minimal starting structure
- **TypeScript**: Full TypeScript support with strict configuration
- **Tailwind CSS**: Utility-first CSS framework
- **Testing Setup**: Jest and React Testing Library configured
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks
- **API Routes**: Basic health check and status endpoints
- **Responsive Design**: Modern UI foundation ready for customization

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
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
# Application Configuration
NODE_ENV=development

# Add your API keys here
# OPENAI_API_KEY=your_openai_api_key
# ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📁 Project Structure

```
financial-adviser-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── health/        # Health check endpoint
│   │   │   ├── status/        # Service status endpoint
│   │   │   ├── hello/         # Hello world endpoint
│   │   │   └── analyze-stock/ # Stock analysis endpoint
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── FinancialAdviserForm.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── StockAnalysisResult.tsx
│   └── lib/
│       └── services/          # Service layer
│           ├── index.ts
│           ├── base.service.ts
│           ├── financial-adviser.service.ts
│           ├── stock-analysis.service.ts
│           └── cache.service.ts
├── __tests__/                 # Test files
├── __mocks__/                 # Mock files
├── .husky/                    # Git hooks
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

### Health Check
- **GET** `/api/health` - Returns service health status

### Service Status
- **GET** `/api/status` - Returns detailed service status

### Hello World
- **GET** `/api/hello?name=World` - Simple hello endpoint
- **POST** `/api/hello` - Hello with JSON body

### Basic Endpoints
The boilerplate includes basic API endpoints for health monitoring and testing:
- **GET** `/api/health` - Service health check
- **GET** `/api/status` - Detailed service status  
- **GET** `/api/hello` - Simple hello world endpoint

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
