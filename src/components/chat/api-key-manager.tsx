'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { APIKeyService, UserAPIKeys } from '@/lib/services';
import { ModelConfigurationStatus } from '@/lib/agent/types';
import {
  Settings,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

interface APIKeyManagerProps {
  onStatusChange?: (status: ModelConfigurationStatus) => void;
}

export function APIKeyManager({ onStatusChange }: APIKeyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userKeys, setUserKeys] = useState<UserAPIKeys>({});
  const [modelStatus, setModelStatus] =
    useState<ModelConfigurationStatus | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserKeys();
    checkModelStatus();
  }, []);

  const loadUserKeys = () => {
    const keys = APIKeyService.getUserAPIKeys();
    setUserKeys(keys);
  };

  const checkModelStatus = async () => {
    try {
      const status = await APIKeyService.checkModelConfigurationStatus();
      setModelStatus(status);
      onStatusChange?.(status);
    } catch (error) {
      console.error('Failed to check model status:', error);
    }
  };

  const handleKeyChange = (provider: string, value: string) => {
    const newKeys = { ...userKeys, [provider]: value };
    setUserKeys(newKeys);
  };

  const handleSaveKeys = async () => {
    setIsLoading(true);
    try {
      // Validate keys before saving
      const validationErrors: string[] = [];

      for (const [provider, key] of Object.entries(userKeys)) {
        if (key && key.trim()) {
          const validation = APIKeyService.validateAPIKey(provider, key);
          if (!validation.valid) {
            validationErrors.push(`${provider}: ${validation.error}`);
          }
        }
      }

      if (validationErrors.length > 0) {
        alert(`Validation errors:\n${validationErrors.join('\n')}`);
        return;
      }

      APIKeyService.saveUserAPIKeys(userKeys);
      await checkModelStatus();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save API keys:', error);
      alert('Failed to save API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearKeys = () => {
    if (confirm('Are you sure you want to clear all API keys?')) {
      APIKeyService.clearUserAPIKeys();
      setUserKeys({});
      checkModelStatus();
    }
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getProviderDisplayName = () => {
    return 'Groq';
  };

  const getProviderIcon = () => {
    // You can add specific icons for each provider
    return <Key className="w-4 h-4" />;
  };

  const configuredCount =
    modelStatus?.models.filter((m) => m.configured).length || 0;
  const totalCount = modelStatus?.models.length || 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        API Keys
        {configuredCount > 0 && (
          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {configuredCount}/{totalCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">API Key Management</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-400">
                Add your API keys to use specific models. User keys take
                precedence over server keys.
              </p>

              {['groq'].map((provider) => {
                const key = userKeys[provider as keyof UserAPIKeys] || '';
                const isVisible = showKeys[provider];
                const modelStatusForProvider = modelStatus?.models.find(
                  (m) =>
                    m.id.includes(provider) ||
                    m.id.includes(provider.replace('-', ''))
                );

                return (
                  <div key={provider} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      {getProviderIcon()}
                      {getProviderDisplayName()}
                      {modelStatusForProvider?.configured && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {modelStatusForProvider?.error && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </label>

                    <div className="flex gap-2">
                      <Input
                        type={isVisible ? 'text' : 'password'}
                        value={key}
                        onChange={(e) =>
                          handleKeyChange(provider, e.target.value)
                        }
                        placeholder={`Enter ${getProviderDisplayName()} API key`}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleKeyVisibility(provider)}
                      >
                        {isVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {modelStatusForProvider?.error && (
                      <p className="text-xs text-red-400">
                        {modelStatusForProvider.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleClearKeys}
                disabled={isLoading}
              >
                Clear All
              </Button>
              <Button onClick={handleSaveKeys} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Keys'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
