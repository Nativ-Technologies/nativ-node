import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  AuthenticationError,
  InsufficientCreditsError,
  NativError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "./errors.js";
import type {
  AudioConsentScript,
  AudioPreview,
  AudioSynthesis,
  AudioTranscript,
  AudioVoices,
  BrandVoice,
  ClonedVoice,
  CulturalInspection,
  FileInput,
  ImageResult,
  Language,
  LocalizeSubtitlesOptions,
  OCRResult,
  RemuxedVideo,
  StyleGuide,
  SubtitleParse,
  SubtitlePlayground,
  SynthesizeAudioOptions,
  TMEntry,
  TMEntryList,
  TMSearchMatch,
  TMStats,
  TranslateBatchOptions,
  TranslateOptions,
  Translation,
} from "./types.js";
import {
  parseAudioPreview,
  parseAudioSynthesis,
  parseAudioTranscript,
  parseAudioVoices,
  parseBrandVoice,
  parseClonedVoice,
  parseConsentScript,
  parseImageResult,
  parseInspection,
  parseLanguages,
  parseStyleGuide,
  parseSubtitleParse,
  parseSubtitlePlayground,
  parseTMEntry,
  parseTMList,
  parseTMSearch,
  parseTMStats,
  parseTranslation,
} from "./types.js";
import { VERSION } from "./version.js";

const DEFAULT_BASE_URL = "https://api.usenativ.com";

export interface NativOptions {
  apiKey?: string;
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: 120 000 (2 minutes). */
  timeout?: number;
}

function resolveApiKey(apiKey?: string): string {
  const key = apiKey || process.env.NATIV_API_KEY;
  if (!key) {
    throw new AuthenticationError(
      "No API key provided. Pass apiKey in options or set the NATIV_API_KEY " +
        "environment variable. Create one at " +
        "https://dashboard.usenativ.com → Settings → API Keys",
    );
  }
  return key;
}

function raiseForStatus(
  status: number,
  body: Record<string, unknown>,
): void {
  if (status >= 200 && status < 300) return;

  const detail =
    (body.detail as string) ?? (body.message as string) ?? `HTTP ${status}`;
  const opts = { statusCode: status, body };

  const excMap: Record<number, new (...a: any[]) => NativError> = {
    401: AuthenticationError,
    402: InsufficientCreditsError,
    404: NotFoundError,
    429: RateLimitError,
  };

  if (excMap[status]) throw new excMap[status](detail, opts);
  if (status >= 400 && status < 500) throw new ValidationError(detail, opts);
  throw new ServerError(detail, opts);
}

async function resolveFile(
  input: FileInput,
): Promise<{ data: Buffer; filename: string; contentType: string }> {
  if (typeof input === "string") {
    const data = await readFile(input);
    const filename = basename(input);
    const contentType = guessContentType(filename);
    return { data, filename, contentType };
  }

  if (Buffer.isBuffer(input)) {
    return { data: input, filename: "image.png", contentType: "image/png" };
  }

  if (input instanceof Uint8Array) {
    return {
      data: Buffer.from(input),
      filename: "image.png",
      contentType: "image/png",
    };
  }

  if (input instanceof Blob) {
    const buf = Buffer.from(await input.arrayBuffer());
    return {
      data: buf,
      filename: "image.png",
      contentType: input.type || "image/png",
    };
  }

  return {
    data: Buffer.isBuffer(input.data)
      ? input.data
      : Buffer.from(input.data),
    filename: input.filename,
    contentType: input.contentType ?? guessContentType(input.filename),
  };
}

function guessContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tiff: "image/tiff",
    pdf: "application/pdf",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    mp4: "video/mp4",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    webm: "video/webm",
    srt: "application/x-subrip",
    itt: "application/xml",
    txt: "text/plain",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

/**
 * Nativ API client.
 *
 * @example
 * ```ts
 * import { Nativ } from "nativ";
 *
 * const client = new Nativ({ apiKey: "nativ_..." });
 * const result = await client.translate("Hello world", "French");
 * console.log(result.translatedText);
 * ```
 */
export class Nativ {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: NativOptions = {}) {
    this.apiKey = resolveApiKey(options.apiKey);
    this.baseUrl = (
      options.baseUrl ??
      process.env.NATIV_API_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
    this.timeout = options.timeout ?? 120_000;
  }

