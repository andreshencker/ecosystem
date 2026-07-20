import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { IndicatorsService } from './indicators.service';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { IndicatorMapper } from './mappers/indicator.mapper';
import { IndicatorResponseDto } from './dto/indicator-response.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly service: IndicatorsService) {}

  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Post()
  async create(@Body() dto: CreateIndicatorDto): Promise<IndicatorResponseDto> {
    const created = await this.service.create(dto);
    return IndicatorMapper.toResponse(created as any);
  }

  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.PROVIDER)
  @Get()
  async list(
    @Query('companyProviderId') companyProviderId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<IndicatorResponseDto[]> {
    const parsedIsActive =
      typeof isActive === 'string' ? isActive === 'true' : undefined;

    const docs = await this.service.list({
      companyProviderId,
      isActive:
        typeof parsedIsActive === 'boolean' ? parsedIsActive : undefined,
    });

    return IndicatorMapper.toResponseList(docs as any[]);
  }

  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Get(':id')
  async getById(@Param('id') id: string): Promise<IndicatorResponseDto> {
    const doc = await this.service.getById(id);
    return IndicatorMapper.toResponse(doc as any);
  }

  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIndicatorDto,
  ): Promise<IndicatorResponseDto> {
    const updated = await this.service.update(id, dto);
    return IndicatorMapper.toResponse(updated as any);
  }

  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.service.remove(id);
  }
}
