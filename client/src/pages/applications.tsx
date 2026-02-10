import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { useWebViewer } from "@/hooks/use-web-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  FileText,
  FileSpreadsheet,
  Presentation,
  Globe,
  ExternalLink,
  Plus,
  Trash2,
  AppWindow,
  Play,
  type LucideIcon,
} from "lucide-react";
import type { TenantApplication } from "@shared/schema";

const appIconMap: Record<string, LucideIcon> = {
  Mail,
  FileText,
  FileSpreadsheet,
  Presentation,
  Globe,
  ExternalLink,
  AppWindow,
};

const AVAILABLE_PROGRAMS = [
  { name: "Outlook", url: "https://outlook.office.com", iconName: "Mail", category: "o365" },
  { name: "Word", url: "https://www.office.com/launch/word", iconName: "FileText", category: "o365" },
  { name: "Excel", url: "https://www.office.com/launch/excel", iconName: "FileSpreadsheet", category: "o365" },
  { name: "PowerPoint", url: "https://www.office.com/launch/powerpoint", iconName: "Presentation", category: "o365" },
  { name: "SharePoint", url: "https://www.office.com/launch/sharepoint", iconName: "Globe", category: "o365" },
  { name: "OneDrive", url: "https://onedrive.live.com", iconName: "Globe", category: "o365" },
  { name: "OneNote", url: "https://www.office.com/launch/onenote", iconName: "FileText", category: "o365" },
  { name: "Teams", url: "https://teams.microsoft.com", iconName: "Globe", category: "o365" },
  { name: "Planner", url: "https://tasks.office.com", iconName: "AppWindow", category: "o365" },
  { name: "Project", url: "https://project.microsoft.com", iconName: "AppWindow", category: "o365" },
  { name: "Visio", url: "https://www.office.com/launch/visio", iconName: "AppWindow", category: "o365" },
  { name: "Power BI", url: "https://app.powerbi.com", iconName: "AppWindow", category: "microsoft" },
  { name: "Dynamics 365", url: "https://home.dynamics.com", iconName: "AppWindow", category: "microsoft" },
  { name: "Google Drive", url: "https://drive.google.com", iconName: "Globe", category: "google" },
  { name: "Google Docs", url: "https://docs.google.com", iconName: "FileText", category: "google" },
  { name: "Google Sheets", url: "https://sheets.google.com", iconName: "FileSpreadsheet", category: "google" },
  { name: "Gmail", url: "https://mail.google.com", iconName: "Mail", category: "google" },
  { name: "Slack", url: "https://app.slack.com", iconName: "Globe", category: "collaboration" },
  { name: "Notion", url: "https://www.notion.so", iconName: "FileText", category: "collaboration" },
  { name: "Trello", url: "https://trello.com", iconName: "AppWindow", category: "collaboration" },
  { name: "Asana", url: "https://app.asana.com", iconName: "AppWindow", category: "collaboration" },
  { name: "Jira", url: "https://atlassian.net", iconName: "AppWindow", category: "collaboration" },
  { name: "Procore", url: "https://app.procore.com", iconName: "AppWindow", category: "construction" },
  { name: "PlanGrid", url: "https://app.plangrid.com", iconName: "AppWindow", category: "construction" },
  { name: "Bluebeam", url: "https://studio.bluebeam.com", iconName: "AppWindow", category: "construction" },
  { name: "AutoCAD Web", url: "https://web.autocad.com", iconName: "AppWindow", category: "construction" },
];

