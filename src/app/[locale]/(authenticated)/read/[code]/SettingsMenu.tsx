import FormLabel from "@/components/FormLabel";
import { Icon } from "@/components/Icon";
import SliderInput from "@/components/SliderInput";
import { Popover } from "@headlessui/react";
import { useTranslations } from "next-intl";

export interface SettingsMenuProps {
    textSize: number
    onTextSizeChange?(textSize: number): void
}

export default function SettingsMenu({ textSize, onTextSizeChange }: SettingsMenuProps) {
    const t = useTranslations('SettingsMenu')

    return <Popover className="relative">
        <Popover.Button className="text-blue-800">
            <Icon icon="sliders" size="xl" />
        </Popover.Button>
        <Popover.Panel className="absolute z-10 border border-gray-400 shadow-lg p-4 rounded bg-white -end-1 mt-3 min-w-[200px]">
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
