"use client";

import * as z from "zod";
import { useState, Fragment } from "react";
import { Tab, TabPanels, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useTranslations } from "use-intl";
import { getVerseImmseriveContentReadModel } from "@/modules/bible-core/read-models/getVerseImmersiveContentReadModel";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

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
  const verseId = chapterId + verse.number.toString().padStart(3, "0");

  const { data, isLoading } = useQuery({
    queryKey: ["verse-content", verseId],
    queryFn: () =>
      getVerseContent({
        data: { verseId },
      }),
  });

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

const getVerseContent = createServerFn()
  .inputValidator(
    z.object({
      verseId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const d = await getVerseImmseriveContentReadModel(data.verseId);

    console.log(data.verseId, d);

    return d;
  });
