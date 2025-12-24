import fs from "fs";
import path from "path";
import type { InterlinearChapterResult } from "../src/modules/export/data-access/InterlinearQueryService";
import { TextDirectionRaw } from "../src/modules/languages/model";

const sample: InterlinearChapterResult = {
  language: {
    id: "lang",
    code: "hbo",
    name: "Hebrew",
    textDirection: TextDirectionRaw.RTL,
  },
  verses: [
    {
      id: "v1",
      number: 1,
      words: [
        {
          id: "w1",
          text: "בְּרֵאשִׁית",
          gloss: "in the beginning",
          lemma: "רֵאשִׁית",
          grammar: "N-fs",
        },
        {
          id: "w2",
          text: "בָּרָא",
          gloss: "created",
          lemma: "בָּרָא",
          grammar: "V-Qal",
        },
        {
          id: "w3",
          text: "אֱלֹהִים",
          gloss: "God",
          lemma: "אֱלֹהִים",
          grammar: "N-mp",
        },
        {
          id: "w4",
          text: "אֵת",
          gloss: "[obj]",
          lemma: "אֵת",
          grammar: "P-obj",
        },
        {
          id: "w5",
          text: "הַשָּׁמַיִם",
          gloss: "the heavens",
          lemma: "שָׁמַיִם",
          grammar: "N-mp",
        },
        {
          id: "w6",
          text: "וְאֵת",
          gloss: "and [obj]",
          lemma: "וְאֵת",
          grammar: "C+P-obj",
        },
        {
          id: "w7",
          text: "הָאָרֶץ",
          gloss: "the earth",
          lemma: "אֶרֶץ",
          grammar: "N-fs",
        },
      ],
    },
    {
      id: "v2",
      number: 2,
      words: [
        {
          id: "w8",
          text: "וְהָאָרֶץ",
          gloss: "and the earth",
          lemma: "אֶרֶץ",
          grammar: "C+N-fs",
        },
        {
          id: "w9",
          text: "הָיְתָה",
          gloss: "was",
          lemma: "הָיָה",
          grammar: "V-Qal-3fs",
        },
        {
          id: "w10",
          text: "תֹהוּ",
          gloss: "formless",
          lemma: "תֹּהוּ",
          grammar: "N-ms",
        },
        {
          id: "w11",
          text: "וָבֹהוּ",
          gloss: "and void",
          lemma: "בֹּהוּ",
          grammar: "C+N-ms",
        },
        {
          id: "w12",
          text: "וְחֹשֶׁךְ",
          gloss: "and darkness",
          lemma: "חֹשֶׁךְ",
          grammar: "C+N-ms",
        },
        {
          id: "w13",
          text: "עַל־פְּנֵי",
          gloss: "over the surface of",
          lemma: "עַל־פְּנֵי",
          grammar: "P",
        },
        {
          id: "w14",
          text: "תְהוֹם",
          gloss: "the deep",
          lemma: "תְּהוֹם",
          grammar: "N-fs",
        },
        {
          id: "w15",
          text: "וְרוּחַ",
          gloss: "and the spirit/breath",
          lemma: "רוּחַ",
          grammar: "C+N-fs",
        },
        {
          id: "w16",
          text: "אֱלֹהִים",
          gloss: "of God",
          lemma: "אֱלֹהִים",
          grammar: "N-mp cstr",
        },
        {
          id: "w17",
          text: "מְרַחֶפֶת",
          gloss: "was hovering",
          lemma: "רָחַף",
          grammar: "V-Piel-ptc-fs",
        },
        {
          id: "w18",
          text: "עַל־פְּנֵי",
          gloss: "over the surface of",
          lemma: "עַל־פְּנֵי",
          grammar: "P",
        },
        {
          id: "w19",
          text: "הַמָּיִם",
          gloss: "the waters",
          lemma: "מַיִם",
          grammar: "N-mp",
        },
      ],
    },
  ],
};

async function main() {
  process.env.PDFKIT_DATA_DIR =
    process.env.PDFKIT_DATA_DIR ||
    path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");

  const layout =
    (process.env.INTERLINEAR_LAYOUT as "standard" | "parallel") || "standard";

  const { generateInterlinearPdf } = await import(
    "../src/modules/export/pdf/InterlinearPdfGenerator"
  );

  const { stream } = generateInterlinearPdf(sample, {
    layout,
    pageSize: "letter",
    direction: "rtl",
    header: { title: "Test Interlinear" },
  });

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk as any));
    }
  }
  const outPath = path.join(process.cwd(), "interlinear-sample.pdf");
  fs.writeFileSync(outPath, Buffer.concat(chunks.map((c) => Buffer.from(c))));
  // eslint-disable-next-line no-console
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
