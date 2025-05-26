import { DateTime } from 'luxon'

/**
 * Formatea una fecha en español.
 *
 * @param {Date}   date      - Fecha a formatear
 * @param {string} timeZone  - Zona IANA (por defecto Europe/Madrid)
 * @returns {string}
 */
export const formatDateEs = (date, timeZone = 'Europe/Madrid') => {
  if (!date) {
    return '(sin fecha)'
  }

  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timeZone)
    .setLocale('es')
    .toLocaleString(DateTime.DATETIME_FULL)
}

/* Atajos opcionales */
export const formatDateEsMadrid = (d) => formatDateEs(d, 'Europe/Madrid')
export const formatDateEsBogota = (d) => formatDateEs(d, 'America/Bogota')
