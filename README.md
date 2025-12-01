# Cincinnati Hotel AI Assistant

Live demo

- Frontend: https://cincinnati.imedkilat.me
- Backend API: https://cincinnati-hotel-ai.onrender.com

---

## What this is

An AI-powered assistant for **Cincinnati Hotel** with two views:

- **Guest chat (public)**

  - Guests can ask questions about the hotel.
  - The bot answers **only** from the uploaded hotel PDF.
  - Greetings like “hi/hello/thanks” are handled conversationally.
  - If the question cannot be answered from the PDF, the bot offers a contact form.

- **Admin panel (private)**
  - Upload or replace the hotel PDF used as the knowledge base.
  - See chat activity and topics.
  - See recent sessions and unanswered questions.

All AI and email logic runs through n8n workflows.

---

## Tech stack

- **Frontend**: React + Vite

  - Deployed on Hostinger at `https://cincinnati.imedkilat.me`

- **Backend**: Node + Express

  - Deployed on Render at `https://cincinnati-hotel-ai.onrender.com`

- **Automations**: n8n
  - Workflow `hotel-chat`
  - Workflow `hotel-escalate`

---

## Backend endpoints

- `POST /api/chat/message`

  - Called by the guest chat.
  - Forwards `sessionId`, `message` and hotel PDF text to `hotel-chat` in n8n.
  - Expects JSON from n8n:

    ```json
    {
      "answer": "text to show the guest",
      "topic": "Rooms | Restaurant | Facilities | Location | Policies | General",
      "canAnswer": true
    }
    ```

- `POST /api/chat/escalate`

  - Called when the bot cannot answer and the guest submits the contact form.
  - Forwards `sessionId`, `question`, `conversation`, `name`, `email`, `phone` to `hotel-escalate` in n8n.
  - `hotel-escalate` sends an email to the hotel with guest details and the conversation.

- `POST /api/admin/pdf`

  - Accepts a single PDF upload from the Admin panel.
  - Extracts text and stores it as the hotel knowledge base used for chat.

- `GET /api/admin/stats`
  - Returns:
    - `totalSessions`
    - `topics` with counts
    - recent sessions and unanswered questions
    - current PDF metadata and last updated time

---

## How the PDF and chatbot work together

1. **Admin uploads the hotel PDF**

   - In the Admin panel, staff uploads a hotel information PDF.
   - Frontend sends it to `POST /api/admin/pdf`.
   - Backend:
     - Saves the file
     - Extracts the text with `pdf-parse`
     - Stores it in memory as `hotelText`
     - Exposes metadata via `GET /api/admin/stats`

2. **Guest asks a question**

   - Frontend calls `POST /api/chat/message` with the user message and session id.
   - Backend forwards to the `hotel-chat` webhook in n8n with:

     ```json
     {
       "sessionId": "...",
       "message": "guest question",
       "hotelInfo": "<full extracted PDF text>"
     }
     ```

   - In n8n the LLM:

     - Receives `hotelInfo` and `message`
     - Is instructed to answer **only** from the PDF text
     - Handles greetings like “hi” with a short friendly reply
     - Sets `canAnswer = false` only if the PDF truly does not contain the answer

   - n8n returns `{ answer, topic, canAnswer }` to the backend, which passes it back to the frontend and updates stats.

3. **If the question cannot be answered**

   - When `canAnswer = false`, the frontend:

     - Shows a polite “I don’t have that information right now” message
     - Shows a short contact form (name, email, phone)

   - On form submit, frontend calls `POST /api/chat/escalate`.
   - Backend forwards this to `hotel-escalate` in n8n.
   - `hotel-escalate` sends an email to the hotel (e.g. `idan@tauga.ai`) with:
     - Guest contact details
     - The question that could not be answered
     - A summary of the conversation so far

This matches the requirement: if the chatbot cannot find an answer in the document, it says so, then triggers an email with the conversation summary and question.

---

## Admin dashboard and statistics

The Admin view lets hotel staff:

- Upload/replace the hotel PDF used as the knowledge base
- See aggregated statistics:
  - Total number of chat sessions
  - Number of questions per topic (Rooms, Restaurant, Facilities, Location, Policies, General)
  - Recent sessions and unanswered questions
  - Current PDF file name and upload time

**Data flow for stats**

- Every time `POST /api/chat/message` is called, the backend:

  - Tracks sessions by `sessionId`
  - Increments counts by `topic`
  - Tracks when an answer had `canAnswer = false` (unanswered)

- The Admin panel calls `GET /api/admin/stats` to render:
  - Total sessions
  - Topic distribution
  - A list of recent sessions with their unanswered questions
  - Current PDF metadata

---

## Local development

### Backend

```bash
cd backend
npm install
npm start
Backend runs on http://localhost:4000.

Required env variables (in backend/.env):

env
Copy code
N8N_WEBHOOK_URL=https://imedkilat.onrender.com/webhook/hotel-chat
N8N_ESCALATE_URL=https://imedkilat.onrender.com/webhook/hotel-escalate
Frontend
From the project root:

bash
Copy code
npm install
npm run dev
Vite dev server runs on http://localhost:3000.

It proxies /api/* requests to http://localhost:4000 during local development.

Production build:

bash
Copy code
npm run build
The build output in dist/ is what is deployed to Hostinger for https://cincinnati.imedkilat.me.
```
