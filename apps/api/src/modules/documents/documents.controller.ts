import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { DocumentDto, UpdateDocumentStatusDto } from './documents.dto';
import { DocumentsService } from './documents.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('applications/:id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ type: DocumentDto })
  @ApiNotFoundResponse({ description: 'Application not found (or not yours)' })
  upload(
    @Param('id') applicationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DocumentDto> {
    if (file === undefined) {
      throw new BadRequestException('multipart field "file" is required');
    }
    return this.documents.upload(applicationId, user, file);
  }

  @Get('applications/:id/documents')
  @ApiOkResponse({ type: [DocumentDto] })
  @ApiNotFoundResponse({ description: 'Application not found (or not yours)' })
  list(
    @Param('id') applicationId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DocumentDto[]> {
    return this.documents.list(applicationId, user);
  }

  @Patch('documents/:id/status')
  @Roles('LOAN_OFFICER', 'ADMIN')
  @ApiOkResponse({ type: DocumentDto })
  @ApiForbiddenResponse({ description: 'Requires loan officer or admin role' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  updateStatus(
    @Param('id') documentId: string,
    @Body() dto: UpdateDocumentStatusDto,
  ): Promise<DocumentDto> {
    return this.documents.updateStatus(documentId, dto.status);
  }

  @Get('documents/:id/download')
  @ApiOkResponse({ description: 'The document bytes' })
  @ApiNotFoundResponse({ description: 'Document not found (or not yours)' })
  async download(
    @Param('id') documentId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Res() res: Response,
  ): Promise<void> {
    const { meta, stream } = await this.documents.openDownload(documentId, user);
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${meta.fileName.replace(/"/g, '')}"`,
    );
    stream.pipe(res);
  }
}
