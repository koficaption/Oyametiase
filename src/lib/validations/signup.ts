import { z } from "zod";
import { CHURCH_POSITIONS, CHURCH_RESPONSIBILITIES } from "@/lib/church-directory";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username is too long")
  .regex(/^[a-zA-Z][a-zA-Z0-9._]*$/, "Start with a letter. Use letters, numbers, dots, or underscores.");

export const signupSchema = z
  .object({
    full_name: z.string().trim().min(3, "Enter your full name").max(120),
    username: usernameSchema,
    date_of_birth: z.string().min(1, "Date of birth is required"),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a phone number")
      .max(30)
      .regex(/^[+0-9()\-\s]+$/, "Enter a valid phone number"),
    whatsapp_number: z
      .string()
      .trim()
      .min(7, "Enter a WhatsApp number")
      .max(30)
      .regex(/^[+0-9()\-\s]+$/, "Enter a valid WhatsApp number"),
    church_position: z.enum(CHURCH_POSITIONS, { message: "Select your church position" }),
    church_responsibility: z.enum(CHURCH_RESPONSIBILITIES, { message: "Select your responsibility" }),
    password: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string().min(10, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  })
  .refine((value) => {
    const birth = new Date(value.date_of_birth);
    if (Number.isNaN(birth.getTime())) return false;
    const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 12 && age < 120;
  }, {
    path: ["date_of_birth"],
    message: "Enter a valid date of birth",
  });

export const loginIdentifierSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or username"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
