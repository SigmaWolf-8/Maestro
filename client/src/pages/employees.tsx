import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  RefreshCw,
  Shield,
  ClipboardList,
  Award,
  Clock,
  FileText,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { SiBamboo } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BambooEmployee {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  jobTitle: string | null;
  workPhone: string | null;
  workEmail: string | null;
  department: string | null;
  location: string | null;
  division: string | null;
  photoUrl: string | null;
  workPhoneExtension: string | null;
  supervisor: string | null;
  mobilePhone: string | null;
  canUploadPhoto: number;
}

interface BambooField {
  id: string;
  type: string;
  name: string;
}

interface BambooDirectoryResponse {
  fields: BambooField[];
  employees: BambooEmployee[];
}

type SubMenuView = "directory" | "bamboohr" | "roles" | "timeoff" | "documents" | "certifications";

const subMenuItems: { key: SubMenuView; label: string; icon: any; description: string }[] = [
  { key: "directory", label: "Employee Directory", icon: Users, description: "View and manage all employees" },
  { key: "bamboohr", label: "BambooHR", icon: ExternalLink, description: "BambooHR portal integration" },
  { key: "roles", label: "Roles & Permissions", icon: Shield, description: "Manage employee roles" },
  { key: "timeoff", label: "Time Off", icon: Clock, description: "Time off requests and balances" },
  { key: "documents", label: "HR Documents", icon: FileText, description: "Employee documents and forms" },
  { key: "certifications", label: "Certifications", icon: Award, description: "Training and certifications" },
];

