import { CustomerMapper } from './customer.mapper';
import { Customer } from '../entities';
import { CreateCustomerDto, UpdateCustomerDto } from '../dtos';

describe('CustomerMapper', () => {
    const userId = 'user-123';

    it('should map CreateCustomerDto to partial entity', () => {
        const dto: CreateCustomerDto = {
            name: 'John Doe',
            phone: '11999999999',
            comments: 'Some comments',
            budget: 1000,
            kanbanSectionId: 'section-1',
        };

        const partial = CustomerMapper.toEntity(userId, dto);

        expect(partial).toEqual({
            userId,
            name: dto.name,
            phone: dto.phone,
            comments: dto.comments,
            budget: dto.budget,
            kanbanSectionId: dto.kanbanSectionId,
        });
    });

    it('should update entity from UpdateCustomerDto', () => {
        const customer = new Customer();
        customer.name = 'Old Name';
        customer.phone = 'old phone';
        customer.comments = 'old comments';
        customer.budget = 500;
        customer.kanbanSectionId = 'old-section';

        const dto: UpdateCustomerDto = {
            name: 'New Name',
            phone: 'new phone',
            comments: 'new comments',
            budget: 2000,
            kanbanSectionId: 'new-section',
        };

        const updated = CustomerMapper.updateEntity(customer, dto);

        expect(updated.name).toBe(dto.name);
        expect(updated.phone).toBe(dto.phone);
        expect(updated.comments).toBe(dto.comments);
        expect(updated.budget).toBe(dto.budget);
        expect(updated.kanbanSectionId).toBe(dto.kanbanSectionId);
    });

    it('should map entity to ResponseDto', () => {
        const customer = new Customer();
        Object.assign(customer, {
            id: 'cust-123',
            name: 'John Doe',
            phone: '11999999999',
            comments: 'Some comments',
            budget: 1500.50,
            kanbanSectionId: 'section-1',
            kanbanOrder: 5,
            createdAt: new Date('2024-01-01T10:00:00Z'),
        });

        const dto = CustomerMapper.toResponseDto(customer);

        expect(dto).toEqual({
            id: 'cust-123',
            name: 'John Doe',
            phone: '11999999999',
            comments: 'Some comments',
            budget: 1500.50,
            kanbanSectionId: 'section-1',
            kanbanOrder: 5,
            createdAt: '2024-01-01T10:00:00.000Z',
        });
    });
});
