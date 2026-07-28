export class InvalidCursorError extends Error {
  constructor(message = 'invalid cursor') {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

export interface CursorPayload {
  v: string | number;
  id: number;
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): CursorPayload {
  let json: string;
  try {
    json = Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    throw new InvalidCursorError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidCursorError();
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('v' in parsed) ||
    !('id' in parsed) ||
    typeof (parsed as any).id !== 'number' ||
    (typeof (parsed as any).v !== 'string' && typeof (parsed as any).v !== 'number')
  ) {
    throw new InvalidCursorError();
  }
  return parsed as CursorPayload;
}