  // -------------------------------------------------------------------
  // Internal request helper
  // -------------------------------------------------------------------

  private async request(
    method: string,
    path: string,
    options?: {
      json?: Record<string, unknown>;
      params?: Record<string, string | number | boolean | string[]>;
      formData?: FormData;
      timeout?: number;
    },
  ): Promise<Record<string, unknown>> {
    const url = new URL(path, this.baseUrl);
    if (options?.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(k, String(item));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "User-Agent": `nativ-node/${VERSION}`,
    };

    let body: string | FormData | undefined;
    if (options?.formData) {
      body = options.formData;
    } else if (options?.json) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.json);
    }

    const timeout = options?.timeout ?? this.timeout;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const resp = await fetch(url.toString(), {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      let respBody: Record<string, unknown>;
      try {
        respBody = (await resp.json()) as Record<string, unknown>;
      } catch {
        respBody = { detail: await resp.text().catch(() => "") };
      }

      raiseForStatus(resp.status, respBody);
      return respBody;
    } finally {
      clearTimeout(timer);
    }
  }

  // -------------------------------------------------------------------
  // Translation
  // -------------------------------------------------------------------

  /**
   * Translate text with cultural adaptation.
   *
   * Uses your translation memory, brand voice, and style guides
   * automatically.
   */
  async translate(
    text: string,
    targetLanguage: string,
    options: TranslateOptions = {},
  ): Promise<Translation> {
    const body: Record<string, unknown> = {
      text,
      language: targetLanguage,
      source_language: options.sourceLanguage ?? "English",
      source_language_code: options.sourceLanguageCode ?? "en",
      tool: "api",
      include_tm_info: options.includeTmInfo ?? true,
      backtranslate: options.backtranslate ?? false,
      include_rationale: options.includeRationale ?? true,
    };
    if (options.targetLanguageCode)
      body.language_code = options.targetLanguageCode;
    if (options.context) body.context = options.context;
    if (options.glossary) body.glossary = options.glossary;
    if (options.formality) body.formality = options.formality;
    if (options.maxCharacters != null)
      body.max_characters = options.maxCharacters;

    const data = await this.request("POST", "/text/culturalize", {
      json: body,
    });
    return parseTranslation(data);
  }

  /**
   * Translate multiple texts to the same target language.
   *
   * Convenience wrapper that calls {@link translate} for each text.
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    options: TranslateBatchOptions = {},
  ): Promise<Translation[]> {
    return Promise.all(
      texts.map((t) =>
        this.translate(t, targetLanguage, {
          ...options,
          includeTmInfo: true,
          backtranslate: false,
          includeRationale: false,
        }),
      ),
    );
  }

  // -------------------------------------------------------------------
  // OCR
  // -------------------------------------------------------------------

  /** Extract text from an image via OCR. */
  async extractText(image: FileInput): Promise<OCRResult> {
    const file = await resolveFile(image);
    const form = new FormData();
    form.append(
      "file",
      new Blob([file.data.buffer as ArrayBuffer], { type: file.contentType }),
      file.filename,
    );

    const data = await this.request("POST", "/text/extract", {
      formData: form,
    });
    return { extractedText: (data.extracted_text as string) ?? "" };
  }

  // -------------------------------------------------------------------
  // Image
  // -------------------------------------------------------------------

  /** Generate a culturalized image with styled text. */
  async culturalizeImage(
    image: FileInput,
    text: string,
    languageCode: string,
    options?: {
      outputFormat?: string;
      model?: string;
      numImages?: number;
    },
  ): Promise<ImageResult> {
    const file = await resolveFile(image);
    const form = new FormData();
    form.append(
      "file",
      new Blob([file.data.buffer as ArrayBuffer], { type: file.contentType }),
      file.filename,
    );
    form.append("text", text);
    form.append("language_code", languageCode);
    form.append("output_format", options?.outputFormat ?? "png");
    form.append("model", options?.model ?? "gpt");
    form.append("num_images", String(options?.numImages ?? 1));
    form.append("tool", "api");

    const data = await this.request("POST", "/image/culturalize", {
      formData: form,
    });
    return parseImageResult(data);
  }

  /** Check an image for cultural sensitivity issues. */
  async inspectImage(
    image: FileInput,
    options?: { countries?: string[] },
  ): Promise<CulturalInspection> {
    const file = await resolveFile(image);
    const form = new FormData();
    form.append(
      "file",
      new Blob([file.data.buffer as ArrayBuffer], { type: file.contentType }),
      file.filename,
    );
    if (options?.countries?.length) {
      form.append("countries", options.countries.join(","));
    }

    const data = await this.request("POST", "/image/inspect", {
      formData: form,
    });
    return parseInspection(data);
  }

  // -------------------------------------------------------------------
  // Languages
  // -------------------------------------------------------------------

  /** Get all languages configured in your Nativ workspace. */
  async getLanguages(): Promise<Language[]> {
    const data = await this.request("GET", "/user/languages");
    return parseLanguages(data);
  }

  /** Update the formality setting for a language. */
  async updateLanguageFormality(
    mappingId: number,
    formality: string,
  ): Promise<boolean> {
    const data = await this.request(
      "PATCH",
      `/user/languages/${mappingId}/formality`,
      { json: { formality } },
    );
    return (data.success as boolean) ?? false;
  }

  /** Update the custom style directive for a language. */
  async updateLanguageCustomStyle(
    mappingId: number,
    customStyle: string | null,
  ): Promise<boolean> {
    const data = await this.request(
      "PATCH",
      `/user/languages/${mappingId}/custom-style`,
      { json: { custom_style: customStyle } },
    );
    return (data.success as boolean) ?? false;
  }

  // -------------------------------------------------------------------
  // Translation Memory
  // -------------------------------------------------------------------

  /** Fuzzy-search the translation memory. */
  async searchTm(
    query: string,
    options?: {
      sourceLanguageCode?: string;
      targetLanguageCode?: string;
      minScore?: number;
      limit?: number;
    },
  ): Promise<TMSearchMatch[]> {
    const params: Record<string, string | number | boolean> = {
      query,
      source_lang: options?.sourceLanguageCode ?? "en",
      score_cutoff: options?.minScore ?? 0,
      limit: options?.limit ?? 10,
    };
    if (options?.targetLanguageCode) {
      params.target_lang = options.targetLanguageCode;
    }
    const data = await this.request("GET", "/master-tm/fuzzy-search", {
      params,
    });
    return parseTMSearch(data);
  }

  /** List translation memory entries with optional filters. */
  async listTmEntries(options?: {
    sourceLanguageCode?: string;
    targetLanguageCode?: string;
    informationSource?: string;
    search?: string;
    enabledOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<TMEntryList> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const params: Record<string, string | number | boolean> = { limit, offset };
    if (options?.sourceLanguageCode)
      params.source_lang = options.sourceLanguageCode;
    if (options?.targetLanguageCode)
      params.target_lang = options.targetLanguageCode;
    if (options?.informationSource)
      params.information_source = options.informationSource;
    if (options?.search) params.search = options.search;
    if (options?.enabledOnly) params.enabled_only = true;

    const data = await this.request("GET", "/master-tm/entries", { params });
    return parseTMList(data, offset, limit);
  }

  /** Add an entry to the translation memory. */
  async addTmEntry(
    sourceText: string,
    targetText: string,
    sourceLanguageCode: string,
    targetLanguageCode: string,
    options?: { name?: string },
  ): Promise<TMEntry> {
    const body: Record<string, unknown> = {
      source_text: sourceText,
      target_text: targetText,
      source_language_code: sourceLanguageCode,
      target_language_code: targetLanguageCode,
      information_source: "manual",
    };
    if (options?.name) body.source_name = options.name;

    const data = await this.request("POST", "/master-tm/entries", {
      json: body,
    });
    return parseTMEntry(data);
  }

  /** Update a translation memory entry. */
  async updateTmEntry(
    entryId: string,
    update: { targetText?: string; enabled?: boolean },
  ): Promise<boolean> {
    const body: Record<string, unknown> = {};
    if (update.targetText !== undefined) body.target_text = update.targetText;
    if (update.enabled !== undefined) body.enabled = update.enabled;
    if (Object.keys(body).length === 0) {
      throw new ValidationError(
        "Provide at least one of targetText or enabled",
      );
    }
    const data = await this.request("PATCH", `/master-tm/entries/${entryId}`, {
      json: body,
    });
    return (data.success as boolean) ?? false;
  }

  /** Delete a translation memory entry. */
  async deleteTmEntry(entryId: string): Promise<boolean> {
    const data = await this.request("DELETE", `/master-tm/entries/${entryId}`);
    return (data.success as boolean) ?? false;
  }

  /** Get translation memory statistics. */
  async getTmStats(): Promise<TMStats> {
    const data = await this.request("GET", "/master-tm/stats");
    return parseTMStats(data);
  }

  // -------------------------------------------------------------------
  // Style Guides & Brand Voice
  // -------------------------------------------------------------------

  /** Get all style guides. */
  async getStyleGuides(): Promise<StyleGuide[]> {
    const data = await this.request("GET", "/style-guide");
    return ((data.guides as any[]) ?? []).map(parseStyleGuide);
  }

  /** Create a new style guide. */
  async createStyleGuide(
    title: string,
    content: string,
    options?: { isEnabled?: boolean },
  ): Promise<StyleGuide> {
    const data = await this.request("POST", "/style-guide", {
      json: {
        title,
        content,
        is_enabled: options?.isEnabled ?? true,
      },
    });
    return parseStyleGuide(data);
  }

  /** Update an existing style guide. */
  async updateStyleGuide(
    guideId: string,
    update: { title?: string; content?: string; isEnabled?: boolean },
  ): Promise<StyleGuide> {
    const body: Record<string, unknown> = {};
    if (update.title !== undefined) body.title = update.title;
    if (update.content !== undefined) body.content = update.content;
    if (update.isEnabled !== undefined) body.is_enabled = update.isEnabled;

    const data = await this.request("PUT", `/style-guide/${guideId}`, {
      json: body,
    });
    return parseStyleGuide(data);
  }

  /** Delete a style guide. */
  async deleteStyleGuide(guideId: string): Promise<boolean> {
    const data = await this.request("DELETE", `/style-guide/${guideId}`);
    return (data.success as boolean) ?? false;
  }

  /** Get the brand voice prompt. */
  async getBrandVoice(): Promise<BrandVoice> {
    const data = await this.request("GET", "/style-guide/prompt");
    return parseBrandVoice(data);
  }

  /** Get the combined prompt (brand voice + style guides). */
  async getCombinedPrompt(): Promise<Record<string, unknown>> {
    return this.request("GET", "/style-guide/combined");
  }

  // -------------------------------------------------------------------
  // Feedback
  // -------------------------------------------------------------------

  /** Submit feedback on a translation. */
  async submitFeedback(feedback: {
    source?: string;
    result?: string;
    language?: string;
    feedback?: string;
    approved?: boolean;
  }): Promise<Record<string, unknown>> {
    return this.request("POST", "/text/feedback", { json: feedback });
  }

  // -------------------------------------------------------------------
  // Audio / video / subtitles
  // -------------------------------------------------------------------

  private async formFile(
    file: FileInput,
    field: string,
    fallbackName: string,
  ): Promise<FormData> {
    const resolved = await resolveFile(file);
    const filename = resolved.filename || fallbackName;
    const form = new FormData();
    form.append(
      field,
      new Blob([resolved.data.buffer as ArrayBuffer], { type: resolved.contentType }),
      filename,
    );
    return form;
  }

  async transcribeAudio(
    file: FileInput,
    options?: { sourceLanguageCode?: string; keepBackgroundMusic?: boolean },
  ): Promise<AudioTranscript> {
    const form = await this.formFile(file, "file", "audio.wav");
    if (options?.sourceLanguageCode) {
      form.append("source_language_code", options.sourceLanguageCode);
    }
    form.append(
      "keep_background_music",
      String(options?.keepBackgroundMusic ?? false),
    );
    const data = await this.request("POST", "/audio/transcribe", {
      formData: form,
      timeout: 300_000,
    });
    return parseAudioTranscript(data);
  }

  async parseAudioScript(file: FileInput): Promise<AudioTranscript> {
    const form = await this.formFile(file, "file", "script.txt");
    const data = await this.request("POST", "/audio/script", {
      formData: form,
      timeout: 300_000,
    });
    return parseAudioTranscript(data);
  }

  async registerVideo(file: FileInput): Promise<string> {
    const form = await this.formFile(file, "file", "video.mp4");
    const data = await this.request("POST", "/audio/video/register", {
      formData: form,
      timeout: 300_000,
    });
    return String(data.video_id ?? "");
  }

  async listVoices(options?: { languageCode?: string }): Promise<AudioVoices> {
    const params: Record<string, string> = {};
    if (options?.languageCode) params.language_code = options.languageCode;
    const data = await this.request("GET", "/audio/voices", {
      params: Object.keys(params).length ? params : undefined,
    });
    return parseAudioVoices(data);
  }

  async previewVoice(
    voiceId: string,
    options?: { languageCode?: string; text?: string },
  ): Promise<AudioPreview> {
    const json: Record<string, unknown> = { voice_id: voiceId };
    if (options?.languageCode) json.language_code = options.languageCode;
    if (options?.text) json.text = options.text;
    const data = await this.request("POST", "/audio/voices/preview", { json });
    return parseAudioPreview(data);
  }

  async getVoiceConsentScript(options?: {
    languageCode?: string;
  }): Promise<AudioConsentScript> {
    const params: Record<string, string> = {};
    if (options?.languageCode) params.language_code = options.languageCode;
    const data = await this.request("GET", "/audio/voices/consent-script", {
      params: Object.keys(params).length ? params : undefined,
    });
    return parseConsentScript(data);
  }

  async cloneVoice(
    reference: FileInput,
    consent: FileInput,
    options?: { languageCode?: string },
  ): Promise<ClonedVoice> {
    const ref = await resolveFile(reference);
    const con = await resolveFile(consent);
    const form = new FormData();
    form.append(
      "reference",
      new Blob([ref.data.buffer as ArrayBuffer], { type: ref.contentType }),
      ref.filename || "reference.wav",
    );
    form.append(
      "consent",
      new Blob([con.data.buffer as ArrayBuffer], { type: con.contentType }),
      con.filename || "consent.wav",
    );
    if (options?.languageCode) form.append("language_code", options.languageCode);
    const data = await this.request("POST", "/audio/voices/clone", {
      formData: form,
      timeout: 300_000,
    });
    return parseClonedVoice(data);
  }

  async createByoVoice(
    reference: FileInput,
    options?: {
      consent?: FileInput;
      name?: string;
      languageCode?: string;
      confirmOwnership?: boolean;
      clipReference?: boolean;
    },
  ): Promise<ClonedVoice> {
    const ref = await resolveFile(reference);
    const form = new FormData();
    form.append(
      "reference",
      new Blob([ref.data.buffer as ArrayBuffer], { type: ref.contentType }),
      ref.filename || "sample.wav",
    );
    if (options?.consent) {
      const con = await resolveFile(options.consent);
      form.append(
        "consent",
        new Blob([con.data.buffer as ArrayBuffer], { type: con.contentType }),
        con.filename || "consent.wav",
      );
    }
    if (options?.name) form.append("name", options.name);
    if (options?.languageCode) form.append("language_code", options.languageCode);
    form.append("confirm_ownership", String(options?.confirmOwnership ?? false));
    form.append("clip_reference", String(options?.clipReference ?? false));
    const data = await this.request("POST", "/audio/voices/byo", {
      formData: form,
      timeout: 300_000,
    });
    return parseClonedVoice(data);
  }

  async deleteSavedVoice(voiceId: string): Promise<Record<string, unknown>> {
    return this.request("DELETE", "/audio/voices/saved", {
      params: { voice_id: voiceId },
    });
  }

  async synthesizeAudio(
    options: SynthesizeAudioOptions,
  ): Promise<AudioSynthesis> {
    const json: Record<string, unknown> = {
      language: options.language,
      language_code: options.languageCode,
      voice_id: options.voiceId,
      segments: options.segments,
      keep_same_length: options.keepSameLength ?? false,
      keep_background_music: options.keepBackgroundMusic ?? false,
      source_duration_ms: options.sourceDurationMs ?? 0,
      tool: options.tool ?? "api",
    };
    if (options.stemId) json.stem_id = options.stemId;
    if (options.sourceTranscript) json.source_transcript = options.sourceTranscript;
    if (options.videoId) json.video_id = options.videoId;
    const data = await this.request("POST", "/audio/synthesize", {
      json,
      timeout: 300_000,
    });
    return parseAudioSynthesis(data);
  }

  async remuxVideo(
    videoId: string,
    audioBase64: string,
  ): Promise<RemuxedVideo> {
    const data = await this.request("POST", "/audio/remux-video", {
      json: { video_id: videoId, audio_base64: audioBase64 },
      timeout: 300_000,
    });
    return {
      videoBase64: String(data.video_base64 ?? ""),
      videoMimeType: String(data.video_mime_type ?? "video/mp4"),
    };
  }

  async parseSubtitle(file: FileInput): Promise<SubtitleParse> {
    const form = await this.formFile(file, "file", "subtitles.srt");
    const data = await this.request("POST", "/subtitle/parse", {
      formData: form,
      timeout: 300_000,
    });
    return parseSubtitleParse(data);
  }

  async localizeSubtitles(
    targetLanguageCodes: string[],
    options: LocalizeSubtitlesOptions = {},
  ): Promise<SubtitlePlayground> {
    const form = new FormData();
    form.append(
      "target_language_codes",
      JSON.stringify(targetLanguageCodes),
    );
    form.append("source_language_code", options.sourceLanguageCode ?? "en");
    form.append("context", options.context ?? "");
    if (options.formality) form.append("formality", options.formality);
    if (options.campaignIds) {
      form.append("campaign_ids", JSON.stringify(options.campaignIds));
    }
    if (options.subtitle) {
      const f = await resolveFile(options.subtitle);
      form.append(
        "subtitle",
        new Blob([f.data.buffer as ArrayBuffer], { type: f.contentType }),
        f.filename || "subtitles.srt",
      );
    }
    if (options.video) {
      const f = await resolveFile(options.video);
      form.append(
        "video",
        new Blob([f.data.buffer as ArrayBuffer], { type: f.contentType }),
        f.filename || "video.mp4",
      );
    }
    if (options.glossary) {
      const f = await resolveFile(options.glossary);
      form.append(
        "glossary",
        new Blob([f.data.buffer as ArrayBuffer], { type: f.contentType }),
        f.filename || "glossary.csv",
      );
    }
    const data = await this.request("POST", "/subtitle/playground", {
      formData: form,
      timeout: 300_000,
    });
    return parseSubtitlePlayground(data);
  }

  async uploadSubtitle(
    file: FileInput,
    options?: {
      autoLocalize?: boolean;
      targetLanguages?: string[];
      context?: string;
      glossary?: string;
      sourceLanguage?: string;
    },
  ): Promise<Record<string, unknown>> {
    const form = await this.formFile(file, "file", "subtitles.srt");
    const params: Record<string, string | number | boolean | string[]> = {
      auto_localize: options?.autoLocalize ?? false,
    };
    if (options?.targetLanguages) params.target_languages = options.targetLanguages;
    if (options?.context) params.context = options.context;
    if (options?.glossary) params.glossary = options.glossary;
    if (options?.sourceLanguage) params.source_language = options.sourceLanguage;
    return this.request("POST", "/subtitle/upload", {
      formData: form,
      params,
      timeout: 300_000,
    });
  }

  async listSubtitles(): Promise<Record<string, unknown>> {
    return this.request("GET", "/subtitle/list");
  }

  async localizeSubtitleFile(
    filePath: string,
    targetLanguages: string[],
    options?: { context?: string; glossary?: string },
  ): Promise<Record<string, unknown>> {
    const json: Record<string, unknown> = {
      file_path: filePath,
      target_languages: targetLanguages,
    };
    if (options?.context) json.context = options.context;
    if (options?.glossary) json.glossary = options.glossary;
    return this.request("POST", "/subtitle/localize", {
      json,
      timeout: 300_000,
    });
  }

  async getSubtitleDownloadUrl(filePath: string): Promise<string> {
    const data = await this.request("GET", "/subtitle/download-url", {
      params: { file_path: filePath },
    });
    return String(data.download_url ?? "");
  }

  async deleteSubtitle(filePath: string): Promise<Record<string, unknown>> {
    return this.request("DELETE", "/subtitle/delete", {
      params: { file_path: filePath },
    });
  }
}
