import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InfosimplesService } from "./services/infosimples.service";

@Module({
  imports: [ConfigModule],
  providers: [InfosimplesService],
  exports: [InfosimplesService],
})
export class InfosimplesModule {}
