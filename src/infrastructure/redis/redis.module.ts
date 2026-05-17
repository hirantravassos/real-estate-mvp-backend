import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        REDIS_HOST: Joi.string(),
        REDIS_PORT: Joi.number(),
        REDIS_USERNAME: Joi.string(),
        REDIS_PASSWORD: Joi.string(),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>("REDIS_HOST"),
          port: configService.getOrThrow<number>("REDIS_PORT"),
          username: configService.getOrThrow<string>("REDIS_USERNAME"),
          password: configService.getOrThrow<string | undefined>(
            "REDIS_PASSWORD",
          ),
        },
      }),
    }),
  ],
})
export class RedisModule {}
