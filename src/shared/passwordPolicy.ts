export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 16;
// Existing credentials created under the previous policy can still be verified.
export const MAX_CURRENT_PASSWORD_LENGTH = 128;

export function isValidPasswordLength(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}
