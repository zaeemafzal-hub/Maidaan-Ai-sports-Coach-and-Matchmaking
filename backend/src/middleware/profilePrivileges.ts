import type { Request, Response, NextFunction } from "express";

// Profile editors can update profile details, never account permissions or moderation.
const PRIVATE_FIELDS = [
  "role",
  "roles",
  "isAdmin",
  "is_admin",
  "isSuperuser",
  "is_superuser",
  "account_status",
  "accountStatus",
  "suspended_at",
  "suspension_reason",
];
export function rejectProfilePrivilegeChanges(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (
    PRIVATE_FIELDS.some((key) =>
      Object.prototype.hasOwnProperty.call(req.body || {}, key),
    )
  ) {
    res
      .status(403)
      .json({
        error:
          "Account permissions and moderation cannot be changed through profile editing.",
      });
    return;
  }
  next();
}
