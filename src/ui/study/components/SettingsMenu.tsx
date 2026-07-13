import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from "@/components/ButtonSelectorInput";
import ComboboxInput from "@/components/ComboboxInput";
import FormLabel from "@/components/FormLabel";
import { Icon } from "@/components/Icon";
import SliderInput from "@/components/SliderInput";
import Button from "@/components/Button";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { ReadingSettings } from "./ReadingToolbar";
import { SwitchInput } from "@/components/SwitchInput";
import { isOldTestament } from "@/verse-utils";

export interface SettingsMenuProps {
  readingSettings: ReadingSettings;
  languageCode: string;
  languages: { englishName: string; localName: string; code: string }[];
  onReadingSettingChange?(readingSettings: ReadingSettings): void;
}

export default function SettingsMenu({
  readingSettings,
  languageCode,
  languages,
  onReadingSettingChange,
}: SettingsMenuProps) {
  const t = useTranslations("SettingsMenu");

  const navigate = useNavigate();
  const params = useParams({ from: "/_main/read/$code/$chapterId" });
  const isOT = isOldTestament(params.chapterId + "001");

  return (
    <Popover className="relative leading-0">
      <PopoverButton as={Button} variant="tertiary">
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
              onChange={(nextCode) =>
                navigate({
                  to: "/read/$code/$chapterId",
                  params: { code: nextCode, chapterId: params.chapterId },
                })
              }
              className="w-full"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <FormLabel id="mode-label">Mode</FormLabel>
          <ButtonSelectorInput
            name="mode"
            value={readingSettings.mode}
            onChange={(value) => {
              if (value !== "immersive" && value !== "standard") {
                return;
              }
              onReadingSettingChange?.({ ...readingSettings, mode: value });
            }}
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
          <FormLabel id="ai-glosses-label">{t("ai_glosses")}</FormLabel>
          <ButtonSelectorInput
            name="aiGlosses"
            value={readingSettings.aiGlosses}
            onChange={(value) => {
              if (
                value !== "none" &&
                value !== "fallback" &&
                value !== "prefer"
              ) {
                return;
              }

              onReadingSettingChange?.({
                ...readingSettings,
                aiGlosses: value,
              });
            }}
            aria-labelledby="ai-glosses-label"
          >
            <ButtonSelectorOption value="none">
              {t("ai_glosses_options.none")}
            </ButtonSelectorOption>
            <ButtonSelectorOption value="fallback">
              {t("ai_glosses_options.fallback")}
            </ButtonSelectorOption>
            <ButtonSelectorOption value="prefer">
              {t("ai_glosses_options.prefer")}
            </ButtonSelectorOption>
          </ButtonSelectorInput>
        </div>
        {isOT && (
          <>
            <div className="flex items-center justify-between gap-3">
              <FormLabel id="hebrew-vowels-label">
                {t("hebrew_vowels")}
              </FormLabel>
              <SwitchInput
                name="hebrewVowels"
                checked={readingSettings.hebrewVowels}
                onChange={(value) =>
                  onReadingSettingChange?.({
                    ...readingSettings,
                    hebrewVowels: value,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <FormLabel id="hebrew-accents-label">
                {t("hebrew_accents")}
              </FormLabel>
              <SwitchInput
                name="hebrewAccents"
                checked={readingSettings.hebrewAccents}
                onChange={(value) =>
                  onReadingSettingChange?.({
                    ...readingSettings,
                    hebrewAccents: value,
                  })
                }
              />
            </div>
          </>
        )}
        {!isOT && (
          <div className="flex items-center justify-between gap-3">
            <FormLabel id="greek-accents-label">{t("greek_accents")}</FormLabel>
            <SwitchInput
              name="greekAccents"
              checked={readingSettings.greekAccents}
              onChange={(value) =>
                onReadingSettingChange?.({
                  ...readingSettings,
                  greekAccents: value,
                })
              }
            />
          </div>
        )}
        <div>
          <FormLabel htmlFor="text-size">{t("text_size")}</FormLabel>
          <div className="w-full">
            <SliderInput
              id="text-size"
              className="w-full"
              min={1}
              max={10}
              step={1}
              value={readingSettings.textSize}
              onChange={(e) =>
                onReadingSettingChange?.({
                  ...readingSettings,
                  textSize: e.target.valueAsNumber,
                })
              }
            />
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
