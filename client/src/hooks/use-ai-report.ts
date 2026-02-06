import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AIMessage, AIReportResponse, QuickPrompt } from "../../../shared/types/ai-report";

export function useAIReport(tenantId?: string) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [conversationId] = useState(() => `conv-${Date.now()}`);

  const quickPromptsQuery = useQuery<QuickPrompt[]>({
    queryKey: ["/api/ai/quick-prompts"],
  });

  const reportMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/ai/report", {
        prompt,
        tenantId,
      });
      return (await res.json()) as AIReportResponse;
    },
    onMutate: (prompt: string) => {
      const userMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
    },
    onSuccess: (report: AIReportResponse) => {
      const assistantMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: report.narrative,
        report,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: Error) => {
      const errorMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `I encountered an issue analyzing your data: ${error.message}. Please try rephrasing your question.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const sendQuery = useCallback((prompt: string) => {
    reportMutation.mutate(prompt);
  }, [reportMutation]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendQuery,
    clearConversation,
    isLoading: reportMutation.isPending,
    quickPrompts: quickPromptsQuery.data || [],
    conversationId,
  };
}
