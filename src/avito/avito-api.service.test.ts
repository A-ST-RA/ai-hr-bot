import { AvitoApiService } from './avito-api.service';
import { AvitoAuthService } from './avito-auth.service';
import { SendMessageData, DeleteMessageData, RegisterWebhookData } from '../bot-api-service.interface';

// Мокаем fetch
global.fetch = jest.fn();

describe('AvitoApiService', () => {
  let avitoApiService: AvitoApiService;
  let mockAuthService: jest.Mocked<AvitoAuthService>;
  const mockAccessToken = 'test-access-token';
  const mockUserId = '12345';

  beforeEach(() => {
    // Создаем мок для AvitoAuthService
    mockAuthService = {
      getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
    } as any;

    avitoApiService = new AvitoApiService(mockAuthService, mockUserId);
    (fetch as jest.Mock).mockClear();
    (mockAuthService.getAccessToken as jest.Mock).mockClear();
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'text',
        direction: 'out',
        created: 1234567890,
        content: {
          text: 'Test message',
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const sendData: SendMessageData = {
        chatId: 'chat-123',
        userId: 'user-123',
        text: 'Test message',
      };

      const result = await avitoApiService.sendMessage(sendData);

      expect(mockAuthService.getAccessToken).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.avito.ru/messenger/v1/accounts/${mockUserId}/chats/chat-123/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'text',
            message: {
              text: 'Test message',
            },
          }),
        }
      );

      expect(result).toEqual(sendData);
    });

    it('should throw error on failed request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid request' }),
      });

      const sendData: SendMessageData = {
        chatId: 'chat-123',
        userId: 'user-123',
        text: 'Test message',
      };

      await expect(avitoApiService.sendMessage(sendData)).rejects.toThrow('Failed to send message');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const deleteData: DeleteMessageData = {
        chatId: 'chat-123',
        userId: 'user-123',
        messageId: 'msg-123',
      };

      await avitoApiService.deleteMessage(deleteData);

      expect(mockAuthService.getAccessToken).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.avito.ru/messenger/v1/accounts/${mockUserId}/chats/chat-123/messages/msg-123`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should throw error on failed deletion', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ message: 'Message not found' }),
      });

      const deleteData: DeleteMessageData = {
        chatId: 'chat-123',
        userId: 'user-123',
        messageId: 'msg-123',
      };

      await expect(avitoApiService.deleteMessage(deleteData)).rejects.toThrow('Failed to delete message');
    });
  });

  describe('registerWebhook', () => {
    it('should register webhook successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const webhookData: RegisterWebhookData = {
        url: 'https://example.com/webhook',
      };

      const result = await avitoApiService.registerWebhook(webhookData);

      expect(mockAuthService.getAccessToken).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.avito.ru/messenger/v3/webhook',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: 'https://example.com/webhook' }),
        }
      );

      expect(result).toBe(true);
    });

    it('should return false when webhook registration fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid URL' }),
      });

      const webhookData: RegisterWebhookData = {
        url: 'invalid-url',
      };

      await expect(avitoApiService.registerWebhook(webhookData)).rejects.toThrow('Failed to register webhook');
    });
  });
});