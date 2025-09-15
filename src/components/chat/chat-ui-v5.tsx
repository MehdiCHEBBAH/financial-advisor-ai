'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { SuggestedMessages } from './suggested-messages';
import { EnhancedSettingsPopup } from './enhanced-settings-popup';
import { Settings, TrendingUp, BarChart3, PieChart, RotateCcw } from 'lucide-react';
import { getDefaultModel, getModelConfig } from '@/lib/agent';
import { APIKeyService } from '@/lib/services';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  text: string;
  mainContent?: string;
  isUser: boolean;
  timestamp: Date;
  isError?: boolean;
  errorType?: string;
  errorProvider?: string;
  thinking?: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  success?: boolean;
}

// localStorage utility functions
const CONVERSATION_STORAGE_KEY = 'financial-adviser-conversation';

function saveMessagesToStorage(messages: Message[]): void {
  try {
    const messagesToSave = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(messagesToSave));
  } catch (error) {
    console.warn('Failed to save messages to localStorage:', error);
  }
}

function loadMessagesFromStorage(): Message[] {
  try {
    const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (!stored) return [];
    
    const parsedMessages = JSON.parse(stored);
    return parsedMessages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    console.warn('Failed to load messages from localStorage:', error);
    return [];
  }
}

function clearMessagesFromStorage(): void {
  try {
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear messages from localStorage:', error);
  }
}

// Function to parse message content for thinking blocks and tool calls
function parseMessageContent(content: string): {
  thinking: string;
  mainContent: string;
  toolCalls: ToolCall[];
} {
  let thinking = '';
  let mainContent = content;
  const toolCalls: ToolCall[] = [];

  // Extract thinking blocks (case insensitive)
  const thinkingRegex = /<think>([\s\S]*?)<\/think>/gi;
  const thinkingMatches = content.match(thinkingRegex);
  
  if (thinkingMatches) {
    thinking = thinkingMatches
      .map(match => match.replace(/<\/?think>/gi, ''))
      .join('\n\n');
    
    // Remove thinking blocks from main content
    mainContent = content.replace(thinkingRegex, '').trim();
  } else {
    // Check for incomplete thinking blocks (for streaming) - more permissive
    const incompleteThinkingRegex = /<think>([\s\S]*?)(?=<\/think>|$)/gi;
    const incompleteMatches = content.match(incompleteThinkingRegex);
    
    if (incompleteMatches) {
      thinking = incompleteMatches
        .map(match => match.replace(/<\/?think>/gi, ''))
        .join('\n\n');
      
      // Remove incomplete thinking blocks from main content
      mainContent = content.replace(incompleteThinkingRegex, '').trim();
    } else {
      // Check for just opening <think> tag (for very early streaming)
      const openingThinkRegex = /<think>([\s\S]*?)$/gi;
      const openingMatches = content.match(openingThinkRegex);
      
      if (openingMatches) {
        thinking = openingMatches
          .map(match => match.replace(/<\/?think>/gi, ''))
          .join('\n\n');
        
        // Don't remove from main content yet as it's incomplete
        mainContent = content;
      }
    }
  }

  // Extract tools section first - more aggressive removal
  const toolsSectionRegex = /<tools>[\s\S]*?<\/tools>/gi;
  const toolsSectionMatch = content.match(toolsSectionRegex);
  
  if (toolsSectionMatch) {
    const toolsSection = toolsSectionMatch[0];
    
    // Extract individual tool calls from tools section
    const toolCallRegex = /<tool\s+name="([^"]+)"\s+args='([^']*)'\s+(?:result='([^']*)'\s+success="true"|error='([^']*)'\s+success="false")[^>]*><\/tool>/g;
    let toolMatch;
    
    while ((toolMatch = toolCallRegex.exec(toolsSection)) !== null) {
      const toolName = toolMatch[1];
      const argsString = toolMatch[2];
      const resultString = toolMatch[3];
      const errorString = toolMatch[4];
      
      try {
        const args = argsString ? JSON.parse(argsString) : {};
        let result = null;
        
        if (resultString) {
          try {
            result = JSON.parse(resultString);
          } catch {
            result = resultString;
          }
        }
        
        toolCalls.push({
          name: toolName,
          args,
          result: result,
          success: !errorString,
        });
      } catch {
        // If JSON parsing fails, store as string
        toolCalls.push({
          name: toolName,
          args: { raw: argsString },
          result: resultString || errorString,
          success: !errorString,
        });
      }
    }
    
    // Remove tools section from main content - use the exact match
    mainContent = mainContent.replace(toolsSection, '').trim();
  }
  
  // Also remove any standalone tool tags that might not be in tools section
  const standaloneToolRegex = /<tool\s+name="[^"]+"\s+args='[^']*'\s+(?:result='[^']*'\s+success="true"|error='[^']*'\s+success="false")[^>]*><\/tool>/g;
  mainContent = mainContent.replace(standaloneToolRegex, '').trim();

  // Debug logging
  console.log('=== PARSING DEBUG ===');
  console.log('Full content length:', content.length);
  console.log('Content preview:', content.substring(0, 500) + '...');
  console.log('Has thinking tags:', /<think>/i.test(content));
  console.log('Has tools tags:', /<tools>/i.test(content));
  console.log('Has tool tags:', /<tool/i.test(content));
  
  if (thinking) {
    console.log('Parsed thinking length:', thinking.length);
    console.log('Parsed thinking preview:', thinking.substring(0, 200) + '...');
  }
  
  if (toolCalls.length > 0) {
    console.log('Parsed tool calls count:', toolCalls.length);
    console.log('Parsed tool calls:', toolCalls);
  }
  
  console.log('Main content length after filtering:', mainContent.length);
  console.log('Main content after filtering:', mainContent.substring(0, 200) + '...');
  console.log('=== END PARSING DEBUG ===');
  
  return { thinking, mainContent, toolCalls };
}

