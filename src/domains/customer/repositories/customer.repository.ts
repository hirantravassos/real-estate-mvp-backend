import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectRepository(Customer)
    private readonly repository: Repository<Customer>,
  ) { }

  async findAllByUserId(userId: string): Promise<Customer[]> {
    return this.repository.find({
      where: { userId },
      order: { kanbanOrder: 'ASC' },
      relations: ['kanbanSection'],
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Customer | null> {
    return this.repository.findOne({
      where: { id, userId },
      relations: ['kanbanSection'],
    });
  }

  async findAllBySectionId(
    sectionId: string,
    userId: string,
  ): Promise<Customer[]> {
    return this.repository.find({
      where: { kanbanSectionId: sectionId, userId },
      order: { kanbanOrder: 'ASC' },
      relations: ['kanbanSection'],
    });
  }

  async create(partial: Partial<Customer>): Promise<Customer> {
    const customer = this.repository.create(partial);
    return this.repository.save(customer);
  }

  async save(customer: Customer): Promise<Customer> {
    return this.repository.save(customer);
  }

  async saveMany(customers: Customer[]): Promise<Customer[]> {
    return this.repository.save(customers);
  }

  async remove(customer: Customer): Promise<void> {
    await this.repository.remove(customer);
  }

  async countBySectionId(sectionId: string, userId: string): Promise<number> {
    return this.repository.count({
      where: { kanbanSectionId: sectionId, userId },
    });
  }
}
