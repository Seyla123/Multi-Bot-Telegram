import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  async create(createVideoDto: CreateVideoDto) {
    return this.prisma.video.create({
      data: {
        title: createVideoDto.title,
        originalFileName: createVideoDto.originalFileName,
      },
    });
  }

  async findAll() {
    return this.prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async countAll() {
    return this.prisma.video.count();
  }

  async findManyPaginated(skip: number, take: number) {
    return this.prisma.video.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    return video;
  }

  async update(id: string, updateVideoDto: UpdateVideoDto) {
    await this.findOne(id);
    return this.prisma.video.update({
      where: { id },
      data: updateVideoDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.video.delete({
      where: { id },
    });
  }
}
