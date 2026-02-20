import {beforeEach, describe, expect, it, vi} from "vitest";
import {helloWorld} from "./index";
import {extractData} from "./extractData/extractData";
import {generateWithGemini} from "./llm/llm";
import {buildPrompt} from "./llm/prompts/buildPrompt";

vi.mock("./extractData/extractData", () => ({
  extractData: vi.fn(),
}));

vi.mock("./llm/llm", () => ({
  generateWithGemini: vi.fn(),
}));

vi.mock("./llm/prompts/buildPrompt", () => ({
  buildPrompt: vi.fn(),
}));

type TestResponse = {
  set: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
};

function makeResponse(): TestResponse {
  const res = {
    set: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("helloWorld", () => {
  const allowedOrigin = "http://localhost:5173";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("handles CORS preflight requests", async () => {
    const req = {
      method: "OPTIONS",
      headers: {origin: allowedOrigin},
      body: {},
    } as any;
    const res = makeResponse();

    await helloWorld(req, res as any);

    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      allowedOrigin,
    );
    expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, POST");
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    expect(res.set).toHaveBeenCalledWith("Access-Control-Max-Age", "3600");
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith("");
    expect(extractData).not.toHaveBeenCalled();
  });

  it("returns 400 when request body url is missing", async () => {
    const req = {
      method: "POST",
      headers: {origin: allowedOrigin},
      body: {},
    } as any;
    const res = makeResponse();

    await helloWorld(req, res as any);

    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      allowedOrigin,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing 'url' in request body.",
    });
    expect(extractData).not.toHaveBeenCalled();
  });

  it("extracts content, builds prompt, and returns title ideas", async () => {
    const req = {
      method: "POST",
      headers: {origin: allowedOrigin},
      body: {url: "https://example.com/article"},
    } as any;
    const res = makeResponse();

    const extracted = {
      url: "https://example.com/article",
      type: "article",
      title: "Doc title",
      description: "desc",
      textContent: "content",
    };
    const prompt = "prompt text";
    const ideas = [
      {title: "Title 1", rationale: "Why 1"},
      {title: "Title 2", rationale: "Why 2"},
    ];

    vi.mocked(extractData).mockResolvedValue(extracted);
    vi.mocked(buildPrompt).mockReturnValue(prompt);
    vi.mocked(generateWithGemini).mockResolvedValue(ideas as any);

    await helloWorld(req, res as any);

    expect(extractData).toHaveBeenCalledTimes(1);
    const [urlArg] = vi.mocked(extractData).mock.calls[0] as [URL];
    expect(urlArg).toBeInstanceOf(URL);
    expect(urlArg.toString()).toBe("https://example.com/article");
    expect(buildPrompt).toHaveBeenCalledWith(extracted);
    expect(generateWithGemini).toHaveBeenCalledWith(prompt);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ideas);
  });

  it("returns 500 when url is invalid", async () => {
    const req = {
      method: "POST",
      headers: {origin: allowedOrigin},
      body: {url: "not-a-valid-url"},
    } as any;
    const res = makeResponse();

    await helloWorld(req, res as any);

    expect(extractData).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: "Failed to process URL."});
  });

  it("returns 500 when dependencies throw", async () => {
    const req = {
      method: "POST",
      headers: {origin: allowedOrigin},
      body: {url: "https://example.com/article"},
    } as any;
    const res = makeResponse();

    vi.mocked(extractData).mockRejectedValue(new Error("fetch failed"));

    await helloWorld(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: "Failed to process URL."});
  });

  it("returns 403 when origin is not allowed", async () => {
    const req = {
      method: "POST",
      headers: {origin: "https://evil.example"},
      body: {url: "https://example.com/article"},
    } as any;
    const res = makeResponse();

    await helloWorld(req, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("Forbidden");
    expect(extractData).not.toHaveBeenCalled();
  });

  it("returns 403 when origin header is missing", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: {url: "https://example.com/article"},
    } as any;
    const res = makeResponse();

    await helloWorld(req, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("Forbidden");
    expect(extractData).not.toHaveBeenCalled();
  });
});
