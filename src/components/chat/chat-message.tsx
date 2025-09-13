'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ChatMessageProps {
  message: string;
  isUser?: boolean;
  timestamp?: Date;
  isError?: boolean;
  errorType?: string;
  errorProvider?: string;
  onRetry?: () => void;
}

export function ChatMessage({
  message,
  isUser = false,
  timestamp,
  isError = false,
  errorType,
  errorProvider,
  onRetry,
}: ChatMessageProps) {
  return (
    <div
      className={cn('flex gap-3 p-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src="/ai-avatar.svg" alt="AI" />
          <AvatarFallback className="bg-blue-600 text-white">AI</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-blue-600 text-white'
            : isError
              ? 'bg-red-900/20 border border-red-500/30 text-red-200'
              : 'bg-gray-700 text-gray-100'
        )}
      >
        {isError && (
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium text-red-300">
              {errorType === 'missing_key' && 'API Key Required'}
              {errorType === 'quota_exceeded' && 'Quota Exceeded'}
              {errorType === 'model_not_supported' && 'Model Not Supported'}
              {errorType === 'network_error' && 'Network Error'}
              {errorType === 'authentication_error' && 'Authentication Error'}
              {!errorType && 'Error'}
            </span>
          </div>
        )}
        <p className="text-sm">{message}</p>
        {errorProvider && (
          <p className="text-xs text-red-300/70 mt-1">
            Provider: {errorProvider}
          </p>
        )}
        {timestamp && (
          <p className="text-xs opacity-70 mt-1">
            {timestamp.toLocaleTimeString()}
          </p>
        )}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200 mt-2 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </button>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-600 text-gray-100">
            U
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
