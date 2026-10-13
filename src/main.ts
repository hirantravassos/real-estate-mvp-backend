import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { GlobalExceptionFilter } from "./shared/filters/global-exception.filter.js";
import { assertDataEncryptionSecret } from "./shared/utils/data-cipher.util.js";
import type { Request, Response, NextFunction } from "express";

async function bootstrap(): Promise<void> {
  // CPFs are sealed with it: without the secret nothing may start.
  assertDataEncryptionSecret();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind the hosting proxy, so request.ip and the throttler read the real
  // client address from the platform hop instead of a spoofable header.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // WhatsApp webhooks carry message thumbnails, bigger than the 100 KB default.
  app.useBodyParser("json", { limit: "10mb" });

  const cors = process.env.APP_CORS_ORIGIN || "http://localhost:3000";

  app.enableCors({
    origin: cors,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = parseInt(process.env.APP_PORT || "3001", 10);
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
  console.log(`🚀 Cors allowed for: ${cors}`);
}

void bootstrap();
