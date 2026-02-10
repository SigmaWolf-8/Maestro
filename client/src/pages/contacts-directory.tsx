import { Fragment, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Mail, Phone, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Printer, GripVertical, Layers, X } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from "@/components/settings-provider";

interface DirectoryContact {
  id: string;
  category: "Customer" | "Vendor" | "Employee";
  sortId: number;
  firstName: string;
  lastName: string;
  company: string;
  jobNumber: string;
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

type SortField = "firstName" | "lastName" | "company" | "jobNumber" | "category" | "jobTitle" | "email" | "phone" | "city";
type SortDirection = "asc" | "desc";

interface ColumnDef {
  field: SortField;
  label: string;
  className?: string;
}

const groupableFields: { field: SortField; label: string }[] = [
  { field: "category", label: "Type" },
  { field: "company", label: "Company" },
  { field: "jobTitle", label: "Title" },
  { field: "city", label: "City" },
];

const defaultColumns: ColumnDef[] = [
  { field: "category", label: "Type", className: "w-[80px]" },
  { field: "firstName", label: "First Name" },
  { field: "lastName", label: "Last Name" },
  { field: "company", label: "Company" },
  { field: "jobNumber", label: "Job #", className: "w-[80px]" },
  { field: "jobTitle", label: "Title" },
  { field: "email", label: "Email", className: "w-[160px]" },
  { field: "phone", label: "Phone", className: "w-[150px]" },
];

function hslStringToRgb(hslStr: string): [number, number, number] {
  const parts = hslStr.trim().split(/\s+/);
  const h = parseFloat(parts[0]) || 0;
  const s = (parseFloat(parts[1]) || 0) / 100;
  const l = (parseFloat(parts[2]) || 0) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export default function ContactsDirectoryPage() {
  const { activeTenant } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [groupByFields, setGroupByFields] = useState<SortField[]>([]);
  const dragStartRef = useRef<number | null>(null);
  const limit = 50;

  const tenantId = activeTenant?.id || "";
  const groupByParam = groupByFields.join(",");
  const effectiveLimit = groupByFields.length > 0 ? 9999 : limit;
  const effectiveOffset = groupByFields.length > 0 ? 0 : page * limit;
  const queryParams = new URLSearchParams({
    tenantId,
    search: searchQuery,
    sortBy,
    sortDirection,
    category,
    limit: effectiveLimit.toString(),
    offset: effectiveOffset.toString(),
    ...(groupByParam ? { groupBy: groupByParam } : {}),
  }).toString();

  const { data, isLoading } = useQuery<DirectoryResponse>({
    queryKey: ["/api/contacts/directory", tenantId, searchQuery, sortBy, sortDirection, category, page, groupByParam],
    enabled: !!tenantId,
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

  const toggleGroupByField = (field: SortField) => {
    setGroupByFields(prev => {
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      }
      return [...prev, field];
    });
    setPage(0);
  };

  const clearGroupBy = () => {
    setGroupByFields([]);
    setPage(0);
  };

  const getGroupLabel = (field: SortField): string => {
    const found = groupableFields.find(g => g.field === field);
    return found?.label || field;
  };

  const handleDragStart = (index: number) => {
    dragStartRef.current = index;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (dropIndex: number) => {
    const startIndex = dragStartRef.current;
    if (startIndex === null || startIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newCols = [...columns];
    const [moved] = newCols.splice(startIndex, 1);
    newCols.splice(dropIndex, 0, moved);
    setColumns(newCols);
    setDragIndex(null);
    setDragOverIndex(null);
    dragStartRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragStartRef.current = null;
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

  const getCellValue = (contact: DirectoryContact, field: SortField) => {
    switch (field) {
      case "category":
        return getCategoryBadge(contact.category);
      case "firstName":
        return <span className="font-medium text-sm">{contact.firstName || "-"}</span>;
      case "lastName":
        return <span className="font-medium text-sm">{contact.lastName || "-"}</span>;
      case "company":
        return <span className="text-sm text-muted-foreground">{contact.company || "-"}</span>;
      case "jobNumber":
        return contact.jobNumber ? (
          <span className="text-sm font-mono text-muted-foreground">{contact.jobNumber}</span>
        ) : <span className="text-sm">-</span>;
      case "jobTitle":
        return <span className="text-sm text-muted-foreground">{contact.jobTitle || "-"}</span>;
      case "email":
        return contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="hover:underline flex items-center gap-1 text-sm"
            data-testid={`link-email-${contact.id}`}
          >
            <Mail className="h-3 w-3 text-muted-foreground" />
            {contact.email}
          </a>
        ) : <span className="text-sm">-</span>;
      case "phone":
        return contact.phone ? (
          <span className="flex items-center gap-1 text-sm font-mono">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {contact.phone}
          </span>
        ) : <span className="text-sm">-</span>;
    }
  };

  const getRawCellValue = (contact: DirectoryContact, field: SortField): string => {
    switch (field) {
      case "category": return contact.category;
      case "firstName": return contact.firstName || "-";
      case "lastName": return contact.lastName || "-";
      case "company": return contact.company || "-";
      case "jobNumber": return contact.jobNumber || "-";
      case "jobTitle": return contact.jobTitle || "-";
      case "email": return contact.email || "-";
      case "phone": return contact.phone || "-";
      case "city": return contact.city || "-";
    }
  };

  const buildGroupedRows = () => {
    if (groupByFields.length === 0) return null;
    const groups = new Map<string, DirectoryContact[]>();
    contacts.forEach(c => {
      const key = groupByFields.map(f => getRawCellValue(c, f) || "-").join(" / ");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    return sortedKeys.map(key => ({
      groupLabel: key,
      contacts: groups.get(key)!,
    }));
  };

  const groupedData = buildGroupedRows();

  const handlePrintReport = useCallback(() => {
    if (!contacts.length) return;

    const branding = activeTenant?.config?.branding;
    const primaryHsl = branding?.primaryColor || "168 76% 36%";
    const headerRgb = hslStringToRgb(primaryHsl);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

    const categoryLabel = category === "all" ? "All Categories" :
      category.charAt(0).toUpperCase() + category.slice(1) + "s";
    const companyName = activeTenant?.companyName || "The Maestro";
    const title = `${companyName} - Contacts Directory`;
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    doc.setFontSize(16);
    doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    let subtitle = `${categoryLabel}  |  Generated: ${dateStr}  |  ${total} records  |  Sorted by: ${sortBy} (${sortDirection})`;
    if (groupByFields.length > 0) {
      subtitle += `  |  Grouped by: ${groupByFields.map(f => getGroupLabel(f)).join(", ")}`;
    }
    doc.text(subtitle, 14, 22);
    doc.setTextColor(0);

    const isTypeFiltered = category !== "all";
    const isTypeSorted = sortBy === "category";
    const suppressType = isTypeFiltered || isTypeSorted;

    const pdfColumns = columns
      .filter(col => {
        if (suppressType && col.field === "category") return false;
        if (col.field === "firstName") return false;
        return true;
      })
      .map(col => {
        if (col.field === "lastName") return { ...col, field: "lastName" as SortField, label: "Name" };
        return col;
      });

    const headLabels = pdfColumns.map(col => col.label);

    const getPdfCellValue = (c: DirectoryContact, field: SortField): string => {
      if (field === "lastName") {
        const fn = c.firstName || "";
        const ln = c.lastName || "";
        return `${fn} ${ln}`.trim() || "-";
      }
      return getRawCellValue(c, field);
    };

    const tableData: string[][] = [];

    if (groupByFields.length > 0) {
      const groups = new Map<string, DirectoryContact[]>();
      contacts.forEach(c => {
        const key = groupByFields.map(f => getRawCellValue(c, f) || "-").join(" / ");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      });
      const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
      sortedKeys.forEach(key => {
        const groupRow = pdfColumns.map(() => "");
        groupRow[0] = `--- ${key} ---`;
        tableData.push(groupRow);
        groups.get(key)!.forEach(c => {
          tableData.push(pdfColumns.map(col => getPdfCellValue(c, col.field)));
        });
      });
    } else if (isTypeSorted && !isTypeFiltered) {
      let lastTypeValue = "";
      contacts.forEach((c) => {
        if (c.category !== lastTypeValue) {
          lastTypeValue = c.category;
          const groupRow = pdfColumns.map(() => "");
          groupRow[0] = `--- ${c.category} ---`;
          tableData.push(groupRow);
        }
        tableData.push(pdfColumns.map(col => getPdfCellValue(c, col.field)));
      });
    } else {
      contacts.forEach(c => {
        tableData.push(pdfColumns.map(col => getPdfCellValue(c, col.field)));
      });
    }

    const totalAvailableWidth = doc.internal.pageSize.getWidth() - 28;
    const colCount = pdfColumns.length;
    const colWidth = totalAvailableWidth / colCount;
    const colStyles: Record<number, { cellWidth: number }> = {};
    pdfColumns.forEach((col, i) => {
      if (col.field === "phone") {
        colStyles[i] = { cellWidth: Math.max(colWidth, 32) };
      } else if (col.field === "jobNumber") {
        colStyles[i] = { cellWidth: Math.max(colWidth, 18) };
      } else {
        colStyles[i] = { cellWidth: colWidth };
      }
    });

    autoTable(doc, {
      startY: 27,
      head: [headLabels],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: headerRgb, textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: colStyles,
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.cell.text[0]?.startsWith("--- ")) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [
            Math.min(255, headerRgb[0] + 180),
            Math.min(255, headerRgb[1] + 180),
            Math.min(255, headerRgb[2] + 180),
          ];
          data.cell.styles.textColor = headerRgb;
        }
      },
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
        doc.text(`${companyName} - Construction ERP`, 14, doc.internal.pageSize.getHeight() - 8);
      },
    });

    doc.save(`contacts-directory-${new Date().toISOString().split("T")[0]}.pdf`);
  }, [contacts, columns, category, total, sortBy, sortDirection, activeTenant, groupByFields]);

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
          <SelectTrigger className="w-32" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="employee">Employees</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={groupByFields.length > 0 ? "default" : "outline"}
              size="sm"
              data-testid="button-group-by"
            >
              <Layers className="h-4 w-4 mr-1.5" />
              Group By{groupByFields.length > 0 ? ` (${groupByFields.length})` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Group contacts by:</p>
              {groupableFields.map(gf => (
                <label
                  key={gf.field}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                  data-testid={`checkbox-group-${gf.field}`}
                >
                  <Checkbox
                    checked={groupByFields.includes(gf.field)}
                    onCheckedChange={() => toggleGroupByField(gf.field)}
                  />
                  {gf.label}
                </label>
              ))}
              {groupByFields.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearGroupBy}
                  className="mt-1 text-xs"
                  data-testid="button-clear-group-by"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Grouping
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {groupByFields.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {groupByFields.map(f => (
              <Badge
                key={f}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => toggleGroupByField(f)}
                data-testid={`badge-group-${f}`}
              >
                {getGroupLabel(f)}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, email, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9"
            data-testid="input-directory-search"
          />
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col, index) => (
                <TableHead
                  key={col.field}
                  className={`py-1.5 px-2 text-xs font-semibold cursor-pointer select-none ${col.className || ""} ${dragOverIndex === index ? "bg-primary/10" : ""} ${dragIndex === index ? "opacity-50" : ""}`}
                  onClick={() => handleSort(col.field)}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  data-testid={`sort-${col.field}`}
                >
                  <span className="flex items-center gap-1">
                    <GripVertical className="h-3 w-3 opacity-30 cursor-grab" data-testid={`drag-${col.field}`} />
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
                  {columns.map((col) => (
                    <TableCell key={col.field}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No contacts found</p>
                  <p className="text-xs">Try adjusting your search or filter criteria</p>
                </TableCell>
              </TableRow>
            ) : groupedData ? (
              groupedData.map((group) => (
                <Fragment key={`group-${group.groupLabel}`}>
                  <TableRow
                    className="bg-muted/70 border-t"
                    data-testid={`group-header-${group.groupLabel.replace(/[^a-zA-Z0-9-]/g, "_")}`}
                  >
                    <TableCell
                      colSpan={columns.length}
                      className="py-1 px-2 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="h-3 w-3 text-muted-foreground" />
                        {group.groupLabel}
                        <span className="text-muted-foreground font-normal">({group.contacts.length})</span>
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="hover-elevate cursor-pointer"
                      data-testid={`row-contact-${contact.id}`}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.field} className="py-1 px-2">
                          {getCellValue(contact, col.field)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="hover-elevate cursor-pointer"
                  data-testid={`row-contact-${contact.id}`}
                >
                  {columns.map((col) => (
                    <TableCell key={col.field} className="py-1 px-2">
                      {getCellValue(contact, col.field)}
                    </TableCell>
                  ))}
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
