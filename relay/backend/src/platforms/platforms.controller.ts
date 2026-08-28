import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../infrastructure/security/decorators/public.decorator';
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

@ApiTags('Platforms')
@Controller('platforms')
export class PlatformsController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: PlatformsService,
  ) {}

  @Public()
  @Get()
  @HttpCode(200)
  async list(@Query('active') active?: string) {
    return this.service.findAll({ active: this.toBool(active) });
  }

  @Public()
  @Get(':id')
  @HttpCode(200)
  async getById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @HttpCode(201)
  async create(@Headers('x-api-key') apiKey: string, @Body() dto: CreatePlatformDto) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.remove(id);
  }

  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('RELAY_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
