'use client';
import Script from "next/script"

export default function GoogleAnalytics() {
    const debugMode = false

    return (
        <>
            <Script
                id="_next-ga-init"
                dangerouslySetInnerHTML={{
                    __html: `
                      window['dataLayer'] = window['dataLayer'] || [];
                      function gtag(){window['dataLayer'].push(arguments);}
                      gtag('js', new Date());

                      gtag('config', 'G-0SEF50D4GK' ${debugMode ? ",{ 'debug_mode': true }" : ''});
                      gtag('config', 'AW-618701668' ${debugMode ? ",{ 'debug_mode': true }" : ''});
                    `
                }}
            />
            <Script
                id="_next-ga"
                src={`https://www.googletagmanager.com/gtag/js?id=G-0SEF50D4GK`}
            />
        </>
    )
}
