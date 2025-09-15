'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  readonly onSendMessage: (message: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly modelConfigured?: boolean;
  readonly modelError?: string;
}

export function ChatInput({
  onSendMessage,
  placeholder = 'Type your message...',
  disabled = false,
  modelConfigured = true,
  modelError,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; // cap height, compact
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Shift+Enter falls through to default behavior to insert newline
  };

  const effectivePlaceholder = modelConfigured
    ? placeholder
    : modelError || 'Model not configured - add API key to use this model';

  return (
    <div className="bg-white/90 backdrop-blur-md border-t border-gray-200/50 shadow-xl">
      {!modelConfigured && modelError && (
        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
          <p className="text-sm text-yellow-800 text-center">⚠️ {modelError}</p>
        </div>
      )}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:border-blue-300 focus-within:border-blue-500 transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={effectivePlaceholder}
              disabled={disabled || !modelConfigured}
              rows={1}
              className="w-full px-3 py-2 text-sm sm:text-base border-0 rounded-2xl focus:ring-0 focus:outline-none bg-transparent placeholder:text-gray-400 text-gray-900 disabled:opacity-50 resize-none min-h-[38px] sm:min-h-[40px] leading-snug"
            />
          </div>
          <Button
            type="submit"
            disabled={!message.trim() || disabled || !modelConfigured}
            className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </Button>
        </form>
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift + Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
