import { Module } from "@nestjs/common";
import { GooglePeopleService } from "./services/google-people.service";

@Module({
  providers: [GooglePeopleService],
  exports: [GooglePeopleService],
})
export class GoogleModule {}
