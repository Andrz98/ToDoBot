# TuttoFatto ToDo Bot

Este repositorio implementa un bot de Telegram desarrollado en Node.js para administrar tareas y recordatorios de manera interactiva, orientado a usuarios autorizados. El bot expone un webhook mediante Express y emplea la librería Telegraf para procesar mensajes, comandos y botones inline. Toda la información se persiste en MongoDB a través de Mongoose, y los recordatorios se gestionan de forma automatizada con `node-cron`.

## Características principales

- Arquitectura MVC: el proyecto sigue una estructura modular basada en el patrón Modelo-Vista-Controlador, facilitando la mantenibilidad, escalabilidad y separación de responsabilidades.
- Gestión de tareas: creación, edición, listado, marcado como completadas, eliminación individual y limpieza de tareas finalizadas.
- Recordatorios automáticos: el bot revisa las tareas pendientes cada minuto y notifica a los usuarios autorizados 72h, 48h, 24h, 7h, 3h y 10 minutos antes del vencimiento.
- Flujos guiados por menús: los comandos interactivos muestran botones y force replies para solicitar nombre, descripción, fecha, etc.
- Control de zona horaria: cada usuario puede definir su zona horaria principal (`Europe/Madrid` o `America/Bogota`) para la correcta notificación de recordatorios.
- Sistema de autorización: solo los usuarios registrados en la colección `AuthorizedUser` pueden ejecutar comandos o interactuar con el bot.
- Persistencia de sesión: uso de `telegraf-session-local` para conservar el estado de los flujos conversacionales en disco.
- Pruebas unitarias: incluye tests con [Vitest](https://vitest.dev/) que validan la lógica de controladores y componentes principales.
- Disponibilidad continua: el bot está configurado para mantenerse siempre activo y responder de forma inmediata, mediante el uso de **UptimeRobot**. UptimeRobot monitoriza el endpoint del webhook, garantizando que el bot no entre en modo inactivo y los usuarios reciban notificaciones y respuestas en tiempo real sin demoras.

## Limitaciones actuales

En este momento, el bot está restringido para el registro de nuevos usuarios. Esta limitación responde a la capacidad de la base de datos utilizada en el entorno actual, que no permite una escalabilidad indefinida. Por tanto, únicamente los usuarios previamente autorizados en la colección `AuthorizedUser` pueden interactuar con los comandos y funcionalidades del bot.

## Estructura del proyecto

- `app.js`: punto de entrada, configuración de Express y webhook.
- `config/`: inicialización de Telegraf y conexión a MongoDB.
- `controllers/`: lógica de los comandos principales.
- `actions/` y `events/`: manejadores de callbacks y respuestas a eventos.
- `middlewares/`: control de acceso, rate limiting, sanitización, etc.
- `models/`: esquemas de Mongoose (`Task`, `AuthorizedUser`, ...).
- `services/`: planificador y ejecución de recordatorios automáticos.
- `helpers/` y `utils/`: funciones de apoyo para validaciones, formatos, etc.
- `test/`: pruebas unitarias con Vitest.

---
```
├── app.js
├── actions/
│ ├── addAction/
│ │ ├── confirmAction.js
│ │ └── startAddAction.js
│ └── completeAction/
│ └── completeActionHandler.js
├── config/
│ ├── MongoDB/
│ │ └── db.js
│ └── telegraf/
│ └── telegraf.js
├── controllers/
│ ├── taskControllers/
│ │ ├── addTask.js
│ │ └── listTask.js
│ └── timeZoneController/
│ └── setTimezone.js
├── middlewares/
│ ├── access/
│ │ └── isAuthorizedUser.js
│ ├── flowControl/
│ │ └── flowGuard.js
│ └── secure/
│ └── sanitizeInput.js
├── models/
│ ├── authorizedUser.js
│ └── task.js
├── services/
│ └── schedulers/
│ └── reminderScheduler.js
├── test/
│ └── unit/
│ ├── actions/
│ │ └── reminderAction/
│ │ └── saveReminderAction.test.js
│ └── controllers/
│ └── taskController/
│ └── addTask.test.js
├── utils/
│ ├── delayUtils/
│ │ └── sleep.js
│ └── logUtils/
│ └── debugLog.js
```
---
## Requisitos

- Node.js
- MongoDB accesible mediante la URI
- Token válido de bot de Telegram

## Consideraciones

Este bot ha sido diseñado para facilitar la gestión personal de tareas y recordatorios en Telegram con flujos interactivos, máxima privacidad, disponibilidad continua y control granular de acceso. El uso de UptimeRobot permite mantener la instancia operativa y reducir al mínimo los tiempos de espera para los usuarios.
