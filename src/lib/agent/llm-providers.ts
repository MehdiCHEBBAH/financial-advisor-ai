import { ModelConfig, AgentMessage, AgentResponse } from './types';
import { APIKeyService } from '@/lib/services';

// LLM Provider implementations using Vercel AI SDK
export class LLMProvider {
  private static getProviderConfig(modelConfig: ModelConfig) {
    const apiKey = APIKeyService.getEffectiveAPIKey(modelConfig.provider);

    if (!apiKey) {
      throw new Error(
        `API key not configured for provider: ${modelConfig.provider}`
      );
    }

    return {
      provider: modelConfig.provider,
      model: modelConfig.model,
      apiKey,
    };
  }

  static async generateText(
    modelConfig: ModelConfig,
    messages: AgentMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<AgentResponse> {
    try {
      const config = this.getProviderConfig(modelConfig);

      // Set the API key as environment variable for the AI SDK
      this.setAPIKeyEnvironmentVariable(modelConfig.provider, config.apiKey);

      // Use the AI SDK's generateText function directly
      const { generateText } = await import('ai');

      const result = await generateText({
        model: await this.getModel(modelConfig.provider, config.model),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature ?? modelConfig.temperature.default,
        max_tokens: options.maxTokens ?? modelConfig.maxTokens,
      });

      return {
        content: result.text,
        model: modelConfig.id,
        usage: {
          promptTokens: result.usage?.promptTokens ?? 0,
          completionTokens: result.usage?.completionTokens ?? 0,
          totalTokens: result.usage?.totalTokens ?? 0,
        },
      };
    } catch (error) {
      console.error('LLM Provider error:', error);

      // Parse the error to provide better error information
      const apiError = APIKeyService.parseAPIError(
        error,
        modelConfig.id,
        modelConfig.provider
      );

      // If it's a missing key error, throw it so the UI can handle it properly
      if (apiError.type === 'missing_key') {
        throw new Error(
          `API key not configured for ${modelConfig.provider}. Please add your API key in the settings.`
        );
      }

      // For quota exceeded errors, always throw them so the UI can show appropriate messages
      if (apiError.type === 'quota_exceeded') {
        throw new Error(
          `API quota exceeded for ${modelConfig.provider}. Please check your account or try again later.`
        );
      }

      // For model not supported errors, always throw them
      if (apiError.type === 'model_not_supported') {
        throw new Error(
          `Model ${modelConfig.id} is not supported or not available.`
        );
      }

      // For unknown errors, also throw them to show in UI instead of falling back
      console.warn('Throwing unknown error to UI:', error);
      throw new Error(`API error: ${apiError.message}`);
    }
  }

  static async *streamText(
    modelConfig: ModelConfig,
    messages: AgentMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const config = this.getProviderConfig(modelConfig);

      // Set the API key as environment variable for the AI SDK
      this.setAPIKeyEnvironmentVariable(modelConfig.provider, config.apiKey);

      // Use the AI SDK's streamText function directly
      const { streamText } = await import('ai');

      const result = await streamText({
        model: await this.getModel(modelConfig.provider, config.model),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature ?? modelConfig.temperature.default,
        max_tokens: options.maxTokens ?? modelConfig.maxTokens,
      });

      // Handle the streaming response according to AI SDK v5 docs
      for await (const delta of result.textStream) {
        yield delta;
      }
    } catch (error) {
      console.error('LLM Provider streaming error:', error);

      // Parse the error to provide better error information
      const apiError = APIKeyService.parseAPIError(
        error,
        modelConfig.id,
        modelConfig.provider
      );

      // If it's a missing key error, throw it so the UI can handle it properly
      if (apiError.type === 'missing_key') {
        throw new Error(
          `API key not configured for ${modelConfig.provider}. Please add your API key in the settings.`
        );
      }

      // For quota exceeded errors, always throw them so the UI can show appropriate messages
      if (apiError.type === 'quota_exceeded') {
        throw new Error(
          `API quota exceeded for ${modelConfig.provider}. Please check your account or try again later.`
        );
      }

      // For model not supported errors, always throw them
      if (apiError.type === 'model_not_supported') {
        throw new Error(
          `Model ${modelConfig.id} is not supported or not available.`
        );
      }

      // For unknown errors, also throw them to show in UI instead of falling back
      console.warn('Throwing unknown streaming error to UI:', error);
      throw new Error(`API error: ${apiError.message}`);
    }
  }

  private static setAPIKeyEnvironmentVariable(
    provider: string,
    apiKey: string
  ) {
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

  private static async getModel(provider: string, model: string) {
    switch (provider) {
      case 'groq': {
        const { groq } = await import('@ai-sdk/groq');
        return groq(model);
      }
      case 'openai': {
        const { openai } = await import('@ai-sdk/openai');
        return openai(model);
      }
      case 'google': {
        const { google } = await import('@ai-sdk/google');
        return google(model);
      }
      case 'deepseek': {
        const { deepseek } = await import('@ai-sdk/deepseek');
        return deepseek(model);
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
