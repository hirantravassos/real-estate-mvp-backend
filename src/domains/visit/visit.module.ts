import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visit } from './entities';
import { VisitRepository } from './repositories';
import { ManageVisitUseCase } from './use-cases';
import { VisitController } from './controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Visit])],
  controllers: [VisitController],
  providers: [VisitRepository, ManageVisitUseCase],
  exports: [VisitRepository],
})
export class VisitModule {}
