"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Notification = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationsBell({
  initialItems,
  userId,
}: {
  initialItems: Notification[];
  userId: string;
}) {
  const [items, setItems] = useState(initialItems);
  const unread = items.filter((item) => !item.is_read).length;

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((current) => [payload.new as Notification, ...current].slice(0, 20));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          <form action={markAllNotificationsReadAction as unknown as (formData: FormData) => Promise<void>}>
            <Button type="submit" variant="ghost" size="xs">
              Mark all read
            </Button>
          </form>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} className="items-start" asChild>
              <form
                action={async (formData) => {
                  await markNotificationReadAction(formData);
                  setItems((current) =>
                    current.map((row) => (row.id === item.id ? { ...row, is_read: true } : row)),
                  );
                }}
              >
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="w-full text-left">
                  <Link href={item.link ?? "/app/dashboard"} className="block">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.body}</div>
                  </Link>
                </button>
              </form>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
