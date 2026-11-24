export const MAX_DESIGN_DOC_LENGTH = 100_000;

export function isValidDesignDoc(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_DESIGN_DOC_LENGTH;
}
