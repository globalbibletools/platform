--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Debian 14.18-1.pgdg120+1)
-- Dumped by pg_dump version 14.18 (Debian 14.18-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: email_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.email_status AS ENUM (
    'UNVERIFIED',
    'VERIFIED',
    'BOUNCED',
    'COMPLAINED'
);


--
-- Name: gloss_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gloss_source AS ENUM (
    'USER',
    'IMPORT'
);


--
-- Name: gloss_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gloss_state AS ENUM (
    'APPROVED',
    'UNAPPROVED'
);


--
-- Name: job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_status AS ENUM (
    'pending',
    'in-progress',
    'complete',
    'error'
);


--
-- Name: language_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.language_role AS ENUM (
    'ADMIN',
    'TRANSLATOR',
    'VIEWER'
);


--
-- Name: resource_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resource_code AS ENUM (
    'BDB',
    'LSJ',
    'STRONGS'
);


--
-- Name: system_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.system_role AS ENUM (
    'ADMIN'
);


--
-- Name: text_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.text_direction AS ENUM (
    'ltr',
    'rtl'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'disabled'
);


--
-- Name: decrement_suggestion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_suggestion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.state = 'APPROVED' AND (NEW.gloss <> OLD.gloss OR NEW.state <> 'APPROVED') THEN
        UPDATE lemma_form_suggestion AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = OLD.gloss
            AND c.language_id = (SELECT language_id FROM phrase WHERE id = OLD.phrase_id)
            AND c.form_id IN (
                SELECT w.form_id FROM word AS w
                JOIN phrase_word AS phw ON phw.word_id = w.id
                JOIN phrase AS ph ON  phw.phrase_id = ph.id
                WHERE ph.id = OLD.phrase_id
            );
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: decrement_suggestion_after_phrase_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_suggestion_after_phrase_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    t_gloss TEXT;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        -- Ignore phrases with unapproved glosses.
        SELECT gloss.gloss INTO t_gloss
        FROM gloss
        WHERE phrase_id = NEW.id
            AND state = 'APPROVED';
        IF NOT FOUND THEN
            RETURN NULL;
        END IF;

        UPDATE lemma_form_suggestion AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = t_gloss
            AND c.language_id = NEW.language_id
            AND c.form_id IN (
                SELECT w.form_id FROM word AS w
                JOIN phrase_word AS phw ON phw.word_id = w.id
                WHERE phw.phrase_id = NEW.id
            );
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: generate_gloss_statistics_for_week(timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_gloss_statistics_for_week(d timestamp without time zone) RETURNS void
    LANGUAGE sql
    AS $_$
    INSERT INTO weekly_gloss_statistics (week, language_id, book_id, user_id, approved_count, unapproved_count)
    SELECT
        (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15')),
        log.language_id, log.book_id, log.updated_by,
        COUNT(*) FILTER (WHERE log.state = 'APPROVED'),
        COUNT(*) FILTER (WHERE log.state = 'UNAPPROVED')
    FROM (
        SELECT
            DISTINCT ON (log.phrase_id, phrase_word.word_id, verse.book_id)
            log.updated_by,
            log.state,
            phrase.language_id,
            verse.book_id
        FROM (
            (
                SELECT phrase_id, updated_by, updated_at, gloss, state
                FROM gloss
            ) UNION ALL (
                SELECT phrase_id, updated_by, updated_at, gloss, state
                FROM gloss_history
            )
        ) log
        JOIN phrase ON phrase.id = log.phrase_id
        JOIN phrase_word ON phrase_word.phrase_id = phrase.id
        JOIN word ON word.id = phrase_word.word_id
        JOIN verse ON verse.id = word.verse_id
        WHERE log.updated_at < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15'))
            AND (phrase.deleted_at IS NULL
                OR phrase.deleted_at < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15')))
        ORDER BY log.phrase_id, phrase_word.word_id, verse.book_id, log.updated_at DESC
    ) log
    GROUP BY log.language_id, log.book_id, log.updated_by
    ORDER BY log.language_id, log.book_id, log.updated_by
    ON CONFLICT (language_id, book_id, user_id, week)
    DO UPDATE SET
        approved_count = EXCLUDED.approved_count,
        unapproved_count = EXCLUDED.unapproved_count;
$_$;


--
-- Name: generate_ulid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ulid() RETURNS uuid
    LANGUAGE sql
    AS $$
        SELECT (lpad(to_hex(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint), 12, '0') || encode(gen_random_bytes(10), 'hex'))::uuid;
    $$;


--
-- Name: generate_weekly_contribution_stats(timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_weekly_contribution_stats(d timestamp without time zone) RETURNS void
    LANGUAGE sql
    AS $_$
    insert into weekly_contribution_statistics (
        week,
        language_id,
        user_id,
        approved_count,
        revoked_count,
        edited_approved_count,
        edited_unapproved_count
    )
    select
        date_bin('7 days', date_trunc('day', $1), timestamp '2024-12-15'),
        changed_phrase.language_id,
        changed_phrase.updated_by,
        coalesce(count(*) filter (
            where changed_phrase.state = 'APPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'UNAPPROVED'
        ), 0) as words_approved,
        coalesce(count(*) filter (
            where changed_phrase.state = 'UNAPPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'APPROVED'
        ), 0) as words_revoked,
        coalesce(count(*) filter (
            where changed_phrase.gloss <> coalesce(prev_phrase.gloss, '')
                and changed_phrase.state = 'APPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'APPROVED'
        ), 0) as words_approved_edited,
        coalesce(count(*) filter (
            where changed_phrase.gloss <> coalesce(prev_phrase.gloss, '')
                and changed_phrase.state = 'UNAPPROVED'
                and coalesce(prev_phrase.state, 'UNAPPROVED') = 'UNAPPROVED'
        ), 0) as words_unapproved_edited
    from (
        select
            DISTINCT ON (ph.language_id, phw.word_id)
            ph.language_id, phw.word_id,
            log.*
        from (
            (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss
            ) union all (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss_history
            ) union all (
                select
                    id as phrase_id,
                    deleted_by as updated_by,
                    deleted_at as updated_at,
                    '' as gloss,
                    'UNAPPROVED' as state
                from phrase
                where deleted_by is not null and deleted_at is not null
            )
        ) log
        join phrase_word phw on phw.phrase_id = log.phrase_id
        join phrase ph on ph.id = log.phrase_id
        where log.updated_at > date_bin('7 days', date_trunc('day', $1), timestamp '2024-12-15')
            and log.updated_at < date_bin('7 days', date_trunc('day', $1 + interval '7 days'), timestamp '2024-12-15')
        order by ph.language_id, phw.word_id, log.updated_at desc
        ) changed_phrase
    left join lateral (
        select h.* from (
            (
                select phrase_id, updated_by, updated_at, gloss, state
                from gloss
                where exists (
                        select 1 from phrase_word phw
                        join phrase ph on ph.id = phw.phrase_id
                        where ph.id = gloss.phrase_id
                            and ph.language_id = changed_phrase.language_id
                            and phw.word_id = changed_phrase.word_id
                    )
                    and gloss.updated_at < date_bin('7 days', date_trunc('day', $1 - interval '7 days'), timestamp '2024-12-15')
            ) union all (
                select
                    id as phrase_id,
                    deleted_by as updated_by,
                    deleted_at as updated_at,
                    '' as gloss,
                    'UNAPPROVED' as state
                from phrase
                where deleted_by is not null and deleted_at is not null
                    and phrase.language_id = changed_phrase.language_id
                    and exists (
                        select 1 from phrase_word phw
                        where phw.phrase_id = phrase.id
                            and phw.word_id = changed_phrase.word_id
                    )
                    and phrase.deleted_at < date_bin('7 days', date_trunc('day', $1 - interval '7 days'), timestamp '2024-12-15')
            )
        ) h
        order by h.updated_at desc
        limit 1
    ) prev_phrase on true
    where changed_phrase.updated_by is not null
    group by changed_phrase.language_id, changed_phrase.updated_by
    on conflict (language_id, user_id, week)
    do update set
        approved_count = excluded.approved_count,
        revoked_count = excluded.revoked_count,
        edited_approved_count = excluded.edited_approved_count,
        edited_unapproved_count = excluded.edited_unapproved_count;
$_$;


--
-- Name: gloss_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gloss_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO gloss_history AS c (phrase_id, gloss, state, source, updated_at, updated_by)
    VALUES (OLD.phrase_id, OLD.gloss, OLD.state, OLD.source, OLD.updated_at, OLD.updated_by);

    RETURN NULL;
END;
$$;


--
-- Name: increment_suggestion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_suggestion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.state = 'APPROVED' AND (OLD IS NULL OR NEW.gloss <> OLD.gloss OR OLD.state <> 'APPROVED') THEN
        INSERT INTO lemma_form_suggestion AS c (language_id, form_id, gloss, count)
        SELECT
            ph.language_id,
            w.form_id,
            NEW.gloss,
            1
        FROM word AS w
        JOIN phrase_word AS phw ON phw.word_id = w.id
        JOIN phrase AS ph ON  phw.phrase_id = ph.id
        WHERE ph.id = NEW.phrase_id
        ON CONFLICT (language_id, form_id, gloss) DO UPDATE
            SET count = c.count + 1;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: machine_gloss_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.machine_gloss_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO machine_gloss_history AS c (machine_gloss_id, gloss, updated_at, updated_by)
    VALUES (OLD."id", OLD.gloss, OLD.updated_at, OLD.updated_by);

    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: book; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: footnote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.footnote (
    author_id uuid NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL,
    content text NOT NULL,
    phrase_id integer NOT NULL
);


--
-- Name: gloss; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gloss (
    gloss text,
    state public.gloss_state DEFAULT 'UNAPPROVED'::public.gloss_state NOT NULL,
    phrase_id integer NOT NULL,
    source public.gloss_source,
    updated_at timestamp without time zone NOT NULL,
    updated_by uuid
);


--
-- Name: gloss_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gloss_history (
    id integer NOT NULL,
    phrase_id integer NOT NULL,
    gloss text,
    state public.gloss_state,
    source public.gloss_source,
    updated_at timestamp without time zone NOT NULL,
    updated_by uuid
);


--
-- Name: gloss_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gloss_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gloss_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gloss_history_id_seq OWNED BY public.gloss_history.id;


--
-- Name: job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job (
    id uuid NOT NULL,
    type_id integer NOT NULL,
    status public.job_status NOT NULL,
    payload jsonb,
    data jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: job_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_type (
    id integer NOT NULL,
    name text
);


--
-- Name: job_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_type_id_seq OWNED BY public.job_type.id;


--
-- Name: language; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.language (
    id uuid DEFAULT public.generate_ulid() NOT NULL,
    code text NOT NULL,
    english_name text NOT NULL,
    font text DEFAULT 'Noto Sans'::text NOT NULL,
    translation_ids text[],
    text_direction public.text_direction DEFAULT 'ltr'::public.text_direction NOT NULL,
    reference_language_id uuid,
    local_name text NOT NULL
);


--
-- Name: language_import_job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.language_import_job (
    language_id uuid NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone,
    succeeded boolean,
    user_id uuid
);


--
-- Name: language_member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.language_member (
    language_id uuid NOT NULL,
    user_id uuid NOT NULL,
    invited_at timestamp without time zone NOT NULL
);


--
-- Name: language_member_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.language_member_role (
    user_id uuid NOT NULL,
    language_id uuid NOT NULL,
    role public.language_role NOT NULL
);


--
-- Name: phrase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phrase (
    id integer NOT NULL,
    language_id uuid NOT NULL,
    created_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    deleted_at timestamp(3) without time zone,
    deleted_by uuid
);


--
-- Name: phrase_word; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phrase_word (
    phrase_id integer NOT NULL,
    word_id text NOT NULL
);


--
-- Name: verse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verse (
    id text NOT NULL,
    number integer NOT NULL,
    book_id integer NOT NULL,
    chapter integer NOT NULL
);


--
-- Name: word; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.word (
    id text NOT NULL,
    text text NOT NULL,
    verse_id text NOT NULL,
    form_id text NOT NULL
);


--
-- Name: language_progress; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.language_progress AS
 WITH data AS (
         SELECT ph.language_id AS id,
            (v.book_id >= 40) AS is_nt,
            count(*) AS count
           FROM ((((public.phrase ph
             JOIN public.phrase_word phw ON ((phw.phrase_id = ph.id)))
             JOIN public.word w ON ((w.id = phw.word_id)))
             JOIN public.verse v ON ((v.id = w.verse_id)))
             JOIN public.gloss g ON ((g.phrase_id = ph.id)))
          WHERE (ph.deleted_at IS NULL)
          GROUP BY ph.language_id, (v.book_id >= 40)
        ), ot_total AS (
         SELECT count(*) AS total
           FROM (public.word w
             JOIN public.verse v ON ((v.id = w.verse_id)))
          WHERE (v.book_id < 40)
        ), nt_total AS (
         SELECT count(*) AS total
           FROM (public.word w
             JOIN public.verse v ON ((v.id = w.verse_id)))
          WHERE (v.book_id >= 40)
        )
 SELECT l.code,
    ((COALESCE(nt_data.count, (0)::bigint))::double precision / ( SELECT (nt_total.total)::double precision AS total
           FROM nt_total)) AS nt_progress,
    ((COALESCE(ot_data.count, (0)::bigint))::double precision / ( SELECT (ot_total.total)::double precision AS total
           FROM ot_total)) AS ot_progress
   FROM ((public.language l
     LEFT JOIN data nt_data ON (((nt_data.id = l.id) AND (nt_data.is_nt = true))))
     LEFT JOIN data ot_data ON (((ot_data.id = l.id) AND (ot_data.is_nt = false))))
  WITH NO DATA;


--
-- Name: lemma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lemma (
    id text NOT NULL
);


--
-- Name: lemma_form; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lemma_form (
    id text NOT NULL,
    grammar text NOT NULL,
    lemma_id text NOT NULL
);


--
-- Name: lemma_form_suggestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lemma_form_suggestion (
    id integer NOT NULL,
    language_id uuid NOT NULL,
    form_id text NOT NULL,
    gloss text NOT NULL,
    count integer NOT NULL
);


--
-- Name: lemma_form_suggestion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lemma_form_suggestion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lemma_form_suggestion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lemma_form_suggestion_id_seq OWNED BY public.lemma_form_suggestion.id;


--
-- Name: lemma_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lemma_resource (
    lemma_id text NOT NULL,
    resource_code public.resource_code NOT NULL,
    content text NOT NULL
);


--
-- Name: machine_gloss; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_gloss (
    word_id text NOT NULL,
    language_id uuid NOT NULL,
    gloss text,
    id integer NOT NULL
);


--
-- Name: machine_gloss_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.machine_gloss_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: machine_gloss_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.machine_gloss_id_seq OWNED BY public.machine_gloss.id;


--
-- Name: phrase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.phrase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: phrase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.phrase_id_seq OWNED BY public.phrase.id;


--
-- Name: recording; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recording (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: reset_password_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reset_password_token (
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires bigint NOT NULL
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tracking_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracking_event (
    id uuid NOT NULL,
    type text NOT NULL,
    data jsonb NOT NULL,
    user_id uuid,
    language_id uuid,
    created_at timestamp without time zone
);


--
-- Name: translator_note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.translator_note (
    author_id uuid NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL,
    content text NOT NULL,
    phrase_id integer NOT NULL
);


--
-- Name: user_email_verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_email_verification (
    user_id uuid NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    expires bigint NOT NULL
);


--
-- Name: user_invitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_invitation (
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires bigint NOT NULL
);


--
-- Name: user_system_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_system_role (
    user_id uuid NOT NULL,
    role public.system_role NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.generate_ulid() NOT NULL,
    name text,
    email_status public.email_status DEFAULT 'UNVERIFIED'::public.email_status NOT NULL,
    email text NOT NULL,
    hashed_password text,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL
);


--
-- Name: verse_audio_timing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verse_audio_timing (
    id integer NOT NULL,
    verse_id text NOT NULL,
    recording_id text NOT NULL,
    start double precision,
    "end" double precision
);


--
-- Name: verse_audio_timing_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verse_audio_timing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verse_audio_timing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verse_audio_timing_id_seq OWNED BY public.verse_audio_timing.id;


--
-- Name: verse_commentary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verse_commentary (
    verse_id text NOT NULL,
    content text NOT NULL
);


--
-- Name: verse_question; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verse_question (
    verse_id text NOT NULL,
    sort_order integer NOT NULL,
    question text NOT NULL,
    response text NOT NULL
);


--
-- Name: weekly_contribution_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_contribution_statistics (
    id integer NOT NULL,
    week timestamp without time zone NOT NULL,
    language_id uuid NOT NULL,
    user_id uuid NOT NULL,
    approved_count integer NOT NULL,
    revoked_count integer NOT NULL,
    edited_approved_count integer NOT NULL,
    edited_unapproved_count integer NOT NULL
);


--
-- Name: weekly_contribution_statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weekly_contribution_statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weekly_contribution_statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weekly_contribution_statistics_id_seq OWNED BY public.weekly_contribution_statistics.id;


--
-- Name: weekly_gloss_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_gloss_statistics (
    id integer NOT NULL,
    week timestamp without time zone NOT NULL,
    language_id uuid NOT NULL,
    book_id integer NOT NULL,
    user_id uuid,
    approved_count integer NOT NULL,
    unapproved_count integer NOT NULL
);


--
-- Name: weekly_gloss_statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weekly_gloss_statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weekly_gloss_statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weekly_gloss_statistics_id_seq OWNED BY public.weekly_gloss_statistics.id;


--
-- Name: word_lexicon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.word_lexicon (
    word_id text NOT NULL,
    content text NOT NULL
);


--
-- Name: gloss_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gloss_history ALTER COLUMN id SET DEFAULT nextval('public.gloss_history_id_seq'::regclass);


--
-- Name: job_type id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_type ALTER COLUMN id SET DEFAULT nextval('public.job_type_id_seq'::regclass);


--
-- Name: lemma_form_suggestion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_form_suggestion ALTER COLUMN id SET DEFAULT nextval('public.lemma_form_suggestion_id_seq'::regclass);


--
-- Name: machine_gloss id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_gloss ALTER COLUMN id SET DEFAULT nextval('public.machine_gloss_id_seq'::regclass);


--
-- Name: phrase id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase ALTER COLUMN id SET DEFAULT nextval('public.phrase_id_seq'::regclass);


--
-- Name: verse_audio_timing id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_audio_timing ALTER COLUMN id SET DEFAULT nextval('public.verse_audio_timing_id_seq'::regclass);


--
-- Name: weekly_contribution_statistics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_contribution_statistics ALTER COLUMN id SET DEFAULT nextval('public.weekly_contribution_statistics_id_seq'::regclass);


--
-- Name: weekly_gloss_statistics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_gloss_statistics ALTER COLUMN id SET DEFAULT nextval('public.weekly_gloss_statistics_id_seq'::regclass);


--
-- Name: book book_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book
    ADD CONSTRAINT book_pkey PRIMARY KEY (id);


--
-- Name: footnote footnote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footnote
    ADD CONSTRAINT footnote_pkey PRIMARY KEY (phrase_id);


--
-- Name: gloss_history gloss_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gloss_history
    ADD CONSTRAINT gloss_history_pkey PRIMARY KEY (id);


--
-- Name: gloss gloss_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gloss
    ADD CONSTRAINT gloss_pkey PRIMARY KEY (phrase_id);


--
-- Name: job job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT job_pkey PRIMARY KEY (id);


--
-- Name: job_type job_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_type
    ADD CONSTRAINT job_type_name_key UNIQUE (name);


--
-- Name: job_type job_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_type
    ADD CONSTRAINT job_type_pkey PRIMARY KEY (id);


--
-- Name: language_import_job language_import_job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_import_job
    ADD CONSTRAINT language_import_job_pkey PRIMARY KEY (language_id);


--
-- Name: language_member language_member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_member
    ADD CONSTRAINT language_member_pkey PRIMARY KEY (language_id, user_id);


--
-- Name: language_member_role language_member_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_member_role
    ADD CONSTRAINT language_member_role_pkey PRIMARY KEY (language_id, user_id, role);


--
-- Name: language language_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language
    ADD CONSTRAINT language_pkey PRIMARY KEY (id);


--
-- Name: lemma_form lemma_form_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_form
    ADD CONSTRAINT lemma_form_pkey PRIMARY KEY (id);


--
-- Name: lemma_form_suggestion lemma_form_suggestion_language_id_form_id_gloss_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_form_suggestion
    ADD CONSTRAINT lemma_form_suggestion_language_id_form_id_gloss_key UNIQUE (language_id, form_id, gloss);


--
-- Name: lemma_form_suggestion lemma_form_suggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_form_suggestion
    ADD CONSTRAINT lemma_form_suggestion_pkey PRIMARY KEY (id);


--
-- Name: lemma lemma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma
    ADD CONSTRAINT lemma_pkey PRIMARY KEY (id);


--
-- Name: lemma_resource lemma_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_resource
    ADD CONSTRAINT lemma_resource_pkey PRIMARY KEY (lemma_id, resource_code);


--
-- Name: machine_gloss machine_gloss_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_gloss
    ADD CONSTRAINT machine_gloss_pkey PRIMARY KEY (id);


--
-- Name: phrase phrase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase
    ADD CONSTRAINT phrase_pkey PRIMARY KEY (id);


--
-- Name: phrase_word phrase_word_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase_word
    ADD CONSTRAINT phrase_word_pkey PRIMARY KEY (phrase_id, word_id);


--
-- Name: recording recording_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recording
    ADD CONSTRAINT recording_pkey PRIMARY KEY (id);


--
-- Name: reset_password_token reset_password_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reset_password_token
    ADD CONSTRAINT reset_password_token_pkey PRIMARY KEY (token);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: tracking_event tracking_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_event
    ADD CONSTRAINT tracking_event_pkey PRIMARY KEY (id);


--
-- Name: translator_note translator_note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translator_note
    ADD CONSTRAINT translator_note_pkey PRIMARY KEY (phrase_id);


--
-- Name: user_email_verification user_email_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_verification
    ADD CONSTRAINT user_email_verification_pkey PRIMARY KEY (token);


--
-- Name: user_invitation user_invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitation
    ADD CONSTRAINT user_invitation_pkey PRIMARY KEY (token);


--
-- Name: user_system_role user_system_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_system_role
    ADD CONSTRAINT user_system_role_pkey PRIMARY KEY (user_id, role);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verse_audio_timing verse_audio_timing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_audio_timing
    ADD CONSTRAINT verse_audio_timing_pkey PRIMARY KEY (id);


--
-- Name: verse_audio_timing verse_audio_timing_verse_id_recording_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_audio_timing
    ADD CONSTRAINT verse_audio_timing_verse_id_recording_id_key UNIQUE (verse_id, recording_id);


--
-- Name: verse_commentary verse_commentary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_commentary
    ADD CONSTRAINT verse_commentary_pkey PRIMARY KEY (verse_id);


--
-- Name: verse verse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse
    ADD CONSTRAINT verse_pkey PRIMARY KEY (id);


--
-- Name: verse_question verse_question_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_question
    ADD CONSTRAINT verse_question_pkey PRIMARY KEY (verse_id, sort_order);


--
-- Name: weekly_contribution_statistics weekly_contribution_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_contribution_statistics
    ADD CONSTRAINT weekly_contribution_statistics_pkey PRIMARY KEY (id);


--
-- Name: weekly_contribution_statistics weekly_contribution_statistics_week_language_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_contribution_statistics
    ADD CONSTRAINT weekly_contribution_statistics_week_language_id_user_id_key UNIQUE (week, language_id, user_id);


--
-- Name: weekly_gloss_statistics weekly_gloss_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_gloss_statistics
    ADD CONSTRAINT weekly_gloss_statistics_pkey PRIMARY KEY (id);


--
-- Name: weekly_gloss_statistics weekly_gloss_statistics_week_language_id_book_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_gloss_statistics
    ADD CONSTRAINT weekly_gloss_statistics_week_language_id_book_id_user_id_key UNIQUE (week, language_id, book_id, user_id);


--
-- Name: word_lexicon word_lexicon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word_lexicon
    ADD CONSTRAINT word_lexicon_pkey PRIMARY KEY (word_id);


--
-- Name: word word_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word
    ADD CONSTRAINT word_pkey PRIMARY KEY (id);


--
-- Name: book_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX book_name_key ON public.book USING btree (name);


--
-- Name: footnote_phrase_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX footnote_phrase_id_idx ON public.footnote USING btree (phrase_id);


--
-- Name: gloss_phrase_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gloss_phrase_id_idx ON public.gloss USING btree (phrase_id);


--
-- Name: language_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX language_code_idx ON public.language USING btree (code);


--
-- Name: lemma_form_lemma_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lemma_form_lemma_id_idx ON public.lemma_form USING btree (lemma_id);


--
-- Name: lemma_resource_lemma_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lemma_resource_lemma_id_idx ON public.lemma_resource USING btree (lemma_id);


--
-- Name: phrase_language_id_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX phrase_language_id_deleted_at_idx ON public.phrase USING btree (language_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: phrase_word_word_id_phrase_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX phrase_word_word_id_phrase_id_idx ON public.phrase_word USING btree (word_id, phrase_id);


--
-- Name: session_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX session_id_key ON public.session USING btree (id);


--
-- Name: session_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX session_user_id_idx ON public.session USING btree (user_id);


--
-- Name: translator_note_phrase_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX translator_note_phrase_id_idx ON public.translator_note USING btree (phrase_id);


--
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_email_key ON public.users USING btree (email);


--
-- Name: user_email_verification_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_email_verification_token_key ON public.user_email_verification USING btree (token);


--
-- Name: verse_book_id_chapter_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX verse_book_id_chapter_number_key ON public.verse USING btree (book_id, chapter, number);


--
-- Name: word_form_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX word_form_id_idx ON public.word USING btree (form_id);


--
-- Name: word_verse_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX word_verse_id_idx ON public.word USING btree (verse_id);


--
-- Name: gloss decrement_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER decrement_suggestion AFTER DELETE OR UPDATE OF gloss, state ON public.gloss FOR EACH ROW EXECUTE FUNCTION public.decrement_suggestion();


--
-- Name: phrase decrement_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER decrement_suggestion AFTER UPDATE OF deleted_at ON public.phrase FOR EACH ROW EXECUTE FUNCTION public.decrement_suggestion_after_phrase_delete();


--
-- Name: gloss gloss_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER gloss_audit AFTER DELETE OR UPDATE ON public.gloss FOR EACH ROW EXECUTE FUNCTION public.gloss_audit();


--
-- Name: gloss increment_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER increment_suggestion AFTER INSERT OR UPDATE OF gloss, state ON public.gloss FOR EACH ROW EXECUTE FUNCTION public.increment_suggestion();


--
-- Name: machine_gloss machine_gloss_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER machine_gloss_audit AFTER DELETE OR UPDATE ON public.machine_gloss FOR EACH ROW EXECUTE FUNCTION public.machine_gloss_audit();


--
-- Name: footnote footnote_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footnote
    ADD CONSTRAINT footnote_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: footnote footnote_phrase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footnote
    ADD CONSTRAINT footnote_phrase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: gloss_history gloss_history_phrase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gloss_history
    ADD CONSTRAINT gloss_history_phrase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrase(id);


--
-- Name: gloss gloss_phrase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gloss
    ADD CONSTRAINT gloss_phrase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: gloss gloss_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gloss
    ADD CONSTRAINT gloss_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: job job_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT job_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.job_type(id);


--
-- Name: language_import_job language_import_job_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_import_job
    ADD CONSTRAINT language_import_job_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: language_import_job language_import_job_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_import_job
    ADD CONSTRAINT language_import_job_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: language_member language_member_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_member
    ADD CONSTRAINT language_member_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id);


--
-- Name: language_member_role language_member_role_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_member_role
    ADD CONSTRAINT language_member_role_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: language_member_role language_member_role_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_member_role
    ADD CONSTRAINT language_member_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: language_member language_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_member
    ADD CONSTRAINT language_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: language language_reference_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language
    ADD CONSTRAINT language_reference_language_id_fkey FOREIGN KEY (reference_language_id) REFERENCES public.language(id);


--
-- Name: lemma_form lemma_form_lemma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_form
    ADD CONSTRAINT lemma_form_lemma_id_fkey FOREIGN KEY (lemma_id) REFERENCES public.lemma(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lemma_form_suggestion lemma_form_suggestion_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_form_suggestion
    ADD CONSTRAINT lemma_form_suggestion_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.lemma_form(id);


--
-- Name: lemma_form_suggestion lemma_form_suggestion_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_form_suggestion
    ADD CONSTRAINT lemma_form_suggestion_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id);


--
-- Name: lemma_resource lemma_resource_lemma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lemma_resource
    ADD CONSTRAINT lemma_resource_lemma_id_fkey FOREIGN KEY (lemma_id) REFERENCES public.lemma(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: machine_gloss machine_gloss_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_gloss
    ADD CONSTRAINT machine_gloss_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: machine_gloss machine_gloss_word_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_gloss
    ADD CONSTRAINT machine_gloss_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.word(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: phrase phrase_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase
    ADD CONSTRAINT phrase_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: phrase phrase_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase
    ADD CONSTRAINT phrase_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: phrase phrase_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase
    ADD CONSTRAINT phrase_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: phrase_word phrase_word_phrase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase_word
    ADD CONSTRAINT phrase_word_phrase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: phrase_word phrase_word_word_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrase_word
    ADD CONSTRAINT phrase_word_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.word(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reset_password_token reset_password_token_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reset_password_token
    ADD CONSTRAINT reset_password_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: session session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: translator_note translator_note_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translator_note
    ADD CONSTRAINT translator_note_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: translator_note translator_note_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translator_note
    ADD CONSTRAINT translator_note_phase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_email_verification user_email_verification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_verification
    ADD CONSTRAINT user_email_verification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_invitation user_invitation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitation
    ADD CONSTRAINT user_invitation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_system_role user_system_role_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_system_role
    ADD CONSTRAINT user_system_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: verse_audio_timing verse_audio_timing_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_audio_timing
    ADD CONSTRAINT verse_audio_timing_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES public.recording(id);


--
-- Name: verse_audio_timing verse_audio_timing_verse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_audio_timing
    ADD CONSTRAINT verse_audio_timing_verse_id_fkey FOREIGN KEY (verse_id) REFERENCES public.verse(id);


--
-- Name: verse verse_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse
    ADD CONSTRAINT verse_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.book(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: verse_commentary verse_commentary_verse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_commentary
    ADD CONSTRAINT verse_commentary_verse_id_fkey FOREIGN KEY (verse_id) REFERENCES public.verse(id);


--
-- Name: verse_question verse_question_verse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verse_question
    ADD CONSTRAINT verse_question_verse_id_fkey FOREIGN KEY (verse_id) REFERENCES public.verse(id);


--
-- Name: weekly_contribution_statistics weekly_contribution_statistics_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_contribution_statistics
    ADD CONSTRAINT weekly_contribution_statistics_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id);


--
-- Name: weekly_contribution_statistics weekly_contribution_statistics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_contribution_statistics
    ADD CONSTRAINT weekly_contribution_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: weekly_gloss_statistics weekly_gloss_statistics_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_gloss_statistics
    ADD CONSTRAINT weekly_gloss_statistics_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.book(id);


--
-- Name: weekly_gloss_statistics weekly_gloss_statistics_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_gloss_statistics
    ADD CONSTRAINT weekly_gloss_statistics_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id);


--
-- Name: weekly_gloss_statistics weekly_gloss_statistics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_gloss_statistics
    ADD CONSTRAINT weekly_gloss_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: word word_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word
    ADD CONSTRAINT word_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.lemma_form(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: word_lexicon word_lexicon_word_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word_lexicon
    ADD CONSTRAINT word_lexicon_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.word(id);


--
-- Name: word word_verse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word
    ADD CONSTRAINT word_verse_id_fkey FOREIGN KEY (verse_id) REFERENCES public.verse(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

