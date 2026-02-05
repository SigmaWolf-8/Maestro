import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSettings, type TenantBranding } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Image, RotateCcw, Check, Building2, RefreshCw, Plus, Save, Mail, Link, Unlink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const colorPresets = [
  // Marketing Guru Professional Themes (13 themes)
  { name: "Azure Executive", primary: "217 91% 53%", accent: "188 95% 43%", sidebar: "222 47% 11%", category: "dark", description: "Tech / SaaS" },
  { name: "Emerald Authority", primary: "158 84% 29%", accent: "38 92% 50%", sidebar: "158 50% 12%", category: "dark", description: "Finance / Legal" },
  { name: "Crimson Pulse", primary: "0 72% 51%", accent: "21 90% 48%", sidebar: "224 76% 48%", category: "dark", description: "Healthcare / Data" },
  { name: "Obsidian Pro", primary: "0 0% 0%", accent: "292 84% 40%", sidebar: "30 6% 25%", category: "dark", description: "Consulting / Enterprise" },
  { name: "Violet Vision", primary: "263 70% 58%", accent: "24 94% 53%", sidebar: "174 72% 29%", category: "dark", description: "Creative / Marketing" },
  { name: "Carbon & Flame", primary: "220 9% 34%", accent: "37 91% 43%", sidebar: "0 73% 41%", category: "dark", description: "Manufacturing / Logistics" },
  { name: "Sage & Slate", primary: "85 76% 27%", accent: "174 72% 29%", sidebar: "215 16% 35%", category: "dark", description: "Sustainability / Education" },
  { name: "Sunset Gradient", primary: "21 90% 48%", accent: "142 71% 45%", sidebar: "333 71% 51%", category: "dark", description: "Hospitality / Retail" },
  { name: "Deep Ocean", primary: "224 76% 48%", accent: "84 81% 44%", sidebar: "202 80% 28%", category: "dark", description: "Maritime / Engineering" },
  { name: "Platinum Suite", primary: "220 9% 46%", accent: "31 89% 42%", sidebar: "36 77% 33%", category: "dark", description: "Luxury / Real Estate" },
  { name: "Citron Focus", primary: "84 81% 44%", accent: "0 72% 51%", sidebar: "224 76% 48%", category: "dark", description: "Productivity / Startups" },
  { name: "Orchid Modern", primary: "294 72% 49%", accent: "38 92% 50%", sidebar: "174 72% 29%", category: "dark", description: "Beauty / Fashion" },
  { name: "Arctic Dawn", primary: "199 89% 48%", accent: "160 84% 39%", sidebar: "258 90% 66%", category: "dark", description: "Clean Tech / BioTech" },
  
  // Salvi Theme (#14)
  { name: "Salvi Corporate", primary: "212 61% 35%", accent: "14 10% 34%", sidebar: "212 45% 18%", category: "dark", description: "Salvi Signature" },
  
  // Classic Themes
  { name: "Teal Construction", primary: "168 76% 36%", accent: "28 85% 52%", sidebar: "175 35% 15%", category: "dark", description: "Construction Classic" },
  { name: "Navy Professional", primary: "220 70% 40%", accent: "35 90% 50%", sidebar: "220 40% 12%", category: "dark", description: "Professional Blue" },
  { name: "Forest Green", primary: "142 60% 35%", accent: "38 92% 50%", sidebar: "142 35% 12%", category: "dark", description: "Natural Growth" },
  { name: "Royal Purple", primary: "270 60% 45%", accent: "45 95% 55%", sidebar: "270 35% 15%", category: "dark", description: "Regal Elegance" },
  { name: "Midnight Blue", primary: "230 60% 35%", accent: "45 85% 55%", sidebar: "230 45% 10%", category: "dark", description: "Night Sky" },
  { name: "Monochrome", primary: "0 0% 35%", accent: "0 0% 50%", sidebar: "0 0% 12%", category: "dark", description: "Minimalist" },
  
  // Light Sidebar Themes
  { name: "Cloud White", primary: "210 40% 50%", accent: "200 60% 45%", sidebar: "210 15% 96%", category: "light", description: "Clean & Bright" },
  { name: "Soft Sage", primary: "142 35% 45%", accent: "85 50% 40%", sidebar: "142 20% 94%", category: "light", description: "Calm Nature" },
  { name: "Ocean Mist", primary: "195 55% 45%", accent: "180 50% 40%", sidebar: "195 30% 95%", category: "light", description: "Coastal Fresh" },
  { name: "Pearl Gray", primary: "220 15% 50%", accent: "210 25% 45%", sidebar: "220 10% 95%", category: "light", description: "Elegant Neutral" },
];

