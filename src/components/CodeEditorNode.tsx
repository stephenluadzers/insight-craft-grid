import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Code2, Play, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CodeNodeConfig, CodeNodeLanguage } from "@/types/workflow-canvas";

const STARTERS: Record<CodeNodeLanguage, string> = {
  javascript: `// inputs: { ... }\n// return any JSON-serialisable value\nreturn { hello: inputs.name ?? "world" };`,
  typescript: `// inputs: Record<string, unknown>\nreturn { hello: (inputs as any).name ?? "world" };`,
  python: `# inputs is a dict\nreturn { "hello": inputs.get("name", "world") }`,
};

interface CodeEditorNodeProps {
  initial?: Partial<CodeNodeConfig>;
  onSave: (config: CodeNodeConfig) => void;
}

/** Wave 3 — Inline code node. Uses sandboxed Deno edge function for execution. */
export function CodeEditorNode({ initial, onSave }: CodeEditorNodeProps) {
  const [language, setLanguage] = useState<CodeNodeLanguage>(
    initial?.language ?? "javascript"
  );
  const [source, setSource] = useState(initial?.source ?? STARTERS.javascript);
  const [timeoutMs, setTimeoutMs] = useState(initial?.timeout_ms ?? 5000);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setOutput("");
    try {
      const { data, error: invErr } = await supabase.functions.invoke(
        "execute-code-node",
        {
          body: {
            language,
            source,
            timeout_ms: timeoutMs,
            inputs: { name: "tester" },
          },
        }
      );
      if (invErr) throw invErr;
      setOutput(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e?.message ?? "Execution failed");
      toast.error("Code execution failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Inline Code Node</span>
          <Badge variant="secondary" className="text-xs">
            sandboxed
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={language}
            onValueChange={(v) => {
              setLanguage(v as CodeNodeLanguage);
              setSource(STARTERS[v as CodeNodeLanguage]);
            }}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={run} disabled={running}>
            <Play className="h-3 w-3 mr-1" />
            {running ? "Running…" : "Run"}
          </Button>
        </div>
      </div>

      <Textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        className="font-mono text-xs min-h-40 bg-black/40 border-primary/10"
      />

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Timeout (ms):</span>
        <input
          type="number"
          value={timeoutMs}
          onChange={(e) => setTimeoutMs(Number(e.target.value))}
          className="w-20 bg-transparent border rounded px-2 py-0.5"
          min={500}
          max={30000}
        />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() =>
            onSave({ language, source, timeout_ms: timeoutMs, inputs: [] })
          }
        >
          Save to node
        </Button>
      </div>

      {error && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}
      {output && (
        <pre className="text-xs bg-black/40 border rounded p-2 overflow-auto max-h-40">
          {output}
        </pre>
      )}
    </Card>
  );
}
