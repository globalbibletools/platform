-- Suggestion counts only track single-word phrases.
--
-- Bug: increment_suggestion upserted one lemma_form_suggestion row per word
-- of the glossed phrase. When two words of the phrase share a form (e.g. a
-- ketiv/qere pair glossed as one multi-word phrase), the rows share a
-- conflict target and Postgres rejects the statement with "ON CONFLICT DO
-- UPDATE command cannot affect row a second time" — approving such a gloss
-- always failed.
--
-- Fix: multi-word phrases no longer contribute to suggestion counts at
-- all. A gloss that spans several words does not map to any single form,
-- so it is not a useful form suggestion; and a single-word phrase has
-- exactly one form, so the increment can never see duplicate forms again.
-- The decrement paths get the same guard so counts stay symmetric when a
-- gloss is edited, unapproved, or its phrase deleted.
--
-- NOTE: existing counts still include contributions from multi-word
-- phrase glosses (the original backfill counted every word of every
-- approved phrase). Those entries are left as they are: the guarded
-- triggers never touch them again, so they simply age in place. If they
-- ever need to be dropped, a full recount restricted to single-word
-- phrases would do it.

begin;

create or replace function increment_suggestion()
returns trigger as
$$
begin
    if new.state = 'APPROVED'
        and (old is null or new.gloss <> old.gloss or old.state <> 'APPROVED')
        and (select count(*) from phrase_word where phrase_id = new.phrase_id) = 1
    then
        insert into lemma_form_suggestion as c (language_id, form_id, gloss, count)
        select
            ph.language_id,
            w.form_id,
            new.gloss,
            1
        from word as w
        join phrase_word as phw on phw.word_id = w.id
        join phrase as ph on phw.phrase_id = ph.id
        where ph.id = new.phrase_id
        on conflict (language_id, form_id, gloss) do update
            set count = c.count + 1;
    end if;

    return null;
end;
$$
language 'plpgsql';

create or replace function decrement_suggestion()
returns trigger as
$$
begin
    if old.state = 'APPROVED'
        and (new.gloss <> old.gloss or new.state <> 'APPROVED')
        and (select count(*) from phrase_word where phrase_id = old.phrase_id) = 1
    then
        update lemma_form_suggestion as c
        set
            count = c.count - 1
        where c.gloss = old.gloss
            and c.language_id = (select language_id from phrase where id = old.phrase_id)
            and c.form_id in (
                select w.form_id from word as w
                join phrase_word as phw on phw.word_id = w.id
                join phrase as ph on phw.phrase_id = ph.id
                where ph.id = old.phrase_id
            );
    end if;

    return null;
end;
$$
language 'plpgsql';

create or replace function decrement_suggestion_after_phrase_delete()
returns trigger as
$$
declare
    t_gloss text;
begin
    if new.deleted_at is not null
        and (select count(*) from phrase_word where phrase_id = new.id) = 1
    then
        -- Ignore phrases with unapproved glosses.
        select gloss.gloss into t_gloss
        from gloss
        where phrase_id = new.id
            and state = 'APPROVED';
        if not found then
            return null;
        end if;

        update lemma_form_suggestion as c
        set
            count = c.count - 1
        where c.gloss = t_gloss
            and c.language_id = new.language_id
            and c.form_id in (
                select w.form_id from word as w
                join phrase_word as phw on phw.word_id = w.id
                where phw.phrase_id = new.id
            );
    end if;

    return null;
end;
$$
language 'plpgsql';

commit;
