import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
  TrendingUp,
  Megaphone,
  Target,
  Handshake,
  FileSpreadsheet,
  Share2,
  Presentation,
  Mail,
  Globe,
  Palette,
  Sparkles,
  BarChart3,
  DollarSign,
  Wallet,
  Shield,
  AppWindow,
  ExternalLink,
  PenTool,
  Plus,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
import type { UserRole, NavigationItem, TenantApplication } from "@shared/schema";


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
  TrendingUp,
  Megaphone,
  Target,
  Handshake,
  FileSpreadsheet,
  Share2,
  Presentation,
  Mail,
  Globe,
  Palette,
  Sparkles,
  BarChart3,
  DollarSign,
  Wallet,
  Shield,
  AppWindow,
  PenTool,
  Workflow,
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
  onOpenApp?: (url: string) => void;
}

export function AppSidebar({
  currentUser,
  tenantName = "Acme Construction",
  onOpenApp,
}: AppSidebarProps) {
  const [location] = useLocation();
  const { state } = useSidebar();
  const { activeTenant, tenants, setActiveTenant } = useSettings();
  const { user: authUser } = useAuth();
  
  const displayFirstName = authUser?.firstName || currentUser?.profile?.firstName || "User";
  const displayLastName = authUser?.lastName || currentUser?.profile?.lastName || "";
  const userRole = currentUser?.role || "admin";
  const userRoleLevel = roleHierarchy[userRole];

  const { data: navigationItems = [] } = useQuery<NavigationItem[]>({
    queryKey: ["/api/navigation", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/navigation?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch navigation");
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: tenantApps = [] } = useQuery<TenantApplication[]>({
    queryKey: ["/api/tenant-applications", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/tenant-applications?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const navigationTree = useMemo(() => {
    if (navigationItems.length === 0) return [];
    const tree = buildNavigationTree(navigationItems);
    const roleFiltered = filterByRole(tree, userRoleLevel);
    const constrained = enforceChoiceConstraint(roleFiltered);
    return constrained.filter(item => item.path !== "/security/dashboard" && item.title !== "Billing");
  }, [navigationItems, userRoleLevel]);

  const isActive = (path?: string | null) => {
    if (!path) return false;
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path.split("?")[0])) return true;
    return false;
  };

  return (
    <Sidebar collapsible="icon" style={{ background: 'var(--sidebar-gradient, hsl(var(--sidebar)))' }}>
      <SidebarHeader className="p-2 pt-3 border-b-[3px] border-b-black/20 shadow-[inset_0_-6px_12px_rgba(0,0,0,0.25),inset_0_4px_8px_rgba(255,255,255,0.05)]">
        <div className="flex flex-col items-center">
          {activeTenant?.config?.branding?.logoUrl ? (
            <button
              onClick={() => {
                const companyUrl = activeTenant?.config?.branding?.companyUrl;
                if (companyUrl) {
                  window.open(companyUrl, "_blank", "noopener,noreferrer");
                }
              }}
              className={`flex w-full h-[83px] items-center justify-center ${activeTenant?.config?.branding?.companyUrl ? 'cursor-pointer hover-elevate' : 'cursor-default'}`}
              title={activeTenant?.config?.branding?.companyUrl ? "Click to open company website" : undefined}
              data-testid="button-logo-web-viewer"
            >
              <img
                src={activeTenant.config.branding.logoUrl}
                alt="Logo"
                className="max-w-[90%] max-h-[90%] object-contain"
              />
            </button>
          ) : (
            <button
              onClick={() => {
                const companyUrl = activeTenant?.config?.branding?.companyUrl;
                if (companyUrl) {
                  window.open(companyUrl, "_blank", "noopener,noreferrer");
                }
              }}
              className={`flex w-full h-[92px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ${activeTenant?.config?.branding?.companyUrl ? 'cursor-pointer hover-elevate' : 'cursor-default'}`}
              title={activeTenant?.config?.branding?.companyUrl ? "Click to open company website" : undefined}
              data-testid="button-logo-web-viewer"
            >
              <Building2 className="h-14 w-14" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationTree.map((item) => (
                <NavMenuItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  collapsed={state === "collapsed"}
                  tenantApps={tenantApps}
                  onOpenApp={(url) => onOpenApp?.(url)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t-[3px] border-t-black/20 shadow-[inset_0_6px_12px_rgba(0,0,0,0.25),inset_0_-4px_8px_rgba(255,255,255,0.05)]">
        <div className="px-2 py-1 space-y-0.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/security/dashboard")}
                data-testid="nav-plenumnet-security"
                style={{ fontSize: '65%', minHeight: '1.4rem', height: '1.4rem' }}
              >
                <Link href="/security/dashboard">
                  <Shield className="h-2.5 w-2.5" />
                  <span>PlenumNET Security</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/settings")}
                data-testid="nav-settings"
                style={{ fontSize: '70%', minHeight: '1.5rem', height: '1.5rem' }}
              >
                <Link href="/settings">
                  <Settings className="h-3 w-3" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <Link 
            href="/profile" 
            className="flex items-center gap-2 pt-0.5 border-t border-sidebar-border/50 hover-elevate rounded-md px-1.5 py-0.5 -mx-1 cursor-pointer"
            data-testid="nav-profile"
            style={{ fontSize: '80%' }}
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground" style={{ fontSize: '0.55rem' }}>
                {displayFirstName?.[0] || "U"}
                {displayLastName?.[0] || ""}
              </AvatarFallback>
            </Avatar>
            {state !== "collapsed" && (
              <div className="flex flex-col min-w-0 flex-1 leading-tight">
                <span className="font-medium text-sidebar-foreground truncate" style={{ fontSize: '0.7rem', lineHeight: '1rem' }}>
                  {displayFirstName} {displayLastName}
                </span>
                <span className="text-sidebar-foreground/60 truncate capitalize" style={{ fontSize: '0.6rem', lineHeight: '0.85rem' }}>
                  {userRole.replace("_", " ")}
                </span>
              </div>
            )}
          </Link>
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
  tenantApps?: TenantApplication[];
  onOpenApp?: (url: string) => void;
}

function NavMenuItem({ item, isActive, collapsed, tenantApps = [], onOpenApp }: NavMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { setOpen } = useSidebar();
  const Icon = item.icon || Folder;
  const isApplications = item.title === "Applications";
  const hasChildren = (item.children && item.children.length > 0) || isApplications;
  const active =
    isActive(item.path) || item.children?.some((c) => isActive(c.path)) || (isApplications && isActive("/applications"));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && collapsed) {
      setOpen(true);
    }
  };

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
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
              {isApplications ? (
                <>
                  {tenantApps.map((app) => {
                    const AppIcon = (app.iconName && iconMap[app.iconName]) || ExternalLink;
                    return (
                      <SidebarMenuSubItem key={app.id}>
                        <SidebarMenuSubButton
                          className="cursor-pointer"
                          data-testid={`app-link-${app.name.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={() => onOpenApp?.(app.url)}
                        >
                          <AppIcon className="h-4 w-4" />
                          <span>{app.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isActive("/applications")}
                      data-testid="nav-manage-applications"
                    >
                      <Link href="/applications">
                        <Plus className="h-4 w-4" />
                        <span>Manage Apps</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </>
              ) : (
                item.children.map((child) => {
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
                })
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
        asChild={!!item.path}
        isActive={active || false}
        tooltip={item.title}
        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {item.path ? (
          <Link href={item.path}>
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        ) : (
          <>
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
