import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  headerColor: string;
  fontStyle: "modern" | "classic" | "elegant" | "script" | "gotham" | "roboto" | "lato" | "opensans" | "merriweather" | "raleway";
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface WbsDimensionConfig {
  key: string;
  code: string;
  label: string;
  description: string;
  sortOrder: number;
  required: boolean;
}

export interface MicrosoftConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface Tenant {
  id: string;
  subdomain: string;
  companyName: string;
  contactEmail: string;
  config: {
    branding: TenantBranding;
    modules: Record<string, boolean>;
    wbsDimensions: WbsDimensionConfig[];
    microsoft?: MicrosoftConfig;
  };
  storageMode: string;
  onboardingComplete: boolean;
  instanceStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingsContextType {
  activeTenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  setActiveTenant: (tenantId: string) => void;
  updateTenantBranding: (branding: Partial<TenantBranding>) => void;
  updateTenantDetails: (details: { companyName?: string; contactEmail?: string }) => void;
  updateMicrosoftConfig: (config: MicrosoftConfig) => Promise<void>;
  createTenant: (companyName: string, contactEmail?: string) => Promise<Tenant>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultBranding: TenantBranding = {
  primaryColor: "168 76% 36%",
  secondaryColor: "28 85% 52%",
  sidebarColor: "175 35% 15%",
  headerColor: "0 0% 100%",
  fontStyle: "elegant",
  logoUrl: null,
  faviconUrl: null,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    return localStorage.getItem("maestro-active-tenant");
  });

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const activeTenant = tenants.find((t) => t.id === activeTenantId) || tenants[0] || null;

  useEffect(() => {
    if (tenants.length > 0 && !activeTenantId) {
      const firstTenant = tenants[0];
      setActiveTenantId(firstTenant.id);
      localStorage.setItem("maestro-active-tenant", firstTenant.id);
    }
  }, [tenants, activeTenantId]);

  useEffect(() => {
    if (activeTenant) {
      applyBranding(activeTenant.config.branding);
    }
  }, [activeTenant]);

