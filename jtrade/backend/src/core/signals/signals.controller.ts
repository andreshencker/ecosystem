import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CreateMetatraderSignalDto } from './dto/create-metatrader-signal.dto';
import { SignalsService } from './services/signals.service';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { GetSignalInformationDto } from './dto/get-signal-information.dto';
import { ClientSignalListQueryDto } from './dto/client-signal-list-query.dto';
import { AdminSignalListQueryDto } from './dto/admin-signal-list-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('/signals')
export class SignalsController {
  constructor(private readonly service: SignalsService) {}

  // Webhook TradingView (sin JWT)
  @Post('mt5')
  async createMt5Signal(@Body() dto: CreateMetatraderSignalDto) {
    const saved = await this.service.createMt5Signal(dto);
    // para webhook response no necesitas mucha data; devolvemos ok básico
    return {
      ok: true,
      id: String((saved as any)?._id),
      createdAt: (saved as any)?.createdAt,
    };
  }

  @Roles(UserRole.CLIENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('client/mine')
  async clientSignals(@Query() q: ClientSignalListQueryDto) {
    return this.service.getClientSignals(q);
  }

  @Post('mt5/getSignalInformation')
  async getMt5SignalInformation(@Body() q: GetSignalInformationDto) {
    return this.service.getMt5SignalInformation(q);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/history')
  async adminHistory(@Query() q: AdminSignalListQueryDto) {
    return this.service.getAdminSignals(q);
  }
}
