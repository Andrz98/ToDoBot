# TuttoFatto ToDo Bot

TuttoFatto helps you manage tasks directly from Telegram. Only authorized users can interact with the bot's commands.

## Features

- Create new tasks with interactive prompts
- Edit existing tasks through inline buttons
- List active tasks and inspect details
- Mark tasks as completed
- Delete specific tasks
- Clear all completed tasks after confirmation
- Change the bot's timezone setting
- Receive reminder notifications before a task is due

## Commands and Flows

- **/start** – Greets the user, checks authorization and shows the available commands.
- **/add** – Shows a button to begin creating a task. Follow the interactive prompts to provide the name, due date and reminder time.
- **/edit** – Displays current tasks as inline buttons. Select one to modify its fields.
- **/list** – Lists all active tasks. Selecting a task reveals more details.
- **/done** – Presents pending tasks. Choose one to mark it completed.
- **/delete** – Offers a list of tasks to remove. Pick a task to delete it.
- **/clear** – Sends a confirmation menu before removing every completed task.
- **/settimezone** – Allows changing the timezone via menu or argument.

Reminders are sent automatically at 72h, 48h, 24h, 7h, 3h and 10 minutes before each task's due date.
