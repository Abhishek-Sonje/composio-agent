import { Composio } from "@composio/core";

const COMPOSIO_SEARCH_TOOLKIT = "composio_search";
const SEARCH_TOOL = "COMPOSIO_SEARCH_WEB";
const FETCH_TOOL = "COMPOSIO_SEARCH_FETCH_URL_CONTENT";
const TOOL_TIMEOUT_MS = 30_000;

type ToolResponse = {
  data: unknown;
  error?: string | null;
};

type ResearchToolSession = {
  execute(
    slug: string,
    arguments_: Record<string, unknown>,
    options?: undefined,
    requestOptions?: { signal?: AbortSignal },
  ): Promise<ToolResponse>;
};

export type ResearchTools = {
  search(query: string): Promise<unknown>;
  fetchUrl(url: string): Promise<unknown>;
};

export function researchToolsFromSession(
  session: ResearchToolSession,
): ResearchTools {
  async function execute(
    slug: string,
    arguments_: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await session.execute(slug, arguments_, undefined, {
      signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
    });

    if (response.error) {
      throw new Error(`Composio tool ${slug} failed: ${response.error}`);
    }

    return response.data;
  }

  return {
    search: (query) => execute(SEARCH_TOOL, { query }),
    fetchUrl: (url) => execute(FETCH_TOOL, { url }),
  };
}

export async function createComposioResearchTools(
  apiKey: string,
): Promise<ResearchTools> {
  const composio = new Composio({ apiKey, allowTracking: false });
  const session = await composio.sessions.create("phase-1-research-agent", {
    toolkits: [COMPOSIO_SEARCH_TOOLKIT],
    tools: {
      [COMPOSIO_SEARCH_TOOLKIT]: [SEARCH_TOOL, FETCH_TOOL],
    },
    sandbox: { enable: false },
  });

  return researchToolsFromSession(session);
}

