import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TelegramFileService {
  private readonly logger = new Logger(TelegramFileService.name);

  constructor(
    private configService: ConfigService,
  ) {}

  async downloadAndSaveFileWithUrl(fileUrl: string, fileId: string): Promise<string | null> {
    try {
      // Ensure the storage directory exists
      const storageDir = path.join(process.cwd(), 'storage', 'telegram_files');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      // Download file using fetch
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        this.logger.error(`Failed to download file ${fileId}: ${response.statusText}`);
        return null;
      }

      // Try to parse original extension from URL path
      const urlPath = new URL(fileUrl).pathname;
      const originalExtension = path.extname(urlPath) || '';
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
