import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";

export interface Tab {
  id: string;
  path: string;
  title: string;
  icon?: string;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Omit<Tab, "id">) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
}

const TabContext = createContext<TabContextType | null>(null);

const pathToTitle: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "My Tasks",
  "/alerts": "Alerts",
  "/projects": "Projects",
  "/wbs": "Project WBS",
  "/wbs/master-codes": "Master WBS Codes",
  "/wbs/dimensions": "WBS Dimensions",
  "/schedule": "Schedule",
  "/specifications": "Specifications",
  "/photos": "Photos",
  "/people/customers": "Customers",
  "/people/vendors": "Vendors & Pricing",
  "/people/employees": "Employees",
  "/people/subcontractors": "Subcontractors",
  "/people/directory": "Contacts Directory",
  "/finance/estimating": "Estimating",
  "/finance/purchase-orders": "Purchase Orders",
  "/finance/invoicing": "Invoicing",
  "/finance/expenses": "Expenses",
  "/finance/reports": "Reports & GL",
  "/documents": "File Manager",
  "/documents/files": "File Manager",
  "/documents/plans": "Plan Room",
  "/documents/templates": "Templates",
  "/documents/reports": "Reports",
  "/documents/archives": "Archives",
  "/team": "Team",
  "/settings": "Settings",
  "/settings/user-groups": "User Groups",
  "/settings/permissions": "Permissions",
  "/profile": "Profile",
};

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const saved = localStorage.getItem("maestro-tabs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    return localStorage.getItem("maestro-active-tab");
  });

  useEffect(() => {
    localStorage.setItem("maestro-tabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem("maestro-active-tab", activeTabId);
    } else {
      localStorage.removeItem("maestro-active-tab");
    }
  }, [activeTabId]);

  useEffect(() => {
    if (activeTabId && tabs.length > 0 && !tabs.find((t) => t.id === activeTabId)) {
      const matchingTab = tabs.find((t) => t.path === location);
      if (matchingTab) {
        setActiveTabId(matchingTab.id);
      } else if (tabs.length > 0) {
        setActiveTabId(tabs[0].id);
      }
    }
  }, [tabs, activeTabId, location]);

  useEffect(() => {
    const title = pathToTitle[location] || location.split("/").pop() || "Page";
    const existingTab = tabs.find((t) => t.path === location);
    
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTab: Tab = {
        id: `tab-${Date.now()}`,
        path: location,
        title,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  }, [location]);

  const addTab = useCallback((tab: Omit<Tab, "id">) => {
    const existing = tabs.find((t) => t.path === tab.path);
    if (existing) {
      setActiveTabId(existing.id);
      setLocation(tab.path);
      return;
    }
    const newTab: Tab = { ...tab, id: `tab-${Date.now()}` };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setLocation(tab.path);
  }, [tabs, setLocation]);

  const removeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      const newTabs = prev.filter((t) => t.id !== id);
      
      if (activeTabId === id && newTabs.length > 0) {
        const newIndex = Math.min(index, newTabs.length - 1);
        const newActiveTab = newTabs[newIndex];
        setActiveTabId(newActiveTab.id);
        setLocation(newActiveTab.path);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
        setLocation("/");
      }
      
      return newTabs;
    });
  }, [activeTabId, setLocation]);

  const setActiveTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab) {
      setActiveTabId(id);
      setLocation(tab.path);
    }
  }, [tabs, setLocation]);

  const closeOtherTabs = useCallback((id: string) => {
    setTabs((prev) => prev.filter((t) => t.id === id));
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
    setLocation("/");
  }, [setLocation]);

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        addTab,
        removeTab,
        setActiveTab,
        closeOtherTabs,
        closeAllTabs,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabs must be used within a TabProvider");
  }
  return context;
}
