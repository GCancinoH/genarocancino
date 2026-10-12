/**
 * Utilidades de WhatsApp.
 *
 * El enlace `https://wa.me/<numero>?text=<mensaje>` abre WhatsApp con el
 * chat listo y el mensaje precargado. No necesita backend, API key ni
 * costo: el nutriólogo le da click y envía.
 */

/** URL base de la app (Firebase Hosting del proyecto `gc-nutrition`). */
export const APP_URL = 'https://gc-nutrition.web.app';

/**
 * Normaliza un teléfono al formato que espera `wa.me`: solo dígitos, sin
 * '+' ni espacios (ej. `5215512345678`).
 *
 * OJO con el código de país: `wa.me` NO lo infiere. Si el número capturado
 * es local (`55 1234 5678`) el chat no se resuelve, así que conviene
 * capturarlo con su lada internacional (`+52 55 1234 5678`).
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  // Menos de 8 dígitos no puede ser un número internacional completo.
  return digits.length >= 8 ? digits : null;
}

/** Mensaje de bienvenida, listo para codificar en la URL. */
export function welcomeMessage(displayName: string | null | undefined): string {
  const name = (displayName ?? '').trim();
  return [
    name ? `Hola ${name}:` : 'Hola:',
    '',
    'Te damos la bienvenida al protocolo de nutrición.',
    '',
    'Ingresa con el correo que te enviamos:',
    APP_URL,
  ].join('\n');
}

/**
 * Arma el enlace `wa.me` con el mensaje precargado.
 * Devuelve null si el teléfono no es válido.
 */
export function waLink(
  phone: string | null | undefined,
  message: string
): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
