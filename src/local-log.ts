import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

export interface LocalLogSink {
  write(customType: string, data: unknown): void;
}

function expandPath(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return resolve(path);
}

export function createLocalLogSink(path: string | undefined, onError: (error: unknown) => void): LocalLogSink | undefined {
  if (!path) return undefined;
  const target = expandPath(path);
  return {
    write(customType: string, data: unknown): void {
      try {
        mkdirSync(dirname(target), { recursive: true });
        appendFileSync(target, `${JSON.stringify({ timestamp: new Date().toISOString(), customType, data })}\n`, "utf8");
      } catch (error) {
        onError(error);
      }
    },
  };
}
