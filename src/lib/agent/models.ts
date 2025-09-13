import { ModelConfig, Provider } from './types';

// Model configurations for all supported LLMs (only tool-calling enabled models)
export const MODEL_CONFIGS: ModelConfig[] = [
  // Groq Models (only tool-calling enabled)
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    description: 'Meta Llama 3.1 8B model - fast and efficient with tool calling support',
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    description: 'Meta Llama 3.3 70B model - versatile and capable with tool calling support',
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
  {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    description: 'OpenAI GPT-OSS 120B model with tool calling support',
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
  {
    id: 'gpt-oss-20b',
    name: 'GPT-OSS 20B',
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'OpenAI GPT-OSS 20B model with tool calling support',
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },

  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    description: "OpenAI's most advanced multimodal model",
    maxTokens: 4096,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    description: 'Faster, more affordable GPT-4o variant',
    maxTokens: 16384,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    description: 'High-performance GPT-4 with extended context',
    maxTokens: 4096,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },

  // DeepSeek Models
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    description: "DeepSeek's advanced conversational AI model",
    maxTokens: 4096,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    model: 'deepseek-coder',
    description: 'Specialized for coding tasks and technical analysis',
    maxTokens: 4096,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },

  // Google Gemini Models
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    model: 'gemini-1.5-pro',
    description: "Google's most capable multimodal model",
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    model: 'gemini-1.5-flash',
    description: 'Fast and efficient Gemini model',
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
];

// Provider information
export const PROVIDERS: Provider[] = [
  {
    id: 'groq',
    name: 'Groq',
    description: 'Fast inference with open-source models',
    icon: 'https://groq.com/favicon.svg',
    requiresApiKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Advanced AI models including GPT-4',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png',
    requiresApiKey: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Specialized AI models for coding and reasoning',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/DeepSeek-icon.svg/512px-DeepSeek-icon.svg.png?20250630230357',
    requiresApiKey: true,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    description: "Google's multimodal AI models",
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Google-gemini-icon.svg/512px-Google-gemini-icon.svg.png?20240826133250',
    requiresApiKey: true,
  },
];

// Helper functions
export function getModelConfig(id: string): ModelConfig | undefined {
  return MODEL_CONFIGS.find((config) => config.id === id);
}

export function getModelById(id: string): ModelConfig | undefined {
  return MODEL_CONFIGS.find((config) => config.id === id);
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  return MODEL_CONFIGS.filter((config) => config.provider === provider);
}

export function getDefaultModel(): string {
  return MODEL_CONFIGS[0]?.id || 'llama-3.1-8b-instant';
}

export function validateModel(modelId: string): boolean {
  return MODEL_CONFIGS.some((config) => config.id === modelId);
}

export function getAllProviders(): Provider[] {
  return PROVIDERS;
}

export function getProviderConfig(providerId: string): Provider | undefined {
  return PROVIDERS.find((provider) => provider.id === providerId);
}

// Type alias for compatibility
export type ProviderConfig = Provider;
