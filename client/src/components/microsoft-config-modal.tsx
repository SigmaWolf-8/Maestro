import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, type MicrosoftConfig } from "@/components/settings-provider";
import { useToast } from "@/hooks/use-toast";
import { Cloud, ExternalLink, Info, Loader2 } from "lucide-react";

interface MicrosoftConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigured?: () => void;
}

export function MicrosoftConfigModal({ open, onOpenChange, onConfigured }: MicrosoftConfigModalProps) {
  const { activeTenant, updateMicrosoftConfig } = useSettings();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const existingConfig = activeTenant?.config?.microsoft;
  
  const [clientId, setClientId] = useState(existingConfig?.clientId || "");
  const [clientSecret, setClientSecret] = useState(existingConfig?.clientSecret || "");
  const [tenantId, setTenantId] = useState(existingConfig?.tenantId || "common");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const config: MicrosoftConfig = {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        tenantId: tenantId.trim() || "common",
      };
      
      await updateMicrosoftConfig(config);
      
      toast({
        title: "Microsoft 365 Configured",
        description: "Your credentials have been saved. You can now connect to Microsoft 365.",
      });
      
      onOpenChange(false);
      onConfigured?.();
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Failed to save Microsoft 365 credentials",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600" />
            Configure Microsoft 365
          </DialogTitle>
          <DialogDescription>
            Enter your Azure AD app credentials to enable Office document editing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 flex gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p>To get these credentials, create an app registration in Azure Portal:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Go to Azure Portal → Azure Active Directory → App registrations</li>
                <li>Create a new registration with redirect URI: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-[10px]">{window.location.origin}/api/microsoft/callback</code></li>
                <li>Add API permissions: Files.ReadWrite, Files.ReadWrite.All</li>
                <li>Create a client secret under Certificates & secrets</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Application (Client) ID</Label>
            <Input
              id="clientId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              data-testid="input-ms-client-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="Your client secret value"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              data-testid="input-ms-client-secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantId">Directory (Tenant) ID</Label>
            <Input
              id="tenantId"
              placeholder="common (for any Microsoft account)"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              data-testid="input-ms-tenant-id"
            />
            <p className="text-xs text-muted-foreground">
              Use "common" for any Microsoft account, or enter your organization's tenant ID
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open("https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade", "_blank")}
              className="gap-1"
              data-testid="button-open-azure-portal"
            >
              <ExternalLink className="h-3 w-3" />
              Azure Portal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2"
              data-testid="button-save-ms-config"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Connect"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
