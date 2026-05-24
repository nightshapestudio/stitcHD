import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, AlertTriangle, Maximize2 } from 'lucide-react';
import { CrossfadeEditor } from './CrossfadeEditor';
import { SeamAuditionButton } from './SeamAuditionButton';
import { SECTION_LABELS } from '../lib/sectionLabels';
import { SectionLabel } from '../types/audio';

export function RightInspector() {
  const { 
    arrangementClips, 
    selectedClipId, 
    updateArrangementClip, 
    tracks,
    bpm
  } = useProjectStore();

  const [fitTargetDuration, setFitTargetDuration] = useState('');

  const clip = arrangementClips.find(c => c.id === selectedClipId);
  const track = clip ? tracks.find(t => t.id === clip.trackId) : null;

  if (!clip || !track) {
    return (
      <div className="w-64 border-l border-border bg-sidebar text-sidebar-foreground flex flex-col h-full shrink-0 p-6 items-center justify-center text-center">
        <Info className="w-8 h-8 text-muted-foreground mb-4 opacity-30" />
        <h3 className="text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground mb-2">NO CLIP SELECTED</h3>
      </div>
    );
  }

  const secondsPerBar = (60 / bpm) * 4;
  const outputDuration = clip ? clip.sourceDuration / Math.max(0.05, clip.stretchRatio) : 0;

  const handleNudge = (amount: number) => {
    updateArrangementClip(clip.id, { nudgeOffset: clip.nudgeOffset + amount });
  };

  const handleNudgeBar = (direction: -1 | 1) => {
    updateArrangementClip(clip.id, { 
      timelinePosition: Math.max(0, clip.timelinePosition + (secondsPerBar * direction))
    });
  };

  const handleFitToSection = () => {
    const targetSecs = parseFloat(fitTargetDuration);
    if (!isNaN(targetSecs) && targetSecs > 0 && clip.sourceDuration > 0) {
      const ratio = targetSecs / clip.sourceDuration;
      const clamped = Math.max(0.25, Math.min(4, ratio));
      updateArrangementClip(clip.id, { stretchRatio: clamped });
    }
  };

  const handleFitTargetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleFitToSection();
  };

  return (
    <div className="w-64 border-l border-border bg-sidebar text-sidebar-foreground flex flex-col h-full shrink-0 overflow-y-auto no-scrollbar">
      <div className="p-4 border-b border-border sticky top-0 bg-sidebar z-10 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-full absolute left-0 top-0 bottom-0" style={{ backgroundColor: clip.color || track.color }} />
          <Input 
            value={clip.label}
            onChange={(e) => updateArrangementClip(clip.id, { label: e.target.value })}
            className="h-7 px-2 font-medium bg-transparent border-transparent hover:border-border focus:border-primary uppercase tracking-[0.08em] text-xs rounded-none"
          />
        </div>

        {/* Section label anchor — one click assigns, second click clears */}
        <div className="flex gap-px flex-wrap">
          {SECTION_LABELS.map(({ key, short }) => {
            const active = clip.sectionLabel === key;
            return (
              <button
                key={key}
                onClick={() => updateArrangementClip(clip.id, {
                  sectionLabel: active ? undefined : key as SectionLabel
                })}
                title={key.toUpperCase()}
                className={`h-5 px-1.5 text-[8px] uppercase tracking-[0.12em] font-medium border transition-colors ${
                  active
                    ? 'border-primary/60 text-primary bg-primary/10'
                    : 'border-border/50 text-muted-foreground/50 hover:border-primary/30 hover:text-foreground/70 hover:bg-white/5'
                }`}
              >
                {short}
              </button>
            );
          })}
        </div>

        <div className="text-[9px] uppercase tracking-[0.12em] font-mono text-muted-foreground px-2">
          SRC: {track.name}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Timing */}
        <div className="space-y-4">
          <h4 className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium">TIMING</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">START (s)</Label>
              <div className="bg-[#0b0c10] border border-border h-7 flex items-center px-2">
                <input 
                  type="number"
                  value={clip.timelinePosition.toFixed(3)}
                  onChange={(e) => updateArrangementClip(clip.id, { timelinePosition: Number(e.target.value) })}
                  className="w-full bg-transparent text-xs font-mono text-foreground outline-none"
                  step={0.1}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">LENGTH (s)</Label>
              <div className="bg-[#0b0c10] border border-border h-7 flex items-center px-2">
                <input 
                  type="number"
                  value={clip.sourceDuration.toFixed(3)}
                  onChange={(e) => updateArrangementClip(clip.id, { sourceDuration: Number(e.target.value) })}
                  className="w-full bg-transparent text-xs font-mono text-foreground outline-none"
                  step={0.1}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground flex justify-between">
              <span>NUDGE OFFSET (ms)</span>
              <span className="font-mono text-primary">{clip.nudgeOffset.toFixed(1)}</span>
            </Label>
            <div className="flex gap-px">
              <Button variant="outline" size="icon" className="h-7 flex-1 rounded-none border-border bg-transparent hover:bg-white/5 hover:border-primary/50 text-foreground" onClick={() => handleNudge(-10)} title="-10ms">
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 flex-1 rounded-none border-border bg-transparent hover:bg-white/5 hover:border-primary/50 text-foreground" onClick={() => handleNudge(10)} title="+10ms">
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 flex-1 rounded-none border-border bg-transparent hover:bg-white/5 hover:border-primary/50 text-foreground" onClick={() => handleNudgeBar(-1)} title="-1 Bar">
                <ChevronsLeft className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 flex-1 rounded-none border-border bg-transparent hover:bg-white/5 hover:border-primary/50 text-foreground" onClick={() => handleNudgeBar(1)} title="+1 Bar">
                <ChevronsRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground flex justify-between">
              <span>SLIP CONTENT (s)</span>
              <span className="font-mono">{clip.slipOffset.toFixed(3)}</span>
            </Label>
            <Slider 
              value={[clip.slipOffset]} 
              min={-5}
              max={5}
              step={0.001}
              onValueChange={([v]) => updateArrangementClip(clip.id, { slipOffset: v })}
            />
          </div>
        </div>

        {/* Fades */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium">FADES</h4>
          <CrossfadeEditor
            clip={clip}
            outputDuration={outputDuration}
            secondsPerBar={bpm > 0 ? (60 / bpm) * 4 : undefined}
            onChange={(u) => updateArrangementClip(clip.id, u)}
          />
        </div>

        {/* Audio */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium">AUDIO</h4>
          
          <div className="space-y-2">
            <Label className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground flex justify-between">
              <span>GAIN</span>
              <span className="font-mono">{Math.round(clip.gain * 100)}%</span>
            </Label>
            <Slider 
              value={[clip.gain]} 
              min={0}
              max={2}
              step={0.01}
              onValueChange={([v]) => updateArrangementClip(clip.id, { gain: v })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground flex items-center gap-1">
                <span>TIME STRETCH</span>
                <span className="font-mono text-primary ml-auto">{clip.stretchRatio.toFixed(2)}x</span>
              </Label>
            </div>
            <Slider 
              value={[clip.stretchRatio]} 
              min={0.5}
              max={2}
              step={0.01}
              onValueChange={([v]) => updateArrangementClip(clip.id, { stretchRatio: v })}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-400/70 shrink-0" />
              <span className="text-[8px] uppercase tracking-[0.08em] text-amber-400/70 font-medium">
                DRAFT — changes pitch
              </span>
            </div>
          </div>

          {/* Fit Clip to Section */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              FIT CLIP TO SECTION
            </Label>
            <div className="flex gap-1">
              <div className="bg-[#0b0c10] border border-border h-7 flex items-center px-2 flex-1">
                <input
                  type="number"
                  value={fitTargetDuration}
                  onChange={(e) => setFitTargetDuration(e.target.value)}
                  onKeyDown={handleFitTargetKeyDown}
                  placeholder={clip.sourceDuration.toFixed(2)}
                  className="w-full bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/40"
                  step={0.1}
                  min={0.01}
                />
              </div>
              <span className="text-[9px] text-muted-foreground self-center shrink-0">s</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-none border-border bg-transparent hover:bg-primary/10 hover:border-primary/60 text-primary shrink-0"
                onClick={handleFitToSection}
                title="Fit clip: set stretch ratio so clip fills the target duration"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="text-[8px] font-mono text-muted-foreground/50 px-0.5">
              ratio = target ÷ {clip.sourceDuration.toFixed(2)}s → {
                (() => {
                  const t = parseFloat(fitTargetDuration);
                  if (!isNaN(t) && t > 0 && clip.sourceDuration > 0) {
                    const r = Math.max(0.25, Math.min(4, t / clip.sourceDuration));
                    return `${r.toFixed(3)}x`;
                  }
                  return '—';
                })()
              }
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <SeamAuditionButton clipId={clip.id} />
        </div>
      </div>
    </div>
  );
}
