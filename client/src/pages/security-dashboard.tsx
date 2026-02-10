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
  ShieldCheck,
  Gauge,
  Timer,
  Layers,
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
import { useSettings } from "@/components/settings-provider";

interface HealthData {
  enabled: boolean;
  mode: string;
  engine: string;
  version: string;
  cnsa: string;
  services: Record<string, boolean>;
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
  cnsaCompliance?: {
    coverage: string;
    coveragePercent: number;
    fipsTarget: string;
  };
}

interface CnsaAlgorithm {
  id: string;
  name: string;
  standard: string;
  category: string;
  securityLevels?: number[];
  status: string;
  notes: string;
}

interface CnsaReport {
  framework: string;
  version: string;
  totalAlgorithms: number;
  implementedCount: number;
  coveragePercent: number;
  fipsTarget: string;
  algorithms: CnsaAlgorithm[];
  plenumNetVersion: string;
}

interface DensityBenchmark {
  sampleSizes: number[];
  results: Array<{
    sampleSize: number;
    trits: number;
    bitsEquivalent: number;
    densityGainPercent: string;
    compressionRatio: string;
    validated: boolean;
  }>;
  overallValid: boolean;
  theoreticalDensity: string;
  log2of3: number;
}

interface TimingSelfTest {
  sampleCount: number;
  minJitterNs: number;
  maxJitterNs: number;
  avgJitterNs: number;
  medianJitterNs: number;
  stdDevNs: number;
  clockSource: string;
  monotonicValid: boolean;
  precision: string;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    key_encapsulation: "Key Encapsulation",
    digital_signature: "Digital Signature",
    symmetric: "Symmetric Encryption",
    hash: "Hash Function",
    mac: "MAC",
    stateful_signature: "Stateful Signature",
  };
  return map[cat] || cat;
}

interface DocSecurityStats {
  totalDocuments: number;
  encryptedCount: number;
  totalSizeBytes: number;
  compressedSizeBytes: number;
  securityEngine: {
    plenumnet: number;
    kong: number;
    total: number;
  };
  modeBreakdown: Record<string, number>;
}

