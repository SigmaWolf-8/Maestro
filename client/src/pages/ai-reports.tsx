import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAIReport } from "@/hooks/use-ai-report";
import { useSettings } from "@/components/settings-provider";
import {
  Send,
  Sparkles,
  Loader2,
  Trash2,
  BarChart3,
  FolderKanban,
  DollarSign,
  Truck,
  GitBranch,
  Calendar,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Table2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { AIMessage, ChartData, TableData } from "../../../shared/types/ai-report";

const ICON_MAP: Record<string, typeof BarChart3> = {
  FolderKanban,
  DollarSign,
  Truck,
  GitBranch,
  Calendar,
  TrendingUp,
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function ReportChart({ chart }: { chart: ChartData }) {
  const colors = chart.colors || CHART_COLORS;

  if (chart.type === "pie") {
    return (
      <div data-testid={`chart-${chart.title.replace(/\s+/g, '-').toLowerCase()}`}>
        <p className="text-xs font-medium mb-2 text-center">{chart.title}</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey={chart.yKeys[0]}
              nameKey={chart.xKey}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chart.data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "area") {
    return (
      <div data-testid={`chart-${chart.title.replace(/\s+/g, '-').toLowerCase()}`}>
        <p className="text-xs font-medium mb-2">{chart.title}</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {chart.yKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "line") {
    return (
      <div data-testid={`chart-${chart.title.replace(/\s+/g, '-').toLowerCase()}`}>
        <p className="text-xs font-medium mb-2">{chart.title}</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {chart.yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div data-testid={`chart-${chart.title.replace(/\s+/g, '-').toLowerCase()}`}>
      <p className="text-xs font-medium mb-2">{chart.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {chart.yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DataTableView({ table }: { table: TableData }) {
  const [expanded, setExpanded] = useState(false);
  const displayRows = expanded ? table.rows : table.rows.slice(0, 5);

  return (
    <div data-testid="container-data-table">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Data Table</span>
        </div>
        {table.rows.length > 5 && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} data-testid="button-toggle-table">
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            <span className="text-[10px]">{expanded ? "Show Less" : `Show All (${table.rows.length})`}</span>
          </Button>
        )}
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/30">
              {table.columns.map(col => (
                <th key={col.key} className="text-left py-1.5 px-2 font-medium text-muted-foreground">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0">
                {table.columns.map(col => (
                  <td key={col.key} className="py-1.5 px-2">{String(row[col.key] || "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onSuggestionClick,
}: {
  message: AIMessage;
  onSuggestionClick: (prompt: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end" data-testid={`message-user-${message.id}`}>
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  const report = message.report;

  return (
    <div className="flex justify-start" data-testid={`message-assistant-${message.id}`}>
      <div className="max-w-full w-full space-y-3">
        <div className="flex items-start gap-2">
          <div className="bg-primary/10 rounded-full p-1.5 mt-0.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            {report && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]" data-testid="badge-confidence">
                  {((report.confidence || 0) * 100).toFixed(0)}% confidence
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {report.processingTimeMs}ms
                </span>
              </div>
            )}

            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              {message.content.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-semibold mt-2 mb-1">{line.replace("## ", "")}</h3>;
                if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold mt-2 mb-1">{line.replace("### ", "")}</h4>;
                if (line.startsWith("- **")) {
                  const match = line.match(/- \*\*(.+?)\*\*\s*(.*)/);
                  if (match) return <p key={i} className="text-xs ml-2"><strong>{match[1]}</strong> {match[2]}</p>;
                }
                if (line.startsWith("- ")) return <p key={i} className="text-xs ml-2">{line.replace("- ", "")}</p>;
                if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ")) return <p key={i} className="text-xs ml-2">{line}</p>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i} className="text-xs">{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}</p>;
              })}
            </div>

            {report?.charts && report.charts.length > 0 && (
              <div className={`grid gap-3 ${report.charts.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                {report.charts.map((chart, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <ReportChart chart={chart} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {report?.dataTable && <DataTableView table={report.dataTable} />}

            {report?.suggestions && report.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-muted-foreground self-center">Follow up:</span>
                {report.suggestions.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => onSuggestionClick(s)}
                    data-testid={`button-suggestion-${i}`}
                  >
                    <span className="text-[10px]">{s}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIReportsPage() {
  const { activeTenant } = useSettings();
  const { messages, sendQuery, clearConversation, isLoading, quickPrompts } = useAIReport(activeTenant?.id);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendQuery(input.trim());
    setInput("");
  };

  const handleSuggestionClick = (prompt: string) => {
    if (isLoading) return;
    sendQuery(prompt);
  };

  return (
    <div className="flex flex-col h-full" data-testid="page-ai-reports">
      <div className="flex items-center justify-between gap-2 p-4 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold" data-testid="text-ai-reports-title">AI Analytics</h1>
          <Badge variant="outline" className="text-[10px]">RAG Engine</Badge>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearConversation} data-testid="button-clear-conversation">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Clear</span>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-2 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]" data-testid="container-welcome">
            <div className="bg-primary/10 rounded-full p-4 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-1">AI-Powered Analytics</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Ask questions about your projects, budgets, vendors, and more. 
              The AI engine analyzes your data and generates insights with visualizations.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-xl">
              {quickPrompts.map((qp, i) => {
                const Icon = ICON_MAP[qp.icon] || BarChart3;
                return (
                  <Card
                    key={i}
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleSuggestionClick(qp.prompt)}
                    data-testid={`card-quick-prompt-${i}`}
                  >
                    <CardContent className="p-3 flex items-start gap-2">
                      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium">{qp.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{qp.prompt}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSuggestionClick={handleSuggestionClick} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground" data-testid="loading-ai-response">
            <div className="bg-primary/10 rounded-full p-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            </div>
            <span className="text-xs">Analyzing your data...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3">
        <form onSubmit={handleSubmit} className="flex gap-2" data-testid="form-ai-query">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your projects, budgets, vendors, or team..."
            disabled={isLoading}
            data-testid="input-ai-query"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} data-testid="button-send-query">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
