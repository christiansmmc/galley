import type { AppError } from "./types";

export function isAppError(e: unknown): e is AppError {
  return !!e && typeof e === "object" && "kind" in (e as object);
}

export function userMessage(e: unknown): string {
  if (!isAppError(e)) return String(e ?? "Erro desconhecido");
  switch (e.kind) {
    case "Auth": return "Token inválido ou expirado. Reautentique nas configurações.";
    case "RateLimited": return `Limite da API atingido até ${e.details.reset_at}. Tente novamente depois.`;
    case "Network": return "Sem conexão com o GitHub. Mostrando dados em cache.";
    case "NotFound": return "Recurso não encontrado.";
    case "Conflict": return "O diff mudou desde o rascunho.";
    case "SubmitFailed": return `Falha ao enviar review: ${e.details}`;
    case "Config": return `Erro de configuração: ${e.details}`;
    case "Cache": return `Erro de cache: ${e.details}`;
    case "Internal": return `Erro interno: ${e.details}`;
  }
}
