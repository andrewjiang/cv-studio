import { describe, expect, it } from "vitest";
import {
  TINYCV_AGENT_COOKBOOK,
  TINYCV_AGENT_FINISH_GUIDE,
  TINYCV_MARKDOWN_GUIDE,
} from "@/app/_lib/developer-platform-guides";

describe("developer-platform-guides", () => {
  it("includes section-specific markdown structure examples", () => {
    expect(TINYCV_MARKDOWN_GUIDE).toContain("Experience metadata structure");
    expect(TINYCV_MARKDOWN_GUIDE).toContain("Education structure");
    expect(TINYCV_MARKDOWN_GUIDE).toContain("Projects / selected work structure");
    expect(TINYCV_MARKDOWN_GUIDE).toContain("/examples/engineer");
  });

  it("teaches the experience metadata rule in the agent guide", () => {
    expect(TINYCV_AGENT_FINISH_GUIDE).toContain("Location, Remote, or website | Dates");
  });

  it("keeps structure guardrails in the cookbook", () => {
    expect(TINYCV_AGENT_COOKBOOK).toContain("Location, Remote, or website | Dates");
    expect(TINYCV_AGENT_COOKBOOK).toContain("Projects and selected work can omit metadata");
  });
});
