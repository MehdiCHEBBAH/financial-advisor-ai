'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Key, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAllProviders,
  getModelsByProvider,
  getProviderConfig,
  getModelConfig,
} from '@/lib/agent/models';
import { APIKeyService } from '@/lib/services';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiresApiKey: boolean;
}

export function SettingsPopup({
  isOpen,
  onClose,
  selectedModel,
  onModelChange,
}: SettingsPopupProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [apiKeyStatuses, setApiKeyStatuses] = useState<
    Record<string, 'valid' | 'invalid' | 'missing'>
  >({});
  const [isTestingKeys, setIsTestingKeys] = useState<Record<string, boolean>>(
    {}
  );
  const [configuredProviders, setConfiguredProviders] = useState<
    Record<string, boolean>
  >({});
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [providers] = useState<ProviderConfig[]>(getAllProviders());

  // Get current model's provider
  const currentModel = getModelConfig(selectedModel);
  const currentProvider = currentModel?.provider || '';

  // Check provider configuration status
  const checkProviderConfiguration = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch('/api/models/status');
      if (response.ok) {
        const data = await response.json();
        const providerStatus: Record<string, boolean> = {};

        // Group models by provider and check if any model from each provider is configured
        providers.forEach((provider) => {
          const providerModels = getModelsByProvider(provider.id);
          const hasConfiguredModel = providerModels.some(
            (model) =>
              data.models?.find(
                (m: { id: string; configured: boolean }) => m.id === model.id
              )?.configured
          );
          providerStatus[provider.id] = hasConfiguredModel;
        });

        setConfiguredProviders(providerStatus);
      }
    } catch (error) {
      console.error('Failed to check provider configuration:', error);
      // Default to all providers requiring configuration if check fails
      const defaultStatus: Record<string, boolean> = {};
      providers.forEach((provider) => {
        defaultStatus[provider.id] = false;
      });
      setConfiguredProviders(defaultStatus);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Initialize selected provider when popup opens
  useEffect(() => {
    if (isOpen && currentProvider) {
      setSelectedProvider(currentProvider);
    }
  }, [isOpen, currentProvider]);

  // Check configuration status only when popup opens (once per session)
  useEffect(() => {
    if (isOpen) {
      checkProviderConfiguration();
    }
  }, [isOpen]); // Only run when popup opens/closes, not when provider changes

  // Load API keys when provider changes (always show API key fields)
  useEffect(() => {
    if (selectedProvider) {
      const apiKey = APIKeyService.getEffectiveAPIKey(selectedProvider);
      setApiKeys((prev) => ({
        ...prev,
        [selectedProvider]: apiKey || '',
      }));

      // Check API key status - if backend configured, mark as valid, otherwise check user key
      const isConfiguredOnBackend = configuredProviders[selectedProvider];
      if (isConfiguredOnBackend) {
        setApiKeyStatuses((prev) => ({
          ...prev,
          [selectedProvider]: 'valid',
        }));
      } else {
        const hasKey = !!apiKey;
        setApiKeyStatuses((prev) => ({
          ...prev,
          [selectedProvider]: hasKey ? 'valid' : 'missing',
        }));
      }
    }
  }, [selectedProvider, configuredProviders]);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);

    // Auto-select first model from the provider if current model is from different provider
    const providerModels = getModelsByProvider(providerId);
    if (providerModels.length > 0) {
      const currentModelProvider = currentModel?.provider;
      if (currentModelProvider !== providerId) {
        onModelChange(providerModels[0].id);
      }
    }
  };

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
  };

  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [providerId]: apiKey,
    }));

    // Reset status when key changes
    setApiKeyStatuses((prev) => ({
      ...prev,
      [providerId]: apiKey ? 'invalid' : 'missing',
    }));
  };

  const testApiKey = async (providerId: string) => {
    const apiKey = apiKeys[providerId];
    if (!apiKey) return;

    setIsTestingKeys((prev) => ({ ...prev, [providerId]: true }));

    try {
      // Save the key temporarily for testing
      APIKeyService.setAPIKey(providerId, apiKey);

      // Test with a simple completion using Vercel AI SDK
      const { generateText } = await import('ai');
      const testModel = getModelsByProvider(providerId)[0];

      if (testModel) {
        // Create the model using the appropriate provider
        let model;
        switch (providerId) {
          case 'groq': {
            const { groq } = await import('@ai-sdk/groq');
            model = groq(testModel.model);
            break;
          }
          case 'openai': {
            const { openai } = await import('@ai-sdk/openai');
            model = openai(testModel.model);
            break;
          }
          case 'google': {
            const { google } = await import('@ai-sdk/google');
            model = google(testModel.model);
            break;
          }
          case 'deepseek': {
            const { deepseek } = await import('@ai-sdk/deepseek');
            model = deepseek(testModel.model);
            break;
          }
          default:
            throw new Error(`Unsupported provider: ${providerId}`);
        }

        // Set the API key as environment variable
        const envVarMap: Record<string, string> = {
          groq: 'GROQ_API_KEY',
          openai: 'OPENAI_API_KEY',
          google: 'GOOGLE_GENERATIVE_AI_API_KEY',
          deepseek: 'DEEPSEEK_API_KEY',
        };

        const envVar = envVarMap[providerId];
        if (envVar) {
          (process.env as Record<string, string>)[envVar] = apiKey;
        }

        await generateText({
          model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 1,
        });

        setApiKeyStatuses((prev) => ({ ...prev, [providerId]: 'valid' }));
      }
    } catch (error) {
      console.error('API key test failed:', error);
      setApiKeyStatuses((prev) => ({ ...prev, [providerId]: 'invalid' }));
    } finally {
      setIsTestingKeys((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const saveApiKey = (providerId: string) => {
    const apiKey = apiKeys[providerId];
    if (apiKey && apiKeyStatuses[providerId] === 'valid') {
      APIKeyService.setAPIKey(providerId, apiKey);
    }
  };

  const providerModels = selectedProvider
    ? getModelsByProvider(selectedProvider)
    : [];
  const providerConfig = selectedProvider
    ? getProviderConfig(selectedProvider)
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              AI Model Settings
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Loading Status Check */}
          {isCheckingStatus && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">
                      Checking Backend Configuration
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Verifying which providers are configured on the backend...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Choose AI Provider
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {providers.map((provider) => {
                const isConfigured = configuredProviders[provider.id];
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedProvider === provider.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={provider.icon}
                        alt={`${provider.name} logo`}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          // Fallback to a generic icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove(
                            'hidden'
                          );
                        }}
                      />
                      <span className="text-2xl hidden">🤖</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {provider.name}
                          </span>
                          {isCheckingStatus ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Checking...
                            </span>
                          ) : isConfigured ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              <Check className="h-3 w-3" />
                              Configured
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-600">
                          {provider.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Selection */}
          {selectedProvider && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Choose Model
              </h3>
              <div className="space-y-2">
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {model.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {model.description}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {model.maxTokens.toLocaleString()} tokens
                        </span>
                        {model.capabilities.functionCalling && (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                            Function Calling
                          </span>
                        )}
                        {model.capabilities.vision && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                            Vision
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Provider Configuration Status */}
          {selectedProvider &&
            providerConfig?.requiresApiKey &&
            configuredProviders[selectedProvider] && (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-medium text-green-900">
                      {providerConfig.name} is Configured on Backend
                    </h3>
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    This provider is configured on the backend with environment
                    variables. You can override it with your own API key below
                    if needed.
                  </p>
                </div>
              </div>
            )}

          {/* API Key Configuration - Always show for providers that require API keys */}
          {selectedProvider && providerConfig?.requiresApiKey && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Key Configuration
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {providerConfig.name} API Key
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={`Enter your ${providerConfig.name} API key`}
                      value={apiKeys[selectedProvider] || ''}
                      onChange={(e) =>
                        handleApiKeyChange(selectedProvider, e.target.value)
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={() => testApiKey(selectedProvider)}
                      disabled={
                        !apiKeys[selectedProvider] ||
                        isTestingKeys[selectedProvider]
                      }
                      variant="outline"
                    >
                      {isTestingKeys[selectedProvider] ? 'Testing...' : 'Test'}
                    </Button>
                  </div>

                  {/* API Key Status */}
                  <div className="mt-2 flex items-center gap-2">
                    {apiKeyStatuses[selectedProvider] === 'valid' && (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          API key is valid
                        </span>
                        <Button
                          onClick={() => saveApiKey(selectedProvider)}
                          size="sm"
                          className="ml-auto"
                        >
                          Save Key
                        </Button>
                      </>
                    )}
                    {apiKeyStatuses[selectedProvider] === 'invalid' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">
                          Invalid API key
                        </span>
                      </>
                    )}
                    {apiKeyStatuses[selectedProvider] === 'missing' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-600">
                          API key required
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* API Key Help */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    How to get your API key:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedProvider === 'groq' && (
                      <>
                        <li>
                          1. Visit{' '}
                          <a
                            href="https://console.groq.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            console.groq.com
                          </a>
                        </li>
                        <li>2. Sign up or log in to your account</li>
                        <li>3. Go to API Keys section</li>
                        <li>4. Create a new API key</li>
                      </>
                    )}
                    {selectedProvider === 'openai' && (
                      <>
                        <li>
                          1. Visit{' '}
                          <a
                            href="https://platform.openai.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            platform.openai.com
                          </a>
                        </li>
                        <li>2. Sign up or log in to your account</li>
                        <li>3. Go to API Keys section</li>
                        <li>4. Create a new secret key</li>
                      </>
                    )}
                    {selectedProvider === 'deepseek' && (
                      <>
                        <li>
                          1. Visit{' '}
                          <a
                            href="https://platform.deepseek.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            platform.deepseek.com
                          </a>
                        </li>
                        <li>2. Sign up or log in to your account</li>
                        <li>3. Go to API Keys section</li>
                        <li>4. Create a new API key</li>
                      </>
                    )}
                    {selectedProvider === 'google' && (
                      <>
                        <li>
                          1. Visit{' '}
                          <a
                            href="https://aistudio.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            aistudio.google.com
                          </a>
                        </li>
                        <li>2. Sign up or log in to your account</li>
                        <li>3. Go to Get API Key section</li>
                        <li>4. Create a new API key</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onClose}
            disabled={
              selectedProvider &&
              providerConfig?.requiresApiKey &&
              apiKeyStatuses[selectedProvider] === 'invalid'
            }
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
