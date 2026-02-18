import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.repository.exists({ where: { email } });
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async create(partial: Partial<User>): Promise<User> {
    const user = this.repository.create(partial);
    return this.repository.save(user);
  }

  async updateMfaEnabled(userId: string, isEnabled: boolean): Promise<void> {
    await this.repository.update(userId, { isMfaEnabled: isEnabled });
  }
}