const fontOptions = [
  { value: "elegant", label: "Playfair Display", description: "Elegant serif, similar to Felix" },
  { value: "classic", label: "Libre Baskerville", description: "Traditional serif, timeless feel" },
  { value: "modern", label: "Inter", description: "Clean modern sans-serif" },
  { value: "script", label: "Great Vibes", description: "Elegant script, formal occasions" },
  { value: "gotham", label: "Montserrat", description: "Geometric sans-serif, like Gotham" },
  { value: "roboto", label: "Roboto", description: "Friendly and professional" },
  { value: "lato", label: "Lato", description: "Warm and stable sans-serif" },
  { value: "opensans", label: "Open Sans", description: "Neutral and legible" },
  { value: "merriweather", label: "Merriweather", description: "Pleasant reading serif" },
  { value: "raleway", label: "Raleway", description: "Elegant thin sans-serif" },
];

function hslToHex(hslString: string): string {
  try {
    const parts = hslString.trim().split(/\s+/);
    if (parts.length < 3) return "#808080";
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1].replace("%", "")) / 100;
    const l = parseFloat(parts[2].replace("%", "")) / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return "#808080";
  }
}

function hexToHsl(hex: string): string {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "0 0% 50%";

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return "0 0% 50%";
  }
}

export default function Settings() {
  const { activeTenant, updateTenantBranding, updateTenantDetails, createTenant, setActiveTenant, isLoading } = useSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const branding = activeTenant?.config?.branding;
  const [primaryColor, setPrimaryColor] = useState(branding?.primaryColor || "168 76% 36%");
  const [accentColor, setAccentColor] = useState(branding?.secondaryColor || "28 85% 52%");
  const [sidebarColor, setSidebarColor] = useState(branding?.sidebarColor || "175 35% 15%");
  const [headerColor, setHeaderColor] = useState(branding?.headerColor || "0 0% 100%");
  const [companyName, setCompanyName] = useState(activeTenant?.companyName || "");
  const [contactEmail, setContactEmail] = useState(activeTenant?.contactEmail || "");
  const [companyUrl, setCompanyUrl] = useState(activeTenant?.config?.branding?.companyUrl || "");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConnectingM365, setIsConnectingM365] = useState(false);
  const [m365ClientId, setM365ClientId] = useState("");
  const [m365ClientSecret, setM365ClientSecret] = useState("");
  const [m365TenantId, setM365TenantId] = useState("common");
  const [isSavingM365Config, setIsSavingM365Config] = useState(false);
  const [showM365Config, setShowM365Config] = useState(false);

  // Microsoft 365 connection status
  const { data: m365Status, refetch: refetchM365Status } = useQuery<{ connected: boolean; email?: string; configured?: boolean; tenantConfigured?: boolean }>({
    queryKey: ["/api/microsoft/status", activeTenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/microsoft/status?tenantId=${activeTenant?.id || ""}`);
      return res.json();
    },
    enabled: !!activeTenant,
  });

  const handleConnectM365 = () => {
    if (!activeTenant) return;
    setIsConnectingM365(true);
    // Redirect to Microsoft OAuth
    window.location.href = `/api/microsoft/connect?tenantId=${activeTenant.id}`;
  };

  const handleDisconnectM365 = async () => {
    try {
      await apiRequest("POST", "/api/microsoft/disconnect");
      refetchM365Status();
      toast({
        title: "Disconnected",
        description: "Microsoft 365 account has been disconnected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Microsoft 365 account.",
        variant: "destructive",
      });
    }
  };

  const handleSaveM365Config = async () => {
    if (!activeTenant || !m365ClientId.trim() || !m365ClientSecret.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both Client ID and Client Secret.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingM365Config(true);
    try {
      await apiRequest("POST", `/api/tenants/${activeTenant.id}/microsoft-config`, {
        clientId: m365ClientId.trim(),
        clientSecret: m365ClientSecret.trim(),
        tenantId: m365TenantId.trim() || "common",
      });
      refetchM365Status();
      setShowM365Config(false);
      toast({
        title: "Configuration Saved",
        description: "Microsoft 365 credentials have been saved. You can now connect your account.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Microsoft 365 configuration.",
        variant: "destructive",
      });
    } finally {
      setIsSavingM365Config(false);
    }
  };

  useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primaryColor || "168 76% 36%");
      setAccentColor(branding.secondaryColor || "28 85% 52%");
      setSidebarColor(branding.sidebarColor || "175 35% 15%");
      setHeaderColor(branding.headerColor || "0 0% 100%");
    }
  }, [branding]);

  useEffect(() => {
    if (activeTenant) {
      setCompanyName(activeTenant.companyName);
      setContactEmail(activeTenant.contactEmail);
      setCompanyUrl(activeTenant.config?.branding?.companyUrl || "");
    }
  }, [activeTenant]);

  const handleColorPreset = (preset: typeof colorPresets[0]) => {
    updateTenantBranding({
      primaryColor: preset.primary,
      secondaryColor: preset.accent,
      sidebarColor: preset.sidebar,
    });
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    setSidebarColor(preset.sidebar);
    toast({
      title: "Theme Applied",
      description: `Applied "${preset.name}" color scheme to ${activeTenant?.companyName}.`,
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image under 2MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        updateTenantBranding({ logoUrl: reader.result as string });
        toast({
          title: "Logo Updated",
          description: "Your custom logo has been applied.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    updateTenantBranding({ logoUrl: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "Logo Removed",
      description: "Using default icon now.",
    });
  };

  const handleApplyCustomColors = () => {
    updateTenantBranding({
      primaryColor,
      secondaryColor: accentColor,
      sidebarColor,
      headerColor,
    });
    toast({
      title: "Colors Applied",
      description: "Custom colors have been saved.",
    });
  };

  const handleResetToDefaults = () => {
    updateTenantBranding({
      primaryColor: "168 76% 36%",
      secondaryColor: "28 85% 52%",
      sidebarColor: "175 35% 15%",
      headerColor: "0 0% 100%",
      fontStyle: "elegant",
      logoUrl: null,
    });
    setPrimaryColor("168 76% 36%");
    setAccentColor("28 85% 52%");
    setSidebarColor("175 35% 15%");
    setHeaderColor("0 0% 100%");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "Settings Reset",
      description: "All settings restored to defaults.",
    });
  };

  const handleSaveCompanyDetails = () => {
    if (!companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    updateTenantDetails({ companyName: companyName.trim(), contactEmail: contactEmail.trim() });
    if (companyUrl.trim()) {
      updateTenantBranding({ companyUrl: companyUrl.trim() });
    } else {
      updateTenantBranding({ companyUrl: undefined });
    }
    toast({
      title: "Company Updated",
      description: "Company details have been saved.",
    });
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required.",
        variant: "destructive",
      });
      return;
    }
    try {
      const newTenant = await createTenant(newCompanyName.trim(), newCompanyEmail.trim() || undefined);
      setActiveTenant(newTenant.id);
      setIsAddDialogOpen(false);
      setNewCompanyName("");
      setNewCompanyEmail("");
      toast({
        title: "Company Created",
        description: `${newCompanyName} has been added successfully.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create company.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeTenant) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No company selected.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4" data-testid="page-settings">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize appearance for <span className="font-medium">{activeTenant.companyName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-company">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogDescription>
                  Create a new company with its own branding and settings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newCompanyName">Company Name</Label>
                  <Input
                    id="newCompanyName"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g., Blue Sky Construction"
                    data-testid="input-new-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCompanyEmail">Contact Email (optional)</Label>
                  <Input
                    id="newCompanyEmail"
                    type="email"
                    value={newCompanyEmail}
                    onChange={(e) => setNewCompanyEmail(e.target.value)}
                    placeholder="admin@company.com"
                    data-testid="input-new-company-email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCompany} data-testid="button-create-company">
                  Create Company
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleResetToDefaults} data-testid="button-reset-settings">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Company Details</CardTitle>
            </div>
            <CardDescription>
              Edit company name and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@company.com"
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="companyUrl">Company URL</Label>
              <Input
                id="companyUrl"
                type="url"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://www.yourcompany.com"
                data-testid="input-company-url"
              />
              <p className="text-xs text-muted-foreground">
                Click the company logo in the sidebar to open this URL in a fullscreen viewer
              </p>
            </div>
            <Button onClick={handleSaveCompanyDetails} data-testid="button-save-company">
              <Save className="h-4 w-4 mr-2" />
              Save Details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Company Logo</CardTitle>
            </div>
            <CardDescription>
              Upload a custom logo for {activeTenant.companyName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {branding?.logoUrl ? (
                  <div className="w-24 h-24 rounded-md border border-border overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={branding.logoUrl}
                      alt="Custom logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-md border border-dashed border-border bg-muted flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload logo file"
                    data-testid="input-logo-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-logo"
                  >
                    Upload Logo
                  </Button>
                  {branding?.logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      data-testid="button-remove-logo"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, max 2MB
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Typography</CardTitle>
            </div>
            <CardDescription>
              Choose your preferred font style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fontStyle">Font Style</Label>
              <Select
                value={branding?.fontStyle || "elegant"}
                onValueChange={(value: "modern" | "classic" | "elegant") => {
                  updateTenantBranding({ fontStyle: value });
                  toast({
                    title: "Font Updated",
                    description: `Switched to ${fontOptions.find(f => f.value === value)?.label}.`,
                  });
                }}
              >
                <SelectTrigger data-testid="select-font-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-col">
                        <span>{font.label}</span>
                        <span className="text-xs text-muted-foreground">{font.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-md bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <p className="text-2xl font-bold">{activeTenant.companyName}</p>
              <p className="text-sm text-muted-foreground">
                Managing construction projects with elegance and precision.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Color Themes</CardTitle>
            </div>
            <CardDescription>
              Choose a color scheme for {activeTenant.companyName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Dark Sidebars</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {colorPresets.filter(p => p.category === "dark").map((preset) => {
                    const isActive =
                      branding?.primaryColor === preset.primary &&
                      branding?.secondaryColor === preset.accent &&
                      branding?.sidebarColor === preset.sidebar;

                    return (
                      <button
                        key={preset.name}
                        onClick={() => handleColorPreset(preset)}
                        className={`p-3 rounded-md border text-left transition-all hover-elevate ${
                          isActive
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border"
                        }`}
                        data-testid={`button-theme-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-1">
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: `hsl(${preset.primary})` }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: `hsl(${preset.sidebar})` }}
                            />
                          </div>
                          {isActive && (
                            <Badge variant="default" className="ml-auto text-xs py-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-xs">{preset.name}</p>
                        {preset.description && (
                          <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Light Sidebars</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {colorPresets.filter(p => p.category === "light").map((preset) => {
                    const isActive =
                      branding?.primaryColor === preset.primary &&
                      branding?.secondaryColor === preset.accent &&
                      branding?.sidebarColor === preset.sidebar;

                    return (
                      <button
                        key={preset.name}
                        onClick={() => handleColorPreset(preset)}
                        className={`p-3 rounded-md border text-left transition-all hover-elevate ${
                          isActive
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border"
                        }`}
                        data-testid={`button-theme-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-1">
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: `hsl(${preset.primary})` }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: `hsl(${preset.sidebar})` }}
                            />
                          </div>
                          {isActive && (
                            <Badge variant="default" className="ml-auto text-xs py-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-xs">{preset.name}</p>
                        {preset.description && (
                          <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-md bg-muted/50">
              <p className="text-sm font-medium mb-3">Custom Colors</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hslToHex(primaryColor)}
                      onChange={(e) => setPrimaryColor(hexToHsl(e.target.value))}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                      data-testid="picker-primary-color"
                    />
                    <Input
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="168 76% 36%"
                      className="flex-1"
                      data-testid="input-primary-color"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hslToHex(accentColor)}
                      onChange={(e) => setAccentColor(hexToHsl(e.target.value))}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                      data-testid="picker-accent-color"
                    />
                    <Input
                      id="accentColor"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="28 85% 52%"
                      className="flex-1"
                      data-testid="input-accent-color"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sidebarColor">Sidebar Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hslToHex(sidebarColor)}
                      onChange={(e) => setSidebarColor(hexToHsl(e.target.value))}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                      data-testid="picker-sidebar-color"
                    />
                    <Input
                      id="sidebarColor"
                      value={sidebarColor}
                      onChange={(e) => setSidebarColor(e.target.value)}
                      placeholder="175 35% 15%"
                      className="flex-1"
                      data-testid="input-sidebar-color"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headerColor">Header Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hslToHex(headerColor)}
                      onChange={(e) => setHeaderColor(hexToHsl(e.target.value))}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                      data-testid="picker-header-color"
                    />
                    <Input
                      id="headerColor"
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      placeholder="0 0% 100%"
                      className="flex-1"
                      data-testid="input-header-color"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Use the color pickers or enter HSL values directly (e.g., "168 76% 36%").
                </p>
                <Button size="sm" onClick={handleApplyCustomColors} data-testid="button-apply-colors">
                  <Check className="h-4 w-4 mr-2" />
                  Apply Custom Colors
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Microsoft 365 Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Microsoft 365 Integration
          </CardTitle>
          <CardDescription>
            Connect your Microsoft 365 account to send emails directly from the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              {m365Status?.connected ? (
                <>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Connected
                  </p>
                  {m365Status.email && (
                    <p className="text-sm text-muted-foreground">
                      Signed in as {m365Status.email}
                    </p>
                  )}
                </>
              ) : m365Status?.tenantConfigured ? (
                <p className="text-sm text-muted-foreground">
                  Credentials configured. Click "Connect" to sign in with your Microsoft 365 account.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set up your Azure AD credentials to enable email functionality.
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {m365Status?.connected ? (
                <Button variant="outline" onClick={handleDisconnectM365} data-testid="button-disconnect-m365">
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              ) : m365Status?.tenantConfigured ? (
                <Button onClick={handleConnectM365} disabled={isConnectingM365} data-testid="button-connect-m365">
                  {isConnectingM365 ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link className="h-4 w-4 mr-2" />
                  )}
                  Connect Microsoft 365
                </Button>
              ) : null}
              <Button 
                variant={showM365Config ? "secondary" : "outline"} 
                onClick={() => setShowM365Config(!showM365Config)}
                data-testid="button-toggle-m365-config"
              >
                {showM365Config ? "Hide Configuration" : "Configure Credentials"}
              </Button>
            </div>
          </div>

          {/* Configuration Form */}
          {showM365Config && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Azure AD App Registration</h4>
                <p className="text-xs text-muted-foreground">
                  Enter your Azure AD application credentials. 
                  <a 
                    href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline ml-1"
                  >
                    Get credentials from Azure Portal
                  </a>
                </p>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="m365ClientId">Application (Client) ID</Label>
                  <Input
                    id="m365ClientId"
                    value={m365ClientId}
                    onChange={(e) => setM365ClientId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    data-testid="input-m365-client-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m365TenantId">Directory (Tenant) ID</Label>
                  <Input
                    id="m365TenantId"
                    value={m365TenantId}
                    onChange={(e) => setM365TenantId(e.target.value)}
                    placeholder="common (or your tenant ID)"
                    data-testid="input-m365-tenant-id"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="m365ClientSecret">Client Secret</Label>
                <Input
                  id="m365ClientSecret"
                  type="password"
                  value={m365ClientSecret}
                  onChange={(e) => setM365ClientSecret(e.target.value)}
                  placeholder="Enter your client secret value"
                  data-testid="input-m365-client-secret"
                />
                <p className="text-xs text-muted-foreground">
                  Create a secret in Azure Portal → Certificates & secrets → New client secret
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowM365Config(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveM365Config} 
                  disabled={isSavingM365Config || !m365ClientId.trim() || !m365ClientSecret.trim()}
                  data-testid="button-save-m365-config"
                >
                  {isSavingM365Config ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Credentials
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