export function ChatUIV5() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(getDefaultModel());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [modelStatus, setModelStatus] = useState<{
    models: Array<{
      id: string;
      name: string;
      provider: string;
      configured: boolean;
      error?: string;
    }>;
    hasAnyConfigured: boolean;
    errors: Array<{
      type: string;
      message: string;
      model?: string;
      provider?: string;
      timestamp?: string;
    }>;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to refresh model status (called from settings popup)
  const refreshModelStatus = async () => {
    try {
      const response = await fetch('/api/models/status');
      const statusData = await response.json();
      
      // Get user API keys to determine which providers are user-configured
      const userKeys = APIKeyService.getUserAPIKeys();
      
      // Update the status to include user-configured providers
      const updatedModels = statusData.models.map((model: {
        id: string;
        name: string;
        provider: string;
        configured: boolean;
        error?: string;
      }) => {
        const hasUserKey = !!userKeys[model.provider as keyof typeof userKeys];
        return {
          ...model,
          configured: model.configured || hasUserKey
        };
      });
      
      const updatedStatus = {
        ...statusData,
        models: updatedModels,
        hasAnyConfigured: updatedModels.some((m: { configured: boolean }) => m.configured)
      };
      
      setModelStatus(updatedStatus);
      localStorage.setItem('modelConfigurationStatus', JSON.stringify(updatedStatus));
    } catch (error) {
      console.error('Failed to refresh model status:', error);
    }
  };

  // Load selected model from localStorage on component mount
  useEffect(() => {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Check model configuration status on component mount and page reload
  useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const response = await fetch('/api/models/status');
        const statusData = await response.json();
        
        // Get user API keys to determine which providers are user-configured
        const userKeys = APIKeyService.getUserAPIKeys();
        
        // Update the status to include user-configured providers
        const updatedModels = statusData.models.map((model: {
          id: string;
          name: string;
          provider: string;
          configured: boolean;
          error?: string;
        }) => {
          const hasUserKey = !!userKeys[model.provider as keyof typeof userKeys];
          return {
            ...model,
            configured: model.configured || hasUserKey
          };
        });
        
        const updatedStatus = {
          ...statusData,
          models: updatedModels,
          hasAnyConfigured: updatedModels.some((m: { configured: boolean }) => m.configured)
        };
        
        setModelStatus(updatedStatus);
        // Save status to localStorage for persistence across reloads
        localStorage.setItem('modelConfigurationStatus', JSON.stringify(updatedStatus));
      } catch (error) {
        console.error('Failed to check model status:', error);
        // Try to load from localStorage if API call fails
        const savedStatus = localStorage.getItem('modelConfigurationStatus');
        if (savedStatus) {
          try {
            setModelStatus(JSON.parse(savedStatus));
          } catch (parseError) {
            console.error('Failed to parse saved model status:', parseError);
          }
        }
      }
    };

    checkModelStatus();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load conversation history from localStorage on component mount
  useEffect(() => {
    const savedMessages = loadMessagesFromStorage();
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

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
      thinking: '',
      toolCalls: [],
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

      // Use non-streaming API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...agentRequest,
          stream: false, // Explicitly disable streaming
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

      const responseData = await response.json();

      // Check for error in response
      if (responseData.error) {
        const error = new Error(responseData.error.message || 'API error occurred');
        (
          error as Error & { errorType: string; errorTimestamp: string }
        ).errorType = responseData.error.type || 'unknown';
        (
          error as Error & { errorType: string; errorTimestamp: string }
        ).errorTimestamp = responseData.error.timestamp;
        throw error;
      }

      // Extract the response content
      if (responseData.choices && responseData.choices.length > 0) {
        const message = responseData.choices[0].message;
        const content = message.content;
        
        // Get thinking and tool calls directly from the response if available
        const thinking = message.thinking;
        const toolCalls = message.toolCalls || [];
        
        // If thinking and tool calls are not in the response, try to parse from content
        let parsedThinking = thinking;
        let parsedToolCalls = toolCalls;
        let mainContent = content;
        
        if (!thinking && !toolCalls.length) {
          const parsed = parseMessageContent(content);
          parsedThinking = parsed.thinking;
          parsedToolCalls = parsed.toolCalls;
          mainContent = parsed.mainContent;
        }
        
        // Update the AI message with the complete response
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === aiMessageId) {
              return {
                ...msg,
                text: content,
                mainContent: mainContent,
                thinking: parsedThinking,
                toolCalls: parsedToolCalls,
              };
            }
            return msg;
          })
        );
      }

      setIsLoading(false);
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
    console.log('Suggested message clicked:', messageText);
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

  const handleResetConversation = async () => {
    setIsResetting(true);
    
    // Add a flash effect by temporarily showing the reset state
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Clear messages and localStorage
    setMessages([]);
    clearMessagesFromStorage();
    
    // Reset the flash state
    setTimeout(() => {
      setIsResetting(false);
    }, 200);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100 mobile-safe-area">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-blue-100">
              <AvatarImage src="/ai-avatar-simple.svg" alt="Financial Adviser AI" />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold">
                FA
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Financial Adviser AI</h1>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetConversation}
                    disabled={isResetting}
                    className={`p-1 h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ${
                      isResetting ? 'text-red-600 bg-red-50' : ''
                    }`}
                    title="Start a new conversation - This will clear your current chat history"
                  >
                    <RotateCcw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">
                Your intelligent investment advisor
              </p>
            </div>
          </div>
          
          {/* Mobile: Stack status info vertically, Desktop: Horizontal */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {modelStatus && (
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gray-50 border border-gray-200">
                <div className={`w-2 h-2 rounded-full ${
                  modelStatus.hasAnyConfigured ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs sm:text-sm text-gray-700">
                  {modelStatus.hasAnyConfigured 
                    ? `${new Set(modelStatus.models.filter(m => m.configured).map(m => m.provider)).size} provider(s) configured`
                    : 'No providers configured'
                  }
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-xs sm:text-sm text-gray-600">Using:</span>
              <span className="text-xs sm:text-sm font-semibold text-blue-900 truncate max-w-[120px] sm:max-w-none">
                {getModelConfig(selectedModel)?.name || selectedModel}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="btn-outline text-xs sm:text-sm"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className={`flex-1 overflow-y-auto p-2 sm:p-4 mobile-scroll transition-all duration-300 ${
        isResetting ? 'bg-white/50' : ''
      }`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6 min-h-[600px]">
            {/* Hero Section */}
            <div className="max-w-4xl w-full text-center mb-8 animate-fade-in-up">
              <div className="relative inline-block mb-6 animate-fade-in-scale" style={{ animationDelay: '0.2s' }}>
                <Avatar className="h-20 w-20 sm:h-28 sm:w-28 mx-auto ring-4 ring-blue-100/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <AvatarImage src="/ai-avatar-simple.svg" alt="Financial Adviser AI" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-2xl sm:text-3xl font-semibold">
                    FA
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              
              <div className="space-y-4" style={{ animationDelay: '0.4s' }}>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent leading-tight animate-fade-in-up">
                  Financial Adviser AI
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                  Your intelligent investment companion powered by advanced AI
                </p>
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-3xl w-full animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg hover:scale-105 group">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors duration-300">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Market Analysis</h3>
                <p className="text-sm text-gray-600">Real-time insights and trend analysis</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 hover:border-green-300/50 transition-all duration-300 hover:shadow-lg hover:scale-105 group">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors duration-300">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Portfolio Advice</h3>
                <p className="text-sm text-gray-600">Personalized investment strategies</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 hover:border-purple-300/50 transition-all duration-300 hover:shadow-lg hover:scale-105 group">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors duration-300">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Risk Assessment</h3>
                <p className="text-sm text-gray-600">Comprehensive risk evaluation</p>
              </div>
            </div>

            {/* Suggested Messages Section */}
            <div className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '1s' }}>
              <SuggestedMessages onMessageSelect={handleSuggestedMessage} />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.mainContent || message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
                isError={message.isError}
                errorType={message.errorType}
                errorProvider={message.errorProvider}
                onRetry={message.isError ? handleRetry : undefined}
                thinking={message.thinking}
                toolCalls={message.toolCalls}
                isLoading={isLoading && !message.isUser && message.id === messages[messages.length - 1]?.id}
              />
            ))}
            <div ref={messagesEndRef} />
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

      {/* Enhanced Settings Popup */}
      <EnhancedSettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        onStatusChange={refreshModelStatus}
      />
    </div>
  );
}
