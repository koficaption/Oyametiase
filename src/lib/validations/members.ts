import { z } from "zod";
import { emailSchema, phoneSchema, requiredName } from "@/lib/validations/common";

export const membershipStatuses = [
  "active",
  "inactive",
  "visitor",
  "new_convert",
  "transferred",
  "deceased",
  "other",
] as const;

export const memberSchema = z.object({
  first_name: requiredName,
  middle_name: z.string().trim().max(80).optional().or(z.literal("")),
  last_name: requiredName,
  gender: z.enum(["male", "female"]),
  date_of_birth: z.string().optional().or(z.literal("")),
  phone: phoneSchema,
  email: emailSchema,
  residential_address: z.string().trim().max(300).optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  marital_status: z
    .enum(["single", "married", "widowed", "divorced", "separated", "other"])
    .optional(),
  date_joined: z.string().optional().or(z.literal("")),
  membership_status: z.enum(membershipStatuses),
  baptism_status: z.enum(["baptized", "not_baptized", "unknown"]),
  baptism_date: z.string().optional().or(z.literal("")),
  primary_department_id: z.string().uuid().optional().or(z.literal("")),
  previous_assembly: z.string().trim().max(160).optional().or(z.literal("")),
  transfer_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  emergency_relationship: z.string().trim().max(80).optional().or(z.literal("")),
  emergency_phone: phoneSchema,
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const memberSelfUpdateSchema = z.object({
  phone: phoneSchema,
  email: emailSchema,
  residential_address: z.string().trim().max(300).optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  emergency_relationship: z.string().trim().max(80).optional().or(z.literal("")),
  emergency_phone: phoneSchema,
});

export const memberSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  department: z.string().uuid().optional(),
  gender: z.enum(["male", "female"]).optional(),
  status: z.enum(membershipStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
