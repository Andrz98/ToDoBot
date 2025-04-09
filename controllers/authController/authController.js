import { AuthorizedUser } from '../../models/authorizedUser.js'

export const handleUserAuth = async (userId, username) => {
  try {
    const user = await AuthorizedUser.findOne({ userId })

    if (!user) {
      const newUser = new AuthorizedUser({ userId, username })
      await newUser.save()
      return {
        status: 'new',
        message: `Bienvenid@ ${username}. Tu cuenta ha sido registrada. Preparate para cumplir tus objetivos, no te falles a ti mism@, ánimo y disfruta de tu proceso.`
      }
    }

    // si el usuario ya existía, actualizamos su username por seguridad
    user.username = username
    await user.save()

    return {
      status: 'existing',
      message: `Bienvenid@ de nuevo ${username}. Te echamos de menos🤗`
    }
  } catch (error) {
    console.error('Error en la autenticación del usuario:', error)
    return {
      status: 'error',
      message: 'Ocurrió un error al procesar la autenticación.'
    }
  }
}
