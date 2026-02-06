import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield,
  Clock,
  Lock,
  Cpu,
  Activity,
  Zap,
  Hash,
  Binary,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

interface HealthData {
  enabled: boolean;
  mode: string;
  engine: string;
  version: string;
  services: {
    ternaryOps: boolean;
    phaseEncryption: boolean;
    femtosecondTiming: boolean;
    ternaryEncoding: boolean;
  };
  timing: {
    clockSource: string;
    synchronizationStatus: string;
    estimatedAccuracy: string;
  };
}

interface TimestampData {
  value: string;
  iso: string;
  humanReadable: string;
  precision: string;
  salviEpochOffset: string;
}

interface DemoData {
  ternaryArithmetic: {
    addition: Array<{ operands: { a: number; b: number }; result: number; constantTime: boolean }>;
    multiplication: Array<{ operands: { a: number; b: number }; result: number; constantTime: boolean }>;
    rotation: Array<{ operands: { a: number; b: number }; result: number; constantTime: boolean }>;
  };
  informationDensity: {
    trits: number;
    bitsEquivalent: number;
    efficiencyGain: string;
  };
  phaseEncryption: {
    mode: string;
    recombinationSuccess: boolean;
    phaseAlignment: number;
    guardianValidation: boolean | null;
  };
  ternaryCompression: {
    originalSize: number;
    ternarySize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  ternaryHash: string;
  femtosecondTiming: {
    iso: string;
    humanReadable: string;
    precision: string;
    value: string;
  };
}

function tritDisplay(value: number): string {
  if (value === -1) return "-1 (False)";
  if (value === 0) return " 0 (Neutral)";
  return "+1 (True)";
}

export default function SecurityDashboard() {
  const [hashInput, setHashInput] = useState("The Maestro ERP");
  const [encryptInput, setEncryptInput] = useState("Sensitive construction data");
  const [encryptMode, setEncryptMode] = useState("balanced");

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["/api/plenumnet/health"],
  });

  const { data: timestamp, isLoading: tsLoading, refetch: refetchTimestamp } = useQuery<TimestampData>({
    queryKey: ["/api/plenumnet/timestamp"],
    refetchInterval: 3000,
  });

  const { data: demo, isLoading: demoLoading } = useQuery<DemoData>({
    queryKey: ["/api/plenumnet/demo-operations"],
  });

  const hashMutation = useMutation({
    mutationFn: async (data: string) => {
      const res = await apiRequest("POST", "/api/plenumnet/hash", { data });
      return res.json();
    },
  });

  const encryptMutation = useMutation({
    mutationFn: async ({ data, mode }: { data: string; mode: string }) => {
      const res = await apiRequest("POST", "/api/plenumnet/phase/encrypt", { data, mode });
      return res.json();
    },
  });

  if (healthLoading || demoLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <Shield className="h-7 w-7 text-teal-500" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-security-title">PlenumNET Security Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Salvi Framework / libternary {health?.version} - Post-Quantum Security Engine
          </p>
        </div>
        <Badge variant="outline" className="ml-auto" data-testid="badge-engine-version">
          {health?.engine} v{health?.version}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-engine-status">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engine Status</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-engine-status">
              {health?.enabled ? "Active" : "Disabled"}
            </div>
            <p className="text-xs text-muted-foreground">
              Security Mode: {health?.mode}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-timing">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Femtosecond Clock</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono" data-testid="text-timestamp">
              {tsLoading ? "..." : timestamp?.precision}
            </div>
            <p className="text-xs text-muted-foreground truncate" title={timestamp?.humanReadable}>
              {timestamp?.humanReadable}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-density">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Information Density</CardTitle>
            <Binary className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-500" data-testid="text-density">
              {demo?.informationDensity.efficiencyGain}
            </div>
            <p className="text-xs text-muted-foreground">
              {demo?.informationDensity.trits} trits = {demo?.informationDensity.bitsEquivalent} bits
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-services">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              {health?.services && Object.entries(health.services).map(([key, active]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  {active ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-ternary-arithmetic">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-base font-semibold">
              GF(3) Ternary Arithmetic
            </CardTitle>
            <Badge variant="secondary">Constant-Time</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Addition (mod 3)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>A</TableHead>
                    <TableHead>B</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demo?.ternaryArithmetic.addition.map((op, i) => (
                    <TableRow key={`add-${i}`}>
                      <TableCell className="font-mono text-xs">{tritDisplay(op.operands.a)}</TableCell>
                      <TableCell className="font-mono text-xs">{tritDisplay(op.operands.b)}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{tritDisplay(op.result)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Multiplication (mod 3)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>A</TableHead>
                    <TableHead>B</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demo?.ternaryArithmetic.multiplication.map((op, i) => (
                    <TableRow key={`mul-${i}`}>
                      <TableCell className="font-mono text-xs">{tritDisplay(op.operands.a)}</TableCell>
                      <TableCell className="font-mono text-xs">{tritDisplay(op.operands.b)}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{tritDisplay(op.result)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Rotation (+1 step)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Input</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demo?.ternaryArithmetic.rotation.map((op, i) => (
                    <TableRow key={`rot-${i}`}>
                      <TableCell className="font-mono text-xs">{tritDisplay(op.operands.a)}</TableCell>
                      <TableCell className="font-mono text-xs">{op.operands.b}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{tritDisplay(op.result)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-phase-encryption">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-base font-semibold">
              Phase-Rotation Encryption
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="encrypt-input">Data to Encrypt</Label>
                <Textarea
                  id="encrypt-input"
                  value={encryptInput}
                  onChange={(e) => setEncryptInput(e.target.value)}
                  className="mt-1 resize-none text-sm"
                  rows={2}
                  data-testid="input-encrypt-data"
                />
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <Label>Encryption Mode</Label>
                  <Select value={encryptMode} onValueChange={setEncryptMode}>
                    <SelectTrigger className="mt-1" data-testid="select-encrypt-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_security">High Security</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="adaptive">Adaptive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => encryptMutation.mutate({ data: encryptInput, mode: encryptMode })}
                  disabled={!encryptInput || encryptMutation.isPending}
                  data-testid="button-encrypt"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Encrypt
                </Button>
              </div>
            </div>

            {encryptMutation.data && (
              <div className="space-y-2 text-xs border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Mode:</span>
                  <Badge variant="outline">{encryptMutation.data.mode}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Primary Phase:</span>
                  <span className="font-mono">{encryptMutation.data.encrypted?.primaryPhase?.phase}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Secondary Phase:</span>
                  <span className="font-mono">{encryptMutation.data.encrypted?.secondaryPhase?.phase}</span>
                </div>
                {encryptMutation.data.encrypted?.guardianPhase && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Guardian Phase:</span>
                    <span className="font-mono">{encryptMutation.data.encrypted.guardianPhase.phase}</span>
                    <Badge variant="secondary">Integrity</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Ternary Hash:</span>
                  <span className="font-mono break-all">{encryptMutation.data.ternaryHash}</span>
                </div>
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <h4 className="text-sm font-medium">Auto-Demo Results</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Recombination:</span>
                  {demo?.phaseEncryption.recombinationSuccess ? (
                    <Badge variant="secondary" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Success
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-red-600">
                      <XCircle className="h-3 w-3 mr-1" /> Failed
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Phase Alignment:</span>
                  <span className="font-mono">{demo?.phaseEncryption.phaseAlignment?.toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="font-mono">{demo?.phaseEncryption.mode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Guardian:</span>
                  {demo?.phaseEncryption.guardianValidation !== null ? (
                    demo?.phaseEncryption.guardianValidation ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-ternary-hash">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-base font-semibold">
              Ternary Hashing
            </CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hash-input">Data to Hash</Label>
              <div className="flex gap-2 flex-wrap">
                <Input
                  id="hash-input"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  className="flex-1 min-w-[180px]"
                  data-testid="input-hash-data"
                />
                <Button
                  onClick={() => hashMutation.mutate(hashInput)}
                  disabled={!hashInput || hashMutation.isPending}
                  data-testid="button-hash"
                >
                  <Hash className="h-4 w-4 mr-1" />
                  Compute
                </Button>
              </div>
            </div>

            {hashMutation.data && (
              <div className="border rounded-md p-3 space-y-2 text-xs">
                <div>
                  <span className="font-medium">Input:</span>{" "}
                  <span className="font-mono">{hashMutation.data.data}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Ternary Hash:</span>
                  <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono" data-testid="text-hash-result">
                    {hashMutation.data.hash}
                  </code>
                </div>
                <p className="text-muted-foreground">
                  Substitution-permutation network with rotation-based S-box over GF(3)
                </p>
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <h4 className="text-sm font-medium">Ternary Compression</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Original:</span>{" "}
                  <span className="font-mono">{demo?.ternaryCompression.originalSize} bytes</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ternary Encoded:</span>{" "}
                  <span className="font-mono">{demo?.ternaryCompression.ternarySize} bytes</span>
                </div>
                <div>
                  <span className="text-muted-foreground">RLE Compressed:</span>{" "}
                  <span className="font-mono">{demo?.ternaryCompression.compressedSize} bytes</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ratio:</span>{" "}
                  <span className="font-mono">{demo?.ternaryCompression.compressionRatio?.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-femtosecond-timing">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-base font-semibold">
              Femtosecond Timing
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => refetchTimestamp()}
              data-testid="button-refresh-timestamp"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-xs">
              <div className="border rounded-md p-3 space-y-2">
                <div>
                  <span className="font-medium">ISO Timestamp:</span>{" "}
                  <span className="font-mono" data-testid="text-iso-timestamp">{timestamp?.iso}</span>
                </div>
                <div>
                  <span className="font-medium">Salvi Epoch Offset:</span>{" "}
                  <span className="font-mono">{timestamp?.humanReadable}</span>
                </div>
                <div>
                  <span className="font-medium">Precision:</span>{" "}
                  <Badge variant="outline">{timestamp?.precision}</Badge>
                </div>
                <div>
                  <span className="font-medium">Raw Value:</span>{" "}
                  <span className="font-mono text-[10px] break-all">{timestamp?.value}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Clock Source</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Source:</span>{" "}
                    <span className="font-mono">{health?.timing.clockSource}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sync:</span>{" "}
                    <Badge variant="secondary">{health?.timing.synchronizationStatus}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accuracy:</span>{" "}
                    <span className="font-mono">{health?.timing.estimatedAccuracy}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Epoch:</span>{" "}
                    <span className="font-mono">2024-01-01</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="text-sm font-medium">Security Framework</h4>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>GF(3) Galois Field arithmetic over balanced ternary</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>Phase-rotation encryption with guardian integrity verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>log₂(3) = 1.585 bits/trit information density (+58.5%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>Algorand / Hedera distributed ledger witnessing</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
