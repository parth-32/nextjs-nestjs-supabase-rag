import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ApiError } from '@google/genai';
import { Logger } from 'nestjs-pino';
import { Request, Response } from 'express';

/** Pull a user-facing message and HTTP status from a Gemini / Google GenAI ApiError. */
function fromGeminiApiError(exception: ApiError): { status: number; message: string } {
  let message = 'The AI service is temporarily unavailable. Please try again later.';
  try {
    const parsed = JSON.parse(exception.message) as { error?: { message?: string } };
    if (parsed.error?.message) message = parsed.error.message;
  } catch {
    // keep default message
  }
  const status =
    exception.status >= 400 && exception.status < 600 ? exception.status : HttpStatus.BAD_GATEWAY;
  return { status, message };
}

/**
 * Converts any thrown error into a consistent JSON error envelope and makes
 * sure unexpected failures are logged with their stack trace while never
 * leaking internals to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // If the response has already started streaming (SSE), we can't send JSON.
    if (res.headersSent) {
      this.logger.error(
        { err: exception, path: req.url },
        'Exception after headers sent (likely during streaming)',
      );
      res.end();
      return;
    }

    const isHttp = exception instanceof HttpException;
    const geminiError = exception instanceof ApiError ? fromGeminiApiError(exception) : null;

    const status = isHttp
      ? exception.getStatus()
      : (geminiError?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);

    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (isHttp) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        error = (b.error as string) ?? exception.name;
      }
    } else if (geminiError) {
      message = geminiError.message;
      error =
        geminiError.status === HttpStatus.SERVICE_UNAVAILABLE ? 'ServiceUnavailable' : 'BadGateway';
    }

    if (status >= 500) {
      const logMessage = geminiError ? 'Upstream AI service error' : 'Unhandled exception';
      this.logger.error({ err: exception, path: req.url }, logMessage);
    }

    res.status(status).json({
      statusCode: status,
      error,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
