import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pause } from "lucide-react";
import type { PauseNodeConfig } from "@/types/workflow-canvas";

interface PauseNodePanelProps {
  initial?: Partial<PauseNodeConfig>;
  onSave: (cfg: PauseNodeConfig) => void;
}

/** Wave 3 — Pause / wait / human-approval node. */
export function PauseNodePanel({ initial, onSave }: PauseNodePanelProps) {
  const [mode, setMode] = useState<PauseNodeConfig["mode"]>(
    initial?.mode ?? "duration"
  );
  const [duration, setDuration] = useState(initial?.duration_seconds ?? 60);
  const [until, setUntil] = useState(initial?.until_iso ?? "");
  const [role, setRole] = useState(initial?.approval_role ?? "admin");

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center gap-2">
        <Pause className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Pause / Wait</span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Mode</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as PauseNodeConfig["mode"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="duration">Sleep for a duration</SelectItem>
            <SelectItem value="until">Wait until a timestamp</SelectItem>
            <SelectItem value="approval">Wait for human approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "duration" && (
        <div className="space-y-1">
          <Label className="text-xs">Duration (seconds)</Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={1}
            max={86400}
          />
        </div>
      )}
      {mode === "until" && (
        <div className="space-y-1">
          <Label className="text-xs">Resume at (ISO timestamp)</Label>
          <Input
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            placeholder="2026-06-07T10:00:00Z"
          />
        </div>
      )}
      {mode === "approval" && (
        <div className="space-y-1">
          <Label className="text-xs">Required role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Any member</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        size="sm"
        onClick={() =>
          onSave({
            mode,
            duration_seconds: mode === "duration" ? duration : undefined,
            until_iso: mode === "until" ? until : undefined,
            approval_role: mode === "approval" ? role : undefined,
          })
        }
      >
        Save pause config
      </Button>
    </Card>
  );
}
