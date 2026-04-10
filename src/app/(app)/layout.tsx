"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCalendrier = pathname === "/calendrier";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-900 scrollbar-gutter-stable">
        <div className={cn(
          "h-full",
          !isCalendrier && "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
