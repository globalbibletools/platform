const pg = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env var missing");
}

let pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

const approvalsByLanguage = {};
const glossesByLanguage = {};

async function run() {
  const [glossEvents, approvalEvents] = await Promise.all([
    getGlossEvents(),
    getApprovalEvents(),
  ]);

  for (const e of glossEvents) {
    if (!glossesByLanguage[e.language_id]) {
      glossesByLanguage[e.language_id] = [];
    }
    glossesByLanguage[e.language_id].push(e);
  }

  for (const e of approvalEvents) {
    if (!approvalsByLanguage[e.language_id]) {
      approvalsByLanguage[e.language_id] = [];
    }
    approvalsByLanguage[e.language_id].push(e);
  }

  let failures = 0;
  let maxDelta = 0;

  const toUpdate = [];

  for (const languageId in approvalsByLanguage) {
    let glossIndex = 0;
    let approvalIndex = 0;

    const glossEvents = glossesByLanguage[languageId] ?? [];
    const approvalEvents = approvalsByLanguage[languageId] ?? [];

    while (
      glossIndex < glossEvents.length &&
      approvalIndex < approvalEvents.length
    ) {
      const glossEvent = glossEvents[glossIndex];
      const approvalEvent = approvalEvents[approvalIndex];

      // No gloss event exists to match with this approval event so we have to skip it.
      if (approvalEvent.created_at < glossEvent.updated_at) {
        console.log(
          `[${approvalEvent.id}] No match, skipping, approval: ${approvalEvent.created_at}, gloss: ${glossEvent.updated_at}`,
        );

        failures += 1;
        approvalIndex++;
        continue;
      }

      // The two are close enough
      if (approvalEvent.created_at - glossEvent.updated_at < 1200) {
        console.log(
          `[${approvalEvent.id}] Found match - language matches: ${approvalEvent.language_id === glossEvent.language_id}, timestamp delta: ${approvalEvent.created_at - glossEvent.updated_at}`,
        );
        glossIndex++;
        approvalIndex++;

        await updateApprovalEvents(approvalEvent.id, glossEvent.phrase_id);

        maxDelta = Math.max(
          maxDelta,
          approvalEvent.created_at - glossEvent.updated_at,
        );
        continue;
      }

      // Skip because it's not close enough
      glossIndex++;
    }
  }

  console.log(
    `${failures} Failures (${((100 * failures) / approvalEvents.length).toFixed(2)}%)`,
  );
  console.log(`Max delta: ${maxDelta}`);
}

async function getGlossEvents() {
  const result = await pool.query(`
      select * from (
        select updated_by, updated_at, state, phrase_id from gloss
        union select updated_by, updated_at, state, phrase_id from gloss_history
      ) as g
      join phrase on phrase.id = g.phrase_id
      where g.updated_at >= timestamp '2025-05-27 01:53:00'
      order by g.updated_at
    `);
  return result.rows;
}

async function getApprovalEvents() {
  const result = await pool.query(`
        select * from tracking_event e
        where not e.data ? 'phraseId'
        order by e.created_at
    `);
  return result.rows;
}

async function updateApprovalEvents(eventId, phraseId) {
  await pool.query(
    `
      update tracking_event
        set data = data || jsonb_build_object('phraseId', $2::text)
      where id = $1
    `,
    [eventId, phraseId],
  );
}

run()
  .then(async () => {
    await pool.end();
  })
  .catch(console.error);
