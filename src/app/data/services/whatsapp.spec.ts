import { APP_URL, normalizePhone, waLink, welcomeMessage } from './whatsapp';

describe('whatsapp', () => {
  describe('normalizePhone', () => {
    it('quita espacios, guiones, paréntesis y el signo +', () => {
      expect(normalizePhone('+52 55 (1234)-5678')).toBe('525512345678');
      expect(normalizePhone('52 55 1234 5678')).toBe('525512345678');
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
    it('incluye el nombre del paciente y el link de la app', () => {
      const message = welcomeMessage('Ana López');
      expect(message).toContain('Hola Ana López:');
      expect(message).toContain(APP_URL);
    });

    it('no rompe sin nombre', () => {
      expect(welcomeMessage(null)).toContain('Hola:');
      expect(welcomeMessage('   ')).toContain('Hola:');
    });

    it('nunca incluye la contraseña', () => {
      expect(welcomeMessage('Ana')).not.toContain('Player@');
    });
  });

  describe('waLink', () => {
    it('arma el enlace wa.me con el mensaje codificado', () => {
      const link = waLink('+52 55 1234 5678', 'Hola\nAna');
      expect(link).toBe('https://wa.me/525512345678?text=Hola%0AAna');
    });

    it('devuelve null si el teléfono no es válido', () => {
      expect(waLink('123', 'hola')).toBeNull();
      expect(waLink(null, 'hola')).toBeNull();
      expect(waLink(undefined, 'hola')).toBeNull();
    });
  });
});
