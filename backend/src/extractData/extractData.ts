import {JSDOM} from "jsdom";
import {Readability} from "@mozilla/readability";
import {fetchUrl} from "./fetchUrl";
import { ScrapedData } from "../types";

export async function extractData(
  url: URL
): Promise<ScrapedData> {
  try {
    const urlString = url.toString();
    const html = await fetchUrl(url);
    // ToDo: Add Puppeteer fallback for sites that heavily rely on JS
    const doc = new JSDOM(html, {url: urlString}).window.document;
    const article = new Readability(doc).parse();
    const ogType = getOgContent(doc, "og:type") ?? "unknown";

    const content: ScrapedData = {
      url: urlString,
      type: ogType,
      title: pickTitle(doc, article, url),
      description: pickDescription(doc, article),
      textContent: extractTextContent(doc, article),
    };

    return content;
  } catch (error) {
    console.error("Extraction failed:", error);
    throw error;
  }
}

/* ---------- Helpers ---------- */

function getOgContent(doc: Document, property: string): string | undefined {
  const value = doc
    .querySelector(`meta[property="${property}"]`)
    ?.getAttribute("content")
    ?.trim();

  return value || undefined;
}

function pickTitle(
  doc: Document,
  article: ReturnType<Readability["parse"]> | null,
  url: URL,
): string | undefined {
  return (
    getOgContent(doc, "og:title") || article?.title?.trim() || doc.title?.trim() ||urlToTitle(url)
  );
}

function pickDescription(
  doc: Document,
  article: ReturnType<Readability["parse"]> | null,
): string | undefined {
  return getOgContent(doc, "og:description") || article?.excerpt?.trim();
}

// ToDo: figure out if having text content actually helps with title generation
function extractTextContent(
  doc: Document,
  article: ReturnType<Readability["parse"]> | null,
): string {
  const text = article?.textContent?.trim() || doc.body?.textContent?.trim() || "";
  if (text.length > 5000) {
    return text.slice(0, 5000) + " [truncated]";
  }
  return text;
}

function urlToTitle(parsedUrl: URL): string {
  const domain = parsedUrl.hostname.replace("www.", "");
  const pathParts = parsedUrl.pathname.split("/").filter((part) => part);

  const titleText = pathParts
    .map((part) => decodeURIComponent(part).replace(/-/g, " "))
    .join(" ");

  return `${domain} reports: ${titleText}`;
}   