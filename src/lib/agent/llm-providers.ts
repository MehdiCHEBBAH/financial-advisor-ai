import { ModelConfig, AgentResponse } from './types';
import { APIKeyService } from '@/lib/services';
import { allTools } from '@/lib/tools';

// LangChain imports
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// LLM Provider implementations using LangChain
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



  static async generateTextWithTools(
    modelConfig: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<AgentResponse> {
    try {
      const config = this.getProviderConfig(modelConfig);

      // Convert messages to LangChain format
      const langchainMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return new SystemMessage(msg.content);
        } else if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else {
          return new HumanMessage(msg.content); // assistant messages as human for simplicity
        }
      });

      // Get the appropriate LangChain model with tools
      const model = this.getLangChainModelWithTools(modelConfig.provider, config.model, config.apiKey);

      // Generate response with tools
      const result = await model.invoke(langchainMessages);

      return {
        content: result.content as string,
        model: modelConfig.id,
      };
    } catch (error) {
      console.error('LLM Provider error:', error);
      throw error;
    }
  }

  static async *streamTextWithTools(
    modelConfig: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): AsyncGenerator<string, void, unknown> {
    try {
      const config = this.getProviderConfig(modelConfig);

      // Convert messages to LangChain format
      const langchainMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return new SystemMessage(msg.content);
        } else if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else {
          return new HumanMessage(msg.content); // assistant messages as human for simplicity
        }
      });

      // Get the appropriate LangChain model with tools
      const model = this.getLangChainModelWithTools(modelConfig.provider, config.model, config.apiKey);

      // Stream response with tools
      const stream = await model.stream(langchainMessages);
      
      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content as string;
        }
      }
    } catch (error) {
      console.error('LLM Provider streaming error:', error);
      throw error;
    }
  }

  private static getLangChainModel(provider: string, model: string, apiKey: string) {
    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          model: model,
          openAIApiKey: apiKey,
        });
      case 'groq':
        return new ChatGroq({
          model: model,
          apiKey: apiKey,
        });
      case 'google':
        return new ChatGoogleGenerativeAI({
          model: model,
          apiKey: apiKey,
        });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private static getLangChainModelWithTools(provider: string, model: string, apiKey: string) {
    const baseModel = this.getLangChainModel(provider, model, apiKey);
    
    // Bind tools to the model
    return baseModel.bindTools(allTools);
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
}