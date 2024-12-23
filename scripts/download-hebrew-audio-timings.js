const { Client } = require("pg")

const SHORT_BOOKS = [ 'Gen', 'Exo', 'Lev', 'Num', 'Deu', 'Jos', 'Jdg', 'Rut', '1Sa', '2Sa', '1Ki', '2Ki', '1Ch', '2Ch', 'Ezr', 'Neh', 'Est', 'Job', 'Psa', 'Pro', 'Ecc', 'Sng', 'Isa', 'Jer', 'Lam', 'Ezk', 'Dan', 'Hos', 'Jol', 'Amo', 'Oba', 'Jon', 'Mic', 'Nam', 'Hab', 'Zep', 'Hag', 'Zec', 'Mal']
const BASE_URL = 'https://hebrewgreekbible.online/files'

async function downloadFile(version, bookId) {
    const url = `${BASE_URL}/${SHORT_BOOKS[bookId]}.js`
    const response = await fetch(url)
    const jsCode = await response.text()
    eval(jsCode)

    if (version === 'HEB') {
        return verseTiming // Generated from js code in response
    } else {
        return verseTimingRDB
    }
}

const client = new Client({ connectionString: process.env.DATABASE_URL, max: 20 })

async function saveVerseTimings(version, bookId, timings) {
    const data = timings
        .flatMap((ch, chid) =>
            ch.map((start, vid) => ({
                verseId: `${(bookId + 1).toString().padStart(2, '0')}${(chid + 1).toString().padStart(3, '0')}${(vid + 1).toString().padStart(3, '0')}`,
                start
            }))
        )
        .map((verse, i, verses) => {
            verse.end = verses[i + 1]?.start
            return verse
        })

    // There is one extra verse in Exodus in th HEB source
    if (version === 'HEB' && bookId === 1) {
        data.splice(581, 1)
    }

    const result = await client.query(
        `
        INSERT INTO verse_audio_timing (verse_id, recording_id, start, end)
        SELECT UNNEST($2::text[]), $1, UNNEST($3::FLOAT[]), UNNEST($4::FLOAT[])
        `,
        [version, data.map(d => d.verseId), data.map(d => d.start), data.map(d => d.end)]
    )
}

async function transferBook(version, bookId) {
    console.log(`Transferring ${version} ${SHORT_BOOKS[bookId]}`)
    const data = await downloadFile(version, bookId)
    await saveVerseTimings(version, bookId, data)
}

client.connect()
    .then(async () => {
        for (let b = 0; b < SHORT_BOOKS.length; b++) {
            try {
                await transferBook('HEB', b)
            } catch (error) {
                console.log(`Error transferring HEB ${SHORT_BOOKS[b]}: ${error}`)
            }
            try {
                await transferBook('RDB', b)
            } catch (error) {
                console.log(`Error transferring RDB ${SHORT_BOOKS[b]}: ${error}`)
            }
        }
    })
    .catch(console.error)
    .finally(() => client.end())
