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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../communication/common/pagination/pagination.util';
import { DocumentDomainCatalogueService } from './document-domain-catalogue.service';
import { CreateDocumentDomainCatalogueDto } from './dto/create-document-domain-catalogue.dto';
import { UpdateDocumentDomainCatalogueDto } from './dto/update-document-domain-catalogue.dto';

@ApiTags('Document Domain Catalogue')
@Controller('document-domain-catalogue')
export class DocumentDomainCatalogueController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: DocumentDomainCatalogueService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateDocumentDomainCatalogueDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List document domain catalogue entries' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertApiKey(apiKey);
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAll({
      companyId,
      active: this.toBool(active),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get('key/:domainKey')
  @HttpCode(200)
  async getByKey(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Param('domainKey') domainKey: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.getByCompanyAndDomainKey({ companyId, domainKey });
  }

  @Get(':id')
  @HttpCode(200)
  async getById(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.getById(id);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDomainCatalogueDto,
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
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected)
      throw new UnauthorizedException('Invalid API key');
  }

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
