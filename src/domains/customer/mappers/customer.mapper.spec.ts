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
      minBudget: 1000,
      maxBudget: null as any, // Not providing max to test partial
      kanbanSectionId: 'section-1',
    };

    const partial = CustomerMapper.toEntity(userId, dto);

    expect(partial).toEqual({
      userId,
      name: dto.name,
      phone: dto.phone,
      comments: dto.comments,
      minBudget: dto.minBudget,
      maxBudget: dto.maxBudget,
      kanbanSectionId: dto.kanbanSectionId,
    });
  });

  it('should update entity from UpdateCustomerDto', () => {
    const customer = new Customer();
    customer.name = 'Old Name';
    customer.phone = 'old phone';
    customer.comments = 'old comments';
    customer.minBudget = 500;
    customer.maxBudget = 1000;
    customer.kanbanSectionId = 'old-section';

    const dto: UpdateCustomerDto = {
      name: 'New Name',
      phone: 'new phone',
      comments: 'new comments',
      minBudget: 2000,
      maxBudget: 3000,
      kanbanSectionId: 'new-section',
    };

    const updated = CustomerMapper.updateEntity(customer, dto);

    expect(updated.name).toBe(dto.name);
    expect(updated.phone).toBe(dto.phone);
    expect(updated.comments).toBe(dto.comments);
    expect(updated.minBudget).toBe(dto.minBudget);
    expect(updated.maxBudget).toBe(dto.maxBudget);
    expect(updated.kanbanSectionId).toBe(dto.kanbanSectionId);
  });

  it('should map entity to ResponseDto', () => {
    const customer = new Customer();
    Object.assign(customer, {
      id: 'cust-123',
      name: 'John Doe',
      phone: '11999999999',
      comments: 'Some comments',
      minBudget: 1500.5,
      maxBudget: 3000.0,
      kanbanSectionId: 'section-1',
      kanbanSection: {
        id: 'section-1',
        userId: 'user-1',
        name: 'Section',
        displayOrder: 1,
        color: '#fff',
      },
      kanbanOrder: 5,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    });

    const dto = CustomerMapper.toResponseDto(customer);

    expect(dto).toEqual({
      id: 'cust-123',
      name: 'John Doe',
      phone: '11999999999',
      comments: 'Some comments',
      minBudget: 1500.5,
      maxBudget: 3000.0,
      category: {
        id: 'section-1',
        userId: 'user-1',
        name: 'Section',
        displayOrder: 1,
        color: '#fff',
      },
      createdAt: '2024-01-01T10:00:00.000Z',
    });
  });
});
