import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiServicesService } from './api-services.service';
import { ApiServiceRequestDto } from './dto/api-service-request.dto';
import { ClientSecretGuard } from './guards/client-secret.guard';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';

/**
 * Handles POST /api/services
 *
 * Authentication: X-Client-Secret header validated by ClientSecretGuard.
 * Response: returned as-is (bypasses the global TransformInterceptor envelope)
 *           so the caller receives the documented { success, data|message } shape.
 */
@Controller('api/services')
@UseGuards(ClientSecretGuard)
@SkipTransform()
export class ApiServicesController {
  constructor(private readonly apiServices: ApiServicesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async execute(@Body() dto: ApiServiceRequestDto) {
    return this.apiServices.dispatch(dto);
  }
}
