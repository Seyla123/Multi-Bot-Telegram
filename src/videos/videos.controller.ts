import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    @InjectQueue('video-queue') private readonly videoQueue: Queue,
  ) {}

  @Post()
  async create(@Body() createVideoDto: CreateVideoDto) {
    await this.videoQueue.add('create-video', createVideoDto);
    return {
      message: 'Video creation dispatched successfully',
    };
  }

  @Post('process-all')
  async processAll() {
    await this.videoQueue.add('process-all-videos', {});
    return {
      message: 'Dispatched job to process all videos in chunks',
    };
  }

  @Get()
  findAll(@Query('sort') sort: 'asc' | 'desc' = 'asc') {
    // throw new NotFoundException("Not implement");
    console.log(sort);
    return this.videosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.videosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    return this.videosService.update(id, updateVideoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.videosService.remove(id);
  }
}
