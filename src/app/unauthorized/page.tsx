import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 bg-cop-navy px-6 text-center text-white">
      <div className="absolute inset-x-0 top-0 h-2 bg-cop-gold" />
      <h1 className="text-2xl font-semibold">You do not have access</h1>
      <p className="max-w-md text-sm text-white/80">
        This area is restricted by your assembly role. If you believe this is a mistake, speak with
        the Presiding Elder.
      </p>
      <Button asChild className="bg-cop-gold text-cop-navy hover:bg-white">
        <Link href="/app/dashboard">Go to your dashboard</Link>
      </Button>
    </div>
  );
}
