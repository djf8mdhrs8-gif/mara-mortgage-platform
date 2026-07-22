import { Injectable, NotFoundException } from '@nestjs/common';
import type { ContentBlock } from '@prisma/client';

import { ContentBlockDto } from './content.dto';
import { PrismaService } from '../../prisma/prisma.service';

function toDto(block: ContentBlock): ContentBlockDto {
  return { key: block.key, body: block.body, updatedAt: block.updatedAt.toISOString() };
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<ContentBlockDto> {
    const block = await this.prisma.contentBlock.findUnique({ where: { key } });
    if (block === null) {
      throw new NotFoundException('content block not found');
    }
    return toDto(block);
  }

  async upsert(key: string, body: string): Promise<ContentBlockDto> {
    const block = await this.prisma.contentBlock.upsert({
      where: { key },
      create: { key, body },
      update: { body },
    });
    return toDto(block);
  }
}
