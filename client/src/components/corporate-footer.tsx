import { useSettings } from "@/components/settings-provider";
import { Building2, Mail, Globe } from "lucide-react";

export function CorporateFooter() {
  const { activeTenant } = useSettings();
  const branding = activeTenant?.config?.branding;

  return (
    <footer className="mt-auto border-t border-border bg-card" data-testid="footer-corporate">
      <div className="px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {branding?.logoUrl ? (
              <div className="flex h-10 w-10 items-center justify-center rounded overflow-hidden">
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground">
                <Building2 className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {activeTenant?.companyName || "The Maestro"}
              </span>
              <span className="text-xs text-muted-foreground">
                Construction ERP System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {activeTenant?.contactEmail && (
              <a 
                href={`mailto:${activeTenant.contactEmail}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                data-testid="link-footer-email"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{activeTenant.contactEmail}</span>
              </a>
            )}
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">themaestro.app</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} {activeTenant?.companyName || "The Maestro"}. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
