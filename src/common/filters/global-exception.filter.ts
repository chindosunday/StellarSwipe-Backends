import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger';
import { SentryService } from '../sentry';
import { StellarException, SorobanException } from '../exceptions';
import { ErrorClassificationService } from '../error-classification/error-classification.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly sentry: SentryService,
    private readonly errorClassifier: ErrorClassificationService,
  ) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const classification = this.errorClassifier.classify(exception);

    this.errorClassifier.logError({
      classification: classification.classification,
      code: classification.code,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      originalError: classification.originalError,
    });

    // Build error response
    const errorResponse: any = {
      statusCode: classification.httpStatus,
      code: classification.code,
      message: classification.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include details in development mode
    if (
      process.env.NODE_ENV === 'development' &&
      classification.originalError
    ) {
      errorResponse.details = {
        name: classification.originalError.name,
        retryable: classification.isRetryable,
      };
    }

    response.status(classification.httpStatus).json(errorResponse);
  }
}
