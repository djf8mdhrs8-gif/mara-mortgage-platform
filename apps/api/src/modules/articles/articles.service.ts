import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Article } from '@prisma/client';

import type { AccessTokenPayload } from '../auth/auth.service';
import { ArticleDto, CreateArticleDto, UpdateArticleDto } from './articles.dto';
import { PrismaService } from '../../prisma/prisma.service';

function isStaff(payload: AccessTokenPayload): boolean {
  return payload.role === 'LOAN_OFFICER' || payload.role === 'ADMIN';
}

function toDto(article: Article): ArticleDto {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    published: article.published,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
  };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Non-staff see published articles only, newest first. */
  async list(payload: AccessTokenPayload): Promise<ArticleDto[]> {
    const articles = await this.prisma.article.findMany({
      where: isStaff(payload) ? undefined : { published: true },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    return articles.map(toDto);
  }

  async getBySlug(slug: string, payload: AccessTokenPayload): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (article === null || (!article.published && !isStaff(payload))) {
      throw new NotFoundException('article not found');
    }
    return toDto(article);
  }

  async create(dto: CreateArticleDto): Promise<ArticleDto> {
    const existing = await this.prisma.article.findUnique({ where: { slug: dto.slug } });
    if (existing !== null) {
      throw new ConflictException('slug already exists');
    }
    const published = dto.published ?? false;
    const article = await this.prisma.article.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        excerpt: dto.excerpt ?? null,
        content: dto.content,
        published,
        publishedAt: published ? new Date() : null,
      },
    });
    return toDto(article);
  }

  async update(id: string, dto: UpdateArticleDto): Promise<ArticleDto> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (existing === null) {
      throw new NotFoundException('article not found');
    }
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const clash = await this.prisma.article.findUnique({ where: { slug: dto.slug } });
      if (clash !== null) {
        throw new ConflictException('slug already exists');
      }
    }
    const article = await this.prisma.article.update({
      where: { id },
      data: {
        ...dto,
        // Stamp publishedAt on the draft -> published transition only.
        publishedAt:
          dto.published === true && !existing.published ? new Date() : existing.publishedAt,
      },
    });
    return toDto(article);
  }
}
