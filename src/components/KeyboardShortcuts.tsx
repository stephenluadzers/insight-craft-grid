import { useEffect, useCallback } from "react";
import { toast } from "sonner";

interface KeyboardShortcutsProps {
  onNewNode?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onAIGenerate?: () => void;
  onRun?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onEscape?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onNewNode,
  onDelete,
  onUndo,
  onRedo,
  onSave,
  onAIGenerate,
  onRun,
  onDuplicate,
  onSelectAll,
  onEscape,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  enabled = true
}: KeyboardShortcutsProps) => {
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape in inputs
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // New node: N
    if (e.key === 'n' && !cmdOrCtrl && !e.shiftKey && onNewNode) {
      e.preventDefault();
      onNewNode();
      return;
    }

    // Delete: Delete or Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && !cmdOrCtrl && onDelete) {
      e.preventDefault();
      onDelete();
      return;
    }

    // Undo: Cmd/Ctrl + Z
    if (cmdOrCtrl && e.key === 'z' && !e.shiftKey && onUndo) {
      e.preventDefault();
      onUndo();
      return;
    }

    // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
    if ((cmdOrCtrl && e.shiftKey && e.key === 'z') || (cmdOrCtrl && e.key === 'y')) {
      if (onRedo) {
        e.preventDefault();
        onRedo();
      }
      return;
    }

    // Save: Cmd/Ctrl + S
    if (cmdOrCtrl && e.key === 's' && onSave) {
      e.preventDefault();
      onSave();
      toast.success('Workflow saved');
      return;
    }

    // AI Generate: Cmd/Ctrl + K
    if (cmdOrCtrl && e.key === 'k' && onAIGenerate) {
      e.preventDefault();
      onAIGenerate();
      return;
    }

    // Run workflow: Cmd/Ctrl + Enter
    if (cmdOrCtrl && e.key === 'Enter' && onRun) {
      e.preventDefault();
      onRun();
      toast.info('Running workflow...');
      return;
    }

    // Duplicate: Cmd/Ctrl + D
    if (cmdOrCtrl && e.key === 'd' && onDuplicate) {
      e.preventDefault();
      onDuplicate();
      return;
    }

    // Select all: Cmd/Ctrl + A
    if (cmdOrCtrl && e.key === 'a' && onSelectAll) {
      e.preventDefault();
      onSelectAll();
      return;
    }

    // Escape
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
      return;
    }

    // Zoom in: Cmd/Ctrl + Plus
    if (cmdOrCtrl && (e.key === '=' || e.key === '+') && onZoomIn) {
      e.preventDefault();
      onZoomIn();
      return;
    }

    // Zoom out: Cmd/Ctrl + Minus
    if (cmdOrCtrl && e.key === '-' && onZoomOut) {
      e.preventDefault();
      onZoomOut();
      return;
    }

    // Zoom reset: Cmd/Ctrl + 0
    if (cmdOrCtrl && e.key === '0' && onZoomReset) {
      e.preventDefault();
      onZoomReset();
      return;
    }

    // Show shortcuts: ?
    if (e.key === '?' && !cmdOrCtrl) {
      e.preventDefault();
      showShortcutsHelp();
      return;
    }
  }, [enabled, onNewNode, onDelete, onUndo, onRedo, onSave, onAIGenerate, onRun, onDuplicate, onSelectAll, onEscape, onZoomIn, onZoomOut, onZoomReset]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

function showShortcutsHelp() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmd = isMac ? '⌘' : 'Ctrl';
  
  toast.info(
    <div className="space-y-1 text-sm">
      <p className="font-semibold mb-2">Keyboard Shortcuts</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>New Node</span><span className="text-muted-foreground">N</span>
        <span>Delete</span><span className="text-muted-foreground">Del</span>
        <span>Undo</span><span className="text-muted-foreground">{cmd}+Z</span>
        <span>Save</span><span className="text-muted-foreground">{cmd}+S</span>
        <span>AI Generate</span><span className="text-muted-foreground">{cmd}+K</span>
        <span>Run</span><span className="text-muted-foreground">{cmd}+⏎</span>
      </div>
    </div>,
    { duration: 5000 }
  );
}

export const KeyboardShortcutsProvider = ({ children, ...props }: KeyboardShortcutsProps & { children: React.ReactNode }) => {
  useKeyboardShortcuts(props);
  return <>{children}</>;
};
