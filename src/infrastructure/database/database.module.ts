import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_HOST: Joi.string(),
        DATABASE_PORT: Joi.number(),
        DATABASE_USERNAME: Joi.string(),
        DATABASE_PASSWORD: Joi.string(),
        DATABASE_NAME: Joi.string(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.getOrThrow<string>("DATABASE_HOST"),
        port: configService.getOrThrow<number>("DATABASE_PORT"),
        username: configService.getOrThrow<string>("DATABASE_USERNAME"),
        password: configService.getOrThrow<string>("DATABASE_PASSWORD"),
        database: configService.getOrThrow<string>("DATABASE_NAME"),
        namingStrategy: new SnakeNamingStrategy(),
        autoLoadEntities: true,
        synchronize: true,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
