export const STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled'
})

export const STATUS_ICON = Object.freeze({
  pending: '⏳',
  confirmed: '✅',
  cancelled: '❌'
})

export const STATUS_LABEL = Object.freeze({
  pending: '⏳ Sin confirmar',
  confirmed: '✅ Confirmada',
  cancelled: '❌ Cancelada'
})
