import { describe, expect, it } from "vitest";
import { mapToolSource, mapToolSources } from "../src/resource-discovery.js";

describe("resource discovery", () => {
  it("maps known Pi extension tools to source packages", () => {
    expect(mapToolSource("web_search")).toBe("pi-web-access");
    expect(mapToolSource("subagent")).toBe("pi-subagents");
    expect(mapToolSource("orch_status")).toBe("taskplane");
    expect(mapToolSource("unknown_tool")).toBeUndefined();
  });

  it("builds mapped tool source rows", () => {
    expect(mapToolSources(["web_search", "unknown_tool"])).toEqual([
      { name: "web_search", sourcePackage: "pi-web-access" },
      { name: "unknown_tool", sourcePackage: "unknown" },
    ]);
  });
});
