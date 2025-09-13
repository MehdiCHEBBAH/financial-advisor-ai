'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: string;
  isUser?: boolean;
  timestamp?: Date;
}

export function ChatMessage({
  message,
  isUser = false,
  timestamp,
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
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
        )}
      >
        <p className="text-sm">{message}</p>
        {timestamp && (
          <p className="text-xs opacity-70 mt-1">
            {timestamp.toLocaleTimeString()}
          </p>
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
