import { useState, useRef } from "react";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Image, RotateCcw, Check, Building2 } from "lucide-react";

const colorPresets = [
  { name: "Teal Construction", primary: "168 76% 36%", accent: "28 85% 52%", sidebar: "175 35% 15%" },
  { name: "Navy Professional", primary: "220 70% 40%", accent: "35 90% 50%", sidebar: "220 40% 12%" },
  { name: "Forest Green", primary: "142 60% 35%", accent: "38 92% 50%", sidebar: "142 35% 12%" },
  { name: "Royal Purple", primary: "270 60% 45%", accent: "45 95% 55%", sidebar: "270 35% 15%" },
  { name: "Sunset Orange", primary: "24 85% 45%", accent: "180 70% 40%", sidebar: "24 40% 15%" },
  { name: "Slate Modern", primary: "215 20% 45%", accent: "200 80% 50%", sidebar: "215 25% 12%" },
];

const fontOptions = [
  { value: "elegant", label: "Playfair Display", description: "Elegant serif, similar to Felix" },
  { value: "classic", label: "Libre Baskerville", description: "Traditional serif, timeless feel" },
  { value: "modern", label: "Inter", description: "Clean modern sans-serif" },
];

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [siteName, setSiteName] = useState(settings.siteName);

  const handleColorPreset = (preset: typeof colorPresets[0]) => {
    updateSettings({
      primaryColor: preset.primary,
      accentColor: preset.accent,
      sidebarColor: preset.sidebar,
    });
    toast({
      title: "Theme Applied",
      description: `Applied "${preset.name}" color scheme.`,
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
        updateSettings({ logoUrl: reader.result as string });
        toast({
          title: "Logo Updated",
          description: "Your custom logo has been applied.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    updateSettings({ logoUrl: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "Logo Removed",
      description: "Using default icon now.",
    });
  };

  const handleSiteNameSave = () => {
    updateSettings({ siteName });
    toast({
      title: "Site Name Updated",
      description: `Site name changed to "${siteName}".`,
    });
  };

  const handleReset = () => {
    resetSettings();
    setSiteName("The Maestro");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "Settings Reset",
      description: "All settings restored to defaults.",
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" data-testid="page-settings">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize your ERP appearance and branding
          </p>
        </div>
        <Button variant="outline" onClick={handleReset} data-testid="button-reset-settings">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Site Identity</CardTitle>
            </div>
            <CardDescription>
              Customize your site name and logo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <div className="flex gap-2">
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Enter site name"
                  data-testid="input-site-name"
                />
                <Button onClick={handleSiteNameSave} size="icon" aria-label="Save site name" data-testid="button-save-site-name">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custom Logo</Label>
              <div className="flex items-center gap-4">
                {settings.logoUrl ? (
                  <div className="w-16 h-16 rounded-md border border-border overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={settings.logoUrl}
                      alt="Custom logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-md border border-dashed border-border bg-muted flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground" />
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
                  {settings.logoUrl && (
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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fontStyle">Font Style</Label>
              <Select
                value={settings.fontStyle}
                onValueChange={(value: "modern" | "classic" | "elegant") => {
                  updateSettings({ fontStyle: value });
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
              <p className="text-2xl font-bold">The Maestro ERP</p>
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
              Choose a color scheme that matches your brand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {colorPresets.map((preset) => {
                const isActive =
                  settings.primaryColor === preset.primary &&
                  settings.accentColor === preset.accent &&
                  settings.sidebarColor === preset.sidebar;

                return (
                  <button
                    key={preset.name}
                    onClick={() => handleColorPreset(preset)}
                    className={`p-4 rounded-md border text-left transition-all hover-elevate ${
                      isActive
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                    data-testid={`button-theme-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1">
                        <div
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: `hsl(${preset.primary})` }}
                        />
                        <div
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: `hsl(${preset.accent})` }}
                        />
                        <div
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: `hsl(${preset.sidebar})` }}
                        />
                      </div>
                      {isActive && (
                        <Badge variant="default" className="ml-auto text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm">{preset.name}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-md bg-muted/50">
              <p className="text-sm font-medium mb-3">Custom Colors</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color (HSL)</Label>
                  <Input
                    id="primaryColor"
                    value={settings.primaryColor}
                    onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                    placeholder="168 76% 36%"
                    data-testid="input-primary-color"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color (HSL)</Label>
                  <Input
                    id="accentColor"
                    value={settings.accentColor}
                    onChange={(e) => updateSettings({ accentColor: e.target.value })}
                    placeholder="28 85% 52%"
                    data-testid="input-accent-color"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sidebarColor">Sidebar Color (HSL)</Label>
                  <Input
                    id="sidebarColor"
                    value={settings.sidebarColor}
                    onChange={(e) => updateSettings({ sidebarColor: e.target.value })}
                    placeholder="175 35% 15%"
                    data-testid="input-sidebar-color"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter colors in HSL format: Hue Saturation% Lightness% (e.g., "168 76% 36%"). Use presets above for best results.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
