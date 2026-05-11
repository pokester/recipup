export function sanitisePromptText(value: string, maxLength: number): string {
  return value.slice(0, maxLength).replace(/[<>{}]/g, "").trim();
}

export function sanitisePromptPayload(value: unknown, maxStringLength = 1000, depth = 0): unknown {
  if (depth > 6) return null;
  if (typeof value === "string") return sanitisePromptText(value, maxStringLength);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitisePromptPayload(item, maxStringLength, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, item]) => [
          sanitisePromptText(key, 80),
          sanitisePromptPayload(item, maxStringLength, depth + 1),
        ]),
    );
  }
  return null;
}
