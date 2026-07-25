import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { VideosProcessor } from './videos.processor';
import { VideoWorkerProcessor } from './video-worker.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video-queue',
    }),
    BullModule.registerQueue({
      name: 'video-worker-queue',
    }),
  ],
  controllers: [VideosController],
  providers: [VideosService, VideosProcessor, VideoWorkerProcessor],
})
export class VideosModule {}
