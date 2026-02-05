import { X } from "lucide-react";
import { useTabs } from "./tab-provider";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabs();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div 
      className="grid gap-2 px-3 py-2 border-b border-border bg-muted/30 overflow-visible"
      style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}
      data-testid="tab-bar"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-all min-w-0 max-w-[180px] border ${
              isActive
                ? "bg-primary text-primary-foreground border-primary-foreground/20 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]"
                : "bg-card text-muted-foreground hover:text-foreground border-border shadow-[3px_3px_6px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.5),-2px_-2px_4px_rgba(255,255,255,0.03)]"
            }`}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
          >
            <span className="truncate flex-1 text-xs font-medium">{tab.title}</span>
            <button
              className={`ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                isActive ? "hover:bg-primary-foreground/20" : "hover:bg-muted-foreground/20"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              data-testid={`tab-close-${tab.id}`}
            >
              <X className={`h-3 w-3 ${isActive ? "text-primary-foreground" : ""}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
