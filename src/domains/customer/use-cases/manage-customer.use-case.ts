import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerRepository } from '../repositories';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  MoveCustomerStageDto,
  CustomerResponseDto,
} from '../dtos';
import { Customer } from '../entities';
import { CustomerMapper } from '../mappers';
import { RecordHistoryUseCase } from '../../customer-history/use-cases';
import { CustomerActionType } from '../../customer-history/entities';

@Injectable()
export class ManageCustomerUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly recordHistory: RecordHistoryUseCase,
  ) { }

  async listCustomers(userId: string): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.findAllByUserId(userId);
    return customers.map(CustomerMapper.toResponseDto);
  }

  async getCustomer(
    userId: string,
    customerId: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.findOwnedCustomer(userId, customerId);
    return CustomerMapper.toResponseDto(customer);
  }

  async createCustomer(
    userId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const orderInSection = await this.customerRepository.countBySectionId(
      dto.kanbanSectionId,
      userId,
    );

    const customer = await this.customerRepository.create({
      ...CustomerMapper.toEntity(userId, dto),
      kanbanOrder: orderInSection,
    });

    const reloaded = await this.findOwnedCustomer(userId, customer.id);

    await this.recordHistory.execute(
      customer.id,
      CustomerActionType.CUSTOMER_CREATED,
      `Cliente criado na etapa: ${dto.kanbanSectionId}`,
    );

    return CustomerMapper.toResponseDto(reloaded);
  }

  async updateCustomer(
    userId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.findOwnedCustomer(userId, customerId);
    const updated = CustomerMapper.updateEntity(customer, dto);
    const saved = await this.customerRepository.save(updated);
    const reloaded = await this.findOwnedCustomer(userId, saved.id);

    if (dto.minBudget !== undefined || dto.maxBudget !== undefined) {
      await this.recordHistory.execute(
        customerId,
        CustomerActionType.BUDGET_UPDATED,
        `Orçamento atualizado: ${dto.minBudget ?? '—'} a ${dto.maxBudget ?? '—'}`,
      );
    }

    return CustomerMapper.toResponseDto(reloaded);
  }

  async moveCustomerStage(
    userId: string,
    customerId: string,
    dto: MoveCustomerStageDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.findOwnedCustomer(userId, customerId);

    customer.kanbanSectionId = dto.targetSectionId;
    customer.kanbanOrder = dto.targetOrder;
    // @ts-expect-error - Clear relation to force FK update
    customer.kanbanSection = null;

    const saved = await this.customerRepository.save(customer);
    const reloaded = await this.findOwnedCustomer(userId, saved.id);

    await this.recordHistory.execute(
      customerId,
      CustomerActionType.STAGE_CHANGED,
      `Etapa alterada`,
      { targetSectionId: dto.targetSectionId },
    );

    return CustomerMapper.toResponseDto(reloaded);
  }

  async deleteCustomer(userId: string, customerId: string): Promise<void> {
    const customer = await this.findOwnedCustomer(userId, customerId);
    await this.customerRepository.remove(customer);
  }

  private async findOwnedCustomer(
    userId: string,
    customerId: string,
  ): Promise<Customer> {
    const customer = await this.customerRepository.findByIdAndUserId(
      customerId,
      userId,
    );

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return customer;
  }
}
