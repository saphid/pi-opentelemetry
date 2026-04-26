const DEFAULT_SENSITIVE_KEYS = [
  "token",
  "api_key",
  "secret",
  "password",
  "authorization",
  "cookie",
  "session",
  "private_key",
];

const REDACTED = "[redacted]";

const WHOLE_VALUE_PATTERNS = [
  /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /^(?:[A-Za-z0-9+/]{40,}={0,2})$/,
];

const EMBEDDED_VALUE_PATTERNS = [
  { pattern: /bearer\s+[a-z0-9\-_.=:+/]+/gi, replacement: REDACTED },
  { pattern: /\b(?:sk|pk)-[a-z0-9\-_]{8,}\b/gi, replacement: REDACTED },
  { pattern: /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API[_-]?KEY)[A-Z0-9_]*=)([^&\s'"`]+)/gi, replacement: `$1${REDACTED}` },
  { pattern: /([?&](?:token|api_key|apikey|key|secret|password|auth)=)([^&#\s'"`]+)/gi, replacement: `$1${REDACTED}` },
];

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`(^|/)${escaped}$`, "i");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export interface RedactorOptions {
  extraSensitiveKeys: string[];
  pathDenylist: string[];
}

export interface Redactor {
  redact(value: unknown): unknown;
  shouldSkipPath(path: string): boolean;
}

export function createRedactor(options: RedactorOptions): Redactor {
  const keyPatterns = DEFAULT_SENSITIVE_KEYS.concat(options.extraSensitiveKeys)
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

  const denyPatterns = options.pathDenylist.map((pattern) => wildcardToRegExp(pattern));

  const matchesSensitiveKey = (key: string) => keyPatterns.some((pattern) => pattern.test(key));

  const matchesSensitiveValue = (value: string) => WHOLE_VALUE_PATTERNS.some((pattern) => pattern.test(value));

  const redactSensitiveSubstrings = (value: string): string => {
    let output = value;
    for (const { pattern, replacement } of EMBEDDED_VALUE_PATTERNS) {
      output = output.replace(pattern, replacement);
    }
    return output;
  };

  const redactRecursive = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((entry) => redactRecursive(entry));
    }

    if (isPlainObject(value)) {
      const output: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        if (matchesSensitiveKey(key)) {
          output[key] = REDACTED;
          continue;
        }
        output[key] = redactRecursive(entry);
      }
      return output;
    }

    if (typeof value === "string") {
      if (matchesSensitiveValue(value.trim())) return REDACTED;
      return redactSensitiveSubstrings(value);
    }

    return value;
  };

  return {
    redact(value: unknown): unknown {
      return redactRecursive(value);
    },
    shouldSkipPath(path: string): boolean {
      return denyPatterns.some((pattern) => pattern.test(path));
    },
  };
}
