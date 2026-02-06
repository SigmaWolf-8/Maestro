import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface WopiActionUrl {
  actionUrl: string;
  accessToken: string;
  tokenTtl: number;
  fileId: string;
  fileName: string;
}

export interface WopiLockStatus {
  isLocked: boolean;
  lockId?: string;
  lockedBy?: string;
  expiresAt?: string;
}

export interface OfficeDocumentType {
  extension: string;
  mimeType: string;
  officeApp: "Word" | "Excel" | "PowerPoint";
  canEdit: boolean;
}

const OFFICE_DOCUMENT_TYPES: OfficeDocumentType[] = [
  { extension: ".docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", officeApp: "Word", canEdit: true },
  { extension: ".doc", mimeType: "application/msword", officeApp: "Word", canEdit: true },
  { extension: ".xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", officeApp: "Excel", canEdit: true },
  { extension: ".xls", mimeType: "application/vnd.ms-excel", officeApp: "Excel", canEdit: true },
  { extension: ".pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", officeApp: "PowerPoint", canEdit: true },
  { extension: ".ppt", mimeType: "application/vnd.ms-powerpoint", officeApp: "PowerPoint", canEdit: true },
];

export function getOfficeDocumentType(filename: string): OfficeDocumentType | null {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return OFFICE_DOCUMENT_TYPES.find((t) => t.extension === ext) || null;
}

export function isOfficeDocument(filename: string): boolean {
  return getOfficeDocumentType(filename) !== null;
}

export function useWopiToken(documentId: string | null) {
  return useQuery<WopiActionUrl>({
    queryKey: ["/api/wopi/token", documentId],
    enabled: !!documentId,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
  });
}

export function useWopiLockStatus(documentId: string | null) {
  return useQuery<WopiLockStatus>({
    queryKey: ["/api/wopi/files", documentId, "lock"],
    enabled: !!documentId,
    refetchInterval: 30000,
  });
}

export function useWopiLock(documentId: string) {
  const queryClient = useQueryClient();

  const lockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/wopi/files/${documentId}/lock`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wopi/files", documentId, "lock"] });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/wopi/files/${documentId}/unlock`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wopi/files", documentId, "lock"] });
    },
  });

  return {
    lock: lockMutation.mutate,
    unlock: unlockMutation.mutate,
    isLocking: lockMutation.isPending,
    isUnlocking: unlockMutation.isPending,
  };
}

export function useOfficeOnlineEmbed(documentId: string | null) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: wopiData, isLoading: isTokenLoading } = useWopiToken(documentId);
  const { data: lockStatus } = useWopiLockStatus(documentId);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
  }, [documentId]);

  const wopiFrameUrl = wopiData
    ? `${wopiData.actionUrl}&access_token=${wopiData.accessToken}`
    : null;

  return {
    wopiFrameUrl,
    isFullscreen,
    isLoading: isLoading || isTokenLoading,
    lockStatus,
    iframeRef,
    toggleFullscreen,
    handleIframeLoad,
    hasToken: !!wopiData,
  };
}
