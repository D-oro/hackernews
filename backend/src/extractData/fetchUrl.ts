const TIMEOUT_MS = 8000;
const MAX_READ_BYTES = 1_000_000; // 1MB

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Cache-Control": "max-age=0",
};

export async function fetchUrl(
  url: URL,
): Promise<string> {
  assertSafeUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: HEADERS,
      redirect: "follow",
    });

    if (!response.body || response.status >= 400) {
      console.log("could not fetch url, will use only url in title generation")
      return `<!DOCTYPE html><html><head><title></title></head><body></body></html>`;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let receivedBytes = 0;
    let result = "";

    while (true) {
      const {done, value} = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, {stream: true});
      result += chunk;
      receivedBytes += value.length;

      if (receivedBytes >= MAX_READ_BYTES) {
        reader.cancel();
        break;
      }
    }

    return result;
  } catch (error) {
    // todo: distinguish between different error types (network error, timeout, etc.) and handle accordingly
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- Helpers ---------- */

//toDo: Add more robust URL validation, e.g. using a library like validator.js
function assertSafeUrl(url: URL): void {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https protocols are allowed");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("127.") ||
    hostname === "0.0.0.0"
  ) {
    throw new Error("Local/internal addresses are not allowed");
  }
  if (
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("172.17.") ||
    hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") ||
    hostname.startsWith("172.2") 
  ) {
    throw new Error("Private network addresses are not allowed");
  }
}
