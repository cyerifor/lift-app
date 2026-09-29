export class ExerciseLibraryError extends Error {
  readonly code: "NOT_FOUND" | "DUPLICATE_NAME" | "FORBIDDEN" | "INVALID_SEED";

  constructor(message: string, code: "NOT_FOUND" | "DUPLICATE_NAME" | "FORBIDDEN" | "INVALID_SEED") {
    super(message);
    this.code = code;
  }
}
