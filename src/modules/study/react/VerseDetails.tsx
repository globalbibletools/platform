"use client";

import { useState, Fragment } from "react";
import { Tab } from "@headlessui/react";
import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";

interface Verse {
  number: number;
}

export default function VerseDetails({
  chapterId,
  verse,
}: {
  chapterId: string;
  verse: Verse;
}) {
  const t = useTranslations("VerseDetails");
  const [tabIndex, setTabIndex] = useState(0);

  const bookId = parseInt(chapterId.slice(0, 2));
  const chapterNumber = parseInt(chapterId.slice(2, 5));

  return (
    <div className="absolute w-full h-full flex flex-col gap-4">
      <div className="flex items-start p-4 pb-0 gap-2">
        {t("reference", { bookId, chapterNumber, verseNumber: verse.number })}
        <Button variant="link">
          <Icon icon="arrow-up" />
        </Button>
        <Button variant="link">
          <Icon icon="arrow-down" />
        </Button>
      </div>

      <div className="grow flex flex-col min-h-0">
        <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
          <Tab.List className="flex flex-row items-end">
            <div className="border-b border-blue-800 dark:border-green-400 h-full w-2"></div>
            {[t("tabs.questions"), "Commentary"].map((title) => (
              <Fragment key={title}>
                <Tab
                  className="
                                  px-4 py-1 text-blue-800 font-bold rounded-t-lg border border-blue-800 ui-selected:border-b-transparent outline-green-300 focus-visible:outline outline-2
                                  dark:text-green-400 dark:border-green-400
                                "
                >
                  {title}
                </Tab>
                <div className="border-b border-blue-800 dark:border-green-400 h-full w-1"></div>
              </Fragment>
            ))}
            <div className="border-b border-blue-800 dark:border-green-400 h-full grow"></div>
          </Tab.List>
          <Tab.Panels className="overflow-y-auto grow px-4 pt-4 mb-4">
            <Tab.Panel>
              <ol className="px-4">
                <li className="font-mixed list-decimal mb-3">
                  <div className="mb-1">Τίς ἐστιν ὁ Παῦλος;</div>
                  <div className="text-sm ms-4">
                    Ὁ Παῦλός ἐστιν ὁ δέσµιος τοῦ Χριστοῦ Ἰησοῦ.
                  </div>
                </li>
                <li className="font-mixed list-decimal mb-3">
                  <div className="mb-1">Τίνος δέσµιός ἐστιν ὁ Παῦλος;</div>
                  <div className="text-sm ms-4">
                    Τοῦ Χριστοῦ Ἰησοῦ δέσµιός ἐστιν ὁ Παῦλος.
                  </div>
                </li>
                <li className="font-mixed list-decimal mb-3">
                  <div className="mb-1">
                    Μετὰ τίνος ὁ Παῦλος γράφει τὴν ἐπιστολὴν;
                  </div>
                  <div className="text-sm ms-4">
                    Μετὰ τοῦ Τιµοθέου γράφει ὁ Παῦλος τὴν ἐπιστολήν.
                  </div>
                </li>
              </ol>
            </Tab.Panel>
            <Tab.Panel>
              <p className="font-mixed">
                Ὁ µὲν Παῦλος ταὺτην τὴν ἐπιστολὴν ἔγραψε σὺν τῷ Τιµοθέῳ, αὐτὸς
                δὲ δέσµιος τοῦ Χριστοῦ Ἰησοῦ ἦν· νῦν δὲ ἔγραψε ταύτην τὴν
                ἐπιστολὴν ἐν τῇ φυλακῇ. Ὁ γὰρ δέσµιος ἦν ὑπὲρ τοῦ εὐαγγελίου τοῦ
                Χριστοῦ, οὐχ ὡς δέσµιος ἀνθρώπων µένων ἐν τῇ φυλακῇ τῶν Ῥωµαίων,
                ἀλλὰ ὡς τοῦ Χριστοῦ Ἰησοῦ. Δέδεται γὰρ διὰ τὸ κηρύσσειν τὸ
                εὐαγγέλιον τοῦ Χριστοῦ καὶ τὸ µαρτυρεῖν περὶ τῆς ζωῆς καὶ ἔργου
                τοῦ Ἰησοῦ Χριστοῦ· Ὁ δὲ Τιµόθεος ὁ ἀδελφὸς καὶ ὁ γράφων σὺν
                Παύλῳ· εἰργάζετο γὰρ ὥς κοινωνός τε καὶ συνεργὸς ἐν τῷ ἔργῳ τοῦ
                Χριστοῦ εὐαγγελίου. Ὁ δέ Φιλήµων ἐστιν ὁ δεχόµενος τὴν
                ἐπιστολήν. Ἡ γὰρ ἐπιστολὴ πρὸς αὐτὸν τὸν ἀγαπητὸν καὶ συνεργὸν
                ἐν Χριστῷ ἀπεστάλην ὑπὸ τοῦ Παύλου καὶ Τιµοθέου. Αὐτὸς δὲ
                καλεῖται ἀγαπητός, ὅτι λίαν ἀγαπᾶται ὑπὸ Παύλου καὶ Τιµοθέου·
                καὶ συνεργὸς ὅτι εἰργάζετο ἐν τοῖς ἔργοις τοῦ κυρίου σὺν ἄλλοις
                πιστοῖς ἐν Χριστῷ, µάλιστα δὲ ἐν τῇ κατ’ οἶκον αὐτοῦ ἐκκλησίᾳ ἐν
                ταῖς Κολοσσαῖς.{" "}
              </p>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}
