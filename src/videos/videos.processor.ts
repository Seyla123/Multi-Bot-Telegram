import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';

@Processor('video-queue')
export class VideosProcessor extends WorkerHost {
  constructor(
    private readonly videosService: VideosService,
    @InjectQueue('video-worker-queue') private readonly videoWorkerQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing job ${job.id} of type ${job.name}...`);
    switch (job.name) {
      case 'create-video':
        await this.videosService.create(job.data as CreateVideoDto);
        console.log(`Job ${job.id} completed! Video created.`);
        break;

      case 'process-all-videos': {
        const chunkSize = 10;
        const totalVideos = await this.videosService.countAll();
        console.log(
          `Master queue found ${totalVideos} videos. Chunking by ${chunkSize}...`,
        );

        for (let skip = 0; skip < totalVideos; skip += chunkSize) {
          const videos = await this.videosService.findManyPaginated(
            skip,
            chunkSize,
          );
          await this.videoWorkerQueue.add('process-chunk', { videos });
          console.log(
            `Dispatched chunk (skip: ${skip}, take: ${chunkSize}) to worker queue.`,
          );
        }
        break;
      }

      default:
        console.log(`Unknown job name: ${job.name}`);
    }
  }
}
