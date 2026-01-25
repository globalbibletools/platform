"use client";

import ComboboxInput from "@/components/ComboboxInput";
import { useRouter } from "next/navigation";

interface Language {
  code: string;
  englishName: string;
  localName: string;
}

export default function DashboardLanguageSelector({
  languages,
  code,
}: {
  languages: Language[];
  code: string;
}) {
  const router = useRouter();

  return (
    <ComboboxInput
      className="w-48"
      value={code}
      items={languages.map((lang) => ({
        label: lang.englishName,
        value: lang.code,
      }))}
      onChange={(newCode) => {
        document.cookie = `lang=${newCode}; path=/`;
        router.refresh();
      }}
    />
  );
}
