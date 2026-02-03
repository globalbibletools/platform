import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from "@/components/ButtonSelectorInput";
import ComboboxInput from "@/components/ComboboxInput";
import FormLabel from "@/components/FormLabel";
import { Icon } from "@/components/Icon";
import SliderInput from "@/components/SliderInput";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export interface SettingsMenuProps {
  textSize: number;
  languageCode: string;
  languages: { englishName: string; localName: string; code: string }[];
  mode: "immersive" | "standard";
  onTextSizeChange?(textSize: number): void;
  onModeChange?(mode: "immersive" | "standard"): void;
}

export default function SettingsMenu({
  textSize,
  languageCode,
  languages,
  mode,
  onTextSizeChange,
  onModeChange,
}: SettingsMenuProps) {
  const t = useTranslations("SettingsMenu");

  const router = useRouter();
  const params = useParams();

  return (
    <Popover className="relative">
      <PopoverButton className="text-blue-800 dark:text-green-400">
        <Icon icon="sliders" size="xl" />
      </PopoverButton>
      <PopoverPanel className="absolute z-10 border border-gray-400 shadow-lg p-4 rounded-sm bg-white -end-1 mt-3 min-w-[200px] flex flex-col gap-4 dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
        <div className="sm:hidden">
          <FormLabel htmlFor="text-size">{t("language")}</FormLabel>
          <div className="w-full">
            <ComboboxInput
              id="target-language"
              items={languages.map((l) => ({
                label: l.localName,
                value: l.code,
              }))}
              value={languageCode}
              onChange={(code) => router.push(`../${code}/${params.chapterId}`)}
              className="w-full"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <FormLabel id="mode-label">Mode</FormLabel>
          <ButtonSelectorInput
            name="mode"
            value={mode}
            onChange={onModeChange}
            aria-labelledby="mode-label"
          >
            <ButtonSelectorOption value="standard">
              Standard
            </ButtonSelectorOption>
            <ButtonSelectorOption value="immersive">
              Immersive
            </ButtonSelectorOption>
          </ButtonSelectorInput>
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
      </PopoverPanel>
    </Popover>
  );
}
