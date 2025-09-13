// Agent and model types
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentRequest {
  messages: AgentMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'groq' | 'openai' | 'deepseek' | 'google';
  model: string;
  description: string;
  maxTokens: number;
  temperature: {
    min: number;
    max: number;
    default: number;
  };
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
  };
}

export interface AgentConfig {
  defaultModel: string;
  availableModels: ModelConfig[];
  systemPrompt: string;
}

// New types for API key management and error handling
export interface UserAPIKeys {
  groq?: string;
  openai?: string;
  deepseek?: string;
  google?: string;
}

export interface ModelStatus {
  id: string;
  configured: boolean;
  error?: string;
  requiresUserKey?: boolean;
}

export interface APIKeyError {
  type:
    | 'missing_key'
    | 'invalid_key'
    | 'quota_exceeded'
    | 'model_not_supported'
    | 'network_error'
    | 'authentication_error'
    | 'unknown';
  message: string;
  model?: string;
  provider?: string;
  timestamp?: string;
}

export interface ModelConfigurationStatus {
  models: ModelStatus[];
  hasAnyConfigured: boolean;
  errors: APIKeyError[];
}

export interface Provider {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiresApiKey: boolean;
}
