import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/components/settings-provider";
import {
  Mail,
  Search,
  Paperclip,
  Clock,
  FolderKanban,
  Truck,
  DollarSign,
  Users,
  AlertCircle,
  ChevronRight,
  MailOpen,
  Loader2,
  Inbox,
  RefreshCw,
  Sparkles,
  Calendar,
  Hammer,
  MapPin,
  Building2,
  Layers,
  Grid3x3,
  Cog,
  Settings2,
  Box,
  Layers3,
  Package,
  Tag,
} from "lucide-react";
import { wbsDimensionDefinitions } from "@shared/schema";

interface WbsTag {
  dimensionType: string;
  wbsCodeId: string | null;
  codeName: string;
  codeValue: string;
  confidence: number;
}

interface SmartEmail {
  id: string;
  subject: string;
  from: { name: string; email: string };
  receivedAt: string;
  category: string;
  importance: string;
  isRead: boolean;
  preview: string;
  relatedProject: string | null;
  hasAttachment: boolean;
  labels: string[];
  wbsTags?: WbsTag[];
}

interface InboxResponse {
  emails: SmartEmail[];
  filters: {
    projects: string[];
    vendors: string[];
    customers: string[];
  };
  totalCount: number;
  unreadCount: number;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  all: { icon: Inbox, label: "All Mail", color: "" },
  project: { icon: FolderKanban, label: "Projects", color: "text-blue-500" },
  vendor: { icon: Truck, label: "Vendors", color: "text-amber-500" },
  finance: { icon: DollarSign, label: "Finance", color: "text-green-500" },
  customer: { icon: Users, label: "Customers", color: "text-purple-500" },
};

