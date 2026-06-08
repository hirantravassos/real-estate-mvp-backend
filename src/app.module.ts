import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MailModule } from "./infrastructure/mail/mail.module.js";
import { UserModule } from "./domains/users/user.module";
import { AuthModule } from "./domains/auth/auth.module";
import { CustomerModule } from "./domains/customers/customer.module";
import { KanbanModule } from "./domains/kanbans/kanban.module";
import { PropertyModule } from "./domains/properties/property.module";
import { BucketModule } from "./infrastructure/bucket/bucket.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { DatabaseModule } from "./infrastructure/database/database.module";
import Joi from "joi";
import { PlanModule } from "./domains/plans/plan.module";

// const THROTTLE_TTL_MS = 60_000;
// const THROTTLE_LIMIT = 30;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        APP_PORT: Joi.number(),
        APP_CORS_ORIGIN: Joi.string(),
      }),
    }),
    DatabaseModule,
    RedisModule,
    BucketModule,
    MailModule,
    UserModule,
    AuthModule,
    CustomerModule,
    KanbanModule,
    PropertyModule,
    PlanModule,
  ],
})
export class AppModule {}
