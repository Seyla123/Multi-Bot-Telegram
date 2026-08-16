import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { ApiTokenService } from '../api-token.service';
import type { ClientTokenPrincipal } from '../client-service.types';

/**
 * Validates an opaque API token from `Authorization: Bearer <token>`.
 * Passport assigns the returned principal to `req.user`.
 */
@Injectable()
export class ApiTokenStrategy extends PassportStrategy(Strategy, 'api-token') {
  constructor(private readonly apiTokenService: ApiTokenService) {
    super();
  }

  async validate(rawToken: string): Promise<ClientTokenPrincipal> {
    return this.apiTokenService.authenticate(rawToken);
  }
}
