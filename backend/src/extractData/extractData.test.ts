import {describe, it, expect, vi, beforeEach} from "vitest";
import {extractData} from "./extractData";
import {fetchUrl} from "./fetchUrl";

vi.mock("./fetchUrl", () => ({
  fetchUrl: vi.fn(),
}));

describe("extractData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts OG type/title/description and readability textContent", async () => {
    const url = new URL("https://example.com/post");

    // Keep the body simple so Readability can parse it.
    const html = `<!doctype html>
      <html>
        <head>
          <title>Document Title</title>
          <meta property="og:type" content="article" />
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
        </head>
        <body>
          <article>
            <h1>Heading</h1>
            <p>Hello world.</p>
          </article>
        </body>
      </html>`;

    vi.mocked(fetchUrl).mockResolvedValue(html);

    const result = await extractData(url);

    expect(fetchUrl).toHaveBeenCalledTimes(1);
    expect(fetchUrl).toHaveBeenCalledWith(url);

    expect(result.url).toBe(url.toString());
    expect(result.type).toBe("article");
    expect(result.title).toBe("OG Title");
    expect(result.description).toBe("OG Description");

    // Readability usually returns some extracted text content.
    expect(result.textContent).toContain("Hello world.");
  });

  it("falls back when OG fields are missing: type=unknown, title from document title, description undefined", async () => {
    const url = new URL("https://example.com/no-og");

    const html = `<!doctype html>
      <html>
        <head>
          <title>Only Doc Title</title>
        </head>
        <body>
          <article><p>Some content.</p></article>
        </body>
      </html>`;

    vi.mocked(fetchUrl).mockResolvedValue(html);

    const result = await extractData(url);

    expect(result.type).toBe("unknown");
    expect(result.title).toBe("Only Doc Title");
    expect(result.description).toBe("Some content.");
    expect(result.textContent).toContain("Some content.");
  });

  it("rethrows when fetchUrl fails", async () => {
    const url = new URL("https://example.com/fail");
    const err = new Error("boom");
    vi.mocked(fetchUrl).mockRejectedValue(err);

    await expect(extractData(url)).rejects.toThrow("boom");
  });
});
