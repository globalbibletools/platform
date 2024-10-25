--
-- PostgreSQL database dump
--

-- Dumped from database version 14.13 (Debian 14.13-1.pgdg120+1)
-- Dumped by pg_dump version 14.13 (Debian 14.13-1.pgdg120+1)

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
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: EmailStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmailStatus" AS ENUM (
    'UNVERIFIED',
    'VERIFIED',
    'BOUNCED',
    'COMPLAINED'
);


--
-- Name: GlossSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GlossSource" AS ENUM (
    'USER',
    'IMPORT'
);


--
-- Name: GlossState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GlossState" AS ENUM (
    'APPROVED',
    'UNAPPROVED'
);


--
-- Name: LanguageRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LanguageRole" AS ENUM (
    'ADMIN',
    'TRANSLATOR',
    'VIEWER'
);


--
-- Name: ResourceCode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResourceCode" AS ENUM (
    'BDB',
    'LSJ',
    'STRONGS'
);


--
-- Name: SystemRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SystemRole" AS ENUM (
    'ADMIN'
);


--
-- Name: TextDirection; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TextDirection" AS ENUM (
    'ltr',
    'rtl'
);


--
-- Name: decrement_suggestion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_suggestion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.state = 'APPROVED' AND (NEW.gloss <> OLD.gloss OR NEW.state <> 'APPROVED') THEN
        UPDATE "LemmaFormSuggestionCount" AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = OLD.gloss
            AND c."languageId" = (SELECT "languageId" FROM "Phrase" WHERE id = OLD."phraseId")
            AND c."formId" IN (
                SELECT w."formId" FROM "Word" AS w
                JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
                JOIN "Phrase" AS ph ON  phw."phraseId" = ph.id
                WHERE ph.id = OLD."phraseId"
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
    IF NEW."deletedAt" IS NOT NULL THEN
        -- Ignore phrases with unapproved glosses.
        SELECT "Gloss".gloss INTO t_gloss
        FROM "Gloss"
        WHERE "phraseId" = NEW.id
            AND state = 'APPROVED';
        IF NOT FOUND THEN
            RETURN NULL;
        END IF;

        UPDATE "LemmaFormSuggestionCount" AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = t_gloss
            AND c."languageId" = NEW."languageId"
            AND c."formId" IN (
                SELECT w."formId" FROM "Word" AS w
                JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
                WHERE phw."phraseId" = NEW.id
            );
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: generate_ulid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ulid() RETURNS uuid
    LANGUAGE sql
    AS $$
        SELECT (lpad(to_hex(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint), 12, '0') || encode(gen_random_bytes(10), 'hex'))::uuid;
    $$;


--
-- Name: increment_suggestion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_suggestion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.state = 'APPROVED' AND (OLD IS NULL OR NEW.gloss <> OLD.gloss OR OLD.state <> 'APPROVED') THEN
        INSERT INTO "LemmaFormSuggestionCount" AS c ("languageId", "formId", "gloss", "count")
        SELECT
            ph."languageId",
            w."formId",
            NEW.gloss,
            1
        FROM "Word" AS w
        JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
        JOIN "Phrase" AS ph ON  phw."phraseId" = ph.id
        WHERE ph.id = NEW."phraseId"
        ON CONFLICT ("languageId", "formId", gloss) DO UPDATE
            SET count = c.count + 1;
    END IF;

    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Book; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Book" (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: Footnote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Footnote" (
    "authorId" uuid NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL,
    content text NOT NULL,
    "phraseId" integer NOT NULL
);


--
-- Name: Gloss; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Gloss" (
    gloss text,
    state public."GlossState" DEFAULT 'UNAPPROVED'::public."GlossState" NOT NULL,
    "phraseId" integer NOT NULL
);


--
-- Name: GlossEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GlossEvent" (
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid,
    gloss text,
    state public."GlossState",
    source public."GlossSource" NOT NULL,
    id integer NOT NULL,
    "phraseId" integer NOT NULL
);


