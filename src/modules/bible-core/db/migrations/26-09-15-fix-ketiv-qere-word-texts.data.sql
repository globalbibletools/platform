-- Correct ketiv/qere pairs that are formatted incorrectly in the Hebrew text.
--
-- Convention: a ketiv/qere pair is stored as two word rows — the qere reading
-- wrapped in parentheses "(...)" and the ketiv reading wrapped in square
-- brackets "[...]" (e.g. Psa 9:12 words 1900901209/210: [עניים] (עֲנָוִֽים׃)).
-- Four verses deviate from this convention. This migration fixes the word
-- texts, inserts the missing rows (the split pair in Neh 5:7, and the lost
-- מְאֹד word in Psalm 21:1), and marks the glosses of every affected word as
-- UNAPPROVED so they can be reviewed again.
--
-- Affected verses (USFM verse numbers in parentheses where they differ):
--   Psalm 21:1   (USFM 21:2)  mangled ketiv/qere pair in the last two rows;
--                            the final מְאֹד word is restored as a new row
--   Psalm 26:2                qere row stored unpointed and unbracketed; a
--                            normal word wrongly wrapped in parentheses
--   Psalm 54:5   (USFM 54:7)  same two problems as Psalm 26:2
--   Neh 5:7                   both readings collapsed into one mangled row
--
-- NOTE: this migration lives in bible-core because it corrects word rows, but
-- it also updates glosses (translation module) — see the last statement.

begin;

--------------------------------------------------------------------------------
-- Psalm 21:1 (verse 19021001)
--------------------------------------------------------------------------------
-- The verse ends with the ketiv/qere pair of יגיל followed by the adverb
-- מְאֹד, but the rows are mangled: 1902100110's text is the pointed מְאֹֽד׃
-- with an unpointed יגיל embedded in [[...]] noise, and 1902100111's text is
-- the pointed verb with a stray "*" and directional-formatting marks. Restore
-- the pair on the two existing rows and add מְאֹד back as a new final word
-- (inserted after 1902100111 as the next sequential id 1902100112 so that id
-- ordering preserves the word order within the verse):
--   1902100110: "מְאֹֽד׃[[יגילמְאֹֽד׃]]" -> "(יָּגֵיל)"   (qere)
--   1902100111: "יָּ֥גֶל*"                  -> "[יָּגֶל]"   (ketiv)
--   1902100112 (new)                      -> "מְאֹֽד׃"
--
-- Both pair rows are the verb גיל but are currently filed under the מְאֹד
-- lemma H3966; re-file them under גיל (H1523-007 is V-Qal-Imperf-3ms). The
-- new מְאֹד row takes over 1902100111's old form H3966-001 (Adv), which is
-- correct for it — note that 1902100111's existing adverb glosses ("greatly",
-- "muito", ...) belong on the new word and will need to move during review.

update word set text = '(יָּגֵיל)' where id = '1902100110';
update word set text = '[יָּגֶל]' where id = '1902100111';
update word set form_id = 'H1523-007' where id in ('1902100110', '1902100111');

insert into word (id, text, verse_id, form_id)
values ('1902100112', 'מְאֹֽד׃', '19021001', 'H3966-001');

--------------------------------------------------------------------------------
-- Psalm 26:2 (verse 19026002)
--------------------------------------------------------------------------------
-- The ketiv/qere pair of צרפה is rows 1902600204/205, but the qere row is
-- stored unpointed and without parentheses, and the following normal word
-- כִלְיוֹתַ֣י is wrongly wrapped in parentheses:
--   1902600204: "צרופה"          -> "(צְרוֹפָה)"  (qere, pointed)
--   1902600205: "[צָרְפָ֖ה]"     unchanged      (ketiv)
--   1902600206: "(כִלְיוֹתַ֣י)"   -> "כִלְיוֹתַ֣י"  (normal word, no parens)

