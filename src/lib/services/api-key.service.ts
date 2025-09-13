import {
  UserAPIKeys,
  ModelStatus,
  APIKeyError,
  ModelConfigurationStatus,
} from '@/lib/agent/types';
import { MODEL_CONFIGS } from '@/lib/agent/models';

export class APIKeyService {
  private static readonly STORAGE_KEY = 'financial-adviser-api-keys';

  /**
   * Get user API keys from localStorage
   */
  static getUserAPIKeys(): UserAPIKeys {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load API keys from localStorage:', error);
      return {};
    }
  }

  /**
   * Save user API keys to localStorage
   */
  static saveUserAPIKeys(keys: UserAPIKeys): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Failed to save API keys to localStorage:', error);
    }
  }

  /**
   * Clear all user API keys
   */
  static clearUserAPIKeys(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear API keys from localStorage:', error);
    }
  }

  /**
   * Check if a specific API key is configured (user or environment)
   */
  static isAPIKeyConfigured(provider: string): boolean {
    const userKeys = this.getUserAPIKeys();

    // Check user keys first
    if (userKeys[provider as keyof UserAPIKeys]) {
      return true;
    }

    // Check environment variables - just check if they exist
    const envVarMap: Record<string, string> = {
      groq: 'GROQ_API_KEY',
      openai: 'OPENAI_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      google: 'GOOGLE_API_KEY',
    };

    const envVar = envVarMap[provider];
    if (!envVar) return false;

    const envValue = process.env[envVar];
    return !!envValue; // Just check if the environment variable exists and is not empty
  }

  /**
   * Get the effective API key for a provider (user key takes precedence)
   */
  static getEffectiveAPIKey(provider: string): string | undefined {
    const userKeys = this.getUserAPIKeys();

    // User key takes precedence
    if (userKeys[provider as keyof UserAPIKeys]) {
      return userKeys[provider as keyof UserAPIKeys];
    }

    // Fall back to environment variables - just return the value if it exists
    const envVarMap: Record<string, string> = {
      groq: 'GROQ_API_KEY',
      openai: 'OPENAI_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      google: 'GOOGLE_API_KEY',
    };

    const envVar = envVarMap[provider];
    if (!envVar) return undefined;

    const envValue = process.env[envVar];
    return envValue || undefined; // Just return the environment variable value
  }

  /**
   * Check model configuration status by actually testing connectivity
   */
  static async checkModelConfigurationStatus(): Promise<ModelConfigurationStatus> {
    const models: ModelStatus[] = [];
    const errors: APIKeyError[] = [];
    let hasAnyConfigured = false;

    // Group models by provider to avoid duplicate API calls
    const providerStatus: Record<
      string,
      { configured: boolean; error?: string }
    > = {};

    for (const modelConfig of MODEL_CONFIGS) {
      let status: { configured: boolean; error?: string };

      // Check if we've already tested this provider
      if (providerStatus.hasOwnProperty(modelConfig.provider)) {
        status = providerStatus[modelConfig.provider];
      } else {
        // Actually test the API key by making a real call
        status = await this.testProviderConnectivity(
          modelConfig.provider,
          modelConfig
        );
        providerStatus[modelConfig.provider] = status;
      }

      if (status.configured) {
        hasAnyConfigured = true;
      }

      models.push({
        id: modelConfig.id,
        configured: status.configured,
        requiresUserKey: !status.configured,
        error: status.error,
      });
    }

    return {
      models,
      hasAnyConfigured,
      errors,
    };
  }

  /**
   * Test actual connectivity with a provider by making a real API call
   */
  private static async testProviderConnectivity(
    provider: string,
    modelConfig: ModelConfig
  ): Promise<{ configured: boolean; error?: string }> {
    const apiKey = this.getEffectiveAPIKey(provider);

    if (!apiKey) {
      return {
        configured: false,
        error: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key not configured`,
      };
    }

    try {
      // Set the API key as environment variable for the test
      this.setAPIKeyEnvironmentVariable(provider, apiKey);

      // Import the AI SDK
      const { generateText } = await import('ai');

      // Create the model for testing
      let model;
      switch (provider) {
        case 'groq': {
          const { groq } = await import('@ai-sdk/groq');
          model = groq(modelConfig.model);
          break;
        }
        case 'openai': {
          const { openai } = await import('@ai-sdk/openai');
          model = openai(modelConfig.model);
          break;
        }
        case 'google': {
          const { google } = await import('@ai-sdk/google');
          model = google(modelConfig.model);
          break;
        }
        case 'deepseek': {
          const { deepseek } = await import('@ai-sdk/deepseek');
          model = deepseek(modelConfig.model);
          break;
        }
        default:
          return {
            configured: false,
            error: `Unsupported provider: ${provider}`,
          };
      }

      // Make a simple test call
      await generateText({
        model,
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 1,
      });

      return { configured: true };
    } catch (error: unknown) {
      console.error(
        `Provider connectivity test failed for ${provider}:`,
        error
      );

      // Parse the error to provide a meaningful message
      const apiError = this.parseAPIError(error, modelConfig.id, provider);

      return {
        configured: false,
        error: apiError.message,
      };
    }
  }

  /**
   * Set API key as environment variable for testing
   */
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

  /**
   * Parse API error and return structured error information
   */
  static parseAPIError(
    error: unknown,
    model?: string,
    provider?: string
  ): APIKeyError {
    const errorMessage =
      (error as Error)?.message || String(error) || 'Unknown error';

    // Check for specific error types
    if (
      errorMessage.includes('API key is missing') ||
      errorMessage.includes('API key')
    ) {
      return {
        type: 'missing_key',
        message: 'API key is missing or invalid',
        model,
        provider,
      };
    }

    // Check for quota exceeded errors
    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('billing') ||
      errorMessage.includes('exceeded your current quota') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      (error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'error' in error.data &&
        error.data.error &&
        typeof error.data.error === 'object' &&
        'status' in error.data.error &&
        error.data.error.status === 'RESOURCE_EXHAUSTED') ||
      (error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        error.statusCode === 429)
    ) {
      return {
        type: 'quota_exceeded',
        message:
          'API quota exceeded or billing issue. Please check your account or try again later.',
        model,
        provider,
      };
    }

    if (errorMessage.includes('model') && errorMessage.includes('not found')) {
      return {
        type: 'model_not_supported',
        message: 'Model not supported or not found',
        model,
        provider,
      };
    }

    return {
      type: 'unknown',
      message: errorMessage,
      model,
      provider,
    };
  }

  /**
   * Validate API key format (basic validation) - simplified to just check if not empty
   */
  static validateAPIKey(
    provider: string,
    key: string
  ): { valid: boolean; error?: string } {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    return { valid: true };
  }
}
