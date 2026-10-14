import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./services/user.service";
import { UserProfileImageService } from "./services/user-profile-image.service";
import { UserController } from "./controllers/user.controller";
import { ProfileImageController } from "./controllers/profile-image.controller";
import { User } from "./entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  controllers: [UserController, ProfileImageController],
  providers: [UserRepository, UserService, UserProfileImageService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
