import fs from "node:fs/promises";

export function loadDotEnv(rawText) {
  const values = {};

  for (const rawLine of rawText.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export async function loadLocalEnv(baseUrl) {
  for (const filename of [".dev.vars", ".env"]) {
    try {
      const envText = await fs.readFile(new URL(filename, baseUrl), "utf8");
      return loadDotEnv(envText);
    } catch {
      // try next
    }
  }
  return {};
}
