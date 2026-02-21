import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities';
import { CustomerRepository } from './repositories';
import {
  ManageCustomerUseCase,
  SyncWhatsAppContactsUseCase,
} from './use-cases';
import { CustomerController } from './controllers';
import { CustomerHistoryModule } from '../customer-history/customer-history.module';
import { KanbanModule } from '../kanban/kanban.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    CustomerHistoryModule,
    KanbanModule,
  ],
  controllers: [CustomerController],
  providers: [
    CustomerRepository,
    ManageCustomerUseCase,
    SyncWhatsAppContactsUseCase,
  ],
  exports: [CustomerRepository, SyncWhatsAppContactsUseCase],
})
export class CustomerModule {}
