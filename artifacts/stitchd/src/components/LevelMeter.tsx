import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { meterAnalysers } from '../hooks/useAudioEngine';

const DB_FLOOR = -60;
const HOLD_MS = 1800;
const HOLD_DECAY_DB_S = 18;

function dbFromLinear(v: number): number {
  if (v < 1e-7) return DB_FLOOR;
  return Math.max(DB_FLOOR, 20 * Math.log10(v));
}

function dbToFraction(db: number): number {
  return Math.max(0, Math.min(1, (db - DB_FLOOR) / -DB_FLOOR));
}

interface ChannelState {
  smoothPeak: number;
  smoothRms: number;
  holdDb: number;
  holdAt: number;
  clipLit: boolean;
  clipAt: number;
}

const initChannel = (): ChannelState => ({
  smoothPeak: 0,
  smoothRms: 0,
  holdDb: DB_FLOOR,
  holdAt: 0,
  clipLit: false,
  clipAt: 0,
});

export function LevelMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<[ChannelState, ChannelState]>([initChannel(), initChannel()]);
  const bufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(1024) as Float32Array<ArrayBuffer>);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas geometry (logical pixels — HiDPI scaled below)
    const W = 32;
    const H = 44;
    const LABEL_H = 9;
    const BAR_H = H - LABEL_H;
    const BAR_W = 12;
    const GAP = 2;
    const LX = 3;
    const RX = LX + BAR_W + GAP;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const CLIP_DB = -0.5;

    function drawFrame(now: number) {
      ctx.clearRect(0, 0, W, H);

      const isPlaying = useProjectStore.getState().playbackState === 'playing';
      const analysers = [meterAnalysers.left, meterAnalysers.right];
      const xs = [LX, RX];
      const labels = ['L', 'R'];

      for (let ch = 0; ch < 2; ch++) {
        const s = stateRef.current[ch];
        const analyser = analysers[ch];
        const x = xs[ch];

        // --- Read samples ---
        let peakLin = 0;
        let rmsLin = 0;

        if (analyser && isPlaying) {
          const buf = bufRef.current;
          analyser.getFloatTimeDomainData(buf);
          let sumSq = 0;
          const len = analyser.fftSize;
          for (let i = 0; i < len; i++) {
            const abs = Math.abs(buf[i]);
            if (abs > peakLin) peakLin = abs;
            sumSq += buf[i] * buf[i];
          }
          rmsLin = Math.sqrt(sumSq / len);
        }

        // --- Smooth: fast attack, slow release ---
        if (peakLin > s.smoothPeak) {
          s.smoothPeak = s.smoothPeak * 0.2 + peakLin * 0.8;
        } else {
          s.smoothPeak = isPlaying ? s.smoothPeak * 0.94 : s.smoothPeak * 0.88;
        }
        if (rmsLin > s.smoothRms) {
          s.smoothRms = s.smoothRms * 0.4 + rmsLin * 0.6;
        } else {
          s.smoothRms = isPlaying ? s.smoothRms * 0.92 : s.smoothRms * 0.86;
        }

        const peakDb = dbFromLinear(s.smoothPeak);
        const rmsDb = dbFromLinear(s.smoothRms);

        // --- Peak hold ---
        if (peakDb >= s.holdDb) {
          s.holdDb = peakDb;
          s.holdAt = now;
        } else if (now - s.holdAt > HOLD_MS) {
          const decay = HOLD_DECAY_DB_S * (now - s.holdAt - HOLD_MS) / 1000;
          s.holdDb = Math.max(DB_FLOOR, s.holdDb - decay);
        }

        // --- Clip indicator ---
        if (peakDb >= CLIP_DB) {
          s.clipLit = true;
          s.clipAt = now;
        } else if (s.clipLit && now - s.clipAt > 2000) {
          s.clipLit = false;
        }

        // --- Draw bar slot ---
        ctx.fillStyle = 'hsl(228 18% 7%)';
        ctx.fillRect(x, 0, BAR_W, BAR_H);

        // Tick marks at -12, -6, -3, 0 dBFS
        const ticks = [-48, -36, -24, -12, -6, -3];
        for (const t of ticks) {
          const ty = BAR_H - dbToFraction(t) * BAR_H;
          ctx.fillStyle = t <= -6 ? 'hsl(228 12% 18%)' : 'hsl(228 12% 22%)';
          ctx.fillRect(x + BAR_W - 3, ty, 2, 1);
        }

        // --- RMS fill (gradient) ---
        if (rmsDb > DB_FLOOR + 1) {
          const rmsY = BAR_H - dbToFraction(rmsDb) * BAR_H;
          const grad = ctx.createLinearGradient(0, 0, 0, BAR_H);
          grad.addColorStop(0, 'hsl(4 80% 52% / 0.95)');             // clip red
          grad.addColorStop(dbToFraction(-3), 'hsl(84 88% 50% / 0.9)'); // toxic signal peak
          grad.addColorStop(dbToFraction(-12), 'hsl(176 82% 46% / 0.88)'); // signal cyan at -12
          grad.addColorStop(dbToFraction(-24), 'hsl(176 70% 32% / 0.72)'); // dim signal cyan
          grad.addColorStop(1, 'hsl(176 55% 18% / 0.48)');             // dark floor
          ctx.fillStyle = grad;
          ctx.fillRect(x + 1, rmsY, BAR_W - 4, BAR_H - rmsY);
        }

        // --- Instantaneous peak bar (2px bright cap) ---
        if (peakDb > DB_FLOOR + 2) {
          const pY = BAR_H - dbToFraction(peakDb) * BAR_H;
          ctx.fillStyle = peakDb >= CLIP_DB
            ? 'hsl(4 80% 65% / 0.9)'
            : 'hsl(176 90% 68% / 0.82)';
          ctx.fillRect(x + 1, pY, BAR_W - 4, 2);
        }

        // --- Peak hold line (1px) ---
        if (s.holdDb > DB_FLOOR + 3) {
          const hY = BAR_H - dbToFraction(s.holdDb) * BAR_H;
          // Fade the hold line as it decays
          const age = Math.max(0, now - s.holdAt - HOLD_MS);
          const alpha = s.holdDb > DB_FLOOR + 3
            ? Math.max(0.15, 1 - age / (HOLD_DECAY_DB_S * 1000 / 20))
            : 0;
          ctx.fillStyle = s.holdDb >= CLIP_DB
            ? `hsl(4 80% 70% / ${alpha})`
            : `hsl(176 95% 70% / ${alpha})`;
          ctx.fillRect(x + 1, Math.max(1, hY), BAR_W - 4, 1);
        }

        // --- Clip indicator dot (top-left of bar) ---
        if (s.clipLit) {
          ctx.fillStyle = 'hsl(4 80% 60%)';
          ctx.fillRect(x, 0, 3, 3);
        }

        // --- Slot border ---
        ctx.strokeStyle = 'hsl(228 12% 16%)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.25, 0.25, BAR_W - 0.5, BAR_H - 0.5);

        // --- Channel label ---
        ctx.fillStyle = 'hsl(210 8% 28%)';
        ctx.font = `500 7px 'SF Mono', ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(labels[ch], x + BAR_W / 2, H - 1);
      }

      animRef.current = requestAnimationFrame(drawFrame);
    }

    animRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []); // runs once; reads fresh state inside rAF via store.getState() and meterAnalysers ref

  return (
    <div className="flex flex-col items-center" title="Peak / RMS — L R">
      <span className="text-[7px] uppercase tracking-[0.12em] text-muted-foreground/35 font-mono leading-none mb-0.5">LEVEL</span>
      <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
