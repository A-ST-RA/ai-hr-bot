import { DeepSeekApiService } from './deepseek-api.service';

// Мокаем fetch
global.fetch = jest.fn();

describe('DeepSeekApiService', () => {
  let deepSeekService: DeepSeekApiService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    deepSeekService = new DeepSeekApiService(mockApiKey);
    (fetch as jest.Mock).mockClear();
  });

  describe('findMatchingQuestion', () => {
    it('should find matching question successfully', async () => {
      const mockResponse = {
        id: 'chat-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '{"questionKey": "salary"}',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 10,
          total_tokens: 110,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const userQuestion = 'Входит ли питание и проживание в оплату труда';
      const availableQuestions = [
        { key: 'salary', question: 'Вопрос о зарплате' },
        { key: 'schedule', question: 'Вопрос о графике работы' },
        { key: 'benefits', question: 'Вопрос о льготах' },
      ];

      const result = await deepSeekService.findMatchingQuestion(userQuestion, availableQuestions);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result).toBe('salary');
    });

    it('should return default when question does not match', async () => {
      const mockResponse = {
        id: 'chat-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '{"questionKey": "default"}',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 10,
          total_tokens: 110,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const userQuestion = 'Какой-то непонятный вопрос';
      const availableQuestions = [
        { key: 'salary', question: 'Вопрос о зарплате' },
      ];

      const result = await deepSeekService.findMatchingQuestion(userQuestion, availableQuestions);

      expect(result).toBe('default');
    });

    it('should return default on API error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'API Error' }),
      });

      const userQuestion = 'Вопрос';
      const availableQuestions = [
        { key: 'salary', question: 'Вопрос о зарплате' },
      ];

      const result = await deepSeekService.findMatchingQuestion(userQuestion, availableQuestions);

      expect(result).toBe('default');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        id: 'chat-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Invalid JSON response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 10,
          total_tokens: 110,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const userQuestion = 'Вопрос';
      const availableQuestions = [
        { key: 'salary', question: 'Вопрос о зарплате' },
      ];

      const result = await deepSeekService.findMatchingQuestion(userQuestion, availableQuestions);

      expect(result).toBe('default');
    });

    it('should extract JSON from response with extra text', async () => {
      const mockResponse = {
        id: 'chat-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Here is the answer: {"questionKey": "schedule"}',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 10,
          total_tokens: 110,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const userQuestion = 'Вопрос о графике';
      const availableQuestions = [
        { key: 'schedule', question: 'Вопрос о графике работы' },
      ];

      const result = await deepSeekService.findMatchingQuestion(userQuestion, availableQuestions);

      expect(result).toBe('schedule');
    });
  });
});

