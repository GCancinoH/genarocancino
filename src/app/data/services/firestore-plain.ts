import { Timestamp } from '@angular/fire/firestore';

/**
 * Conversión Firestore <-> IndexedDB.
 *
 * IndexedDB hace structured clone: guarda el objeto plano y pierde el
 * prototipo, así que un `Timestamp` se recuperaría sin `.toDate()`, y el
 * structured clone no acepta funciones. Por eso el espejo local guarda
 * timestamps como epoch millis (número), que sí sobrevive al round-trip.
 */

export function timestampToMillis(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  // Timestamp plano (ya viene del espejo)
  const maybe = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof maybe.toMillis === 'function') return maybe.toMillis();
  if (typeof maybe.seconds === 'number') return maybe.seconds * 1000;
  return undefined;
}

/** Normaliza cualquier snapshot/documento de Firestore a datos planos. */
export function toPlain<T>(value: T): T {
  return normalize(value) as T;
}

function normalize(value: unknown): unknown {
  if (value == null) return value;

  if (value instanceof Timestamp) return value.toMillis();

  if (value instanceof Date) return value.getTime();

  // Firestore rechaza `undefined` dentro de un array, así que se convierte a
  // null para no alterar los índices ni la longitud.
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : normalize(item)));

  if (typeof value === 'object') {
    // Snapshot de documento
    const maybeSnapshot = value as { data?: () => unknown; exists?: () => boolean };
    if (typeof maybeSnapshot.data === 'function' && typeof maybeSnapshot.exists === 'function') {
      const doc = value as { exists: () => boolean; data: () => unknown };
      return doc.exists() ? normalize(doc.data()) : null;
    }

    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item === 'function') continue; // metadata, etc.
      // `setDoc()` lanza "Unsupported field value: undefined" si la clave
      // existe con valor undefined, aunque el campo sea opcional en el tipo.
      // Se omite la clave entera para que Firestore solo vea los campos con
      // dato real.
      if (item === undefined) continue;
      out[key] = normalize(item);
    }
    return out;
  }

  return value;
}
