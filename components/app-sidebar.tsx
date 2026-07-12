"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  LayoutDashboard,
  Building2,
  Package,
  ClipboardList,
  CalendarRange,
  Wrench,
  ClipboardCheck,
  FileText,
  Bell,
  Sparkles,
  ChevronRight,
  LogOut,
  Trophy,
  Network
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Admin", "Asset Manager", "Department Head", "Employee"],
  },
  {
    title: "Organization",
    href: "/dashboard/organization",
    icon: Building2,
    roles: ["Admin"],
  },
  {
    title: "Assets",
    href: "/dashboard/assets",
    icon: Package,
    roles: ["Admin", "Asset Manager", "Department Head", "Employee"],
  },
  {
    title: "Allocations",
    href: "/dashboard/allocations",
    icon: ClipboardList,
    roles: ["Admin", "Asset Manager", "Department Head", "Employee"],
  },
  {
    title: "Bookings",
    href: "/dashboard/bookings",
    icon: CalendarRange,
    roles: ["Admin", "Asset Manager", "Department Head", "Employee"],
  },
  {
    title: "Leaderboard",
    href: "/dashboard/leaderboard",
    icon: Trophy,
    roles: ["Admin", "Asset Manager", "Department Head", "Employee"],
  },
  {
    title: "Asset Network",
    href: "/dashboard/network",
    icon: Network,
    roles: ["Admin", "Asset Manager", "Department Head"],
  },
  {
    title: "Maintenance",
    href: "/dashboard/maintenance",
    icon: Wrench,
    roles: ["Admin", "Asset Manager", "Department Head", "Employee"],
  },
  {
    title: "Audits",
    href: "/dashboard/audits",
    icon: ClipboardCheck,
    roles: ["Admin", "Asset Manager"],
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    roles: ["Admin", "Asset Manager", "Department Head"],
  },
  {
    title: "Activity",
    href: "/dashboard/notifications",
    icon: Bell,
    roles: ["Admin", "Asset Manager", "Department Head", "Employee"],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AF";

  return (
    <Sidebar variant="sidebar" className="border-r border-white/5 bg-background/60 backdrop-blur-xl">
      <SidebarHeader className="px-6 py-6">
        <Link href="/dashboard" className="flex items-center gap-3 group relative outline-none">
          {/* Glow effect behind logo */}
          <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div className="relative z-10 flex flex-col">
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 transition-all duration-300 group-hover:to-primary">
              AssetFlow
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Enterprise
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mb-2 px-3">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {filteredItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      render={<Link href={item.href} className="w-full block outline-none" />}
                      isActive={isActive} 
                      className={`group relative flex items-center justify-between overflow-hidden rounded-xl h-11 px-3 transition-all duration-300 outline-none
                        ${isActive 
                          ? "bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary/20" 
                          : "hover:bg-white/5 text-muted-foreground hover:text-foreground hover:shadow-sm"
                        }
                      `}
                    >
                      {/* Animated background gradient for active state */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-50 pointer-events-none" />
                      )}

                      <div className="relative flex items-center gap-3 z-10">
                        <div className={`flex items-center justify-center p-1.5 rounded-md transition-colors duration-300 ${isActive ? 'bg-primary/20 text-primary' : 'bg-transparent group-hover:bg-white/10'}`}>
                          <item.icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        </div>
                        <span className="tracking-wide">{item.title}</span>
                      </div>

                      {isActive && (
                        <ChevronRight className="relative z-10 h-4 w-4 text-primary animate-in slide-in-from-left-2 fade-in" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/5 bg-gradient-to-b from-transparent to-black/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-300 hover:bg-white/5 cursor-pointer ring-1 ring-transparent hover:ring-white/10 hover:shadow-md group outline-none">
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-background transition-transform duration-300 group-hover:scale-105 group-hover:ring-primary/30">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {user?.name}
                </p>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {user?.role}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-64 rounded-xl border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl p-2 mb-2">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-white/10 mx-1" />
            <DropdownMenuItem 
              onClick={logout} 
              className="text-red-500 focus:bg-red-500/10 focus:text-red-600 cursor-pointer rounded-lg mt-1 px-3 py-2.5 flex items-center gap-2 transition-colors font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out safely</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
