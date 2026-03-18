export function handleError(error: unknown, context: string) {
  console.error(`[${context}]`, error instanceof Error ? error.message : String(error));
}
