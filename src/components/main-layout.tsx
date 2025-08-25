
"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Settings, Warehouse, LayoutDashboard, BarChart, FileText, ShoppingCart, Bookmark, Gem, Users, LogOut, History } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/meal-planner", label: "Meal Planner", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingCart },
  { href: "/nutrition", label: "Nutrition", icon: BarChart },
  { href: "/saved-recipes", label: "Saved Recipes", icon: Bookmark },
  { href: "/history", label: "History", icon: History },
  { href: "/personal-details", label: "Personal Details", icon: FileText },
  { href: "/household", label: "Household", icon: Users },
  { href: "/subscriptions", label: "Subscriptions", icon: Gem },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    const auth = getAuth(app);
    try {
      await signOut(auth);
      // The onAuthStateChanged listener in AuthProvider will handle clearing the session cookie.
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred while logging out. Please try again.",
      });
    }
  };

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
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem asChild>
                <SidebarMenuButton onClick={handleLogout}
                    tooltip={{
                      children: "Log Out",
                      className: "font-body",
                    }}
                >
                    <LogOut className="h-5 w-5" />
                    <span className="group-data-[state=collapsed]:hidden">Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 bg-background">
          <div className="w-full max-w-[108rem] mx-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
