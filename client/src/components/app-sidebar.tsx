import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Landmark,
  FolderArchive,
  Home,
  CheckSquare,
  Bell,
  Folder,
  GitBranch,
  Calendar,
  FileText,
  Camera,
  Building,
  Truck,
  User,
  HardHat,
  Contact,
  Calculator,
  ClipboardList,
  Receipt,
  CreditCard,
  BarChart,
  Files,
  Map as MapIcon,
  FileCode,
  FileBarChart,
  Archive,
  type LucideIcon,
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
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserRole, NavigationItem } from "@shared/schema";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  Building2,
  Landmark,
  FolderArchive,
  Home,
  CheckSquare,
  Bell,
  Folder,
  GitBranch,
  Calendar,
  FileText,
  Map: MapIcon,
  Camera,
  Building,
  Truck,
  User,
  HardHat,
  Contact,
  Calculator,
  ClipboardList,
  Receipt,
  CreditCard,
  BarChart,
  Files,
  FileCode,
  FileBarChart,
  Archive,
};

interface NavigationTree extends NavigationItem {
  children: NavigationTree[];
  icon?: LucideIcon;
}

const roleHierarchy: Record<UserRole, number> = {
  viewer: 0,
  accountant: 1,
  project_manager: 2,
  admin: 3,
};

function buildNavigationTree(items: NavigationItem[]): NavigationTree[] {
  const itemMap = new Map<string, NavigationTree>();
  const roots: NavigationTree[] = [];

  items.forEach((item) => {
    itemMap.set(item.id, {
      ...item,
      children: [],
      icon: item.iconName ? iconMap[item.iconName] : undefined,
    });
  });

  items.forEach((item) => {
    const node = itemMap.get(item.id)!;
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  roots.forEach((root) => {
    root.children.sort((a, b) => a.itemOrder - b.itemOrder);
  });
  roots.sort((a, b) => a.itemOrder - b.itemOrder);

  return roots;
}

function enforceChoiceConstraint(nodes: NavigationTree[]): NavigationTree[] {
  return nodes.map((node) => {
    if (!node.children || node.children.length === 0) return node;

    const maxDisplay = node.maxChildrenDisplay || 5;
    const sortedChildren = [...node.children].sort(
      (a, b) => a.itemOrder - b.itemOrder
    );

    const visibleChildren = sortedChildren.slice(0, maxDisplay);

    return {
      ...node,
      children: visibleChildren.map((child) =>
        enforceChoiceConstraint([child])[0]
      ),
    };
  });
}

function filterByRole(
  nodes: NavigationTree[],
  userRoleLevel: number
): NavigationTree[] {
  return nodes
    .filter((node) => {
      const nodeRoleLevel = roleHierarchy[node.minRoleRequired as UserRole] || 0;
      return userRoleLevel >= nodeRoleLevel;
    })
    .map((node) => ({
      ...node,
      children: filterByRole(node.children, userRoleLevel),
    }));
}

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

export function AppSidebar({
  currentUser,
  tenantName = "Acme Construction",
}: AppSidebarProps) {
  const [location] = useLocation();
  const { state } = useSidebar();
  const { activeTenant, tenants, setActiveTenant } = useSettings();
  const userRole = currentUser?.role || "admin";
  const userRoleLevel = roleHierarchy[userRole];

  const { data: navigationItems = [] } = useQuery<NavigationItem[]>({
    queryKey: ["/api/navigation", activeTenant?.id],
    queryFn: async () => {
      const url = activeTenant?.id 
        ? `/api/navigation?tenantId=${activeTenant.id}` 
        : "/api/navigation";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch navigation");
      return res.json();
    },
    enabled: true,
  });

  const navigationTree = useMemo(() => {
    if (navigationItems.length === 0) return [];
    const tree = buildNavigationTree(navigationItems);
    const roleFiltered = filterByRole(tree, userRoleLevel);
    return enforceChoiceConstraint(roleFiltered);
  }, [navigationItems, userRoleLevel]);

  const isActive = (path?: string | null) => {
    if (!path) return false;
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path.split("?")[0])) return true;
    return false;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" style={{ background: 'var(--sidebar-gradient, hsl(var(--sidebar)))' }}>
      <SidebarHeader className="p-4">
        <div className="flex flex-col items-center gap-3">
          {activeTenant?.config?.branding?.logoUrl ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg overflow-hidden bg-sidebar-primary shadow-md">
              <img
                src={activeTenant.config.branding.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-md">
              <Building2 className="h-10 w-10" />
            </div>
          )}
          {state !== "collapsed" && (
            <div className="flex flex-col items-center w-full text-center">
              <span className="text-sm font-semibold text-sidebar-foreground truncate max-w-full">
                {activeTenant?.companyName || "The Maestro"}
              </span>
              {tenants.length > 1 && (
                <select
                  value={activeTenant?.id || ""}
                  onChange={(e) => setActiveTenant(e.target.value)}
                  className="text-xs text-sidebar-foreground/70 bg-transparent border-0 p-0 cursor-pointer hover:text-sidebar-foreground focus:outline-none text-center mt-1"
                  data-testid="select-company"
                >
                  {tenants.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      className="bg-sidebar text-sidebar-foreground"
                    >
                      {t.companyName}
                    </option>
                  ))}
                </select>
              )}
              {tenants.length <= 1 && (
                <span className="text-xs text-sidebar-foreground/70 mt-1">
                  {tenantName}
                </span>
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
              {navigationTree.map((item) => (
                <NavMenuItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  collapsed={state === "collapsed"}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/settings")}
                  data-testid="nav-settings"
                >
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                {currentUser?.profile.firstName || "User"}{" "}
                {currentUser?.profile.lastName || ""}
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
  item: NavigationTree;
  isActive: (path?: string | null) => boolean;
  collapsed: boolean;
}

function NavMenuItem({ item, isActive, collapsed }: NavMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon || Folder;
  const hasChildren = item.children && item.children.length > 0;
  const active =
    isActive(item.path) || item.children?.some((c) => isActive(c.path));

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className={
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
              }
              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {!collapsed &&
                (isOpen ? (
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-sidebar-foreground/50" />
                ))}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => {
                const ChildIcon = child.icon || Folder;
                return (
                  <SidebarMenuSubItem key={child.id}>
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
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  if (item.path) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active || false}
          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Link href={item.path}>
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return null;
}
