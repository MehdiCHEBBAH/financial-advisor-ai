import { NextRequest } from 'next/server';
import { FinancialAgent, validateModel } from '@/lib/agent';
import { AgentMessage } from '@/lib/agent/types';

// OpenAI Chat Completions API format for backward compatibility
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  userApiKeys?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body: OpenAIRequest = await request.json();

    // Validate OpenAI format
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request: messages array is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.model) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: model is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate model
    if (!validateModel(body.model)) {
      return new Response(
        JSON.stringify({ error: `Invalid model: ${body.model}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the last user message
    const lastUserMessage = body.messages
      .filter((msg) => msg.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set user API keys in environment for this request
    if (body.userApiKeys) {
      for (const [provider, apiKey] of Object.entries(body.userApiKeys)) {
        if (apiKey) {
          // Map provider to environment variable name
          const envVarMap: Record<string, string> = {
            groq: 'GROQ_API_KEY',
            openai: 'OPENAI_API_KEY',
            google: 'GOOGLE_GENERATIVE_AI_API_KEY',
            deepseek: 'DEEPSEEK_API_KEY',
          };
          const envVar = envVarMap[provider];
          if (envVar) {
            process.env[envVar] = apiKey;
          }
        }
      }
    }

    // Convert OpenAI format to UIMessage format
    const uiMessages: AgentMessage[] = FinancialAgent.convertFromOpenAIFormat(body.messages);

    // If streaming is requested (default for OpenAI)
    if (body.stream !== false) {
      return createAgentStreamingResponse(
        uiMessages,
        body.model,
        body.temperature,
        body.max_tokens
      );
    } else {
      // Non-streaming response
      return createAgentNonStreamingResponse(
        uiMessages,
        body.model,
        body.temperature,
        body.max_tokens
      );
    }
  } catch (error) {
    console.error('Chat API error:', error);

    // Extract error message and determine error type
    let errorMessage = 'Internal server error';
    let errorType = 'unknown';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Categorize errors based on message content
      if (
        errorMessage.includes('API key not configured') ||
        errorMessage.includes('API key')
      ) {
        errorType = 'missing_key';
        statusCode = 401;
      } else if (
        errorMessage.includes('quota') ||
        errorMessage.includes('billing') ||
        errorMessage.includes('rate limit')
      ) {
        errorType = 'quota_exceeded';
        statusCode = 429;
      } else if (
        errorMessage.includes('not supported') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('model')
      ) {
        errorType = 'model_not_supported';
        statusCode = 400;
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout')
      ) {
        errorType = 'network_error';
        statusCode = 503;
      } else if (
        errorMessage.includes('authentication') ||
        errorMessage.includes('unauthorized')
      ) {
        errorType = 'authentication_error';
        statusCode = 401;
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        type: errorType,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// AI SDK 5 streaming response using standard streaming
async function createAgentStreamingResponse(
  uiMessages: AgentMessage[],
  model: string,
  temperature?: number,
  maxTokens?: number
) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const chunkId = `chatcmpl-${Date.now()}`;

      try {
        // Send initial role chunk
        const roleChunk = {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [
            {
              index: 0,
              delta: { role: 'assistant' },
              finish_reason: null,
            },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(roleChunk)}\n\n`)
        );

        // Initialize agent
        const agent = new FinancialAgent();
        
        // Stream response from agent
        for await (const chunk of agent.processMessageStream({
          messages: uiMessages,
          model,
          temperature,
          maxOutputTokens: maxTokens,
        })) {
          const contentChunk = {
            id: chunkId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [
              {
                index: 0,
                delta: { content: chunk },
                finish_reason: null,
              },
            ],
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`)
          );
        }

        // Send completion chunk
        const completionChunk = {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`)
        );

        // Send final done signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        
        // Send error as a special error chunk
        const errorMessage = error instanceof Error ? error.message : 'Streaming error occurred';
        let errorType = 'unknown';

        // Categorize streaming errors
        if (errorMessage.includes('API key not configured') || errorMessage.includes('API key')) {
          errorType = 'missing_key';
        } else if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('rate limit')) {
          errorType = 'quota_exceeded';
        } else if (errorMessage.includes('not supported') || errorMessage.includes('not available') || errorMessage.includes('model')) {
          errorType = 'model_not_supported';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
          errorType = 'network_error';
        } else if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
          errorType = 'authentication_error';
        }

        const errorChunk = {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          error: {
            message: errorMessage,
            type: errorType,
            timestamp: new Date().toISOString(),
          },
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Non-streaming response using AI SDK 5 patterns
async function createAgentNonStreamingResponse(
  uiMessages: AgentMessage[],
  model: string,
  temperature?: number,
  maxTokens?: number
) {
  try {
    // Initialize agent
    const agent = new FinancialAgent();
    
    const response = await agent.processMessage({
      messages: uiMessages,
      model,
      temperature,
      maxOutputTokens: maxTokens,
    });

    // Convert back to OpenAI format for backward compatibility
    const openAIResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    return new Response(JSON.stringify(openAIResponse), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Non-streaming error:', error);

    // Extract error message and determine error type
    let errorMessage = 'Failed to generate response';
    let errorType = 'unknown';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Categorize errors based on message content
      if (errorMessage.includes('API key not configured') || errorMessage.includes('API key')) {
        errorType = 'missing_key';
        statusCode = 401;
      } else if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('rate limit')) {
        errorType = 'quota_exceeded';
        statusCode = 429;
      } else if (errorMessage.includes('not supported') || errorMessage.includes('not available') || errorMessage.includes('model')) {
        errorType = 'model_not_supported';
        statusCode = 400;
      } else if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
        errorType = 'network_error';
        statusCode = 503;
      } else if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
        errorType = 'authentication_error';
        statusCode = 401;
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        type: errorType,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}