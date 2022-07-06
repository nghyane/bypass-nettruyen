const puppeteer = require('puppeteer');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const app = new Koa();
app.use(bodyParser());

(async () => {
    let options = {
        headless: true,
        args: [
            '--disable-speech-api', // 	Disables the Web Speech API (both speech recognition and synthesis)
            '--disable-background-networking', // Disable several subsystems which run network requests in the background. This is for use 									  // when doing network performance testing to avoid noise in the measurements. ↪
            '--disable-background-timer-throttling', // Disable task throttling of timer tasks from background pages. ↪
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-dev-shm-usage',
            '--disable-domain-reliability',
            '--disable-extensions',
            '--disable-features=AudioServiceOutOfProcess',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-notifications',
            '--disable-offer-store-unmasked-wallet-cards',
            '--disable-popup-blocking',
            '--disable-print-preview',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-setuid-sandbox',
            '--disable-sync',
            '--hide-scrollbars',
            '--ignore-gpu-blacklist',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-first-run',
            '--no-pings',
            '--no-sandbox',
            '--no-zygote',
            '--password-store=basic',
            '--use-gl=swiftshader',
            '--use-mock-keychain',
            '--no-sandbox', '--disable-setuid-sandbox', '--enable-experimental-web-platform-features'
        ]
    };

    const browser = await puppeteer.launch(options);
    app.use(async ctx => {
        if (ctx.query.url) {
            const url = ctx.url.replace("/?url=", "");
            const page = await browser.newPage();
            

            const blocked_domains = [
                'googlesyndication.com',
                'adservice.google.com',
                'googlesyndication.com',
                'googletagmanager.com',
                'gstatic.com',
                'adskeeper.co.uk'
            ];
            
            page.on('request', request => {
                const url = request.url()
                if (blocked_domains.some(domain => url.includes(domain))) {
                    return request.abort();
                }
                
                if ([ 'image', 'stylesheet', 'font' ].indexOf( request.resourceType() ) !== -1 ) {
                    return request.abort();
                } 
                
                request.continue();

            });

            await page.evaluateOnNewDocument(
                () => {
                    (function (attachShadow) {
                        Element.prototype.attachShadow = function () {
                            console.debug('is called');

                            if (arguments[0].mode !== 'open') {
                                arguments[0].mode = 'open';
                            }

                            return attachShadow.apply(this, arguments);
                        };
                    })(Element.prototype.attachShadow);
                }
            );
            
            await page.setCacheEnabled(true);
            await page.setRequestInterception(true)

            await page.goto(url); // điều hướng trang web theo URL
            await autoScroll(page, {waitUntil: 'domcontentloaded'});
            
            ctx.body = await page.evaluate(async () => {
                function extractHTML(node) {

                    // return a blank string if not a valid node
                    if (!node) return ''

                    // if it is a text node just return the trimmed textContent
                    if (node.nodeType === 3) return node.textContent.trim()

                    //beyond here, only deal with element nodes
                    if (node.nodeType !== 1) return ''

                    let html = ''

                    // clone the node for its outer html sans inner html
                    let outer = node.cloneNode()

                    // if the node has a shadowroot, jump into it
                    node = node.shadowRoot || node

                    if (node.children.length) {

                        // we checked for children but now iterate over childNodes
                        // which includes #text nodes (and even other things)
                        for (let n of node.childNodes) {

                            // if the node is a slot
                            if (n.assignedNodes) {

                                // an assigned slot
                                if (n.assignedNodes()[0]) {
                                    // Can there be more than 1 assigned node??
                                    html += extractHTML(n.assignedNodes()[0])

                                    // an unassigned slot
                                } else {
                                    html += n.innerHTML
                                }

                                // node is not a slot, recurse
                            } else {
                                html += extractHTML(n)
                            }
                        }

                        // node has no children
                    } else {
                        html = node.innerHTML
                    }

                    // insert all the (children's) innerHTML
                    // into the (cloned) parent element
                    // and return the whole package
                    outer.innerHTML = html
                    return outer.outerHTML

                }

                return extractHTML(document.body)
            });
            
        } else {
            ctx.body = "Please specify the URL in the 'url' query string.";
        }
    });
    app.listen(process.env.PORT || 3000);
})();

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {

            var totalHeight = 0;
            var distance = 1000;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight - window.innerHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}
