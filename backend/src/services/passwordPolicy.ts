// Match the client hints and configure the same rule in Supabase Auth.
export const PASSWORD_HELP =
  "Use at least 8 characters, including uppercase, lowercase, a number and a special character.";
export const isStrongPassword = (password: unknown): password is string =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9\s]/.test(password);
