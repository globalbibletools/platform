import { query } from "@/db";
import ProgressChart from "./ProgressChart";
import { Icon } from "@/components/Icon";
import { verifySession } from "@/session";
import Image from "next/image";

export default async function LandingPage() {
  const [session, stats] = await Promise.all([
    verifySession(),
    fetchLanguageProgressStats(),
  ]);

  return (
    <div className="text-gray-800">
      <nav className="min-[800px]:sticky top-0 z-10 bg-white flex items-center h-20 border-b border-gray-200 relative shrink-0 px-4 md:px-8">
        <a href="#hero" className="flex items-center mr-2 md:mr-4 lg:mr-12">
          <Image
            src="https://assets.globalbibletools.com/landing/logo.png"
            className="w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14"
            alt="logo"
            width={440}
            height={440}
          />
          <h1 className="font-bold ms-2 text-base sm:text-lg lg:text-2xl">
            Global Bible Tools
          </h1>
        </a>
        <div className="grow md:grow-0"></div>
        <a
          className="h-full text-center hidden min-[800px]:block pt-[30px] font-bold mx-3"
          href="#vision"
        >
          Vision
        </a>
        <a
          className="h-full text-center hidden min-[800px]:block pt-[30px] font-bold mx-3"
          href="#contribute"
        >
          Contribute
        </a>
        <a
          className="h-full text-center hidden min-[800px]:block pt-[30px] font-bold mx-3"
          href="#progress"
        >
          Progress
        </a>
        <a
          className="h-full text-center hidden min-[800px]:block pt-[30px] font-bold mx-3"
          href="#about"
        >
          About
        </a>
        <div className="md:grow"></div>
        <a
          href={session ? "/dashboard" : "/read"}
          className="shrink-0 rounded-lg bg-blue-800 text-white font-bold shadow-md px-4 flex items-center justify-center h-8 md:mt-[4px] ms-1"
        >
          {session ? "Go to Dashboard" : "Reader's Bible"}
        </a>
      </nav>
      <main>
        <section id="hero" className="relative">
          <Image
            src="https://assets.globalbibletools.com/landing/hero.png"
            className="w-full brightness-90"
            alt=""
            width={1191}
            height={744}
          />
          <div className="absolute top-0 bottom-0 w-full flex flex-col items-center justify-center sm:mb-10 md:mb-20 px-8">
            <p className="text-white text-center font-bold text-md sm:text-lg md:text-xl lg:text-2xl max-w-[600px] mb-6 sm:mb-16">
              The global Church needs access to serious biblical language study
              tools without cost or hindrance.
            </p>
            <a
              className="rounded-lg bg-blue-800 text-white font-bold shadow-xl px-4 md:px-6 lg:px-8 flex items-center justify-center h-8 md:h-10 lg:h-12 md:text-lg lg:text-xl"
              href="#vision"
            >
              Learn More
            </a>
          </div>
        </section>
        <section
          id="vision"
          className="bg-brown-100 pt-12 md:pt-16 lg:pt-24 pb-32 px-6 md:px-8"
        >
          <div className="w-full max-w-[1000px] mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Vision</h2>
            <div className="relative w-full shadow-lg mb-8">
              <div className="pb-[56.25%]" />
              <video
                className="absolute h-full w-full top-0"
                controls
                poster="https://assets.globalbibletools.com/landing/info.jpg"
              >
                <source
                  type="video/mp4"
                  src="https://assets.globalbibletools.com/landing/info.mp4"
                />
              </video>
            </div>
            <div className="flex justify-center mb-16">
              <a
                className="font-bold text-blue-800 underline"
                href="https://docs.google.com/document/d/1PfgkStvqrCJutpcQzq73zN_fZkfl17zs3MdQIhT3xg4/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prefer to Read? <Icon icon="external-link" />
              </a>
            </div>
            <div className="grid grid-rows-[auto_1fr_1fr_auto_1fr_1fr_1fr] md:grid-rows-[auto_1fr_1fr_1fr] grid-cols-1 md:grid-cols-2 grid-flow-col gap-8 lg:gap-x-16">
              <h3 className="text-center text-xl font-bold border-b-4 border-black pb-2 mx-4">
                Language Learning
              </h3>
              <div className="rounded-[16px] bg-white p-6 shadow-sm">
                <h4 className="text-lg font-bold mb-3">Language Lessons</h4>
                <p>
                  YouTube courses{" "}
                  <a
                    className="font-bold text-blue-800 underline"
                    href="https://www.youtube.com/@AlephwithBeth"
                  >
                    Aleph with Beth
                  </a>{" "}
                  and{" "}
                  <a
                    className="font-bold text-blue-800 underline"
                    href="https://www.youtube.com/@AlphawithAngela"
                  >
                    Alpha with Angela
                  </a>{" "}
                  provide free Greek and Hebrew training to everyone.
                </p>
              </div>
              <div className="rounded-[16px] bg-white p-6 shadow-sm">
                <h4 className="text-lg font-bold mb-3">Reader&apos;s Bible</h4>
                <p>
                  A digital reader’s Bible helps language learners accelerate
                  their comprehension by reading the biblical text with
                  assistance.
                </p>
              </div>
              <h3 className="text-center text-xl font-bold border-b-4 border-black pb-2 mx-4 md:col-start-2">
                Biblical Study
              </h3>
              <div className="rounded-[16px] bg-white p-6 shadow-sm md:col-start-2">
                <h4 className="text-lg font-bold mb-3">Lexicons</h4>
                <p>
                  Lexicons are needed in biblical study to explore the range of
                  meaning for Greek and Hebrew words.
                </p>
              </div>
              <div className="rounded-[16px] bg-white p-6 shadow-sm md:col-start-2">
                <h4 className="text-lg font-bold mb-3">Grammars</h4>
                <p>
                  Grammars are used in biblical study to learn the structure of
                  the biblical languages.
                </p>
              </div>
              <div className="rounded-[16px] bg-white p-6 shadow-sm md:col-start-2">
                <h4 className="text-lg font-bold mb-3">Text Critical Notes</h4>
                <p>
                  Text critical notes contribute to biblical study by explaining
                  the differences in the manuscript witness to the biblical
                  text.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="contribute"
          className="bg-blue-800 -mt-10 pt-20 md:pt-24 pb-40 px-6 md:px-8"
          style={{
            clipPath: "polygon(0 0, 100% 40px, 100% 100%, 0 100%)",
          }}
        >
          <div className="w-full max-w-[1000px] mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white text-white">
              Contribute
            </h2>
            <ul className="flex flex-col md:grid grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm md:text-center">
                <h4 className="text-lg font-bold mb-3">Pray</h4>
                <p>
                  Please pray for the translators, software engineers, and
                  others in this work.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm md:text-center">
                <h4 className="text-lg font-bold mb-3">Give</h4>
                <p>
                  Give through{" "}
                  <a
                    className="font-bold text-blue-800 underline"
                    href="https://www.zeffy.com/en-US/donation-form/give-biblical-language-tools-to-the-world"
                  >
                    Betheden Ministries
                  </a>{" "}
                  to support translators and ongoing software development.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm md:text-center">
                <h4 className="text-lg font-bold mb-3">Stay Informed</h4>
                <p>
                  Sign up for our{" "}
                  <a
                    className="font-bold text-blue-800 underline"
                    href="https://www.zeffy.com/en-US/newsletter-form/get-updates-on-global-bible-tools"
                  >
                    newsletter
                  </a>{" "}
                  to receive future updates on what we are working on.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm md:text-center">
                <h4 className="text-lg font-bold mb-3">Translation</h4>
                <p>
                  If you can help translate glosses for the Reader&apos;s Hebrew
                  or Greek Bible, please{" "}
                  <a
                    className="font-bold text-blue-800 underline"
                    href="https://docs.google.com/forms/d/e/1FAIpQLSer70LItS-738tlwL3bDuku1qRpoWTmQBNfFd9b3NbPIH3G9w/viewform"
                  >
                    fill out this form
                  </a>
                  .
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm md:text-center">
                <h4 className="text-lg font-bold mb-3">Software Development</h4>
                <p>
                  If you can help with software development or UI design, check
                  out our{" "}
                  <a
                    className="font-bold text-blue-800 underline"
                    href="https://github.com/globalbibletools/platform"
                  >
                    GitHub repository
                  </a>
                  .
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm md:text-center">
                <h4 className="text-lg font-bold mb-3">Resources</h4>
                <p>
                  If you have original language study resources you would like
                  to contribute or help digitize, contact{" "}
                  <a
                    className="font-bold text-blue-800 underline"
                    href="mailto:andrewdcase@gmail.com"
                  >
                    Andrew Case
                  </a>
                  .
                </p>
              </li>
            </ul>
            <div className="relative w-full shadow-lg">
              <div className="pb-[56.25%]" />
              <video
                className="absolute h-full w-full top-0"
                controls
                poster="https://assets.globalbibletools.com/landing/contributing.jpg"
              >
                <source
                  type="video/mp4"
                  src="https://assets.globalbibletools.com/landing/contributing.mp4"
                />
              </video>
            </div>
          </div>
        </section>
        <section
          id="progress"
          className="bg-brown-100 -mt-10 pt-20 md:pt-24 pb-40 px-6 md:px-8"
          style={{
            clipPath: "polygon(0 40px, 100% 0, 100% 100%, 0 100%)",
          }}
        >
          <div className="w-full max-w-[1000px] mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Progress</h2>
            <div className="bg-white rounded-[16px] shadow-sm p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg text-center font-bold mb-4">
                Reader&apos;s Bible Translation
              </h3>
              <ProgressChart languageStats={stats} />
            </div>
          </div>
        </section>
        <section
          id="about"
          className="bg-blue-800 -mt-10 pt-20 md:pt-24 pb-8 md:pb-12 lg:pb-16 px-6 md:px-8"
          style={{
            clipPath: "polygon(0 0, 100% 40px, 100% 100%, 0 100%)",
          }}
        >
          <div className="w-full max-w-[1000px] mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white">
              About
            </h2>
            <p className="mb-4 text-white">
              Andrew and Bethany Case are the founders of Betheden Ministries,
              which is the non-profit behind Global Bible Tools. Our purpose is
              to help see the whole Bible in every language, and the global
              Church equipped for growth and maturity. In the western world we
              have an “embarrassment of riches.” We have thousands of biblical
              resources one click away, and in the language we understand best.
              Meanwhile, there are millions of people in other countries who
              don’t even have a Bible in their mother tongue. We believe that
              knowledge of the biblical languages is one of the most fundamental
              needs of every church around the world. It is the foundation of
              theology, sound interpretation, and healthy churches. So our goal
              is to empower the global Church with the biblical languages, as
              well as train and serve the Bible translation effort.
            </p>
            <div className="text-white flex flex-wrap gap-8 justify-center mb-8">
              <a
                className="font-bold underline"
                href="https://freehebrew.online/statement-of-faith/"
              >
                Statement of Faith <Icon icon="external-link" />
              </a>
              <a
                className="font-bold underline"
                href="https://hismagnificence.com/betheden-ministries-constitution/"
              >
                Constitution <Icon icon="external-link" />
              </a>
            </div>
            <h3 className="text-center text-xl font-bold border-b-4 border-white pb-2 mx-4 text-white mb-8">
              Core Values
            </h3>
            <ul className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm sm:text-center">
                <h4 className="text-lg font-bold mb-3">Pursuit of Joy</h4>
                <p>
                  All of life should be lived, not out of fear, but as a pursuit
                  of joy in God.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm sm:text-center">
                <h4 className="text-lg font-bold mb-3">Partnership</h4>
                <p>
                  Because Scripture teaches that we are part of a larger Body,
                  we seek to work with others through strategic, genuine
                  relationships.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm sm:text-center">
                <h4 className="text-lg font-bold mb-3">Eagerness to Learn</h4>
                <p>
                  We want to innovate with excellence, which requires continuous
                  curiosity and study.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm sm:text-center">
                <h4 className="text-lg font-bold mb-3">Humility</h4>
                <p>
                  Our hope is to serve the global Church, which requires the
                  humility to put them first, listen to their needs, understand
                  them well, and provide them with the best we can offer by
                  God’s grace.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm sm:text-center">
                <h4 className="text-lg font-bold mb-3">Freely Giving</h4>
                <p>
                  Because we have received everything from God as a gift, we are
                  committed to making all of our content free and open-access to
                  everyone, and encouraging others to do the same.
                </p>
              </li>
              <li className="w-full rounded-[16px] bg-white p-6 shadow-sm sm:text-center">
                <h4 className="text-lg font-bold mb-3">
                  Empowering the Under-Resourced
                </h4>
                <p>
                  Because many non-Western Christians still suffer the lack of
                  quality biblical resources, we endeavor to prioritize giving
                  them access to these resources.
                </p>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

interface LanguageProgressStats {
  code: string;
  englishName: string;
  localName: string;
  otProgress: number;
  ntProgress: number;
}

async function fetchLanguageProgressStats() {
  const result = await query<LanguageProgressStats>(
    `SELECT l.code, l.english_name AS "englishName", l.local_name AS "localName", COALESCE(s.ot_progress, 0) AS "otProgress", COALESCE(s.nt_progress, 0) AS "ntProgress" FROM language AS l
        LEFT JOIN language_progress AS s ON l.code = s.code
        ORDER BY (s.ot_progress + s.nt_progress) DESC
        `,
    [],
  );
  return result.rows;
}
