/**
 * Nativ Node.js/TypeScript SDK — AI-powered localization.
 *
 * @example
 * ```ts
 * import { Nativ } from "nativ-sdk";
 *
 * const client = new Nativ();  // reads NATIV_API_KEY from env
 * const result = await client.translate("Hello world", "French");
 * console.log(result.translatedText);
 * ```
 *
 * @packageDocumentation
 */

export { VERSION } from "./version.js";
export { Nativ } from "./client.js";
export type { NativOptions } from "./client.js";

export {
  NativError,
  AuthenticationError,
  InsufficientCreditsError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";

export type {
  Translation,
  TranslationMetadata,
  TMMatch,
  TMMatchDetail,
  TranslateOptions,
  TranslateBatchOptions,
  OCRResult,
  GeneratedImage,
  ImageMetadata,
  ImageResult,
  AffectedCountry,
  CulturalInspection,
  Language,
  TMEntry,
  TMEntryList,
  TMSearchMatch,
  TMStats,
  StyleGuide,
  BrandVoice,
  FileInput,
} from "./types.js";
