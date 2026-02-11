begin;

create table verse_question(
    verse_id text not null references verse(id),
    sort_order int not null,
    question text not null,
    response text not null,
    primary key(verse_id, sort_order)
);

create table verse_commentary(
    verse_id text primary key references verse(id),
    content text not null
);

create table word_lexicon(
    word_id text primary key references word(id),
    content text not null
);

commit;
