import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  NotificationExecutionLog,
  NotificationExecutionLogDocument,
} from './schemas/execution-log.schema';
import { CreateExecutionLogDto } from './dto/create-execution-log.dto';
import { ExecutionLogResponseDto } from './dto/execution-log-response.dto';
import { ExecutionLogMapper } from './mappers/execution-log.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';

@Injectable()
export class ExecutionLogService {
  private readonly logger = new Logger(ExecutionLogService.name);

  constructor(
    @InjectModel(NotificationExecutionLog.name)
    private readonly model: Model<NotificationExecutionLogDocument>,
  ) {}

  async create(dto: CreateExecutionLogDto): Promise<void> {
    const toId = (v?: string | null) =>
      v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null;

    await this.model.create({
      companyId: new Types.ObjectId(dto.companyId),
      domainKey: dto.domainKey,
      eventKey: dto.eventKey,
      canonicalEventKey: dto.canonicalEventKey,
      channel: dto.channel,
      layoutTemplateId: toId(dto.layoutTemplateId),
      themeId: toId(dto.themeId),
      providerId: toId(dto.providerId),
      providerCredentialsId: toId(dto.providerCredentialsId),
      renderStatus: dto.renderStatus,
      deliveryStatus: dto.deliveryStatus,
      renderedAt: dto.renderedAt ?? null,
      sentAt: dto.sentAt ?? null,
      providerMessageId: dto.providerMessageId ?? null,
      errorMessage: dto.errorMessage ?? null,
    });
  }

  async findAll(params: {
    companyId: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<ExecutionLogResponseDto>> {
    if (!Types.ObjectId.isValid(params.companyId)) {
      throw new HttpException('Invalid companyId', HttpStatus.BAD_REQUEST);
    }

    const companyId = new Types.ObjectId(params.companyId);
    const limit = Math.min(Number(params.limit ?? 50), 200);
    const offset = Math.max(0, Number(params.offset ?? 0));

    const [list, total] = await Promise.all([
      this.model
        .find({ companyId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.model.countDocuments({ companyId }),
    ]);

    return {
      data: ExecutionLogMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async getById(id: string): Promise<ExecutionLogResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
    }

    const doc = await this.model.findById(id).lean();
    if (!doc)
      throw new HttpException('Execution log not found', HttpStatus.NOT_FOUND);

    return ExecutionLogMapper.toResponse(doc);
  }
}
