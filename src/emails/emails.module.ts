import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailsService } from './emails.service';
import { EmailsProcessor } from './emails.processor';

@Module({
  imports: [
    // Register the queue with the module
    BullModule.registerQueue({
      name: 'emails',
    }),
  ],
  providers: [EmailsService, EmailsProcessor],
  exports: [EmailsService], // Export the service so other modules can dispatch emails
})
export class EmailsModule {}
