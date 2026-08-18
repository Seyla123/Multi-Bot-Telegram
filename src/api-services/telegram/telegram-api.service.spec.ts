import { ConfigService } from '@nestjs/config';
import { TelegramApiService } from './telegram-api.service';

// -------------------------------------------------------------------
// Global fetch mock — must be set before the service is instantiated
// -------------------------------------------------------------------
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const MOCK_TOKEN = 'TEST_BOT_TOKEN_12345';

function makeConfigService(token = MOCK_TOKEN): ConfigService {
  return {
    get: jest.fn((key: string) =>
      key === 'TELEGRAM_BOT_TOKEN' ? token : undefined,
    ),
  } as unknown as ConfigService;
}

describe('TelegramApiService', () => {
  let service: TelegramApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelegramApiService(makeConfigService());
  });

  it('should throw on construction when TELEGRAM_BOT_TOKEN is not set', () => {
    expect(() => new TelegramApiService(makeConfigService(''))).toThrow(
      'TELEGRAM_BOT_TOKEN is not configured',
    );
  });

  it('should call the correct Telegram Bot API URL with the configured token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 55, chat: { id: 123 } } }),
    });

    await service.sendMessage('123456789', 'Hello');

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe(`https://api.telegram.org/bot${MOCK_TOKEN}/sendMessage`);
  });

  it('should NOT include the bot token in the request body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 55, chat: { id: 123 } } }),
    });

    await service.sendMessage('123456789', 'Hello');

    const bodyString: string = mockFetch.mock.calls[0][1].body;
    expect(bodyString).not.toContain(MOCK_TOKEN);
  });

  it('should send the correct payload to the Telegram API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 55, chat: { id: 123 } } }),
    });

    await service.sendMessage('123456789', 'Hello from test');

    const bodyString: string = mockFetch.mock.calls[0][1].body;
    const body = JSON.parse(bodyString);
    expect(body).toEqual({ chat_id: '123456789', text: 'Hello from test' });
  });

  it('should return the Telegram API response on success', async () => {
    const telegramResponse = { ok: true, result: { message_id: 77, chat: { id: 123456789 } } };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => telegramResponse,
    });

    const result = await service.sendMessage('123456789', 'Hello');
    expect(result).toEqual(telegramResponse);
  });

  it('should return the error response when Telegram returns ok: false', async () => {
    const errorResponse = { ok: false, error_code: 400, description: 'Bad Request: chat not found' };
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
    });

    const result = await service.sendMessage('bad_id', 'Hi');
    expect(result).toEqual(errorResponse);
  });

  it('should throw when fetch rejects (network error)', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.sendMessage('123', 'Hi')).rejects.toThrow(
      'Telegram API request failed',
    );
  });
});
