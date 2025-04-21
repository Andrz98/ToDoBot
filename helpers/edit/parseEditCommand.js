import { detectAndParseDate } from '../date/detectAndParseDate.js'

export const parseEditCommand = (raw) => {
  const content = raw.replace(/^\/edit\s*/i, '').trim()
  if (!content || content === ':') {
    return { isValid: false }
  }

  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const { date, index } = detectAndParseDate(lines)
  const withoutDate =
    index >= 0 ? lines.slice(0, index).join('\n').trim() : lines[0].trim()
  let parts = []
  if (withoutDate.startsWith('- ')) {
    parts = ['-'].concat(withoutDate.substring(2).split(' - '))
  } else {
    parts = withoutDate.split(' - ')
  }

  const oldName = parts[0]?.trim() || ''
  const newName = parts[1]?.trim() === '-' ? '' : parts[1]?.trim() || ''
  const newDescription = parts[2]?.trim() === '-' ? '' : parts[2]?.trim() || ''

  if (!oldName) {
    return { isValid: false }
  }

  return { isValid: true, oldName, newName, newDescription, date }
}
