import { ApiTokenEnvironment, ApiTokenType } from '@prisma/client';

export const CLIENT_SERVICE_HANDLERS = Symbol('CLIENT_SERVICE_HANDLERS');

export interface ClientTokenPrincipal {
  id: string;
  type: ApiTokenType;
  permissions: string[];
  allowedIps: string[];
  rateLimitPerMin: number;
  dailyQuota: number;
  environment: ApiTokenEnvironment;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface ClientServiceContext {
  token: ClientTokenPrincipal;
}

export interface ClientServiceHandler<TPayload = unknown, TResult = unknown> {
  readonly service: string;
  execute(payload: TPayload, context: ClientServiceContext): Promise<TResult>;
}
