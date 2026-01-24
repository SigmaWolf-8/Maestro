import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  fontStyle: "modern" | "classic" | "elegant";
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface Tenant {
  id: string;
  subdomain: string;
  companyName: string;
  contactEmail: string;
  config: {
    branding: TenantBranding;
    modules: Record<string, boolean>;
    wbsDimensions: Array<{ key: string; label: string; required: boolean }>;
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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultBranding: TenantBranding = {
  primaryColor: "168 76% 36%",
  secondaryColor: "28 85% 52%",
  sidebarColor: "175 35% 15%",
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
    mutationFn: async ({ tenantId, config }: { tenantId: string; config: Tenant["config"] }) => {
      return apiRequest("PATCH", `/api/tenants/${tenantId}`, { config });
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
    
    updateMutation.mutate({ tenantId: activeTenant.id, config: newConfig });
    applyBranding(newBranding);
  };

  return (
    <SettingsContext.Provider
      value={{
        activeTenant,
        tenants,
        isLoading,
        setActiveTenant,
        updateTenantBranding,
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
  
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--sidebar", sidebar);
  
  const sidebarHue = parseInt(sidebar.split(" ")[0]) || 175;
  const sidebarSat = parseInt(sidebar.split(" ")[1]) || 35;
  root.style.setProperty("--sidebar-border", `${sidebarHue} ${sidebarSat - 5}% 20%`);
  root.style.setProperty("--sidebar-accent", `${sidebarHue} ${sidebarSat}% 22%`);
  root.style.setProperty("--sidebar-accent-foreground", `${sidebarHue} 15% 95%`);
  
  const primaryHue = parseInt(primary.split(" ")[0]) || 168;
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-ring", primary);
  root.style.setProperty("--sidebar-primary", `${primaryHue} 76% 42%`);
  root.style.setProperty("--chart-1", `${primaryHue} 76% 42%`);
  
  const accentHue = parseInt(accent.split(" ")[0]) || 28;
  root.style.setProperty("--chart-2", `${accentHue} 85% 52%`);

  let fontFamily: string;
  switch (branding.fontStyle) {
    case "classic":
      fontFamily = "'Libre Baskerville', 'Georgia', serif";
      break;
    case "elegant":
      fontFamily = "'Playfair Display', 'Georgia', serif";
      break;
    case "modern":
    default:
      fontFamily = "'Inter', 'system-ui', sans-serif";
      break;
  }
  root.style.setProperty("--font-sans", fontFamily);
  root.style.setProperty("--font-serif", fontFamily);
}
