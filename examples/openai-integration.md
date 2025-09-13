# OpenAI Integration Example

This document shows how to integrate the Financial Adviser AI with a real LLM using OpenAI's Chat Completions API format.

## Current Implementation

The API now supports OpenAI Chat Completions format, making it easy to integrate with any LLM that supports this standard.

### API Endpoint

```
POST /api/chat
Content-Type: application/json
```

### Request Format

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a financial adviser AI. Provide investment advice based on user questions."
    },
    {
      "role": "user",
      "content": "Should I invest in Apple stock?"
    }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### Response Format (Streaming)

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Based"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" on"},"finish_reason":null}]}

data: [DONE]
```

### Response Format (Non-Streaming)

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Based on current market analysis..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 150,
    "total_tokens": 170
  }
}
```

## Integration with Real LLM

To integrate with a real LLM, you would:

1. **Replace the dummy response logic** in `src/app/api/chat/route.ts`
2. **Add LLM API calls** using the same OpenAI format
3. **Stream the real responses** from the LLM

### Example Integration Code

```typescript
// In src/app/api/chat/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: OpenAIRequest = await request.json();

    // Validate request
    if (!body.messages || !body.model) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
      });
    }

    // Call real OpenAI API
    const stream = await openai.chat.completions.create({
      model: body.model,
      messages: body.messages,
      stream: body.stream !== false,
      temperature: body.temperature || 0.7,
      max_tokens: body.max_tokens || 1000,
    });

    // Return the stream directly
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
```

## Frontend Usage

The frontend already supports the OpenAI format through the `ChatService`:

```typescript
import { ChatService } from '@/lib/services';

// Create OpenAI request
const request = {
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Should I invest in Apple stock?' }],
  stream: true,
  temperature: 0.7,
};

// Stream response
await ChatService.sendOpenAIMessageStream(request, (chunk) => {
  if (chunk.choices[0].delta.content) {
    console.log('New content:', chunk.choices[0].delta.content);
  }
});
```

## Benefits

1. **Standard Format**: Uses OpenAI's widely-adopted Chat Completions API
2. **Easy Integration**: Drop-in replacement for OpenAI API calls
3. **Streaming Support**: Real-time response streaming
4. **Flexible**: Works with any LLM that supports OpenAI format
5. **Future-Proof**: Ready for real LLM integration
