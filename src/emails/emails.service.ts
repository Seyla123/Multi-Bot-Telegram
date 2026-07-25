import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailsService {
  constructor(@InjectQueue('emails') private emailQueue: Queue) {}

  async sendWelcomeEmail(userEmail: string) {
    // Dispatching the job to the queue
    const job = await this.emailQueue.add('send-welcome-email', {
      email: userEmail,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Email job dispatched successfully',
      jobId: job.id,
    };
  }
}
