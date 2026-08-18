import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSecretGuard } from './client-secret.guard';

function makeContext(authHeader: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authHeader !== undefined ? { authorization: authHeader } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('ClientSecretGuard', () => {
  let guard: ClientSecretGuard;
  const validSecret = 'super-secret-value';

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'CLIENT_SECRET' ? validSecret : undefined,
      ),
    } as unknown as ConfigService;

    guard = new ClientSecretGuard(configService);
  });

  describe('valid credentials', () => {
    it('should allow a request with a valid Bearer token', () => {
      const context = makeContext(`Bearer ${validSecret}`);
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('missing / malformed Authorization header', () => {
    it('should throw 401 when the Authorization header is absent', () => {
      const context = makeContext(undefined);
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw 401 when the Authorization header is empty', () => {
      const context = makeContext('');
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw 401 when the token follows no scheme (raw value)', () => {
      // e.g. Authorization: abc123
      const context = makeContext(validSecret);
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw 401 for Basic authentication scheme', () => {
      const context = makeContext(`Basic ${Buffer.from(`user:${validSecret}`).toString('base64')}`);
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw 401 when "Bearer " prefix is present but token is empty', () => {
      const context = makeContext('Bearer ');
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw 401 when "Bearer " prefix is present but token is only whitespace', () => {
      const context = makeContext('Bearer    ');
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('invalid token', () => {
    it('should throw 401 when the Bearer token is wrong', () => {
      const context = makeContext('Bearer wrong-secret');
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('unconfigured server', () => {
    it('should throw 401 when CLIENT_SECRET env var is not configured', () => {
      const unconfigured = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const unconfiguredGuard = new ClientSecretGuard(unconfigured);

      const context = makeContext(`Bearer ${validSecret}`);
      expect(() => unconfiguredGuard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('security', () => {
    it('should not expose the expected secret in the thrown error body', () => {
      const context = makeContext('Bearer wrong-secret');
      try {
        guard.canActivate(context);
        fail('should have thrown');
      } catch (err: unknown) {
        const body = (err as UnauthorizedException).getResponse() as Record<string, unknown>;
        expect(JSON.stringify(body)).not.toContain(validSecret);
      }
    });

    it('should not expose the supplied token in the thrown error body', () => {
      const wrongToken = 'my-wrong-token';
      const context = makeContext(`Bearer ${wrongToken}`);
      try {
        guard.canActivate(context);
        fail('should have thrown');
      } catch (err: unknown) {
        const body = (err as UnauthorizedException).getResponse() as Record<string, unknown>;
        expect(JSON.stringify(body)).not.toContain(wrongToken);
      }
    });
  });
});