const dimensionIcons: Record<string, typeof Tag> = {
  phase: Calendar,
  trade: Hammer,
  location: MapPin,
  building: Building2,
  level: Layers,
  zone: Grid3x3,
  system: Cog,
  subsystem: Settings2,
  element_type: Box,
  material: Layers3,
  work_package: Package,
  cost_code: DollarSign,
  responsibility: Users,
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function WbsTagsPanel({ tags }: { tags: WbsTag[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <Card data-testid="card-wbs-tags">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">AI-Suggested WBS Tags</span>
          <Badge variant="outline" className="text-[9px]">
            {tags.length} dimension{tags.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {tags.map((tag, i) => {
            const dimDef = wbsDimensionDefinitions.find(d => d.key === tag.dimensionType);
            const DimIcon = dimensionIcons[tag.dimensionType] || Tag;
            const confidencePercent = Math.round(tag.confidence * 100);

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/50"
                    data-testid={`wbs-tag-${tag.dimensionType}`}
                  >
                    <DimIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground w-20 truncate shrink-0">
                      {dimDef?.label || tag.dimensionType}
                    </span>
                    <Badge variant="secondary" className="text-[9px] truncate">
                      {tag.codeName}
                    </Badge>
                    <span className={`text-[9px] ml-auto shrink-0 ${getConfidenceColor(tag.confidence)}`}>
                      {confidencePercent}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">
                    <strong>{dimDef?.label}:</strong> {tag.codeName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {dimDef?.description} | Confidence: {confidencePercent}%
                  </p>
                  {tag.wbsCodeId && (
                    <p className="text-[10px] text-muted-foreground">
                      Matched to WBS Master Code: {tag.codeValue}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SmartInboxPage() {
  const { activeTenant } = useSettings();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<SmartEmail | null>(null);

  const { data, isLoading, refetch } = useQuery<InboxResponse>({
    queryKey: ["/api/smart-inbox", `?tenantId=${activeTenant?.id || ""}&filter=${activeFilter}&search=${searchQuery}`],
  });

  const emails = data?.emails || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="flex flex-col h-full" data-testid="page-smart-inbox">
      <div className="flex items-center justify-between gap-2 p-4 pb-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold" data-testid="text-inbox-title">Smart Inbox</h1>
          <Badge variant="outline" className="text-[10px]">Microsoft Graph</Badge>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-[10px]" data-testid="badge-unread-count">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} data-testid="button-refresh-inbox">
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">Refresh</span>
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-48 border-r p-2 space-y-1 shrink-0">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = activeFilter === key;
            const count = key === "all"
              ? (data?.totalCount || 0)
              : emails.filter(e => e.category === key).length;

            return (
              <Button
                key={key}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                size="sm"
                onClick={() => setActiveFilter(key)}
                data-testid={`button-filter-${key}`}
              >
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className="text-xs flex-1 text-left">{config.label}</span>
                {count > 0 && (
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                )}
              </Button>
            );
          })}

          <Separator className="my-2" />

          <div className="px-1">
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Linked Projects</p>
            {data?.filters?.projects?.slice(0, 5).map((project, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground py-0.5 truncate cursor-pointer hover:text-foreground"
                onClick={() => setSearchQuery(project)}
                data-testid={`link-project-${i}`}
              >
                {project}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search emails by subject, sender, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-7 text-xs"
                data-testid="input-search-inbox"
              />
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div className={`${selectedEmail ? "w-2/5" : "w-full"} border-r overflow-auto`}>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Inbox className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs">No emails match your criteria</p>
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    className={`flex items-start gap-2 p-2.5 border-b cursor-pointer hover-elevate ${
                      !email.isRead ? "bg-primary/5" : ""
                    } ${selectedEmail?.id === email.id ? "bg-accent/50" : ""}`}
                    onClick={() => setSelectedEmail(email)}
                    data-testid={`email-row-${email.id}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {!email.isRead ? (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      ) : (
                        <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${!email.isRead ? "font-semibold" : ""}`}>
                          {email.from.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(email.receivedAt)}
                        </span>
                      </div>

                      <p className={`text-xs truncate mt-0.5 ${!email.isRead ? "font-medium" : ""}`}>
                        {email.subject}
                      </p>

                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {email.preview}
                      </p>

                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {email.importance === "high" && (
                          <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                        )}
                        {email.hasAttachment && (
                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        {email.wbsTags && email.wbsTags.length > 0 && (
                          <Badge variant="outline" className="text-[9px] py-0 gap-0.5">
                            <Sparkles className="h-2 w-2" />
                            {email.wbsTags.length} WBS
                          </Badge>
                        )}
                        {email.relatedProject && (
                          <Badge variant="outline" className="text-[9px] py-0">
                            {email.relatedProject.length > 15
                              ? email.relatedProject.substring(0, 15) + "..."
                              : email.relatedProject}
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className="text-[9px] py-0"
                        >
                          {email.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedEmail && (
              <div className="flex-1 overflow-auto" data-testid="container-email-detail">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold" data-testid="text-email-subject">
                          {selectedEmail.subject}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {selectedEmail.importance === "high" && (
                            <Badge variant="destructive" className="text-[10px]">High Priority</Badge>
                          )}
                          {selectedEmail.labels.map((label, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{label}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedEmail(null)}
                        data-testid="button-close-detail"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {selectedEmail.from.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium">{selectedEmail.from.name}</p>
                            <p className="text-[10px] text-muted-foreground">{selectedEmail.from.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(selectedEmail.receivedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {selectedEmail.relatedProject && (
                      <Card>
                        <CardContent className="p-2 flex items-center gap-2">
                          <FolderKanban className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs">Related Project: <strong>{selectedEmail.relatedProject}</strong></span>
                        </CardContent>
                      </Card>
                    )}

                    {selectedEmail.wbsTags && selectedEmail.wbsTags.length > 0 && (
                      <WbsTagsPanel tags={selectedEmail.wbsTags} />
                    )}

                    <div className="text-sm leading-relaxed" data-testid="text-email-body">
                      <p>{selectedEmail.preview}</p>
                      <p className="mt-3 text-muted-foreground text-xs">
                        This is a preview from the Microsoft Graph API integration. 
                        Full email content will be available once Microsoft 365 credentials are connected.
                      </p>
                    </div>

                    {selectedEmail.hasAttachment && (
                      <Card>
                        <CardContent className="p-2">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Attachments will appear here with Microsoft 365 integration
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
