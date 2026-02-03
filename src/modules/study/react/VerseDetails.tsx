"use client";

import { useState, Fragment } from "react";
import { Tab, TabPanels, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { VerseImmersiveContentReadModel } from "@/modules/bible-core/read-models/getVerseImmersiveContentReadModel";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";

interface Verse {
  number: number;
}

export default function VerseDetails({
  chapterId,
  verse,
  verseCount,
  onSelectedVerseChange,
}: {
  chapterId: string;
  verse: Verse;
  verseCount: number;
  onSelectedVerseChange?(verseId: string): void;
}) {
  const t = useTranslations("VerseDetails");
  const [tabIndex, setTabIndex] = useState(0);

  const bookId = parseInt(chapterId.slice(0, 2));
  const chapterNumber = parseInt(chapterId.slice(2, 5));

  const { data, isLoading } = useSWR(
    ["verse-content", chapterId, verse.number],
    async ([, chapterId, verseNumber]) => {
      const verseId = `${chapterId}${verseNumber.toString().padStart(3, "0")}`;
      const response = await fetch(
        `${window.location.pathname}/api/verses/${verseId}`,
      );
      return (await response.json()) as Promise<
        VerseImmersiveContentReadModel | undefined
      >;
    },
  );

  return (
    <div className="absolute w-full h-full flex flex-col gap-4">
      <div className="flex items-start p-4 pb-0">
        {t("reference", { bookId, chapterNumber, verseNumber: verse.number })}
        <Button
          variant="link"
          className="ms-2 w-6"
          disabled={verse.number === 1}
          onClick={() =>
            onSelectedVerseChange?.(
              `${chapterId}${(verse.number - 1).toString().padStart(3, "0")}`,
            )
          }
        >
          <Icon icon="arrow-up" />
          <span className="sr-only">Previous Verse</span>
        </Button>
        <Button
          variant="link"
          className="w-6"
          disabled={verse.number === verseCount}
          onClick={() =>
            onSelectedVerseChange?.(
              `${chapterId}${(verse.number + 1).toString().padStart(3, "0")}`,
            )
          }
        >
          <Icon icon="arrow-down" />
          <span className="sr-only">Next Verse</span>
        </Button>
      </div>

      <div className="grow flex flex-col min-h-0">
        <TabGroup as={Fragment} selectedIndex={tabIndex} onChange={setTabIndex}>
          <TabList className="flex flex-row items-end">
            <div className="border-b border-blue-800 dark:border-green-400 h-full w-2"></div>
            {[t("tabs.questions"), "Commentary"].map((title) => (
              <Fragment key={title}>
                <Tab
                  className="
                                  px-4 py-1 text-blue-800 font-bold rounded-t-lg border border-blue-800 data-selected:border-b-transparent outline-green-300 focus-visible:outline-2
                                  dark:text-green-400 dark:border-green-400
                                "
                >
                  {title}
                </Tab>
                <div className="border-b border-blue-800 dark:border-green-400 h-full w-1"></div>
              </Fragment>
            ))}
            <div className="border-b border-blue-800 dark:border-green-400 h-full grow"></div>
          </TabList>
          <TabPanels className="overflow-y-auto grow px-4 pt-4 mb-4">
            <TabPanel>
              {(() => {
                if (isLoading) {
                  return <LoadingSpinner />;
                } else if (data) {
                  return (
                    <ol className="font-mixed">
                      {data.questions.map((question, i) => (
                        <li key={i} className="mb-6">
                          <div className="mb-1">
                            <span>{i + 1}.</span> {question.question}
                          </div>
                          <div className="italic">{question.response}</div>
                        </li>
                      ))}
                    </ol>
                  );
                }
              })()}
            </TabPanel>
            <TabPanel>
              {(() => {
                if (isLoading) {
                  return <LoadingSpinner />;
                } else if (data) {
                  return <p className="font-mixed">{data.commentary}</p>;
                }
              })()}
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
