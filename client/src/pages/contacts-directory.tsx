import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Mail, Phone, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DirectoryContact {
  id: string;
  category: "Customer" | "Vendor" | "Employee";
  sortId: number;
  fullName: string;
  company: string;
  email: string;
  phone: string;
  jobTitle: string;
  city: string;
  sourceId: string;
}

interface DirectoryResponse {
  contacts: DirectoryContact[];
  total: number;
  limit: number;
  offset: number;
}

type SortField = "name" | "company" | "category" | "jobTitle" | "email" | "phone";
type SortDirection = "asc" | "desc";

export default function ContactsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 50;

  const queryParams = new URLSearchParams({
    search: searchQuery,
    sortBy,
    sortDirection,
    category,
    limit: limit.toString(),
    offset: (page * limit).toString(),
  }).toString();

  const { data, isLoading } = useQuery<DirectoryResponse>({
    queryKey: ["/api/contacts/directory", searchQuery, sortBy, sortDirection, category, page],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/directory?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  const contacts = data?.contacts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Customer":
        return <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">Customer</Badge>;
      case "Vendor":
        return <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">Vendor</Badge>;
      case "Employee":
        return <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">Employee</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{cat}</Badge>;
    }
  };

  const handlePrintReport = useCallback(() => {
    if (!contacts.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

    const categoryLabel = category === "all" ? "All Categories" :
      category.charAt(0).toUpperCase() + category.slice(1) + "s";
    const title = `Contacts Directory - ${categoryLabel}`;
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${dateStr}  |  ${total} records  |  Sorted by: ${sortBy} (${sortDirection})`, 14, 22);
    doc.setTextColor(0);

    const tableData = contacts.map((c) => [
      c.category,
      c.fullName || "-",
      c.company || "-",
      c.jobTitle || "-",
      c.email || "-",
      c.phone || "-",
    ]);

    autoTable(doc, {
      startY: 27,
      head: [["Type", "Name", "Company", "Title", "Email", "Phone"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 40 },
        4: { cellWidth: 55 },
        5: { cellWidth: 35 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: { pageNumber: number }) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 14,
          doc.internal.pageSize.getHeight() - 8,
          { align: "right" }
        );
        doc.text("The Maestro - Construction ERP", 14, doc.internal.pageSize.getHeight() - 8);
      },
    });

    doc.save(`contacts-directory-${new Date().toISOString().split("T")[0]}.pdf`);
  }, [contacts, category, total, sortBy, sortDirection]);

  const sortableColumns: { field: SortField; label: string; className?: string }[] = [
    { field: "category", label: "Type", className: "w-[60px]" },
    { field: "name", label: "Name" },
    { field: "company", label: "Company" },
    { field: "jobTitle", label: "Title" },
    { field: "email", label: "Email" },
    { field: "phone", label: "Phone" },
  ];

  return (
    <div className="flex flex-col gap-3 p-4" data-testid="page-contacts-directory">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2" data-testid="text-directory-title">
            <Users className="h-5 w-5" />
            Contacts Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Unified list of customers, vendors, and employees.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {total} contacts found
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintReport}
            disabled={!contacts.length || isLoading}
            data-testid="button-print-report"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print Report
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
          <SelectTrigger className="w-32 h-9" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="employee">Employees</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, email, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9 h-9"
            data-testid="input-directory-search"
          />
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {sortableColumns.map((col) => (
                <TableHead
                  key={col.field}
                  className={`py-2 text-xs font-semibold cursor-pointer select-none ${col.className || ""}`}
                  onClick={() => handleSort(col.field)}
                  data-testid={`sort-${col.field}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon field={col.field} />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No contacts found</p>
                  <p className="text-xs">Try adjusting your search or filter criteria</p>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow 
                  key={contact.id} 
                  className="hover-elevate cursor-pointer"
                  data-testid={`row-contact-${contact.id}`}
                >
                  <TableCell className="py-1.5">{getCategoryBadge(contact.category)}</TableCell>
                  <TableCell className="py-1.5 font-medium text-sm">{contact.fullName || "-"}</TableCell>
                  <TableCell className="py-1.5 text-sm text-muted-foreground">{contact.company || "-"}</TableCell>
                  <TableCell className="py-1.5 text-sm text-muted-foreground">{contact.jobTitle || "-"}</TableCell>
                  <TableCell className="py-1.5 text-sm">
                    {contact.email ? (
                      <a 
                        href={`mailto:${contact.email}`} 
                        className="hover:underline flex items-center gap-1"
                        data-testid={`link-email-${contact.id}`}
                      >
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {contact.email}
                      </a>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="py-1.5 text-sm">
                    {contact.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {contact.phone}
                      </span>
                    ) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
