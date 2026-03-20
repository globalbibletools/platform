delete from verse
where not exists (select * from word where word.verse_id = verse.id);
