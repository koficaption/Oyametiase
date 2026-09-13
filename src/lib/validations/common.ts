import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+0-9()\-\s]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .optional()
  .or(z.literal(""));

export const requiredName = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(80);

export const moneySchema = z.coerce
  .number()
  .positive("Amount must be greater than zero")
  .max(10_000_000, "Amount is too large");

export const uuidSchema = z.string().uuid("Invalid record");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  q: z.string().trim().max(120).optional(),
});

export type ActionResult<T = unknown> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

export function fail(message: string, fieldErrors?: Record<string, string[]>): ActionResult {
  return { ok: false, message, fieldErrors };
}

export function ok<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function zodError(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fail("Please correct the highlighted fields.", fieldErrors);
}
