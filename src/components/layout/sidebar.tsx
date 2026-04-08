"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  UserSearch,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Profile } from "@/types";
import { getInitials } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Prospects", href: "/prospects", icon: UserSearch },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Projets", href: "/projets", icon: FolderKanban },
  { name: "Activité", href: "/activite", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    }
    loadProfile();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400 border border-teal-500/30"
                : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  const UserSection = () => (
    <div className="border-t border-slate-700 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-700/50 transition-colors cursor-pointer">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                {getInitials(profile?.full_name ?? null)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-slate-300">
              {profile?.full_name || profile?.email || "Utilisateur"}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
          <div className="px-2 py-1.5 text-sm text-slate-400">
            {profile?.email}
          </div>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300">
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden text-slate-300 hover:bg-slate-700"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-700 bg-slate-800 transition-transform duration-200 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-slate-700 px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <Image
                src="/sweet_logo.png"
                alt="Sweet Agency Logo"
                fill
                sizes="32px"
                className="rounded-lg object-contain"
                priority
              />
            </div>
            <span className="font-semibold text-lg text-white">Pipeline</span>
          </Link>
        </div>

        <NavLinks />
        <UserSection />
      </aside>
    </>
  );
}
