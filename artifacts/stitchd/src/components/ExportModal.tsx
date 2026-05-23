import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { useProjectStore } from '../store/useProjectStore';
import { renderArrangement } from '../hooks/useAudioEngine';
import { AlertCircle } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const { projectName, arrangementClips } = useProjectStore();
  const [filename, setFilename] = useState('');
  const [sampleRate, setSampleRate] = useState('44100');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const effectiveName = filename.trim() || projectName || 'export';

  const handleExport = async () => {
    if (arrangementClips.length === 0) {
      setError('No clips in the arrangement lane. Add clips first.');
      return;
    }

    setError(null);
    setIsExporting(true);
    setProgress(15);

    try {
      await new Promise(r => setTimeout(r, 80));
      setProgress(30);

      const blob = await renderArrangement(Number(sampleRate));
      setProgress(90);

      if (blob.size === 0) {
        throw new Error('Rendered output is empty. Make sure arrangement clips have audio loaded.');
      }

      await new Promise(r => setTimeout(r, 100));
      setProgress(100);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${effectiveName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        onOpenChange(false);
        setIsExporting(false);
        setProgress(0);
      }, 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Export failed: ${msg}`);
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (isExporting) return;
    if (!o) {
      setError(null);
      setProgress(0);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Export Final Mix</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-xs">Filename</Label>
            <Input
              value={filename}
              placeholder={effectiveName}
              onChange={(e) => setFilename(e.target.value)}
              className="col-span-3 bg-input border-border h-8 text-sm"
              disabled={isExporting}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-xs">Sample Rate</Label>
            <Select value={sampleRate} onValueChange={setSampleRate} disabled={isExporting}>
              <SelectTrigger className="col-span-3 bg-input border-border h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="44100">44.1 kHz</SelectItem>
                <SelectItem value="48000">48 kHz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-xs">Format</Label>
            <div className="col-span-3 h-8 flex items-center">
              <span className="text-sm text-muted-foreground">WAV · 16-bit PCM · Stereo</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-xs">Clips</Label>
            <div className="col-span-3 h-8 flex items-center">
              <span className="text-sm font-mono text-muted-foreground">
                {arrangementClips.length} clip{arrangementClips.length !== 1 ? 's' : ''} in arrangement
              </span>
            </div>
          </div>

          {isExporting && (
            <div className="space-y-2 mt-2">
              <Progress value={progress} className="w-full h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progress < 30 ? 'Preparing...' : progress < 90 ? 'Rendering audio...' : 'Encoding WAV...'}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || arrangementClips.length === 0}
            className="bg-primary text-primary-foreground"
            data-testid="button-export-wav"
          >
            {isExporting ? 'Exporting…' : 'Export WAV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
