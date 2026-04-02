create index phrase_word_phrase_id_word_id
on phrase_word(phrase_id, word_id);

drop index phrase_language_id_partial;

create index phrase_language_id_partial
on phrase(language_id, id) where deleted_at is null;
