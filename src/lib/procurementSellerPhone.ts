/**
 * Procurement seller phone: optional; when present, must be exactly 10 digits
 * (spaces/dashes/parentheses stripped; +91 / leading 0 stripped when applicable).
 */
export function parseOptionalProcurementPhone(
  raw: unknown
):
  | { ok: true; value: string | undefined }
  | { ok: false; message: string } {
  if (raw == null || raw === '') {
    return { ok: true, value: undefined };
  }
  const s = String(raw).trim();
  if (s === '') {
    return { ok: true, value: undefined };
  }
  let digits = s.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) {
    return {
      ok: false,
      message: 'Phone number must be exactly 10 digits.',
    };
  }
  return { ok: true, value: digits };
}
