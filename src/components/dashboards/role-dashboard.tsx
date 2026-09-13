"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, ROLE_LABELS, type RoleSlug } from "@/types/roles";

type Stats = {
  totalMembers: number;
  newMembers: number;
  visitors: number;
  pendingFollowups: number;
  welfareOpen: number;
  announcements: { id: string; title: string; published_at: string | null }[];
  events: { id: string; title: string; starts_at: string; venue: string | null }[];
  income: number;
  expense: number;
};

function monthKey(value?: string | null) {
  if (!value) return "Unknown";
  return value.slice(0, 7);
}

export function RoleDashboard({
  role,
  name,
  stats,
  members,
  attendance,
  visitors,
  departments,
}: {
  role: RoleSlug;
  name: string;
  stats: Stats;
  members: { date_joined: string | null; gender: string }[];
  attendance: { attendance_date: string; status: string; members?: { gender: string } | { gender: string }[] | null }[];
  visitors: { date_visited: string; follow_up_status: string }[];
  departments: { department_id: string; departments?: { name: string } | { name: string }[] | null }[];
  ledDepartmentIds: string[];
}) {
  const growth = Object.values(
    members.reduce<Record<string, { month: string; members: number }>>((acc, row) => {
      const month = monthKey(row.date_joined);
      acc[month] = acc[month] ?? { month, members: 0 };
      acc[month].members += 1;
      return acc;
    }, {}),
  );

  const attendanceTrend = Object.values(
    attendance.reduce<Record<string, { date: string; present: number }>>((acc, row) => {
      acc[row.attendance_date] = acc[row.attendance_date] ?? { date: row.attendance_date, present: 0 };
      acc[row.attendance_date].present += 1;
      return acc;
    }, {}),
  ).slice(-8);

  const visitorTrend = Object.values(
    visitors.reduce<Record<string, { month: string; visitors: number }>>((acc, row) => {
      const month = monthKey(row.date_visited);
      acc[month] = acc[month] ?? { month, visitors: 0 };
      acc[month].visitors += 1;
      return acc;
    }, {}),
  );

  const deptParticipation = Object.values(
    departments.reduce<Record<string, { name: string; members: number }>>((acc, row) => {
      const dept = Array.isArray(row.departments) ? row.departments[0] : row.departments;
      const nameLabel = dept?.name ?? "Unassigned";
      acc[nameLabel] = acc[nameLabel] ?? { name: nameLabel, members: 0 };
      acc[nameLabel].members += 1;
      return acc;
    }, {}),
  );

  const canFinance = hasPermission(role, "finance.view");
  const canWelfare = hasPermission(role, "welfare.view");
  const isMember = role === "member";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${ROLE_LABELS[role]} dashboard`}
        description={`Peace be with you, ${name}. This view is scoped to your responsibility in Oyame Tiase Assembly.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!isMember || hasPermission(role, "members.view") ? (
          <StatCard label="Members" value={stats.totalMembers} hint={`${stats.newMembers} joined this month`} />
        ) : null}
        {hasPermission(role, "visitors.view") ? (
          <StatCard label="Visitors" value={stats.visitors} hint="All recorded visitors" />
        ) : null}
        {hasPermission(role, "followups.view") ? (
          <StatCard label="Pending follow-ups" value={stats.pendingFollowups} hint="New converts and new members" />
        ) : null}
        {canWelfare ? <StatCard label="Open welfare cases" value={stats.welfareOpen} /> : null}
        {canFinance ? (
          <StatCard
            label="Period balance"
            value={`GHS ${(stats.income - stats.expense).toLocaleString()}`}
            hint={`Income ${stats.income.toLocaleString()} · Expense ${stats.expense.toLocaleString()}`}
          />
        ) : null}
        {isMember ? <StatCard label="Upcoming programs" value={stats.events.length} /> : null}
      </div>

      {!isMember ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Membership growth</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="members" stroke="var(--color-primary)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Attendance trend</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="present" stroke="var(--color-primary)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Visitor trend</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitorTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="visitors" fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Department participation</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptParticipation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="members" fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming programs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming programs.</p>
            ) : (
              stats.events.map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(event.starts_at).toLocaleString()} {event.venue ? `· ${event.venue}` : ""}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              stats.announcements.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.published_at ? new Date(item.published_at).toLocaleDateString() : "Draft"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
