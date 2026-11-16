const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for use in HTML content or a double-quoted attribute. */
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
