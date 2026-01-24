import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface SiteSettings {
  primaryColor: string;
  accentColor: string;
  sidebarColor: string;
  logoUrl: string | null;
  siteName: string;
  fontStyle: "modern" | "classic" | "elegant";
}

const defaultSettings: SiteSettings = {
  primaryColor: "168 76% 36%",
  accentColor: "28 85% 52%",
  sidebarColor: "175 35% 15%",
  logoUrl: null,
  siteName: "The Maestro",
  fontStyle: "elegant",
};

interface SettingsContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const stored = localStorage.getItem("maestro-settings");
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("maestro-settings", JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    applySettings(settings);
  }, []);

  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
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

function applySettings(settings: SiteSettings) {
  const root = document.documentElement;
  
  root.style.setProperty("--primary", settings.primaryColor);
  root.style.setProperty("--accent", settings.accentColor);
  root.style.setProperty("--sidebar", settings.sidebarColor);
  
  const sidebarHue = parseInt(settings.sidebarColor.split(" ")[0]) || 175;
  const sidebarSat = parseInt(settings.sidebarColor.split(" ")[1]) || 35;
  root.style.setProperty("--sidebar-border", `${sidebarHue} ${sidebarSat - 5}% 20%`);
  root.style.setProperty("--sidebar-accent", `${sidebarHue} ${sidebarSat}% 22%`);
  root.style.setProperty("--sidebar-accent-foreground", `${sidebarHue} 15% 95%`);
  
  const primaryHue = parseInt(settings.primaryColor.split(" ")[0]) || 168;
  root.style.setProperty("--ring", settings.primaryColor);
  root.style.setProperty("--sidebar-ring", settings.primaryColor);
  root.style.setProperty("--sidebar-primary", `${primaryHue} 76% 42%`);
  root.style.setProperty("--chart-1", `${primaryHue} 76% 42%`);
  
  const accentHue = parseInt(settings.accentColor.split(" ")[0]) || 28;
  root.style.setProperty("--chart-2", `${accentHue} 85% 52%`);

  let fontFamily: string;
  switch (settings.fontStyle) {
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
