import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  SEX_LABELS,
  calculateImc,
  classifyImc,
  formatDate,
  formatNumber,
} from './patient-labels';

describe('patient-labels', () => {
  describe('calculateImc', () => {
    it('devuelve el IMC con una decimal', () => {
      // 62 kg / 1.55 m² = 25.806...
      expect(calculateImc(62, 155)).toBe(25.8);
      expect(calculateImc(70, 175)).toBe(22.9);
    });

    it('devuelve null si falta el peso o la talla', () => {
      expect(calculateImc(0, 155)).toBeNull();
      expect(calculateImc(62, 0)).toBeNull();
      expect(calculateImc(null, 155)).toBeNull();
      expect(calculateImc(62, undefined)).toBeNull();
      expect(calculateImc(undefined, undefined)).toBeNull();
    });

    it('no devuelve NaN ni Infinity', () => {
      expect(calculateImc(-5, 155)).toBeNull();
      expect(calculateImc(62, -155)).toBeNull();
      expect(calculateImc(NaN, 155)).toBeNull();
      expect(calculateImc(62, Infinity)).toBeNull();
    });
  });

  describe('classifyImc', () => {
    it('aplica los umbrales de la OMS', () => {
      expect(classifyImc(17)).toBe('BAJO PESO');
      expect(classifyImc(18.4)).toBe('BAJO PESO');
      expect(classifyImc(18.5)).toBe('PESO NORMAL');
      expect(classifyImc(24.9)).toBe('PESO NORMAL');
      expect(classifyImc(25)).toBe('SOBREPESO');
      expect(classifyImc(29.9)).toBe('SOBREPESO');
      expect(classifyImc(30)).toBe('OBESIDAD');
      expect(classifyImc(41)).toBe('OBESIDAD');
    });

    it('devuelve null sin dato', () => {
      expect(classifyImc(null)).toBeNull();
      expect(classifyImc(undefined)).toBeNull();
    });
  });

  describe('formatDate', () => {
    it("convierte 'YYYY-MM-DD' a 'DD/MM/YYYY'", () => {
      expect(formatDate('2026-10-12')).toBe('12/10/2026');
      expect(formatDate('1990-01-05')).toBe('05/01/1990');
    });

    it('devuelve el valor tal cual si no tiene ese formato', () => {
      expect(formatDate('no-fecha')).toBe('no-fecha');
    });

    it("devuelve '—' sin fecha", () => {
      expect(formatDate('')).toBe('—');
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
    });
  });

  describe('formatNumber', () => {
    it('redondea a una decimal y acepta sufijo', () => {
      expect(formatNumber(24.56)).toBe('24.6');
      expect(formatNumber(75.5, ' %')).toBe('75.5 %');
      expect(formatNumber(62)).toBe('62');
    });

    it("devuelve '—' sin dato o con valores no finitos", () => {
      expect(formatNumber(null)).toBe('—');
      expect(formatNumber(undefined)).toBe('—');
      expect(formatNumber(NaN)).toBe('—');
      expect(formatNumber(Infinity)).toBe('—');
    });
  });

  describe('etiquetas', () => {
    it('cubren todos los valores del modelo', () => {
      // Si algún día se añade un valor al union type y se olvida la etiqueta,
      // esto revienta en el tipado.
      expect(Object.keys(GOAL_LABELS).length).toBe(6);
      expect(Object.keys(ACTIVITY_LABELS).length).toBe(5);
      expect(Object.keys(SEX_LABELS).length).toBe(3);
    });
  });
});
