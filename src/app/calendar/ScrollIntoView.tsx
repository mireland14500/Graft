"use client";

import { useEffect } from "react";

/** Opens the calendar on the current week, the way Runna does. */
export function ScrollIntoView({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);
  return null;
}
