'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Settings, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  getAllProviders,
  getModelsByProvider,
  getProviderConfig,
  getModelConfig,
} from '@/lib/agent/models';
import { APIKeyService } from '@/lib/services';

interface EnhancedSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onStatusChange?: () => void;
}

interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiresApiKey: boolean;
}

export function EnhancedSettingsPopup({
  isOpen,
  onClose,
  selectedModel,
  onModelChange,
  onStatusChange,
}: EnhancedSettingsPopupProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [providerStatuses, setProviderStatuses] = useState<Record<string, 'configured' | 'not-configured' | 'checking'>>({});
  const [providerConfigSources, setProviderConfigSources] = useState<Record<string, 'user' | 'backend' | 'none'>>({});
  const [useCustomApiKeys, setUseCustomApiKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [providers] = useState<ProviderConfig[]>(getAllProviders());
  const dialogRef = useRef<HTMLDivElement>(null);

  // Get current model's provider
  const currentModel = getModelConfig(selectedModel);
  const currentProvider = currentModel?.provider || '';

  // Check provider status (user key if provided, else backend configuration)
  const checkProviderStatus = useCallback(async (provider: string) => {
    setProviderStatuses(prev => ({ ...prev, [provider]: 'checking' }));
    
    try {
      // Check if user has provided a key for this provider
      const userKeys = APIKeyService.getUserAPIKeys();
      const userKey = userKeys[provider as keyof typeof userKeys];
      
      if (userKey) {
        // If user key exists, consider it configured
        setProviderStatuses(prev => ({ ...prev, [provider]: 'configured' }));
        setProviderConfigSources(prev => ({ ...prev, [provider]: 'user' }));
        return;
      }

      // Otherwise, check backend configuration
      const response = await fetch('/api/models/status');
      if (response.ok) {
        const data = await response.json();
        const hasConfiguredModel = data.models?.some(
          (m: { provider: string; configured: boolean }) => 
            m.provider === provider && m.configured
        );
        setProviderStatuses(prev => ({ 
          ...prev, 
          [provider]: hasConfiguredModel ? 'configured' : 'not-configured' 
        }));
        setProviderConfigSources(prev => ({ 
          ...prev, 
          [provider]: hasConfiguredModel ? 'backend' : 'none' 
        }));
      } else {
        setProviderStatuses(prev => ({ ...prev, [provider]: 'not-configured' }));
        setProviderConfigSources(prev => ({ ...prev, [provider]: 'none' }));
      }
    } catch (error) {
      console.error(`Failed to check ${provider} status:`, error);
      setProviderStatuses(prev => ({ ...prev, [provider]: 'not-configured' }));
      setProviderConfigSources(prev => ({ ...prev, [provider]: 'none' }));
    }
  }, []);

  // Initialize when popup opens
  useEffect(() => {
    if (isOpen) {
      if (currentProvider) {
        setSelectedProvider(currentProvider);
      }
      
      // Load user API keys and check status for all providers
      const userKeys = APIKeyService.getUserAPIKeys();
      const newApiKeys: Record<string, string> = {};
      const newUseCustomApiKeys: Record<string, boolean> = {};
      const newConfigSources: Record<string, 'user' | 'backend' | 'none'> = {};
      
      providers.forEach(provider => {
        const userKey = userKeys[provider.id as keyof typeof userKeys];
        newApiKeys[provider.id] = userKey || '';
        newUseCustomApiKeys[provider.id] = !!userKey;
        
        // Set initial config source based on user key presence
        if (userKey) {
          newConfigSources[provider.id] = 'user';
        } else {
          newConfigSources[provider.id] = 'none'; // Will be updated by checkProviderStatus
        }
        
        checkProviderStatus(provider.id);
      });
      
      setApiKeys(newApiKeys);
      setUseCustomApiKeys(newUseCustomApiKeys);
      setProviderConfigSources(newConfigSources);
    }
  }, [isOpen, currentProvider, providers, checkProviderStatus]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        if (hasUnsavedChanges) {
          if (confirm('You have unsaved changes. Are you sure you want to close?')) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, hasUnsavedChanges, onClose]);

  const handleKeyChange = (provider: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }));
    setHasUnsavedChanges(true);
  };

  const handleToggleCustomKey = (provider: string, enabled: boolean) => {
    setUseCustomApiKeys((prev) => ({ ...prev, [provider]: enabled }));
    setHasUnsavedChanges(true);
    
    if (!enabled) {
      // Clear the API key when toggling off
      setApiKeys((prev) => ({ ...prev, [provider]: '' }));
      // Immediately remove from localStorage to avoid counting as configured
      APIKeyService.removeAPIKey(provider);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save only the API keys that have custom keys enabled
      const keysToSave: Record<string, string> = {};
      Object.keys(useCustomApiKeys).forEach(provider => {
        if (useCustomApiKeys[provider] && apiKeys[provider]) {
          keysToSave[provider] = apiKeys[provider];
        }
      });
      
      APIKeyService.saveUserAPIKeys(keysToSave);
      
      // Refresh status for all providers
      providers.forEach(provider => {
        checkProviderStatus(provider.id);
      });
      
      setHasUnsavedChanges(false);
      
      // Notify parent component to refresh status
      if (onStatusChange) {
        onStatusChange();
      }
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'not-configured':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'checking':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent ref={dialogRef} className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Configure your AI providers and select models
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI Providers</h3>
            <div className="space-y-4">
              {providers.map((provider) => {
                const status = providerStatuses[provider.id] || 'not-configured';
                const configSource = providerConfigSources[provider.id] || 'none';
                const isUsingCustomKey = useCustomApiKeys[provider.id] || false;
                
                return (
                  <div key={provider.id} className="border rounded-lg p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Image
                          src={provider.icon}
                          alt={`${provider.name} logo`}
                          width={24}
                          height={24}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <span className="text-xl hidden">🤖</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                              {provider.name}
                            </span>
                            {getStatusIcon(status)}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <span className="text-xs sm:text-sm text-gray-600">
                            {(() => {
                              if (status === 'configured') {
                                if (isUsingCustomKey) {
                                  return 'Using your API key';
                                } else if (configSource === 'backend') {
                                  return 'Using default configuration';
                                } else {
                                  return 'Configured';
                                }
                              }
                              if (status === 'checking') return 'Checking...';
                              return 'Not configured';
                            })()}
                          </span>
                          {status === 'configured' && (() => {
                            let badgeClass = '';
                            let badgeText = '';
                            
                            if (isUsingCustomKey) {
                              badgeClass = 'bg-blue-100 text-blue-700';
                              badgeText = 'Custom Key';
                            } else if (configSource === 'backend') {
                              badgeClass = 'bg-green-100 text-green-700';
                              badgeText = 'Default';
                            } else {
                              badgeClass = 'bg-gray-100 text-gray-700';
                              badgeText = 'Configured';
                            }
                            
                            return (
                              <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>
                                {badgeText}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isUsingCustomKey}
                            onCheckedChange={(enabled) => handleToggleCustomKey(provider.id, enabled)}
                          />
                          <span className="text-xs sm:text-sm text-gray-600">Use my API key</span>
                        </div>
                      </div>
                    </div>

                    {isUsingCustomKey && (
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type={showApiKeys[provider.id] ? 'text' : 'password'}
                            value={apiKeys[provider.id] || ''}
                            onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                            placeholder={`Enter your ${provider.name} API key`}
                            className="input-field"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setShowApiKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                          >
                            {showApiKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Select Model</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {providers.map((provider) => {
                const isSelected = selectedProvider === provider.id;
                
                return (
                  <button
                    key={provider.id}
                    type="button"
                    className={`card-hover cursor-pointer transition-all duration-200 w-full text-left ${
                      isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedProvider(provider.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={provider.icon}
                        alt={`${provider.name} logo`}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="text-2xl hidden">🤖</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {provider.name}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            providerStatuses[provider.id] === 'configured' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Models for Selected Provider */}
          {selectedProvider && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Available Models - {getProviderConfig(selectedProvider)?.name}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {getModelsByProvider(selectedProvider).map((model) => {
                  const isSelected = selectedModel === model.id;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      className={`card-hover cursor-pointer transition-all duration-200 w-full text-left ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => onModelChange(model.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isSelected ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {model.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {model.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="btn-outline w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="btn-primary w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
