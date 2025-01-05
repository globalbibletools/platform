import { Icon } from '@/components/Icon';
import { isOldTestament, parseVerseId } from '@/verse-utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslations } from 'next-intl';
import { fontMap } from '@/fonts';
import useSWR from 'swr';

type VersesPreviewProps = {
  language: { font: string, textDirection: string, code: string };
  verseIds: string[];
  onClose: () => void;
};

export const VersesPreview = ({
  language,
  verseIds,
  onClose,
}: VersesPreviewProps) => {
  const t = useTranslations("VersesPreview");
  let title = '';
  let isValid = false;
  let isHebrew = false;

  try {
    isHebrew = isOldTestament(verseIds[0]);
    title =
      t('reference', parseVerseId(verseIds[0]) as any) +
      (verseIds.length > 1
        ? ' - ' +
          t('reference', parseVerseId(verseIds[verseIds.length - 1]) as any)
        : '');
    isValid = true;
  } catch (e) {
    console.error(e);
    title = t('not_found') ?? '';
    isValid = false;
  }

  const { isLoading, data, error } = useSWR(['verses-preview', language.code, verseIds], async ([,code, verseIds]) => {
      const searchParams = new URLSearchParams({
          code,
          verseIds: verseIds.join(',')
      })
      const response = await fetch(`/api/verse-preview?${searchParams.toString()}`)
      return response.json() as Promise<{ verses: {id: string, original: string, translation?: string}[] }>
  })

  console.log(error)

  return (
    <div className="my-1 -mx-4 py-2 px-4 bg-brown-50 dark:bg-gray-600">
      <div className="flex ltr:flex-row rtl:flex-row-reverse items-center justify-between">
        <span className="text-base font-bold">{title}</span>
        <button
          onClick={onClose}
          type="button"
          className="w-9 h-9 text-red-700 dark:text-red-600 rounded-md focus-visible:outline outline-2 outline-green-300"
        >
          <Icon icon="xmark" />
          <span className="sr-only">{t('close')}</span>
        </button>
      </div>
      {isValid &&
        isLoading && (
          <div>
            <LoadingSpinner className="mx-auto mb-2" />
          </div>
        )}
      {isValid &&
        !isLoading &&
        verseIds.map((verseId) => (
          <div key={verseId} className="mb-4">
            <p
              className={`mb-2 mx-2 text-base font-mixed ${
                isHebrew ? 'text-right' : 'text-left'
              }`}
            >
              <span>{data?.verses.find(v => v.id === verseId)?.original}</span>
            </p>
            <p
              className="mx-2 text-base"
              dir={language.textDirection}
              style={{
                fontFamily: fontMap[language.font],
              }}
            >
              <span>{data?.verses.find(v => v.id === verseId)?.translation}</span>
            </p>
          </div>
        ))}
    </div>
  );
};
