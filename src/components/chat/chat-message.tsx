'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useState } from 'react';

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  success?: boolean;
}

function getMessageClassName(isUser: boolean, isError: boolean): string {
  if (isUser) {
    return 'bg-blue-600 text-white';
  }
  if (isError) {
    return 'bg-red-900/20 border border-red-500/30 text-red-200';
  }
  return 'bg-gray-700 text-gray-100';
}

interface ChatMessageProps {
  readonly message: string;
  readonly isUser?: boolean;
  readonly timestamp?: Date;
  readonly isError?: boolean;
  readonly errorType?: string;
  readonly errorProvider?: string;
  readonly onRetry?: () => void;
  readonly thinking?: string;
  readonly toolCalls?: ToolCall[];
  readonly isLoading?: boolean;
}

export function ChatMessage({
  message,
  isUser = false,
  timestamp,
  isError = false,
  errorType,
  errorProvider,
  onRetry,
  thinking,
  toolCalls = [],
  isLoading = false,
}: ChatMessageProps) {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [isToolCallsExpanded, setIsToolCallsExpanded] = useState(false);
  return (
    <div
      className={cn('flex gap-3 p-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/ai-avatar.svg" alt="AI" />
            <AvatarFallback className="bg-blue-600 text-white">AI</AvatarFallback>
          </Avatar>
          {/* Thinking animation next to avatar */}
          {(thinking && !isThinkingExpanded) || isLoading ? (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          ) : null}
        </div>
      )}

      <div className="max-w-[80%] space-y-2">
        {/* Thinking Block */}
        {thinking && !isUser && (
          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="flex items-center gap-2 w-full text-left text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              {isThinkingExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span className="font-medium">Thinking Process</span>
            </button>
            {isThinkingExpanded && (
              <div className="mt-2 text-xs text-gray-300 whitespace-pre-wrap">
                {thinking}
              </div>
            )}
          </div>
        )}

        {/* Tool Calls */}
        {toolCalls.length > 0 && !isUser && (
          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
            <button
              onClick={() => setIsToolCallsExpanded(!isToolCallsExpanded)}
              className="flex items-center gap-2 w-full text-left text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              {isToolCallsExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Wrench className="h-3 w-3" />
              <span className="font-medium">Tools Used ({toolCalls.length})</span>
            </button>
            {isToolCallsExpanded && (
              <div className="mt-2 space-y-2">
                {toolCalls.map((toolCall, index) => (
                  <div
                    key={`${toolCall.name}-${index}`}
                    className="bg-gray-700/50 rounded p-2 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-blue-400">
                        {toolCall.name}
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs',
                          toolCall.success
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        )}
                      >
                        {toolCall.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {Object.keys(toolCall.args).length > 0 && (
                      <div className="text-gray-400">
                        <span className="font-medium">Args:</span>{' '}
                        <code className="bg-gray-800 px-1 rounded">
                          {JSON.stringify(toolCall.args, null, 2)}
                        </code>
                      </div>
                    )}
                    {toolCall.result != null && (
                      <div className="text-gray-400 mt-1">
                        <span className="font-medium">Result:</span>{' '}
                        <div className="bg-gray-800 px-2 py-1 rounded mt-1 max-h-32 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap">
                            {typeof toolCall.result === 'string' 
                              ? toolCall.result 
                              : JSON.stringify(toolCall.result, null, 2)
                            }
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Message */}
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            getMessageClassName(isUser, isError)
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
          
          {/* Markdown Content or Loading Animation */}
          {isLoading && !message ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse">Thinking...</div>
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return !isInline ? (
                      <pre className="bg-gray-800 rounded p-3 overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className="bg-gray-800 px-1 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-300">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-600 rounded">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-600 px-3 py-2 bg-gray-800 font-medium text-left">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-600 px-3 py-2">
                      {children}
                    </td>
                  ),
                }}
              >
                {message || ''}
              </ReactMarkdown>
            </div>
          )}

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
