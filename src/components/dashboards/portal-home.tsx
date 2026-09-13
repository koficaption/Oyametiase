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
import { PORTAL_LABELS, type PortalKind } from "@/types/portals";

export type PortalStats = {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  visitors: number;
  newConverts: number;
  attendanceToday: number;
  attendanceWeek: number;
  attendanceMonth: number;
  pendingFollowups: number;
  welfareOpen: number;
  pendingReports: number;
  pendingApprovals: number;
  childrenCount: number;
  tithes: number;
  offerings: number;
  donations: number;
  otherIncome: number;
  income: number;
  expense: number;
  announcements: { id: string; title: string; published_at: string | null }[];
  events: { id: string; title: string; starts_at: string; venue: string | null }[];
  recentTransactions?: { id: string; amount: number; type: string; occurred_on: string }[];
};

type ChartPoint = { label: string; value: number };

export function PortalHome({
  portal,
  name,
  ministryName,
  stats,
  attendanceTrend,
  incomeTrend,
  expenseTrend,
  departmentStats,
}: {
  portal: PortalKind;
  name: string;
  ministryName?: string;
  stats: PortalStats;
  attendanceTrend: ChartPoint[];
  incomeTrend: ChartPoint[];
  expenseTrend: ChartPoint[];
  departmentStats: ChartPoint[];
}) {
  const title = ministryName ? `${ministryName} portal` : `${PORTAL_LABELS[portal]} portal`;
  const greeting = `Peace be with you, ${name}.`;

  if (portal === "member") {
    return (
      <div className="space-y-6">
        <PageHeader title="Welcome" description={`${greeting} This is your personal church home — not an administration desk.`} />
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Next program" value={stats.events[0]?.title ?? "None listed"} />
          <StatCard label="Latest announcement" value={stats.announcements[0]?.title ?? "None yet"} />
        </div>
        <Lists events={stats.events} announcements={stats.announcements} />
      </div>
    );
  }

  if (portal === "treasurer") {
    return (
      <div className="space-y-6">
        <PageHeader title="Treasurer portal" description={`${greeting} Finance records for Oyame Tiase Assembly.`} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tithes" value={money(stats.tithes)} />
          <StatCard label="Offerings" value={money(stats.offerings)} />
          <StatCard label="Donations" value={money(stats.donations)} />
          <StatCard label="Other income" value={money(stats.otherIncome)} />
          <StatCard label="Expenses" value={money(stats.expense)} />
          <StatCard label="Current balance" value={money(stats.income - stats.expense)} />
          <StatCard label="Monthly income" value={money(stats.income)} />
          <StatCard label="Monthly expenses" value={money(stats.expense)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Trend title="Income" data={incomeTrend} />
          <Trend title="Expenses" data={expenseTrend} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(stats.recentTransactions ?? []).length === 0 ? (
              <p className="text-muted-foreground">No transactions yet.</p>
            ) : (
              stats.recentTransactions?.map((row) => (
                <div key={row.id} className="flex justify-between border-b py-2 last:border-0">
                  <span>{row.occurred_on} · {row.type}</span>
                  <span className="font-medium">{money(row.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (portal === "secretary") {
    return (
      <div className="space-y-6">
        <PageHeader title="Secretary portal" description={`${greeting} Records and administration — not finance or user management.`} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total members" value={stats.totalMembers} />
          <StatCard label="New members" value={stats.newMembers} hint="This month" />
          <StatCard label="Visitors" value={stats.visitors} />
          <StatCard label="New converts" value={stats.newConverts} />
          <StatCard label="Attendance this week" value={stats.attendanceWeek} />
          <StatCard label="Pending follow-ups" value={stats.pendingFollowups} />
        </div>
        <Lists events={stats.events} announcements={stats.announcements} />
      </div>
    );
  }

  if (portal === "presiding_elder") {
    return (
      <div className="space-y-6">
        <PageHeader title="Presiding Elder portal" description={`${greeting} Assembly overview for Oyame Tiase.`} />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Assembly Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total members" value={stats.totalMembers} />
            <StatCard label="Active members" value={stats.activeMembers} />
            <StatCard label="New members" value={stats.newMembers} hint="This month" />
            <StatCard label="Visitors" value={stats.visitors} />
            <StatCard label="New converts" value={stats.newConverts} />
            <StatCard label="Today's attendance" value={stats.attendanceToday} />
            <StatCard label="Weekly attendance" value={stats.attendanceWeek} />
            <StatCard label="Monthly attendance" value={stats.attendanceMonth} />
            <StatCard label="Pending follow-ups" value={stats.pendingFollowups} />
            <StatCard label="Open welfare" value={stats.welfareOpen} />
            <StatCard label="Financial balance" value={money(stats.income - stats.expense)} />
            <StatCard label="Pending reports" value={stats.pendingReports} />
            <StatCard label="Approvals waiting" value={stats.pendingApprovals} />
          </div>
        </section>
        <div className="grid gap-4 xl:grid-cols-2">
          <Trend title="Attendance" data={attendanceTrend} />
          <Card>
            <CardHeader>
              <CardTitle>Department statistics</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Lists events={stats.events} announcements={stats.announcements} />
      </div>
    );
  }

  if (portal === "children") {
    return (
      <div className="space-y-6">
        <PageHeader title="Children's Ministry portal" description={`${greeting} Children's records stay inside this ministry.`} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total children" value={stats.childrenCount} />
          <StatCard label="Attendance this week" value={stats.attendanceWeek} />
          <StatCard label="Follow-ups" value={stats.pendingFollowups} />
          <StatCard label="Upcoming programs" value={stats.events.length} />
        </div>
        <Lists events={stats.events} announcements={stats.announcements} />
      </div>
    );
  }

  const peopleLabel =
    portal === "womens" ? "Women" : portal === "mens" ? "Men" : portal === "youth" ? "Youth" : "Members";

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={`${greeting} This portal is limited to your ministry.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Number of ${peopleLabel.toLowerCase()}`} value={stats.totalMembers} />
        <StatCard label={`Active ${peopleLabel.toLowerCase()}`} value={stats.activeMembers} />
        <StatCard label={`New ${peopleLabel.toLowerCase()}`} value={stats.newMembers} />
        <StatCard label="Attendance this week" value={stats.attendanceWeek} />
        <StatCard label="Follow-ups" value={stats.pendingFollowups} />
        <StatCard label="Upcoming programs" value={stats.events.length} />
      </div>
      <Trend title="Attendance" data={attendanceTrend} />
      <Lists events={stats.events} announcements={stats.announcements} />
    </div>
  );
}

function money(value: number) {
  return `GHS ${value.toLocaleString()}`;
}

function Trend({ title, data }: { title: string; data: ChartPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="var(--color-primary)" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Lists({
  events,
  announcements,
}: {
  events: PortalStats["events"];
  announcements: PortalStats["announcements"];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming programs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming programs.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-lg border p-3">
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(event.starts_at).toLocaleString()}
                  {event.venue ? ` · ${event.venue}` : ""}
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
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          ) : (
            announcements.map((item) => (
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
  );
}
