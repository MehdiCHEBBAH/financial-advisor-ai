'use client';

import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, BarChart3, PieChart } from 'lucide-react';

interface SuggestedMessage {
  id: string;
  text: string;
  icon: React.ReactNode;
}

interface SuggestedMessagesProps {
  onMessageSelect: (message: string) => void;
}

const suggestedMessages: SuggestedMessage[] = [
  {
    id: '1',
    text: 'Should I invest in Apple (AAPL) stock?',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    id: '2',
    text: "What's the current market outlook for tech stocks?",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    id: '3',
    text: 'Help me diversify my investment portfolio',
    icon: <PieChart className="h-4 w-4" />,
  },
  {
    id: '4',
    text: 'What are the risks of investing in cryptocurrency?',
    icon: <DollarSign className="h-4 w-4" />,
  },
];

export function SuggestedMessages({ onMessageSelect }: SuggestedMessagesProps) {
  return (
    <div className="p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">
        Suggested questions:
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestedMessages.map((message) => (
          <Button
            key={message.id}
            variant="outline"
            className="h-auto p-4 justify-start text-left hover:bg-gray-800"
            onClick={() => onMessageSelect(message.text)}
          >
            <div className="flex items-center gap-3">
              {message.icon}
              <span className="text-sm">{message.text}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
