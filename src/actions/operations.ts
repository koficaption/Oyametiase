"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/auth/audit";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/types/roles";
import { emptyToNull, opt, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, zodError, type ActionResult } from "@/lib/validations/common";
import {
  announcementSchema,
  eventSchema,
  followupSchema,
  prayerSchema,
  transactionSchema,
  weeklyCollectionsSchema,
  welfareSchema,
} from "@/lib/validations/operations";
import {
  mondayOfWeek,
  normalizeWeekLabel,
  parseMoneyInput,
  SUNDAY_SCHOOL_CATEGORY_SLUG,
  sundaySchoolForDay,
  weekDays,
  WEEKLY_CHURCH_REF,
  WEEKLY_SUNDAY_SCHOOL_REF,
} from "@/lib/weekly-collections";

export async function saveEventAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("events.manage");
  const parsed = eventSchema.safeParse({
    title: str(formData, "title"),
    description: opt(formData, "description"),
    starts_at: str(formData, "starts_at"),
    ends_at: opt(formData, "ends_at"),
    venue: opt(formData, "venue"),
    organizer_id: opt(formData, "organizer_id"),
    department_id: opt(formData, "department_id"),
    status: str(formData, "status") || "scheduled",
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    ends_at: emptyToNull(parsed.data.ends_at),
    organizer_id: emptyToNull(parsed.data.organizer_id),
    department_id: emptyToNull(parsed.data.department_id),
    created_by: user.id,
  };
  const query = id
    ? supabase.from("events").update(payload).eq("id", id).select("id").single()
    : supabase.from("events").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error || !data) return fail("Unable to save the event.");
  await writeAudit(supabase, { action: id ? "event.update" : "event.create", module: "events", recordId: data.id });
  revalidatePath("/app/events");
  return ok("Event saved.");
}