--
-- Name: GlossEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."GlossEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: GlossEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."GlossEvent_id_seq" OWNED BY public."GlossEvent".id;


--
-- Name: Language; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Language" (
    id uuid DEFAULT public.generate_ulid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    font text DEFAULT 'Noto Sans'::text NOT NULL,
    "bibleTranslationIds" text[],
    "textDirection" public."TextDirection" DEFAULT 'ltr'::public."TextDirection" NOT NULL
);


--
-- Name: LanguageImportJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LanguageImportJob" (
    "languageId" uuid NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    succeeded boolean,
    "userId" uuid
);


--
-- Name: LanguageMemberRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LanguageMemberRole" (
    "userId" uuid NOT NULL,
    "languageId" uuid NOT NULL,
    role public."LanguageRole" NOT NULL
);


--
-- Name: Phrase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Phrase" (
    id integer NOT NULL,
    "languageId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "createdBy" uuid,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" uuid
);


--
-- Name: PhraseWord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PhraseWord" (
    "phraseId" integer NOT NULL,
    "wordId" text NOT NULL
);


--
-- Name: Verse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Verse" (
    id text NOT NULL,
    number integer NOT NULL,
    "bookId" integer NOT NULL,
    chapter integer NOT NULL
);


--
-- Name: Word; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Word" (
    id text NOT NULL,
    text text NOT NULL,
    "verseId" text NOT NULL,
    "formId" text NOT NULL
);


--
-- Name: LanguageProgress; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public."LanguageProgress" AS
 WITH data AS (
         SELECT ph."languageId" AS id,
            (v."bookId" >= 40) AS is_nt,
            count(*) AS count
           FROM ((((public."Phrase" ph
             JOIN public."PhraseWord" phw ON ((phw."phraseId" = ph.id)))
             JOIN public."Word" w ON ((w.id = phw."wordId")))
             JOIN public."Verse" v ON ((v.id = w."verseId")))
             JOIN public."Gloss" g ON ((g."phraseId" = ph.id)))
          WHERE (ph."deletedAt" IS NULL)
          GROUP BY ph."languageId", (v."bookId" >= 40)
        ), ot_total AS (
         SELECT count(*) AS total
           FROM (public."Word" w
             JOIN public."Verse" v ON ((v.id = w."verseId")))
          WHERE (v."bookId" < 40)
        ), nt_total AS (
         SELECT count(*) AS total
           FROM (public."Word" w
             JOIN public."Verse" v ON ((v.id = w."verseId")))
          WHERE (v."bookId" >= 40)
        )
 SELECT l.code,
    ((COALESCE(nt_data.count, (0)::bigint))::double precision / ( SELECT (nt_total.total)::double precision AS total
           FROM nt_total)) AS "ntProgress",
    ((COALESCE(ot_data.count, (0)::bigint))::double precision / ( SELECT (ot_total.total)::double precision AS total
           FROM ot_total)) AS "otProgress"
   FROM ((public."Language" l
     LEFT JOIN data nt_data ON (((nt_data.id = l.id) AND (nt_data.is_nt = true))))
     LEFT JOIN data ot_data ON (((ot_data.id = l.id) AND (ot_data.is_nt = false))))
  WITH NO DATA;


--
-- Name: Lemma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Lemma" (
    id text NOT NULL
);


--
-- Name: LemmaForm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LemmaForm" (
    id text NOT NULL,
    grammar text NOT NULL,
    "lemmaId" text NOT NULL
);


--
-- Name: LemmaFormSuggestionCount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LemmaFormSuggestionCount" (
    id integer NOT NULL,
    "languageId" uuid NOT NULL,
    "formId" text NOT NULL,
    gloss text NOT NULL,
    count integer NOT NULL
);


--
-- Name: LemmaFormSuggestionCount_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."LemmaFormSuggestionCount_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: LemmaFormSuggestionCount_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."LemmaFormSuggestionCount_id_seq" OWNED BY public."LemmaFormSuggestionCount".id;


