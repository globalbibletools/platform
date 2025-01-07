import ComboboxInput from "@/components/ComboboxInput";
import FormLabel from "@/components/FormLabel";
import { Icon } from "@/components/Icon";
import SliderInput from "@/components/SliderInput";
import { Popover } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export interface SettingsMenuProps {
    textSize: number
    languageCode: string
    languages: { name: string, code: string }[]
    onTextSizeChange?(textSize: number): void
}

export default function SettingsMenu({ textSize, languageCode, languages, onTextSizeChange }: SettingsMenuProps) {
    const t = useTranslations('SettingsMenu')

    const router = useRouter()
    const params = useParams()

    return <Popover className="relative">
        <Popover.Button className="text-blue-800 dark:text-green-400">
            <Icon icon="sliders" size="xl" />
        </Popover.Button>
        <Popover.Panel className="absolute z-10 border border-gray-400 shadow-lg p-4 rounded bg-white -end-1 mt-3 min-w-[200px] flex flex-col gap-4 dark:bg-gray-700 dark:border-gray-500 dark:shadow-none">
            <div className="sm:hidden">
                <FormLabel htmlFor="text-size">{t("language")}</FormLabel>
                <div className="w-full">
                    <ComboboxInput
                        id="target-language"
                        items={languages.map((l) => ({ label: l.name, value: l.code }))}
                        value={languageCode}
                        onChange={(code) => router.push(`../${code}/${params.chapterId}`)}
                        className="w-full"
                        autoComplete="off"
                    />
                </div>
            </div>
            <div>
                <FormLabel htmlFor="text-size">{t("text_size")}</FormLabel>
                <div className="w-full">
                    <SliderInput
                        id="text-size"
                        className="w-full"
                        min={1}
                        max={10}
                        step={1}
                        value={textSize}
                        onChange={(e) => onTextSizeChange?.(e.target.valueAsNumber)}
                    />
                </div>
            </div>
        </Popover.Panel>
    </Popover>
}
