import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

interface Word {
    id: string
    text: string
    english: string
}

interface PredictGlossesOptions {
    languageName: string
    words: Word[]
}

export async function predictGlosses({ languageName, words }: PredictGlossesOptions) {
    const response = await openai.chat.completions.create({
        ...REQUEST_BASE,
        messages: [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT.replace("{languageName}", languageName)
                    },
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": words.map(word => `${word.id} ${word.text}`).join('\n')
                    }
                ]
            }
        ]
    });

    return JSON.parse(response.choices[0].message.content ?? '{}')
}

const SYSTEM_PROMPT = `You are going to be producing literal translations in {languageName} for individual words in the Hebrew Old Testament and Greek New Testament. I will give you a list of individual Hebrew or Greek words in order from the text with the ID you should use when outputting the translation and an example in English. The translation for each word should meet the following criteria:
- For Hebrew and Greek words with multiple translations, use context clues to determine which sense is most appropriate. When in doubt err on the side of literalness.
- Try to follow the grammar of the Hebrew and Greek word in the translation. For example, conjugate verbs, and match plurals for nouns and adjectives
- Transliterate proper nouns so their pronunciation is close.
- When a Hebrew or Greek word is untranslatable, use a single hyphen as the translation.
- In inflected languages, the translation should adjust the translation based on where the word is in the sentence
- Punctuation in Hebrew or Greek should not be translated`

const REQUEST_BASE: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: "gpt-4o-mini",
    messages: [],
    response_format: {
        "type": "json_schema",
        "json_schema": {
            "name": "translations_array",
            "strict": true,
            "schema": {
                "type": "object",
                "properties": {
                    "translations": {
                        "type": "array",
                        "description": "An array of translation objects.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "type": "string",
                                    "description": "The unique identifier for the translation."
                                },
                                "translation": {
                                    "type": "string",
                                    "description": "The translation text."
                                }
                            },
                            "required": [
                                "id",
                                "translation"
                            ],
                            "additionalProperties": false
                        }
                    }
                },
                "required": [
                    "translations"
                ],
                "additionalProperties": false
            }
        }
    },
    temperature: 1,
    max_completion_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
}

