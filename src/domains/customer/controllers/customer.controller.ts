import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import * as SharedDecorators from '../../../shared/decorators/current-user.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ManageCustomerUseCase } from '../use-cases';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  MoveCustomerStageDto,
  CustomerResponseDto,
} from '../dtos';

@Controller('customers')
export class CustomerController {
  constructor(private readonly manageCustomer: ManageCustomerUseCase) { }

  @Get()
  async list(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
  ): Promise<CustomerResponseDto[]> {
    return this.manageCustomer.listCustomers(user.userId);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') customerId: string,
  ): Promise<CustomerResponseDto> {
    return this.manageCustomer.getCustomer(user.userId, customerId);
  }

  @Post()
  async create(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.manageCustomer.createCustomer(user.userId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.manageCustomer.updateCustomer(user.userId, customerId, dto);
  }

  @Patch(':id/move')
  async moveStage(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') customerId: string,
    @Body() dto: MoveCustomerStageDto,
  ): Promise<CustomerResponseDto> {
    return this.manageCustomer.moveCustomerStage(user.userId, customerId, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') customerId: string,
  ): Promise<void> {
    return this.manageCustomer.deleteCustomer(user.userId, customerId);
  }
}
