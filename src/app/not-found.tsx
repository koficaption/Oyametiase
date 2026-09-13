import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">This page is not available</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The record or route you requested does not exist in the Oyame Tiase Assembly system.
      </p>
      <Button asChild>
        <Link href="/app/dashboard">Return to dashboard</Link>
      </Button>
    </div>
  );
}
