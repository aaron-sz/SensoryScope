/**
 * useSmartLabels — AI-powered place name shortener
 *
 * Uses OpenAI's gpt-4o-mini to intelligently shorten long place names for
 * clean map labels. A fast heuristic provides instant results while the API
 * processes batches in the background.
 *
 * Example transformations:
 *   "Huntersville Family Medical Center"  →  "Medical Center"
 *   "Lake Norman Chrysler Dodge Jeep Ram" →  "Chrysler Dodge"
 *   "Starbucks Coffee Drive-Thru"         →  "Starbucks"
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
/** Names at or below this length are already short enough */
const SHORT_ENOUGH = 16;
/** How many names to send to the API in one prompt */
const BATCH_SIZE = 30;
/** Delay before processing the next batch (let the UI breathe) */
const BATCH_COOLDOWN_MS = 200;

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

// ── Quick heuristic shortener (instant, no API) ─────────────────────────────
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

  const [isModelReady, setIsModelReady] = useState(false);
  // Bumped when API results arrive so consumers re-render with better names
  const [revision, setRevision] = useState(0);

  // ── Mark ready on mount if API key is configured ────────────────────────
  useEffect(() => {
    if (OPENAI_API_KEY) {
      setIsModelReady(true);
      console.log('[SmartLabels] OpenAI gpt-4o-mini ready');
    } else {
      console.log('[SmartLabels] No EXPO_PUBLIC_OPENAI_API_KEY — using heuristic shortener');
    }
  }, []);

  // ── Process batches via OpenAI API ──────────────────────────────────────
  const processBatch = useCallback(async () => {
    if (processingRef.current || !isModelReady || !OPENAI_API_KEY) return;
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 400,
          messages: [
            {
              role: 'system',
              content:
                'You shorten place names to 1-3 words. Keep the most recognizable word. ' +
                'Reply with ONLY the shortened names, one per line, in the same order. ' +
                'No numbers, no punctuation, no explanations.',
            },
            {
              role: 'user',
              content: `Shorten each name:\n${numbered}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API ${response.status}`);
      }

      const data = await response.json();
      const result: string = data.choices?.[0]?.message?.content ?? '';

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
          // API result wasn't good — cache the heuristic so we don't retry
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

  // Kick off processing when ready and queue has items
  useEffect(() => {
    if (isModelReady && queue.current.size > 0) processBatch();
  }, [isModelReady, processBatch]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Get the best available short name (cached API result → heuristic → original) */
  const getDisplayName = useCallback(
    (name: string): string => {
      // Force dependency on revision so consumers re-render when API results arrive
      void revision;

      if (name.length <= SHORT_ENOUGH) return name;

      const cached = cache.current.get(name);
      if (cached) return cached;

      // Queue for API processing
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
    downloadProgress: 1, // No download needed — keep interface compatible
    /** How many names the API has processed so far */
    processedCount: cache.current.size,
  };
}
