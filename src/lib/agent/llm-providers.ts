import { ModelConfig, AgentResponse } from './types';
import { APIKeyService } from '@/lib/services';
import { allTools } from '@/lib/tools';

// LangChain imports
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatDeepSeek } from '@langchain/deepseek';
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

      // Step 1: Get initial response with thinking and tool calls
      const initialResult = await model.invoke(langchainMessages);
      
      // Step 2: Execute tools if any were called
      const toolResults: Array<{name: string, args: Record<string, unknown>, result: unknown, success: boolean}> = [];
      
      if (initialResult.tool_calls && initialResult.tool_calls.length > 0) {
        // Execute all tool calls
        for (const toolCall of initialResult.tool_calls) {
          try {
            // Find the tool by name
            const tool = allTools.find(t => t.name === toolCall.name);
            if (tool) {
              // Execute the tool
              const toolResult = await tool.invoke(toolCall.args);
              
              toolResults.push({
                name: toolCall.name,
                args: toolCall.args,
                result: toolResult,
                success: true
              });
            }
          } catch (toolError) {
            console.error(`Tool ${toolCall.name} execution error:`, toolError);
            
            toolResults.push({
              name: toolCall.name,
              args: toolCall.args,
              result: toolError instanceof Error ? toolError.message : 'Unknown error',
              success: false
            });
          }
        }
        
        // Step 3: Add tool results to conversation and get final response
        const messagesWithToolResults = [
          ...langchainMessages,
          new HumanMessage(`Tool execution results: ${JSON.stringify(toolResults)}`)
        ];
        
        const finalResult = await model.invoke(messagesWithToolResults);
        
        // Step 4: Build complete response with all sections
        if (finalResult.content) {
          // Parse the final response to extract thinking, tools, and main content
          const { thinking, mainContent } = this.parseResponse(finalResult.content as string);
          
          // Build complete response
          let completeResponse = '';
          
          // Add thinking section if present
          if (thinking) {
            completeResponse += `<think>\n${thinking}\n</think>\n\n`;
          }
          
          // Add tools section if tools were used
          if (toolResults.length > 0) {
            completeResponse += `<tools>\n`;
            for (const toolResult of toolResults) {
              if (toolResult.success) {
                completeResponse += `<tool name="${toolResult.name}" args='${JSON.stringify(toolResult.args)}' result='${JSON.stringify(toolResult.result)}' success="true"></tool>\n`;
              } else {
                completeResponse += `<tool name="${toolResult.name}" args='${JSON.stringify(toolResult.args)}' error='${toolResult.result}' success="false"></tool>\n`;
              }
            }
            completeResponse += `</tools>\n\n`;
          }
          
          // Add main response
          completeResponse += mainContent;
          
          // Stream the complete response
          yield completeResponse;
        }
      } else {
        // No tools, just stream the initial response
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
      case 'deepseek':
        return new ChatDeepSeek({
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

  private static parseResponse(content: string): { thinking: string; mainContent: string } {
    let thinking = '';
    let mainContent = content;

    // Extract thinking blocks (case insensitive)
    const thinkingRegex = /<think>([\s\S]*?)<\/think>/gi;
    const thinkingMatches = content.match(thinkingRegex);
    
    if (thinkingMatches) {
      thinking = thinkingMatches
        .map(match => match.replace(/<\/?think>/gi, ''))
        .join('\n\n');
      
      // Remove thinking blocks from main content
      mainContent = content.replace(thinkingRegex, '').trim();
    }

    return { thinking, mainContent };
  }
}