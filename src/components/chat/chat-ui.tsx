'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { SuggestedMessages } from './suggested-messages';
import { Bot } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (messageText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I understand you're asking about financial advice. This is a demo response - in the full version, I would analyze market data and provide personalized investment recommendations based on your question.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSuggestedMessage = (messageText: string) => {
    handleSendMessage(messageText);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
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
      />
    </div>
  );
}
