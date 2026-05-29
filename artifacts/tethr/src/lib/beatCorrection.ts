import type { BeatCorrectionMap, BeatMarker } from '../types/audio';

const ANALYSIS_HOP = 512;
const ANALYSIS_FRAME = 1024;
const MIN_MARKERS = 8;
const CORRECTED_CACHE_MAX = 8;
const CONFIDENT_MARKER_THRESHOLD = 0.16;
const MIN_MAP_CONFIDENCE = 0.38;
const MIN_RENDER_CORRECTION_STRENGTH = 0.08;
const MIN_CORRECTION_DRIFT_MS = 10;
const FULL_CORRECTION_DRIFT_MS = 46;
const RESIDUAL_SMOOTHING_BEATS = 4;
const MAX_RESIDUAL_STEP_SEC = 0.040;
const correctedCache = new Map<string, AudioBuffer>();
const correctedPending = new Map<string, Promise<AudioBuffer>>();

type BeatCorrectionRenderOptions = {
  renderIfMissing?: boolean;
};

export function detectBeatCorrectionMap(
  buffer: AudioBuffer,
  bpm: number | null | undefined,
): BeatCorrectionMap | null {
  if (!buffer || !bpm || bpm <= 0 || buffer.duration < 2) return null;

  const sourceBpm = Math.max(40, Math.min(240, bpm));
  const beatInterval = 60 / sourceBpm;
  const envelope = buildOnsetEnvelope(buffer);
  if (!envelope || envelope.values.length < 8) return null;

  const beatFrames = Math.max(1, Math.round(beatInterval / envelope.hopSeconds));
  const phaseFrame = estimateBeatPhase(envelope.values, beatFrames);
  const markers = trackBeats(envelope, sourceBpm, phaseFrame);
  const confidentMarkers = markers.filter(m => m.confidence >= CONFIDENT_MARKER_THRESHOLD);
  const minConfidenceRatio = buffer.duration > 45 ? 0.28 : 0.38;

  if (markers.length < MIN_MARKERS || confidentMarkers.length < Math.max(4, markers.length * minConfidenceRatio)) {
    return null;
  }

  const firstBeatTime = estimateFirstBeatTime(confidentMarkers, markers, beatInterval);
  const drift = confidentMarkers.map(m =>
    Math.abs(m.sourceTime - (firstBeatTime + m.index * beatInterval)) * 1000,
  );
  const averageDriftMs = drift.length > 0
    ? drift.reduce((sum, d) => sum + d, 0) / drift.length
    : 0;
  const maxDriftMs = drift.length > 0 ? Math.max(...drift) : 0;
  const coverage = confidentMarkers.length / markers.length;
  const meanStrength = confidentMarkers.reduce((sum, m) => sum + m.strength, 0) / confidentMarkers.length;
  const coherence = residualCoherence(confidentMarkers, firstBeatTime, beatInterval);
  const confidence = Math.max(0, Math.min(1,
    (coverage * 0.56) + (Math.min(1, meanStrength) * 0.24) + (coherence * 0.20),
  ));

  if (confidence < MIN_MAP_CONFIDENCE) return null;

  return {
    sourceBpm,
    beatInterval,
    firstBeatTime,
    sourceDuration: buffer.duration,
    markers,
    confidence,
    averageDriftMs,
    maxDriftMs,
  };
}

function estimateFirstBeatTime(
  confidentMarkers: BeatMarker[],
  markers: BeatMarker[],
  beatInterval: number,
): number {
  const weighted = confidentMarkers.length >= 4 ? confidentMarkers : markers;
  const candidates = weighted
    .map(marker => ({
      value: marker.sourceTime - marker.index * beatInterval,
      weight: Math.max(0.05, marker.confidence),
    }))
    .sort((a, b) => a.value - b.value);

  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let running = 0;
  for (const candidate of candidates) {
    running += candidate.weight;
    if (running >= total * 0.5) return candidate.value;
  }
  return markers[0]?.sourceTime ?? 0;
}

