Try to match words:

```sql
with our_word as (
    select row_number() over (partition by verse_id order by id) as n, * from (
        select verse_id, id, unnest(string_to_array(text, '־')) as text from word
    ) as word
    where text <> '' and text <> 'ס' and text <> 'פ' and verse_id < '40001001'
),
mam_word as (
    select row_number() over (partition by verse_id order by word_index) as n, * from (
        select verse_id, word_index, unnest(string_to_array(word, '־')) as text from mam
    ) as word
    where text <> ''
)
select mam_word.verse_id, mam_word.word_index, mam_word.n, mam_word.text, our_word.text, our_word.n, our_word.id, mam_word.text = our_word.text from mam_word
full outer join our_word on our_word.verse_id = mam_word.verse_id and our_word.n = mam_word.n
where our_word.n is null or mam_word.n is null
order by coalesce(mam_word.verse_id, our_word.verse_id), coalesce(mam_word.n, our_word.n);
```

Match single verse:

```sql
with our_word as (
    select row_number() over (partition by verse_id order by id) as n, * from (
        select verse_id, id, unnest(string_to_array(text, '־')) as text from word
    ) as word
    where text <> '' and text <> 'ס' and text <> 'פ' and verse_id < '40001001'
),
mam_word as (
    select row_number() over (partition by verse_id order by word_index) as n, * from (
        select verse_id, word_index, unnest(string_to_array(word, '־')) as text from mam
    ) as word
    where text <> ''
)
select mam_word.verse_id, mam_word.word_index, mam_word.n, mam_word.text, our_word.text, our_word.n, our_word.id, mam_word.text = our_word.text from mam_word
full outer join our_word on our_word.verse_id = mam_word.verse_id and our_word.n = mam_word.n
-- where our_word.n is null or mam_word.n is null
where mam_word.verse_id = '01013003' or our_word.verse_id = '01013003'
order by coalesce(mam_word.verse_id, our_word.verse_id), coalesce(mam_word.n, our_word.n);
```
