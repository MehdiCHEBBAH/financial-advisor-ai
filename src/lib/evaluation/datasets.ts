import { EvaluationExample } from './langsmith-evaluator';
import { AgentMessage } from '@/lib/agent/types';

// Helper function to create AgentMessage objects
const createMessage = (id: string, role: 'user' | 'assistant', content: string): AgentMessage => ({
  id,
  role,
  content,
});

export const basicFinancialQuestions: EvaluationExample[] = [
  {
    id: 'basic-stock-advice-1',
    input: {
      messages: [
        createMessage('user-1', 'user', 'Should I invest in Apple stock?')
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide balanced advice about Apple stock with current data',
      shouldUseTools: true,
      expectedToolCalls: ['searchLiveNews', 'searchStockData', 'searchStockSymbols'],
    },
    metadata: {
      category: 'stock-advice',
      difficulty: 'easy',
      description: 'Basic stock investment advice request',
    },
  },
  {
    id: 'market-overview-1',
    input: {
      messages: [
        createMessage('user-2', 'user', 'What\'s happening in the stock market today?')
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide current market overview with recent news and trends',
      shouldUseTools: true,
      expectedToolCalls: ['searchLiveNews'],
    },
    metadata: {
      category: 'market-overview',
      difficulty: 'easy',
      description: 'General market overview request',
    },
  },
  {
    id: 'tech-sector-analysis-1',
    input: {
      messages: [
        createMessage('user-3', 'user', 'How is the technology sector performing?')
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should analyze technology sector performance with current data',
      shouldUseTools: true,
      expectedToolCalls: ['searchLiveNews'],
    },
    metadata: {
      category: 'sector-analysis',
      difficulty: 'medium',
      description: 'Technology sector performance analysis',
    },
  },
  {
    id: 'investment-strategy-1',
    input: {
      messages: [
        createMessage('user-4', 'user', 'What\'s a good investment strategy for a beginner?')
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide educational investment strategy advice',
      shouldUseTools: false,
    },
    metadata: {
      category: 'investment-strategy',
      difficulty: 'easy',
      description: 'Beginner investment strategy advice',
    },
  },
  {
    id: 'risk-assessment-1',
    input: {
      messages: [
        createMessage("user-4", "user", "What are the risks of investing in cryptocurrency?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should explain cryptocurrency risks with balanced perspective',
      shouldUseTools: false,
    },
    metadata: {
      category: 'risk-assessment',
      difficulty: 'medium',
      description: 'Cryptocurrency risk assessment',
    },
  },
];

export const advancedFinancialQuestions: EvaluationExample[] = [
  {
    id: 'portfolio-optimization-1',
    input: {
      messages: [
        createMessage("user-5", "user", "How should I diversify my portfolio across different asset classes?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide detailed portfolio diversification advice',
      shouldUseTools: false,
    },
    metadata: {
      category: 'portfolio-management',
      difficulty: 'hard',
      description: 'Portfolio diversification strategy',
    },
  },
  {
    id: 'economic-indicators-1',
    input: {
      messages: [
        createMessage("user-6", "user", "How do current economic indicators affect stock market performance?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should analyze economic indicators and their market impact',
      shouldUseTools: true,
      expectedToolCalls: ['searchLiveNews'],
    },
    metadata: {
      category: 'economic-analysis',
      difficulty: 'hard',
      description: 'Economic indicators and market correlation analysis',
    },
  },
  {
    id: 'sector-rotation-1',
    input: {
      messages: [
        createMessage("user-7", "user", "Which sectors are likely to outperform in the next quarter?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should analyze sector performance trends and predictions',
      shouldUseTools: true,
      expectedToolCalls: ['searchLiveNews'],
    },
    metadata: {
      category: 'sector-analysis',
      difficulty: 'hard',
      description: 'Sector rotation and performance prediction',
    },
  },
];

export const toolUsageTests: EvaluationExample[] = [
  {
    id: 'tool-usage-news-1',
    input: {
      messages: [
        createMessage("user-8", "user", "What are the latest news about Tesla?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide current Tesla news using news search tools',
      shouldUseTools: true,
      expectedToolCalls: ['searchLiveNews'],
    },
    metadata: {
      category: 'tool-usage',
      difficulty: 'easy',
      description: 'Test news search tool usage',
    },
  },
  {
    id: 'tool-usage-stock-data-1',
    input: {
      messages: [
        createMessage("user-9", "user", "What is the current stock price of Microsoft?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide current Microsoft stock data using stock tools',
      shouldUseTools: true,
      expectedToolCalls: ['searchStockSymbols', 'searchStockData'],
    },
    metadata: {
      category: 'tool-usage',
      difficulty: 'easy',
      description: 'Test stock data tool usage',
    },
  },
  {
    id: 'tool-usage-historical-1',
    input: {
      messages: [
        createMessage("user-10", "user", "What happened in the stock market on January 15, 2024?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide historical market data for the specified date',
      shouldUseTools: true,
      expectedToolCalls: ['searchHistoricalNews'],
    },
    metadata: {
      category: 'tool-usage',
      difficulty: 'medium',
      description: 'Test historical data tool usage',
    },
  },
];

export const edgeCases: EvaluationExample[] = [
  {
    id: 'edge-case-invalid-ticker-1',
    input: {
      messages: [
        createMessage("user-11", "user", "Should I invest in XYZ123 stock?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should handle invalid ticker gracefully and suggest alternatives',
      shouldUseTools: true,
      expectedToolCalls: ['searchStockSymbols'],
    },
    metadata: {
      category: 'edge-cases',
      difficulty: 'medium',
      description: 'Handle invalid stock ticker symbol',
    },
  },
  {
    id: 'edge-case-no-tools-1',
    input: {
      messages: [
        createMessage("user-12", "user", "What is compound interest?")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should provide educational explanation without using tools',
      shouldUseTools: false,
    },
    metadata: {
      category: 'edge-cases',
      difficulty: 'easy',
      description: 'Educational question that doesn\'t require tools',
    },
  },
  {
    id: 'edge-case-ambiguous-1',
    input: {
      messages: [
        createMessage("user-13", "user", "Tell me about Apple.")
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    },
    expectedOutput: {
      content: 'Should clarify whether user means Apple Inc. stock or the company',
      shouldUseTools: false,
    },
    metadata: {
      category: 'edge-cases',
      difficulty: 'medium',
      description: 'Ambiguous question requiring clarification',
    },
  },
];

// Combined datasets
export const allEvaluationExamples: EvaluationExample[] = [
  ...basicFinancialQuestions,
  ...advancedFinancialQuestions,
  ...toolUsageTests,
  ...edgeCases,
];

export const evaluationDatasets = {
  basic: {
    name: 'Basic Financial Questions',
    description: 'Basic financial advice and market overview questions',
    examples: basicFinancialQuestions,
  },
  advanced: {
    name: 'Advanced Financial Analysis',
    description: 'Complex financial analysis and portfolio management questions',
    examples: advancedFinancialQuestions,
  },
  toolUsage: {
    name: 'Tool Usage Tests',
    description: 'Tests to verify proper tool usage for different scenarios',
    examples: toolUsageTests,
  },
  edgeCases: {
    name: 'Edge Cases',
    description: 'Edge cases and error handling scenarios',
    examples: edgeCases,
  },
  all: {
    name: 'Complete Evaluation Suite',
    description: 'All evaluation examples combined',
    examples: allEvaluationExamples,
  },
};