function residualCoherence(markers: BeatMarker[], firstBeatTime: number, beatInterval: number): number {
  if (markers.length < 4) return 0;
  let total = 0;
  let count = 0;

  for (let i = 1; i < markers.length; i++) {
    const prev = markers[i - 1];
    const marker = markers[i];
    const beatGap = Math.max(1, marker.index - prev.index);
    const prevResidual = prev.sourceTime - (firstBeatTime + prev.index * beatInterval);
    const residual = marker.sourceTime - (firstBeatTime + marker.index * beatInterval);
    total += Math.abs(residual - prevResidual) / beatGap;
    count++;
  }

  const meanResidualStep = count > 0 ? total / count : 0;
  const normalized = (meanResidualStep - 0.010) / 0.060;
  return Math.max(0, Math.min(1, 1 - normalized));
}

export function beatCorrectedDuration(
  map: BeatCorrectionMap | null | undefined,
  targetBpm: number,
  sourceDuration: number,
): number {
  if (!map || map.markers.length < 2 || targetBpm <= 0) {
    return sourceDuration;
  }
  const anchors = buildAnchors(map, targetBpm, sourceDuration);
  return anchors[anchors.length - 1]?.target ?? sourceDuration;
}

export function sourceTimeToCorrectedTime(
  map: BeatCorrectionMap | null | undefined,
  sourceTime: number,
  targetBpm: number,
): number {
  if (!map || map.markers.length < 2 || targetBpm <= 0) return sourceTime;
  const anchors = buildAnchors(map, targetBpm, map.sourceDuration);
  const t = Math.max(0, Math.min(map.sourceDuration, sourceTime));
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (t < a.source || t > b.source) continue;
    const span = Math.max(0.001, b.source - a.source);
    const p = (t - a.source) / span;
    return a.target + p * (b.target - a.target);
  }
  return t;
}

export async function getBeatCorrectedBuffer(
  ctx: BaseAudioContext,
  trackId: string,
  buffer: AudioBuffer,
  map: BeatCorrectionMap | null | undefined,
  targetBpm: number,
  options: BeatCorrectionRenderOptions = {},
): Promise<AudioBuffer | null> {
  if (!map || map.markers.length < MIN_MARKERS || targetBpm <= 0) return null;
  if ((map.confidence ?? 0) < MIN_MAP_CONFIDENCE) return null;
  if (correctionStrengthForMap(map) < MIN_RENDER_CORRECTION_STRENGTH) return null;

  const anchors = buildAnchors(map, targetBpm, buffer.duration);
  if (anchors.length < 3) return null;

  const cacheKey = [
    trackId,
    'beat-correct',
    buffer.sampleRate,
    buffer.length,
    targetBpm.toFixed(4),
    map.sourceBpm.toFixed(4),
    map.markers.length,
    map.markers[0]?.sourceTime.toFixed(4),
    map.markers[map.markers.length - 1]?.sourceTime.toFixed(4),
    map.averageDriftMs.toFixed(2),
  ].join(':');

  const cached = correctedCache.get(cacheKey);
  if (cached) return cached;

  if (options.renderIfMissing === false) return null;

  const inflight = correctedPending.get(cacheKey);
  if (inflight) return inflight;

  const task = renderBeatCorrectedBuffer(ctx, trackId, buffer, anchors, cacheKey);
  correctedPending.set(cacheKey, task);
  try {
    const rendered = await task;
    if (correctedCache.size >= CORRECTED_CACHE_MAX) {
      const first = correctedCache.keys().next().value;
      if (first) correctedCache.delete(first);
    }
    correctedCache.set(cacheKey, rendered);
    return rendered;
  } finally {
    correctedPending.delete(cacheKey);
  }
}

export function clearBeatCorrectionCacheForTrack(trackId: string) {
  for (const key of [...correctedCache.keys()]) {
    if (key.startsWith(`${trackId}:`)) correctedCache.delete(key);
  }
  for (const key of [...correctedPending.keys()]) {
    if (key.startsWith(`${trackId}:`)) correctedPending.delete(key);
  }
}

type OnsetEnvelope = {
  values: Float32Array;
  hopSeconds: number;
  threshold: number;
};

type Anchor = { source: number; target: number };

