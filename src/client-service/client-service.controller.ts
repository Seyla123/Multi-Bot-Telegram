import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientServiceRequestDto } from './dto/client-service-request.dto';
import { ClientServiceRegistry } from './client-service.registry';
import { CurrentAuth } from './decorators/current-auth.decorator';
import type { ClientTokenPrincipal } from './client-service.types';
import { GatewaySecurityGuard } from './guards/gateway-security.guard';
import { ApiAuditLogInterceptor } from './interceptors/api-audit-log.interceptor';

@Controller('client')
export class ClientServiceController {
  constructor(private readonly registry: ClientServiceRegistry) {}

  @Post('service')
  @UseGuards(AuthGuard('api-token'), GatewaySecurityGuard)
  @UseInterceptors(ApiAuditLogInterceptor)
  execute(
    @Body() request: ClientServiceRequestDto,
    @CurrentAuth() auth: ClientTokenPrincipal,
  ) {
    return this.registry.execute(request.service, request.payload, { token: auth });
  }
}
