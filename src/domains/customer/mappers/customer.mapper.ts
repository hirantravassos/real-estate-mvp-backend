import { Customer } from '../entities';
import {
  CreateCustomerDto,
  CustomerResponseDto,
  UpdateCustomerDto,
} from '../dtos';

export class CustomerMapper {
  static toEntity(userId: string, dto: CreateCustomerDto): Partial<Customer> {
    return {
      userId,
      name: dto.name,
      phone: dto.phone,
      comments: dto.comments || null,
      minBudget: dto.minBudget ?? null,
      maxBudget: dto.maxBudget ?? null,
      kanbanSectionId: dto.kanbanSectionId,
    };
  }

  static updateEntity(customer: Customer, dto: UpdateCustomerDto): Customer {
    customer.name = dto.name ?? customer.name;
    customer.phone = dto.phone ?? customer.phone;
    customer.comments = dto.comments ?? customer.comments;
    customer.minBudget = dto.minBudget ?? customer.minBudget;
    customer.maxBudget = dto.maxBudget ?? customer.maxBudget;

    if (
      dto.kanbanSectionId &&
      customer.kanbanSectionId !== dto.kanbanSectionId
    ) {
      customer.kanbanSectionId = dto.kanbanSectionId;
      // @ts-expect-error - Clear relation to force FK update
      customer.kanbanSection = null;
    }

    return customer;
  }

  static toResponseDto(customer: Customer): CustomerResponseDto {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      comments: customer.comments,
      minBudget: customer.minBudget ? Number(customer.minBudget) : null,
      maxBudget: customer.maxBudget ? Number(customer.maxBudget) : null,
      category: customer.kanbanSection
        ? {
          id: customer.kanbanSection.id,
          userId: customer.kanbanSection.userId,
          name: customer.kanbanSection.name,
          displayOrder: customer.kanbanSection.displayOrder,
          color: customer.kanbanSection.color,
        }
        : null,
      createdAt: customer.createdAt.toISOString(),
    };
  }
}
