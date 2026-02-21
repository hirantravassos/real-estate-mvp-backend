import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './controllers/whatsapp.controller';
import { WhatsAppGateway } from './gateways/whatsapp.gateway';
import { WhatsAppSession } from './entities/whatsapp-session.entity';
import { CustomerModule } from '../customer/customer.module';
import { KanbanModule } from '../kanban/kanban.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsAppSession]),
    CustomerModule,
    KanbanModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppGateway],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
