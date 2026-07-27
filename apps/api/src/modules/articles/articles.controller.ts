import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ArticleDto, CreateArticleDto, UpdateArticleDto } from './articles.dto';
import { ArticlesService } from './articles.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @ApiOkResponse({ type: [ArticleDto] })
  list(@CurrentUser() user: AccessTokenPayload): Promise<ArticleDto[]> {
    return this.articles.list(user);
  }

  @Get(':slug')
  @ApiOkResponse({ type: ArticleDto })
  @ApiNotFoundResponse({ description: 'Unknown or unpublished article' })
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ArticleDto> {
    return this.articles.getBySlug(slug, user);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: ArticleDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  create(@Body() dto: CreateArticleDto): Promise<ArticleDto> {
    return this.articles.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: ArticleDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  @ApiNotFoundResponse({ description: 'Unknown article' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto): Promise<ArticleDto> {
    return this.articles.update(id, dto);
  }
}
