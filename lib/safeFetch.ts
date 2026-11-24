import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isBlockedIp } from "./ipGuard";
import { UserFacingError } from "./llm";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const BOT_UA = "AutoSMM-Importer/1.0 (+https://github.com/heyshantanugupta/autosmm)";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const HEADERS = (ua: string) => ({ "User-Agent": ua, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" });

/** Local test servers only. Never set this on a hosted copy. */
const allowPrivate = () => process.env.IMPORT_ALLOW_PRIVATE === "1";

export function normalizeSiteUrl(input: string): URL {
  let text = input.trim();
  if (!text) throw new UserFacingError("Paste your website address first.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new UserFacingError("That does not look like a website address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UserFacingError("Only http and https addresses work.");
  if (url.username || url.password) throw new UserFacingError("Leave the username and password out of the address.");
  return url;
}

async function assertPublicHost(url: URL) {
  if (allowPrivate()) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new UserFacingError("Could not find that website. Check the address.", 400);
  if (addresses.some(isBlockedIp)) throw new UserFacingError("That address points to a private network, so it was not opened.", 400);
}

/** Fetch a public web page as text. Follows a few redirects, checking every hop. */
export async function fetchPublicPage(input: string): Promise<{ url: string; html: string }> {
  let url = normalizeSiteUrl(input);
  // An address typed without http or https gets https first, then plain http if that does not connect.
  let canFallBack = !/^[a-z][a-z0-9+.-]*:\/\//i.test(input.trim());
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    let res: Response;
    try {
      const get = (ua: string) => fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: HEADERS(ua) });
      res = await get(BOT_UA);
      // Many sites refuse unknown readers. Try once more the way a normal browser asks.
      if ([401, 403, 406, 429, 503].includes(res.status)) res = await get(BROWSER_UA);
    } catch {
      if (canFallBack && url.protocol === "https:") {
        canFallBack = false;
        url = new URL(url.toString().replace(/^https:/, "http:"));
        hop--;
        continue;
      }
      throw new UserFacingError("Could not open that website. Check the address and try again.", 502);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = normalizeSiteUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) {
      const why = res.status === 404 ? "That page was not found. Check the address." : [401, 403, 406, 429].includes(res.status)
        ? `That website blocks automated readers (error ${res.status}). Fill in the brief by hand.`
        : `The website answered with an error (${res.status}). Try again, or fill in the brief by hand.`;
      throw new UserFacingError(why, 502);
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) throw new UserFacingError("That address is not a web page.", 400);
    const reader = res.body?.getReader();
    if (!reader) throw new UserFacingError("The page was empty.", 502);
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel().catch(() => {});
    return { url: url.toString(), html: Buffer.concat(chunks).toString("utf8") };
  }
  throw new UserFacingError("The website redirected too many times.", 502);
}
