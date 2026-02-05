import { X } from "lucide-react";
import { useTabs } from "./tab-provider";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabs();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div 
      className="grid gap-1 px-2 py-1 border-b border-border bg-muted/30"
      style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}
      data-testid="tab-bar"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-all min-w-0 max-w-[180px] ${
              isActive
                ? "bg-primary text-primary-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.1)]"
                : "bg-muted text-muted-foreground hover:text-foreground shadow-[2px_2px_4px_rgba(0,0,0,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.4),-1px_-1px_2px_rgba(255,255,255,0.05)]"
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
