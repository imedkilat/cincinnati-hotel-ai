# Cincinnati Hotel AI Concierge

A proof-of-concept guest support assistant that connects a React chat interface to an Express API and n8n workflows. It uses a hotel's PDF guide as context and routes questions that need follow-up to an escalation workflow.

[Open the AI Studio project](https://ai.studio/apps/drive/1AlF4B9roOXVCqpvydEF6UST6VTYZDJgG)

## What it does

- Lets guests ask common questions through a chat interface with suggested prompts.
- Lets staff upload a hotel guide PDF. The backend extracts its text and includes it as context in requests sent to n8n.
- Tracks sessions, question topics, unanswered requests, and recent activity in an admin dashboard.
- Sends guest follow-up details to a separate n8n escalation webhook.

## Architecture

- **Frontend:** React, TypeScript, and Vite
- **Backend:** Node.js and Express
- **Document handling:** Multer and PDF text extraction
- **Automation:** n8n webhooks for answering and escalating questions

The n8n workflows are external to this repository. The backend keeps the uploaded PDF text and session metrics in memory, so they reset when the service restarts.

## Run locally

You need Node.js and access to the n8n workflows used by the app.

1. Start the backend:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

   Set the webhook URLs in `backend/.env` to your own n8n endpoints.

2. In a second terminal, configure the frontend API URL in the repository root:

   ```bash
   echo "VITE_API_BASE=http://localhost:4000" > .env.local
   npm install
   npm run dev
   ```

   Open the local URL printed by Vite.

## Current status and limitations

This is a working prototype. Before using it with real guests or exposing it publicly, protect the admin upload and stats endpoints with authentication, add persistent storage, and test the full flow with secured n8n credentials. The current backend keeps session data and the uploaded guide in memory, and the repository does not yet include an automated test suite.

Do not commit `.env` files or real webhook credentials. Use `backend/.env.example` as a template and keep deployment secrets in the hosting provider's environment settings.
