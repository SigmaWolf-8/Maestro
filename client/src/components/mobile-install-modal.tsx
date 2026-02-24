import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileInstallModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[90vw] sm:max-w-md border-teal-600/40 text-white p-0 overflow-hidden"
        style={{ background: "linear-gradient(to bottom, #18181b, #09090b)" }}
      >
        <DialogHeader className="p-6 pb-4 border-b border-teal-600/20">
          <DialogTitle className="text-2xl text-center" style={{ color: "#2dd4bf" }}>
            Install The Maestro
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-5">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div
                className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}
              >
                <span className="text-lg font-bold">1</span>
              </div>
              <div className="pt-1">
                <p className="text-zinc-200 text-sm font-medium">
                  Tap the <Share className="inline w-4 h-4 text-blue-400 mx-0.5 -mt-0.5" /> Share button in Safari
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}
              >
                <span className="text-lg font-bold">2</span>
              </div>
              <div className="pt-1">
                <p className="text-zinc-200 text-sm font-medium">
                  Scroll down and tap <Plus className="inline w-4 h-4 text-zinc-300 mx-0.5 -mt-0.5" /> <span className="text-white font-semibold">Add to Home Screen</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}
              >
                <span className="text-lg font-bold">3</span>
              </div>
              <div className="pt-1">
                <p className="text-zinc-200 text-sm font-medium">
                  Tap <span className="text-white font-semibold">Add</span> to install
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
            className="w-full"
            style={{
              background: "linear-gradient(to right, #0d9488, #14b8a6)",
              color: "#fff",
            }}
            data-testid="button-install-got-it"
          >
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
