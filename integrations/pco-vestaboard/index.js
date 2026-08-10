#!/usr/bin/env node
// Pulls the next N events from Planning Center (Calendar app) and pushes
// them to a Vestaboard via the Read/Write API.

const PCO_APP_ID = requireEnv('PCO_APP_ID');
const PCO_SECRET = requireEnv('PCO_SECRET');
const VESTABOARD_RW_KEY = requireEnv('VESTABOARD_RW_KEY');

const EVENT_COUNT = Number(process.env.EVENT_COUNT || 4);
const EVENT_TIMEZONE = process.env.EVENT_TIMEZONE || 'America/New_York';
const BOARD_COLUMNS = 22;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function fetchUpcomingEvents(count) {
  const url = new URL('https://api.planningcenteronline.com/calendar/v2/event_instances');
  url.searchParams.set('filter', 'future');
  url.searchParams.set('order', 'starts_at');
  url.searchParams.set('per_page', String(count));
  url.searchParams.set('include', 'event');

  const auth = Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64');
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`Planning Center request failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const eventsById = new Map((body.included || []).map((item) => [item.id, item]));

  return body.data.map((instance) => {
    const eventId = instance.relationships.event.data.id;
    const event = eventsById.get(eventId);
    return {
      name: event ? event.attributes.name : 'Untitled Event',
      startsAt: new Date(instance.attributes.starts_at),
      allDay: instance.attributes.all_day_event,
    };
  });
}

function formatEventLine({ name, startsAt, allDay }) {
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: EVENT_TIMEZONE,
  }).format(startsAt);

  const time = allDay
    ? ''
    : ' ' + new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: EVENT_TIMEZONE,
      }).format(startsAt);

  const prefix = `${date}${time} `.toUpperCase();
  return (prefix + name.toUpperCase()).slice(0, BOARD_COLUMNS);
}

function buildMessage(events) {
  const lines = ['UPCOMING EVENTS', '', ...events.map(formatEventLine)];
  return lines.join('\n');
}

async function pushToVestaboard(text) {
  const res = await fetch('https://rw.vestaboard.com/', {
    method: 'POST',
    headers: {
      'X-Vestaboard-Read-Write-Key': VESTABOARD_RW_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Vestaboard request failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const events = await fetchUpcomingEvents(EVENT_COUNT);

  if (events.length === 0) {
    console.log('No upcoming events found on Planning Center.');
    return;
  }

  const message = buildMessage(events);
  console.log('Pushing to Vestaboard:\n' + message);

  await pushToVestaboard(message);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
