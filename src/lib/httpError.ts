export interface FieldError {
  field: string;
  message: string;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: FieldError[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
