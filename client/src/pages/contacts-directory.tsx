import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Building2, User, Mail, Phone, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function ContactsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading } = useQuery<DirectoryResponse>({
    queryKey: ["/api/contacts/directory", { search: searchQuery, sortBy, category, limit, offset: page * limit }],
  });

  const contacts = data?.contacts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

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
        <div className="text-sm text-muted-foreground">
          {total} contacts found
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
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
        <div className="flex gap-2">
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
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(0); }}>
            <SelectTrigger className="w-32 h-9" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[60px] py-2 text-xs font-semibold">Type</TableHead>
              <TableHead className="py-2 text-xs font-semibold">Name</TableHead>
              <TableHead className="py-2 text-xs font-semibold">Company</TableHead>
              <TableHead className="py-2 text-xs font-semibold">Title</TableHead>
              <TableHead className="py-2 text-xs font-semibold">Email</TableHead>
              <TableHead className="py-2 text-xs font-semibold">Phone</TableHead>
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
