/** Pull a human-readable message out of an HttpClient / unknown error. */
export function errorMessage(e: unknown, fallback = 'Request failed'): string {
  const err = e as { error?: { message?: string }; message?: string };
  return err?.error?.message ?? err?.message ?? fallback;
}
