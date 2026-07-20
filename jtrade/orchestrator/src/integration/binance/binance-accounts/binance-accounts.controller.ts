// src/integrations/binance/binance-accounts/binance-accounts.controller.ts
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
import { BinanceAccountsService } from './binance-accounts.service';
import { CreateBinanceAccountDto } from './dto/create-binance-account.dto';
import { UpdateBinanceAccountDto } from './dto/update-binance-account.dto';

@Controller('binance/binance-accounts')
export class BinanceAccountsController {
  constructor(private readonly service: BinanceAccountsService) {}

  @Get()
  listAll(@Query('platformId') platformId?: string) {
    return this.service.listAll(platformId);
  }

  @Post()
  create(@Body() dto: CreateBinanceAccountDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id/default')
  setDefault(@Param('id') id: string) {
    return this.service.update(id, { isDefault: true });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBinanceAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
