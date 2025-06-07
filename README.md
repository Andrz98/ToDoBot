# TuttoFatto Bot

TuttoFatto is a Telegram bot that helps you manage tasks and sends scheduled reminders. It is built with Node.js, Express and Telegraf and uses MongoDB to persist data.

## Setup

1. Create a `.env` file including at least these variables:
   - `TELEGRAM_BOT_TOKEN` – token for your Telegram bot
   - `MONGO_URI` – MongoDB connection string
   - `WEBHOOK_DOMAIN` – public URL where the webhook will be served
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the bot:
   ```bash
   npm start
   # or during development
   npm run dev
   ```

## Scripts

- `npm run lint` – run ESLint with automatic fixes
- `npm run test` – execute the Vitest suite
- `npm run test:coverage` – run tests with coverage reporting

## Usage

Interact with the bot in Telegram using these commands:

```
/start        - show welcome message
/settimezone  - choose timezone
/add          - create a new task
/list         - list active tasks
/done         - mark a task as completed
/delete       - remove a task
/clear        - delete completed tasks
```

Example session:

```
/add
# Bot prompts you to press "Crear tarea" and then asks for the details
```
