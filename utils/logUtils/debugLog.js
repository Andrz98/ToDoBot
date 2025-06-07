export const debugLog = (...args) => {
  if (process.env.DEBUG === 'true') {
    console.log(...args)
  }
}
