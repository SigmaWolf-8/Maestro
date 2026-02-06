import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SecurityMode, PlenumNetSecurityContext } from "@shared/types/integrations/plenum-net";

interface PlenumNetContextValue {
  securityContext: PlenumNetSecurityContext;
  setSecurityMode: (mode: SecurityMode) => void;
  isEnabled: boolean;
}

const defaultContext: PlenumNetSecurityContext = {
  mode: "one",
  enabled: false,
  encryptionApplied: false,
  ternaryEncoded: false,
};

const PlenumNetContext = createContext<PlenumNetContextValue>({
  securityContext: defaultContext,
  setSecurityMode: () => {},
  isEnabled: false,
});

interface PlenumNetProviderProps {
  children: ReactNode;
  initialMode?: SecurityMode;
  enabled?: boolean;
}

export function PlenumNetProvider({
  children,
  initialMode = "one",
  enabled = false,
}: PlenumNetProviderProps) {
  const [securityContext, setSecurityContext] = useState<PlenumNetSecurityContext>({
    mode: initialMode,
    enabled,
    encryptionApplied: false,
    ternaryEncoded: false,
  });

  const setSecurityMode = useCallback((mode: SecurityMode) => {
    setSecurityContext((prev) => ({
      ...prev,
      mode,
    }));
  }, []);

  return (
    <PlenumNetContext.Provider
      value={{
        securityContext,
        setSecurityMode,
        isEnabled: enabled,
      }}
    >
      {children}
    </PlenumNetContext.Provider>
  );
}

export function usePlenumNetContext() {
  const context = useContext(PlenumNetContext);
  if (!context) {
    throw new Error("usePlenumNetContext must be used within a PlenumNetProvider");
  }
  return context;
}