function buildOnsetEnvelope(buffer: AudioBuffer): OnsetEnvelope | null {
  const sampleRate = buffer.sampleRate;
  const frameCount = Math.floor((buffer.length - ANALYSIS_FRAME) / ANALYSIS_HOP);
  if (frameCount < 8) return null;

  const channels = Math.min(2, buffer.numberOfChannels);
  const channelData = Array.from({ length: channels }, (_, ch) => buffer.getChannelData(ch));
  const raw = new Float32Array(frameCount);
  let prevRms = 0;
  let prevFlux = 0;
  let max = 0;

  for (let frame = 0; frame < frameCount; frame++) {
    const start = frame * ANALYSIS_HOP;
    let energy = 0;
    let flux = 0;
    let prevSample = 0;
    for (let i = 0; i < ANALYSIS_FRAME; i++) {
      let sample = 0;
      for (let ch = 0; ch < channels; ch++) {
        sample += channelData[ch][start + i] ?? 0;
      }
      sample /= channels;
      energy += sample * sample;
      flux += Math.abs(sample - prevSample);
      prevSample = sample;
    }
    const rms = Math.sqrt(energy / ANALYSIS_FRAME);
    const transientFlux = flux / ANALYSIS_FRAME;
    const onset = Math.max(0, rms - prevRms) * 0.68
      + Math.max(0, transientFlux - prevFlux) * 0.32;
    raw[frame] = onset;
    if (onset > max) max = onset;
    prevRms = rms;
    prevFlux = transientFlux;
  }

  if (max <= 0) return null;

  const values = new Float32Array(frameCount);
  let sum = 0;
  for (let i = 0; i < frameCount; i++) {
    const prev = raw[Math.max(0, i - 1)];
    const cur = raw[i];
    const next = raw[Math.min(frameCount - 1, i + 1)];
    const v = ((prev * 0.25) + (cur * 0.5) + (next * 0.25)) / max;
    values[i] = v;
    sum += v;
  }

  const mean = sum / frameCount;
  let variance = 0;
  for (let i = 0; i < frameCount; i++) {
    const d = values[i] - mean;
    variance += d * d;
  }
  const stdev = Math.sqrt(variance / frameCount);

  return {
    values,
    hopSeconds: ANALYSIS_HOP / sampleRate,
    threshold: Math.max(0.045, Math.min(0.35, mean + stdev * 0.35)),
  };
}

function estimateBeatPhase(values: Float32Array, beatFrames: number): number {
  const phaseStep = Math.max(1, Math.floor(beatFrames / 72));
  const localRadius = Math.max(1, Math.floor(beatFrames * 0.06));
  let bestPhase = 0;
  let bestScore = -Infinity;
  for (let phase = 0; phase < beatFrames; phase += phaseStep) {
    let score = 0;
    let count = 0;
    for (let frame = phase; frame < values.length; frame += beatFrames) {
      score += localPeak(values, frame, localRadius).score;
      count++;
    }
    const normalized = count > 0 ? score / Math.sqrt(count) : 0;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestPhase = phase;
    }
  }
  return bestPhase;
}

function trackBeats(envelope: OnsetEnvelope, sourceBpm: number, phaseFrame: number): BeatMarker[] {
  const beatInterval = 60 / sourceBpm;
  const beatFrames = Math.max(1, Math.round(beatInterval / envelope.hopSeconds));
  const searchRadius = Math.max(2, Math.floor(beatFrames * 0.28));
  const minSpacingSeconds = beatInterval * 0.45;
  const markers: BeatMarker[] = [];
  let predictedFrame = phaseFrame;

  for (let index = 0; predictedFrame < envelope.values.length; index++) {
    const peak = localPeak(envelope.values, predictedFrame, searchRadius);
    const strongEnough = peak.strength >= envelope.threshold;
    const peakTime = peak.index * envelope.hopSeconds;
    const predictedTime = predictedFrame * envelope.hopSeconds;
    const prev = markers[markers.length - 1];
    const tooClose = prev && peakTime - prev.sourceTime < minSpacingSeconds;
    const trackingPull = strongEnough && !tooClose
      ? Math.min(0.62, 0.24 + peak.strength * 0.34)
      : 0;
    const trackedTime = predictedTime + (peakTime - predictedTime) * trackingPull;
    const sourceTime = strongEnough && !tooClose ? peakTime : predictedTime;
    const strength = strongEnough && !tooClose ? peak.strength : Math.max(0, peak.strength * 0.45);

    markers.push({
      index,
      sourceTime,
      confidence: Math.max(0, Math.min(1, strength)),
      strength,
    });

    predictedFrame = Math.round((trackedTime + beatInterval) / envelope.hopSeconds);
  }

  return markers.filter(m => m.sourceTime >= 0 && Number.isFinite(m.sourceTime));
}

