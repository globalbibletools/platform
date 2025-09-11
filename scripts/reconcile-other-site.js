const { Pool } = require("pg");
const bookKeys = require("../src/data/book-keys.json");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function downloadBookData(bookCode) {
  const response = await fetch(
    `https://hebrewgreekbible.online/files/${bookCode}.js`,
  );
  const text = await response.text();
  const scope = {};
  eval(text.replace("var ", "scope."));
  return scope.hebrew ?? scope.greek;
}

async function fetchDatabaseBook(bookCode) {
  const result = await pool.query(
    `
      select verse.chapter, json_agg(verse.words order by verse.number) as verses from (
			select verse.*, json_agg(word.text order by word.id) as words from word
	        join verse on verse.id = word.verse_id
	        where verse.book_id = (select id from book where name = $1)
	        group by verse.id
		) verse
		group by verse.chapter
		order by verse.chapter
    `,
    [bookCode],
  );
  return result.rows;
}

async function testBook(bookCode) {
  const [theirData, ourData] = await Promise.all([
    downloadBookData(bookCode),
    fetchDatabaseBook(bookCode),
  ]);

  let count = 0;

  for (const chapterIndex in ourData) {
    const ourChapter = ourData[chapterIndex].verses;
    const theirChapter = theirData[chapterIndex];

    for (const verseIndex in ourChapter) {
      const ourVerse = ourChapter[verseIndex];
      const theirVerse = theirChapter[verseIndex];

      const reference = `${parseInt(chapterIndex) + 1}:${parseInt(verseIndex) + 1}`;

      if (ourVerse.length !== theirVerse.length) {
        console.log(
          reference,
          `ours: ${ourVerse.length}, theirs: ${theirVerse.length}`,
        );
        count++;
      }
    }
  }

  if (count !== 0) {
    console.log(bookCode, count, "mismatches");
  }

  return count;
}

async function run() {
  let total = 0;
  for (const bookCode of bookKeys) {
    total += await testBook(bookCode);
  }

  console.log("total", total);

  // await combineWords("2701102602");
}

run().then(async () => {
  await pool.end();
});

async function combineWords(wordId) {
  const verseId = wordId.slice(0, 8);
  const nextWordId =
    verseId + (parseInt(wordId.slice(8, 10)) + 1).toString().padStart(2, "0");
  const nextVerseWordId =
    wordId.slice(0, 5) +
    (parseInt(wordId.slice(5, 8)) + 1).toString().padStart(3, "0") +
    "00";

  await transaction(async (query) => {
    await query(
      `
            delete from phrase_word
            where phrase_word.word_id = (select max(id) from word where word.verse_id = $1)
                and exists (
                  select from phrase
                  where phrase.id = phrase_word.phrase_id
                    and phrase.language_id = (select id from language where code = 'eng')
                )
        `,
      [verseId],
    );

    await query(
      `
            update phrase_word set
                word_id = left(word_id, 8) || lpad((right(word_id, 2)::int + 1)::text, 2, '0')
            where phrase_word.word_id >= $1 and phrase_word.word_id < $2
                and exists (
                  select from phrase
                  where phrase.id = phrase_word.phrase_id
                    and phrase.language_id = (select id from language where code = 'eng')
                )
        `,
      [nextWordId, nextVerseWordId],
    );

    await query(
      `
        with new_gloss as (
            select phrase.language_id, array_agg(phrase.id) as phrase_ids, string_agg(gloss.gloss, ' ' order by phrase_word.word_id) as gloss from gloss
            join phrase on gloss.phrase_id = phrase.id
            join phrase_word on phrase_word.phrase_id = phrase.id
            where phrase_word.word_id IN ($1, $2)
            group by phrase.language_id
        )
        update gloss set
          gloss = new_gloss.gloss
          state = 'UNAPPROVED'
        from new_gloss
        where gloss.phrase_id = any(new_gloss.phrase_ids);
      `,
      [verseId, nextVerseId],
    );

    await query(
      `
            delete from phrase
            using (
                select min(phrase.id) as id, count(phrase.id) as count from phrase_word
                join phrase on phrase_word.phrase_id = phrase.id
                where phrase_word.word_id IN ($1, $2)
                group by phrase.language_id
            ) phrase_to_delete
            where phrase_to_delete.id = phrase.id
                and count > 1
        `,
      [verseId, nextVerseId],
    );

    await query(
      `
            insert into phrase_word (phrase_id, word_id)
            select phrase.id, $1 from phrase
            join phrase_word on phrase_word.phrase_id = phrase.id
            where phrase_word.word_id in ($1, $2)
            on conflict do nothing;
        `,
      [verseId, nextVerseId],
    );

    await query(
      `
            delete from phrase_word
            where word_id = $1
        `,
      [nextVerseId],
    );

    await query(
      `
          update word
              set text = (
                    select
                      replace(string_agg(w.text, ' ' order by w.id), '־ ', '־')
                    from word as w
                    where id in ($1, $2)
                )
            where word.id = $1;
          `,
      [verseId, nextVerseId],
    );

    await query(
      `
            delete from word
            where id = $1;
          `,
      [nextWordId],
    );
  });
}

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    fn(client.query.bind(client));

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
