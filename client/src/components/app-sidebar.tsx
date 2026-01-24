import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  Network,
  Users,
  Settings,
  FileText,
  ChevronDown,
  ChevronRight,
  Building2,
  HardHat,
  Briefcase,
  BarChart3,
  Calendar,
} from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import type { UserRole } from "@shared/schema";

interface NavItem {
  title: string;
  path?: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  minRole: UserRole;
  children?: NavItem[];
  maxDisplay?: 3 | 5;
}

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    minRole: "viewer",
  },
  {
    title: "Projects",
    icon: FolderKanban,
    minRole: "viewer",
    maxDisplay: 5,
    children: [
      { title: "All Projects", path: "/projects", icon: Briefcase, minRole: "viewer" },
      { title: "Active", path: "/projects?status=active", icon: HardHat, badge: "3", minRole: "viewer" },
      { title: "Completed", path: "/projects?status=completed", icon: Building2, minRole: "viewer" },
      { title: "On Hold", path: "/projects?status=hold", icon: Calendar, minRole: "project_manager" },
      { title: "Analytics", path: "/projects/analytics", icon: BarChart3, minRole: "admin" },
    ],
  },
  {
    title: "WBS Engine",
    icon: Network,
    minRole: "viewer",
    maxDisplay: 3,
    children: [
      { title: "Structure View", path: "/wbs", icon: Network, minRole: "viewer" },
      { title: "Templates", path: "/wbs/templates", icon: FileText, minRole: "project_manager" },
      { title: "Dimensions", path: "/wbs/dimensions", icon: Settings, minRole: "admin" },
    ],
  },
  {
    title: "Team",
    icon: Users,
    minRole: "project_manager",
    maxDisplay: 3,
    children: [
      { title: "Members", path: "/team", icon: Users, minRole: "project_manager" },
      { title: "Roles", path: "/team/roles", icon: Settings, minRole: "admin" },
      { title: "Activity", path: "/team/activity", icon: BarChart3, minRole: "project_manager" },
    ],
  },
  {
    title: "Documents",
    path: "/documents",
    icon: FileText,
    minRole: "viewer",
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    minRole: "admin",
  },
];

const roleHierarchy: Record<UserRole, number> = {
  viewer: 0,
  accountant: 1,
  project_manager: 2,
  admin: 3,
};

interface AppSidebarProps {
  currentUser?: {
    role: UserRole;
    profile: {
      firstName: string | null;
      lastName: string | null;
      jobTitle: string | null;
    };
    email: string;
  };
  tenantName?: string;
}

export function AppSidebar({ currentUser, tenantName = "Acme Construction" }: AppSidebarProps) {
  const [location] = useLocation();
  const { state } = useSidebar();
  const { activeTenant, tenants, setActiveTenant } = useSettings();
  const userRole = currentUser?.role || "viewer";
  const userRoleLevel = roleHierarchy[userRole];

  const filterByRole = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      const itemRoleLevel = roleHierarchy[item.minRole];
      return userRoleLevel >= itemRoleLevel;
    }).map((item) => ({
      ...item,
      children: item.children ? filterByRole(item.children) : undefined,
    }));
  };

  const filteredNav = filterByRole(navigationItems);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path.split("?")[0])) return true;
    return false;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {activeTenant?.config?.branding?.logoUrl ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-md overflow-hidden bg-sidebar-primary">
              <img src={activeTenant.config.branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
          )}
          {state !== "collapsed" && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                {activeTenant?.companyName || "The Maestro"}
              </span>
              {tenants.length > 1 && (
                <select
                  value={activeTenant?.id || ""}
                  onChange={(e) => setActiveTenant(e.target.value)}
                  className="text-xs text-sidebar-foreground/70 bg-transparent border-0 p-0 cursor-pointer hover:text-sidebar-foreground focus:outline-none"
                  data-testid="select-company"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-sidebar text-sidebar-foreground">
                      {t.companyName}
                    </option>
                  ))}
                </select>
              )}
              {tenants.length <= 1 && (
                <span className="text-xs text-sidebar-foreground/70">{tenantName}</span>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNav.map((item) => (
                <NavMenuItem
                  key={item.title}
                  item={item}
                  isActive={isActive}
                  collapsed={state === "collapsed"}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {currentUser?.profile.firstName?.[0] || "U"}
              {currentUser?.profile.lastName?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          {state !== "collapsed" && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser?.profile.firstName || "User"} {currentUser?.profile.lastName || ""}
              </span>
              <span className="text-xs text-sidebar-foreground/60 truncate capitalize">
                {userRole.replace("_", " ")}
              </span>
            </div>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

interface NavMenuItemProps {
  item: NavItem;
  isActive: (path?: string) => boolean;
  collapsed: boolean;
}

function NavMenuItem({ item, isActive, collapsed }: NavMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const active = isActive(item.path) || item.children?.some((c) => isActive(c.path));
  const maxDisplay = item.maxDisplay || 5;
  const visibleChildren = item.children?.slice(0, maxDisplay) || [];
  const hiddenCount = (item.children?.length || 0) - maxDisplay;

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className={active ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {!collapsed && (
                isOpen ? (
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-sidebar-foreground/50" />
                )
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {visibleChildren.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isActive(child.path)}
                    >
                      <Link
                        href={child.path || "#"}
                        data-testid={`nav-${child.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <ChildIcon className="h-4 w-4" />
                        <span>{child.title}</span>
                        {child.badge && (
                          <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                            {child.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
              {hiddenCount > 0 && (
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton className="text-sidebar-foreground/50">
                    <ChevronDown className="h-4 w-4" />
                    <span>{hiddenCount} more...</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Link href={item.path || "#"}>
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
