'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const effectivePlaceholder = modelConfigured
    ? placeholder
    : modelError || 'Model not configured - add API key to use this model';

  return (
    <div className="border-t border-gray-700">
      {!modelConfigured && modelError && (
        <div className="px-4 py-2 bg-yellow-900/20 border-b border-yellow-500/30">
          <p className="text-sm text-yellow-400">⚠️ {modelError}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 p-4">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          disabled={disabled || !modelConfigured}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!message.trim() || disabled || !modelConfigured}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
