/**
 * Utilidades de WhatsApp.
 *
 * Se usa `web.whatsapp.com/send` (WhatsApp Web) y no `wa.me`:
 * wa.me intenta abrir la app móvil, que no siempre está instalada en la
 * computadora del nutriólogo. WhatsApp Web funciona desde el navegador
 * con la sesión ya iniciada.
 *
 * El enlace solo abre el chat con el mensaje precargado: nada se envía
 * hasta que el nutriólogo pulsa enviar.
 */

/** URL base de la app (Firebase Hosting del proyecto `gc-nutrition`). */
export const APP_URL = 'https://gc-nutrition.web.app';

/**
 * Normaliza un teléfono a solo dígitos, sin '+' ni nada más.
 * Es exactamente lo que espera el parámetro `phone` de WhatsApp Web.
 *
 * OJO: WhatsApp Web NO infiere el código de país. Si el número capturado
 * es local (`55 1234 5678`) el chat no se resuelve, así que conviene
 * capturarlo con su lada internacional (`+52 55 1234 5678`).
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  // Menos de 8 dígitos no puede ser un número internacional completo.
  return digits.length >= 8 ? digits : null;
}

/**
 * Mensaje de bienvenida con las credenciales.
 *
 * La contraseña NUNCA viaja por aquí: el mensaje solo indica que las
 * credenciales llegaron por correo.
 */
export function welcomeMessage(displayName: string | null | undefined): string {
  const name = (displayName ?? '').trim() || 'Paciente';
  return `Bienvenido(a) al Protocolo *ASCENSO*, ${name}

El link para entrar a tu cuenta es ${APP_URL}
Las credenciales las encontrarás en tu correo electrónico.

Estamos en contacto.
¡Un fuerte abrazo!`;
}

/**
 * Arma el enlace de WhatsApp Web con el mensaje precargado.
 * Devuelve null si el teléfono no es válido.
 */
export function waLink(
  phone: string | null | undefined,
  message: string
): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  // `encodeURIComponent` deja escapada la coma (%2C); se devuelve literal
  // porque en la query de RFC 3986 la coma es válida sin escapar y así el
  // texto queda idéntico a la plantilla.
  const text = encodeURIComponent(message).replace(/%2C/g, ',');
  return `https://web.whatsapp.com/send?phone=${digits}&text=${text}`;
}
