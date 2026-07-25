import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('video-worker-queue')
export class VideoWorkerProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Worker processing chunk job ${job.id} of type ${job.name}...`);

    switch (job.name) {
      case 'process-chunk':
        const videos = job.data.videos;
        console.log(
          `Worker received chunk of ${videos.length} videos. Processing them...`,
        );
        // Here you would do the heavy lifting for each video in the chunk
        // For demonstration, we just log their titles
        for (const video of videos) {
          console.log(` -> Processing video: ${video.title}`);
        }
        console.log(`Chunk processing completed!`);
        break;
      default:
        console.log(`Unknown job name in worker: ${job.name}`);
    }
  }
}