update word set text = '(צְרוֹפָה)' where id = '1902600204';
update word set text = 'כִלְיוֹתַ֣י' where id = '1902600206';

--------------------------------------------------------------------------------
-- Psalm 54:5 (verse 19054005; USFM 54:7)
--------------------------------------------------------------------------------
-- Same problems as Psalm 26:2:
--   1905400501: "ישוב"         -> "(יָשׁוֹב)"  (qere, pointed)
--   1905400502: "[יָשִׁ֣יב]"    unchanged      (ketiv)
--   1905400503: "(הָ֭רַע)"      -> "הָ֭רַע"     (normal word, no parens)

update word set text = '(יָשׁוֹב)' where id = '1905400501';
update word set text = 'הָ֭רַע' where id = '1905400503';

--------------------------------------------------------------------------------
-- Nehemiah 5:7 (verse 16005007)
--------------------------------------------------------------------------------
-- Word 1600500715 has both readings collapsed into one mangled row
-- ("[[נֹשִׁ֑יםנשאים]]נֹשִׁ֑ים"). Split it into the qere row (same id) and a new
-- ketiv row inserted after it. The new id is the original id with a "-01"
-- suffix so that id ordering preserves the word order within the verse.

update word set text = '(נֹשְׁאִים)' where id = '1600500715';

insert into word (id, text, verse_id, form_id)
values ('1600500715-01', '[נֹשִׁים]', '16005007', 'H5383-006');

--------------------------------------------------------------------------------
-- Unapprove glosses of the affected words
--------------------------------------------------------------------------------
-- The text of every word changed above (and of the unchanged ketiv rows
-- paired with them — [צָרְפָ֖ה] and [יָשִׁ֣יב], whose glosses are reviewed
-- together with their pair) may no longer match its glosses, so mark the
-- glosses of all non-deleted phrases containing those words as UNAPPROVED for
-- review. The gloss_audit trigger records the previous state in gloss_history
-- automatically. updated_by is cleared since the change is not attributable to
-- a user; updated_at is bumped so the review queue reflects the change.

update gloss
set state = 'UNAPPROVED',
    updated_by = null,
    updated_at = now()
where state <> 'UNAPPROVED'
  and phrase_id in (
    select phrase_word.phrase_id
    from phrase_word
    join phrase on phrase.id = phrase_word.phrase_id
    where phrase.deleted_at is null
      and phrase_word.word_id in (
        -- Psalm 21:1 (1902100112 is new and has no phrases yet)
        '1902100110',
        '1902100111',
        '1902100112',
        -- Psalm 26:2 (1902600205 is the unchanged ketiv [צָרְפָ֖ה])
        '1902600204',
        '1902600205',
        '1902600206',
        -- Psalm 54:5 (1905400502 is the unchanged ketiv [יָשִׁ֣יב])
        '1905400501',
        '1905400502',
        '1905400503',
        -- Nehemiah 5:7 (the -01 row is new and has no phrases yet)
        '1600500715',
        '1600500715-01'
      )
  );

commit;

--------------------------------------------------------------------------------
-- Verification (run after applying):
--
-- select id, text, form_id from word
-- where verse_id in ('19021001', '19026002', '19054005', '16005007')
-- order by id;
--
-- select phrase_word.word_id, gloss.state, count(*)
-- from gloss
-- join phrase_word on phrase_word.phrase_id = gloss.phrase_id
-- join phrase on phrase.id = phrase_word.phrase_id
-- where phrase.deleted_at is null
--   and phrase_word.word_id in ('1902100110', '1902100111', '1902100112',
--       '1902600204', '1902600205', '1902600206', '1905400501', '1905400502',
--       '1905400503', '1600500715')
-- group by 1, 2;
--
-- NOTE: machine_gloss rows for 1902100111 are adverb glosses of מְאֹד that
-- now belong on the new word 1902100112; they will be stale until
-- regenerated.
