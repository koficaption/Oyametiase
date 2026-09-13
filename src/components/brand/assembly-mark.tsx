import Image from "next/image";
import { cn } from "@/lib/utils";

export function AssemblyMark({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/cop-emblem.png"
      alt="The Church of Pentecost"
      width={size}
      height={size}
      className={cn("rounded-full bg-white object-contain", className)}
      priority
    />
  );
}
