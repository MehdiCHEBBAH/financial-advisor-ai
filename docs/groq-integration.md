# Groq Integration

This document describes the Groq SDK integration for the Financial Adviser AI application.

## 🚀 **Why Groq?**

- **Fast & Reliable**: Groq provides extremely fast inference speeds
- **Simple API**: Clean, straightforward SDK with excellent error handling
- **Cost Effective**: Competitive pricing for high-quality models
- **Multiple Models**: Access to Llama, Mixtral, and Gemma models
- **No Rate Limits**: Generous free tier with no strict rate limiting

## 🔧 **Implementation**

### **Models Supported**

- **Llama 3.1 70B Versatile**: Meta's most capable model
- **Llama 3.1 8B Instant**: Fast and efficient 8B parameter model
- **Mixtral 8x7B**: Mixture of Experts model with 8x7B parameters
- **Gemma 7B IT**: Google's Gemma 7B instruction-tuned model

### **Key Features**

- ✅ **Streaming Support**: Real-time character-by-character responses
- ✅ **Error Handling**: Comprehensive error parsing and user-friendly messages
- ✅ **API Key Management**: User can add their own keys via UI
- ✅ **Model Switching**: Easy switching between different Groq models
- ✅ **Fallback Responses**: Demo responses when API key not configured

## 🔑 **Setup**

### **1. Get Groq API Key**

1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign up for a free account
3. Generate an API key
4. Copy the key (starts with `gsk_`)

### **2. Configure Environment**

```bash
# Copy the example file
cp .env.example .env.local

# Add your API key
echo "GROQ_API_KEY=gsk_your_actual_key_here" >> .env.local
```

### **3. Start Development Server**

```bash
pnpm dev
```

## 🎯 **Usage**

### **API Endpoints**

- **`POST /api/chat`**: Chat with the AI agent
- **`GET /api/models`**: List available models
- **`GET /api/models/status`**: Check model configuration status

### **Example API Call**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### **Streaming Response**

The API returns Server-Sent Events (SSE) for real-time streaming:

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"llama-3.1-70b-versatile","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"llama-3.1-70b-versatile","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: [DONE]
```

## 🛠 **Architecture**

### **Core Components**

- **`LLMProvider`**: Handles Groq API calls and error parsing
- **`FinancialAgent`**: Orchestrates message processing
- **`APIKeyService`**: Manages user and environment API keys
- **`ModelConfig`**: Defines available models and their capabilities

### **Error Handling**

The system provides structured error handling for:

- **Missing API Key**: Clear message to add API key
- **Quota Exceeded**: Informative message about limits
- **Model Not Supported**: Guidance on available models
- **Network Errors**: Retry suggestions and fallback responses

### **User Experience**

- **Model Selector**: Shows available models with status indicators
- **API Key Manager**: Modal for adding/managing API keys
- **Error Display**: Contextual error messages with action buttons
- **Streaming UI**: Real-time response display with typing indicators

## 📊 **Performance**

### **Speed**

- **Llama 3.1 8B**: ~50-100 tokens/second
- **Llama 3.1 70B**: ~20-50 tokens/second
- **Mixtral 8x7B**: ~30-70 tokens/second
- **Gemma 7B**: ~40-80 tokens/second

### **Cost**

- **Free Tier**: 14,400 requests/day
- **Paid Plans**: Starting at $0.27/1M tokens
- **No Rate Limits**: Unlike other providers

## 🔒 **Security**

- **API Key Storage**: User keys stored in localStorage (client-side only)
- **Environment Variables**: Server keys in `.env.local` (not committed)
- **Key Validation**: Basic format validation before saving
- **Error Sanitization**: No sensitive data exposed in error messages

## 🚀 **Deployment**

### **Environment Variables**

```bash
# Required
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional
DEFAULT_MODEL=llama-3.1-70b-versatile
SYSTEM_PROMPT=You are a helpful financial adviser AI assistant.
```

### **Vercel Deployment**

1. Add `GROQ_API_KEY` to Vercel environment variables
2. Deploy with `vercel --prod`
3. User API keys work client-side (no server changes needed)

## 🧪 **Testing**

### **Manual Testing**

```bash
# Test with curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"Hello"}],"stream":false}'
```

### **UI Testing**

1. Open http://localhost:3000
2. Try different models from the selector
3. Test API key management
4. Verify error handling

## 📈 **Monitoring**

### **Logs**

- API calls logged in console
- Error details captured for debugging
- Usage metrics available in Groq console

### **Health Checks**

- **`/api/health`**: Basic health check
- **`/api/status`**: Detailed system status
- **`/api/models/status`**: Model configuration status

This implementation provides a clean, fast, and reliable AI chat experience using Groq's excellent infrastructure.
