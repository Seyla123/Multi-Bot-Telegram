import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailsService } from './emails/emails.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailsService: EmailsService,
  ) {}

  @Get('api/hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-email')
  async testEmail() {
    return this.emailsService.sendWelcomeEmail('test@example.com');
  }
}
