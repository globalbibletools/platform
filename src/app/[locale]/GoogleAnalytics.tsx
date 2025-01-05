'use client';
import Script from "next/script"

declare global {
    interface Window {
        gtag: any
    }
}

export function trackClick(element_id: string) {
    window.gtag?.('event', 'element_click', { element_id }) 
}

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

                      gtag('config', 'G-0SEF50D4GK' ${debugMode ? ",{ 'anonymize_ip': true }" : ''});
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
