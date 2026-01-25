import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  section: string;
  description?: string;
}

export function PlaceholderPage({ title, section, description }: PlaceholderPageProps) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Badge variant="outline">{section}</Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-muted-foreground" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {description || `The ${title} feature is currently under development.`}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This page is part of the {section} module and will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function TasksPage() {
  return <PlaceholderPage title="My Tasks" section="Dashboard" description="View and manage your assigned tasks across all projects." />;
}

export function AlertsPage() {
  return <PlaceholderPage title="Alerts" section="Dashboard" description="View system notifications and project alerts." />;
}

export function SchedulePage() {
  return <PlaceholderPage title="Schedule" section="Projects" description="View project schedules and timelines." />;
}

export function SpecificationsPage() {
  return <PlaceholderPage title="Specifications" section="Projects" description="Manage project specifications and requirements." />;
}

export function PhotosPage() {
  return <PlaceholderPage title="Photos" section="Projects" description="Browse and upload project photos and documentation." />;
}

export function CustomersPage() {
  return <PlaceholderPage title="Customers" section="People & Contacts" description="Manage customer relationships and contact information." />;
}

export function VendorsPage() {
  return <PlaceholderPage title="Vendors & Pricing" section="People & Contacts" description="Manage vendor relationships and pricing information." />;
}

export function EmployeesPage() {
  return <PlaceholderPage title="Employees" section="People & Contacts" description="View and manage employee information." />;
}

export function SubcontractorsPage() {
  return <PlaceholderPage title="Subcontractors" section="People & Contacts" description="Manage subcontractor relationships and certifications." />;
}

export function ContactsDirectoryPage() {
  return <PlaceholderPage title="Contacts Directory" section="People & Contacts" description="Search and browse all contacts across the organization." />;
}

export function EstimatingPage() {
  return <PlaceholderPage title="Estimating" section="Finance" description="Create and manage project estimates and bids." />;
}

export function PurchaseOrdersPage() {
  return <PlaceholderPage title="Purchase Orders" section="Finance" description="Create and track purchase orders." />;
}

export function InvoicingPage() {
  return <PlaceholderPage title="Invoicing" section="Finance" description="Manage invoices and billing." />;
}

export function ExpensesPage() {
  return <PlaceholderPage title="Expenses" section="Finance" description="Track and categorize expenses." />;
}

export function FinanceReportsPage() {
  return <PlaceholderPage title="Reports & GL" section="Finance" description="Financial reports and general ledger." />;
}

export function FileManagerPage() {
  return <PlaceholderPage title="File Manager" section="Documents" description="Browse and organize project files." />;
}

export function PlanRoomPage() {
  return <PlaceholderPage title="Plan Room" section="Documents" description="View and manage construction plans and blueprints." />;
}


export function DocumentReportsPage() {
  return <PlaceholderPage title="Reports" section="Documents" description="Generate and export document reports." />;
}

export function ArchivesPage() {
  return <PlaceholderPage title="Archives" section="Documents" description="Access archived documents and projects." />;
}
