'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, AlertCircle, Key } from 'lucide-react';
import { ModelConfig, ModelConfigurationStatus } from '@/lib/agent/types';

interface EnhancedModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onStatusChange?: (status: ModelConfigurationStatus) => void;
}

export function EnhancedModelSelector({
  selectedModel,
  onModelChange,
  onStatusChange,
}: EnhancedModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [modelStatus, setModelStatus] =
    useState<ModelConfigurationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const checkModelStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/models/status');
      const status = await response.json();
      setModelStatus(status);
      onStatusChange?.(status);
    } catch (error) {
      console.error('Failed to check model status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    loadModels();
    checkModelStatus();
  }, [checkModelStatus]);

  const getModelStatus = (modelId: string) => {
    return modelStatus?.models.find((m) => m.id === modelId);
  };

  const getProviderIcon = () => {
    return '⚡';
  };

  const getStatusIcon = (modelId: string) => {
    const status = getModelStatus(modelId);
    if (!status) return null;

    if (status.configured) {
      return <Check className="w-4 h-4 text-green-500" />;
    } else if (status.requiresUserKey) {
      return <Key className="w-4 h-4 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (modelId: string) => {
    const status = getModelStatus(modelId);
    if (!status) return '';

    if (status.configured) {
      return 'Ready';
    } else if (status.requiresUserKey) {
      return 'User key required';
    } else {
      return status.error || 'Not configured';
    }
  };

  const getStatusColor = (modelId: string) => {
    const status = getModelStatus(modelId);
    if (!status) return 'text-gray-400';

    if (status.configured) {
      return 'text-green-400';
    } else if (status.requiresUserKey) {
      return 'text-yellow-400';
    } else {
      return 'text-red-400';
    }
  };

  const selectedModelConfig = models.find((m) => m.id === selectedModel);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
        <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Loading models...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          {selectedModelConfig && (
            <>
              <span>{getProviderIcon()}</span>
              <span>{selectedModelConfig.name}</span>
              {getStatusIcon(selectedModel)}
            </>
          )}
        </div>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
          {models.map((model) => {
            const status = getModelStatus(model.id);
            const isSelected = model.id === selectedModel;
            const isConfigured = status?.configured || false;

            return (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors ${
                  isSelected ? 'bg-gray-700' : ''
                } ${!isConfigured ? 'opacity-60' : ''}`}
                disabled={!isConfigured}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getProviderIcon()}</span>
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-gray-400">
                        {model.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(model.id)}
                    <span className={`text-xs ${getStatusColor(model.id)}`}>
                      {getStatusText(model.id)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
