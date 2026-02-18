import { Customer } from '../entities';
import {
    CreateCustomerDto,
    UpdateCustomerDto,
    CustomerResponseDto,
} from '../dtos';

export class CustomerMapper {
    static toEntity(userId: string, dto: CreateCustomerDto): Partial<Customer> {
        return {
            userId,
            name: dto.name,
            phone: dto.phone,
            comments: dto.comments || null,
            budget: dto.budget ?? null,
            kanbanSectionId: dto.kanbanSectionId,
        };
    }

    static updateEntity(customer: Customer, dto: UpdateCustomerDto): Customer {
        customer.name = dto.name ?? customer.name;
        customer.phone = dto.phone ?? customer.phone;
        customer.comments = dto.comments ?? customer.comments;
        customer.budget = dto.budget ?? customer.budget;
        customer.kanbanSectionId = dto.kanbanSectionId ?? customer.kanbanSectionId;
        return customer;
    }

    static toResponseDto(customer: Customer): CustomerResponseDto {
        return {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            comments: customer.comments,
            budget: customer.budget ? Number(customer.budget) : null,
            kanbanSectionId: customer.kanbanSectionId,
            kanbanOrder: customer.kanbanOrder,
            createdAt: customer.createdAt.toISOString(),
        };
    }
}
