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

import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../users/schemas/user.schema';

import { SymbolsService } from './symbols.service';

import { CreateSymbolDto } from './dto/create-symbol.dto';
import { UpdateSymbolDto } from './dto/update-symbol.dto';
import { UpdateSymbolStatusDto } from './dto/update-symbol-status.dto';
import { BulkCreateSymbolDto } from './dto/bulk-create-symbol.dto';

@Controller('symbols')
export class SymbolsController {
  constructor(private readonly service: SymbolsService) {}

  // =========================================================
  // CREATE
  // POST /symbols
  // =========================================================
  @Roles(UserRole.PROVIDER)
  @Post()
  create(@Body() dto: CreateSymbolDto) {
    return this.service.create(dto);
  }

  // =========================================================
  // BULK CREATE
  // POST /symbols/bulk
  // =========================================================
  @Roles(UserRole.PROVIDER)
  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateSymbolDto) {
    return this.service.bulkCreate(dto);
  }

  // =========================================================
  // LIST ALL
  // GET /symbols
  // =========================================================
  @Roles(UserRole.PROVIDER, UserRole.CLIENT)
  @Get()
  findAll(@Query('companyProviderId') companyProviderId?: string) {
    return this.service.findAll(companyProviderId);
  }

  // =========================================================
  // LIST ACTIVE
  // GET /symbols/active
  // =========================================================
  @Roles(UserRole.PROVIDER, UserRole.CLIENT)
  @Get('active')
  findActive(@Query('companyProviderId') companyProviderId?: string) {
    return this.service.findActive(companyProviderId);
  }

  // =========================================================
  // FIND BY SYMBOL
  // GET /symbols/by-symbol/:companyProviderId/:symbol
  // =========================================================
  @Roles(UserRole.PROVIDER, UserRole.CLIENT)
  @Get('by-symbol/:companyProviderId/:symbol')
  findOneBySymbol(
    @Param('companyProviderId') companyProviderId: string,
    @Param('symbol') symbol: string,
  ) {
    return this.service.findOneBySymbol(companyProviderId, symbol);
  }

  // =========================================================
  // UPDATE
  // PATCH /symbols/:id
  // =========================================================
  @Roles(UserRole.PROVIDER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSymbolDto) {
    return this.service.update(id, dto);
  }

  // =========================================================
  // UPDATE STATUS
  // PATCH /symbols/:id/status
  // =========================================================
  @Roles(UserRole.PROVIDER)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSymbolStatusDto) {
    return this.service.updateStatus(id, dto.isActive);
  }

  // =========================================================
  // DELETE
  // DELETE /symbols/:id
  // =========================================================
  @Roles(UserRole.PROVIDER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
