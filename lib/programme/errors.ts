export class ProgrammeError extends Error { constructor(message: string, public readonly status = 400) { super(message); } }
