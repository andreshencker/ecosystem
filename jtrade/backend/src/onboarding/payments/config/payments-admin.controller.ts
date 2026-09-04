import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { ApplicationRole } from '../../../core/auth/types/auth-context';
import {
  AddMethodDto,
  UpsertMethodConfigDto,
} from './dto/payments-admin.dto';
import { PaymentsAdminService } from './payments-admin.service';

/** jtrade admin only. Curates which payment methods jtrade offers + their settings. */
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(private readonly service: PaymentsAdminService) {}

  @Roles(ApplicationRole.ADMIN)
  @Get('methods')
  listConfigured() {
    return this.service.listConfigured();
  }

  @Roles(ApplicationRole.ADMIN)
  @Get('catalog')
  listAvailable() {
    return this.service.listAvailable();
  }

  @Roles(ApplicationRole.ADMIN)
  @Get('providers')
  listProviderPayments() {
    return this.service.listProviderPayments();
  }

  @Roles(ApplicationRole.ADMIN)
  @Post('methods')
  add(@Body() dto: AddMethodDto) {
    return this.service.add(dto.method);
  }

  @Roles(ApplicationRole.ADMIN)
  @Put('methods/:method')
  update(@Param('method') method: string, @Body() dto: UpsertMethodConfigDto) {
    return this.service.update(method, dto);
  }

  @Roles(ApplicationRole.ADMIN)
  @Delete('methods/:method')
  remove(@Param('method') method: string) {
    return this.service.remove(method);
  }
}