export async function saveAnnouncementAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("announcements.manage");
  const parsed = announcementSchema.safeParse({
    title: str(formData, "title"),
    content: str(formData, "content"),
    category: str(formData, "category") || "general",
    audience: str(formData, "audience") || "everyone",
    department_id: opt(formData, "department_id"),
    published_at: opt(formData, "published_at"),
    expires_at: opt(formData, "expires_at"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    department_id: emptyToNull(parsed.data.department_id),
    published_at: parsed.data.published_at || new Date().toISOString(),
    expires_at: emptyToNull(parsed.data.expires_at),
    author_id: user.id,
  };
  const { data, error } = id
    ? await supabase.from("announcements").update(payload).eq("id", id).select("id").single()
    : await supabase.from("announcements").insert(payload).select("id").single();
  if (error || !data) return fail("Unable to publish the announcement.");
  await writeAudit(supabase, {
    action: "announcement.publish",
    module: "announcements",
    recordId: data.id,
  });
  const { data: profiles } = await supabase.from("profiles").select("id, assembly_id").eq("is_active", true);
  if (profiles?.length) {
    await supabase.from("notifications").insert(
      profiles.map((profile) => ({
        assembly_id: profile.assembly_id,
        user_id: profile.id,
        title: parsed.data.title,
        body: "A new church announcement has been published.",
        type: "announcement",
        link: "/app/announcements",
      })),
    );
  }
  revalidatePath("/app/announcements");
  return ok("Announcement published.");
}

export async function submitPrayerAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = prayerSchema.safeParse({
    title: str(formData, "title"),
    request: str(formData, "request"),
    privacy_level: str(formData, "privacy_level") || "prayer_team",
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("prayer_requests").insert({
    assembly_id: user.profile.assembly_id,
    member_id: user.member?.id ?? null,
    submitted_by: user.id,
    ...parsed.data,
  });
  if (error) return fail("Unable to submit the prayer request.");
  revalidatePath("/app/prayer-requests");
  return ok("Prayer request submitted.");
}

export async function updatePrayerStatusAction(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("prayer_requests")
    .update({ status: str(formData, "status") })
    .eq("id", str(formData, "id"));
  if (error) return fail("Unable to update this prayer request.");
  await writeAudit(supabase, {
    action: "prayer.status",
    module: "prayer_requests",
    recordId: str(formData, "id"),
  });
  revalidatePath("/app/prayer-requests");
  return ok("Prayer request updated.");
}

export async function saveWelfareAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("welfare.manage");
  const parsed = welfareSchema.safeParse({
    member_id: opt(formData, "member_id"),
    category: str(formData, "category"),
    description: str(formData, "description"),
    assistance_requested: opt(formData, "assistance_requested"),
    assistance_provided: opt(formData, "assistance_provided"),
    amount: opt(formData, "amount") ? Number(str(formData, "amount")) : undefined,
    responsible_officer_id: opt(formData, "responsible_officer_id"),
    status: str(formData, "status") || "open",
    notes: opt(formData, "notes"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    member_id: emptyToNull(parsed.data.member_id),
    responsible_officer_id: emptyToNull(parsed.data.responsible_officer_id),
    created_by: user.id,
  };
  const { data, error } = id
    ? await supabase.from("welfare_cases").update(payload).eq("id", id).select("id").single()
    : await supabase.from("welfare_cases").insert(payload).select("id").single();
  if (error || !data) return fail("Unable to save the welfare case.");
  await writeAudit(supabase, { action: "welfare.save", module: "welfare", recordId: data.id });
  revalidatePath("/app/welfare");
  return ok("Welfare case saved.");
}

export async function recordWelfarePaymentAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("welfare.manage");
  const caseId = str(formData, "case_id");
  const amount = Number(str(formData, "amount"));
  const paidOn = str(formData, "paid_on") || new Date().toISOString().slice(0, 10);
  if (!caseId) return fail("Select a welfare case.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Enter a payment amount.");
  const supabase = await createClient();
  const { error } = await supabase.from("welfare_payments").insert({
    assembly_id: user.profile.assembly_id,
    case_id: caseId,
    amount,
    paid_on: paidOn,
    recorded_by: user.id,
    notes: emptyToNull(str(formData, "notes")),
  });
  if (error) return fail("Unable to record the welfare payment.");
  await writeAudit(supabase, { action: "welfare.payment", module: "welfare", recordId: caseId });
  revalidatePath("/app/welfare");
  revalidatePath("/app/reports");
  return ok("Payment recorded.");
}

export async function saveTransactionAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const assemblyWrite = hasPermission(user.profile.role_slug, "finance.manage");
  const ministryWrite =
    user.profile.role_slug === "department_leader" || user.profile.role_slug === "ministry_finance";
  if (!assemblyWrite && !ministryWrite) {
    return fail("You are not allowed to record transactions.");
  }

  const parsed = transactionSchema.safeParse({
    occurred_on: str(formData, "occurred_on"),
    type: str(formData, "type"),
    category_id: str(formData, "category_id"),
    amount: Number(str(formData, "amount")),
    description: opt(formData, "description"),
    payment_method: str(formData, "payment_method") || "cash",
    reference: opt(formData, "reference"),
  });
  if (!parsed.success) return zodError(parsed.error);

  let departmentId: string | null = null;
  if (ministryWrite) {
    const requested = emptyToNull(opt(formData, "department_id")) ?? user.ledDepartmentIds[0] ?? null;
    if (!requested || !user.ledDepartmentIds.includes(requested)) {
      return fail("You can only record money for a ministry you lead.");
    }
    departmentId = requested;
  }

  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    department_id: departmentId,
    recorded_by: user.id,
  };
  const { data, error } = id
    ? await supabase.from("financial_transactions").update(payload).eq("id", id).select("id").single()
    : await supabase.from("financial_transactions").insert(payload).select("id").single();
  if (error || !data) return fail("Unable to save the transaction.");
  await writeAudit(supabase, {
    action: id ? "finance.update" : "finance.create",
    module: departmentId ? "department-finance" : "finance",
    recordId: data.id,
  });
  revalidatePath("/app/finance");
  revalidatePath("/app/finance/weekly");
  revalidatePath("/app/finance/tithes");
  revalidatePath("/app/finance/offerings");
  revalidatePath("/app/finance/donations");
  revalidatePath("/app/finance/income");
  revalidatePath("/app/finance/expenses");
  revalidatePath("/app/department-finance");
  revalidatePath("/app/dashboard");
  return ok("Transaction saved.");
}

