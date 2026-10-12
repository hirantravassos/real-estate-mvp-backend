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
  /** Machine readable reason, like subscription_inactive or plan_limit_reached. */
  readonly code?: string;
  readonly details?: Record<string, unknown>;
}

/** Fields of an exception body passed to the client besides the message. */
const DETAIL_FIELDS = ["resource", "limit", "used", "required", "balance"];

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] | object = "Erro interno do servidor";
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message =
        typeof exceptionResponse === "object" && exceptionResponse !== null
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (exceptionResponse as any).message || exception.message
          : exception.message;

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        if (typeof body.code === "string") code = body.code;
        const detailEntries = DETAIL_FIELDS.filter(
          (field) => body[field] !== undefined,
        ).map((field): [string, unknown] => [field, body[field]]);
        if (detailEntries.length) details = Object.fromEntries(detailEntries);
      }
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
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    };

    response.status(statusCode).json(responseBody);
  }
}
