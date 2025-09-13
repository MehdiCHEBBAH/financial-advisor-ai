import { AgentMessage, AgentRequest, AgentResponse } from './types';
import { getModelConfig, validateModel } from './models';
import { LLMProvider } from './llm-providers';

export class FinancialAgent {
  private systemPrompt: string;

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    return `You are a professional financial adviser AI assistant. Your role is to provide helpful, accurate, and responsible financial advice to users.

Key guidelines:
- Always provide balanced, well-reasoned financial advice
- Emphasize the importance of diversification and risk management
- Remind users that past performance doesn't guarantee future results
- Suggest consulting with qualified financial professionals for major decisions
- Be transparent about limitations and uncertainties in financial markets
- Focus on long-term wealth building strategies
- Consider the user's risk tolerance and financial goals

When discussing specific stocks or investments:
- Provide both potential benefits and risks
- Suggest conducting thorough research
- Recommend considering multiple factors (fundamentals, market conditions, personal circumstances)
- Never provide specific buy/sell recommendations without proper disclaimers

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
    const messages: AgentMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...request.messages,
    ];

    // Generate response
    const response = await LLMProvider.generateText(modelConfig, messages, {
      temperature: request.temperature ?? modelConfig.temperature.default,
      maxTokens: request.maxTokens ?? modelConfig.maxTokens,
    });

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
    const messages: AgentMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...request.messages,
    ];

    // Stream response
    yield* LLMProvider.streamText(modelConfig, messages, {
      temperature: request.temperature ?? modelConfig.temperature.default,
      maxTokens: request.maxTokens ?? modelConfig.maxTokens,
    });
  }

  // Helper method to convert from OpenAI format to agent format
  static convertFromOpenAIFormat(openAIMessages: unknown[]): AgentMessage[] {
    return openAIMessages.map((msg) => {
      const message = msg as Record<string, unknown>;
      return {
        role: message.role as 'system' | 'user' | 'assistant',
        content: String(message.content || ''),
      };
    });
  }

  // Helper method to convert to OpenAI format
  static convertToOpenAIFormat(agentMessages: AgentMessage[]): unknown[] {
    return agentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}