--
-- Name: LemmaResource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LemmaResource" (
    "lemmaId" text NOT NULL,
    "resourceCode" public."ResourceCode" NOT NULL,
    content text NOT NULL
);


--
-- Name: MachineGloss; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MachineGloss" (
    "wordId" text NOT NULL,
    "languageId" uuid NOT NULL,
    gloss text
);


--
-- Name: Phrase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Phrase_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Phrase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Phrase_id_seq" OWNED BY public."Phrase".id;


--
-- Name: ResetPasswordToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ResetPasswordToken" (
    "userId" uuid NOT NULL,
    token text NOT NULL,
    expires bigint NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TranslatorNote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TranslatorNote" (
    "authorId" uuid NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL,
    content text NOT NULL,
    "phraseId" integer NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id uuid DEFAULT public.generate_ulid() NOT NULL,
    name text,
    "emailStatus" public."EmailStatus" DEFAULT 'UNVERIFIED'::public."EmailStatus" NOT NULL,
    email text NOT NULL,
    "hashedPassword" text
);


--
-- Name: UserEmailVerification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserEmailVerification" (
    "userId" uuid NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    expires bigint NOT NULL
);


--
-- Name: UserInvitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserInvitation" (
    "userId" uuid NOT NULL,
    token text NOT NULL,
    expires bigint NOT NULL
);


--
-- Name: UserSystemRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserSystemRole" (
    "userId" uuid NOT NULL,
    role public."SystemRole" NOT NULL
);


--
-- Name: GlossEvent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GlossEvent" ALTER COLUMN id SET DEFAULT nextval('public."GlossEvent_id_seq"'::regclass);


--
-- Name: LemmaFormSuggestionCount id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaFormSuggestionCount" ALTER COLUMN id SET DEFAULT nextval('public."LemmaFormSuggestionCount_id_seq"'::regclass);


--
-- Name: Phrase id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Phrase" ALTER COLUMN id SET DEFAULT nextval('public."Phrase_id_seq"'::regclass);


--
-- Name: Book Book_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Book"
    ADD CONSTRAINT "Book_pkey" PRIMARY KEY (id);


--
-- Name: Footnote Footnote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Footnote"
    ADD CONSTRAINT "Footnote_pkey" PRIMARY KEY ("phraseId");


--
-- Name: GlossEvent GlossEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GlossEvent"
    ADD CONSTRAINT "GlossEvent_pkey" PRIMARY KEY (id);


--
-- Name: Gloss Gloss_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Gloss"
    ADD CONSTRAINT "Gloss_pkey" PRIMARY KEY ("phraseId");


--
-- Name: LanguageImportJob LanguageImportJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LanguageImportJob"
    ADD CONSTRAINT "LanguageImportJob_pkey" PRIMARY KEY ("languageId");


--
-- Name: LanguageMemberRole LanguageMemberRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LanguageMemberRole"
    ADD CONSTRAINT "LanguageMemberRole_pkey" PRIMARY KEY ("languageId", "userId", role);


--
-- Name: Language Language_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Language"
    ADD CONSTRAINT "Language_pkey" PRIMARY KEY (id);


--
-- Name: LemmaFormSuggestionCount LemmaFormSuggestionCount_languageId_formId_gloss_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaFormSuggestionCount"
    ADD CONSTRAINT "LemmaFormSuggestionCount_languageId_formId_gloss_key" UNIQUE ("languageId", "formId", gloss);


--
-- Name: LemmaFormSuggestionCount LemmaFormSuggestionCount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaFormSuggestionCount"
    ADD CONSTRAINT "LemmaFormSuggestionCount_pkey" PRIMARY KEY (id);


--
-- Name: LemmaForm LemmaForm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaForm"
    ADD CONSTRAINT "LemmaForm_pkey" PRIMARY KEY (id);


--
-- Name: LemmaResource LemmaResource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaResource"
    ADD CONSTRAINT "LemmaResource_pkey" PRIMARY KEY ("lemmaId", "resourceCode");


