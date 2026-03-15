import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { GlobalExceptionFilter } from "./shared/filters/global-exception.filter.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const cors = process.env.APP_CORS_ORIGIN || "http://localhost:3000"

  app.setGlobalPrefix("api");

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

bootstrap();
