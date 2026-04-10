import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-900 scrollbar-gutter-stable">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
