/** Business-rule error: message is safe to show to users. */
export class AppError extends Error {
  code: string;
  constructor(message: string, code = "app_error") {
    super(message);
    this.code = code;
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "Anda tidak memiliki izin untuk tindakan ini.") {
    super(message, "forbidden");
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Data tidak ditemukan.") {
    super(message, "not_found");
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof AppError) return e.message;
  const err = e as { code?: string; message?: string; constraint?: string };
  if (err?.code === "42501") return "Anda tidak memiliki izin untuk tindakan ini. / Permission denied.";
  if (err?.code === "23505") return "Data sudah ada (duplikat). / This value already exists.";
  if (err?.code === "23514") return `Validasi gagal: ${err.constraint ?? "constraint"}. / Validation failed.`;
  if (err?.code === "23503") return "Data masih digunakan oleh data lain. / Record is referenced by other data.";
  console.error(e);
  return "Terjadi kesalahan. Silakan coba lagi. / Something went wrong.";
}
