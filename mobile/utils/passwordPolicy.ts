export const PASSWORD_HELP =
  "Use at least 8 characters, including uppercase, lowercase, a number and a special character.";
export function passwordRequirements(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    {
      label: "Uppercase and lowercase letters",
      met: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A special character", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}
export const isStrongPassword = (password: string) =>
  passwordRequirements(password).every((rule) => rule.met);
