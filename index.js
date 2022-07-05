var express = require('express');
const {launch} = require("puppeteer");

async function autoScrollWithPuppeteer(url) {

    const browser = await launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }); // khởi tạo browser
    const page = await browser.newPage();  // tạo một trang web mới
    await page.setViewport({
        width: 1200,
        height: 800
    });

    await page.goto(url); // điều hướng trang web theo URL

    await autoScroll(page);

    var data = await page.content();


    await browser.close(); // đóng trang web

    return data;
}
async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
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
var app = express();

app.get('/', async function(req, res){
    const data = {
        'status': true,
        'res' : await autoScrollWithPuppeteer(req.query.url)
    };

    res.json(data);
});

app.listen(3000);


console.log("Listening on port 3000... ");
