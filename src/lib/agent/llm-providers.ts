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
      
      // Create a mutable copy for tool results
      const messagesWithTools = [...langchainMessages];

      // Get the appropriate LangChain model with tools
      const model = this.getLangChainModelWithTools(modelConfig.provider, config.model, config.apiKey);

      // First, get the initial response to check for tool calls
      const initialResult = await model.invoke(langchainMessages);
      
      // Check if the result contains tool calls
      if (initialResult.tool_calls && initialResult.tool_calls.length > 0) {
        // Execute tool calls
        for (const toolCall of initialResult.tool_calls) {
          try {
            // Find the tool by name
            const tool = allTools.find(t => t.name === toolCall.name);
            if (tool) {
              // Execute the tool
              const toolResult = await tool.invoke(toolCall.args);
              
              // Add tool result to messages
              messagesWithTools.push(new HumanMessage(`Tool ${toolCall.name} result: ${JSON.stringify(toolResult)}`));
              
              // Yield tool call information with result
              yield `<tool name="${toolCall.name}" args='${JSON.stringify(toolCall.args)}' result='${JSON.stringify(toolResult)}' success="true"></tool>`;
            }
          } catch (toolError) {
            console.error(`Tool ${toolCall.name} execution error:`, toolError);
            // Add error to messages
            messagesWithTools.push(new HumanMessage(`Tool ${toolCall.name} error: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`));
            
            // Yield tool call information with error
            yield `<tool name="${toolCall.name}" args='${JSON.stringify(toolCall.args)}' error='${toolError instanceof Error ? toolError.message : 'Unknown error'}' success="false"></tool>`;
          }
        }
        
        // Get final response after tool execution
        const finalResult = await model.invoke(messagesWithTools);
        if (finalResult.content) {
          yield finalResult.content as string;
        }
      } else {
        // No tool calls, just yield the content
        if (initialResult.content) {
          yield initialResult.content as string;
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