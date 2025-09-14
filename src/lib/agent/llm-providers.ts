import { ModelConfig, AgentResponse, ToolCall } from './types';
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

      // Step 1: Get initial response with thinking and tool calls
      const initialResult = await model.invoke(langchainMessages);
      
      // Parse the initial response to extract thinking and tool calls
      const { thinking, mainContent: initialMainContent } = this.parseResponse(initialResult.content as string);
      
      // Extract tool calls from the initial result
      const initialToolCalls = this.extractToolCalls(initialResult);
      
      // Step 2: Execute tools if any were called
      const toolResults: Array<{name: string, args: Record<string, unknown>, result: unknown, success: boolean}> = [];
      
      if (initialResult.tool_calls && initialResult.tool_calls.length > 0) {
        console.log('🔧 [LLM DEBUG] Executing tools in non-streaming mode:', initialResult.tool_calls.length);
        
        // Execute all tool calls
        for (const toolCall of initialResult.tool_calls) {
          try {
            // Find the tool by name
            const tool = allTools.find(t => t.name === toolCall.name);
            if (tool) {
              console.log('🔧 [LLM DEBUG] Executing tool:', toolCall.name, 'with args:', toolCall.args);
              
              // Execute the tool
              const toolResult = await tool.invoke(toolCall.args);
              
              toolResults.push({
                name: toolCall.name,
                args: toolCall.args,
                result: toolResult,
                success: true
              });
              
              console.log('🔧 [LLM DEBUG] Tool execution successful:', toolCall.name);
            } else {
              console.error('🔧 [LLM DEBUG] Tool not found:', toolCall.name);
              toolResults.push({
                name: toolCall.name,
                args: toolCall.args,
                result: `Tool ${toolCall.name} not found`,
                success: false
              });
            }
          } catch (toolError) {
            console.error(`🔧 [LLM DEBUG] Tool ${toolCall.name} execution error:`, toolError);
            
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
        
        // Parse the final response
        const { thinking: finalThinking, mainContent: finalMainContent } = this.parseResponse(finalResult.content as string);
        
        // Combine thinking from both responses
        const combinedThinking = [thinking, finalThinking].filter(Boolean).join('\n\n');
        
        // Update tool calls with results
        const updatedToolCalls = initialToolCalls.map(toolCall => {
          const result = toolResults.find(r => r.name === toolCall.name);
          return {
            ...toolCall,
            result: result?.result,
            success: result?.success
          };
        });
        
        return {
          content: finalMainContent || finalResult.content as string,
          model: modelConfig.id,
          thinking: combinedThinking || undefined,
          toolCalls: updatedToolCalls.length > 0 ? updatedToolCalls : undefined,
        };
      } else {
        // No tools called, return initial response
        return {
          content: initialMainContent || initialResult.content as string,
          model: modelConfig.id,
          thinking: thinking || undefined,
          toolCalls: initialToolCalls.length > 0 ? initialToolCalls : undefined,
        };
      }
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
      
      // Yield the initial thinking content immediately
      if (initialResult.content) {
        console.log('🔧 [LLM DEBUG] Yielding initial content:', (initialResult.content as string).substring(0, 200) + '...');
        yield initialResult.content as string;
      }
      
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
        
        // Step 4: Add tools section and final response
        if (toolResults.length > 0) {
          // Add tools section
          let toolsSection = `<tools>\n`;
          for (const toolResult of toolResults) {
            if (toolResult.success) {
              toolsSection += `<tool name="${toolResult.name}" args='${JSON.stringify(toolResult.args)}' result='${JSON.stringify(toolResult.result)}' success="true"></tool>\n`;
            } else {
              toolsSection += `<tool name="${toolResult.name}" args='${JSON.stringify(toolResult.args)}' error='${toolResult.result}' success="false"></tool>\n`;
            }
          }
          toolsSection += `</tools>\n\n`;
          
          // Yield tools section
          console.log('🔧 [LLM DEBUG] Yielding tools section:', toolsSection.substring(0, 200) + '...');
          yield toolsSection;
        }
        
        // Step 5: Yield final response
        if (finalResult.content) {
          console.log('🔧 [LLM DEBUG] Yielding final content:', (finalResult.content as string).substring(0, 200) + '...');
          yield finalResult.content as string;
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

  private static extractToolCalls(result: { tool_calls?: Array<{ function?: { name?: string; arguments?: string }; name?: string; args?: Record<string, unknown>; result?: unknown; success?: boolean }>; content?: string | unknown }): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
    // Check if the result has tool calls
    if (result.tool_calls && Array.isArray(result.tool_calls)) {
      for (const toolCall of result.tool_calls) {
        toolCalls.push({
          name: toolCall.function?.name || toolCall.name || 'unknown',
          args: toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : toolCall.args || {},
          result: toolCall.result,
          success: toolCall.success !== false, // Default to true if not specified
        });
      }
    }
    
    // Also check for tool calls in the content if they're embedded as text
    const contentString = typeof result.content === 'string' ? result.content : String(result.content || '');
    if (contentString) {
      const toolsSectionRegex = /<tools>([\s\S]*?)<\/tools>/gi;
      const toolsSectionMatch = contentString.match(toolsSectionRegex);
      
      if (toolsSectionMatch) {
        const toolsSection = toolsSectionMatch[0];
        const toolCallRegex = /<tool\s+name="([^"]+)"\s+args='([^']*)'\s+(?:result='([^']*)'\s+success="true"|error='([^']*)'\s+success="false")[^>]*><\/tool>/g;
        let toolMatch;
        
        while ((toolMatch = toolCallRegex.exec(toolsSection)) !== null) {
          const toolName = toolMatch[1];
          const argsString = toolMatch[2];
          const resultString = toolMatch[3];
          const errorString = toolMatch[4];
          
          try {
            const args = argsString ? JSON.parse(argsString) : {};
            let result = null;
            
            if (resultString) {
              try {
                result = JSON.parse(resultString);
              } catch {
                result = resultString;
              }
            }
            
            toolCalls.push({
              name: toolName,
              args,
              result: result,
              success: !errorString,
            });
          } catch {
            // If JSON parsing fails, store as string
            toolCalls.push({
              name: toolName,
              args: { raw: argsString },
              result: resultString || errorString,
              success: !errorString,
            });
          }
        }
      }
    }
    
    return toolCalls;
  }
}