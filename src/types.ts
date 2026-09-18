// -----------------------------------------------------------------------
// Translation
// -----------------------------------------------------------------------

export interface TranslationMetadata {
  wordCount: number;
  cost: number;
}

export interface TMMatchDetail {
  tmId: string;
  score: number;
  matchType: string;
  sourceText: string;
  targetText: string;
  informationSource: string;
  sourceName?: string;
}

export interface TMMatch {
  score: number;
  matchType: string;
  sourceText?: string;
  targetText?: string;
  tmSource?: string;
  tmSourceName?: string;
  tmId?: string;
  topMatches: TMMatchDetail[];
}

export interface Translation {
  translatedText: string;
  metadata: TranslationMetadata;
  tmMatch?: TMMatch;
  rationale?: string;
  backtranslation?: string;
}

// -----------------------------------------------------------------------
// OCR
// -----------------------------------------------------------------------

export interface OCRResult {
  extractedText: string;
}

// -----------------------------------------------------------------------
// Image
// -----------------------------------------------------------------------

export interface GeneratedImage {
  imageBase64: string;
}

export interface ImageMetadata {
  cost: number;
  numImages: number;
}

export interface ImageResult {
  images: GeneratedImage[];
  metadata: ImageMetadata;
}

export interface AffectedCountry {
  country: string;
  issue: string;
  suggestion: string;
}

export interface CulturalInspection {
  verdict: string;
  affectedCountries: AffectedCountry[];
}

// -----------------------------------------------------------------------
// Languages
// -----------------------------------------------------------------------

export interface Language {
  id: number;
  language: string;
  languageCode: string;
  formality?: string;
  customStyle?: string;
}

// -----------------------------------------------------------------------
// Translation Memory
// -----------------------------------------------------------------------

export interface TMEntry {
  id: string;
  sourceLanguageCode: string;
  sourceText: string;
  targetLanguageCode: string;
  targetText: string;
  informationSource: string;
  enabled: boolean;
  priority: number;
  userId?: number;
  endUserId?: string;
  sourceName?: string;
  createdAt?: string;
  updatedAt?: string;
  matchScore?: number;
}

export interface TMEntryList {
  entries: TMEntry[];
  total: number;
  offset: number;
  limit: number;
}

export interface TMSearchMatch {
  tmId: string;
  score: number;
  matchType: string;
  sourceText: string;
  targetText: string;
  informationSource: string;
  sourceName?: string;
}

export interface TMStats {
  total: number;
  enabled: number;
  disabled: number;
  bySource: Record<string, Record<string, number>>;
}

// -----------------------------------------------------------------------
// Style Guides & Brand Voice
// -----------------------------------------------------------------------

export interface StyleGuide {
  id: string;
  title: string;
  content: string;
  isEnabled: boolean;
  displayOrder?: number;
  userId?: number;
}

export interface BrandVoice {
  prompt?: string;
  exists: boolean;
  cached?: boolean;
}

// -----------------------------------------------------------------------
// Translate options
// -----------------------------------------------------------------------

export interface TranslateOptions {
  targetLanguageCode?: string;
  sourceLanguage?: string;
  sourceLanguageCode?: string;
  context?: string;
  glossary?: string;
  formality?: string;
  maxCharacters?: number;
  includeTmInfo?: boolean;
  backtranslate?: boolean;
  includeRationale?: boolean;
}

export interface TranslateBatchOptions {
  targetLanguageCode?: string;
  sourceLanguage?: string;
  sourceLanguageCode?: string;
  context?: string;
  formality?: string;
}

// -----------------------------------------------------------------------
// File input for image endpoints
// -----------------------------------------------------------------------

export type FileInput =
  | string
  | Buffer
  | Uint8Array
  | Blob
  | { data: Buffer | Uint8Array; filename: string; contentType?: string };

// -----------------------------------------------------------------------
// Audio / video / subtitles
// -----------------------------------------------------------------------

