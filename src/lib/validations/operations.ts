import { z } from "zod";
import { emailSchema, moneySchema, phoneSchema, requiredName } from "@/lib/validations/common";

export const attendanceSchema = z.object({
  attendance_date: z.string().min(1, "Date is required"),
  service_id: z.string().uuid().optional().or(z.literal("")),
  event_id: z.string().uuid().optional().or(z.literal("")),
  department_id: z.string().uuid().optional().or(z.literal("")),
  records: z
    .array(
      z.object({
        member_id: z.string().uuid().optional(),
        visitor_id: z.string().uuid().optional(),
        visitor_name: z.string().trim().max(120).optional(),
        status: z.enum(["present", "absent", "excused"]),
      }),
    )
    .min(1, "Record at least one person"),
});

export const visitorSchema = z.object({
  full_name: requiredName,
  phone: phoneSchema,
  email: emailSchema,
  location: z.string().trim().max(160).optional().or(z.literal("")),
  date_visited: z.string().min(1, "Visit date is required"),
  service_id: z.string().uuid().optional().or(z.literal("")),
  how_heard: z.string().trim().max(160).optional().or(z.literal("")),
  prayer_request: z.string().trim().max(2000).optional().or(z.literal("")),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  follow_up_status: z.enum([
    "new",
    "contacted",
    "follow_up_scheduled",
    "interested",
    "joined",
    "not_reachable",
    "closed",
  ]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const eventSchema = z.object({
  title: requiredName.max(160),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  starts_at: z.string().min(1, "Start time is required"),
  ends_at: z.string().optional().or(z.literal("")),
  venue: z.string().trim().max(160).optional().or(z.literal("")),
  organizer_id: z.string().uuid().optional().or(z.literal("")),
  department_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "scheduled", "completed", "cancelled"]),
});

export const announcementSchema = z.object({
  title: requiredName.max(160),
  content: z.string().trim().min(1, "Content is required").max(8000),
  category: z.enum(["general", "program", "department", "emergency", "reminder", "information"]),
  audience: z.enum([
    "everyone",
    "members",
    "youth",
    "men",
    "women",
    "children",
    "department",
    "officers",
  ]),
  department_id: z.string().uuid().optional().or(z.literal("")),
  published_at: z.string().optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")),
});

export const prayerSchema = z.object({
  title: requiredName.max(160),
  request: z.string().trim().min(1, "Request is required").max(4000),
  privacy_level: z.enum(["private", "presiding_elder", "authorized_leaders", "prayer_team"]),
});

export const welfareSchema = z.object({
  member_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(["medical", "bereavement", "emergency", "food", "other"]),
  description: z.string().trim().min(1).max(4000),
  assistance_requested: z.string().trim().max(2000).optional().or(z.literal("")),
  assistance_provided: z.string().trim().max(2000).optional().or(z.literal("")),
  amount: z.coerce.number().min(0).max(10_000_000).optional(),
  responsible_officer_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["open", "in_review", "approved", "provided", "closed", "declined"]),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const transactionSchema = z.object({
  occurred_on: z.string().min(1, "Date is required"),
  type: z.enum(["income", "expense"]),
  category_id: z.string().uuid("Select a category"),
  amount: moneySchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  payment_method: z.enum(["cash", "mobile_money", "bank", "other"]),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export const weeklyAmountSchema = z.coerce
  .number()
  .min(0, "Amount cannot be negative")
  .max(10_000_000, "Amount is too large");

export const weeklyCollectionsSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a week"),
  week_label: z.string().trim().max(120, "Week name is too long").optional().or(z.literal("")),
  week_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
    .optional()
    .or(z.literal("")),
  week_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time")
    .optional()
    .or(z.literal("")),
  days: z
    .array(
      z.object({
        occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        church: weeklyAmountSchema,
        sunday_school: weeklyAmountSchema,
      }),
    )
    .length(7, "Record Monday through Sunday"),
});

export const followupSchema = z.object({
  member_id: z.string().uuid("Select a member"),
  follow_up_type: z.enum(["new_member", "new_convert", "inactive", "pastoral", "other"]),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["open", "in_progress", "needs_attention", "completed", "closed"]),
  progress: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  next_contact_on: z.string().optional().or(z.literal("")),
});
