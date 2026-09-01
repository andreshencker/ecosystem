import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { BulkCreateSymbolDto } from './dto/bulk-create-symbol.dto';
import { CreateSymbolDto } from './dto/create-symbol.dto';
import { UpdateSymbolDto } from './dto/update-symbol.dto';
import { UpdateSymbolStatusDto } from './dto/update-symbol-status.dto';
import { SymbolsService } from './symbols.service';

type AuthRequest = Request & { user: AuthContext };

@Controller('symbols')
export class SymbolsController {
  constructor(private readonly service: SymbolsService) {}

  @Roles(ApplicationRole.PROVIDER)
  @Get()
  list(@Req() req: AuthRequest) {
    return this.service.listMine(req.user);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateSymbolDto) {
    return this.service.create(req.user, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post('bulk')
  bulkCreate(@Req() req: AuthRequest, @Body() dto: BulkCreateSymbolDto) {
    return this.service.bulkCreate(req.user, dto.symbols);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Get(':id')
  one(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.findMine(req.user, id);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateSymbolDto) {
    return this.service.update(req.user, id, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':id/status')
  setStatus(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateSymbolStatusDto) {
    return this.service.setStatus(req.user, id, dto.isActive);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }
}
