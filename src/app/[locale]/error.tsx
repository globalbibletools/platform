'use client'
 
import { useEffect } from 'react'
import Button from '@/components/Button'
import { useTranslations } from 'next-intl'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("Error")

  useEffect(() => {
    console.error(error)
  }, [error])
 
  return (
    <div className="absolute w-full h-full flex items-center justify-center">
        <div className="max-w-[400px] flex-grow mx-4 p-8 rounded-lg border border-gray-300 shadow">
          <h2 className="font-bold text-xl mb-4">{t("title")}</h2>
          <p className="mb-6">{t("help")}</p>
          <Button onClick={() => reset()}>
            {t("actions.reload")}
          </Button>
        </div>
    </div>
  )
}

