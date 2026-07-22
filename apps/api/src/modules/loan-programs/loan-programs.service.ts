import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { LoanProgram } from '@prisma/client';

import type { AccessTokenPayload } from '../auth/auth.service';
import { CreateLoanProgramDto, LoanProgramDto, UpdateLoanProgramDto } from './loan-programs.dto';
import { PrismaService } from '../../prisma/prisma.service';

function isStaff(payload: AccessTokenPayload): boolean {
  return payload.role === 'LOAN_OFFICER' || payload.role === 'ADMIN';
}

function toDto(program: LoanProgram): LoanProgramDto {
  return {
    id: program.id,
    slug: program.slug,
    title: program.title,
    summary: program.summary,
    content: program.content,
    sortOrder: program.sortOrder,
    published: program.published,
    updatedAt: program.updatedAt.toISOString(),
  };
}

@Injectable()
export class LoanProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Borrowers/Realtors see published programs only; staff see drafts too. */
  async list(payload: AccessTokenPayload): Promise<LoanProgramDto[]> {
    const programs = await this.prisma.loanProgram.findMany({
      where: isStaff(payload) ? undefined : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return programs.map(toDto);
  }

  async getBySlug(slug: string, payload: AccessTokenPayload): Promise<LoanProgramDto> {
    const program = await this.prisma.loanProgram.findUnique({ where: { slug } });
    if (program === null || (!program.published && !isStaff(payload))) {
      throw new NotFoundException('loan program not found');
    }
    return toDto(program);
  }

  async create(dto: CreateLoanProgramDto): Promise<LoanProgramDto> {
    const existing = await this.prisma.loanProgram.findUnique({ where: { slug: dto.slug } });
    if (existing !== null) {
      throw new ConflictException('slug already exists');
    }
    const program = await this.prisma.loanProgram.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        sortOrder: dto.sortOrder ?? 0,
        published: dto.published ?? false,
      },
    });
    return toDto(program);
  }

  async update(id: string, dto: UpdateLoanProgramDto): Promise<LoanProgramDto> {
    const existing = await this.prisma.loanProgram.findUnique({ where: { id } });
    if (existing === null) {
      throw new NotFoundException('loan program not found');
    }
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const clash = await this.prisma.loanProgram.findUnique({ where: { slug: dto.slug } });
      if (clash !== null) {
        throw new ConflictException('slug already exists');
      }
    }
    const program = await this.prisma.loanProgram.update({ where: { id }, data: dto });
    return toDto(program);
  }
}
