import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {fetchUrl} from "./fetchUrl";

type ReaderChunk = Uint8Array | undefined;

function makeReader(chunks: ReaderChunk[]) {
  let i = 0;
  const cancel = vi.fn(async () => {});
  return {
    read: vi.fn(async () => {
      if (i >= chunks.length) return {done: true as const, value: undefined};
      const value = chunks[i++];
      if (!value) return {done: true as const, value: undefined};
      return {done: false as const, value};
    }),
    cancel,
  };
}

function makeResponse(opts: {
  ok: boolean;
  status: number;
  contentType?: string;
  chunks?: Uint8Array[];
  hasBody?: boolean;
}) {
  const reader =
    opts.hasBody === false ? undefined : makeReader(opts.chunks ?? []);
  return {
    ok: opts.ok,
    status: opts.status,
    headers: {
      get: vi.fn((key: string) =>
        key.toLowerCase() === "content-type" ? (opts.contentType ?? "") : "",
      ),
    },
    body:
      opts.hasBody === false
        ? null
        : {
            getReader: vi.fn(() => reader),
          },
  } as unknown as Response;
}

function utf8(s: string) {
  return new TextEncoder().encode(s);
}

describe("fetchUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches and returns HTML body (streams)", async () => {
    const url = new URL("https://example.com/a");

    const resp = makeResponse({
      ok: true,
      status: 200,
      contentType: "text/html; charset=utf-8",
      chunks: [utf8("<html>"), utf8("<body>Hello</body></html>")],
    });

    const fetchMock = vi.fn().mockResolvedValue(resp);
    vi.stubGlobal("fetch", fetchMock);

    const html = await fetchUrl(url);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      url.toString(),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        redirect: "follow",
        headers: expect.objectContaining({
          Accept: expect.stringContaining("text/html"),
          "User-Agent": expect.stringContaining("Mozilla/5.0"),
        }),
      }),
    );

    expect(html).toContain("<body>Hello</body>");
  });

  it("rejects non-http/https protocols", async () => {
    const url = new URL("file:///etc/passwd");
    await expect(fetchUrl(url)).rejects.toThrow(
      "Only http/https protocols are allowed",
    );
  });

  it("rejects localhost/internal hostnames", async () => {
    await expect(fetchUrl(new URL("http://localhost/"))).rejects.toThrow(
      "Local/internal addresses are not allowed",
    );
    await expect(fetchUrl(new URL("http://127.0.0.1/"))).rejects.toThrow(
      "Local/internal addresses are not allowed",
    );
    await expect(fetchUrl(new URL("http://example.local/"))).rejects.toThrow(
      "Local/internal addresses are not allowed",
    );
  });

  it("rejects private network IPs", async () => {
    await expect(fetchUrl(new URL("http://10.0.0.1/"))).rejects.toThrow(
      "Private network addresses are not allowed",
    );
    await expect(fetchUrl(new URL("http://192.168.1.10/"))).rejects.toThrow(
      "Private network addresses are not allowed",
    );
    await expect(fetchUrl(new URL("http://172.16.0.5/"))).rejects.toThrow(
      "Private network addresses are not allowed",
    );
  });

  it("returns fallback html when response status is 400+", async () => {
    const url = new URL("https://example.com/404");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 404,
          contentType: "text/html",
          chunks: [utf8("<html></html>")],
        }),
      ),
    );

    await expect(fetchUrl(url)).resolves.toBe(
      "<!DOCTYPE html><html><head><title></title></head><body></body></html>",
    );
  });

  it("returns response even when content-type is not text/html", async () => {
    const url = new URL("https://example.com/json");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: true,
          status: 200,
          contentType: "application/json",
          chunks: [utf8('{"ok":true}')],
        }),
      ),
    );

    await expect(fetchUrl(url)).resolves.toBe('{"ok":true}');
  });

  it("returns fallback html when response has no body", async () => {
    const url = new URL("https://example.com/nobody");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: true,
          status: 200,
          contentType: "text/html",
          hasBody: false,
        }),
      ),
    );

    await expect(fetchUrl(url)).resolves.toBe(
      "<!DOCTYPE html><html><head><title></title></head><body></body></html>",
    );
  });

  it("cancels the reader and returns buffered content when response exceeds MAX_READ_BYTES", async () => {
    const url = new URL("https://example.com/large");

    // 6MB of "<" characters.
    const big = new Uint8Array(6_000_000);
    big.fill("<".charCodeAt(0));
    const reader = makeReader([big]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn(() => "text/html"),
        },
        body: {
          getReader: vi.fn(() => reader),
        },
      } as unknown as Response),
    );

    const html = await fetchUrl(url);

    expect(reader.cancel).toHaveBeenCalledTimes(1);
    expect(html.length).toBe(big.length);
  });

  it("returns body even when it does not look like html", async () => {
    const url = new URL("https://example.com/not-html");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: true,
          status: 200,
          contentType: "text/html",
          chunks: [utf8("   not html at all")],
        }),
      ),
    );

    await expect(fetchUrl(url)).resolves.toBe("   not html at all");
  });

  it("aborts after TIMEOUT_MS", async () => {
    // This test asserts that AbortController.abort() is invoked via the timeout.
    // We fake timers and make fetch never resolve, so the only thing we can check is abort() being called.

    vi.useFakeTimers();

    const url = new URL("https://example.com/slow");

    const abortSpy = vi.fn();
    const originalAbortController = globalThis.AbortController;

    class FakeAbortController {
      signal: AbortSignal;
      constructor() {
        // Minimal signal object; fetch only needs `signal` to exist.
        this.signal = {} as AbortSignal;
      }
      abort() {
        abortSpy();
      }
    }

    globalThis.AbortController = FakeAbortController;

    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>(() => {
            /* never resolves */
          }),
      ),
    );

    const promise = fetchUrl(url);

    // TIMEOUT_MS is 8000 in module; advance just beyond it.
    await vi.advanceTimersByTimeAsync(8001);

    expect(abortSpy).toHaveBeenCalledTimes(1);

    // Avoid unhandled promise (it will remain pending because fetch never resolves).
    // Restore controller and stop here.
    globalThis.AbortController = originalAbortController;

    // Do not await `promise`.
    void promise;
  });
});
