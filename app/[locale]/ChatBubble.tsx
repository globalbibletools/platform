import Script from "next/script";

export default function ChatBubble({ placement }: { placement: 'bl' | 'br' }) {
    return <Script id="show-banner" strategy="lazyOnload">
      {`
        var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
        Tawk_API.customStyle = {
            visibility: {
                desktop: {
                    position: '${placement}',
                }
            },
        };
        (function(){
        var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
        s1.async=true;
        s1.src='https://embed.tawk.to/671d701f4304e3196ad8d17a/1ib5frv2r';
        s1.charset='UTF-8';
        s1.setAttribute('crossorigin','*');
        s0.parentNode.insertBefore(s1,s0);
        })();
      `}
    </Script>
}
