/**
 * useSmartLabels — On-device LLM-powered place name shortener
 *
 * Uses SmolLM2 (135M quantized) via react-native-executorch to intelligently
 * shorten long place names for clean map labels. A fast heuristic provides
 * instant results while the LLM processes batches in the background.
 *
 * Example transformations:
 *   "Huntersville Family Medical Center"  →  "Medical Center"
 *   "Lake Norman Chrysler Dodge Jeep Ram" →  "Chrysler Dodge"
 *   "Starbucks Coffee Drive-Thru"         →  "Starbucks"
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';

// ── Constants ────────────────────────────────────────────────────────────────
/** Names at or below this length are already short enough */
const SHORT_ENOUGH = 16;
/** How many names to send to the LLM in one prompt */
const BATCH_SIZE = 15;
/** Delay before processing the next batch (let the UI breathe) */
const BATCH_COOLDOWN_MS = 300;

// LLMModule is dynamically imported — use `any` for the ref type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LLMModuleInstance = any;

// ── Quick heuristic shortener (instant, no LLM) ─────────────────────────────
const FILLER = /\b(The|of|and|at|in|on|by|for|a|an)\b/gi;
const TRAILING_GENERIC = /\s+(Center|Centre|Place|Plaza|Complex|Building|Bldg|Suite|Ste|Inc|LLC|Corp|Location|Branch|Outlet|Express|Station)$/i;

function quickShorten(name: string): string {
  let s = name.replace(FILLER, '').replace(/\s{2,}/g, ' ').trim();

  // Strip trailing generic words
  s = s.replace(TRAILING_GENERIC, '').trim();

  // If still long, keep only first 2 meaningful words
  if (s.length > SHORT_ENOUGH) {
    const words = s.split(/\s+/);
    s = words.slice(0, 2).join(' ');
  }

  return s || name;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSmartLabels() {
  const cache = useRef<Map<string, string>>(new Map());
  const queue = useRef<Set<string>>(new Set());
  const processingRef = useRef(false);
  const llmRef = useRef<LLMModuleInstance | null>(null);

  const [isModelReady, setIsModelReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  // Bumped when LLM results arrive so consumers re-render with better names
  const [revision, setRevision] = useState(0);

  // ── Load LLM on mount (skip in Expo Go — native modules unavailable) ──────
  useEffect(() => {
    // Expo Go can't run native modules — LLM requires a custom dev build.
    // The react-native-executorch package throws an ERROR at import time when
    // native modules aren't linked. That console error is unavoidable in Expo Go
    // but doesn't crash the app — the heuristic shortener handles everything.
    if (Constants.executionEnvironment === 'storeClient') {
      console.log('[SmartLabels] Expo Go — using heuristic (LLM needs dev build)');
      return;
    }

    let cancelled = false;
    let module: any = null;

    (async () => {
      try {
        const { LLMModule, SMOLLM2_1_135M_QUANTIZED } = require('react-native-executorch');
        if (cancelled) return;

        module = new LLMModule({});
        llmRef.current = module;

        await module.load(SMOLLM2_1_135M_QUANTIZED, (progress: number) => {
          if (!cancelled) setDownloadProgress(progress);
        });

        if (!cancelled) {
          setIsModelReady(true);
          console.log('[SmartLabels] LLM loaded — SmolLM2 135M ready');
        }
      } catch {
        // Native module not linked or model load failed — heuristic fallback is fine
      }
    })();

    return () => {
      cancelled = true;
      try { module?.delete(); } catch { /* noop */ }
      llmRef.current = null;
    };
  }, []);

  // ── Process batches in background ──────────────────────────────────────────
  const processBatch = useCallback(async () => {
    if (processingRef.current || !isModelReady || !llmRef.current) return;
    if (queue.current.size === 0) return;

    processingRef.current = true;

    // Grab next batch from queue
    const batch: string[] = [];
    for (const name of queue.current) {
      batch.push(name);
      if (batch.length >= BATCH_SIZE) break;
    }
    batch.forEach((n) => queue.current.delete(n));

    try {
      const numbered = batch.map((n, i) => `${i + 1}. ${n}`).join('\n');
      const result = await llmRef.current.generate([
        {
          role: 'system',
          content:
            'You shorten place names to 1-3 words. Keep the most recognizable word. ' +
            'Reply with ONLY the shortened names, one per line. No numbers, no punctuation, no explanations.',
        },
        {
          role: 'user',
          content: `Shorten each name:\n${numbered}`,
        },
      ]);

      // Parse response — one shortened name per line
      const lines = result
        .trim()
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\)\-\s]+/, '').trim())
        .filter((l: string) => l.length > 0);

      let updated = false;
      batch.forEach((original, i) => {
        const shortened = lines[i];
        if (
          shortened &&
          shortened.length > 0 &&
          shortened.length <= original.length &&
          shortened.length <= SHORT_ENOUGH
        ) {
          cache.current.set(original, shortened);
          updated = true;
        } else {
          // LLM result wasn't good — cache the heuristic so we don't retry
          cache.current.set(original, quickShorten(original));
        }
      });

      if (updated) setRevision((r) => r + 1);
    } catch (err) {
      console.warn('[SmartLabels] Batch error:', err);
      // Cache heuristic results for failed batch so we don't retry endlessly
      batch.forEach((n) => {
        if (!cache.current.has(n)) cache.current.set(n, quickShorten(n));
      });
    } finally {
      processingRef.current = false;
      // Process next batch after a cooldown
      if (queue.current.size > 0) {
        setTimeout(processBatch, BATCH_COOLDOWN_MS);
      }
    }
  }, [isModelReady]);

  // Kick off processing when model becomes ready
  useEffect(() => {
    if (isModelReady && queue.current.size > 0) processBatch();
  }, [isModelReady, processBatch]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Get the best available short name (cached LLM result → heuristic → original) */
  const getDisplayName = useCallback(
    (name: string): string => {
      // Force dependency on revision so consumers re-render when LLM results arrive
      void revision;

      if (name.length <= SHORT_ENOUGH) return name;

      const cached = cache.current.get(name);
      if (cached) return cached;

      // Queue for LLM processing
      queue.current.add(name);
      if (isModelReady && !processingRef.current) {
        // Kick off async — don't await
        setTimeout(processBatch, 0);
      }

      // Return heuristic immediately
      return quickShorten(name);
    },
    [revision, isModelReady, processBatch],
  );

  return {
    getDisplayName,
    isModelReady,
    downloadProgress,
    /** How many names the LLM has processed so far */
    processedCount: cache.current.size,
  };
}
