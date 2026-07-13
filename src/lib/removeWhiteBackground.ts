// Cutout processing runs in a Web Worker (see removeWhiteBackground.worker.ts)
// so the flood-fill/erosion/feathering pixel work never blocks the main
// thread. Previously this ran synchronously on the main thread per image per
// pageview, which measured ~3s of Total Blocking Time on the homepage.

const resultCache = new Map<string, Promise<string>>();

interface PendingRequest {
  resolve: (objectUrl: string) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null | undefined; // undefined = not yet initialized, null = unsupported/unavailable
let nextId = 0;
const pending = new Map<number, PendingRequest>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;

  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    worker = null;
    return worker;
  }

  try {
    const instance = new Worker(new URL("./removeWhiteBackground.worker.ts", import.meta.url), {
      type: "module",
    });

    instance.onmessage = (event: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const { id, blob, error } = event.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);

      if (error || !blob) {
        entry.reject(new Error(error ?? "background-removal worker returned no image"));
      } else {
        entry.resolve(URL.createObjectURL(blob));
      }
    };

    instance.onerror = () => {
      for (const entry of pending.values()) {
        entry.reject(new Error("background-removal worker crashed"));
      }
      pending.clear();
    };

    worker = instance;
  } catch {
    worker = null;
  }

  return worker;
}

export function removeWhiteBackground(src: string): Promise<string> {
  let cached = resultCache.get(src);
  if (!cached) {
    cached = process(src);
    resultCache.set(src, cached);
  }
  return cached;
}

function process(src: string): Promise<string> {
  const w = getWorker();

  // No Worker/OffscreenCanvas support (very old browsers): leave the raw
  // image in place rather than falling back to a main-thread implementation
  // that would reintroduce the blocking cost this change exists to remove.
  if (!w) return Promise.resolve(src);

  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    w.postMessage({ id, src });
  });
}
