import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log" };

export default async function AuditLogsPage() {
  await requirePermission("audit.view");
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, module, record_id, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(150);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Visible only to the Presiding Elder." />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Module</th>
              <th className="px-3 py-2">Record</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => {
              const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
              return (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{profile?.full_name ?? "System"}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.module}</td>
                  <td className="px-3 py-2 font-mono text-xs">{log.record_id}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