async function categoryIdBySlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assemblyId: string,
  slug: string,
) {
  const { data } = await supabase
    .from("financial_categories")
    .select("id")
    .eq("assembly_id", assemblyId)
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

async function ensureSundaySchoolCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assemblyId: string,
) {
  const existing = await categoryIdBySlug(supabase, assemblyId, SUNDAY_SCHOOL_CATEGORY_SLUG);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("financial_categories")
    .insert({
      assembly_id: assemblyId,
      name: "Sunday school offerings",
      slug: SUNDAY_SCHOOL_CATEGORY_SLUG,
      type: "income",
      is_system: true,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function saveWeeklyCollectionsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requirePermission("finance.manage");
  const monday = mondayOfWeek(str(formData, "week_start"));
  if (!monday) return fail("Choose a valid week.");
  const days = weekDays(monday);
  const parsed = weeklyCollectionsSchema.safeParse({
    week_start: monday,
    week_label: normalizeWeekLabel(str(formData, "week_label")),
    days: days.map((day) => ({
      occurred_on: day.iso,
      church: parseMoneyInput(str(formData, `church_${day.iso}`)) ?? -1,
      sunday_school: sundaySchoolForDay(
        day.isSunday,
        parseMoneyInput(str(formData, `sunday_school_${day.iso}`)) ?? -1,
      ),
    })),
  });
  if (!parsed.success) return zodError(parsed.error);

  const supabase = await createClient();
  const sunday = days[6]?.iso;
  const midweekId = await categoryIdBySlug(supabase, user.profile.assembly_id, "midweek-offerings");
  const sundayOfferingId = await categoryIdBySlug(supabase, user.profile.assembly_id, "sunday-offerings");
  const churchFallback = sundayOfferingId ?? midweekId;
  const sundaySchoolId = await ensureSundaySchoolCategory(supabase, user.profile.assembly_id);
  if (!churchFallback || !sundaySchoolId) {
    return fail("Offering categories are missing. Ask the Presiding Elder to apply the latest database update.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("financial_transactions")
    .select("id, occurred_on, reference, archived_at")
    .eq("assembly_id", user.profile.assembly_id)
    .is("department_id", null)
    .in("reference", [WEEKLY_CHURCH_REF, WEEKLY_SUNDAY_SCHOOL_REF])
    .gte("occurred_on", monday)
    .lte("occurred_on", sunday);
  if (existingError) return fail("Unable to load this week's sheet.");

  const findExisting = (occurredOn: string, reference: string) => {
    const matches = (existing ?? []).filter((row) => row.occurred_on === occurredOn && row.reference === reference);
    return matches.find((row) => !row.archived_at) ?? matches[0];
  };

  for (const day of parsed.data.days) {
    const isSunday = day.occurred_on === sunday;
    const entries = [
      {
        amount: day.church,
        reference: WEEKLY_CHURCH_REF,
        categoryId: isSunday ? (sundayOfferingId ?? churchFallback) : (midweekId ?? churchFallback),
        description: isSunday
          ? "Weekly church collection · Sunday"
          : `Weekly church collection · ${days.find((item) => item.iso === day.occurred_on)?.label ?? day.occurred_on}`,
      },
      {
        amount: sundaySchoolForDay(isSunday, day.sunday_school),
        reference: WEEKLY_SUNDAY_SCHOOL_REF,
        categoryId: sundaySchoolId,
        description: "Sunday school (children) · Sunday",
      },
    ];

    for (const entry of entries) {
      const current = findExisting(day.occurred_on, entry.reference);
      if (entry.amount <= 0) {
        if (current) {
          const { error } = await supabase
            .from("financial_transactions")
            .update({ archived_at: new Date().toISOString() })
            .eq("id", current.id);
          if (error) return fail("Unable to clear an empty day on the sheet.");
        }
        continue;
      }

      const payload = {
        assembly_id: user.profile.assembly_id,
        occurred_on: day.occurred_on,
        type: "income" as const,
        category_id: entry.categoryId,
        amount: entry.amount,
        description: entry.description,
        payment_method: "cash" as const,
        reference: entry.reference,
        department_id: null,
        recorded_by: user.id,
        archived_at: null,
      };
      const { data, error } = current
        ? await supabase.from("financial_transactions").update(payload).eq("id", current.id).select("id").single()
        : await supabase.from("financial_transactions").insert(payload).select("id").single();
      if (error || !data) return fail("Unable to save this week's collections.");
      await writeAudit(supabase, {
        action: current ? "finance.update" : "finance.create",
        module: "finance",
        recordId: data.id,
        metadata: { sheet: "weekly", reference: entry.reference, occurred_on: day.occurred_on },
      });
    }
  }

  const weekLabel = normalizeWeekLabel(parsed.data.week_label ?? "");
  const { error: weekError } = await supabase.from("weekly_collection_weeks").upsert(
    {
      assembly_id: user.profile.assembly_id,
      week_start: monday,
      label: weekLabel,
      created_by: user.id,
    },
    { onConflict: "assembly_id,week_start" },
  );
  if (weekError) {
    return fail("Week money saved, but the week name could not be stored. Ask the Presiding Elder to apply the latest database update.");
  }

  revalidatePath("/app/finance");
  revalidatePath("/app/finance/weekly");
  revalidatePath("/app/finance/offerings");
  revalidatePath("/app/finance/income");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  return ok("Week saved. Sunday school is only on Sunday and is included in the Sunday total.");
}

export async function saveFollowupAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("followups.manage");
  const parsed = followupSchema.safeParse({
    member_id: str(formData, "member_id"),
    follow_up_type: str(formData, "follow_up_type") || "new_member",
    assigned_to: opt(formData, "assigned_to"),
    status: str(formData, "status") || "open",
    progress: opt(formData, "progress"),
    notes: opt(formData, "notes"),
    next_contact_on: opt(formData, "next_contact_on"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_followups")
    .insert({
      assembly_id: user.profile.assembly_id,
      ...parsed.data,
      assigned_to: emptyToNull(parsed.data.assigned_to),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail("Unable to create the follow-up.");
  revalidatePath("/app/follow-ups");
  return ok("Follow-up created.");
}

export async function addFollowupAttemptAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("followups.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("member_followup_attempts").insert({
    followup_id: str(formData, "followup_id"),
    attempt_date: str(formData, "attempt_date") || new Date().toISOString().slice(0, 10),
    method: str(formData, "method") || "phone",
    notes: str(formData, "notes"),
  });
  if (error) return fail("Unable to record the contact attempt.");
  revalidatePath("/app/follow-ups");
  return ok("Contact attempt recorded.");
}
