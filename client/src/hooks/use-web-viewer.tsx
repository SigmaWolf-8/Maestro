import { createContext, useContext } from "react";

interface WebViewerContextValue {
  openApp: (url: string) => void;
  closeApp: () => void;
  isOpen: boolean;
}

export const WebViewerContext = createContext<WebViewerContextValue>({
  openApp: () => {},
  closeApp: () => {},
  isOpen: false,
});

export function useWebViewer() {
  return useContext(WebViewerContext);
}
