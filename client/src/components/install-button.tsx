import { Download, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MobileInstallModal } from "@/components/mobile-install-modal";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function InstallButton() {
  const { canInstall, install, showIosGuide, dismissIosGuide, iosDevice } = usePwaInstall();

  const handleInstall = async () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(12);
    }
    await install();
  };

  if (!canInstall) return null;

  const isMobile = iosDevice || (typeof window !== "undefined" && window.innerWidth <= 768);

  if (isMobile) {
    return (
      <>
        <button
          onClick={handleInstall}
          className="fixed bottom-6 right-6 z-50 rounded-full flex items-center justify-center shadow-2xl"
          style={{
            width: 56,
            height: 56,
            background: "linear-gradient(135deg, #0d9488, #14b8a6)",
            boxShadow: "0 8px 32px rgba(13, 148, 136, 0.4)",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Install The Maestro"
          data-testid="button-install-pwa"
        >
          <Download className="h-6 w-6 text-white" />
        </button>
        <MobileInstallModal open={showIosGuide} onOpenChange={dismissIosGuide} />
      </>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleInstall}
          aria-label="Install The Maestro as desktop app"
          data-testid="button-install-pwa"
        >
          <Download />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Install as desktop app</TooltipContent>
    </Tooltip>
  );
}

export function HeaderInstallButton() {
  const { canInstall, install, showIosGuide, dismissIosGuide } = usePwaInstall();

  const handleInstall = async () => {
    await install();
  };

  if (!canInstall) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleInstall}
            aria-label="Install The Maestro as desktop app"
            data-testid="button-install-pwa-header"
          >
            <Monitor />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Install as desktop app</TooltipContent>
      </Tooltip>
      <MobileInstallModal open={showIosGuide} onOpenChange={dismissIosGuide} />
    </>
  );
}
