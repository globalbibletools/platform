import { TranslationServiceClient } from '@google-cloud/translate';

export interface MachineTranslationClientOptions {
  key: string;
}

interface Key {
  client_email: string;
  private_key: string;
  project_id: string;
}

const key = process.env.GOOGLE_TRANSLATE_CREDENTIALS
  ? JSON.parse(
      Buffer.from(process.env.GOOGLE_TRANSLATE_CREDENTIALS, 'base64').toString('utf8')
    ) as Key
  : undefined;

const client = key && new TranslationServiceClient({
  credentials: {
    client_email: key.client_email,
    private_key: key.private_key,
  },
});

export const translateClient = client && {
  async translate(
    strings: string[],
    targetLanguage: string
  ): Promise<string[]> {
    const [response] = await client.translateText({
      contents: strings,
      targetLanguageCode: targetLanguage,
      parent: `projects/${key.project_id}`,
    });

    return response.translations?.map((t) => t.translatedText ?? '') ?? [];
  }
}

