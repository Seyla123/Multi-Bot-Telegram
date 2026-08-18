import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ApiServiceRequestDto } from './dto/api-service-request.dto';
import { SendMessageService } from './telegram/send-message.service';

/**
 * Dispatches incoming service requests to the appropriate handler.
 *
 * To add a new service:
 *  1. Create a new handler service (e.g. SendPhotoService)
 *  2. Inject it here
 *  3. Add a case to the switch statement below
 *
 * The dispatcher itself contains no business logic — it is purely a router.
 */
@Injectable()
export class ApiServicesService {
  private readonly logger = new Logger(ApiServicesService.name);

  constructor(private readonly sendMessageService: SendMessageService) {}

  async dispatch(dto: ApiServiceRequestDto) {
    this.logger.log(`Service request received: ${dto.service}`);

    switch (dto.service) {
      case 'send_message':
        return this.sendMessageService.execute(dto);

      default:
        throw new BadRequestException({
          success: false,
          message: `Unsupported service: ${dto.service}`,
        });
    }
  }
}
