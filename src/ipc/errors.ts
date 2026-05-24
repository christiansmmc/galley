import type { AppError } from "./types";
import i18n from "../i18n";

export function isAppError(e: unknown): e is AppError {
  return !!e && typeof e === "object" && "kind" in (e as object);
}

export function userMessage(e: unknown): string {
  if (!isAppError(e)) return String(e ?? i18n.t("common.unknown_error"));
  switch (e.kind) {
    case "Auth": return i18n.t("errors.auth");
    case "RateLimited": return i18n.t("errors.rate_limited", { reset_at: e.details.reset_at });
    case "Network": return i18n.t("errors.network");
    case "NotFound": return i18n.t("errors.not_found");
    case "Conflict": return i18n.t("errors.conflict");
    case "SubmitFailed": return i18n.t("errors.submit_failed", { details: e.details });
    case "Config": return i18n.t("errors.config", { details: e.details });
    case "Cache": return i18n.t("errors.cache", { details: e.details });
    case "Internal": return i18n.t("errors.internal", { details: e.details });
  }
}
