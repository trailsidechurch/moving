# Planning Center → Vestaboard

Pulls the next 4 upcoming events from Planning Center (Calendar app) and
displays them on a Vestaboard. Runs on a daily schedule via GitHub Actions
(`.github/workflows/vestaboard-events.yml`), or manually with `node index.js`.

## Setup

### 1. Planning Center Personal Access Token

1. Go to https://api.planningcenteronline.com/oauth/applications while
   logged in as an admin.
2. Under "Personal Access Tokens", create a new token.
3. Note the **App ID** and **Secret** — you'll need both.

The token's user needs access to the Calendar app and the events you want
shown.

### 2. Vestaboard Read/Write API key

1. Go to https://web.vestaboard.com/ and open the board's settings.
2. Enable the **Read/Write API** for that board.
3. Copy the generated key.

### 3. Add repository secrets

In the repo's Settings → Secrets and variables → Actions, add:

- `PCO_APP_ID`
- `PCO_SECRET`
- `VESTABOARD_RW_KEY`

### 4. (Optional) Configuration

Environment variables, set in the workflow file or your shell:

- `EVENT_COUNT` — number of events to show (default `4`)
- `EVENT_TIMEZONE` — IANA timezone for displaying dates/times
  (default `America/New_York`)

## Running locally

```bash
cd integrations/pco-vestaboard
PCO_APP_ID=xxx PCO_SECRET=xxx VESTABOARD_RW_KEY=xxx node index.js
```

## How it works

1. Queries the Planning Center Calendar API
   (`/calendar/v2/event_instances?filter=future&order=starts_at`) for the
   next N event occurrences, including each event's name.
2. Formats them into a 6-row message: a title row, a blank row, then one
   line per event (`MON D H:MM  EVENT NAME`, truncated to the board's
   22-character width).
3. POSTs the message to the Vestaboard Read/Write API
   (`https://rw.vestaboard.com/`), which centers/formats the text on the
   physical board.
