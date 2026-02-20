# Nativ Node.js/TypeScript SDK

The official Node.js client for the [Nativ](https://usenativ.com) AI localization platform.

Wraps the full Nativ REST API with **TypeScript types**, zero runtime dependencies (uses native `fetch`), and ESM + CommonJS dual output.

## Installation

```bash
npm install nativ
```

## Quick start

```typescript
import { Nativ } from "nativ";

const client = new Nativ({ apiKey: "nativ_..." }); // or set NATIV_API_KEY env var

// Translate text
const result = await client.translate("Launch your product globally", "French");
console.log(result.translatedText); // "Lancez votre produit à l'international"
console.log(result.tmMatch);        // TM match details (score, source, etc.)

// Batch translate
const results = await client.translateBatch(
  ["Sign up", "Log in", "Settings"],
  "German",
);
for (const r of results) {
  console.log(r.translatedText);
}
```

## Features

### Translation

```typescript
const result = await client.translate(
  "Welcome to our platform",
  "Spanish",
  {
    context: "SaaS onboarding email subject line",
    formality: "formal",
    backtranslate: true,
  },
);

console.log(result.translatedText);  // translated text
console.log(result.backtranslation); // back-translation for QA
console.log(result.rationale);       // AI explanation of translation choices
console.log(result.tmMatch?.score);  // TM match percentage
```

### OCR — extract text from images

```typescript
const result = await client.extractText("screenshot.png");
console.log(result.extractedText);
```

### Image culturalization

```typescript
const result = await client.culturalizeImage(
  "banner_en.png",
  "Soldes d'été",
  "fr",
  { numImages: 3 },
);
for (const img of result.images) {
  // img.imageBase64 contains the generated image
}
```

### Cultural sensitivity inspection

```typescript
const result = await client.inspectImage("ad_creative.jpg");
console.log(result.verdict); // "SAFE" or "NOT SAFE"
for (const issue of result.affectedCountries) {
  console.log(`${issue.country}: ${issue.issue} → ${issue.suggestion}`);
}
```

### Translation memory

```typescript
// Search
const matches = await client.searchTm("Sign up", {
  targetLanguageCode: "fr",
});
for (const m of matches) {
  console.log(`${m.score}% — ${m.sourceText} → ${m.targetText}`);
}

// Add entry
await client.addTmEntry(
  "Sign up",
  "S'inscrire",
  "en",
  "fr-FR",
  { name: "onboarding CTA" },
);

// List & filter
const entries = await client.listTmEntries({
  targetLanguageCode: "fr-FR",
  enabledOnly: true,
});
console.log(`${entries.total} entries`);

// Stats
const stats = await client.getTmStats();
console.log(`${stats.total} total, ${stats.enabled} enabled`);
```

### Languages

```typescript
const languages = await client.getLanguages();
for (const lang of languages) {
  console.log(`${lang.language} (${lang.languageCode}) — formality: ${lang.formality}`);
}
```

### Style guides & brand voice

```typescript
// List style guides
const guides = await client.getStyleGuides();
for (const g of guides) {
  console.log(`${g.title} — ${g.isEnabled ? "enabled" : "disabled"}`);
}

// Get brand voice prompt
const voice = await client.getBrandVoice();
console.log(voice.prompt);

// Create a style guide
await client.createStyleGuide(
  "Tone of Voice",
  "Always use active voice. Avoid jargon.",
);
```

## Error handling

```typescript
import { Nativ, InsufficientCreditsError, AuthenticationError } from "nativ";

const client = new Nativ();

try {
  const result = await client.translate("Hello", "French");
} catch (e) {
  if (e instanceof AuthenticationError) {
    console.log("Bad API key");
  } else if (e instanceof InsufficientCreditsError) {
    console.log("Top up at dashboard.usenativ.com");
  }
}
```

All exceptions extend `NativError` and carry `statusCode` and `body` properties.

| Exception                  | HTTP | When                          |
|----------------------------|------|-------------------------------|
| `AuthenticationError`      | 401  | Invalid or missing API key    |
| `InsufficientCreditsError` | 402  | Not enough credits            |
| `ValidationError`          | 400  | Bad request parameters        |
| `NotFoundError`            | 404  | Resource not found            |
| `RateLimitError`           | 429  | Too many requests             |
| `ServerError`              | 5xx  | Nativ API server error        |

## Configuration

```typescript
const client = new Nativ({
  apiKey: "nativ_...",            // or NATIV_API_KEY env var
  baseUrl: "https://...",        // or NATIV_API_URL env var (default: api.usenativ.com)
  timeout: 120_000,              // request timeout in ms (default: 2 minutes)
});
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- Zero runtime dependencies

## Related packages

- **[nativ](https://pypi.org/project/nativ/)** (Python SDK)
- **[nativ-mcp](https://pypi.org/project/nativ-mcp/)** — MCP server for Claude, Cursor, etc.
- **[langchain-nativ](https://pypi.org/project/langchain-nativ/)** — LangChain tool

## License

MIT
