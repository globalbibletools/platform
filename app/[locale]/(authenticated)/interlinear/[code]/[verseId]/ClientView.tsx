"use client";

import { TranslationToolbar } from "./TranslationToolbar";

export interface ClientTranslationViewProps {
    languages: { code: string; name: string; }[]
}

export default function ClientTranslationView({ languages }: ClientTranslationViewProps) {
    return <div className="absolute w-full h-full flex flex-col flex-grow">
        <TranslationToolbar 
          languages={languages}
          onVerseChange={() => {}}
          onLinkWords={() => {}}
          onUnlinkWords={() => {}}
          approveAllGlosses={() => {}}
          canApproveAllGlosses={false}
          canLinkWords={false}
          canUnlinkWords={false}
        />
    </div>
}//}