export interface AudioSegment {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface AudioTranscript {
  transcript: string;
  durationMs: number;
  segments: AudioSegment[];
  provider: string;
  estimatedCreditCost: number;
  billedSeconds: number;
  detectedLanguage?: string;
  stemId?: string;
  bedMode?: string;
  videoId?: string;
  sourceVoiceAudioBase64?: string;
}

export interface AudioVoice {
  id: string;
  name: string;
  gender: string;
  locale: string;
  accentLabel: string;
  provider: string;
  category: string;
}

export interface AudioVoices {
  voices: AudioVoice[];
  provider: string;
}

export interface AudioPreview {
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  provider: string;
  voiceId: string;
}

export interface AudioConsentScript {
  locale: string;
  consentScript: string;
  referenceScript: string;
  minSeconds: number;
  maxSeconds: number;
  chirpCloneSupported: boolean;
}

export interface ClonedVoice {
  voiceId: string;
  locale: string;
  provider: string;
  consentScript?: string;
  name?: string;
  category?: string;
  minSeconds?: number;
  maxSeconds?: number;
}

export interface AudioSynthesizeMetadata {
  cost: number;
  billedSeconds: number;
  creditsPerSecond: number;
  audioCost: number;
  textCost: number;
  durationMs: number;
  sourceDurationMs: number;
  speakingRate: number;
  durationMatch: string;
  provider: string;
  voiceId: string;
  mixedWithBed: boolean;
  bedMode?: string;
}

export interface AudioSynthesis {
  audioBase64: string;
  mimeType: string;
  metadata: AudioSynthesizeMetadata;
  videoBase64?: string;
  videoMimeType?: string;
  voiceAudioBase64?: string;
  voiceVideoBase64?: string;
  bedAudioBase64?: string;
}

export interface RemuxedVideo {
  videoBase64: string;
  videoMimeType: string;
}

export interface SynthesizeAudioOptions {
  language: string;
  languageCode: string;
  voiceId: string;
  segments: Record<string, unknown>[];
  keepSameLength?: boolean;
  keepBackgroundMusic?: boolean;
  stemId?: string;
  sourceDurationMs?: number;
  sourceTranscript?: string;
  videoId?: string;
  tool?: string;
}

export interface SubtitleCue {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  begin: string;
  end: string;
}

export interface SubtitleParse {
  durationMs: number;
  cues: SubtitleCue[];
}

export interface SubtitlePlaygroundCue {
  original: string;
  translated: string;
  startMs: number;
  endMs: number;
  begin?: string;
  end?: string;
}

export interface SubtitlePlaygroundLanguage {
  languageCode: string;
  language: string;
  srtUtf8: string;
  cues: SubtitlePlaygroundCue[];
}

export interface SubtitlePlayground {
  durationMs: number;
  filename: string;
  sourceCues: Record<string, unknown>[];
  languages: SubtitlePlaygroundLanguage[];
  videoId?: string;
}

export interface LocalizeSubtitlesOptions {
  subtitle?: FileInput;
  video?: FileInput;
  glossary?: FileInput;
  sourceLanguageCode?: string;
  context?: string;
  formality?: string;
  campaignIds?: number[];
}

// -----------------------------------------------------------------------
// Parsing helpers (snake_case API → camelCase SDK)
// -----------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

export function parseTranslation(data: any): Translation {
  const metaRaw = data.metadata ?? {};
  const metadata: TranslationMetadata = {
    wordCount: metaRaw.word_count ?? 0,
    cost: metaRaw.cost ?? 0,
  };

  let tmMatch: TMMatch | undefined;
  const tmRaw = data.tm_match;
  if (tmRaw && (tmRaw.score ?? 0) > 0) {
    const topMatches: TMMatchDetail[] = (tmRaw.top_matches ?? []).map(
      (m: any) => ({
        tmId: m.tm_id ?? "",
        score: m.score ?? 0,
        matchType: m.match_type ?? "",
        sourceText: m.source_text ?? "",
        targetText: m.target_text ?? "",
        informationSource: m.information_source ?? "",
        sourceName: m.source_name,
      }),
    );
    tmMatch = {
      score: tmRaw.score ?? 0,
      matchType: tmRaw.match_type ?? "",
      sourceText: tmRaw.source_text,
      targetText: tmRaw.target_text,
      tmSource: tmRaw.tm_source,
      tmSourceName: tmRaw.tm_source_name,
      tmId: tmRaw.tm_id,
      topMatches,
    };
  }

  return {
    translatedText: data.translated_text ?? "",
    metadata,
    tmMatch,
    rationale: data.rationale,
    backtranslation: data.backtranslation,
  };
}

export function parseTMEntry(data: any): TMEntry {
  return {
    id: data.id ?? "",
    userId: data.user_id,
    endUserId: data.end_user_id,
    sourceLanguageCode: data.source_language_code ?? "",
    sourceText: data.source_text ?? "",
    targetLanguageCode: data.target_language_code ?? "",
    targetText: data.target_text ?? "",
    informationSource: data.information_source ?? "",
    sourceName: data.source_name,
    enabled: data.enabled ?? true,
    priority: data.priority ?? 50,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    matchScore: data.match_score,
  };
}

export function parseStyleGuide(data: any): StyleGuide {
  return {
    id: String(data.id ?? ""),
    title: data.title ?? "",
    content: data.content ?? "",
    isEnabled: data.is_enabled ?? true,
    displayOrder: data.display_order,
    userId: data.user_id,
  };
}

export function parseLanguages(data: any): Language[] {
  return (data.languages ?? []).map((lang: any) => ({
    id: lang.id,
    language: lang.language,
    languageCode: lang.language_code,
    formality: lang.formality,
    customStyle: lang.custom_style,
  }));
}

export function parseTMSearch(data: any): TMSearchMatch[] {
  return (data.matches ?? []).map((m: any) => ({
    tmId: m.tm_id ?? "",
    score: m.score ?? 0,
    matchType: m.match_type ?? "",
    sourceText: m.source_text ?? "",
    targetText: m.target_text ?? "",
    informationSource: m.information_source ?? "",
    sourceName: m.source_name,
  }));
}

export function parseTMList(
  data: any,
  offset: number,
  limit: number,
): TMEntryList {
  const entries = (data.entries ?? []).map(parseTMEntry);
  return {
    entries,
    total: data.total ?? entries.length,
    offset: data.offset ?? offset,
    limit: data.limit ?? limit,
  };
}

export function parseTMStats(data: any): TMStats {
  return {
    total: data.total ?? 0,
    enabled: data.enabled ?? 0,
    disabled: data.disabled ?? 0,
    bySource: data.by_source ?? {},
  };
}

export function parseBrandVoice(data: any): BrandVoice {
  return {
    prompt: data.prompt,
    exists: data.exists ?? false,
    cached: data.cached,
  };
}

export function parseImageResult(data: any): ImageResult {
  const images: GeneratedImage[] = (data.images ?? []).map((img: any) => ({
    imageBase64: img.image_base64,
  }));
  const metaRaw = data.metadata ?? {};
  return {
    images,
    metadata: {
      cost: metaRaw.cost ?? 0,
      numImages: metaRaw.num_images ?? 0,
    },
  };
}

export function parseInspection(data: any): CulturalInspection {
  const affectedCountries: AffectedCountry[] = (
    data.affected_countries ?? []
  ).map((c: any) => ({
    country: c.country,
    issue: c.issue,
    suggestion: c.suggestion,
  }));
  return {
    verdict: data.verdict ?? "SAFE",
    affectedCountries,
  };
}

export function parseAudioTranscript(data: any): AudioTranscript {
  return {
    transcript: data.transcript ?? "",
    durationMs: data.duration_ms ?? 0,
    segments: (data.segments ?? []).map((s: any) => ({
      id: String(s.id ?? ""),
      text: s.text ?? "",
      startMs: s.start_ms ?? 0,
      endMs: s.end_ms ?? 0,
    })),
    provider: data.provider ?? "",
    estimatedCreditCost: data.estimated_credit_cost ?? 0,
    billedSeconds: data.billed_seconds ?? 0,
    detectedLanguage: data.detected_language,
    stemId: data.stem_id,
    bedMode: data.bed_mode,
    videoId: data.video_id,
    sourceVoiceAudioBase64: data.source_voice_audio_base64,
  };
}

export function parseAudioVoices(data: any): AudioVoices {
  return {
    provider: data.provider ?? "",
    voices: (data.voices ?? []).map((v: any) => ({
      id: v.id ?? "",
      name: v.name ?? "",
      gender: v.gender ?? "",
      locale: v.locale ?? "",
      accentLabel: v.accent_label ?? "",
      provider: v.provider ?? "",
      category: v.category ?? "preset",
    })),
  };
}

export function parseAudioPreview(data: any): AudioPreview {
  return {
    audioBase64: data.audio_base64 ?? "",
    mimeType: data.mime_type ?? "audio/wav",
    durationMs: data.duration_ms ?? 0,
    provider: data.provider ?? "",
    voiceId: data.voice_id ?? "",
  };
}

export function parseConsentScript(data: any): AudioConsentScript {
  return {
    locale: data.locale ?? "",
    consentScript: data.consent_script ?? "",
    referenceScript: data.reference_script ?? "",
    minSeconds: data.min_seconds ?? 4,
    maxSeconds: data.max_seconds ?? 15,
    chirpCloneSupported: data.chirp_clone_supported ?? true,
  };
}

export function parseClonedVoice(data: any): ClonedVoice {
  return {
    voiceId: data.voice_id ?? "",
    locale: data.locale ?? "",
    provider: data.provider ?? "",
    consentScript: data.consent_script,
    name: data.name,
    category: data.category,
    minSeconds: data.min_seconds,
    maxSeconds: data.max_seconds,
  };
}

export function parseAudioSynthesis(data: any): AudioSynthesis {
  const meta = data.metadata ?? {};
  return {
    audioBase64: data.audio_base64 ?? "",
    mimeType: data.mime_type ?? "audio/wav",
    metadata: {
      cost: meta.cost ?? 0,
      billedSeconds: meta.billed_seconds ?? 0,
      creditsPerSecond: meta.credits_per_second ?? 0,
      audioCost: meta.audio_cost ?? 0,
      textCost: meta.text_cost ?? 0,
      durationMs: meta.duration_ms ?? 0,
      sourceDurationMs: meta.source_duration_ms ?? 0,
      speakingRate: meta.speaking_rate ?? 0,
      durationMatch: meta.duration_match ?? "",
      provider: meta.provider ?? "",
      voiceId: meta.voice_id ?? "",
      mixedWithBed: meta.mixed_with_bed ?? false,
      bedMode: meta.bed_mode,
    },
    videoBase64: data.video_base64,
    videoMimeType: data.video_mime_type,
    voiceAudioBase64: data.voice_audio_base64,
    voiceVideoBase64: data.voice_video_base64,
    bedAudioBase64: data.bed_audio_base64,
  };
}

export function parseSubtitleParse(data: any): SubtitleParse {
  return {
    durationMs: data.duration_ms ?? 0,
    cues: (data.cues ?? []).map((c: any) => ({
      id: String(c.id ?? ""),
      text: c.text ?? "",
      startMs: c.start_ms ?? 0,
      endMs: c.end_ms ?? 0,
      begin: c.begin ?? "",
      end: c.end ?? "",
    })),
  };
}

export function parseSubtitlePlayground(data: any): SubtitlePlayground {
  return {
    durationMs: data.duration_ms ?? 0,
    filename: data.filename ?? "",
    sourceCues: data.source_cues ?? [],
    videoId: data.video_id,
    languages: (data.languages ?? []).map((lang: any) => ({
      languageCode: lang.language_code ?? "",
      language: lang.language ?? "",
      srtUtf8: lang.srt_utf8 ?? "",
      cues: (lang.cues ?? []).map((c: any) => ({
        original: c.original ?? "",
        translated: c.translated ?? "",
        startMs: c.start_ms ?? 0,
        endMs: c.end_ms ?? 0,
        begin: c.begin,
        end: c.end,
      })),
    })),
  };
}
