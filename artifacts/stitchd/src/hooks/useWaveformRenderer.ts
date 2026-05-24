import { useEffect } from 'react';
import type { RefObject } from 'react';

interface WaveformRendererProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  waveformData: Float32Array | null;
  color: string;
  pixelsPerSecond: number;
  scrollOffset: number;
  duration: number;
  width: number;
  height: number;
  showGrid?: boolean;
  bpm?: number;
}

export function useWaveformRenderer({
  canvasRef,
  waveformData,
  color,
  pixelsPerSecond,
  scrollOffset,
  duration,
  width,
  height,
  showGrid = false,
  bpm = 120,
}: WaveformRendererProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (showGrid && bpm > 0 && pixelsPerSecond > 0) {
      const secondsPerBeat = 60 / bpm;
      const visibleDuration = width / pixelsPerSecond;
      const firstBeat = Math.floor(scrollOffset / secondsPerBeat);
      const lastBeat = Math.ceil((scrollOffset + visibleDuration) / secondsPerBeat);

      for (let i = firstBeat; i <= lastBeat; i++) {
        const beatTime = i * secondsPerBeat;
        const x = (beatTime - scrollOffset) * pixelsPerSecond;
        if (x < 0 || x > width) continue;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        if (i % 4 === 0) {
          ctx.strokeStyle = 'hsl(258 50% 62% / 0.11)';
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();
      }
    }

    if (!waveformData || waveformData.length === 0 || duration <= 0 || pixelsPerSecond <= 0) return;

    const visibleStart = scrollOffset;
    const visibleEnd = scrollOffset + width / pixelsPerSecond;

    const dataStartIndex = Math.max(0, Math.floor((visibleStart / duration) * waveformData.length) - 1);
    const dataEndIndex = Math.min(waveformData.length - 1, Math.ceil((visibleEnd / duration) * waveformData.length) + 1);

    const middleY = height / 2;

    ctx.beginPath();
    let started = false;
    for (let i = dataStartIndex; i <= dataEndIndex; i++) {
      const timeAtPoint = (i / waveformData.length) * duration;
      const x = (timeAtPoint - scrollOffset) * pixelsPerSecond;
      const amplitude = Math.min(1, waveformData[i]) * (middleY - 2);
      if (!started) {
        ctx.moveTo(x, middleY - amplitude);
        started = true;
      } else {
        ctx.lineTo(x, middleY - amplitude);
      }
    }
    for (let i = dataEndIndex; i >= dataStartIndex; i--) {
      const timeAtPoint = (i / waveformData.length) * duration;
      const x = (timeAtPoint - scrollOffset) * pixelsPerSecond;
      const amplitude = Math.min(1, waveformData[i]) * (middleY - 2);
      ctx.lineTo(x, middleY + amplitude);
    }
    ctx.closePath();

    // Build a color string with a given alpha, stripping any existing alpha first
    const withAlpha = (c: string, a: number): string => {
      const stripped = c.replace(/\s*\/\s*[\d.]+\)\s*$/, ')').replace(/\)\s*$/, '');
      return `${stripped} / ${a})`;
    };

    // Vertical gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, withAlpha(color, 0.5));
    gradient.addColorStop(0.5, withAlpha(color, 0.72));
    gradient.addColorStop(1, withAlpha(color, 0.5));

    ctx.fillStyle = gradient;
    ctx.fill();

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, middleY);
    ctx.lineTo(width, middleY);
    ctx.strokeStyle = withAlpha(color, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top outline — crisp edge on the waveform peak
    ctx.beginPath();
    started = false;
    for (let i = dataStartIndex; i <= dataEndIndex; i++) {
      const timeAtPoint = (i / waveformData.length) * duration;
      const x = (timeAtPoint - scrollOffset) * pixelsPerSecond;
      const amplitude = Math.min(1, waveformData[i]) * (middleY - 2);
      if (!started) {
        ctx.moveTo(x, middleY - amplitude);
        started = true;
      } else {
        ctx.lineTo(x, middleY - amplitude);
      }
    }
    ctx.strokeStyle = withAlpha(color, 0.85);
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [canvasRef, waveformData, color, pixelsPerSecond, scrollOffset, duration, width, height, showGrid, bpm]);
}
