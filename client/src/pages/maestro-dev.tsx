import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Globe,
  Clock,
  Activity,
  Server,
  Code,
  FileText,
  Lock,
  Zap,
  Database,
  GitBranch,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  DollarSign,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import BillingDashboard from "./billing-dashboard";

const KONG_BASE_URL = "https://kong-9e76b3c08eusfq1zu.kongcloud.dev";

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  category: string;
  auth?: boolean;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: "GET", path: "/api/tenants", description: "List all tenants", category: "Tenants", auth: true },
  { method: "GET", path: "/api/tenants/:id", description: "Get tenant by ID", category: "Tenants", auth: true },
  { method: "PATCH", path: "/api/tenants/:id", description: "Update tenant", category: "Tenants", auth: true },
  { method: "POST", path: "/api/tenants", description: "Create new tenant", category: "Tenants", auth: true },
  { method: "POST", path: "/api/tenants/:id/seed-navigation", description: "Seed default navigation for tenant", category: "Tenants", auth: true },
  { method: "POST", path: "/api/tenants/:id/apply-company-type", description: "Apply company type and regenerate navigation", category: "Tenants", auth: true },
  { method: "GET", path: "/api/navigation", description: "Get navigation items for tenant", category: "Navigation", auth: true },
  { method: "GET", path: "/api/dashboard/stats", description: "Get dashboard statistics", category: "Dashboard", auth: true },
  { method: "GET", path: "/api/projects", description: "List all projects", category: "Projects", auth: true },
  { method: "GET", path: "/api/projects/:id", description: "Get project by ID", category: "Projects", auth: true },
  { method: "POST", path: "/api/projects", description: "Create new project", category: "Projects", auth: true },
  { method: "PATCH", path: "/api/projects/:id", description: "Update project", category: "Projects", auth: true },
  { method: "DELETE", path: "/api/projects/:id", description: "Delete project", category: "Projects", auth: true },
  { method: "POST", path: "/api/projects/:projectId/copy-master-wbs", description: "Copy master WBS codes to project", category: "Projects", auth: true },
  { method: "GET", path: "/api/wbs", description: "List WBS nodes (filterable by project/tenant)", category: "WBS", auth: true },
  { method: "GET", path: "/api/wbs/:id", description: "Get WBS node by ID", category: "WBS", auth: true },
  { method: "POST", path: "/api/wbs", description: "Create WBS node", category: "WBS", auth: true },
  { method: "PATCH", path: "/api/wbs/:id", description: "Update WBS node", category: "WBS", auth: true },
  { method: "DELETE", path: "/api/wbs/:id", description: "Delete WBS node", category: "WBS", auth: true },
  { method: "GET", path: "/api/wbs-templates", description: "List WBS templates", category: "WBS Templates", auth: true },
  { method: "GET", path: "/api/wbs-templates/:id", description: "Get WBS template by ID", category: "WBS Templates", auth: true },
  { method: "POST", path: "/api/wbs-templates", description: "Create WBS template", category: "WBS Templates", auth: true },
  { method: "PATCH", path: "/api/wbs-templates/:id", description: "Update WBS template", category: "WBS Templates", auth: true },
  { method: "DELETE", path: "/api/wbs-templates/:id", description: "Delete WBS template", category: "WBS Templates", auth: true },
  { method: "GET", path: "/api/wbs-codes", description: "List master WBS codes", category: "WBS Codes", auth: true },
  { method: "GET", path: "/api/wbs-codes/:id", description: "Get WBS code by ID", category: "WBS Codes", auth: true },
  { method: "POST", path: "/api/wbs-codes/seed/:tenantId", description: "Seed master WBS codes for tenant", category: "WBS Codes", auth: true },
  { method: "GET", path: "/api/team", description: "List team members", category: "Team", auth: true },
  { method: "GET", path: "/api/team/:id", description: "Get team member by ID", category: "Team", auth: true },
  { method: "POST", path: "/api/team", description: "Create team member", category: "Team", auth: true },
  { method: "GET", path: "/api/customers", description: "List customers", category: "Customers", auth: true },
  { method: "GET", path: "/api/customers/job/:jobNum", description: "Get customer by job number", category: "Customers", auth: true },
  { method: "POST", path: "/api/customers", description: "Create customer", category: "Customers", auth: true },
  { method: "PATCH", path: "/api/customers/field", description: "Update customer field (auto-save)", category: "Customers", auth: true },
  { method: "PATCH", path: "/api/customers/:id", description: "Update customer", category: "Customers", auth: true },
  { method: "DELETE", path: "/api/customers/:id", description: "Delete customer", category: "Customers", auth: true },
  { method: "POST", path: "/api/customers/seed", description: "Seed sample customers", category: "Customers", auth: true },
  { method: "GET", path: "/api/vendors", description: "List vendors", category: "Vendors", auth: true },
  { method: "GET", path: "/api/vendors/:id", description: "Get vendor with contacts", category: "Vendors", auth: true },
  { method: "POST", path: "/api/vendors", description: "Create vendor", category: "Vendors", auth: true },
  { method: "PATCH", path: "/api/vendors/:id", description: "Update vendor", category: "Vendors", auth: true },
  { method: "PATCH", path: "/api/vendors/:id/field", description: "Update vendor field (auto-save)", category: "Vendors", auth: true },
  { method: "DELETE", path: "/api/vendors/:id", description: "Delete vendor", category: "Vendors", auth: true },
  { method: "POST", path: "/api/vendors/seed", description: "Seed sample vendors", category: "Vendors", auth: true },
  { method: "GET", path: "/api/vendors/:vendorId/contacts", description: "List vendor contacts", category: "Vendor Contacts", auth: true },
  { method: "POST", path: "/api/vendors/:vendorId/contacts", description: "Create vendor contact", category: "Vendor Contacts", auth: true },
  { method: "PATCH", path: "/api/vendor-contacts/:id", description: "Update vendor contact", category: "Vendor Contacts", auth: true },
  { method: "DELETE", path: "/api/vendor-contacts/:id", description: "Delete vendor contact", category: "Vendor Contacts", auth: true },
  { method: "GET", path: "/api/quotes", description: "List quotes", category: "Quotes", auth: true },
  { method: "GET", path: "/api/quotes/job/:jobNum", description: "Get quotes by job number", category: "Quotes", auth: true },
  { method: "POST", path: "/api/quotes", description: "Create quote", category: "Quotes", auth: true },
  { method: "PATCH", path: "/api/quotes/field", description: "Update quote field (auto-save)", category: "Quotes", auth: true },
  { method: "PATCH", path: "/api/quotes/:id", description: "Update quote", category: "Quotes", auth: true },
  { method: "DELETE", path: "/api/quotes/:id", description: "Delete quote", category: "Quotes", auth: true },
  { method: "GET", path: "/api/documents", description: "List documents", category: "Documents", auth: true },
  { method: "GET", path: "/api/documents/:id", description: "Get document by ID", category: "Documents", auth: true },
  { method: "POST", path: "/api/documents", description: "Upload document (with optional Kong encryption)", category: "Documents", auth: true },
  { method: "GET", path: "/api/documents/:id/decrypt", description: "Decrypt and download document", category: "Documents", auth: true },
  { method: "GET", path: "/api/documents/filter", description: "Filter documents by WBS dimensions", category: "Documents", auth: true },
  { method: "POST", path: "/api/documents/:id/meta-tags", description: "Update document WBS meta-tags", category: "Documents", auth: true },
  { method: "GET", path: "/api/contacts/directory", description: "Get unified contacts directory", category: "Contacts", auth: true },
  { method: "POST", path: "/api/email/send", description: "Send email via SMTP or Microsoft 365", category: "Email", auth: true },
  { method: "GET", path: "/api/smtp/status", description: "Get SMTP configuration status", category: "Email", auth: true },
  { method: "POST", path: "/api/tenants/:id/smtp-config", description: "Save SMTP configuration", category: "Email", auth: true },
  { method: "GET", path: "/api/user-groups", description: "List user groups", category: "User Groups", auth: true },
  { method: "GET", path: "/api/user-groups/:id", description: "Get user group by ID", category: "User Groups", auth: true },
  { method: "POST", path: "/api/user-groups", description: "Create user group", category: "User Groups", auth: true },
  { method: "PATCH", path: "/api/user-groups/:id", description: "Update user group", category: "User Groups", auth: true },
  { method: "DELETE", path: "/api/user-groups/:id", description: "Delete user group", category: "User Groups", auth: true },
  { method: "GET", path: "/api/user-groups/:groupId/members", description: "List group members", category: "User Groups", auth: true },
  { method: "POST", path: "/api/user-groups/:groupId/members", description: "Add member to group", category: "User Groups", auth: true },
  { method: "DELETE", path: "/api/user-groups/:groupId/members/:userId", description: "Remove member from group", category: "User Groups", auth: true },
  { method: "GET", path: "/api/user-groups/:groupId/permissions", description: "Get group permissions", category: "Permissions", auth: true },
  { method: "POST", path: "/api/user-groups/:groupId/permissions", description: "Set group permissions", category: "Permissions", auth: true },
  { method: "PATCH", path: "/api/permissions/:id", description: "Update permission", category: "Permissions", auth: true },
  { method: "DELETE", path: "/api/permissions/:id", description: "Delete permission", category: "Permissions", auth: true },
  { method: "POST", path: "/api/dimensions/propagate", description: "Propagate WBS dimensions to nodes", category: "WBS Dimensions", auth: true },
  { method: "GET", path: "/api/kong/timestamp", description: "Get high-precision timestamp from Kong", category: "Kong Gateway" },
  { method: "GET", path: "/api/kong/stats", description: "Get compression/encryption statistics", category: "Kong Gateway" },
  { method: "GET", path: "/api/kong/docs", description: "Get Kong API documentation", category: "Kong Gateway" },
  { method: "GET", path: "/api/kong/phase-config/:mode", description: "Get phase encryption config", category: "Kong Gateway" },
  { method: "GET", path: "/api/microsoft/status", description: "Get Microsoft 365 connection status", category: "Microsoft 365" },
  { method: "GET", path: "/api/microsoft/auth-url", description: "Get Microsoft OAuth URL", category: "Microsoft 365" },
  { method: "GET", path: "/api/microsoft/callback", description: "Handle Microsoft OAuth callback", category: "Microsoft 365" },
  { method: "POST", path: "/api/microsoft/connect", description: "Connect Microsoft 365 account", category: "Microsoft 365" },
  { method: "POST", path: "/api/microsoft/disconnect", description: "Disconnect Microsoft 365 account", category: "Microsoft 365" },
  { method: "GET", path: "/api/microsoft/connected", description: "Check Microsoft 365 connection", category: "Microsoft 365" },
  { method: "GET", path: "/api/microsoft/files", description: "List OneDrive files", category: "Microsoft 365" },
  { method: "POST", path: "/api/microsoft/upload", description: "Upload file to OneDrive", category: "Microsoft 365" },
  { method: "GET", path: "/api/microsoft/edit-url/:fileId", description: "Get Office Online edit URL", category: "Microsoft 365" },
  { method: "POST", path: "/api/microsoft/sync/:fileId", description: "Sync file from OneDrive", category: "Microsoft 365" },
  { method: "GET", path: "/api/auth/user", description: "Get authenticated user", category: "Authentication" },
  { method: "PATCH", path: "/api/auth/profile", description: "Update user profile", category: "Authentication" },
  { method: "GET", path: "/api/auth/email-config", description: "Get user email configuration", category: "Authentication" },
  { method: "POST", path: "/api/auth/email-config", description: "Save user email configuration", category: "Authentication" },
  { method: "DELETE", path: "/api/auth/email-config", description: "Delete user email configuration", category: "Authentication" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PATCH: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  PUT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold min-w-[42px] text-center ${METHOD_COLORS[method] || "bg-muted text-muted-foreground"}`}>
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span
      onClick={handleCopy}
      className="inline-flex items-center justify-center cursor-pointer rounded-md p-1 invisible group-hover/row:visible transition-colors"
      data-testid="button-copy-path"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </span>
  );
}

function ApiCategorySection({ category, endpoints }: { category: string; endpoints: ApiEndpoint[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div data-testid={`api-category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left py-1 hover-elevate rounded px-1"
        data-testid={`button-toggle-${category.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="text-xs font-semibold">{category}</span>
        <Badge variant="secondary" className="text-[10px]">{endpoints.length}</Badge>
      </button>
      {expanded && (
        <div className="ml-5 space-y-0.5 mt-0.5">
          {endpoints.map((ep, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 group/row" data-testid={`api-row-${ep.method.toLowerCase()}-${ep.path.replace(/[/:]/g, '-')}`}>
              <MethodBadge method={ep.method} />
              <code className="text-xs font-mono text-muted-foreground flex-1 truncate">{ep.path}</code>
              {ep.auth && <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />}
              <span className="text-[10px] text-muted-foreground hidden lg:inline">{ep.description}</span>
              <CopyButton text={ep.path} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MaestroDevPage() {
  const [apiFilter, setApiFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"kong" | "github" | "api-docs" | "billing">("kong");

  const { data: kongTimestamp, isLoading: timestampLoading, refetch: refetchTimestamp } = useQuery<any>({
    queryKey: ["/api/kong/timestamp"],
    refetchInterval: false,
  });

  const { data: kongStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/kong/stats"],
    refetchInterval: false,
  });

  useQuery<any>({
    queryKey: ["/api/kong/docs"],
  });

  const categories = API_ENDPOINTS.reduce<Record<string, ApiEndpoint[]>>((acc, ep) => {
    if (!acc[ep.category]) acc[ep.category] = [];
    acc[ep.category].push(ep);
    return acc;
  }, {});

  const filteredCategories = Object.entries(categories).reduce<Record<string, ApiEndpoint[]>>((acc, [cat, eps]) => {
    if (!apiFilter) {
      acc[cat] = eps;
      return acc;
    }
    const filtered = eps.filter(
      (ep) =>
        ep.path.toLowerCase().includes(apiFilter.toLowerCase()) ||
        ep.description.toLowerCase().includes(apiFilter.toLowerCase()) ||
        ep.method.toLowerCase().includes(apiFilter.toLowerCase()) ||
        cat.toLowerCase().includes(apiFilter.toLowerCase())
    );
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {});

  const totalEndpoints = API_ENDPOINTS.length;
  const filteredCount = Object.values(filteredCategories).reduce((sum, eps) => sum + eps.length, 0);

  const tabs = [
    { id: "kong" as const, label: "Kong Konnect Gateway", icon: Shield },
    { id: "github" as const, label: "GitHub & Repository", icon: GitBranch },
    { id: "api-docs" as const, label: "API Reference", icon: Code },
    { id: "billing" as const, label: "Billing", icon: DollarSign },
  ];

  return (
    <div className="flex flex-col gap-3 p-4" data-testid="page-maestro-dev">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold tracking-tight" data-testid="text-maestro-title">
            Developer Management Console
          </h1>
        </div>
        <Badge variant="outline" className="text-[10px]">Internal</Badge>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "kong" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5" />
                  Gateway Status
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Endpoint</span>
                  <code className="text-[10px] font-mono truncate max-w-[200px]" data-testid="text-kong-url">{KONG_BASE_URL}</code>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge variant={kongTimestamp ? "default" : "secondary"} className="text-[10px]" data-testid="badge-kong-status">
                    {timestampLoading ? "Checking..." : kongTimestamp ? "Connected" : "Unavailable"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Protocol</span>
                  <span className="text-xs">HTTPS/TLS 1.3</span>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.open(`${KONG_BASE_URL}/api/docs`, '_blank')} data-testid="button-open-kong">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Gateway Docs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5" />
                  Precision Timestamp
                  <Button variant="ghost" size="icon" onClick={() => refetchTimestamp()} className="ml-auto" data-testid="button-refresh-timestamp">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 space-y-1.5">
                {timestampLoading ? (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                ) : kongTimestamp?.timestamp ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Human</span>
                      <span className="text-[10px] font-mono" data-testid="text-timestamp-human">{kongTimestamp.timestamp.humanReadable}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">ISO</span>
                      <span className="text-[10px] font-mono">{kongTimestamp.timestamp.isoDate}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Precision</span>
                      <span className="text-[10px]">{kongTimestamp.timestamp.precision}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Femtoseconds</span>
                      <code className="text-[10px] font-mono truncate max-w-[140px]">{kongTimestamp.timestamp.femtoseconds}</code>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Unavailable</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-3.5 w-3.5" />
                  Compression Stats
                  <Button variant="ghost" size="icon" onClick={() => refetchStats()} className="ml-auto" data-testid="button-refresh-stats">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 space-y-1.5">
                {statsLoading ? (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                ) : kongStats ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Total Runs</span>
                      <span className="text-xs font-semibold" data-testid="text-total-runs">{kongStats.totalRuns?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Avg Savings</span>
                      <span className="text-xs font-semibold">{kongStats.avgSavings || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Data Processed</span>
                      <span className="text-xs">{kongStats.totalDataProcessed ? `${(kongStats.totalDataProcessed / 1024).toFixed(1)} KB` : "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Total Savings</span>
                      <span className="text-xs">{kongStats.totalSavings ? `${(kongStats.totalSavings / 1024).toFixed(1)} KB` : "N/A"}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Unavailable</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lock className="h-3.5 w-3.5" />
                  Phase Encryption Services
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0">
                <div className="space-y-1.5">
                  {[
                    { mode: "high_security", desc: "Maximum security with full phase rotation", icon: Shield },
                    { mode: "balanced", desc: "Optimal balance of security and performance", icon: Zap },
                    { mode: "performance", desc: "Fast processing with standard encryption", icon: Activity },
                    { mode: "adaptive", desc: "Auto-adjusts based on data characteristics", icon: RefreshCw },
                  ].map((item) => (
                    <div key={item.mode} className="flex items-center gap-2 py-1 border-b last:border-b-0" data-testid={`encryption-mode-${item.mode}`}>
                      <item.icon className="h-3 w-3 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-xs font-medium">{item.mode}</span>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]" data-testid={`badge-mode-${item.mode}`}>Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Server className="h-3.5 w-3.5" />
                  Kong API Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0">
                <div className="space-y-1">
                  {[
                    { path: "/api/timing/timestamp", method: "GET", desc: "High-precision femtosecond timestamp" },
                    { path: "/api/phase/split", method: "POST", desc: "Encrypt/split data via phase rotation" },
                    { path: "/api/phase/recombine", method: "POST", desc: "Decrypt/recombine phase-split data" },
                    { path: "/api/phase/config/:mode", method: "GET", desc: "Get encryption config by mode" },
                    { path: "/api/ternary/convert", method: "POST", desc: "Ternary number system conversion" },
                    { path: "/api/demo/stats", method: "GET", desc: "Compression benchmark statistics" },
                    { path: "/api/docs", method: "GET", desc: "Full API documentation" },
                  ].map((ep) => (
                    <div key={ep.path} className="flex items-center gap-2 py-0.5 group/row" data-testid={`kong-endpoint-${ep.path.replace(/[/:]/g, '-')}`}>
                      <MethodBadge method={ep.method} />
                      <code className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{ep.path}</code>
                      <CopyButton text={`${KONG_BASE_URL}${ep.path}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {kongStats?.recentBenchmarks?.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-3.5 w-3.5" />
                  Recent Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 font-medium text-muted-foreground">Dataset</th>
                        <th className="text-right py-1 font-medium text-muted-foreground">Binary</th>
                        <th className="text-right py-1 font-medium text-muted-foreground">Ternary</th>
                        <th className="text-right py-1 font-medium text-muted-foreground">Savings</th>
                        <th className="text-right py-1 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kongStats.recentBenchmarks.slice(0, 5).map((b: any) => (
                        <tr key={b.id} className="border-b last:border-b-0">
                          <td className="py-1 font-mono">{b.datasetName}</td>
                          <td className="py-1 text-right">{b.binarySizeBytes} B</td>
                          <td className="py-1 text-right">{b.ternarySizeBytes} B</td>
                          <td className="py-1 text-right font-semibold">{b.savingsPercent?.toFixed(1)}%</td>
                          <td className="py-1 text-right">{b.processingTimeMs}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "github" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <SiGithub className="h-3.5 w-3.5" />
                  Repository Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Project</span>
                  <span className="text-xs font-medium" data-testid="text-project-name">The Maestro - Construction ERP</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Stack</span>
                  <span className="text-xs" data-testid="text-stack">React + Express + PostgreSQL</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">TypeScript</span>
                  <Badge variant="default" className="text-[10px]" data-testid="badge-typescript">Strict Mode</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">ORM</span>
                  <span className="text-xs">Drizzle ORM</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">UI Framework</span>
                  <span className="text-xs">shadcn/ui + Tailwind CSS</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">State Management</span>
                  <span className="text-xs">TanStack Query v5</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Auth</span>
                  <span className="text-xs">Replit OIDC + Microsoft 365</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-3.5 w-3.5" />
                  Architecture Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 space-y-2">
                <div className="space-y-1">
                  <div className="text-xs font-medium">Project Structure</div>
                  <div className="font-mono text-[10px] text-muted-foreground space-y-0.5 pl-2">
                    <div>client/src/ - React frontend (Vite)</div>
                    <div className="pl-3">pages/ - Page components</div>
                    <div className="pl-3">components/ - Shared components</div>
                    <div className="pl-3">lib/ - Utilities &amp; query client</div>
                    <div>server/ - Express backend</div>
                    <div className="pl-3">routes.ts - API route handlers</div>
                    <div className="pl-3">storage.ts - Data access layer</div>
                    <div className="pl-3">kong-service.ts - Kong proxy client</div>
                    <div className="pl-3">db.ts - Database connection</div>
                    <div>shared/ - Common types &amp; schemas</div>
                    <div className="pl-3">schema.ts - Drizzle ORM models</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="text-xs font-medium">Database Tables</div>
                  <div className="flex flex-wrap gap-1">
                    {["tenants", "tenant_users", "projects", "wbs_nodes", "navigation_items", "role_permissions", "wbs_templates", "user_groups", "user_group_members", "group_permissions", "documents", "document_meta_tags", "wbs_master_codes", "customers", "quotes", "vendors", "vendor_contacts", "users", "sessions"].map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] font-mono">{t}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5" />
                Key Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5 border rounded-md p-2" data-testid="card-integration-kong">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Kong Konnect Gateway</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Phase-rotation encryption, ternary compression, femtosecond timestamping. Provides security gateway for all document operations.</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">Encryption</Badge>
                    <Badge variant="secondary" className="text-[10px]">Compression</Badge>
                    <Badge variant="secondary" className="text-[10px]">Timestamping</Badge>
                  </div>
                </div>
                <div className="space-y-1.5 border rounded-md p-2" data-testid="card-integration-microsoft">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Microsoft 365</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Azure AD SSO, OneDrive file storage, Office Online document editing (Word, Excel, PowerPoint) via OAuth2.</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">SSO</Badge>
                    <Badge variant="secondary" className="text-[10px]">OneDrive</Badge>
                    <Badge variant="secondary" className="text-[10px]">Office Online</Badge>
                  </div>
                </div>
                <div className="space-y-1.5 border rounded-md p-2" data-testid="card-integration-github">
                  <div className="flex items-center gap-1.5">
                    <SiGithub className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">GitHub Integration</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Source control, CI/CD pipeline, issue tracking, and automated deployments. Repository management and code review workflows.</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">Source Control</Badge>
                    <Badge variant="secondary" className="text-[10px]">CI/CD</Badge>
                    <Badge variant="secondary" className="text-[10px]">Issues</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-3.5 w-3.5" />
                Development Standards
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium">Frontend Conventions</div>
                  <ul className="text-[10px] text-muted-foreground space-y-0.5 pl-3 list-disc">
                    <li>shadcn/ui components with Tailwind CSS</li>
                    <li>TanStack Query v5 for server state (object form queries)</li>
                    <li>wouter for client-side routing</li>
                    <li>Zod schemas for form validation via react-hook-form</li>
                    <li>data-testid attributes on all interactive elements</li>
                    <li>Dark mode support via CSS variables</li>
                    <li>Multi-tenant branding via SettingsProvider</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium">Backend Conventions</div>
                  <ul className="text-[10px] text-muted-foreground space-y-0.5 pl-3 list-disc">
                    <li>Express.js with TypeScript strict mode</li>
                    <li>Drizzle ORM for database operations</li>
                    <li>Storage interface pattern for data access</li>
                    <li>Zod validation on all request bodies</li>
                    <li>Kong proxy for document security</li>
                    <li>Session-based authentication via Passport.js</li>
                    <li>Multi-tenant data isolation by tenantId</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "api-docs" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Code className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter endpoints..."
                value={apiFilter}
                onChange={(e) => setApiFilter(e.target.value)}
                className="h-7 pl-8 text-xs"
                data-testid="input-api-filter"
              />
            </div>
            <span className="text-[10px] text-muted-foreground" data-testid="text-endpoint-count">
              {filteredCount} / {totalEndpoints} endpoints
            </span>
          </div>

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Code className="h-3.5 w-3.5" />
                API Reference
                <div className="ml-auto flex gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">REST</Badge>
                  <Badge variant="outline" className="text-[10px]">JSON</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 pt-0">
              <div className="space-y-2">
                {Object.entries(filteredCategories).map(([category, endpoints]) => (
                  <ApiCategorySection key={category} category={category} endpoints={endpoints} />
                ))}
                {Object.keys(filteredCategories).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Code className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No endpoints match your filter</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lock className="h-3.5 w-3.5" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 space-y-1.5">
                <p className="text-[10px] text-muted-foreground">Most API endpoints require authentication via session cookies. The authentication flow uses Replit OIDC (OpenID Connect).</p>
                <div className="space-y-0.5">
                  <div className="text-xs font-medium">Auth Flow</div>
                  <div className="font-mono text-[10px] text-muted-foreground space-y-0.5 pl-2">
                    <div>1. GET /login - Redirect to OIDC provider</div>
                    <div>2. GET /login/callback - Handle OIDC callback</div>
                    <div>3. Session cookie set automatically</div>
                    <div>4. GET /api/auth/user - Verify session</div>
                    <div>5. POST /logout - End session</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-3.5 w-3.5" />
                  Data Model Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 space-y-1.5">
                <p className="text-[10px] text-muted-foreground">All data models use UUID primary keys (varchar 36). Multi-tenant isolation is enforced via tenantId on all records.</p>
                <div className="space-y-0.5">
                  <div className="text-xs font-medium">Common Patterns</div>
                  <div className="font-mono text-[10px] text-muted-foreground space-y-0.5 pl-2">
                    <div>id: varchar(36) PRIMARY KEY</div>
                    <div>tenantId: varchar(36) NOT NULL FK</div>
                    <div>createdAt: timestamp DEFAULT now()</div>
                    <div>updatedAt: timestamp DEFAULT now()</div>
                    <div>config: jsonb (flexible metadata)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <BillingDashboard embedded />
      )}
    </div>
  );
}
