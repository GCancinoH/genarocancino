import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  SEX_LABELS,
  ageFromDate,
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

  describe('ageFromDate', () => {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();

    /** Fecha de nacimiento de hace `anios` años, con mes/día dados. */
    function nacio(anios: number, mes: number, dia: number): string {
      return (
        `${anioActual - anios}-` +
        `${String(mes).padStart(2, '0')}-` +
        `${String(dia).padStart(2, '0')}`
      );
    }

    it('cuenta el cumpleaños recién en el día', () => {
      // El 1 de enero siempre ya pasó, sea cual sea la fecha de hoy, así que
      // esta aserción no caduca.
      expect(ageFromDate('2000-01-01')).toBe(anioActual - 2000);
    });

    it('no cuenta el cumpleaños antes del día', () => {
      // 31/diciembre solo ya cumplió si hoy es exactamente el 31/diciembre.
      const esperado =
        hoy.getMonth() === 11 && hoy.getDate() === 31 ? anioActual - 2000 : anioActual - 2000 - 1;
      expect(ageFromDate('2000-12-31')).toBe(esperado);
    });

    it('cuenta el cumpleaños el propio día', () => {
      const mes = hoy.getMonth() + 1;
      const dia = hoy.getDate();
      expect(ageFromDate(nacio(20, mes, dia))).toBe(20);
    });

    it('devuelve null sin fecha o con basura', () => {
      expect(ageFromDate('')).toBeNull();
      expect(ageFromDate(null)).toBeNull();
      expect(ageFromDate(undefined)).toBeNull();
      expect(ageFromDate('no-fecha')).toBeNull();
      expect(ageFromDate('01/01/2000')).toBeNull();
    });

    it('devuelve null con un mes o día imposibles', () => {
      expect(ageFromDate('2000-13-01')).toBeNull();
      expect(ageFromDate('2000-00-01')).toBeNull();
      expect(ageFromDate('2000-01-32')).toBeNull();
      expect(ageFromDate('2000-01-00')).toBeNull();
    });

    it('devuelve null si la fecha es futura', () => {
      expect(ageFromDate(`${anioActual + 5}-01-01`)).toBeNull();
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
