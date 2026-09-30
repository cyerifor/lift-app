export class ExerciseLibraryError extends Error {
  readonly code: "NOT_FOUND" | "DUPLICATE_NAME" | "FORBIDDEN" | "INVALID_SEED" | "INVALID_INPUT";

  constructor(message: string, code: "NOT_FOUND" | "DUPLICATE_NAME" | "FORBIDDEN" | "INVALID_SEED" | "INVALID_INPUT") {
    super(message);
    this.code = code;
  }
}
