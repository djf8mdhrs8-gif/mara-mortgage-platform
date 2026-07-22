import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Document } from '@prisma/client';

import type { AccessTokenPayload } from '../auth/auth.service';
import { DocumentDto } from './documents.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);

const STAFF_ROLES = ['LOAN_OFFICER', 'ADMIN'] as const;

function isStaff(payload: AccessTokenPayload): boolean {
  return (STAFF_ROLES as readonly string[]).includes(payload.role);
}

function toDto(doc: Document): DocumentDto {
  return {
    id: doc.id,
    applicationId: doc.applicationId,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** 404 (not 403) when the application isn't visible to this user — no existence oracle. */
  private async requireVisibleApplication(
    applicationId: string,
    payload: AccessTokenPayload,
  ): Promise<void> {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (app === null || (!isStaff(payload) && app.userId !== payload.sub)) {
      throw new NotFoundException('application not found');
    }
  }

  async upload(
    applicationId: string,
    payload: AccessTokenPayload,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<DocumentDto> {
    await this.requireVisibleApplication(applicationId, payload);

    if (file.size === 0 || file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('file must be between 1 byte and 15 MB');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('only PDF and common image formats are accepted');
    }

    // Sanitized display name; the storage key never uses user input directly.
    const fileName = file.originalname.replace(/[^\w.\- ()]/g, '_').slice(0, 120) || 'document';
    const storageKey = `documents/${applicationId}/${randomUUID()}`;

    await this.storage.put(storageKey, file.buffer);
    const doc = await this.prisma.document.create({
      data: {
        applicationId,
        uploaderId: payload.sub,
        fileName,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
    return toDto(doc);
  }

  async list(applicationId: string, payload: AccessTokenPayload): Promise<DocumentDto[]> {
    await this.requireVisibleApplication(applicationId, payload);
    const docs = await this.prisma.document.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map(toDto);
  }

  /** Staff-only at the controller layer (@Roles); 404 on unknown ids. */
  async updateStatus(documentId: string, status: Document['status']): Promise<DocumentDto> {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (doc === null) {
      throw new NotFoundException('document not found');
    }
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { status },
    });
    return toDto(updated);
  }

  async openDownload(
    documentId: string,
    payload: AccessTokenPayload,
  ): Promise<{ meta: DocumentDto; stream: Readable }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { application: true },
    });
    if (doc === null || (!isStaff(payload) && doc.application.userId !== payload.sub)) {
      throw new NotFoundException('document not found');
    }
    return { meta: toDto(doc), stream: await this.storage.getStream(doc.storageKey) };
  }
}
