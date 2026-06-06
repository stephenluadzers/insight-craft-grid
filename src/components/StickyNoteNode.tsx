import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StickyNote, Palette, Trash2 } from "lucide-react";
import type { StickyColor } from "@/types/workflow-canvas";
import { cn } from "@/lib/utils";

const COLOR_CLASSES: Record<StickyColor, string> = {
  amber: "bg-amber-500/15 border-amber-500/40 text-amber-100",
  rose: "bg-rose-500/15 border-rose-500/40 text-rose-100",
  violet: "bg-violet-500/15 border-violet-500/40 text-violet-100",
  emerald: "bg-emerald-500/15 border-emerald-500/40 text-emerald-100",
  sky: "bg-sky-500/15 border-sky-500/40 text-sky-100",
  slate: "bg-slate-500/15 border-slate-500/40 text-slate-100",
};

interface StickyNoteNodeProps {
  content: string;
  color: StickyColor;
  onChange: (content: string) => void;
  onColorChange: (color: StickyColor) => void;
  onDelete: () => void;
  editable?: boolean;
}

/** Wave 3 — Inline sticky note overlay for the canvas. Uses liquid-glass tokens. */
export function StickyNoteNode({
  content,
  color,
  onChange,
  onColorChange,
  onDelete,
  editable = true,
}: StickyNoteNodeProps) {
  const [editing, setEditing] = useState(false);
  const colors: StickyColor[] = ["amber", "rose", "violet", "emerald", "sky", "slate"];

  return (
    <Card
      className={cn(
        "p-3 backdrop-blur-xl border shadow-lg w-60 min-h-32 flex flex-col gap-2",
        COLOR_CLASSES[color]
      )}
    >
      <div className="flex items-center justify-between text-xs opacity-80">
        <span className="flex items-center gap-1">
          <StickyNote className="h-3 w-3" />
          Note
        </span>
        {editable && (
          <div className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={cn(
                  "h-3 w-3 rounded-full border",
                  COLOR_CLASSES[c],
                  c === color && "ring-2 ring-white/60"
                )}
                aria-label={`Set color ${c}`}
              />
            ))}
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      {editing && editable ? (
        <Textarea
          autoFocus
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className="bg-transparent border-none text-sm resize-none flex-1 focus-visible:ring-0"
          placeholder="Add a note…"
        />
      ) : (
        <div
          className="text-sm whitespace-pre-wrap flex-1 cursor-text"
          onDoubleClick={() => editable && setEditing(true)}
        >
          {content || (
            <span className="opacity-60 italic">Double-click to edit…</span>
          )}
        </div>
      )}
    </Card>
  );
}
