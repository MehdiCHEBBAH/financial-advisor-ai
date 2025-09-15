'use client';

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
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    id: '2',
    text: "What's the current market outlook for tech stocks?",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: '3',
    text: 'Help me diversify my investment portfolio',
    icon: <PieChart className="h-5 w-5" />,
  },
  {
    id: '4',
    text: 'What are the risks of investing in cryptocurrency?',
    icon: <DollarSign className="h-5 w-5" />,
  },
];

export function SuggestedMessages({ onMessageSelect }: Readonly<SuggestedMessagesProps>) {
  console.log('SuggestedMessages component rendered');
  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Get Started</h3>
        <p className="text-sm text-gray-500">Choose a topic to begin your financial journey</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestedMessages.map((message, index) => (
          <button
            key={message.id}
            className="group relative overflow-hidden opacity-0 animate-fade-in-up"
            onClick={() => {
              console.log('Button clicked for message:', message.text);
              onMessageSelect(message.text);
            }}
            style={{
              animationDelay: `${index * 150 + 200}ms`,
              animationFillMode: 'forwards'
            }}
          >
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-5 hover:border-blue-300/60 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group-hover:bg-white group-hover:scale-[1.02] h-full">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-blue-500/5 transition-all duration-300 rounded-2xl"></div>
              
              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300 shadow-sm">
                  <div className="text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
                    {message.icon}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-blue-900 transition-colors duration-300 leading-relaxed text-left">
                    {message.text}
                  </p>
                </div>
                
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Subtle bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all duration-300 rounded-b-2xl"></div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Additional hint */}
      <div className="text-center mt-6">
        <p className="text-xs text-gray-400">
          💡 Or type your own question in the input below
        </p>
      </div>
    </div>
  );
}
