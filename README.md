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

All AI / email logic runs through n8n workflows.

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
  - n8n sends an email to the hotel with guest details + conversation.

- `POST /api/admin/pdf`

  - Accepts a single PDF upload from the Admin panel.
  - Extracts text and stores it as the hotel knowledge base used for chat.

- `GET /api/admin/stats`
  - Returns:
    - `totalSessions`
    - `topics` with counts
    - recent sessions
    - current PDF metadata and last updated time

---

## Local development

### Backend

```bash
cd backend
npm install
npm start

Backend runs on http://localhost:4000.

Required env variables (in backend/.env):

N8N_WEBHOOK_URL=https://imedkilat.onrender.com/webhook/hotel-chat
N8N_ESCALATE_URL=https://imedkilat.onrender.com/webhook/hotel-escalate

Frontend

From the project root:

npm install
npm run dev


Vite dev server runs on http://localhost:3000 and proxies /api/* to http://localhost:4000.

Production build:

npm run build


Build output is written to dist/ and uploaded to Hostinger for https://cincinnati.imedkilat.me.

::contentReference[oaicite:0]{index=0}
```
