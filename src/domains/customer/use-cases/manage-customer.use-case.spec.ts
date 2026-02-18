import { Test, TestingModule } from '@nestjs/testing';
import { ManageCustomerUseCase } from './manage-customer.use-case';
import { CustomerRepository } from '../repositories';
import { NotFoundException } from '@nestjs/common';
import { Customer } from '../entities';
import { UpdateCustomerDto } from '../dtos';

describe('ManageCustomerUseCase', () => {
    let useCase: ManageCustomerUseCase;
    let repository: jest.Mocked<CustomerRepository>;

    const mockRepository = {
        findAllByUserId: jest.fn(),
        findByIdAndUserId: jest.fn(),
        countBySectionId: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ManageCustomerUseCase,
                { provide: CustomerRepository, useValue: mockRepository },
            ],
        }).compile();

        useCase = module.get<ManageCustomerUseCase>(ManageCustomerUseCase);
        repository = module.get(CustomerRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('updateCustomer', () => {
        it('should correctly update and save a customer entity', async () => {
            const userId = 'user-1';
            const customerId = 'cust-1';
            const dto: UpdateCustomerDto = {
                name: 'Updated Name',
                phone: '11999999999',
                kanbanSectionId: 'section-1',
            };

            const existingCustomer = new Customer();
            Object.assign(existingCustomer, {
                id: customerId,
                userId,
                name: 'Old Name',
                createdAt: new Date(),
            });

            repository.findByIdAndUserId.mockResolvedValue(existingCustomer);
            repository.save.mockImplementation((entity) => Promise.resolve(entity as Customer));

            const result = await useCase.updateCustomer(userId, customerId, dto);

            expect(repository.findByIdAndUserId).toHaveBeenCalledWith(customerId, userId);
            expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
                id: customerId,
                name: dto.name,
            }));
            expect(result.name).toBe(dto.name);
        });

        it('should throw NotFoundException if customer is not found', async () => {
            repository.findByIdAndUserId.mockResolvedValue(null);

            await expect(useCase.updateCustomer('u1', 'c1', {} as any))
                .rejects.toThrow(NotFoundException);
        });
    });
});
