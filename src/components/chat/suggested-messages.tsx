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

export function SuggestedMessages({ onMessageSelect }: Readonly<SuggestedMessagesProps>) {
  console.log('SuggestedMessages component rendered');
  return (
    <div className="p-4 sm:p-6">
      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-4 sm:mb-6 text-center">
        Try asking:
      </h3>
      <div className="space-y-3">
        {suggestedMessages.map((message) => (
          <button
            key={message.id}
            className="w-full group"
            onClick={() => {
              console.log('Button clicked for message:', message.text);
              onMessageSelect(message.text);
            }}
          >
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 group-hover:bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                  <div className="text-blue-600">{message.icon}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base text-gray-700 group-hover:text-blue-700 transition-colors duration-200 leading-relaxed">
                    {message.text}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                    <svg className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
