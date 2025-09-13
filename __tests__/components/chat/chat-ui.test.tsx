import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatUI } from '@/components/chat/chat-ui';

// Mock the ChatService
jest.mock('@/lib/services', () => ({
  ChatService: {
    sendMessage: jest.fn(),
    sendMessageStream: jest.fn(),
  },
}));

import { ChatService } from '@/lib/services';

const mockChatService = ChatService as jest.Mocked<typeof ChatService>;

// Mock ReadableStream
global.ReadableStream = jest.fn();

describe('ChatUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome screen with suggested messages', () => {
    render(<ChatUI />);

    expect(
      screen.getByText('Welcome to Financial Adviser AI')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Get AI-powered investment advice for any stock of your choice.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Suggested questions:')).toBeInTheDocument();
    expect(
      screen.getByText('Should I invest in Apple (AAPL) stock?')
    ).toBeInTheDocument();
    expect(
      screen.getByText("What's the current market outlook for tech stocks?")
    ).toBeInTheDocument();
  });

  it('renders chat input with correct placeholder', () => {
    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    expect(input).toBeInTheDocument();
  });

  it('sends message when suggested message is clicked', async () => {
    const mockResponse = {
      message: 'Test response about Apple stock',
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    mockChatService.sendMessage.mockResolvedValueOnce(mockResponse);

    render(<ChatUI />);

    const suggestedMessage = screen.getByText(
      'Should I invest in Apple (AAPL) stock?'
    );
    fireEvent.click(suggestedMessage);

    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Should I invest in Apple (AAPL) stock?',
            isUser: true,
          }),
        ])
      );
    });
  });

  it('sends message when user types and submits', async () => {
    const mockResponse = {
      message: 'Test response',
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    mockChatService.sendMessage.mockResolvedValueOnce(mockResponse);

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Test message',
            isUser: true,
          }),
        ])
      );
    });
  });

  it('sends message when user presses Enter', async () => {
    const mockResponse = {
      message: 'Test response',
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    mockChatService.sendMessage.mockResolvedValueOnce(mockResponse);

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Test message',
            isUser: true,
          }),
        ])
      );
    });
  });

  it('displays user message immediately after sending', async () => {
    const mockResponse = {
      message: 'Test response',
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    mockChatService.sendMessage.mockResolvedValueOnce(mockResponse);

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // User message should appear immediately
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('displays AI response after API call', async () => {
    const mockResponse = {
      message: 'Test AI response',
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    mockChatService.sendMessage.mockResolvedValueOnce(mockResponse);

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test AI response')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    mockChatService.sendMessage.mockRejectedValueOnce(new Error('API Error'));

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Sorry, I'm having trouble connecting right now. Please try again in a moment."
        )
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while waiting for response', async () => {
    // Mock a delayed response
    mockChatService.sendMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                message: 'Test response',
                timestamp: '2024-01-01T00:01:00.000Z',
              }),
            100
          )
        )
    );

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Should show loading state
    expect(screen.getByText('Thinking...')).toBeInTheDocument();

    // Should disable input while loading
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('clears input after sending message', async () => {
    const mockResponse = {
      message: 'Test response',
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    mockChatService.sendMessage.mockResolvedValueOnce(mockResponse);

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('does not send empty messages', () => {
    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    expect(sendButton).toBeDisabled();
  });

  it('does not send message when input is empty', () => {
    render(<ChatUI />);

    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(sendButton).toBeDisabled();
  });

  it('streams AI response character by character', async () => {
    const mockChunks = [
      { type: 'metadata', timestamp: '2024-01-01T00:01:00.000Z' },
      { type: 'content', content: 'Hello' },
      { type: 'content', content: ' ' },
      { type: 'content', content: 'World' },
      { type: 'done' },
    ];

    mockChatService.sendMessageStream.mockImplementation(
      async (messages, onChunk) => {
        // Simulate streaming by calling onChunk for each chunk
        for (const chunk of mockChunks) {
          onChunk(chunk);
          // Small delay to simulate real streaming
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    );

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // User message should appear immediately
    expect(screen.getByText('Test message')).toBeInTheDocument();

    // AI message should appear immediately but empty
    const aiMessages = screen.getAllByText('');
    expect(aiMessages.length).toBeGreaterThan(0);

    // Wait for streaming to complete
    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    // Loading should be false after streaming is done
    await waitFor(() => {
      expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
    });
  });

  it('handles streaming errors gracefully', async () => {
    mockChatService.sendMessageStream.mockRejectedValueOnce(
      new Error('Streaming error')
    );

    render(<ChatUI />);

    const input = screen.getByPlaceholderText(
      'Ask me about any stock or investment strategy...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Sorry, I'm having trouble connecting right now. Please try again in a moment."
        )
      ).toBeInTheDocument();
    });
  });
});
