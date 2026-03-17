import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

interface ExceptionResponseBody {
  readonly statusCode: number;
  readonly message: string | string[] | object;
  readonly error: string;
  readonly timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] | object = "Erro interno do servidor";

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message =
        typeof exceptionResponse === "object" && exceptionResponse !== null
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (exceptionResponse as any).message || exception.message
          : exception.message;
    }

    const stackTrace =
      exception instanceof Error ? exception.stack : String(exception);

    const loggingStrategies: Record<number, () => void> = {
      [HttpStatus.UNAUTHORIZED]: () => this.logger.warn("Expired token"),
      [HttpStatus.BAD_REQUEST]: () =>
        this.logger.error(
          `Bad Request: ${JSON.stringify(message)}`,
          stackTrace,
        ),
      [HttpStatus.INTERNAL_SERVER_ERROR]: () =>
        this.logger.error("Unhandled exception", stackTrace),
    };

    loggingStrategies[statusCode]?.();

    const responseBody: ExceptionResponseBody = {
      statusCode,
      message,
      error: HttpStatus[statusCode] ?? "Unknown Error",
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(responseBody);
  }
}