function localPeak(values: Float32Array, center: number, radius: number): { index: number; strength: number; score: number } {
  const start = Math.max(0, center - radius);
  const end = Math.min(values.length - 1, center + radius);
  let bestIndex = Math.max(0, Math.min(values.length - 1, center));
  let bestStrength = values[bestIndex] ?? 0;
  let bestScore = bestStrength;
  for (let i = start; i <= end; i++) {
    const v = values[i];
    const distance = Math.abs(i - center) / Math.max(1, radius);
    const proximity = 1 - Math.min(1, distance);
    // A slightly weaker transient near the predicted beat is usually more
    // musical than snapping to a louder swung/off-beat hit. This protects
    // groove feel and reduces flammy correction jumps.
    const score = v * (0.58 + proximity * 0.42);
    if (score > bestScore) {
      bestStrength = v;
      bestScore = score;
      bestIndex = i;
    }
  }
  return { index: bestIndex, strength: bestStrength, score: bestScore };
}

function buildAnchors(map: BeatCorrectionMap, targetBpm: number, sourceDuration: number): Anchor[] {
  const sourceToTargetRatio = targetBpm / map.sourceBpm;
  const targetBeatInterval = 60 / targetBpm;
  const targetFirstBeat = map.firstBeatTime / Math.max(0.05, sourceToTargetRatio);
  const sourceResiduals = smoothResiduals(map);
  const correctionStrength = correctionStrengthForMap(map);
  const anchors: Anchor[] = [{ source: 0, target: 0 }];

  for (const marker of map.markers) {
    const idealSource = map.firstBeatTime + marker.index * map.beatInterval;
    const smoothedResidual = sourceResiduals[marker.index] ?? 0;
    const source = Math.max(
      0,
      Math.min(sourceDuration, idealSource + smoothedResidual * correctionStrength),
    );
    const target = Math.max(0, targetFirstBeat + marker.index * targetBeatInterval);
    const last = anchors[anchors.length - 1];
    if (source <= last.source + 0.035 || target <= last.target + 0.035) continue;
    anchors.push({ source, target });
  }

  const last = anchors[anchors.length - 1];
  if (sourceDuration > last.source + 0.035) {
    const tailTarget = last.target + (sourceDuration - last.source) / Math.max(0.05, sourceToTargetRatio);
    anchors.push({ source: sourceDuration, target: Math.max(last.target + 0.035, tailTarget) });
  }

  return anchors;
}

function correctionStrengthForMap(map: BeatCorrectionMap): number {
  const normalized = (map.averageDriftMs - MIN_CORRECTION_DRIFT_MS)
    / Math.max(1, FULL_CORRECTION_DRIFT_MS - MIN_CORRECTION_DRIFT_MS);
  const confidentMarkers = map.markers.filter(m => m.confidence >= CONFIDENT_MARKER_THRESHOLD);
  const coherence = residualCoherence(confidentMarkers, map.firstBeatTime, map.beatInterval);
  return Math.max(0, Math.min(0.92, normalized)) * coherence;
}

