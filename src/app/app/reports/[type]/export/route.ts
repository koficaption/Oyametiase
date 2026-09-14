import { NextResponse } from "next/server";
import { ASSEMBLY_SLUG } from "@/lib/assembly";
import { getCurrentUser } from "@/lib/auth/session";
import { isApprovedAccount } from "@/lib/church-directory";
import { buildReport } from "@/lib/reports/build";
import { reportCsv, reportPdf, reportWorkbook } from "@/lib/reports/export";
import { currentReportYear, parseReportType } from "@/lib/reports/period";
import { canGenerateReport, scopedReportDepartmentId } from "@/lib/reports/permissions";
import type { ReportFilters } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isApprovedAccount(user.profile.account_status, user.profile.approval_status)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { type: rawType } = await params;
  const type = parseReportType(rawType);
  if (!type || !canGenerateReport(user.profile.role_slug, type)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? currentReportYear());
  const monthRaw = url.searchParams.get("month");
  const month = monthRaw ? Number(monthRaw) : undefined;
  const filters: ReportFilters = {
    type,
    year: Number.isInteger(year) ? year : currentReportYear(),
    month: month && month >= 1 && month <= 12 ? month : undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    departmentId: scopedReportDepartmentId(user, url.searchParams.get("department") ?? undefined) ?? undefined,
    remarks: url.searchParams.get("remarks") ?? undefined,
  };

  const supabase = await createClient();
  const report = await buildReport(supabase, user, filters);
  const format = url.searchParams.get("format") ?? "pdf";
  const filename = `${ASSEMBLY_SLUG}-${type}-${filters.year}.${format === "xlsx" ? "xlsx" : format === "csv" ? "csv" : "pdf"}`;

  if (format === "csv") {
    return new NextResponse(reportCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
  if (format === "xlsx") {
    const buffer = await reportWorkbook(report);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const buffer = await reportPdf(report);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
