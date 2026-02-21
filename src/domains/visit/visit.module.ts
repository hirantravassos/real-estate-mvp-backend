import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visit } from './entities';
import { VisitRepository } from './repositories';
import { ManageVisitUseCase } from './use-cases';
import { VisitController } from './controllers';
import { CustomerHistoryModule } from '../customer-history/customer-history.module';

@Module({
  imports: [TypeOrmModule.forFeature([Visit]), CustomerHistoryModule],
  controllers: [VisitController],
  providers: [VisitRepository, ManageVisitUseCase],
  exports: [VisitRepository],
})
export class VisitModule {}
