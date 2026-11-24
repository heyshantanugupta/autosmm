# AutoSMM

Your Social Media Marketing Solution. Enter your product details. The app proposes a social media strategy, you pick a platform and post types, and it writes drafts you edit and post yourself.

**It never posts for you.** No auto-posting, no automated connection requests, no automated replies. You copy the draft and publish it.

## Download the app (Windows and Mac)

No Node.js, no terminal and no setup. AutoSMM is a normal desktop app, and everything stays on your own computer, saved work included.

Open the [Releases page](https://github.com/heyshantanugupta/autosmm/releases) and download the file for your computer, then double-click it.

| Computer | Download |
|---|---|
| Windows | `AutoSMM-<version>-windows-x64.exe` (installer) or the file ending in `portable.exe` (runs without installing) |
| Mac with Apple chip (M1 or newer) | `AutoSMM-<version>-mac-arm64.dmg` |
| Mac with Intel chip | `AutoSMM-<version>-mac-x64.dmg` |

The apps are not code signed yet, so the first launch shows a warning:

- **Windows:** choose "More info", then "Run anyway".
- **Mac:** drag AutoSMM to Applications, then right-click it and choose Open the first time. If macOS says the app is damaged, run `xattr -cr /Applications/AutoSMM.app` in Terminal once.

Desktop extras: local models through Ollama work, "Download PDF" saves a real PDF file, and links such as "Post on LinkedIn" open in your normal browser.

## Choose how it writes

Open Settings inside the app and pick one:

- **Free:** Google Gemini, Groq or OpenRouter free models. Create a free key, paste it in Settings, done. Free tiers have rate limits.
- **Local and free:** Ollama, running on your own computer (works in the desktop app and when you run from source).
- **Paid:** Anthropic Claude (best quality) or OpenAI ChatGPT. Both need an API key, which is billed separately from any chat subscription.
- **No key at all:** demo mode. It uses templates, not a model, so you can try the flow.

Free-tier terms and model names change, and providers retire models. If you see "model not available", open Settings, paste your key and click **Check available models** to list what your key can use, then pick one.

## What it does

1. **Brief**: product, facts, audience, goal, channels, real proof, things never to say, tone.
2. **Strategy**: positioning, audiences, content themes, platform roles, weekly rhythm, how to measure, risks, and gaps in your brief.
3. **Platform and post types**: LinkedIn, Instagram, X, Facebook, YouTube, TikTok, Reddit, each with post types that fit its norms.
4. **Drafts**: editable text with a character counter, copy button, "rewrite this draft" with an instruction, and Markdown export.

## Bring your own key

You never pay for other people's usage: each user brings their own key for the provider they choose.

- Your key is kept in the browser tab (sessionStorage). It is saved to localStorage only if you tick "remember".
- It is sent to this app's own API routes in a request header and passed straight to the chosen provider for that one call.
- The server does not store or log it. Deploy this yourself if you want to be sure of that.
- Settings has a button that clears the key, brief and drafts.

## Keeping drafts honest

The agent is told to write only from the facts you give it. After generation, and again live as you edit, the app checks each draft:

- Every claim the draft says it relies on must match your facts or proof.
- Numbers in the text must appear in your inputs.
- Phrases from your "never say" list are flagged.
- If your style rules say "no em dash", em dashes are flagged.

Flags appear in the margin next to the draft. They are warnings, not blocks: you decide.

## Per-batch options, tracked links and posting

- **Per-batch settings.** In the Platform step you can set a tone, extra rules and a feature to focus on for just that batch. They sit on top of the brief, so you never have to edit the brief between posts. Each draft remembers its batch, so rewrites and the live checks use the same settings.
- **Tracked links.** Every draft shows a slug (for example `li-founder-story`). The draft sheet explains how to turn it into a tracked link (`utm_source`, `utm_medium=social`, `utm_campaign`), where to place the link on that platform, and where to see the clicks in Google Analytics (Traffic acquisition, Session campaign).
- **Post on a platform.** Each draft has a "Post on <Platform>" button. It copies the post, then opens that platform's compose page in a new tab. X is filled in for you (up to 280 characters). The other platforms open their post page and you paste with Ctrl+V. The app never posts anything for you.
- **Image prompts.** Each draft asks whether you want an image. Choosing Yes shows a ready-to-paste prompt built from that draft's visual idea, your product and your audience, plus buttons that copy it and open Gemini or ChatGPT (ChatGPT also gets the prompt filled in).

- **Save and load a brief.** On the first step, Save brief downloads your brief as a small file and Load a saved brief puts it back, on any device. The file holds only the brief, never an API key or drafts.
- **Download the strategy.** The strategy page can export the report as a PDF (choose Save as PDF in the print window) or as a Word (.docx) file.
- **OpenAI.** Choose OpenAI ChatGPT in Settings and paste an OpenAI API key. A ChatGPT subscription is billed separately and does not include API access.

## How it works

Next.js (App Router) and TypeScript. Anthropic uses forced tool use, so the model returns JSON that matches a schema. Other providers use the OpenAI-compatible chat API in JSON mode with the schema in the prompt. Either way the server validates and cleans the result.

The server only connects to the fixed provider endpoints in `lib/llm.ts`, never to a URL the browser supplies. Ollama is blocked on production deployments unless `ALLOW_LOCAL_MODELS=1` is set.

```
app/api/strategy   POST: brief in, strategy out
app/api/drafts     POST: brief, strategy, platform, post types in, drafts out
lib/providers.ts   supported providers, models and key hints
lib/llm.ts         Anthropic and OpenAI-compatible calls
lib/prompts.ts     system prompts and output schemas
lib/claims.ts      claim, number and phrase checks (unit tested)
lib/postTypes.ts   platform norms, limits and post types
lib/demo.ts        template output for demo mode
components/        the four steps, settings panel and platform marks
```

## The TheInterviews.ai example

`lib/presets.ts` includes an example brief for TheInterviews.ai, built only from public information. It is there as a demo. Delete `THEINTERVIEWS_EXAMPLE` and the "Load example" button in `components/IntakeStep.tsx` if you do not want it in a public fork.

## Limits

- Output quality depends on the facts you enter. Thin input gives generic drafts, and the strategy step lists what is missing.
- Claim checks are text matching, not fact checking. Read every draft before posting.
- Smaller free models follow instructions less reliably, so expect more rewrites and more flags from the claim checks. Model names are in `lib/providers.ts`.

## For developers

Most people should use the downloads above. To run from source you need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other commands: `npm test`, `npm run typecheck`, `npm run build`, `npm start`.

**For you (the maintainer):**

- `npm run desktop` builds the app and opens it in a desktop window for testing.
- `npm run dist:win` and `npm run dist:mac` build installers into `release/`. Windows installers build on Windows and Mac installers build on a Mac, so use the workflow below instead of building both yourself.
- The `Build desktop apps` workflow (in `.github/workflows`) builds both on GitHub. Push a tag such as `v1.0.0` and the installers are attached to a new Release automatically.
- To remove the warnings you need to sign the apps: an Apple Developer account (99 USD per year) for Mac, and a code signing certificate for Windows.

## License

MIT, copyright 2026 Shantanu Gupta. See the LICENSE file.
