import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export interface PackageResource {
  source: string;
  name: string;
  version?: string;
  root?: string;
  extensions: string[];
  skills: string[];
}

export interface ToolSource {
  name: string;
  sourcePackage: string;
}

const KNOWN_TOOL_SOURCES: Record<string, string> = {
  web_search: "pi-web-access",
  code_search: "pi-web-access",
  fetch_content: "pi-web-access",
  get_search_content: "pi-web-access",
  subagent: "pi-subagents",
  interactive_shell: "pi-interactive-shell",
  grep: "pi-fff",
  find: "pi-fff",
  ls: "pi-fff",
  find_files: "pi-fff",
  fff_multi_grep: "pi-fff",
  memory_search: "pi-memory",
  memory_remember: "pi-memory",
  memory_forget: "pi-memory",
  memory_lessons: "pi-memory",
  memory_stats: "pi-memory",
};

const TASKPLANE_PREFIXES = ["orch_", "read_agent_", "send_agent_", "broadcast_", "trigger_wrap_up", "list_active_agents"];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function packageNameFromSource(source: string): string {
  if (source.startsWith("npm:")) return source.replace(/^npm:/, "").replace(/@[^/@]+$/, "").split("/").pop() ?? source;
  if (source.startsWith("git:") || source.startsWith("https://")) return source.replace(/\.git$/, "").split("/").pop()?.replace(/@[^@]+$/, "") ?? source;
  return basename(source);
}

function sourceString(entry: unknown): string | undefined {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && typeof (entry as { source?: unknown }).source === "string") return (entry as { source: string }).source;
  return undefined;
}

function packageRoot(source: string, settingsDir: string): string | undefined {
  if (source.startsWith("npm:")) {
    const spec = source.replace(/^npm:/, "").replace(/@[^/@]+$/, "");
    return join("/opt/homebrew/lib/node_modules", spec);
  }
  if (source.startsWith("git:github.com/")) return join(process.env.HOME ?? "", ".pi/agent/git/github.com", source.replace(/^git:github.com\//, "").replace(/@[^@]+$/, ""));
  if (source.startsWith("https://github.com/")) return join(process.env.HOME ?? "", ".pi/agent/git/github.com", source.replace(/^https:\/\/github.com\//, "").replace(/@[^@]+$/, ""));
  if (source.startsWith(".") || source.startsWith("/")) return resolve(settingsDir, source);
  return undefined;
}

function manifestResources(root: string | undefined): Pick<PackageResource, "version" | "extensions" | "skills"> {
  if (!root) return { extensions: [], skills: [] };
  const manifest = join(root, "package.json");
  if (!existsSync(manifest)) return { extensions: [], skills: [] };
  try {
    const parsed = readJson(manifest) as { version?: string; pi?: { extensions?: string[]; skills?: string[] } };
    return { version: parsed.version, extensions: parsed.pi?.extensions ?? [], skills: parsed.pi?.skills ?? [] };
  } catch {
    return { extensions: [], skills: [] };
  }
}

function settingsPaths(cwd: string): string[] {
  const paths = [join(process.env.HOME ?? "", ".pi/agent/settings.json")];
  let current = cwd;
  while (true) {
    const candidate = join(current, ".pi/settings.json");
    if (existsSync(candidate)) paths.push(candidate);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return paths;
}

export function discoverPackages(cwd: string): PackageResource[] {
  const packages: PackageResource[] = [];
  for (const settingsPath of settingsPaths(cwd)) {
    if (!existsSync(settingsPath)) continue;
    const settingsDir = dirname(settingsPath);
    try {
      const settings = readJson(settingsPath) as { packages?: unknown[] };
      for (const entry of settings.packages ?? []) {
        const source = sourceString(entry);
        if (!source) continue;
        const root = packageRoot(source, settingsDir);
        const resources = manifestResources(root);
        packages.push({ source, name: packageNameFromSource(source), root, ...resources });
      }
    } catch {
      // Ignore unreadable settings; telemetry must never break Pi startup.
    }
  }
  return packages;
}

export function mapToolSource(toolName: string): string | undefined {
  if (KNOWN_TOOL_SOURCES[toolName]) return KNOWN_TOOL_SOURCES[toolName];
  if (TASKPLANE_PREFIXES.some((prefix) => toolName.startsWith(prefix))) return "taskplane";
  return undefined;
}

export function mapToolSources(toolNames: string[]): ToolSource[] {
  return toolNames.map((name) => ({ name, sourcePackage: mapToolSource(name) ?? "unknown" }));
}
