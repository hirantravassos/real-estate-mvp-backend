import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MfaToken } from '../entities/mfa-token.entity';

@Injectable()
export class MfaTokenRepository {
  constructor(
    @InjectRepository(MfaToken)
    private readonly repository: Repository<MfaToken>,
  ) {}

  async findValidToken(
    userId: string,
    token: string,
  ): Promise<MfaToken | null> {
    return this.repository.findOne({
      where: {
        userId,
        token,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async create(partial: Partial<MfaToken>): Promise<MfaToken> {
    const mfaToken = this.repository.create(partial);
    return this.repository.save(mfaToken);
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.repository.update(tokenId, { isUsed: true });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.repository.update({ userId, isUsed: false }, { isUsed: true });
  }
}
