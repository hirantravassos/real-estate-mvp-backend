import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities';
import { CustomerRepository } from './repositories';
import { ManageCustomerUseCase } from './use-cases';
import { CustomerController } from './controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [CustomerController],
  providers: [CustomerRepository, ManageCustomerUseCase],
  exports: [CustomerRepository],
})
export class CustomerModule {}
