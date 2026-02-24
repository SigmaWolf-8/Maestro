import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Building2, Briefcase, Save, LogOut, RefreshCw, Lock, Server, Hash, Trash2, CheckCircle2, XCircle, Eye, EyeOff, Cloud, ExternalLink, Info } from "lucide-react";
import { useSettings, type MicrosoftConfig } from "@/components/settings-provider";

export default function Profile() {
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");

  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.office365.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailJustSaved, setEmailJustSaved] = useState(false);

  const { activeTenant, updateMicrosoftConfig } = useSettings();
  const existingMsConfig = activeTenant?.config?.microsoft;
  const [msClientId, setMsClientId] = useState(existingMsConfig?.clientId || "");
  const [msClientSecret, setMsClientSecret] = useState("");
  const [msTenantId, setMsTenantId] = useState(existingMsConfig?.tenantId || "common");
  const [showMsSecret, setShowMsSecret] = useState(false);
  const [isSavingMs, setIsSavingMs] = useState(false);

  const { data: msStatus, refetch: refetchMsStatus } = useQuery<{ configured: boolean; connected: boolean }>({
    queryKey: ["/api/microsoft/connected", activeTenant?.id],
    queryFn: async () => {
      const params = activeTenant?.id ? `?tenantId=${activeTenant.id}` : "";
      const res = await fetch(`/api/microsoft/connected${params}`);
      return res.json();
    },
  });

  const { data: emailConfig, refetch: refetchEmailConfig } = useQuery<{
    configured: boolean;
    email: string | null;
    host: string;
    port: number;
  }>({
    queryKey: ["/api/auth/email-config"],
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (existingMsConfig) {
      if (existingMsConfig.clientId && !msClientId) setMsClientId(existingMsConfig.clientId);
      if (existingMsConfig.tenantId) setMsTenantId(existingMsConfig.tenantId);
    }
  }, [existingMsConfig]);

  useEffect(() => {
    if (emailConfig) {
      if (emailConfig.email && !smtpEmail) {
        setSmtpEmail(emailConfig.email);
      }
      setSmtpHost(emailConfig.host || "smtp.office365.com");
      setSmtpPort(String(emailConfig.port || 587));
    }
  }, [emailConfig]);

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

  const saveEmailMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; host: string; port: number }) => {
      return apiRequest("POST", "/api/auth/email-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/email-config"] });
      setSmtpPassword("");
      setEmailJustSaved(true);
      toast({
        title: "Email Settings Saved",
        description: "Your email and password have been saved securely. You can now send emails from the app.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/auth/email-config");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/email-config"] });
      setSmtpEmail("");
      setSmtpPassword("");
      toast({
        title: "Email Settings Removed",
        description: "Your email configuration has been cleared.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove email settings.",
        variant: "destructive",
      });
    },
  });

  const handleSaveEmail = () => {
    if (!smtpEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    if (!smtpPassword.trim() && !emailConfig?.configured) {
      toast({
        title: "Missing Information",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }
    saveEmailMutation.mutate({
      email: smtpEmail.trim(),
      password: smtpPassword.trim(),
      host: smtpHost.trim(),
      port: parseInt(smtpPort, 10) || 587,
    });
  };

  const handleSaveMicrosoft = async () => {
    if (!msClientId.trim()) {
      toast({ title: "Missing Information", description: "Please enter a Client ID.", variant: "destructive" });
      return;
    }
    if (!msClientSecret.trim() && !existingMsConfig?.clientSecret) {
      toast({ title: "Missing Information", description: "Please enter a Client Secret.", variant: "destructive" });
      return;
    }
    setIsSavingMs(true);
    try {
      const config: MicrosoftConfig = {
        clientId: msClientId.trim(),
        clientSecret: msClientSecret.trim() || existingMsConfig?.clientSecret || "",
        tenantId: msTenantId.trim() || "common",
      };
      await updateMicrosoftConfig(config);
      setMsClientSecret("");
      refetchMsStatus();
      toast({ title: "Microsoft 365 Configured", description: "Your credentials have been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to save Microsoft 365 credentials.", variant: "destructive" });
    } finally {
      setIsSavingMs(false);
    }
  };

  const handleDisconnectMicrosoft = async () => {
    try {
      await fetch("/api/microsoft/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: activeTenant?.id }) });
      refetchMsStatus();
      toast({ title: "Disconnected", description: "Microsoft 365 account disconnected." });
    } catch {
      toast({ title: "Error", description: "Failed to disconnect.", variant: "destructive" });
    }
  };

  const handleRemoveMicrosoft = async () => {
    try {
      await updateMicrosoftConfig({ clientId: "", clientSecret: "", tenantId: "" });
      setMsClientId("");
      setMsClientSecret("");
      setMsTenantId("common");
      refetchMsStatus();
      toast({ title: "Credentials Removed", description: "Microsoft 365 configuration has been cleared." });
    } catch {
      toast({ title: "Error", description: "Failed to remove credentials.", variant: "destructive" });
    }
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg">Email Settings</CardTitle>
              <CardDescription>Configure your personal email to send messages from the app</CardDescription>
            </div>
            {emailConfig?.configured ? (
              <Badge variant="secondary" data-testid="badge-email-status">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" data-testid="badge-email-status">
                <XCircle className="h-3 w-3 mr-1" />
                Not configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailConfig?.configured && (
            <div className="border rounded-md p-3 bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm">
                <span className="text-muted-foreground">Currently using: </span>
                <span className="font-medium" data-testid="text-current-email">{emailConfig.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEmailMutation.mutate()}
                disabled={removeEmailMutation.isPending}
                data-testid="button-remove-email"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {removeEmailMutation.isPending ? "Removing..." : "Remove"}
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Enter your Microsoft 365 or other SMTP email credentials. Emails you send from the app will come from this address.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpEmail">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="smtpEmail"
                  type="email"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10"
                  data-testid="input-smtp-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">Password / App Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="smtpPassword"
                  type={showPassword ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(e) => {
                    setSmtpPassword(e.target.value);
                    setEmailJustSaved(false);
                  }}
                  placeholder={emailConfig?.configured ? "Password saved - enter new to change" : "Enter password"}
                  className="pl-10 pr-10"
                  data-testid="input-smtp-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-muted-foreground"
            data-testid="button-toggle-advanced"
          >
            {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
          </Button>

          {showAdvanced && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Server</Label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.office365.com"
                    className="pl-10"
                    data-testid="input-smtp-host"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="smtpPort"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="pl-10"
                    data-testid="input-smtp-port"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveEmail}
              disabled={saveEmailMutation.isPending || !smtpEmail.trim() || (!smtpPassword.trim() && !emailConfig?.configured)}
              data-testid="button-save-email"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveEmailMutation.isPending ? "Saving..." : "Save Email Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-600" />
                Microsoft 365
              </CardTitle>
              <CardDescription>Connect to OneDrive and edit Office documents in-app</CardDescription>
            </div>
            {msStatus?.connected ? (
              <Badge variant="secondary" data-testid="badge-ms365-status">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : msStatus?.configured ? (
              <Badge variant="outline" data-testid="badge-ms365-status">
                <Cloud className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" data-testid="badge-ms365-status">
                <XCircle className="h-3 w-3 mr-1" />
                Not configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {msStatus?.connected && (
            <div className="border rounded-md p-3 bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm">
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium" data-testid="text-ms365-connected">Authenticated with Microsoft 365</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectMicrosoft}
                data-testid="button-disconnect-ms365"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Disconnect
              </Button>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3 flex gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p>To get these credentials, create an app registration in Azure Portal:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Go to Azure Portal, then App registrations</li>
                <li>Set redirect URI to: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-[10px]">{window.location.origin}/api/microsoft/callback</code></li>
                <li>Add API permissions: Files.ReadWrite.All, User.Read</li>
                <li>Create a client secret and copy the <strong>Value</strong> (not the Secret ID)</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msClientId">Application (Client) ID</Label>
            <div className="relative">
              <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="msClientId"
                value={msClientId}
                onChange={(e) => setMsClientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="pl-10"
                data-testid="input-ms-client-id"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msClientSecret">Client Secret Value</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="msClientSecret"
                type={showMsSecret ? "text" : "password"}
                value={msClientSecret}
                onChange={(e) => setMsClientSecret(e.target.value)}
                placeholder={existingMsConfig?.clientSecret ? "Secret saved - enter new to change" : "Paste secret Value from Azure Portal"}
                className="pl-10 pr-10"
                data-testid="input-ms-client-secret"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground"
                onClick={() => setShowMsSecret(!showMsSecret)}
                tabIndex={-1}
                data-testid="button-toggle-ms-secret"
              >
                {showMsSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msTenantId">Directory (Tenant) ID</Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="msTenantId"
                value={msTenantId}
                onChange={(e) => setMsTenantId(e.target.value)}
                placeholder="common"
                className="pl-10"
                data-testid="input-ms-tenant-id"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use "common" for any Microsoft account, or your organization's tenant ID
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade", "_blank")}
                data-testid="button-azure-portal"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Azure Portal
              </Button>
              {existingMsConfig?.clientId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveMicrosoft}
                  data-testid="button-remove-ms-config"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Remove
                </Button>
              )}
            </div>
            <Button
              onClick={handleSaveMicrosoft}
              disabled={isSavingMs || !msClientId.trim()}
              data-testid="button-save-ms-config"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSavingMs ? "Saving..." : "Save Credentials"}
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
