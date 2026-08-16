import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ClientTokenPrincipal } from '../client-service.types';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClientTokenPrincipal => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as ClientTokenPrincipal;
  },
);
