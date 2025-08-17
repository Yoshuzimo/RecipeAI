"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Settings, Warehouse, LayoutDashboard, BarChart, FileText, ShoppingCart, Bookmark } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/meal-planner", label: "Meal Planner", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingCart },
  { href: "/nutrition", label: "Nutrition", icon: BarChart },
  { href: "/saved-recipes", label: "Saved Recipes", icon: Bookmark },
  { href: "/personal-details", label: "Personal Details", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="h-full">
          <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="w-8 h-8 text-primary" />
              <span className="font-bold text-lg group-data-[state=collapsed]:hidden">CookSmart</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{
                      children: item.label,
                      className: "font-body",
                    }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3",
                        "group-data-[state=collapsed]:justify-center"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 bg-background">{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
