import { useQuery, useMutation } from "@tanstack/react-query";
import { usePlenumNetContext } from "./context";
import type { SecurityMode, PlenumNetHealthStatus } from "@shared/types/integrations/plenum-net";
import { apiRequest } from "@/lib/queryClient";

export function usePlenumNetSecurity() {
  const { securityContext, setSecurityMode, isEnabled } = usePlenumNetContext();

  const getSecurityHeaders = (): Record<string, string> => {
    if (!isEnabled) return {};
    return {
      "X-PlenumNET-Security-Mode": securityContext.mode,
    };
  };

  return {
    mode: securityContext.mode,
    isEnabled,
    setSecurityMode,
    getSecurityHeaders,
    isPhiMode: securityContext.mode === "phi",
    isEnterpriseMode: securityContext.mode === "one",
    isLegacyMode: securityContext.mode === "zero",
  };
}

export function usePlenumNetHealth() {
  return useQuery<PlenumNetHealthStatus>({
    queryKey: ["/api/plenumnet/health"],
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useWitnessDocument() {
  return useMutation({
    mutationFn: async ({
      documentId,
      hash,
      metadata,
    }: {
      documentId: string;
      hash: string;
      metadata: Record<string, unknown>;
    }) => {
      const response = await apiRequest("POST", "/api/plenumnet/witness", {
        documentId,
        hash,
        metadata,
      });
      return response.json();
    },
  });
}

export function useSecurityModeForOperation(operationType: string): SecurityMode {
  const { mode } = usePlenumNetSecurity();

  const operationModeMap: Record<string, SecurityMode> = {
    financial_report: "phi",
    audit_entry: "phi",
    contract_document: "phi",
    document_edit: "one",
    api_call: "one",
    project_update: "one",
    bulk_import: "zero",
    development_test: "zero",
  };

  return operationModeMap[operationType] || mode;
}
