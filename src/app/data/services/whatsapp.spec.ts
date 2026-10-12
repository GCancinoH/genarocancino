import { APP_URL, normalizePhone, waLink, welcomeMessage } from './whatsapp';

describe('whatsapp', () => {
  describe('normalizePhone', () => {
    it('deja solo dígitos: quita +, espacios, guiones y paréntesis', () => {
      expect(normalizePhone('+52 55 (1234)-5678')).toBe('525512345678');
      expect(normalizePhone('52 55 1234 5678')).toBe('525512345678');
      // WhatsApp Web no admite el '+'
      expect(normalizePhone('+5215512345678')).not.toContain('+');
    });

    it('rechaza números demasiado cortos, vacíos o nulos', () => {
      expect(normalizePhone('')).toBeNull();
      expect(normalizePhone('   ')).toBeNull();
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone(undefined)).toBeNull();
      expect(normalizePhone('55 1234')).toBeNull(); // 7 dígitos
      expect(normalizePhone('abc')).toBeNull();
    });
  });

  describe('welcomeMessage', () => {
    it('sustituye [nombre] por el nombre del paciente', () => {
      const message = welcomeMessage('Ana López');
      expect(message).toContain('Protocolo *ASCENSO*, Ana López');
      expect(message).not.toContain('[nombre]');
    });

    it('sustituye [link] por la URL de la app', () => {
      const message = welcomeMessage('Ana');
      expect(message).toContain(`link para entrar a tu cuenta es ${APP_URL}`);
      expect(message).not.toContain('[link]');
    });

    it('conserva la estructura del mensaje', () => {
      const message = welcomeMessage('Ana');
      expect(message).toContain('Las credenciales las encontrarás en tu correo electrónico.');
      expect(message).toContain('Estamos en contacto.');
      expect(message).toContain('¡Un fuerte abrazo!');
    });

    it('no rompe sin nombre', () => {
      expect(welcomeMessage(null)).toContain('Protocolo *ASCENSO*, Paciente');
      expect(welcomeMessage('   ')).toContain('Protocolo *ASCENSO*, Paciente');
      expect(welcomeMessage(null)).not.toContain('[nombre]');
    });

    it('nunca incluye la contraseña', () => {
      expect(welcomeMessage('Ana')).not.toContain('Player@');
      expect(welcomeMessage('Ana')).not.toMatch(/contraseña\s*:/i);
    });
  });

  describe('waLink', () => {
    it('usa web.whatsapp.com con el teléfono sin +', () => {
      const link = waLink('+52 55 1234 5678', 'Hola');
      expect(link).toBe('https://web.whatsapp.com/send?phone=525512345678&text=Hola');
    });

    it('codifica espacios, saltos de línea y acentos', () => {
      const link = waLink('525512345678', 'Hola\nAna')!;
      expect(link).toContain('text=Hola%0AAna');
      expect(link).not.toContain(' ');
      expect(link).not.toContain('\n');
    });

    it('el mensaje completo se puede decodificar de vuelta', () => {
      const message = welcomeMessage('Ana López');
      const link = waLink('+52 55 1234 5678', message)!;
      const encoded = link.split('&text=')[1];
      expect(decodeURIComponent(encoded)).toBe(message);
    });

    it('deja la coma literal, igual que la plantilla de referencia', () => {
      const link = waLink('525512345678', welcomeMessage('Ana'))!;
      // La coma va tal cual; el espacio de después sí se codifica.
      expect(link).toContain('*ASCENSO*,%20Ana');
      expect(link).not.toContain('%2C');
    });

    it('devuelve null si el teléfono no es válido', () => {
      expect(waLink('123', 'hola')).toBeNull();
      expect(waLink(null, 'hola')).toBeNull();
      expect(waLink(undefined, 'hola')).toBeNull();
    });
  });
});
