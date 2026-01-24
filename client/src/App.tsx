import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsProvider, useSettings } from "@/components/settings-provider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import WBS from "@/pages/wbs";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const mockUser = {
  role: "admin" as const,
  email: "admin@acme.com",
  profile: {
    firstName: "John",
    lastName: "Builder",
    jobTitle: "Construction Manager",
  },
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/wbs" component={WBS} />
      <Route path="/team" component={Team} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeaderBranding() {
  const { settings } = useSettings();
  return (
    <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
      {settings.siteName} ERP
    </span>
  );
}

function AppLayout() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar currentUser={mockUser} tenantName="Acme Construction Co." />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 h-14 px-4 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <HeaderBranding />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="maestro-theme">
        <SettingsProvider>
          <TooltipProvider>
            <AppLayout />
            <Toaster />
          </TooltipProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