function smoothResiduals(map: BeatCorrectionMap): number[] {
  const raw = map.markers.map(marker => ({
    index: marker.index,
    value: marker.sourceTime - (map.firstBeatTime + marker.index * map.beatInterval),
    weight: Math.max(0.05, Math.min(1, marker.confidence)),
  }));
  const smoothed: number[] = [];

  for (const marker of raw) {
    let weighted = 0;
    let weightTotal = 0;
    for (const other of raw) {
      const distance = Math.abs(other.index - marker.index);
      if (distance > RESIDUAL_SMOOTHING_BEATS) continue;
      const proximity = 1 - (distance / (RESIDUAL_SMOOTHING_BEATS + 1));
      const weight = other.weight * proximity * proximity;
      weighted += other.value * weight;
      weightTotal += weight;
    }
    smoothed[marker.index] = weightTotal > 0 ? weighted / weightTotal : marker.value;
  }

  let previous = smoothed[0] ?? 0;
  for (let i = 0; i < smoothed.length; i++) {
    const value = smoothed[i] ?? previous;
    const limited = previous + Math.max(-MAX_RESIDUAL_STEP_SEC, Math.min(MAX_RESIDUAL_STEP_SEC, value - previous));
    smoothed[i] = limited;
    previous = limited;
  }

  return smoothed;
}

function buildRenderSpans(anchors: Anchor[], sourceDuration: number): Array<Anchor & { sourceEnd: number; targetEnd: number }> {
  const spans: Array<Anchor & { sourceEnd: number; targetEnd: number }> = [];
  for (let i = 0; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const current = anchors[i];
    const next = anchors[i + 1];
    const source = prev ? (prev.source + current.source) / 2 : 0;
    const sourceEnd = next ? (current.source + next.source) / 2 : sourceDuration;
    const target = prev ? (prev.target + current.target) / 2 : 0;
    const targetEnd = next ? (current.target + next.target) / 2 : current.target;
    if (sourceEnd - source > 0.045 && targetEnd - target > 0.045) {
      spans.push({ source, target, sourceEnd, targetEnd });
    }
  }
  return spans;
}

async function renderBeatCorrectedBuffer(
  ctx: BaseAudioContext,
  trackId: string,
  buffer: AudioBuffer,
  anchors: Anchor[],
  cacheKey: string,
): Promise<AudioBuffer> {
  const correctedDuration = anchors[anchors.length - 1]?.target ?? buffer.duration;
  const sampleRate = buffer.sampleRate;
  const outFrames = Math.max(1, Math.ceil((correctedDuration + 0.02) * sampleRate));
  const out = ctx.createBuffer(buffer.numberOfChannels, outFrames, sampleRate);
  // These joins happen every beat-ish span, so keep protection short. Longer
  // fades read as level flutter on steady drums.
  const fadeFrames = Math.max(4, Math.floor(sampleRate * 0.0012));

  const spans = buildRenderSpans(anchors, buffer.duration);
  const { getTimeStretchedSlice } = await import('./timeStretch');

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const sourceDuration = span.sourceEnd - span.source;
    const targetDuration = span.targetEnd - span.target;
    if (sourceDuration <= 0.025 || targetDuration <= 0.025) continue;

    const ratio = Math.max(0.25, Math.min(4, sourceDuration / targetDuration));
    const slice = await getTimeStretchedSlice(
      ctx,
      `${trackId}:${cacheKey}`,
      buffer,
      span.source,
      sourceDuration,
      ratio,
    );

    mixSlice(out, slice, Math.round(span.target * sampleRate), fadeFrames, i > 0, i < spans.length - 1);
  }

  return out;
}

function mixSlice(
  out: AudioBuffer,
  slice: AudioBuffer,
  startFrame: number,
  fadeFrames: number,
  fadeIn: boolean,
  fadeOut: boolean,
) {
  const channels = Math.min(out.numberOfChannels, slice.numberOfChannels);
  for (let ch = 0; ch < channels; ch++) {
    const dst = out.getChannelData(ch);
    const src = slice.getChannelData(ch);
    for (let i = 0; i < src.length; i++) {
      const outIndex = startFrame + i;
      if (outIndex < 0 || outIndex >= dst.length) continue;
      let gain = 1;
      if (fadeIn && i < fadeFrames) gain *= i / fadeFrames;
      if (fadeOut && src.length - i <= fadeFrames) gain *= Math.max(0, (src.length - i) / fadeFrames);
      dst[outIndex] += src[i] * gain;
    }
  }
}