  const updateMutation = useMutation({
    mutationFn: async ({ tenantId, updates }: { tenantId: string; updates: Partial<Tenant> }) => {
      return apiRequest("PATCH", `/api/tenants/${tenantId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ companyName, contactEmail }: { companyName: string; contactEmail?: string }) => {
      const response = await apiRequest("POST", "/api/tenants", { companyName, contactEmail });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
  });

  const setActiveTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    localStorage.setItem("maestro-active-tenant", tenantId);
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      applyBranding(tenant.config.branding);
    }
  };

  const updateTenantBranding = (branding: Partial<TenantBranding>) => {
    if (!activeTenant) return;
    
    const newBranding = { ...activeTenant.config.branding, ...branding };
    const newConfig = { ...activeTenant.config, branding: newBranding };
    
    updateMutation.mutate({ tenantId: activeTenant.id, updates: { config: newConfig } });
    applyBranding(newBranding);
  };

  const updateTenantDetails = (details: { companyName?: string; contactEmail?: string }) => {
    if (!activeTenant) return;
    updateMutation.mutate({ tenantId: activeTenant.id, updates: details });
  };

  const createTenant = async (companyName: string, contactEmail?: string): Promise<Tenant> => {
    const result = await createMutation.mutateAsync({ companyName, contactEmail });
    return result;
  };

  const updateMicrosoftConfig = async (config: MicrosoftConfig): Promise<void> => {
    if (!activeTenant) return;
    
    const newConfig = { ...activeTenant.config, microsoft: config };
    await updateMutation.mutateAsync({ tenantId: activeTenant.id, updates: { config: newConfig } });
  };

  return (
    <SettingsContext.Provider
      value={{
        activeTenant,
        tenants,
        isLoading,
        setActiveTenant,
        updateTenantBranding,
        updateTenantDetails,
        updateMicrosoftConfig,
        createTenant,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

function applyBranding(branding: TenantBranding) {
  const root = document.documentElement;
  
  const primary = branding.primaryColor || defaultBranding.primaryColor;
  const accent = branding.secondaryColor || defaultBranding.secondaryColor;
  const sidebar = branding.sidebarColor || defaultBranding.sidebarColor;
  const header = branding.headerColor || defaultBranding.headerColor;
  
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--sidebar", sidebar);
  root.style.setProperty("--header", header);
  
  // Calculate header foreground based on lightness
  const headerLightness = parseInt(header.split(" ")[2]) || 50;
  const headerForeground = headerLightness > 50 ? "0 0% 10%" : "0 0% 98%";
  root.style.setProperty("--header-foreground", headerForeground);
  
  const sidebarParts = sidebar.split(" ");
  const sidebarHue = parseInt(sidebarParts[0]);
  const sidebarSat = parseInt(sidebarParts[1]);
  const finalSidebarHue = isNaN(sidebarHue) ? 175 : sidebarHue;
  const finalSidebarSat = isNaN(sidebarSat) ? 35 : sidebarSat;
  root.style.setProperty("--sidebar-border", `${finalSidebarHue} ${Math.max(finalSidebarSat - 5, 0)}% 20%`);
  root.style.setProperty("--sidebar-accent", `${finalSidebarHue} ${finalSidebarSat}% 22%`);
  root.style.setProperty("--sidebar-accent-foreground", `${finalSidebarHue} ${Math.min(finalSidebarSat, 15)}% 95%`);
  
  const primaryParts = primary.split(" ");
  const parsedPrimaryHue = parseInt(primaryParts[0]);
  const parsedPrimarySat = parseInt(primaryParts[1]);
  const parsedPrimaryLight = parseInt(primaryParts[2]);
  const primaryHue = isNaN(parsedPrimaryHue) ? 168 : parsedPrimaryHue;
  const primarySat = isNaN(parsedPrimarySat) ? 76 : parsedPrimarySat;
  const primaryLight = isNaN(parsedPrimaryLight) ? 36 : parsedPrimaryLight;
  
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-ring", primary);
  root.style.setProperty("--sidebar-primary", `${primaryHue} ${primarySat}% ${Math.min(primaryLight + 6, 50)}%`);
  root.style.setProperty("--chart-1", `${primaryHue} ${primarySat}% ${Math.min(primaryLight + 6, 50)}%`);
  
  const accentParts = accent.split(" ");
  const parsedAccentHue = parseInt(accentParts[0]);
  const parsedAccentSat = parseInt(accentParts[1]);
  const accentHue = isNaN(parsedAccentHue) ? 28 : parsedAccentHue;
  const accentSat = isNaN(parsedAccentSat) ? 85 : parsedAccentSat;
  root.style.setProperty("--chart-2", `${accentHue} ${accentSat}% 52%`);

  let fontFamily: string;
  switch (branding.fontStyle) {
    case "classic":
      fontFamily = "'Libre Baskerville', 'Georgia', serif";
      break;
    case "elegant":
      fontFamily = "'Playfair Display', 'Georgia', serif";
      break;
    case "script":
      fontFamily = "'Great Vibes', cursive";
      break;
    case "gotham":
      fontFamily = "'Montserrat', 'Arial', sans-serif";
      break;
    case "roboto":
      fontFamily = "'Roboto', 'system-ui', sans-serif";
      break;
    case "lato":
      fontFamily = "'Lato', 'system-ui', sans-serif";
      break;
    case "opensans":
      fontFamily = "'Open Sans', 'system-ui', sans-serif";
      break;
    case "merriweather":
      fontFamily = "'Merriweather', 'Georgia', serif";
      break;
    case "raleway":
      fontFamily = "'Raleway', 'system-ui', sans-serif";
      break;
    case "modern":
    default:
      fontFamily = "'Inter', 'system-ui', sans-serif";
      break;
  }
  root.style.setProperty("--font-sans", fontFamily);
  root.style.setProperty("--font-serif", fontFamily);

  const sidebarLightness = parseInt(sidebar.split(" ")[2]) || 15;
  const isLightSidebar = sidebarLightness > 50;
  
  if (isLightSidebar) {
    root.style.setProperty("--sidebar-foreground", `${sidebarHue} 40% 15%`);
    root.style.setProperty("--sidebar-border", `${sidebarHue} 20% 80%`);
    root.style.setProperty("--sidebar-accent", `${sidebarHue} 25% 88%`);
    root.style.setProperty("--sidebar-accent-foreground", `${sidebarHue} 45% 12%`);
    root.style.setProperty("--sidebar-primary-foreground", `0 0% 100%`);
    root.style.setProperty("--sidebar-gradient", `linear-gradient(180deg, hsl(${sidebar}), hsl(${sidebar}) 30%, hsla(${sidebar.replace("%", "%, ").replace("%", "%, ")}0.85) 60%, hsla(${sidebar.replace("%", "%, ").replace("%", "%, ")}0.7) 100%)`);
  } else {
    root.style.setProperty("--sidebar-foreground", `${sidebarHue} 15% 95%`);
    root.style.setProperty("--sidebar-gradient", `linear-gradient(180deg, hsl(${sidebar}), hsl(${sidebar}) 30%, hsla(${sidebar.replace("%", "%, ").replace("%", "%, ")}0.9) 60%, hsla(${sidebar.replace("%", "%, ").replace("%", "%, ")}0.8) 100%)`);
  }
}