export default function SecurityDashboard() {
  const { activeTenant } = useSettings();
  const [hashInput, setHashInput] = useState("The Maestro ERP");
  const [encryptInput, setEncryptInput] = useState("Sensitive construction data");
  const [encryptMode, setEncryptMode] = useState("balanced");
  const [activeTab, setActiveTab] = useState<"overview" | "cnsa" | "benchmarks" | "operations">("overview");

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

  const { data: cnsaReport } = useQuery<CnsaReport>({
    queryKey: ["/api/plenumnet/cnsa/compliance"],
  });

  const { data: densityBenchmark, refetch: refetchDensity, isFetching: densityFetching } = useQuery<DensityBenchmark>({
    queryKey: ["/api/plenumnet/ternary/density-benchmark"],
    enabled: false,
  });

  const { data: timingTest, refetch: refetchTiming, isFetching: timingFetching } = useQuery<TimingSelfTest>({
    queryKey: ["/api/plenumnet/timing/self-test"],
    enabled: false,
  });

  const docSecStatsUrl = activeTenant?.id
    ? `/api/documents/security/stats?tenantId=${activeTenant.id}`
    : null;
  const { data: docSecStats } = useQuery<DocSecurityStats>({
    queryKey: ["/api/documents/security/stats", activeTenant?.id],
    queryFn: async () => {
      const res = await fetch(docSecStatsUrl!);
      if (!res.ok) throw new Error("Failed to fetch document security stats");
      return res.json();
    },
    enabled: !!docSecStatsUrl && activeTab === "operations",
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

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Shield },
    { key: "cnsa" as const, label: "CNSA 2.0", icon: ShieldCheck },
    { key: "benchmarks" as const, label: "Benchmarks", icon: Gauge },
    { key: "operations" as const, label: "Operations", icon: Layers },
  ];

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <Shield className="h-7 w-7 text-teal-500" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-security-title">PlenumNET Security Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Salvi Framework / libternary v{health?.version} &mdash; Post-Quantum Security Engine &mdash; CNSA {health?.cnsa}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Badge variant="outline" data-testid="badge-cnsa-version">
            CNSA {health?.cnsa}
          </Badge>
          <Badge variant="outline" data-testid="badge-engine-version">
            {health?.engine} v{health?.version}
          </Badge>
        </div>
      </div>

      <div className="flex gap-1 border-b flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`button-tab-${tab.key}`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
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

            <Card data-testid="card-cnsa-summary">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CNSA 2.0</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500" data-testid="text-cnsa-coverage">
                  {demo?.cnsaCompliance?.coverage || "11/11"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {demo?.cnsaCompliance?.coveragePercent || 100}% algorithm coverage
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                      )}
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-femtosecond-timing">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Timing Details</CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => refetchTimestamp()}
                  data-testid="button-refresh-timestamp"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">ISO:</span>{" "}
                  <span className="font-mono" data-testid="text-iso-timestamp">{timestamp?.iso}</span>
                </div>
                <div>
                  <span className="font-medium">Salvi Offset:</span>{" "}
                  <span className="font-mono">{timestamp?.humanReadable}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Clock:</span>
                  <span className="font-mono">{health?.timing.clockSource}</span>
                  <Badge variant="secondary">{health?.timing.synchronizationStatus}</Badge>
                </div>
                <div>
                  <span className="font-medium">Accuracy:</span>{" "}
                  <span className="font-mono">{health?.timing.estimatedAccuracy}</span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-framework-summary">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Framework</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>GF(3) Galois Field arithmetic over balanced ternary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>Phase-rotation encryption with guardian integrity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>Tribonacci-weighted hash (tau-derived seeds)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>CNSA 2.0: 11/11 algorithms (FIPS 203/204)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>Algorand / Hedera distributed ledger witnessing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>FIPS 140-3 Level 1 target compliance</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === "cnsa" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500" data-testid="text-cnsa-detail-coverage">
                  {cnsaReport?.coveragePercent || 100}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {cnsaReport?.implementedCount}/{cnsaReport?.totalAlgorithms} algorithms
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">FIPS Target</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid="text-fips-target">
                  {cnsaReport?.fipsTarget || "FIPS 140-3 Level 1"}
                </div>
                <p className="text-xs text-muted-foreground">
                  CMVP certification target
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PlenumNET Version</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid="text-plenumnet-version">
                  v{cnsaReport?.plenumNetVersion || health?.version}
                </div>
                <p className="text-xs text-muted-foreground">
                  Framework: {cnsaReport?.framework} {cnsaReport?.version}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-cnsa-algorithms">
            <CardHeader>
              <CardTitle className="text-base font-semibold">CNSA 2.0 Algorithm Suite</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Levels</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cnsaReport?.algorithms.map((algo) => (
                    <TableRow key={algo.id}>
                      <TableCell className="font-mono text-xs font-medium">{algo.name}</TableCell>
                      <TableCell className="text-xs">{algo.standard}</TableCell>
                      <TableCell className="text-xs">{categoryLabel(algo.category)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {algo.securityLevels?.join(", ") || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={algo.status === "implemented" || algo.status === "validated" ? "secondary" : "outline"}
                          className={algo.status === "implemented" || algo.status === "validated" ? "text-green-600" : ""}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {algo.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "benchmarks" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-density-benchmark">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
                <CardTitle className="text-base font-semibold">Density Benchmark</CardTitle>
                <Button
                  onClick={() => refetchDensity()}
                  disabled={densityFetching}
                  data-testid="button-run-density-benchmark"
                >
                  {densityFetching ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Gauge className="h-4 w-4 mr-2" />}
                  Run Benchmark
                </Button>
              </CardHeader>
              <CardContent>
                {densityBenchmark ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={densityBenchmark.overallValid ? "secondary" : "destructive"} className={densityBenchmark.overallValid ? "text-green-600" : ""}>
                        {densityBenchmark.overallValid ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {densityBenchmark.overallValid ? "Validated" : "Failed"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Theoretical: {densityBenchmark.theoreticalDensity} | log2(3) = {densityBenchmark.log2of3.toFixed(6)}
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sample Size</TableHead>
                          <TableHead>Bits Equiv.</TableHead>
                          <TableHead>Density Gain</TableHead>
                          <TableHead>Ratio</TableHead>
                          <TableHead>Valid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {densityBenchmark.results.map((r) => (
                          <TableRow key={r.sampleSize}>
                            <TableCell className="font-mono text-xs">{r.sampleSize.toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-xs">{r.bitsEquivalent.toFixed(1)}</TableCell>
                            <TableCell className="font-mono text-xs text-teal-500">{r.densityGainPercent}</TableCell>
                            <TableCell className="font-mono text-xs">{r.compressionRatio}</TableCell>
                            <TableCell>
                              {r.validated ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Run Benchmark" to validate the 59% information density advantage at 4 sample sizes.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-timing-selftest">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
                <CardTitle className="text-base font-semibold">Timing Self-Test</CardTitle>
                <Button
                  onClick={() => refetchTiming()}
                  disabled={timingFetching}
                  data-testid="button-run-timing-test"
                >
                  {timingFetching ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Timer className="h-4 w-4 mr-2" />}
                  Run Test
                </Button>
              </CardHeader>
              <CardContent>
                {timingTest ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={timingTest.monotonicValid ? "secondary" : "destructive"} className={timingTest.monotonicValid ? "text-green-600" : ""}>
                        {timingTest.monotonicValid ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {timingTest.monotonicValid ? "Monotonic" : "Non-Monotonic"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timingTest.sampleCount} samples | {timingTest.clockSource} | {timingTest.precision}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="border rounded-md p-2">
                        <span className="text-muted-foreground block">Min Jitter</span>
                        <span className="font-mono font-medium">{timingTest.minJitterNs} ns</span>
                      </div>
                      <div className="border rounded-md p-2">
                        <span className="text-muted-foreground block">Max Jitter</span>
                        <span className="font-mono font-medium">{timingTest.maxJitterNs} ns</span>
                      </div>
                      <div className="border rounded-md p-2">
                        <span className="text-muted-foreground block">Average</span>
                        <span className="font-mono font-medium">{timingTest.avgJitterNs} ns</span>
                      </div>
                      <div className="border rounded-md p-2">
                        <span className="text-muted-foreground block">Median</span>
                        <span className="font-mono font-medium">{timingTest.medianJitterNs} ns</span>
                      </div>
                      <div className="border rounded-md p-2">
                        <span className="text-muted-foreground block">Std Dev</span>
                        <span className="font-mono font-medium">{timingTest.stdDevNs} ns</span>
                      </div>
                      <div className="border rounded-md p-2">
                        <span className="text-muted-foreground block">Samples</span>
                        <span className="font-mono font-medium">{timingTest.sampleCount}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Run Test" to perform a 1000-sample timer resolution and jitter analysis.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-compression-stats">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Ternary Compression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="border rounded-md p-3">
                  <span className="text-muted-foreground block mb-1">Original</span>
                  <span className="font-mono text-lg font-bold">{demo?.ternaryCompression.originalSize}</span>
                  <span className="text-muted-foreground ml-1">bytes</span>
                </div>
                <div className="border rounded-md p-3">
                  <span className="text-muted-foreground block mb-1">Ternary Encoded</span>
                  <span className="font-mono text-lg font-bold">{demo?.ternaryCompression.ternarySize}</span>
                  <span className="text-muted-foreground ml-1">bytes</span>
                </div>
                <div className="border rounded-md p-3">
                  <span className="text-muted-foreground block mb-1">RLE Compressed</span>
                  <span className="font-mono text-lg font-bold">{demo?.ternaryCompression.compressedSize}</span>
                  <span className="text-muted-foreground ml-1">bytes</span>
                </div>
                <div className="border rounded-md p-3">
                  <span className="text-muted-foreground block mb-1">Ratio</span>
                  <span className="font-mono text-lg font-bold">{demo?.ternaryCompression.compressionRatio?.toFixed(1)}</span>
                  <span className="text-muted-foreground ml-1">%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "operations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card data-testid="card-security-posture">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
                <CardTitle className="text-base font-semibold">
                  Document Security Posture
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border rounded-md p-3">
                    <span className="text-muted-foreground block mb-1">Total Documents</span>
                    <span className="font-medium text-lg" data-testid="text-total-docs">
                      {docSecStats?.totalDocuments ?? "--"}
                    </span>
                  </div>
                  <div className="border rounded-md p-3">
                    <span className="text-muted-foreground block mb-1">Encrypted</span>
                    <span className="font-medium text-lg" data-testid="text-encrypted-count">
                      {docSecStats ? `${docSecStats.encryptedCount} / ${docSecStats.totalDocuments}` : "--"}
                    </span>
                  </div>
                  <div className="border rounded-md p-3">
                    <span className="text-muted-foreground block mb-1">PlenumNET Protected</span>
                    <span className="font-medium" data-testid="text-plenumnet-count">
                      {docSecStats?.securityEngine?.plenumnet ?? 0} doc{(docSecStats?.securityEngine?.plenumnet ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="border rounded-md p-3">
                    <span className="text-muted-foreground block mb-1">Kong Protected</span>
                    <span className="font-medium" data-testid="text-kong-count">
                      {docSecStats?.securityEngine?.kong ?? 0} doc{(docSecStats?.securityEngine?.kong ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                {docSecStats && Object.keys(docSecStats.modeBreakdown).length > 0 && (
                  <div className="border-t pt-3">
                    <span className="text-muted-foreground text-xs block mb-2">Encryption Modes</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(docSecStats.modeBreakdown).map(([mode, count]) => (
                        <Badge key={mode} variant="secondary" data-testid={`badge-mode-${mode}`}>
                          {mode.replace(/_/g, " ")}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t pt-3 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border rounded-md p-3">
                      <span className="text-muted-foreground block mb-1">Encryption Engine</span>
                      <span className="font-medium" data-testid="text-encryption-engine">Phase-Rotation (3-phase)</span>
                    </div>
                    <div className="border rounded-md p-3">
                      <span className="text-muted-foreground block mb-1">Hash Algorithm</span>
                      <span className="font-medium" data-testid="text-hash-algorithm">Tribonacci Sponge</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">Documents are protected by PlenumNET v4.0.0 post-quantum phase-rotation encryption with guardian integrity verification and Tribonacci hash checksums.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
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
                      <span className="text-muted-foreground">Alignment:</span>
                      <span className="font-mono">{demo?.phaseEncryption.phaseAlignment?.toFixed(4)}</span>
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
                      Tribonacci-weighted sponge hash with 13-round finalization over GF(3)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
