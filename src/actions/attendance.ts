"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/session";
import { emptyToNull, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/validations/common";

export async function recordAttendanceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requirePermission("attendance.manage");
  const attendanceDate = str(formData, "attendance_date");
  const serviceId = emptyToNull(str(formData, "service_id"));
  const eventId = emptyToNull(str(formData, "event_id"));
  const departmentId = emptyToNull(str(formData, "department_id"));
  const raw = str(formData, "records");

  if (!attendanceDate) return fail("Choose a service date.");

  let records: {
    member_id?: string;
    visitor_id?: string;
    visitor_name?: string;
    status: "present" | "absent" | "excused";
  }[] = [];

  try {
    records = JSON.parse(raw) as typeof records;
  } catch {
    return fail("Attendance records are invalid.");
  }

  if (!records.length) return fail("Mark at least one person.");

  const supabase = await createClient();
  const rows = [];

  for (const record of records) {
    let visitorId = record.visitor_id ?? null;
    if (!record.member_id && record.visitor_name && !visitorId) {
      const { data: visitor, error } = await supabase
        .from("visitors")
        .insert({
          assembly_id: user.profile.assembly_id,
          full_name: record.visitor_name,
          date_visited: attendanceDate,
          service_id: serviceId,
          follow_up_status: "new",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error || !visitor) return fail("Unable to register a walk-in visitor.");
      visitorId = visitor.id;
    }

    rows.push({
      assembly_id: user.profile.assembly_id,
      member_id: record.member_id ?? null,
      visitor_id: record.member_id ? null : visitorId,
      service_id: serviceId,
      event_id: eventId,
      department_id: departmentId,
      attendance_date: attendanceDate,
      status: record.status,
      check_in_time: record.status === "present" ? new Date().toISOString() : null,
      recorded_by: user.id,
    });
  }

  const { error } = await supabase.from("attendance").upsert(rows, {
    onConflict: "member_id,attendance_date,service_id,event_id",
    ignoreDuplicates: false,
  });

  if (error) {
    if (error.code === "23505") {
      return fail("A record already exists for one of these people on this date and service.");
    }
    // Unique index is expression-based; fall back to per-row insert.
    for (const row of rows) {
      const { error: insertError } = await supabase.from("attendance").insert(row);
      if (insertError?.code === "23505") {
        return fail("Duplicate attendance is not allowed for the same person, date, and service.");
      }
      if (insertError) return fail("Unable to save attendance.");
    }
  }

  await writeAudit(supabase, {
    action: "attendance.record",
    module: "attendance",
    metadata: { date: attendanceDate, count: rows.length },
  });
  revalidatePath("/app/attendance");
  return ok("Attendance saved.");
}
