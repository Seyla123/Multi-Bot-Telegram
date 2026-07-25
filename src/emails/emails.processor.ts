import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('emails')
export class EmailsProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailsProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data:`,
      job.data,
    );

    // Simulate sending an email (e.g. calling Resend/SendGrid/AWS SES)
    switch (job.name) {
      case 'send-welcome-email':
        await this.handleWelcomeEmail(job.data);
        break;
      default:
        this.logger.warn(`No handler for job name: ${job.name}`);
    }

    return 'Completed!';
  }

  private async handleWelcomeEmail(data: any) {
    this.logger.log(`Sending welcome email to ${data.email}...`);
    // Wait for 2 seconds to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.logger.log(`Welcome email sent to ${data.email}!`);
  }
}
