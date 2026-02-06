import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import heroWatermark from "@/assets/images/hero-executive-home.png";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsProvider, useSettings } from "@/components/settings-provider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { TabProvider } from "@/components/tab-provider";
import { TabBar } from "@/components/tab-bar";
import { CorporateFooter } from "@/components/corporate-footer";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import WBS from "@/pages/wbs";
import WbsDimensions from "@/pages/wbs-dimensions";
import WbsTemplatesPage from "@/pages/wbs-templates";
import MasterWbsCodes from "@/pages/master-wbs-codes";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import UserGroupsPage from "@/pages/user-groups";
import GroupPermissionsPage from "@/pages/group-permissions";
import DocumentsPage from "@/pages/documents";
import FileManagerPage from "@/pages/file-manager";
import CustomersPage from "@/pages/customers";
import VendorsPage from "@/pages/vendors";
import ContactsDirectoryPage from "@/pages/contacts-directory";
import NotFound from "@/pages/not-found";
import {
  TasksPage,
  AlertsPage,
  SchedulePage,
  SpecificationsPage,
  PhotosPage,
  EmployeesPage,
  SubcontractorsPage,
  EstimatingPage,
  PurchaseOrdersPage,
  InvoicingPage,
  ExpensesPage,
  FinanceReportsPage,
  PlanRoomPage,
  DocumentReportsPage,
  ArchivesPage,
  LeadsPage,
  ProposalsPage,
  ContractsPage,
  CRMPage,
  SalesPipelinePage,
  CampaignsPage,
  ReferralsPage,
  SocialMediaPage,
  BrandingPage,
  MarketingAnalyticsPage,
} from "@/pages/placeholder";

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
      <Route path="/tasks" component={TasksPage} />
      <Route path="/alerts" component={AlertsPage} />
      
      <Route path="/projects" component={Projects} />
      <Route path="/wbs" component={WBS} />
      <Route path="/wbs/master-codes" component={MasterWbsCodes} />
      <Route path="/wbs/dimensions" component={WbsDimensions} />
      <Route path="/schedule" component={SchedulePage} />
      <Route path="/specifications" component={SpecificationsPage} />
      <Route path="/photos" component={PhotosPage} />
      
      <Route path="/people/customers" component={CustomersPage} />
      <Route path="/people/vendors" component={VendorsPage} />
      <Route path="/people/employees" component={EmployeesPage} />
      <Route path="/people/subcontractors" component={SubcontractorsPage} />
      <Route path="/people/directory" component={ContactsDirectoryPage} />
      
      <Route path="/finance/estimating" component={EstimatingPage} />
      <Route path="/finance/purchase-orders" component={PurchaseOrdersPage} />
      <Route path="/finance/invoicing" component={InvoicingPage} />
      <Route path="/finance/expenses" component={ExpensesPage} />
      <Route path="/finance/reports" component={FinanceReportsPage} />
      
      <Route path="/sales/leads" component={LeadsPage} />
      <Route path="/sales/proposals" component={ProposalsPage} />
      <Route path="/sales/contracts" component={ContractsPage} />
      <Route path="/sales/crm" component={CRMPage} />
      <Route path="/sales/pipeline" component={SalesPipelinePage} />
      
      <Route path="/marketing/campaigns" component={CampaignsPage} />
      <Route path="/marketing/referrals" component={ReferralsPage} />
      <Route path="/marketing/social" component={SocialMediaPage} />
      <Route path="/marketing/branding" component={BrandingPage} />
      <Route path="/marketing/analytics" component={MarketingAnalyticsPage} />
      
      <Route path="/documents" component={FileManagerPage} />
      <Route path="/documents/files" component={FileManagerPage} />
      <Route path="/documents/plans" component={PlanRoomPage} />
      <Route path="/documents/templates" component={WbsTemplatesPage} />
      <Route path="/documents/reports" component={DocumentReportsPage} />
      <Route path="/documents/archives" component={ArchivesPage} />
      
      <Route path="/team" component={Team} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/user-groups" component={UserGroupsPage} />
      <Route path="/settings/permissions" component={GroupPermissionsPage} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeaderBranding() {
  const { activeTenant, tenants, setActiveTenant } = useSettings();
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-foreground hidden sm:inline">
        The Maestro
      </span>
      {tenants.length > 1 && (
        <select
          value={activeTenant?.id || ""}
          onChange={(e) => setActiveTenant(e.target.value)}
          className="text-xs text-muted-foreground bg-transparent border border-border rounded px-2 py-1 cursor-pointer hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          data-testid="select-company-header"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id} className="bg-background text-foreground">
              {t.companyName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function ZoomControl() {
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('maestro-zoom');
    return saved ? parseInt(saved) : 100;
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom}%`;
    localStorage.setItem('maestro-zoom', zoom.toString());
  }, [zoom]);

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setZoom(Math.max(70, zoom - 10))}
        data-testid="button-zoom-out"
        className="h-7 w-7"
      >
        <span className="text-xs font-medium">−</span>
      </Button>
      <span className="text-xs w-10 text-center" data-testid="text-zoom-level">{zoom}%</span>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setZoom(Math.min(150, zoom + 10))}
        data-testid="button-zoom-in"
        className="h-7 w-7"
      >
        <span className="text-xs font-medium">+</span>
      </Button>
    </div>
  );
}

function AppLayout() {
  const sidebarStyle = {
    "--sidebar-width": "12rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar currentUser={mockUser} tenantName="Acme Construction Co." />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 h-14 px-4 border-b border-border shrink-0" style={{ backgroundColor: 'hsl(var(--header))', color: 'hsl(var(--header-foreground))' }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <HeaderBranding />
            </div>
            <div className="flex items-center gap-3">
              <ZoomControl />
              <ThemeToggle />
            </div>
          </header>
          <TabBar />
          <main className="flex-1 overflow-auto flex flex-col relative">
            <div 
              className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{
                backgroundImage: `url(${heroWatermark})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
              }}
            />
            <div className="flex-1 relative z-10">
              <Router />
            </div>
            <CorporateFooter />
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
            <TabProvider>
              <AppLayout />
            </TabProvider>
            <Toaster />
          </TooltipProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
