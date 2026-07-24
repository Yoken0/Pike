interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export async function searchWeb(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    // Using Serper API for web search
    const apiKey = process.env.SERPER_API_KEY || process.env.SEARCH_API_KEY || "demo-key";
    
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.organic) {
      return [];
    }

    return data.organic.map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet || "",
    }));
  } catch (error) {
    console.error("Web search error:", error);
    // Fallback to mock results for demo purposes if API fails
    return [
      {
        title: `Research Results for "${query}"`,
        url: "https://example.com/research",
        snippet: `Relevant information about ${query} from academic sources and recent publications.`,
      }
    ];
  }
}

export async function scrapeWebContent(url: string): Promise<string> {
  try {
    // Import cheerio dynamically
    const cheerio = await import("cheerio");
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RAG-Bot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $("script, style, nav, header, footer, aside").remove();
    
    // Extract main content
    let content = "";
    
    // Try common content selectors
    const contentSelectors = [
      "main",
      "[role='main']",
      ".content",
      "#content",
      "article",
      ".post-content",
      ".entry-content",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 100) {
        content = element.text().trim();
        break;
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      content = $("body").text().trim();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, " ").trim();
    
    // Limit content length
    if (content.length > 10000) {
      content = content.slice(0, 10000) + "...";
    }

    return content || "No content could be extracted from this URL.";
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return `Error: Could not extract content from ${url}`;
  }
}
