begin;

alter table gloss
drop constraint gloss_phrase_id_fkey;

alter table gloss
add constraint gloss_phrase_id_fkey
foreign key (phrase_id)
references phrase(id)
on delete cascade;

alter table gloss_history
drop constraint gloss_history_phrase_id_fkey;

alter table gloss_history
add constraint gloss_history_phrase_id_fkey
foreign key (phrase_id)
references phrase(id)
on delete cascade;

alter table footnote
drop constraint footnote_phrase_id_fkey;

alter table footnote
add constraint gloss_phrase_id_fkey
foreign key (phrase_id)
references phrase(id)
on delete cascade;

alter table translator_note
drop constraint translator_note_phrase_id_fkey;

alter table translator_note
add constraint gloss_phrase_id_fkey
foreign key (phrase_id)
references phrase(id)
on delete cascade;

alter table phrase_word
drop constraint phrase_word_phrase_id_fkey;

alter table phrase_word
add constraint phrase_word_phrase_id_fkey
foreign key (phrase_id)
references phrase(id)
on delete cascade;

commit;
