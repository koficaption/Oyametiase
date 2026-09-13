import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { tablePdf, workbookToBuffer } from "@/lib/reports/export";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, type Permission } from "@/types/roles";

const PERMS: Record<string, Permission> = {
  membership: "reports.admin",
  attendance: "reports.admin",
  visitors: "reports.admin",
  departments: "reports.admin",
  finance: "reports.finance",
  welfare: "reports.welfare",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type } = await params;
  const permission = PERMS[type];
  if (!permission || !hasPermission(user.profile.role_slug, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "xlsx";
  const supabase = await createClient();
  const rows = await buildRows(supabase, type, user.profile.assembly_id);
  const columns = rows[0] ? Object.keys(rows[0]) : ["message"];
  const filename = `oyame-tiase-${type}.${format === "pdf" ? "pdf" : "xlsx"}`;

  if (format === "pdf") {
    const buffer = tablePdf(
      `${type} report`,
      columns,
      rows.map((row) => columns.map((column) => String((row as Record<string, unknown>)[column] ?? ""))),
    );
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const buffer = await workbookToBuffer(rows, type);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function buildRows(supabase: Awaited<ReturnType<typeof createClient>>, type: string, assemblyId: string) {
  if (type === "membership") {
    const { data } = await supabase
      .from("members")
      .select("member_code, first_name, last_name, gender, membership_status, date_joined")
      .eq("assembly_id", assemblyId)
      .is("archived_at", null);
    return data ?? [];
  }
  if (type === "attendance") {
    const { data } = await supabase
      .from("attendance")
      .select("attendance_date, status, members(first_name, last_name), services(name)")
      .eq("assembly_id", assemblyId)
      .limit(500);
    return (data ?? []).map((row) => {
      const member = Array.isArray(row.members) ? row.members[0] : row.members;
      const service = Array.isArray(row.services) ? row.services[0] : row.services;
      return {
        date: row.attendance_date,
        person: member ? `${member.first_name} ${member.last_name}` : "Visitor",
        service: service?.name ?? "",
        status: row.status,
      };
    });
  }
  if (type === "visitors") {
    const { data } = await supabase
      .from("visitors")
      .select("full_name, date_visited, follow_up_status, converted_member_id")
      .eq("assembly_id", assemblyId);
    return data ?? [];
  }
  if (type === "departments") {
    const { data } = await supabase.from("departments").select("name, meeting_day, is_active").eq("assembly_id", assemblyId);
    return data ?? [];
  }
  if (type === "finance") {
    const { data } = await supabase
      .from("financial_transactions")
      .select("transaction_code, occurred_on, type, amount, payment_method, financial_categories(name)")
      .eq("assembly_id", assemblyId)
      .is("department_id", null);
    return (data ?? []).map((row) => {
      const category = Array.isArray(row.financial_categories) ? row.financial_categories[0] : row.financial_categories;
      return {
        code: row.transaction_code,
        date: row.occurred_on,
        type: row.type,
        category: category?.name,
        amount: row.amount,
        method: row.payment_method,
      };
    });
  }
  if (type === "welfare") {
    const { data } = await supabase
      .from("welfare_cases")
      .select("category, status, amount, description")
      .eq("assembly_id", assemblyId);
    return data ?? [];
  }
  return [{ message: "Unknown report" }];
}