export default function ApplicationsPage() {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const { openApp } = useWebViewer();
  const [selectedProgram, setSelectedProgram] = useState("");
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  const { data: apps = [], isLoading } = useQuery<TenantApplication[]>({
    queryKey: ["/api/tenant-applications", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/tenant-applications?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; url: string; iconName: string; category: string }) => {
      return apiRequest("POST", `/api/tenant-applications?tenantId=${activeTenant?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-applications", activeTenant?.id] });
      setSelectedProgram("");
      setCustomName("");
      setCustomUrl("");
      setShowCustomForm(false);
      toast({ title: "Application added" });
    },
    onError: () => {
      toast({ title: "Failed to add application", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tenant-applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-applications", activeTenant?.id] });
      toast({ title: "Application removed" });
    },
  });

  const existingNames = new Set(apps.map((a) => a.name));
  const availableToAdd = AVAILABLE_PROGRAMS.filter((p) => !existingNames.has(p.name));

  const handleAddFromList = () => {
    const prog = AVAILABLE_PROGRAMS.find((p) => p.name === selectedProgram);
    if (!prog) return;
    addMutation.mutate(prog);
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customUrl.trim()) return;
    addMutation.mutate({
      name: customName.trim(),
      url: customUrl.trim(),
      iconName: "ExternalLink",
      category: "custom",
    });
  };

  const categoryLabels: Record<string, string> = {
    o365: "Microsoft 365",
    microsoft: "Microsoft",
    google: "Google Workspace",
    collaboration: "Collaboration",
    construction: "Construction",
    custom: "Custom",
  };

  const groupedApps = apps.reduce<Record<string, TenantApplication[]>>((acc, app) => {
    const cat = app.category || "custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(app);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Manage linked applications for quick access from the sidebar
          </p>
        </div>
        <Badge variant="secondary" data-testid="badge-app-count">
          {apps.length} app{apps.length !== 1 ? "s" : ""} linked
        </Badge>
      </div>

      <Card data-testid="card-add-application">
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Add Application</CardTitle>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Select from installed programs</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger data-testid="select-program">
                  <SelectValue placeholder="Choose an application..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.length === 0 ? (
                    <SelectItem value="__none" disabled>All programs already added</SelectItem>
                  ) : (
                    availableToAdd.map((prog) => (
                      <SelectItem key={prog.name} value={prog.name}>
                        {prog.name} ({categoryLabels[prog.category] || prog.category})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddFromList}
              disabled={!selectedProgram || addMutation.isPending}
              data-testid="button-add-program"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="border-t pt-3">
            {!showCustomForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomForm(true)}
                data-testid="button-show-custom-form"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Custom Application
              </Button>
            ) : (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Custom application</label>
                <div className="flex items-end gap-2 flex-wrap">
                  <Input
                    placeholder="Application name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="flex-1 min-w-[150px]"
                    data-testid="input-custom-name"
                  />
                  <Input
                    placeholder="https://..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 min-w-[200px]"
                    data-testid="input-custom-url"
                  />
                  <Button
                    onClick={handleAddCustom}
                    disabled={!customName.trim() || !customUrl.trim() || addMutation.isPending}
                    data-testid="button-add-custom"
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setShowCustomForm(false); setCustomName(""); setCustomUrl(""); }}
                    data-testid="button-cancel-custom"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading applications...</div>
      ) : apps.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No applications linked yet. Add one above.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedApps).map(([category, categoryApps]) => (
            <Card key={category} data-testid={`card-category-${category}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {categoryLabels[category] || category}
                </CardTitle>
                <Badge variant="secondary">{categoryApps.length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {categoryApps.map((app) => {
                    const AppIcon = (app.iconName && appIconMap[app.iconName]) || ExternalLink;
                    return (
                      <div
                        key={app.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-md hover-elevate group"
                        data-testid={`app-row-${app.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <AppIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => openApp(app.url)}
                            className="text-sm font-medium hover:underline flex items-center gap-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                            data-testid={`link-app-${app.name.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {app.name}
                          </button>
                          <span className="text-xs text-muted-foreground truncate block">{app.url}</span>
                        </div>
                        {app.isDefault && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openApp(app.url)}
                          data-testid={`button-launch-${app.name.toLowerCase().replace(/\s+/g, "-")}`}
                          title="Open in viewer"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(app.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${app.name.toLowerCase().replace(/\s+/g, "-")}`}
                          className="visibility-hidden group-hover:visibility-visible"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
