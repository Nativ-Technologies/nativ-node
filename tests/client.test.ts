import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Nativ } from "../src/client.js";
import {
  AuthenticationError,
  InsufficientCreditsError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../src/errors.js";

const API_KEY = "nativ_test_key_1234567890abcdef1234567890";
const BASE_URL = "https://api.usenativ.com";

function mockFetch(body: Record<string, unknown>, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function client() {
  return new Nativ({ apiKey: API_KEY });
}

describe("Nativ client", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------

  describe("constructor", () => {
    it("throws when no API key provided", () => {
      const orig = process.env.NATIV_API_KEY;
      delete process.env.NATIV_API_KEY;
      expect(() => new Nativ()).toThrow(AuthenticationError);
      if (orig) process.env.NATIV_API_KEY = orig;
    });

    it("reads API key from env", () => {
      process.env.NATIV_API_KEY = API_KEY;
      expect(() => new Nativ()).not.toThrow();
      delete process.env.NATIV_API_KEY;
    });
  });

  // -------------------------------------------------------------------
  // Error mapping
  // -------------------------------------------------------------------

  describe("error handling", () => {
    it("maps 401 to AuthenticationError", async () => {
      globalThis.fetch = mockFetch({ detail: "Invalid API key" }, 401);
      await expect(client().translate("hi", "French")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("maps 402 to InsufficientCreditsError", async () => {
      globalThis.fetch = mockFetch({ detail: "No credits" }, 402);
      await expect(client().translate("hi", "French")).rejects.toThrow(
        InsufficientCreditsError,
      );
    });

    it("maps 404 to NotFoundError", async () => {
      globalThis.fetch = mockFetch({ detail: "Not found" }, 404);
      await expect(client().deleteTmEntry("abc")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("maps 429 to RateLimitError", async () => {
      globalThis.fetch = mockFetch({ detail: "Too many requests" }, 429);
      await expect(client().translate("hi", "French")).rejects.toThrow(
        RateLimitError,
      );
    });

    it("maps 422 to ValidationError", async () => {
      globalThis.fetch = mockFetch({ detail: "Bad params" }, 422);
      await expect(client().translate("", "French")).rejects.toThrow(
        ValidationError,
      );
    });

    it("maps 500 to ServerError", async () => {
      globalThis.fetch = mockFetch({ detail: "Internal error" }, 500);
      await expect(client().translate("hi", "French")).rejects.toThrow(
        ServerError,
      );
    });

    it("includes statusCode and body on errors", async () => {
      const body = { detail: "Bad key" };
      globalThis.fetch = mockFetch(body, 401);
      try {
        await client().translate("hi", "French");
      } catch (e: any) {
        expect(e.statusCode).toBe(401);
        expect(e.body).toEqual(body);
      }
    });
  });

  // -------------------------------------------------------------------
  // translate
  // -------------------------------------------------------------------

  describe("translate", () => {
    it("sends correct request and parses response", async () => {
      const response = {
        translated_text: "Bonjour le monde",
        metadata: { word_count: 2, cost: 10 },
        tm_match: {
          score: 85,
          match_type: "fuzzy",
          top_matches: [
            {
              tm_id: "tm1",
              score: 85,
              match_type: "fuzzy",
              source_text: "Hello world",
              target_text: "Bonjour le monde",
              information_source: "manual",
            },
          ],
        },
        rationale: "Direct translation",
      };
      globalThis.fetch = mockFetch(response);

      const result = await client().translate("Hello world", "French", {
        context: "greeting",
        formality: "formal",
      });

      expect(result.translatedText).toBe("Bonjour le monde");
      expect(result.metadata.wordCount).toBe(2);
      expect(result.metadata.cost).toBe(10);
      expect(result.tmMatch?.score).toBe(85);
      expect(result.tmMatch?.topMatches).toHaveLength(1);
      expect(result.rationale).toBe("Direct translation");

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toContain("/text/culturalize");
      expect(opts.method).toBe("POST");
      const sentBody = JSON.parse(opts.body);
      expect(sentBody.text).toBe("Hello world");
      expect(sentBody.language).toBe("French");
      expect(sentBody.context).toBe("greeting");
      expect(sentBody.formality).toBe("formal");
    });

    it("handles backtranslation option", async () => {
      globalThis.fetch = mockFetch({
        translated_text: "Bonjour",
        metadata: { word_count: 1, cost: 5 },
        backtranslation: "Hello",
      });

      const result = await client().translate("Hello", "French", {
        backtranslate: true,
      });
      expect(result.backtranslation).toBe("Hello");

      const sentBody = JSON.parse(
        (globalThis.fetch as any).mock.calls[0][1].body,
      );
      expect(sentBody.backtranslate).toBe(true);
    });

    it("sends maxCharacters when set", async () => {
      globalThis.fetch = mockFetch({
        translated_text: "Hola",
        metadata: { word_count: 1, cost: 5 },
      });

      await client().translate("Hello", "Spanish", { maxCharacters: 50 });
      const sentBody = JSON.parse(
        (globalThis.fetch as any).mock.calls[0][1].body,
      );
      expect(sentBody.max_characters).toBe(50);
    });
  });

  // -------------------------------------------------------------------
  // translateBatch
  // -------------------------------------------------------------------

  describe("translateBatch", () => {
    it("translates multiple texts", async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          status: 200,
          ok: true,
          json: async () => ({
            translated_text: `translated_${callCount}`,
            metadata: { word_count: 1, cost: 5 },
          }),
          text: async () => "",
        };
      });

      const results = await client().translateBatch(
        ["Hello", "Goodbye"],
        "French",
      );
      expect(results).toHaveLength(2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------
  // Translation Memory
  // -------------------------------------------------------------------

  describe("translation memory", () => {
    it("searchTm sends correct params", async () => {
      globalThis.fetch = mockFetch({
        matches: [
          {
            tm_id: "tm1",
            score: 90,
            match_type: "fuzzy",
            source_text: "Sign up",
            target_text: "S'inscrire",
            information_source: "manual",
          },
        ],
      });

      const matches = await client().searchTm("Sign up", {
        targetLanguageCode: "fr",
        minScore: 70,
      });

      expect(matches).toHaveLength(1);
      expect(matches[0].tmId).toBe("tm1");
      expect(matches[0].score).toBe(90);

      const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
      expect(url.searchParams.get("query")).toBe("Sign up");
      expect(url.searchParams.get("target_lang")).toBe("fr");
      expect(url.searchParams.get("score_cutoff")).toBe("70");
    });

    it("listTmEntries parses paginated response", async () => {
      globalThis.fetch = mockFetch({
        entries: [
          {
            id: "e1",
            source_language_code: "en",
            source_text: "Hello",
            target_language_code: "fr",
            target_text: "Bonjour",
            information_source: "manual",
            enabled: true,
            priority: 50,
          },
        ],
        total: 42,
        offset: 0,
        limit: 100,
      });

      const result = await client().listTmEntries({ enabledOnly: true });
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(42);
      expect(result.entries[0].sourceText).toBe("Hello");
    });

    it("addTmEntry sends correct body", async () => {
      globalThis.fetch = mockFetch({
        id: "new1",
        source_text: "Sign up",
        target_text: "S'inscrire",
        source_language_code: "en",
        target_language_code: "fr-FR",
        information_source: "manual",
        enabled: true,
        priority: 50,
      });

      const entry = await client().addTmEntry(
        "Sign up",
        "S'inscrire",
        "en",
        "fr-FR",
        { name: "CTA" },
      );
      expect(entry.id).toBe("new1");
      expect(entry.targetText).toBe("S'inscrire");

      const sentBody = JSON.parse(
        (globalThis.fetch as any).mock.calls[0][1].body,
      );
      expect(sentBody.source_name).toBe("CTA");
    });

    it("updateTmEntry validates input", async () => {
      await expect(client().updateTmEntry("x", {})).rejects.toThrow(
        ValidationError,
      );
    });

    it("deleteTmEntry calls DELETE", async () => {
      globalThis.fetch = mockFetch({ success: true });
      const ok = await client().deleteTmEntry("e1");
      expect(ok).toBe(true);
      expect((globalThis.fetch as any).mock.calls[0][1].method).toBe("DELETE");
    });

    it("getTmStats parses response", async () => {
      globalThis.fetch = mockFetch({
        total: 100,
        enabled: 80,
        disabled: 20,
        by_source: { manual: { total: 50 } },
      });

      const stats = await client().getTmStats();
      expect(stats.total).toBe(100);
      expect(stats.enabled).toBe(80);
      expect(stats.bySource).toEqual({ manual: { total: 50 } });
    });
  });

  // -------------------------------------------------------------------
  // Languages
  // -------------------------------------------------------------------

  describe("languages", () => {
    it("getLanguages parses response", async () => {
      globalThis.fetch = mockFetch({
        languages: [
          {
            id: 1,
            language: "French",
            language_code: "fr",
            formality: "formal",
          },
          {
            id: 2,
            language: "German",
            language_code: "de",
            custom_style: "Use Sie",
          },
        ],
      });

      const langs = await client().getLanguages();
      expect(langs).toHaveLength(2);
      expect(langs[0].language).toBe("French");
      expect(langs[0].formality).toBe("formal");
      expect(langs[1].customStyle).toBe("Use Sie");
    });

    it("updateLanguageFormality sends PATCH", async () => {
      globalThis.fetch = mockFetch({ success: true });
      const ok = await client().updateLanguageFormality(1, "formal");
      expect(ok).toBe(true);

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toContain("/user/languages/1/formality");
      expect(opts.method).toBe("PATCH");
    });
  });

  // -------------------------------------------------------------------
  // Style Guides & Brand Voice
  // -------------------------------------------------------------------

  describe("style guides", () => {
    it("getStyleGuides parses response", async () => {
      globalThis.fetch = mockFetch({
        guides: [
          {
            id: "g1",
            title: "Tone",
            content: "Be friendly",
            is_enabled: true,
            display_order: 0,
          },
        ],
      });

      const guides = await client().getStyleGuides();
      expect(guides).toHaveLength(1);
      expect(guides[0].title).toBe("Tone");
      expect(guides[0].isEnabled).toBe(true);
    });

    it("createStyleGuide sends POST", async () => {
      globalThis.fetch = mockFetch({
        id: "g2",
        title: "Voice",
        content: "Active voice",
        is_enabled: true,
      });

      const guide = await client().createStyleGuide("Voice", "Active voice");
      expect(guide.id).toBe("g2");

      const sentBody = JSON.parse(
        (globalThis.fetch as any).mock.calls[0][1].body,
      );
      expect(sentBody.title).toBe("Voice");
      expect(sentBody.is_enabled).toBe(true);
    });

    it("deleteStyleGuide calls DELETE", async () => {
      globalThis.fetch = mockFetch({ success: true });
      const ok = await client().deleteStyleGuide("g1");
      expect(ok).toBe(true);
    });
  });

  describe("brand voice", () => {
    it("getBrandVoice parses response", async () => {
      globalThis.fetch = mockFetch({
        prompt: "You are a friendly brand",
        exists: true,
        cached: false,
      });

      const voice = await client().getBrandVoice();
      expect(voice.prompt).toBe("You are a friendly brand");
      expect(voice.exists).toBe(true);
    });

    it("getCombinedPrompt returns raw data", async () => {
      const combined = { prompt: "combined prompt", guides: [] };
      globalThis.fetch = mockFetch(combined);
      const result = await client().getCombinedPrompt();
      expect(result.prompt).toBe("combined prompt");
    });
  });

  // -------------------------------------------------------------------
  // Feedback
  // -------------------------------------------------------------------

  describe("feedback", () => {
    it("submitFeedback sends POST", async () => {
      globalThis.fetch = mockFetch({ success: true });
      const result = await client().submitFeedback({
        source: "Hello",
        result: "Bonjour",
        language: "French",
        approved: true,
      });
      expect(result.success).toBe(true);

      const sentBody = JSON.parse(
        (globalThis.fetch as any).mock.calls[0][1].body,
      );
      expect(sentBody.approved).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // Request headers
  // -------------------------------------------------------------------

  describe("request headers", () => {
    it("sends X-API-Key and User-Agent", async () => {
      globalThis.fetch = mockFetch({
        translated_text: "Bonjour",
        metadata: { word_count: 1, cost: 5 },
      });

      await client().translate("Hello", "French");

      const headers = (globalThis.fetch as any).mock.calls[0][1].headers;
      expect(headers["X-API-Key"]).toBe(API_KEY);
      expect(headers["User-Agent"]).toMatch(/^nativ-node\//);
    });
  });
});
