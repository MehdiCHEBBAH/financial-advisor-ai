'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { SuggestedMessages } from './suggested-messages';
import { SettingsPopup } from './settings-popup';
import { Bot, Settings } from 'lucide-react';
import { getDefaultModel, getModelConfig } from '@/lib/agent';
import { APIKeyService } from '@/lib/services';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isError?: boolean;
  errorType?: string;
  errorProvider?: string;
}

export function ChatUIV5() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(getDefaultModel());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load selected model from localStorage on component mount
  useEffect(() => {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Save selected model to localStorage when it changes
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('selectedModel', modelId);
  };

  const handleSendMessage = async (messageText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create a placeholder AI message that will be updated as we stream
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      text: '',
      isUser: false,
      timestamp: new Date(),
    };

    // Add the empty AI message immediately
    setMessages((prev) => [...prev, aiMessage]);

    try {
      // Convert messages to agent format
      const allMessages = [...messages, userMessage];
      const agentMessages = allMessages.map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('assistant' as const),
        content: msg.text,
      }));

      // Create agent request
      const agentRequest = {
        model: selectedModel,
        messages: agentMessages,
        temperature: 0.7,
        maxOutputTokens: 1000,
      };

      // Get user API keys to send with request
      const userApiKeys = APIKeyService.getUserAPIKeys();

      // Use agent streaming directly
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...agentRequest,
          stream: true,
          userApiKeys, // Include user API keys in request
        }),
      }).catch(() => {
        // Handle network errors
        const networkError = new Error(
          'Network connection failed. Please check your internet connection and try again.'
        );
        (
          networkError as Error & { errorType: string; errorTimestamp: string }
        ).errorType = 'network_error';
        (
          networkError as Error & { errorType: string; errorTimestamp: string }
        ).errorTimestamp = new Date().toISOString();
        throw networkError;
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || 'Failed to send message');
        // Attach error type and additional info to the error object
        (
          error as Error & { errorType: string; errorTimestamp: string }
        ).errorType = errorData.type || 'unknown';
        (
          error as Error & { errorType: string; errorTimestamp: string }
        ).errorTimestamp = errorData.timestamp;
        throw error;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              if (data === '[DONE]') {
                setIsLoading(false);
                return;
              }

              try {
                const parsedChunk = JSON.parse(data);

                // Check for error chunks
                if (parsedChunk.error) {
                  const error = new Error(
                    parsedChunk.error.message || 'Streaming error occurred'
                  );
                  (
                    error as Error & {
                      errorType: string;
                      errorTimestamp: string;
                    }
                  ).errorType = parsedChunk.error.type || 'unknown';
                  (
                    error as Error & {
                      errorType: string;
                      errorTimestamp: string;
                    }
                  ).errorTimestamp = parsedChunk.error.timestamp;
                  throw error;
                }

                if (parsedChunk.choices && parsedChunk.choices.length > 0) {
                  const choice = parsedChunk.choices[0];

                  if (choice.delta.content) {
                    // Append content to the AI message
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, text: msg.text + choice.delta.content }
                          : msg
                      )
                    );
                  }

                  if (choice.finish_reason === 'stop') {
                    setIsLoading(false);
                  }
                }
              } catch (parseError) {
                // If it's our thrown error from error chunk, re-throw it
                if ((parseError as Error & { errorType?: string }).errorType) {
                  throw parseError;
                }
                console.warn('Failed to parse chunk:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // Parse the error to show appropriate error message
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      const errorType =
        (error as Error & { errorType?: string }).errorType || 'unknown';

      // Use the error type from the API if available, otherwise fallback to message parsing
      let finalErrorType = errorType;
      if (errorType === 'unknown') {
        if (
          errorMessage.includes('API key not configured') ||
          errorMessage.includes('API key')
        ) {
          finalErrorType = 'missing_key';
        } else if (
          errorMessage.includes('quota') ||
          errorMessage.includes('billing')
        ) {
          finalErrorType = 'quota_exceeded';
        } else if (
          errorMessage.includes('not supported') ||
          errorMessage.includes('not available')
        ) {
          finalErrorType = 'model_not_supported';
        } else if (
          errorMessage.includes('network') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout')
        ) {
          finalErrorType = 'network_error';
        } else if (
          errorMessage.includes('authentication') ||
          errorMessage.includes('unauthorized')
        ) {
          finalErrorType = 'authentication_error';
        }
      }

      // Remove the AI message that was being streamed
      setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));

      // Create an error message bubble
      const errorMessageObj: Message = {
        id: `error-${Date.now()}`,
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
        isError: true,
        errorType: finalErrorType,
        errorProvider: getModelConfig(selectedModel)?.provider,
      };

      setMessages((prev) => [...prev, errorMessageObj]);
      setIsLoading(false);
    }
  };

  const handleSuggestedMessage = (messageText: string) => {
    handleSendMessage(messageText);
  };

  const handleRetry = () => {
    // Retry the last user message if there was one
    if (messages.length > 0) {
      const lastUserMessage = messages.filter((msg) => msg.isUser).pop();
      if (lastUserMessage) {
        handleSendMessage(lastUserMessage.text);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/ai-avatar.svg" alt="Financial Adviser AI" />
              <AvatarFallback className="bg-blue-600 text-white">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold">Financial Adviser AI</h1>
              <p className="text-sm text-gray-400">
                Your intelligent investment advisor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>Using:</span>
              <span className="font-medium text-white">
                {getModelConfig(selectedModel)?.name || selectedModel}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <Avatar className="h-20 w-20 mb-6">
              <AvatarImage src="/ai-avatar.svg" alt="Financial Adviser AI" />
              <AvatarFallback className="bg-blue-600 text-white text-2xl">
                <Bot className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold mb-2">
              Welcome to Financial Adviser AI
            </h2>
            <p className="text-gray-400 text-center max-w-md mb-8">
              Get AI-powered investment advice for any stock of your choice. Our
              intelligent adviser analyzes market data to help you make informed
              investment decisions.
            </p>
            <SuggestedMessages onMessageSelect={handleSuggestedMessage} />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
                isError={message.isError}
                errorType={message.errorType}
                errorProvider={message.errorProvider}
                onRetry={message.isError ? handleRetry : undefined}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-700 text-gray-100 rounded-lg px-4 py-2">
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        placeholder="Ask me about any stock or investment strategy..."
        disabled={isLoading}
        modelConfigured={true}
        modelError={undefined}
      />

      {/* Settings Popup */}
      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
