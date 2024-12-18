import { query } from "@/shared/db"
import ProgressChart from "./ProgressChart"
import { Icon } from "@/app/components/Icon"

export default async function LandingPage() {
    const stats = await fetchLanguageProgressStats()

    return <div className="flex flex-col h-screen text-gray-800">
        <nav
            className="bg-white flex items-center h-20 border-b border-gray-200 relative flex-shrink-0 px-4 md:px-8"
        >
            <a href="#hero" className="flex items-center mr-2 md:mr-4 lg:mr-12">
                <img
                    src="/bet-scroll.png"
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14"
                />
                <h1 className="font-bold ms-2 text-base sm:text-lg lg:text-2xl">
                    Global Bible Tools
                </h1>
            </a>
            <div className="flex-grow md:flex-grow-0"></div>
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
            <div className="md:flex-grow"></div>
            <a
                href="/read"
                className="rounded-lg bg-blue-800 text-white font-bold shadow-md px-4 flex items-center justify-center h-8 md:mt-[4px] ms-1"
            >
                Reader&apos;s Bible
            </a>
        </nav>
        <main className="flex-grow overflow-auto">
            <section id="hero" className="relative">
                <img src="/hero.png" className="w-full brightness-90" />
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
                        <iframe
                            className="absolute h-full w-full top-0"
                            src="https://www.youtube.com/embed/Zern2kzSqk4?si=HQ2IkbtiiplE0LYd&amp;rel=0"
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        />
                    </div>
                    <div className="flex justify-center mb-16">
                        <a
                            className="font-bold text-blue-800 underline"
                            href="https://docs.google.com/document/d/1PfgkStvqrCJutpcQzq73zN_fZkfl17zs3MdQIhT3xg4/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >Prefer to Read? <Icon icon="external-link" /></a>
                    </div>
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
                id="contribute"
                className="bg-blue-800 -mt-10 pt-20 md:pt-24 pb-40 px-6 md:px-8"
                style={{ clipPath: 'polygon(0 0, 100% 40px, 100% 100%, 0 100%)' }}
            >
                <div className="w-full max-w-[1000px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white text-white">Contribute</h2>
                    <ul
                        className="flex flex-col md:grid lg:flex lg:flex-row grid-cols-2  gap-8 mb-8"
                    >
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow md:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Give</h4>
                            <p>
                                Please give through <a
                                    className="font-bold text-blue-800 underline"
                                    href="https://freehebrew.online/give/"
                                >Betheden Ministries</a> to fund this work.
                                Email <a
                                    className="font-bold text-blue-800 underline"
                                    href="mailto:andrewdcase@gmail.com"
                                >Andrew Case</a> to indicate that your donation is for Global Bible Tools.
                            </p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow md:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Software Development</h4>
                            <p>
                                If you can help with software development or UI design, check
                                out our <a
                                    className="font-bold text-blue-800 underline"
                                    href="https://github.com/globalbibletools/platform"
                                >GitHub repository</a>.
                            </p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow md:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Reader&apos;s Bible</h4>
                            <p>
                                If you can help translate glosses for the Reader's Hebrew or Greek Bible, please <a
                                    className="font-bold text-blue-800 underline"
                                    href="https://docs.google.com/forms/d/e/1FAIpQLSer70LItS-738tlwL3bDuku1qRpoWTmQBNfFd9b3NbPIH3G9w/viewform"
                                >fill out this form</a>.
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
                id="progress"
                className="bg-brown-100 -mt-10 pt-20 md:pt-24 pb-40 px-6 md:px-8"
                style={{ clipPath: 'polygon(0 40px, 100% 0, 100% 100%, 0 100%)' }}
            >
                <div className="w-full max-w-[1000px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8">
                        Progress
                    </h2>
                    <div className="bg-white rounded-[16px] shadow p-6 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg text-center font-bold mb-4">Reader&apos;s Bible Translation</h3>
                        <ProgressChart languageStats={stats} />
                    </div>
                </div>
            </section>
            <section
                id="about"
                className="bg-blue-800 -mt-10 pt-20 md:pt-24 pb-8 md:pb-12 lg:pb-16 px-6 md:px-8"
                style={{ clipPath: 'polygon(0 0, 100% 40px, 100% 100%, 0 100%)' }}
            >
                <div className="w-full max-w-[1000px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white">About</h2>
                    <p className="mb-4 text-white">
                        Andrew and Bethany Case are the founders of Betheden Ministries, which is the non-profit behind Global Bible Tools. Our purpose is to help see the whole Bible in every language, and the global Church equipped for growth and maturity. In the western world we have an “embarrassment of riches.” We have thousands of biblical resources one click away, and in the language we understand best. Meanwhile, there are millions of people in other countries who don’t even have a Bible in their mother tongue. We believe that knowledge of the biblical languages is one of the most fundamental needs of every church around the world. It is the foundation of theology, sound interpretation, and healthy churches. So our goal is to empower the global Church with the biblical languages, as well as train and serve the Bible translation effort. 
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
                    <h3
                        className="text-center text-xl font-bold border-b-4 border-white pb-2 mx-4 text-white mb-8"
                    >
                        Core Values
                    </h3>
                    <ul
                        className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
                    >
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow sm:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Pursuit of Joy</h4>
                            <p>All of life should be lived, not out of fear, but as a pursuit of joy in God.</p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow sm:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Partnership</h4>
                            <p>Because Scripture teaches that we are part of a larger Body, we seek to work with others through strategic, genuine relationships.</p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow sm:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Eagerness to Learn</h4>
                            <p>We want to innovate with excellence, which requires continuous curiosity and study.</p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow sm:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Humility</h4>
                            <p>Our hope is to serve the global Church, which requires the humility to put them first, listen to their needs, understand them well, and provide them with the best we can offer by God’s grace.</p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow sm:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Freely Giving</h4>
                            <p>Because we have received everything from God as a gift, we are committed to making all of our content free and open-access to everyone, and encouraging others to do the same.</p>
                        </li>
                        <li
                            className="w-full rounded-[16px] bg-white p-6 shadow sm:text-center"
                        >
                            <h4 className="text-lg font-bold mb-3">Empowering the Under-Resourced</h4>
                            <p>Because many non-Western Christians still suffer the lack of quality biblical resources, we endeavor to prioritize giving them access to these resources.</p>
                        </li>
                    </ul>
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
        `SELECT l.code, l.name, COALESCE(s."otProgress", 0) AS "otProgress", COALESCE(s."ntProgress", 0) AS "ntProgress" FROM "Language" AS l
        LEFT JOIN "LanguageProgress" AS s ON l.code = s.code
        ORDER BY (s."otProgress" + s."ntProgress") DESC
        `,
        []
    )
    return result.rows
}
