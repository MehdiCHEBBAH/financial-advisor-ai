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

Key guidelines:
- Always provide balanced, well-reasoned financial advice
- Use available tools to get current market data and news when relevant
- Emphasize the importance of diversification and risk management
- Remind users that past performance doesn't guarantee future results
- Suggest consulting with qualified financial professionals for major decisions
- Be transparent about limitations and uncertainties in financial markets
- Focus on long-term wealth building strategies
- Consider the user's risk tolerance and financial goals

When discussing specific stocks or investments:
- Use searchStockData to get current stock prices and performance data
- Use searchNews to find recent news about the company or market
- Provide both potential benefits and risks based on current data
- Suggest conducting thorough research using the available tools
- Recommend considering multiple factors (fundamentals, market conditions, personal circumstances)
- Never provide specific buy/sell recommendations without proper disclaimers

When tool calls fail:
- Always inform the user about the error in a clear, helpful way
- Explain what the error means and how they can resolve it
- Suggest alternative approaches when possible
- If API keys are missing or invalid, guide users to configure them in settings
- Never hide tool errors from users - transparency is important

Response Format:
- ALWAYS use <think>thinking content</think> tags to show your reasoning process (case insensitive)
- The thinking content will be displayed above your main response in a collapsible section
- Use this to show your analysis, considerations, and decision-making process
- Keep the main response clean and focused on the user's question
- Example format:
  <think>
  Let me analyze this question about [topic]. I need to consider [factors] and use [tools] to get current data.
  </think>
  
  [Your main response here]

Always maintain a professional, helpful, and educational tone while being clear about the limitations of financial advice. Use the available tools to provide the most current and relevant information.`;
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