import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TelegramFileService {
  private readonly logger = new Logger(TelegramFileService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private configService: ConfigService,
  ) {}

  async downloadAndSaveFile(fileId: string): Promise<string | null> {
    try {
      // Ensure the storage directory exists
      const storageDir = path.join(process.cwd(), 'storage', 'telegram_files');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const file = await this.bot.telegram.getFile(fileId);
      if (!file.file_path) {
        this.logger.warn(`File ${fileId} does not have a file_path.`);
        return null;
      }

      // Download file using fetch
      const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        this.logger.error(`Failed to download file ${fileId}: ${response.statusText}`);
        return null;
      }

      const originalExtension = path.extname(file.file_path);
      const storageFilename = `${fileId}${originalExtension}`;
      const storagePath = path.join(storageDir, storageFilename);

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(storagePath, Buffer.from(buffer));

      this.logger.log(`File ${fileId} saved to ${storagePath}`);
      return `storage/telegram_files/${storageFilename}`;
    } catch (error: any) {
      this.logger.error(`Error downloading file ${fileId}`, error.stack);
      return null;
    }
  }
}
