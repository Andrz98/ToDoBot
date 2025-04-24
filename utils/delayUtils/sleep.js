/**
 * Pausa la ejecución durante un tiempo dado.
 *
 * @param {number} ms – Milisegundos a esperar
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