export default function EmployeesPage() {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const tenantId = activeTenant?.id;

  const [activeView, setActiveView] = useState<SubMenuView>("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<BambooEmployee | null>(null);
  const [bambooFullscreen, setBambooFullscreen] = useState(false);

  const [isSubMenuCollapsed, setIsSubMenuCollapsed] = useState(() => {
    const saved = localStorage.getItem("maestro-employee-submenu-collapsed");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("maestro-employee-submenu-collapsed", String(isSubMenuCollapsed));
  }, [isSubMenuCollapsed]);

  const { data: bambooConfig } = useQuery<{ configured: boolean; companyDomain: string | null }>({
    queryKey: ["/api/bamboohr/config", tenantId],
    queryFn: async () => {
      if (!tenantId) return { configured: false, companyDomain: null };
      const res = await fetch(`/api/bamboohr/config?tenantId=${tenantId}`);
      if (!res.ok) return { configured: false, companyDomain: null };
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: bambooDirectory, isLoading: directoryLoading, error: directoryError, refetch: refetchDirectory } = useQuery<BambooDirectoryResponse>({
    queryKey: ["/api/bamboohr/directory", tenantId],
    queryFn: async () => {
      if (!tenantId) return { fields: [], employees: [] };
      const res = await fetch(`/api/bamboohr/directory?tenantId=${tenantId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to fetch" }));
        throw new Error(err.error || "Failed to fetch directory");
      }
      return res.json();
    },
    enabled: !!tenantId && !!bambooConfig?.configured,
    retry: false,
  });

  const employees = bambooDirectory?.employees || [];

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = !searchQuery ||
      e.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.workEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === "all" || e.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const bambooUrl = bambooConfig?.companyDomain
    ? `https://${bambooConfig.companyDomain}.bamboohr.com`
    : null;

  const renderSubMenu = () => {
    if (isSubMenuCollapsed) {
      return (
        <div className="border-r flex flex-col items-center py-2 px-1 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSubMenuCollapsed(false)}
            title="Show Employee Menu"
            data-testid="button-expand-employee-submenu"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <div className="mt-2 [writing-mode:vertical-lr] text-xs text-muted-foreground rotate-180 select-none">
            Employee Menu
          </div>
        </div>
      );
    }

    return (
      <div className="w-52 border-r flex flex-col bg-muted/30 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.25),0_1px_0_rgba(255,255,255,0.1)]">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Menu
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSubMenuCollapsed(true)}
              title="Hide Employee Menu"
              data-testid="button-collapse-employee-submenu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {subMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15),inset_-1px_-1px_2px_rgba(255,255,255,0.2)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`button-employee-menu-${item.key}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        {bambooConfig?.configured && (
          <div className="p-2 border-t">
            <div className="rounded-md bg-green-500/10 border border-green-500/20 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">BambooHR Connected</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDirectoryView = () => {
    if (!bambooConfig?.configured) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <Users className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">Connect BambooHR</h3>
              <p className="text-sm text-muted-foreground">
                Connect your BambooHR account to view and manage employee data. Add your BambooHR API key and company subdomain in the environment secrets to get started.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Required secrets:</p>
                <code className="block bg-muted px-2 py-1 rounded">BAMBOOHR_API_KEY</code>
                <code className="block bg-muted px-2 py-1 rounded">BAMBOOHR_COMPANY_DOMAIN</code>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (directoryError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <Users className="h-12 w-12 mx-auto text-destructive/60" />
              <h3 className="text-lg font-semibold">Failed to Load Employees</h3>
              <p className="text-sm text-muted-foreground">
                {(directoryError as Error).message || "Could not connect to BambooHR. Please check your API key and company domain."}
              </p>
              <Button variant="outline" onClick={() => refetchDirectory()} data-testid="button-retry-directory">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                data-testid="input-employee-search"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48 h-9" data-testid="select-department-filter">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs" data-testid="text-employee-count">
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDirectory()}
              disabled={directoryLoading}
              data-testid="button-refresh-directory"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${directoryLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex gap-4 flex-1 overflow-hidden">
          <ScrollArea className="flex-1">
            {directoryLoading ? (
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pr-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredEmployees.length > 0 ? (
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pr-4">
                {filteredEmployees.map((emp) => (
                  <Card
                    key={emp.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedEmployee?.id === emp.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedEmployee(emp)}
                    data-testid={`card-employee-${emp.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {emp.photoUrl && <AvatarImage src={emp.photoUrl} alt={emp.displayName} />}
                          <AvatarFallback className="text-xs">
                            {(emp.firstName?.[0] || "") + (emp.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`text-employee-name-${emp.id}`}>
                            {emp.displayName}
                          </p>
                          {emp.jobTitle && (
                            <p className="text-xs text-muted-foreground truncate">{emp.jobTitle}</p>
                          )}
                          {emp.department && (
                            <Badge variant="secondary" className="text-xs mt-1">{emp.department}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 space-y-0.5">
                        {emp.workEmail && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{emp.workEmail}</span>
                          </div>
                        )}
                        {emp.workPhone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{emp.workPhone}{emp.workPhoneExtension ? ` x${emp.workPhoneExtension}` : ""}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No employees found</p>
                {searchQuery && <p className="text-xs mt-1">Try adjusting your search or filters</p>}
              </div>
            )}
          </ScrollArea>

          {selectedEmployee && (
            <Card className="w-80 flex-shrink-0 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-1px_-1px_3px_rgba(255,255,255,0.15)]">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Employee Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEmployee(null)}
                    className="h-6 w-6"
                    data-testid="button-close-employee-detail"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-16 w-16 mb-2">
                    {selectedEmployee.photoUrl && <AvatarImage src={selectedEmployee.photoUrl} alt={selectedEmployee.displayName} />}
                    <AvatarFallback>
                      {(selectedEmployee.firstName?.[0] || "") + (selectedEmployee.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold" data-testid="text-selected-employee-name">{selectedEmployee.displayName}</p>
                  {selectedEmployee.jobTitle && (
                    <p className="text-sm text-muted-foreground">{selectedEmployee.jobTitle}</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2.5">
                  {selectedEmployee.department && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="text-sm">{selectedEmployee.department}</p>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.division && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Division</p>
                        <p className="text-sm">{selectedEmployee.division}</p>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.location && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm">{selectedEmployee.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.supervisor && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Reports To</p>
                        <p className="text-sm">{selectedEmployee.supervisor}</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {selectedEmployee.workEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a
                          href={`mailto:${selectedEmployee.workEmail}`}
                          className="text-sm text-primary hover:underline"
                          data-testid="link-employee-email"
                        >
                          {selectedEmployee.workEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.workPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Work Phone</p>
                        <p className="text-sm">{selectedEmployee.workPhone}{selectedEmployee.workPhoneExtension ? ` x${selectedEmployee.workPhoneExtension}` : ""}</p>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.mobilePhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Mobile</p>
                        <p className="text-sm">{selectedEmployee.mobilePhone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {bambooUrl && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`${bambooUrl}/employees/employee.php?id=${selectedEmployee.id}`, '_blank')}
                      data-testid="button-view-in-bamboohr"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      View in BambooHR
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderBambooHRView = () => {
    if (!bambooUrl) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <ExternalLink className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">BambooHR Not Configured</h3>
              <p className="text-sm text-muted-foreground">
                Set the <code className="bg-muted px-1 py-0.5 rounded">BAMBOOHR_COMPANY_DOMAIN</code> secret to enable the BambooHR portal view.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className={`flex-1 flex flex-col ${bambooFullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">BambooHR Portal</span>
            <Badge variant="outline" className="text-xs">{bambooConfig?.companyDomain}.bamboohr.com</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBambooFullscreen(!bambooFullscreen)}
              data-testid="button-bamboohr-fullscreen"
            >
              {bambooFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(bambooUrl, '_blank')}
              data-testid="button-bamboohr-external"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <iframe
            src={bambooUrl}
            className="w-full h-full border-0"
            title="BambooHR Portal"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            data-testid="iframe-bamboohr"
          />
        </div>
      </div>
    );
  };

  const renderPlaceholderView = (title: string, icon: any, description: string) => {
    const Icon = icon;
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Icon className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
            <Badge variant="secondary">Coming Soon</Badge>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case "directory":
        return renderDirectoryView();
      case "bamboohr":
        return renderBambooHRView();
      case "roles":
        return renderPlaceholderView("Roles & Permissions", Shield, "Manage employee roles and access permissions for your organization.");
      case "timeoff":
        return renderPlaceholderView("Time Off Management", Clock, "Track time off requests, balances, and approval workflows.");
      case "documents":
        return renderPlaceholderView("HR Documents", FileText, "Store and manage employee documents, contracts, and forms.");
      case "certifications":
        return renderPlaceholderView("Certifications & Training", Award, "Track employee certifications, training records, and compliance.");
      default:
        return renderDirectoryView();
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="page-employees">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-employees-title">
            Employees
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your workforce with BambooHR integration.
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {renderSubMenu()}
        {renderContent()}
      </div>
    </div>
  );
}
