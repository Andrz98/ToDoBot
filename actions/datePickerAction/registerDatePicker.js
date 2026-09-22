import {
  resolveMonth,
  resolveDay,
  resolveDateTime,
  buildCalendar,
  buildHourPicker,
  buildMinutePicker
} from '../../helpers/taskHelpers/date/datePicker.js'
import { getUserTimezone } from '../../helpers/taskHelpers/timezone/userTimezone/getUserTimezone.js'
import { safeAnswerCbQuery } from '../../utils/retryUtils/safeAnswerCbQuery.js'
import {
  renderInterface,
  expireCallback,
  isLiveInterface
} from '../../utils/telegramUtils/flowMessages.js'

const PAST_TEXT = 'Esa fecha ya pasó. Elige otra.'

/**
 * Registra el selector de fecha/hora para un flujo. Todas las pantallas se pintan
 * editando la interfaz del flujo: nunca se acumulan mensajes de calendario.
 *
 * @param {import('telegraf').Telegraf} bot
 * @param {string} prefix – prefijo de callback del flujo ('add' | 'edit')
 * @param {object} flow
 * @param {(ctx) => boolean} flow.isActive – el flujo sigue vivo en sesión
 * @param {(ctx, date: Date) => Promise<any>} flow.onPicked – fecha y hora elegidas
 * @param {(ctx) => Promise<any>} flow.onBack – volver al menú del flujo
 * @param {(ctx) => Promise<any>} flow.onTextFallback – escribir la fecha a mano
 */
export function registerDatePicker(
  bot,
  prefix,
  { isActive, onPicked, onBack, onTextFallback }
) {
  const guarded = (handler) => async (ctx) => {
    if (!isActive(ctx) || !isLiveInterface(ctx)) {
      return expireCallback(ctx)
    }
    const timezone = await getUserTimezone(ctx.from.id)
    return handler(ctx, timezone)
  }

  const show = async (ctx, { text, reply_markup }, toast) => {
    await safeAnswerCbQuery(ctx, toast)
    await renderInterface(ctx, text, { reply_markup })
  }

  const showCalendar = (ctx, timezone, yearMonth, toast) =>
    show(ctx, buildCalendar(prefix, resolveMonth(yearMonth, timezone), timezone), toast)

  bot.action(`${prefix}_noop`, (ctx) => safeAnswerCbQuery(ctx))

  bot.action(
    new RegExp(`^${prefix}_cal(?::(\\d{4}-\\d{2}))?$`),
    guarded((ctx, timezone) => showCalendar(ctx, timezone, ctx.match[1]))
  )

  bot.action(
    new RegExp(`^${prefix}_day:(\\d{4}-\\d{2}-\\d{2})$`),
    guarded((ctx, timezone) => {
      const day = resolveDay(ctx.match[1], timezone)
      if (!day) {
        return showCalendar(ctx, timezone, undefined, PAST_TEXT)
      }
      return show(ctx, buildHourPicker(prefix, day))
    })
  )

  bot.action(
    new RegExp(`^${prefix}_hour:(\\d{4}-\\d{2}-\\d{2})T(\\d{2})$`),
    guarded((ctx, timezone) => {
      const day = resolveDay(ctx.match[1], timezone)
      const hour = Number(ctx.match[2])
      if (!day || hour > 23) {
        return showCalendar(ctx, timezone, undefined, PAST_TEXT)
      }
      return show(ctx, buildMinutePicker(prefix, day, hour))
    })
  )

  bot.action(
    new RegExp(`^${prefix}_min:(\\d{4}-\\d{2}-\\d{2})T(\\d{2}):(\\d{2})$`),
    guarded(async (ctx, timezone) => {
      const [, isoDate, hour, minute] = ctx.match
      const date = resolveDateTime(isoDate, Number(hour), Number(minute), timezone)
      if (!date) {
        return showCalendar(ctx, timezone, undefined, PAST_TEXT)
      }
      await safeAnswerCbQuery(ctx)
      return onPicked(ctx, date)
    })
  )

  bot.action(
    `${prefix}_back`,
    guarded(async (ctx) => {
      await safeAnswerCbQuery(ctx)
      return onBack(ctx)
    })
  )

  bot.action(
    `${prefix}_datetext`,
    guarded(async (ctx) => {
      await safeAnswerCbQuery(ctx)
      return onTextFallback(ctx)
    })
  )
}
