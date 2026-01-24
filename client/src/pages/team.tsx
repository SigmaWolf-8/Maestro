import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Mail,
  Shield,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TenantUser } from "@shared/schema";

export default function Team() {
  const { data: members, isLoading } = useQuery<TenantUser[]>({
    queryKey: ["/api/team"],
  });

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      admin: { variant: "default", label: "Admin" },
      project_manager: { variant: "secondary", label: "Project Manager" },
      accountant: { variant: "outline", label: "Accountant" },
      viewer: { variant: "outline", label: "Viewer" },
    };
    const config = roleConfig[role] || { variant: "outline", label: role };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getInitials = (profile: TenantUser["profile"]) => {
    const p = profile as { firstName?: string | null; lastName?: string | null } | null;
    if (!p) return "U";
    const first = p.firstName?.[0] || "";
    const last = p.lastName?.[0] || "";
    return first + last || "U";
  };

  const getFullName = (profile: TenantUser["profile"]) => {
    const p = profile as { firstName?: string | null; lastName?: string | null } | null;
    if (!p) return "Unknown User";
    const parts = [p.firstName, p.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unknown User";
  };

  const getJobTitle = (profile: TenantUser["profile"]) => {
    const p = profile as { jobTitle?: string | null } | null;
    return p?.jobTitle || "No title";
  };

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-team">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-team-title">
            Team Members
          </h1>
          <p className="text-muted-foreground">
            Manage your team and assign roles.
          </p>
        </div>
        <Button data-testid="button-invite-member">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : members && members.length > 0 ? (
          members.map((member) => (
            <Card
              key={member.id}
              className="group hover-elevate"
              data-testid={`team-member-${member.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                          {getFullName(member.profile)}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {getJobTitle(member.profile)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            data-testid={`button-member-menu-${member.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {getRoleBadge(member.role)}
                      {member.isActive ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No team members yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Invite your first team member to collaborate
            </p>
            <Button data-testid="button-invite-first-member">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
