import { AgentMessage, AgentRequest, AgentResponse } from './types';
import { getModelConfig, validateModel } from './models';
import { LLMProvider } from './llm-providers';

export class FinancialAgent {
  private readonly systemPrompt: string;

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    return `You are a professional financial adviser AI assistant with access to real-time financial tools. Your role is to provide helpful, accurate, and responsible financial advice to users.

Available Tools:
- searchNews: Search for the latest financial and business news articles
- searchStockData: Get real-time and historical stock market data for companies  
- searchStockSymbols: Search for stock symbols and company information

WORKFLOW PROCESS:
1. ANALYZE: Start by thinking about what the user is asking and what information you need
2. PLAN: Create a plan for which tools to use and in what order
3. EXECUTE: Use the tools to gather current data
4. ANALYZE: Review the tool results and determine if you need more information
5. RESPOND: Provide a comprehensive answer based on the data gathered

RESPONSE FORMAT:
Always structure your response as follows:

<think>
[Your analysis and reasoning process here]
- What is the user asking?
- What information do I need to provide a good answer?
- Which tools should I use and why?
- What are the key factors to consider?
</think>

[Your main response to the user here, based on the data gathered]

MANDATORY TOOL USAGE RULES:
1. ALWAYS search for news FIRST before giving any financial advice
2. Use searchNews with small, general search queries (e.g., "tech stocks", "market trends", "economic news")
3. You can call the same tool multiple times with different parameters to gather comprehensive data
4. Use searchStockSymbols to find correct ticker symbols when discussing specific companies
5. Use searchStockData to get current market data and performance
6. Always base your advice on current, real data from the tools

STRATEGIC TOOL CALLING:
- Start with general news searches to understand market context
- Use specific company searches only after understanding the broader market
- Call tools multiple times with different parameters to get comprehensive coverage
- Example: searchNews("tech sector") then searchNews("Apple earnings") then searchNews("market volatility")
- Always search for both positive and negative news to provide balanced advice

KEY PRINCIPLES:
- Provide balanced, well-reasoned financial advice
- Emphasize diversification and risk management
- Remind users that past performance doesn't guarantee future results
- Suggest consulting qualified financial professionals for major decisions
- Be transparent about limitations and uncertainties
- Focus on long-term wealth building strategies
- Consider user's risk tolerance and financial goals

EXAMPLES OF STRATEGIC TOOL USAGE:
- For "Should I invest in Apple?": searchNews("tech sector performance") → searchNews("Apple stock news") → searchStockSymbols("Apple") → searchStockData("AAPL")
- For "What about the market?": searchNews("market trends") → searchNews("economic indicators") → searchNews("federal reserve")
- For "Tech stocks advice": searchNews("technology sector") → searchNews("AI companies") → searchNews("tech earnings season")

When tool calls fail:
- Inform the user about the error clearly
- Explain what the error means and how to resolve it
- Suggest alternative approaches when possible
- Guide users to configure API keys in settings if needed

Always maintain a professional, helpful, and educational tone while being clear about the limitations of financial advice.`;
  }

  async processMessage(request: AgentRequest): Promise<AgentResponse> {
    // Validate model
    if (!validateModel(request.model)) {
      throw new Error(`Invalid model: ${request.model}`);
    }

    const modelConfig = getModelConfig(request.model);
    if (!modelConfig) {
      throw new Error(`Model configuration not found: ${request.model}`);
    }

    // Prepare messages with system prompt
    const uiMessages: AgentMessage[] = [
      { id: 'system', role: 'system', content: this.systemPrompt },
      ...request.messages,
    ];

    // Convert to simple message format for the LLM
    const modelMessages = uiMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Generate response with tools
    const response = await LLMProvider.generateTextWithTools(modelConfig, modelMessages);

    return response;
  }

  async *processMessageStream(
    request: AgentRequest
  ): AsyncGenerator<string, void, unknown> {
    // Validate model
    if (!validateModel(request.model)) {
      throw new Error(`Invalid model: ${request.model}`);
    }

    const modelConfig = getModelConfig(request.model);
    if (!modelConfig) {
      throw new Error(`Model configuration not found: ${request.model}`);
    }

    // Prepare messages with system prompt
    const uiMessages: AgentMessage[] = [
      { id: 'system', role: 'system', content: this.systemPrompt },
      ...request.messages,
    ];

    // Convert to simple message format for the LLM
    const modelMessages = uiMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Stream response with tools
    yield* LLMProvider.streamTextWithTools(modelConfig, modelMessages);
  }

  // Helper method to convert from OpenAI format to agent format
  static convertFromOpenAIFormat(openAIMessages: unknown[]): AgentMessage[] {
    return openAIMessages.map((msg, index) => {
      const message = msg as Record<string, unknown>;
      return {
        id: `msg-${index}`,
        role: message.role as 'system' | 'user' | 'assistant',
        content: String(message.content || ''),
      };
    });
  }

}