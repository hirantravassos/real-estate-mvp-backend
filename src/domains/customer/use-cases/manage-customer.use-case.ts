import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerRepository } from '../repositories';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  MoveCustomerStageDto,
  CustomerResponseDto,
} from '../dtos';
import { Customer } from '../entities';
import { CustomerMapper } from '../mappers';

@Injectable()
export class ManageCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) { }

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

    return CustomerMapper.toResponseDto(customer);
  }

  async updateCustomer(
    userId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.findOwnedCustomer(userId, customerId);
    const updated = CustomerMapper.updateEntity(customer, dto);
    const saved = await this.customerRepository.save(updated);
    return CustomerMapper.toResponseDto(saved);
  }

  async moveCustomerStage(
    userId: string,
    customerId: string,
    dto: MoveCustomerStageDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.findOwnedCustomer(userId, customerId);

    customer.kanbanSectionId = dto.targetSectionId;
    customer.kanbanOrder = dto.targetOrder;

    const saved = await this.customerRepository.save(customer);
    return CustomerMapper.toResponseDto(saved);
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
