'use client';

import {
  AlertCircle,
  Key,
  DollarSign,
  XCircle,
  Wifi,
  Shield,
} from 'lucide-react';
import { APIKeyError } from '@/lib/agent/types';

interface ErrorDisplayProps {
  error: APIKeyError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'missing_key':
        return <Key className="w-5 h-5 text-red-500" />;
      case 'quota_exceeded':
        return <DollarSign className="w-5 h-5 text-red-500" />;
      case 'model_not_supported':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'network_error':
        return <Wifi className="w-5 h-5 text-red-500" />;
      case 'authentication_error':
        return <Shield className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'missing_key':
        return 'API Key Required';
      case 'quota_exceeded':
        return 'Quota Exceeded';
      case 'model_not_supported':
        return 'Model Not Supported';
      case 'network_error':
        return 'Network Error';
      case 'authentication_error':
        return 'Authentication Error';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'missing_key':
        return 'This model requires an API key. Please add your API key in the settings to use this model.';
      case 'quota_exceeded':
        return 'You have exceeded your API quota or there is a billing issue. Please check your account or try again later.';
      case 'model_not_supported':
        return 'This model is not supported or not available. Please try a different model.';
      case 'network_error':
        return 'There was a network connectivity issue. Please check your internet connection and try again.';
      case 'authentication_error':
        return 'There was an authentication issue with your API key. Please verify your API key is correct and has the necessary permissions.';
      default:
        return error.message;
    }
  };

  const getErrorActions = () => {
    switch (error.type) {
      case 'missing_key':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => (window.location.href = '#api-keys')}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Add API Key
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Try Again
              </button>
            )}
          </div>
        );
      case 'quota_exceeded':
      case 'model_not_supported':
      case 'network_error':
      case 'authentication_error':
      default:
        return onRetry ? (
          <button
            onClick={onRetry}
            className="text-blue-400 hover:text-blue-300 text-sm underline"
          >
            Try Again
          </button>
        ) : null;
    }
  };

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-red-400">{getErrorTitle()}</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-300"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-300 mt-1">{getErrorDescription()}</p>
          {error.model && (
            <p className="text-xs text-gray-400 mt-1">Model: {error.model}</p>
          )}
          {error.provider && (
            <p className="text-xs text-gray-400">Provider: {error.provider}</p>
          )}
          <div className="mt-3">{getErrorActions()}</div>
        </div>
      </div>
    </div>
  );
}
