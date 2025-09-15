import { ModelConfig, AgentResponse, ToolCall } from './types';
import { APIKeyService } from '@/lib/services';
import { allTools } from '@/lib/tools';
import { LangSmithTracer } from './langsmith-tracer';

// LangChain imports
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatDeepSeek } from '@langchain/deepseek';
import { HumanMessage, SystemMessage, ToolMessage, AIMessage, BaseMessageLike } from '@langchain/core/messages';

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
  // ========== Small helpers to simplify flows ==========
  private static mapMessages(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Array<SystemMessage | HumanMessage | AIMessage> {
    return messages.map(msg => {
      if (msg.role === 'system') return new SystemMessage(msg.content);
      if (msg.role === 'user') return new HumanMessage(msg.content);
      return new AIMessage(msg.content);
    });
  }

  private static async executeToolCalls(
    toolCalls: Array<{ name?: string; args?: Record<string, unknown> }> | undefined,
    outResults: Array<{ name: string; args: Record<string, unknown>; result: unknown; success: boolean }>
  ): Promise<void> {
    if (!toolCalls || toolCalls.length === 0) return;
    for (const toolCall of toolCalls) {
      try {
        const toolName = toolCall.name || 'unknown';
        const args = toolCall.args || {};
        const tool = allTools.find(t => t.name === toolName);
        if (!tool) {
          outResults.push({ name: toolName, args, result: `Tool ${toolName} not found`, success: false });
          continue;
        }
        const toolResult = await tool.invoke(args);
        outResults.push({ name: toolName, args, result: toolResult, success: true });
      } catch (err) {
        outResults.push({
          name: toolCall.name || 'unknown',
          args: toolCall.args || {},
          result: err instanceof Error ? err.message : 'Unknown error',
          success: false,
        });
      }
    }
  }

  private static async maybeFetchStockData(
    toolResults: Array<{ name: string; args: Record<string, unknown>; result: unknown; success: boolean }>,
    traced: boolean
  ): Promise<void> {
    try {
      const hasStockData = toolResults.some(tr => tr.name === 'searchStockData' && tr.success);
      if (hasStockData) return;
      const symbolsResult = toolResults.find(tr => tr.name === 'searchStockSymbols' && tr.success);
      const symbolsObj = symbolsResult ? this.tryParseObject(symbolsResult.result) as { results?: Array<Record<string, unknown>> } | null : null;
      const resultsArr = symbolsObj?.results ?? [];
      const first = resultsArr.length > 0 ? resultsArr[0] : undefined;
      const symbol = first && typeof first.symbol === 'string' ? first.symbol as string : undefined;
      if (!symbol) return;
      const args = { symbol } as Record<string, unknown>;
      const tool = allTools.find(t => t.name === 'searchStockData');
      if (!tool) return;
      const result = traced
        ? await LangSmithTracer.traceToolCall('searchStockData', args, () => tool.invoke(args))
        : await tool.invoke(args);
      toolResults.push({ name: 'searchStockData', args, result, success: true });
    } catch (extraErr) {
      console.error('🔧 [LLM DEBUG] Extra tool call error:', extraErr);
    }
  }

  private static buildToolMessages(
    toolCalls: Array<unknown> | undefined,
    toolResults: Array<{ name: string; args: Record<string, unknown>; result: unknown; success: boolean }>
  ): ToolMessage[] {
    const calls = (toolCalls || []) as Array<Record<string, unknown>>;
    return calls.map(tc => {
      const name = typeof tc.name === 'string' ? (tc.name as string) : 'unknown';
      const result = toolResults.find(r => r.name === name);
      const toolCallId = this.getToolCallId(tc) || `call_${Date.now()}_${Math.random()}`;
      return new ToolMessage(
        JSON.stringify(result?.result || { error: 'Tool execution failed' }),
        toolCallId
      );
    });
  }

  private static buildConversationWithTools(
    prior: Array<SystemMessage | HumanMessage | AIMessage>,
    assistantWithCalls: SystemMessage | HumanMessage | AIMessage | ToolMessage,
    toolMessages: Array<ToolMessage>,
    toolsSectionText: string
  ): Array<BaseMessageLike> {
    return [
      ...prior,
      assistantWithCalls,
      ...toolMessages,
      new HumanMessage(toolsSectionText),
      new HumanMessage('Based on the tool results above, provide a comprehensive response. Analyze the tool results and give a helpful, informative answer.'),
    ];
  }

  private static finalizeResponse(
    modelId: string,
    initialThinking: string,
    initialToolCalls: ToolCall[],
    toolResults: Array<{ name: string; args: Record<string, unknown>; result: unknown; success: boolean }>,
    finalResult: { content?: unknown }
  ): AgentResponse {
    const finalTextContent = this.getTextContent(finalResult.content);
    const { thinking: finalThinking, mainContent: finalMainContent } = this.parseResponse(finalTextContent);
    const combinedThinking = [initialThinking, finalThinking].filter(Boolean).join('\n\n');
    const updatedToolCalls = initialToolCalls.map(tc => {
      const r = toolResults.find(tr => tr.name === tc.name);
      return { ...tc, result: r?.result, success: r?.success };
    });
    return {
      content: finalMainContent || finalTextContent,
      model: modelId,
      thinking: combinedThinking || undefined,
      toolCalls: updatedToolCalls.length > 0 ? updatedToolCalls : undefined,
    };
  }



  static async generateTextWithTools(
    modelConfig: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature?: number,
    maxTokens?: number
  ): Promise<AgentResponse> {
    return LangSmithTracer.traceLLMCall(
      modelConfig,
      messages,
      async () => {
        try {
          const config = this.getProviderConfig(modelConfig);

          // Convert messages to LangChain format
          const langchainMessages = this.mapMessages(messages);

          // Get the appropriate LangChain model with tools
          const model = this.getLangChainModelWithTools(modelConfig.provider, config.model, config.apiKey);

          // Step 1: Get initial response with thinking and tool calls
          const initialResult = await model.invoke(langchainMessages);
          
          // Parse the initial response to extract thinking and tool calls
          const initialTextContent = this.getTextContent(initialResult.content);
          const { thinking, mainContent: initialMainContent } = this.parseResponse(initialTextContent);
          
          // Extract tool calls from the initial result
          const initialToolCalls = this.extractToolCalls(initialResult);
          
          // Step 2: Execute tools if any were called
          const toolResults: Array<{name: string, args: Record<string, unknown>, result: unknown, success: boolean}> = [];
          
          if (initialResult.tool_calls && initialResult.tool_calls.length > 0) {
            console.log('🔧 [LLM DEBUG] Executing tools in non-streaming mode:', initialResult.tool_calls.length);
            
            await this.executeToolCalls(initialResult.tool_calls, toolResults);
            
            // Opportunistic extra tool calls: if a ticker was found but no price data fetched, fetch it
            await this.maybeFetchStockData(toolResults, true);

            // Step 3: Create proper tool messages for each tool call
            const toolMessages = this.buildToolMessages(initialResult.tool_calls, toolResults);

            // Also add a summarized tools section as plain text for the model to consume (covers extra deterministic calls)
            const toolsSectionText = this.buildToolsSection(toolResults);

            // Step 4: Create conversation with proper tool message format
            const messagesWithToolResults = this.buildConversationWithTools(langchainMessages, initialResult, toolMessages, toolsSectionText);
            
            console.log('🔧 [LLM DEBUG] Getting final response with tool results...');
            console.log('🔧 [LLM DEBUG] Messages count:', messagesWithToolResults.length);
            console.log('🔧 [LLM DEBUG] Tool results count:', toolResults.length);
            
            const finalResult = await model.invoke(messagesWithToolResults);
            
            console.log('🔧 [LLM DEBUG] Final result received:', !!finalResult);
            console.log('🔧 [LLM DEBUG] Final result content length:', (finalResult.content as string)?.length || 0);
            console.log('🔧 [LLM DEBUG] Final result content preview:', (finalResult.content as string)?.substring(0, 200) + '...');
            
            return this.finalizeResponse(modelConfig.id, thinking, initialToolCalls, toolResults, finalResult);
          } else {
            // No tools called, return initial response
            return {
              content: initialMainContent || initialTextContent,
              model: modelConfig.id,
              thinking: thinking || undefined,
              toolCalls: initialToolCalls.length > 0 ? initialToolCalls : undefined,
            };
          }
        } catch (error) {
          console.error('LLM Provider error:', error);
          throw error;
        }
      },
      temperature,
      maxTokens
    );
  }

  static async *streamTextWithTools(
    modelConfig: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): AsyncGenerator<string, void, unknown> {
    try {
      const config = this.getProviderConfig(modelConfig);

      // Convert messages to LangChain format
      const langchainMessages = this.mapMessages(messages);

      // Get the appropriate LangChain model with tools
      const model = this.getLangChainModelWithTools(modelConfig.provider, config.model, config.apiKey);

      // Step 1: Get initial response with thinking and tool calls
      const initialResult = await model.invoke(langchainMessages);
      
      // Yield the initial thinking content immediately
      {
        const initialText = this.getTextContent(initialResult.content);
        if (initialText) {
          console.log('🔧 [LLM DEBUG] Yielding initial content:', initialText.substring(0, 200) + '...');
          yield initialText;
        }
      }
      
      // Step 2: Execute tools if any were called
      const toolResults: Array<{name: string, args: Record<string, unknown>, result: unknown, success: boolean}> = [];
      
      if (initialResult.tool_calls && initialResult.tool_calls.length > 0) {
        // Execute all tool calls
        await this.executeToolCalls(initialResult.tool_calls, toolResults);
        
        // Opportunistic extra tool calls (streaming path): fetch stock data if ticker found and none fetched
        await this.maybeFetchStockData(toolResults, false);

        // Step 3: Create proper tool messages for each tool call
        const toolMessages = this.buildToolMessages(initialResult.tool_calls, toolResults);

        // Also add a summarized tools section as plain text for the model to consume (covers extra deterministic calls)
        const toolsSectionText = this.buildToolsSection(toolResults);

        // Step 4: Create conversation with proper tool message format
        const messagesWithToolResults = this.buildConversationWithTools(langchainMessages, initialResult, toolMessages, toolsSectionText);
        
        console.log('🔧 [LLM DEBUG] Getting final response with tool results...');
        console.log('🔧 [LLM DEBUG] Messages count:', messagesWithToolResults.length);
        console.log('🔧 [LLM DEBUG] Tool results count:', toolResults.length);
        
        const finalResult = await model.invoke(messagesWithToolResults);
        
        console.log('🔧 [LLM DEBUG] Final result received:', !!finalResult);
        console.log('🔧 [LLM DEBUG] Final result content length:', (finalResult.content as string)?.length || 0);
        
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
        {
          const finalText = this.getTextContent(finalResult.content);
          if (finalText) {
            console.log('🔧 [LLM DEBUG] Yielding final content:', finalText.substring(0, 200) + '...');
            yield finalText;
          }
        }
      } else {
        // No tools, just stream the initial response
        {
          const initialText = this.getTextContent(initialResult.content);
          if (initialText) {
            yield initialText;
          }
        }
      }
    } catch (error) {
      console.error('LLM Provider streaming error:', error);
      throw error;
    }
  }

  // Safely extract textual content from LangChain message content which can be string or array of parts
  private static getTextContent(content: unknown): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      // LangChain content parts may look like { type: 'text', text: '...' }
      const texts: string[] = [];
      for (const part of content as Array<unknown>) {
        if (typeof part === 'string') {
          texts.push(part);
        } else if (part && typeof part === 'object') {
          const maybeObj = part as Record<string, unknown>;
          if (typeof maybeObj.text === 'string') {
            texts.push(maybeObj.text);
          } else if (typeof maybeObj.content === 'string') {
            texts.push(maybeObj.content);
          }
        }
      }
      return texts.join('');
    }
    // Fallback for unexpected structures
    try {
      return String(content);
    } catch {
      return '';
    }
  }

  private static getToolCallId(toolCall: unknown): string | undefined {
    if (toolCall && typeof toolCall === 'object') {
      const obj = toolCall as Record<string, unknown>;
      const id = obj.id;
      if (typeof id === 'string') return id;
      // Some providers nest id under function call
      const functionField = obj.function as Record<string, unknown> | undefined;
      if (functionField && typeof functionField.id === 'string') {
        return functionField.id as string;
      }
    }
    return undefined;
  }

  // removed fallback synthesis; the model must analyze tool results itself

  private static tryParseObject(val: unknown): Record<string, unknown> | null {
    if (!val) return null;
    if (typeof val === 'object') return val as Record<string, unknown>;
    if (typeof val === 'string') {
      try { return JSON.parse(val) as Record<string, unknown>; } catch { return null; }
    }
    return null;
  }

  private static buildToolsSection(toolResults: Array<{ name: string; args: Record<string, unknown>; result: unknown; success: boolean }>): string {
    if (!toolResults || toolResults.length === 0) return '';
    let toolsSection = '<tools>\n';
    for (const tr of toolResults) {
      if (tr.success) {
        toolsSection += `<tool name="${tr.name}" args='${JSON.stringify(tr.args)}' result='${JSON.stringify(tr.result)}' success="true"></tool>\n`;
      } else {
        toolsSection += `<tool name="${tr.name}" args='${JSON.stringify(tr.args)}' error='${String(tr.result)}' success="false"></tool>\n`;
      }
    }
    toolsSection += '</tools>';
    return toolsSection;
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