import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">You do not have access</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This area is restricted by your assembly role. If you believe this is a mistake, speak with
        the Presiding Elder.
      </p>
      <Button asChild>
        <Link href="/app/dashboard">Go to your dashboard</Link>
      </Button>
    </div>
  );
}
