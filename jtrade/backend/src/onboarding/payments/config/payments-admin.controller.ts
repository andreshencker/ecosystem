import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { ApplicationRole } from '../../../core/auth/types/auth-context';
import { UpsertMethodConfigDto } from './dto/payments-admin.dto';
import { PaymentsAdminService } from './payments-admin.service';

/** jtrade admin only. Curates which payment methods jtrade offers + their settings. */
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(private readonly service: PaymentsAdminService) {}

  @Roles(ApplicationRole.ADMIN)
  @Get('methods')
  list() {
    return this.service.list();
  }

  @Roles(ApplicationRole.ADMIN)
  @Put('methods/:method')
  upsert(@Param('method') method: string, @Body() dto: UpsertMethodConfigDto) {
    return this.service.upsert(method, dto);
  }
}
