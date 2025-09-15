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
    return 'message-user';
  }
  if (isError) {
    return 'status-error border rounded-xl px-4 py-3';
  }
  return 'message-ai';
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

  // Clean message content to prevent unwanted Markdown list conversion
  const cleanMessage = (content: string): string => {
    if (!content) return content;
    
    // Simple approach: if content starts with common list markers but is a single line,
    // escape the marker to prevent Markdown interpretation
    const trimmedContent = content.trim();
    
    // Check for single-line content that starts with list markers
    if (trimmedContent && !content.includes('\n')) {
      // Escape dash, asterisk, plus, or numbered list markers at the start
      if (/^- /.test(trimmedContent)) {
        return content.replace(/^- /, '\\- ');
      }
      if (/^\* /.test(trimmedContent)) {
        return content.replace(/^\* /, '\\* ');
      }
      if (/^\+ /.test(trimmedContent)) {
        return content.replace(/^\+ /, '\\+ ');
      }
      if (/^\d+\. /.test(trimmedContent)) {
        return content.replace(/^(\d+)\. /, '\\$1. ');
      }
    }
    
    return content;
  };
  return (
    <div
      className={cn('flex gap-3 p-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/ai-avatar-simple.svg" alt="Financial Adviser AI" />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold">FA</AvatarFallback>
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="flex items-center gap-2 w-full text-left text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isThinkingExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span className="font-medium">Thinking Process</span>
            </button>
            {isThinkingExpanded && (
              <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                {thinking}
              </div>
            )}
          </div>
        )}

        {/* Tool Calls */}
        {toolCalls.length > 0 && !isUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <button
              onClick={() => setIsToolCallsExpanded(!isToolCallsExpanded)}
              className="flex items-center gap-2 w-full text-left text-xs text-green-600 hover:text-green-700 transition-colors"
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
                    className="bg-white rounded p-3 text-xs border border-green-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-blue-600">
                        {toolCall.name}
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs',
                          toolCall.success
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {toolCall.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {Object.keys(toolCall.args).length > 0 && (
                      <div className="text-gray-600">
                        <span className="font-medium">Args:</span>{' '}
                        <code className="bg-gray-100 px-1 rounded text-gray-800">
                          {JSON.stringify(toolCall.args, null, 2)}
                        </code>
                      </div>
                    )}
                    {toolCall.result != null && (
                      <div className="text-gray-600 mt-1">
                        <span className="font-medium">Result:</span>{' '}
                        <div className="bg-gray-100 px-2 py-1 rounded mt-1 max-h-32 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap text-gray-800">
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
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                skipHtml={false}
                components={{
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return !isInline ? (
                      <div className="my-3">
                        <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto border border-gray-700">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                  // Ensure proper list spacing and nested list styling
                  ul: ({ children }) => (
                    <ul className="mb-3 space-y-1 pl-5 marker:text-gray-600 list-disc">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 space-y-1 pl-5 list-decimal marker:text-gray-600">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed [&_ul]:mt-1 [&_ol]:mt-1">
                      {children}
                    </li>
                  ),
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-gray-900 border-b border-gray-200 pb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-sm font-bold mb-1 mt-2 first:mt-0 text-gray-900">{children}</h4>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 bg-blue-50 py-2 rounded-r-lg my-3">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-300 px-4 py-3 bg-gray-100 font-semibold text-left text-gray-900">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">
                      {children}
                    </td>
                  ),
                  a: ({ children, href }) => (
                    <a href={href} className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                  hr: () => <hr className="my-4 border-gray-300" />,
                  img: ({ src, alt }) => (
                    <img src={src} alt={alt} className="max-w-full h-auto rounded-lg shadow-sm my-3" />
                  ),
                }}
              >
                {cleanMessage(message || '')}
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
