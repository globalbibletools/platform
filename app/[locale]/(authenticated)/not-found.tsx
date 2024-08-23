import { Metadata, ResolvingMetadata } from "next"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("RootNotFoundPage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default function RootNotFoundPage() {
    const t = useTranslations("RootNotFoundPage")

    return <div className="absolute w-full h-full flex items-center justify-center">
        <h1 className="text-lg font-bold">{t("title")}</h1>
    </div>
}
