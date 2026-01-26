import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Building2, Briefcase, Save, LogOut, RefreshCw } from "lucide-react";

export default function Profile() {
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      return apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({ firstName, lastName });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <User className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Not Logged In</h2>
        <p className="text-muted-foreground">Please log in to view your profile.</p>
        <Button asChild>
          <a href="/api/login" data-testid="button-login">Log In</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6" data-testid="page-profile">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profileImageUrl || undefined} alt={firstName} />
              <AvatarFallback className="text-2xl">
                {firstName?.[0] || "U"}{lastName?.[0] || ""}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : "User"}
              </CardTitle>
              <CardDescription>{email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="pl-10"
                  data-testid="input-first-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="pl-10"
                  data-testid="input-last-name"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={email}
                disabled
                className="pl-10 bg-muted"
                data-testid="input-email"
              />
            </div>
            <p className="text-xs text-muted-foreground">Email is managed by your login provider</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Project Manager"
                  className="pl-10"
                  data-testid="input-job-title"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Construction"
                  className="pl-10"
                  data-testid="input-department"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t gap-4 flex-wrap">
            <Button
              variant="outline"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Information</CardTitle>
          <CardDescription>Details about your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since</span>
              <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : "N/A"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
