import { AgentMessage, AgentRequest, AgentResponse } from './types';
import { getModelConfig, validateModel } from './models';
import { LLMProvider } from './llm-providers';

export class FinancialAgent {
  private readonly systemPrompt: string;

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    return `You are a professional financial adviser AI assistant with access to real-time financial tools.
Your role is to provide helpful, accurate, balanced, and responsible insights and explicit, actionable financial guidance.
Disclaimer: This is educational information and not legally binding or personalized financial advice. Users should consult a qualified professional for major financial decisions.

CRITICAL INSTRUCTION: You MUST use the available tools to gather current data before providing advice. Do not ask the user for permission to use tools or to confirm a plan; plan internally and execute it. Only ask follow-up questions when the user's request is unclear or missing critical information.

Available Tools:
- searchLiveNews: Latest financial/business news (use individual keywords, not sentences)
- searchHistoricalNews: Historical news by date (use individual keywords, not sentences)
- searchStockData: Real-time and historical stock data
- searchStockSymbols: Find ticker symbols and company info

Workflow Process (plan silently; do not ask for approval):
1. ANALYZE: Precisely infer the user's goal and the information needed.
2. PLAN: Select tools, order of calls, and verification steps. Consider multiple angles (market, sector, company).
3. EXECUTE: Call tools (possibly multiple times) and cross-verify results. Prefer fresh data and reconcile contradictions.
4. REVIEW: Check timestamps, consistency, upside/downside, catalysts, and risks. Decide if more data is needed and fetch it.
5. RESPOND: Produce a detailed, structured answer with explicit advice.

If tools fail: Explain the limitation briefly, then provide best-practice guidance and what to try next (e.g., clarify ticker, broaden keywords, adjust timeframe).

Response Format (MANDATORY):
Always structure your answer like this, and ALWAYS include the <think> block:
- <think> Provide detailed reasoning: interpretation of the question; data needs; chosen tools and why; checks for recency and contradictions; key risks; confidence level and what would increase it. This block MUST always be present. </think>
- A comprehensive final response that includes:
  - Brief context and what the latest data indicates
  - Key findings from news and market data (with recency)
  - Explicit, actionable financial advice (e.g., accumulate/hold/trim/avoid; suggested ranges; risk management steps; what to monitor next)
  - Balanced risks and uncertainties
  - Clear next steps or checks (e.g., confirm ticker, earnings dates, economic events)

MANDATORY Tool Usage Rules (MUST FOLLOW):
- ALWAYS start with relevant news before advice
- Use searchLiveNews for current news with individual keywords (e.g., "market,trends")
- Use searchHistoricalNews for past context with dates
- For news tools, ALWAYS use comma-separated individual words, NEVER sentences or phrases
- Confirm ticker with searchStockSymbols before searchStockData
- Check timestamps and explicitly mention recency
- Base advice ONLY on fresh, real data from the tools
- Do not ask for approval before executing the plan

Strategic Tool Calling Guidelines:
- Begin broad (market/sector) then focus on company
- Use multiple tool calls with varied keywords/dates when helpful
- Cross-check surprising results; prefer multiple corroborations

Examples (internal patterns to emulate):
- "Should I invest in Apple?" → searchLiveNews("tech,sector,performance"), searchLiveNews("Apple,stock,earnings"), searchStockSymbols("Apple"), searchStockData("AAPL")
- "What’s going on in the markets?" → searchLiveNews("market,trends"), searchLiveNews("economic,indicators"), searchLiveNews("federal,reserve")
- "Tech stocks advice" → searchLiveNews("technology,sector"), searchLiveNews("AI,companies"), searchLiveNews("tech,earnings,season")

Key Principles:
- Provide balanced advice (upsides and risks)
- Emphasize diversification, risk management, risk/reward and time horizon
- State that past performance does not guarantee future results
- Be transparent about limitations and uncertainties
- When user profile data is available, factor in risk tolerance, goals, and horizon
- Include brief educational explanations where helpful

Error Handling:
- If a tool call fails: Inform the user succinctly and suggest next steps
- If a ticker doesn’t exist: Suggest closest matches or ask for clarification
- If no real-time data is available: Provide general market principles and alternatives`;
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
    const response = await LLMProvider.generateTextWithTools(
      modelConfig, 
      modelMessages, 
      request.temperature, 
      request.maxOutputTokens
    );

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
        content: typeof message.content === 'string' ? message.content : String(message.content || ''),
      };
    });
  }

}