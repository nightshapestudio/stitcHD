import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useProjectStore } from '../store/useProjectStore';
import { AlertCircle } from 'lucide-react';

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectModal({ open, onOpenChange }: ProjectModalProps) {
  const { saveProject, loadProject } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        loadProject(content);
        onOpenChange(false);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] border-border bg-card rounded-none">
        <DialogHeader>
          <DialogTitle className="text-[11px] uppercase tracking-[0.15em] text-foreground font-medium">Project</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground tracking-wide">
            Save or load a STITCHD session file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <button
            className="w-full flex items-center justify-between px-4 py-3 border border-border bg-transparent hover:bg-white/4 hover:border-foreground/20 transition-colors group text-left"
            onClick={() => { saveProject(); onOpenChange(false); }}
          >
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.08em] text-foreground group-hover:text-primary transition-colors">Save Project</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">Download .stitchd file</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>

          <button
            className="w-full flex items-center justify-between px-4 py-3 border border-border bg-transparent hover:bg-white/4 hover:border-foreground/20 transition-colors group text-left"
            onClick={() => fileInputRef.current?.click()}
          >
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.08em] text-foreground group-hover:text-primary transition-colors">Load Project</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">Open .stitchd file</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".stitchd"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border text-[10px] text-muted-foreground leading-relaxed">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground/60" />
          <span>Audio files cannot be bundled due to browser security restrictions. When loading, re-import the original audio files with the same names.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
