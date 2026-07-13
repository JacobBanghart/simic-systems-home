/// <reference lib="webworker" />

// Runs the white-background cutout entirely off the main thread. The pixel
// algorithm below is unchanged from the original main-thread implementation —
// only the host APIs differ (OffscreenCanvas/createImageBitmap instead of
// document.createElement("canvas")/Image), because a worker has no DOM.

const WHITE_THRESHOLD = 232; // min channel value to be considered background white
const FEATHER_WHITENESS = 0.7; // below this, boundary pixels stay fully opaque
const MAX_DIMENSION = 700; // cap processing cost
const EROSION_PASSES = 2; // shrinks the seed region to sever thin gaps (e.g. between fanned cards)
const RECLAIM_PASSES = 2; // grows the cut region back out toward the true edge afterward

function floodFillFromBorder(seed: Uint8Array, w: number, h: number): Uint8Array {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qTail = 0;

  const pushIfSeed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx] || !seed[idx]) return;
    visited[idx] = 1;
    queue[qTail++] = idx;
  };

  for (let x = 0; x < w; x++) {
    pushIfSeed(x, 0);
    pushIfSeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfSeed(0, y);
    pushIfSeed(w - 1, y);
  }

  for (let qHead = 0; qHead < qTail; qHead++) {
    const idx = queue[qHead];
    const x = idx % w;
    const y = (idx / w) | 0;
    pushIfSeed(x + 1, y);
    pushIfSeed(x - 1, y);
    pushIfSeed(x, y + 1);
    pushIfSeed(x, y - 1);
  }

  return visited;
}

// Shrinks a binary mask by one pixel: a pixel survives only if it and all its
// in-bounds neighbors are set. Out-of-bounds neighbors count as "set" so the
// true image border isn't eroded away, only interior thin corridors are.
function erodeOnce(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!mask[idx]) continue;
      const left = x > 0 ? mask[idx - 1] : 1;
      const right = x < w - 1 ? mask[idx + 1] : 1;
      const up = y > 0 ? mask[idx - w] : 1;
      const down = y < h - 1 ? mask[idx + w] : 1;
      out[idx] = left && right && up && down ? 1 : 0;
    }
  }
  return out;
}

// Grows the found background region back out, but only into pixels that were
// already background-colored — so it recovers a clean edge without leaking
// back through the gaps erosion severed.
function reclaimOnce(visited: Uint8Array, isBg: Uint8Array, w: number, h: number): Uint8Array {
  const out = visited.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx] || !isBg[idx]) continue;
      const touches =
        (x > 0 && visited[idx - 1]) ||
        (x < w - 1 && visited[idx + 1]) ||
        (y > 0 && visited[idx - w]) ||
        (y < h - 1 && visited[idx + w]);
      if (touches) out[idx] = 1;
    }
  }
  return out;
}

async function cutoutToBlob(bitmap: ImageBitmap): Promise<Blob> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const isBg = new Uint8Array(w * h);
  for (let idx = 0; idx < w * h; idx++) {
    const i = idx * 4;
    isBg[idx] =
      data[i] >= WHITE_THRESHOLD && data[i + 1] >= WHITE_THRESHOLD && data[i + 2] >= WHITE_THRESHOLD
        ? 1
        : 0;
  }

  // Erode before flood-filling so narrow gaps (e.g. between fanned-out cards)
  // are severed and don't act as a bridge into the artwork's white highlights.
  let seed: Uint8Array<ArrayBufferLike> = isBg;
  for (let p = 0; p < EROSION_PASSES; p++) seed = erodeOnce(seed, w, h);

  let visited: Uint8Array<ArrayBufferLike> = floodFillFromBorder(seed, w, h);
  for (let p = 0; p < RECLAIM_PASSES; p++) visited = reclaimOnce(visited, isBg, w, h);

  for (let idx = 0; idx < w * h; idx++) {
    if (visited[idx]) data[idx * 4 + 3] = 0;
  }

  // Feather the cut edge: pixels bordering the transparent region fade out
  // proportional to their own whiteness, instead of a hard 1px cliff.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      const touchesBg =
        (x > 0 && visited[idx - 1]) ||
        (x < w - 1 && visited[idx + 1]) ||
        (y > 0 && visited[idx - w]) ||
        (y < h - 1 && visited[idx + w]);
      if (!touchesBg) continue;
      const i = idx * 4;
      const whiteness = Math.min(data[i], data[i + 1], data[i + 2]) / 255;
      if (whiteness > FEATHER_WHITENESS) {
        const factor = (1 - whiteness) / (1 - FEATHER_WHITENESS);
        data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, factor)));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

interface CutoutRequest {
  id: number;
  src: string;
}

type CutoutResponse =
  | { id: number; blob: Blob }
  | { id: number; error: string };

self.addEventListener("message", (event: MessageEvent<CutoutRequest>) => {
  const { id, src } = event.data;

  (async () => {
    // Fetched (not drawn via an <img>/Image element) so this runs without a
    // DOM; mode defaults to "cors" here, matching the "crossorigin=anonymous"
    // now set on the visible <img> so both requests share one cache entry
    // instead of downloading the image twice.
    const response = await fetch(src);
    if (!response.ok) throw new Error(`fetch failed with status ${response.status}`);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    return cutoutToBlob(bitmap);
  })()
    .then((blob) => {
      const message: CutoutResponse = { id, blob };
      (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
    })
    .catch((err) => {
      const message: CutoutResponse = {
        id,
        error: err instanceof Error ? err.message : String(err),
      };
      (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
    });
});
