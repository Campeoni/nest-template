import { AppError } from './app-error';
import { ErrorCodes } from './error-codes';

describe('AppError', () => {
  it('creates error with code and message', () => {
    const error = new AppError(
      ErrorCodes.HTTP_TIMEOUT,
      'Request timed out',
      504,
    );

    expect(error.code).toBe('HTTP_003');
    expect(error.message).toBe('Request timed out');
    expect(error.statusCode).toBe(504);
    expect(error.name).toBe('AppError');
    expect(error.timestamp).toBeDefined();
  });

  it('includes optional details', () => {
    const details = { url: 'https://api.example.com/resource' };
    const error = new AppError(
      ErrorCodes.HTTP_TIMEOUT,
      'Timed out',
      504,
      details,
    );

    expect(error.details).toEqual(details);
  });

  it('defaults to status 500', () => {
    const error = new AppError(ErrorCodes.AUTH_INVALID_KEY, 'Invalid key');

    expect(error.statusCode).toBe(500);
  });
});
