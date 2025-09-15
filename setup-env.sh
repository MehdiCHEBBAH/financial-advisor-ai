#!/bin/bash

# Financial Adviser AI - Environment Setup Script
# This script helps you set up environment variables for the application

echo "🚀 Financial Adviser AI - Environment Setup"
echo "=========================================="
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Copy .env.example to .env.local
echo "📋 Copying .env.example to .env.local..."
cp .env.example .env.local

echo "✅ Environment file created!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit .env.local and add your API keys"
echo "2. You only need to add keys for providers you want to use"
echo "3. Run 'pnpm dev' to start the development server"
echo ""
echo "📚 Available LLM providers:"
echo "  • Groq: https://console.groq.com"
echo "  • OpenAI: https://platform.openai.com"
echo "  • DeepSeek: https://platform.deepseek.com"
echo "  • Google: https://aistudio.google.com"
echo ""
echo "📊 Financial data APIs:"
echo "  • Mediastack (News): https://mediastack.com/ (Free: 100 requests/month)"
echo "  • Marketstack (Stocks): https://marketstack.com (Free: 100 requests/month)"
echo ""
echo "🔍 LangSmith (Tracing & Evaluation):"
echo "  • LangSmith: https://smith.langchain.com/ (Free tier available)"
echo ""
echo "🔧 Required Environment Variables:"
echo "  • MEDIASTACK_API_KEY - for news search functionality"
echo "  • MARKETSTACK_API_KEY - for stock data functionality"
echo "  • LANGSMITH_API_KEY - for tracing and evaluation (optional but recommended)"
echo ""
echo "💡 Tip: You can also configure API keys through the UI settings!"
echo "⚠️  Note: Tool errors will be displayed to users if API keys are missing or invalid."
