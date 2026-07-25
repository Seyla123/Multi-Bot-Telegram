import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // This decorator makes the PrismaService available everywhere without needing to import it in every module!
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
