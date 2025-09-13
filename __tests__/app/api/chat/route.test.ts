import { POST } from '@/app/api/chat/route';

// Mock NextRequest
const createMockRequest = (body: unknown) => {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request;
};

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return a response for valid chat messages', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'Should I invest in Apple stock?',
          isUser: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const request = createMockRequest({ messages: mockMessages });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.message).toBe('string');
      expect(data.message.length).toBeGreaterThan(0);
    });

    it('should return Apple-specific response for Apple-related questions', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'What about Apple (AAPL) stock?',
          isUser: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const request = createMockRequest({ messages: mockMessages });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toContain('apple');
    });

    it('should return tech-specific response for technology questions', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'What is the outlook for tech stocks?',
          isUser: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const request = createMockRequest({ messages: mockMessages });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toContain('tech');
    });

    it('should return portfolio-specific response for diversification questions', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'How can I diversify my portfolio?',
          isUser: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const request = createMockRequest({ messages: mockMessages });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toContain('portfolio');
    });

    it('should return crypto-specific response for cryptocurrency questions', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'What are the risks of investing in cryptocurrency?',
          isUser: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const request = createMockRequest({ messages: mockMessages });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toContain('crypto');
    });

    it('should return 400 for invalid request without messages', async () => {
      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('messages array is required');
    });

    it('should return 400 for invalid request with non-array messages', async () => {
      const request = createMockRequest({ messages: 'not an array' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('messages array is required');
    });

    it('should return 400 for request without user messages', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'This is an AI message',
          isUser: false,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const request = createMockRequest({ messages: mockMessages });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No user message found');
    });

    it('should handle multiple messages and use the last user message', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'First message',
          isUser: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          text: 'AI response',
          isUser: false,
          timestamp: '2024-01-01T00:01:00.000Z',
        },
        {
          id: '3',
          text: 'What about Apple stock?',
          isUser: true,
          timestamp: '2024-01-01T00:02:00.000Z',
        },
      ];

      const request = createMockRequest({ messages: mockMessages });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toContain('apple');
    });

    it('should return 500 for malformed JSON', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });
  });
});
