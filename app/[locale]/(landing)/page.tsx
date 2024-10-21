import { query } from "@/shared/db"
import ProgressChart from "./ProgressChart"

export default async function LandingPage() {
    const stats = await fetchLanguageProgressStats()

    return <div className="flex flex-col h-screen text-gray-800">
        <nav
            className="bg-white flex items-center h-20 border-b border-gray-200 relative flex-shrink-0 px-4 md:px-8"
        >
            <a href="#hero" className="flex items-center mr-8 lg:mr-12">
                <img
                    src="/bet-scroll.png"
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14"
                />
                <h1 className="font-bold ms-2 text-base sm:text-lg lg:text-2xl">
                    Global Bible Tools
                </h1>
            </a>
            <div className="flex-grow md:flex-grow-0"></div>
            <a
                className="h-full text-center hidden md:block pt-[30px] font-bold mx-3"
                href="#resources"
            >
                Resources
            </a>
            <a
                className="h-full text-center hidden md:block pt-[30px] font-bold mx-3"
                href="#progress"
            >
                Progress
            </a>
            <a
                className="h-full text-center hidden md:block pt-[30px] font-bold mx-3"
                href="#volunteer"
            >
                Volunteer
            </a>
            <a
                className="h-full text-center hidden md:block pt-[30px] font-bold mx-3"
                href="#go-deeper"
            >
                Go Deeper
            </a>
            <div className="md:flex-grow"></div>
            <a
                href="/read"
                className="rounded-lg bg-blue-800 text-white font-bold shadow-md px-4 flex items-center justify-center h-8 md:mt-[4px] ms-1"
            >
                Interlinear
            </a>
        </nav>
        <main className="flex-grow overflow-auto">
            <section id="hero" className="relative">
                <img src="/hero.png" className="w-full" />
                <div
                    className="absolute top-0 bottom-0 w-full flex flex-col items-center justify-center sm:mb-10 md:mb-20 px-8"
                >
                    <p
                        className="text-white text-center font-bold text-md sm:text-lg md:text-xl lg:text-2xl max-w-[600px] mb-6 sm:mb-16"
                    >
                        The global Church needs access to serious biblical language study
                        tools without cost or hindrance.
                    </p>
                    <a
                        className="rounded-lg bg-blue-800 text-white font-bold shadow-xl px-4 md:px-6 lg:px-8 flex items-center justify-center h-8 md:h-10 lg:h-12 md:text-lg lg:text-xl"
                        href="#resources"
                    >
                        Learn More
                    </a>
                </div>
            </section>
            <section
                id="resources"
                className="relative bg-brown-100 pt-12 md:pt-16 lg:pt-24 pb-32 px-6 md:px-8"
            >
                <div className="w-full max-w-[1000px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8">Resources</h2>
                    <p className="mb-8">
                        The following resources are essential for language learning and
                        biblical study. Currently these resources are only available in a
                        handful of even the largest languages.
                    </p>
                    <div
                        className="grid grid-rows-[auto_1fr_1fr_auto_1fr_1fr_1fr] md:grid-rows-[auto_1fr_1fr_1fr] grid-cols-1 md:grid-cols-2 grid-flow-col gap-8 lg:gap-x-16"
                    >
                        <h3
                            className="text-center text-xl font-bold border-b-4 border-black pb-2 mx-4"
                        >
                            Language Learning
                        </h3>
                        <div className="rounded-[16px] bg-white p-6 shadow">
                            <h4 className="text-lg font-bold mb-3">Language Lessons</h4>
                            <p>
                                YouTube courses <a
                                    className="font-bold text-blue-800 underline"
                                    href="https://www.youtube.com/@AlephwithBeth"
                                >Aleph with Beth</a> and <a
                                    className="font-bold text-blue-800 underline"
                                    href="https://www.youtube.com/@AlphawithAngela"
                                >Alpha with Angela</a> provide free Greek and Hebrew training to everyone.
                            </p>
                        </div>
                        <div className="rounded-[16px] bg-white p-6 shadow">
                            <h4 className="text-lg font-bold mb-3">Reader&apos;s Bible</h4>
                            <p>
                                A digital reader’s Bible helps language learners accelerate
                                their comprehension by reading the biblical text with
                                assistance.
                            </p>
                        </div>
                        <h3
                            className="text-center text-xl font-bold border-b-4 border-black pb-2 mx-4 md:col-start-2"
                        >
                            Biblical Study
                        </h3>
                        <div className="rounded-[16px] bg-white p-6 shadow md:col-start-2">
                            <h4 className="text-lg font-bold mb-3">Lexicons</h4>
                            <p>
                                Lexicons are needed in biblical study to explore the range of
                                meaning for Greek and Hebrew words.
                            </p>
                        </div>
                        <div className="rounded-[16px] bg-white p-6 shadow md:col-start-2">
                            <h4 className="text-lg font-bold mb-3">Grammars</h4>
                            <p>
                                Grammars are used in biblical study to learn the structure of
                                the biblical languages.
                            </p>
                        </div>
                        <div className="rounded-[16px] bg-white p-6 shadow md:col-start-2">
                            <h4 className="text-lg font-bold mb-3">Text Critical Notes</h4>
                            <p>
                                Text critical notes contribute to biblical study by explaining
                                the differences in the manuscript witness to the biblical text.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <section
                id="progress"
                className="bg-blue-800 -mt-10 pt-20 md:pt-24 pb-40 px-6 md:px-8"
                style={{ clipPath: 'polygon(0 0, 100% 40px, 100% 100%, 0 100%)' }}
            >
                <div className="w-full max-w-[1000px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white text-white">Reader&apos;s Bible Progress</h2>
                    <div className="bg-white rounded-lg shadow p-6 max-h-[80vh] overflow-y-auto">
                        <ProgressChart languageStats={stats} />
                    </div>
                </div>
            </section>
            <section
                id="volunteer"
                className="bg-brown-100 -mt-10 pt-20 md:pt-24 pb-16 md:pb-24 lg:pb-32 px-6 md:px-8"
                style={{ clipPath: 'polygon(0 40px, 100% 0, 100% 100%, 0 100%)' }}
            >
                <div className="w-full max-w-[1000px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8">
                        Volunteer
                    </h2>
                    <ul
                        className="flex flex-col items-stretch md:flex-row md:justify-between gap-8"
                    >
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow md:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Software Development</h4>
                            <p>
                                If you can help with software development or UI design, check
                                out our <a
                                    className="font-bold text-blue-800 underline"
                                    href="https://github.com/globalbibletools/gbt"
                                >GitHub repository</a>.
                            </p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow md:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Translation</h4>
                            <p>
                                If you can help translate lexicons, grammars, and other
                                resources into other languages, contact <a
                                    className="font-bold text-blue-800 underline"
                                    href="mailto:andrewdcase@gmail.com"
                                >Andrew Case</a>.
                            </p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow md:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Resources</h4>
                            <p>
                                If you have original language study resources you would like to
                                contribute or help digitize, contact <a
                                    className="font-bold text-blue-800 underline"
                                    href="mailto:andrewdcase@gmail.com"
                                >Andrew Case</a>.
                            </p>
                        </li>
                    </ul>
                </div>
            </section>
            <section
                id="go-deeper"
                className="bg-blue-800 -mt-10 pt-20 md:pt-24 pb-40 px-6 md:px-8"
                style={{ clipPath: 'polygon(0 0, 100% 40px, 100% 100%, 0 100%)' }}
            >
                <div className="w-full max-w-[1000px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white text-white">Go Deeper</h2>
                    <p className="text-white">
                        This is a significant need and endeavor for the global Church. We
                        invite you to <a
                            className="font-bold text-white underline"
                            href="https://docs.google.com/document/d/1PfgkStvqrCJutpcQzq73zN_fZkfl17zs3MdQIhT3xg4/"
                        >read the introduction</a> to our vision and roadmap for democratizing access to serious
                        bibilical language tools.
                    </p>
                </div>
            </section>
        </main>
    </div>
}

interface LanguageProgressStats {
    code: string
    name: string
    otProgress: number
    ntProgress: number
}

async function fetchLanguageProgressStats() {
    const result = await query<LanguageProgressStats>(
        `
        SELECT l.code, l.name, COALESCE(s."otProgress", 0) AS "otProgress", COALESCE(s."ntProgress", 0) AS "ntProgress" FROM "Language" AS l
        LEFT JOIN "LanguageProgress" AS s ON l.code = s.code
        ORDER BY (s."otProgress" + s."ntProgress") DESC
        `,
        []
    )
    return result.rows
}
