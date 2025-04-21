/**
 * Formatea una fecha a español (ej.: "jueves, 24 de abril de 2025, 22:00")
 *
 * @param {Date}   date      - Fecha a formatear
 * @param {string} timeZone  - Zona IANA (por defecto Europe/Madrid)
 * @returns {string}
 */
export const formatDateEs = (date, timeZone = 'Europe/Madrid') =>
  new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone
  }).format(date)

/*  Envoltorio de atajos convenientes */
export const formatDateEsMadrid = (d) => formatDateEs(d, 'Europe/Madrid')
export const formatDateEsBogota = (d) => formatDateEs(d, 'America/Bogota')
