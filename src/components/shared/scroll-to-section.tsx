"use client";

import { useEffect } from "react";

export function ScrollToSection({ id }: { id?: string }) {
  useEffect(() => {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [id]);
  return null;
}
