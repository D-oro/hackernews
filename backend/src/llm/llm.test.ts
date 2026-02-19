import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const ORIGINAL_API_KEY = process.env.GEMINI_API_KEY;

async function loadSubject(apiKey?: string) {
  vi.resetModules();
  if (apiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = apiKey;
  }
  return import("./llm");
}

describe("generateWithGemini", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = ORIGINAL_API_KEY;
    }
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    const {generateWithGemini} = await loadSubject("");
    await expect(generateWithGemini("hello")).rejects.toThrow(
      "Missing GEMINI_API_KEY environment variable",
    );
  });

  it("throws when prompt is empty", async () => {
    const {generateWithGemini} = await loadSubject("test-key");
    await expect(generateWithGemini("   ")).rejects.toThrow(
      "Prompt must be a non-empty string",
    );
  });

  it("calls Gemini endpoint and returns first 3 title ideas", async () => {
    const responsePayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  {title: "t1", rationale: "r1"},
                  {title: "t2", rationale: "r2"},
                  {title: "t3", rationale: "r3"},
                  {title: "t4", rationale: "r4"},
                ]),
              },
            ],
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responsePayload),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const {generateWithGemini} = await loadSubject("abc123");
    const result = await generateWithGemini("Current title: foo");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(endpoint).toContain("generativelanguage.googleapis.com");
    expect(endpoint).toContain("gemini-2.5-flash");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-goog-api-key": "abc123",
    });

    const body = JSON.parse(String(options.body)) as {
      contents?: Array<{parts?: Array<{text?: string}>}>;
      generationConfig?: {response_mime_type?: string};
    };
    expect(body.contents?.[0]?.parts?.[0]?.text).toBe("Current title: foo");
    expect(body.generationConfig?.response_mime_type).toBe("application/json");

    expect(result).toEqual([
      {title: "t1", rationale: "r1"},
      {title: "t2", rationale: "r2"},
      {title: "t3", rationale: "r3"},
    ]);
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("throws API error details when Gemini returns non-OK", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue("quota exceeded"),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const {generateWithGemini} = await loadSubject("abc123");

    await expect(generateWithGemini("prompt")).rejects.toThrow(
      "Gemini API error 429: quota exceeded",
    );
  });

  it("throws when candidate text is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({candidates: [{content: {parts: [{}]}}]}),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const {generateWithGemini} = await loadSubject("abc123");
    await expect(generateWithGemini("prompt")).rejects.toThrow(
      "No response text",
    );
  });

  it("throws when Gemini returns invalid JSON payload text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [{content: {parts: [{text: "not-json"}]}}],
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const {generateWithGemini} = await loadSubject("abc123");
    await expect(generateWithGemini("prompt")).rejects.toThrow(
      "Invalid JSON returned by Gemini",
    );
  });
});
