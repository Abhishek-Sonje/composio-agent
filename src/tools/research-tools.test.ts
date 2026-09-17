import { describe, expect, it, vi } from "vitest";

import { researchToolsFromSession } from "./research-tools.js";

describe("researchToolsFromSession", () => {
  it("executes the scoped web-search tool", async () => {
    const execute = vi.fn().mockResolvedValue({ data: { results: [] } });
    const tools = researchToolsFromSession({ execute });

    await expect(tools.search("Salesforce API docs")).resolves.toEqual({
      results: [],
    });
    expect(execute).toHaveBeenCalledWith(
      "COMPOSIO_SEARCH_WEB",
      { query: "Salesforce API docs" },
      undefined,
      { signal: expect.any(AbortSignal) },
    );
  });

  it("executes the scoped URL-fetch tool", async () => {
    const execute = vi.fn().mockResolvedValue({ data: { content: "docs" } });
    const tools = researchToolsFromSession({ execute });

    await tools.fetchUrl("https://example.com/docs");

    expect(execute).toHaveBeenCalledWith(
      "COMPOSIO_SEARCH_FETCH_URL_CONTENT",
      { url: "https://example.com/docs" },
      undefined,
      { signal: expect.any(AbortSignal) },
    );
  });

  it("surfaces tool failures", async () => {
    const execute = vi.fn().mockResolvedValue({
      data: null,
      error: "provider unavailable",
    });
    const tools = researchToolsFromSession({ execute });

    await expect(tools.search("query")).rejects.toThrowError(
      /provider unavailable/,
    );
  });
});

