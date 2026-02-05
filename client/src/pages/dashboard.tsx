import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  FolderKanban,
  Network,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import heroImage from "@/assets/images/hero-executive-home.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats, Project, WbsNode } from "@shared/schema";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentProjects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: recentWbsNodes, isLoading: wbsLoading } = useQuery<WbsNode[]>({
    queryKey: ["/api/wbs"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      not_started: { variant: "secondary", label: "Not Started" },
      in_progress: { variant: "default", label: "In Progress" },
      on_hold: { variant: "outline", label: "On Hold" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-dashboard">
      <div 
        className="relative overflow-hidden rounded-lg h-48 md:h-64 border-4 border-slate-400 dark:border-slate-600"
        style={{
          boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.4), inset -4px -4px 8px rgba(255,255,255,0.2), 4px 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        <img 
          src={heroImage} 
          alt="Modern Executive Home Interior" 
          className="w-full h-full object-cover"
          data-testid="img-hero"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-start justify-end p-6">
          <div className="text-white flex flex-col items-end gap-3">
            <div className="flex gap-4">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight drop-shadow-lg" data-testid="text-dashboard-title">
                Welcome
              </h1>
              <div className="flex flex-col text-2xl md:text-3xl font-bold tracking-tight drop-shadow-lg leading-none">
                <span>B</span>
                <span>a</span>
                <span>c</span>
                <span>k</span>
              </div>
            </div>
            <div 
              className="bg-black/50 backdrop-blur-sm border border-white/20 rounded p-2.5 text-center"
              data-testid="clock-widget"
            >
              <div className="text-base font-mono font-bold tracking-wider">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div className="text-[11px] text-white/80">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={stats?.totalProjects}
          icon={FolderKanban}
          trend="+2 this month"
          loading={statsLoading}
          testId="stat-total-projects"
        />
        <StatCard
          title="Active Projects"
          value={stats?.activeProjects}
          icon={TrendingUp}
          trend={`${stats?.completedProjects || 0} completed`}
          loading={statsLoading}
          testId="stat-active-projects"
        />
        <StatCard
          title="WBS Tasks"
          value={stats?.totalWbsNodes}
          icon={Network}
          trend={`${stats?.completedWbsNodes || 0} completed`}
          loading={statsLoading}
          testId="stat-wbs-tasks"
        />
        <StatCard
          title="Team Members"
          value={stats?.teamMembers}
          icon={Users}
          loading={statsLoading}
          testId="stat-team-members"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-medium">Budget Overview</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold" data-testid="text-budget-used">
                    {formatCurrency(stats?.budgetUsed || 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {formatCurrency(stats?.budgetTotal || 0)}
                  </span>
                </div>
                <Progress
                  value={stats?.budgetTotal ? ((stats.budgetUsed || 0) / stats.budgetTotal) * 100 : 0}
                  className="h-2"
                  data-testid="progress-budget"
                />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>
                    {stats?.budgetTotal
                      ? Math.round(((stats.budgetUsed || 0) / stats.budgetTotal) * 100)
                      : 0}
                    % utilized
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <QuickAction
                icon={FolderKanban}
                label="View Projects"
                href="/projects"
                testId="action-view-projects"
              />
              <QuickAction
                icon={Network}
                label="View WBS"
                href="/wbs"
                testId="action-view-wbs"
              />
              <QuickAction
                icon={Users}
                label="View Team"
                href="/team"
                testId="action-view-team"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-medium">Recent Projects</CardTitle>
            <Badge variant="secondary">{recentProjects?.length || 0}</Badge>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 rounded-md p-2 hover-elevate cursor-pointer"
                    data-testid={`project-item-${project.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.description || "No description"}
                      </p>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create your first project to get started"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-base font-medium">Recent WBS Activities</CardTitle>
            <Badge variant="secondary">{recentWbsNodes?.length || 0}</Badge>
          </CardHeader>
          <CardContent>
            {wbsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentWbsNodes && recentWbsNodes.length > 0 ? (
              <div className="space-y-4">
                {recentWbsNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 rounded-md p-2 hover-elevate cursor-pointer"
                    data-testid={`wbs-item-${node.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                      <Network className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{node.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {node.codeDisplay || node.codePath}
                      </p>
                    </div>
                    {getStatusBadge(node.status)}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Network}
                title="No WBS nodes yet"
                description="Add work breakdown structure items"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value?: number;
  icon: React.ElementType;
  trend?: string;
  loading?: boolean;
  testId: string;
}

function StatCard({ title, value, icon: Icon, trend, loading, testId }: StatCardProps) {
  return (
    <Card data-testid={testId} className="relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5">
        <Icon className="h-24 w-24" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold" data-testid={`${testId}-value`}>
              {value ?? 0}
            </div>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1" data-testid={`${testId}-trend`}>
                {trend}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  href: string;
  testId: string;
}

function QuickAction({ icon: Icon, label, href, testId }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 rounded-md border border-border p-4 text-center hover-elevate transition-colors"
      data-testid={testId}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </a>
  );
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center relative">
      <div className="absolute inset-0 opacity-5">
        <div className="flex items-center justify-center h-full">
          <Icon className="h-32 w-32" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/10 mb-3 mx-auto">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
