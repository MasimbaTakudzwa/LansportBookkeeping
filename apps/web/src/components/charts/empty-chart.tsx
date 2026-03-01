"use client";

export function EmptyChart({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[160px] text-muted-foreground text-sm">
      {message}
    </div>
  );
}
