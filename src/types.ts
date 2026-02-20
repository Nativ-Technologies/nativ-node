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