--
-- Name: Lemma Lemma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lemma"
    ADD CONSTRAINT "Lemma_pkey" PRIMARY KEY (id);


--
-- Name: MachineGloss MachineGloss_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MachineGloss"
    ADD CONSTRAINT "MachineGloss_pkey" PRIMARY KEY ("wordId", "languageId");


--
-- Name: PhraseWord PhraseWord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhraseWord"
    ADD CONSTRAINT "PhraseWord_pkey" PRIMARY KEY ("phraseId", "wordId");


--
-- Name: Phrase Phrase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Phrase"
    ADD CONSTRAINT "Phrase_pkey" PRIMARY KEY (id);


--
-- Name: ResetPasswordToken ResetPasswordToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResetPasswordToken"
    ADD CONSTRAINT "ResetPasswordToken_pkey" PRIMARY KEY (token);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: TranslatorNote TranslatorNote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TranslatorNote"
    ADD CONSTRAINT "TranslatorNote_pkey" PRIMARY KEY ("phraseId");


--
-- Name: UserEmailVerification UserEmailVerification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserEmailVerification"
    ADD CONSTRAINT "UserEmailVerification_pkey" PRIMARY KEY (token);


--
-- Name: UserInvitation UserInvitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserInvitation"
    ADD CONSTRAINT "UserInvitation_pkey" PRIMARY KEY (token);


--
-- Name: UserSystemRole UserSystemRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSystemRole"
    ADD CONSTRAINT "UserSystemRole_pkey" PRIMARY KEY ("userId", role);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Verse Verse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Verse"
    ADD CONSTRAINT "Verse_pkey" PRIMARY KEY (id);


--
-- Name: Word Word_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Word"
    ADD CONSTRAINT "Word_pkey" PRIMARY KEY (id);


--
-- Name: Book_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Book_name_key" ON public."Book" USING btree (name);


--
-- Name: Footnote_phraseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Footnote_phraseId_idx" ON public."Footnote" USING btree ("phraseId");


--
-- Name: Gloss_phraseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Gloss_phraseId_idx" ON public."Gloss" USING btree ("phraseId");


--
-- Name: Language_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Language_code_key" ON public."Language" USING btree (code);


--
-- Name: LemmaForm_lemmaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LemmaForm_lemmaId_idx" ON public."LemmaForm" USING btree ("lemmaId");


--
-- Name: LemmaResource_lemmaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LemmaResource_lemmaId_idx" ON public."LemmaResource" USING btree ("lemmaId");


--
-- Name: PhraseWord_wordId_phraseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PhraseWord_wordId_phraseId_idx" ON public."PhraseWord" USING btree ("wordId", "phraseId");


--
-- Name: Phrase_languageId_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Phrase_languageId_deletedAt_idx" ON public."Phrase" USING btree ("languageId", "deletedAt") WHERE ("deletedAt" IS NULL);


--
-- Name: Session_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_id_key" ON public."Session" USING btree (id);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: TranslatorNote_phraseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TranslatorNote_phraseId_idx" ON public."TranslatorNote" USING btree ("phraseId");


--
-- Name: UserEmailVerification_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserEmailVerification_token_key" ON public."UserEmailVerification" USING btree (token);


--
-- Name: UserInvitation_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserInvitation_userId_key" ON public."UserInvitation" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Verse_bookId_chapter_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Verse_bookId_chapter_number_key" ON public."Verse" USING btree ("bookId", chapter, number);


--
-- Name: Word_formId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Word_formId_idx" ON public."Word" USING btree ("formId");


--
-- Name: Word_verseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Word_verseId_idx" ON public."Word" USING btree ("verseId");


--
-- Name: Gloss decrement_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER decrement_suggestion AFTER DELETE OR UPDATE OF gloss, state ON public."Gloss" FOR EACH ROW EXECUTE FUNCTION public.decrement_suggestion();


--
-- Name: Phrase decrement_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER decrement_suggestion AFTER UPDATE OF "deletedAt" ON public."Phrase" FOR EACH ROW EXECUTE FUNCTION public.decrement_suggestion_after_phrase_delete();


