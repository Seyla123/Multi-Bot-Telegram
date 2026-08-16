import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CLIENT_SERVICE_HANDLERS, ClientServiceContext, ClientServiceHandler } from './client-service.types';

@Injectable()
export class ClientServiceRegistry {
  private readonly handlers: Map<string, ClientServiceHandler>;

  constructor(
    @Inject(CLIENT_SERVICE_HANDLERS)
    handlers: ClientServiceHandler[],
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.service, handler]));
  }

  async execute(service: string, payload: unknown, context: ClientServiceContext) {
    const handler = this.handlers.get(service);
    if (!handler) throw new BadRequestException(`Unsupported client service: ${service}`);
    return handler.execute(payload, context);
  }
}
