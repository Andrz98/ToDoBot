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
  return date.toLocaleString('es-ES', {
    timeZone,
    dateStyle: 'full', // jueves, 24 de abril de 2025
    timeStyle: 'short' // 22:00
  })
}

/* Atajos opcionales */
export const formatDateEsMadrid = (d) => formatDateEs(d, 'Europe/Madrid')
export const formatDateEsBogota = (d) => formatDateEs(d, 'America/Bogota')