--
-- Name: Gloss increment_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER increment_suggestion AFTER INSERT OR UPDATE OF gloss, state ON public."Gloss" FOR EACH ROW EXECUTE FUNCTION public.increment_suggestion();


--
-- Name: Footnote Footnote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Footnote"
    ADD CONSTRAINT "Footnote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Footnote Footnote_phraseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Footnote"
    ADD CONSTRAINT "Footnote_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES public."Phrase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GlossEvent GlossEvent_phraseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GlossEvent"
    ADD CONSTRAINT "GlossEvent_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES public."Phrase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GlossEvent GlossEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GlossEvent"
    ADD CONSTRAINT "GlossEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Gloss Gloss_phraseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Gloss"
    ADD CONSTRAINT "Gloss_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES public."Phrase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LanguageImportJob LanguageImportJob_languageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LanguageImportJob"
    ADD CONSTRAINT "LanguageImportJob_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES public."Language"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LanguageImportJob LanguageImportJob_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LanguageImportJob"
    ADD CONSTRAINT "LanguageImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LanguageMemberRole LanguageMemberRole_languageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LanguageMemberRole"
    ADD CONSTRAINT "LanguageMemberRole_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES public."Language"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LanguageMemberRole LanguageMemberRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LanguageMemberRole"
    ADD CONSTRAINT "LanguageMemberRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LemmaFormSuggestionCount LemmaFormSuggestionCount_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaFormSuggestionCount"
    ADD CONSTRAINT "LemmaFormSuggestionCount_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."LemmaForm"(id);


--
-- Name: LemmaFormSuggestionCount LemmaFormSuggestionCount_languageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaFormSuggestionCount"
    ADD CONSTRAINT "LemmaFormSuggestionCount_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES public."Language"(id);


--
-- Name: LemmaForm LemmaForm_lemmaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaForm"
    ADD CONSTRAINT "LemmaForm_lemmaId_fkey" FOREIGN KEY ("lemmaId") REFERENCES public."Lemma"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LemmaResource LemmaResource_lemmaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LemmaResource"
    ADD CONSTRAINT "LemmaResource_lemmaId_fkey" FOREIGN KEY ("lemmaId") REFERENCES public."Lemma"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MachineGloss MachineGloss_languageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MachineGloss"
    ADD CONSTRAINT "MachineGloss_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES public."Language"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MachineGloss MachineGloss_wordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MachineGloss"
    ADD CONSTRAINT "MachineGloss_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES public."Word"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PhraseWord PhraseWord_phraseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhraseWord"
    ADD CONSTRAINT "PhraseWord_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES public."Phrase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PhraseWord PhraseWord_wordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhraseWord"
    ADD CONSTRAINT "PhraseWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES public."Word"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Phrase Phrase_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Phrase"
    ADD CONSTRAINT "Phrase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Phrase Phrase_deletedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Phrase"
    ADD CONSTRAINT "Phrase_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Phrase Phrase_languageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Phrase"
    ADD CONSTRAINT "Phrase_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES public."Language"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ResetPasswordToken ResetPasswordToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResetPasswordToken"
    ADD CONSTRAINT "ResetPasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TranslatorNote TranslatorNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TranslatorNote"
    ADD CONSTRAINT "TranslatorNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TranslatorNote TranslatorNote_phraseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TranslatorNote"
    ADD CONSTRAINT "TranslatorNote_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES public."Phrase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserEmailVerification UserEmailVerification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserEmailVerification"
    ADD CONSTRAINT "UserEmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserInvitation UserInvitation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserInvitation"
    ADD CONSTRAINT "UserInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSystemRole UserSystemRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSystemRole"
    ADD CONSTRAINT "UserSystemRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Verse Verse_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Verse"
    ADD CONSTRAINT "Verse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."Book"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Word Word_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Word"
    ADD CONSTRAINT "Word_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."LemmaForm"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Word Word_verseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Word"
    ADD CONSTRAINT "Word_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES public."Verse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

