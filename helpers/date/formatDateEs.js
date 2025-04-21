import { DateTime } from 'luxon'

/**
 * Formatea una fecha en formato español de Madrid
 *
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada en español (Madrid)
 */
export const formatDateEsMadrid = (date) => {
  if (!date) {
    return '(sin fecha)'
  }

  try {
    const dt = DateTime.fromJSDate(date).setZone('Europe/Madrid')

    return dt.toLocaleString(
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      },
      { locale: 'es' }
    )
  } catch (error) {
    console.error('Error formateando fecha:', error)
    return date.toString()
  }
}
