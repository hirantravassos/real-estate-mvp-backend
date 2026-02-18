import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerHistoryEntry } from './entities';
import { CustomerHistoryRepository } from './repositories';
import { RecordHistoryUseCase, ListHistoryUseCase } from './use-cases';
import { CustomerHistoryController } from './controllers';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerHistoryEntry])],
  controllers: [CustomerHistoryController],
  providers: [
    CustomerHistoryRepository,
    RecordHistoryUseCase,
    ListHistoryUseCase,
  ],
  exports: [RecordHistoryUseCase],
})
export class CustomerHistoryModule {}
