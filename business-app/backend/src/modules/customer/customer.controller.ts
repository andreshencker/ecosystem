import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { toCustomerResponse } from './dto/customer-response.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private resolveCompanyId(ctx: AuthContext): string {
    if (!ctx.companyId)
      throw new ForbiddenException('No company assigned to this account');
    return ctx.companyId;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new customer' })
  async create(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateCustomerDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const doc = await this.customers.create(companyId, dto);
    return toCustomerResponse(doc);
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List customers for the authenticated company' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async findAll(
    @CurrentUser() ctx: AuthContext,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const parsedActive = active === undefined ? undefined : active === 'true';

    const result = await this.customers.findAll(companyId, {
      page: parsedPage,
      limit: parsedLimit,
      search,
      active: parsedActive,
    });

    return {
      items: result.items.map(toCustomerResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const companyId = this.resolveCompanyId(ctx);
    const doc = await this.customers.findByIdOrThrow(id, companyId);
    return toCustomerResponse(doc);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const doc = await this.customers.update(id, companyId, dto);
    return toCustomerResponse(doc);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deactivate a customer' })
  async deactivate(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const companyId = this.resolveCompanyId(ctx);
    const doc = await this.customers.deactivate(id, companyId);
    return toCustomerResponse(doc);
  }

  @Post(':id/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reactivate a deactivated customer' })
  async activate(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const companyId = this.resolveCompanyId(ctx);
    const doc = await this.customers.activate(id, companyId);
    return toCustomerResponse(doc);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a customer' })
  async deleteCustomer(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const companyId = this.resolveCompanyId(ctx);
    await this.customers.delete(id, companyId);
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  @Get(':id/contacts')
  @HttpCode(200)
  @ApiOperation({ summary: 'List contacts for a customer' })
  async getContacts(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const companyId = this.resolveCompanyId(ctx);
    const contacts = await this.customers.getContacts(id, companyId);
    return {
      items: contacts.map((c: any) => ({
        id: String(c._id),
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        role: c.role,
      })),
    };
  }

  @Post(':id/contacts')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a contact to a customer' })
  async addContact(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const contact = await this.customers.addContact(id, companyId, dto);
    return {
      id: String(contact._id),
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
    };
  }

  @Patch(':id/contacts/:contactId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a contact' })
  async updateContact(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const contact = await this.customers.updateContact(
      id,
      companyId,
      contactId,
      dto,
    );
    return {
      id: String(contact._id),
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
    };
  }

  @Delete(':id/contacts/:contactId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a contact from a customer' })
  async removeContact(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    await this.customers.removeContact(id, companyId, contactId);
    return { deleted: true };
  }
}
