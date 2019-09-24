require('newrelic');

const moment = require('moment');
const fetch = require('node-fetch');

process.env.NTBA_FIX_319 = 1;

const TelegramBot = require('node-telegram-bot-api');

let nissanGtrList = [];


const blackList = ["2252680122", "6218218597", "6367032077", "4095468927",
    "3019796570", "3124883906", "3289537236", "10663404915", "1648529116",
    "2277468107", "7504919855", "8616366259", "401755398", "1398178705",
    "1589009317", "4487556982", "9392553899", "8482521782", "243001704",
    "3117988966", "243001704", "1729249996", "1121091288", "13811746268",
    "5938466398", "863727086", "5849357352", "321152988", "4211210442",
    "4632915617", "17461783368", "2309685226", "9031085917", "7798867374",
    "403624619", "5911240336", "404977516", "2369155882", "8559079805",
    "7991953827", "3187360479", "13984947986", "7352850050", "4200070420",
    "3584001259", "1366502378", "2305067206", "1579697259", "1075646139",
    "12132062326", "7207529175", "18072048320", "3719869750", "9236409807",
    "264486119", "9203804939", "1995344391", "186424576", "4093683954",
    "2256052755", "12132062326", "2990560961", "8659319803", "27323400",
    "2305067206", "2878462652", "9203804939", "6168336170", "10594081955",
    "1686362664", "45931238", "8050130364", "3673006141", "421012756",
    "11682391467", "19589373253", "243764827", "10900040038"
];

const stopWords = ['via', 'dm', 'tag', 'follow', 'pic', 'подпишись',
    'repost', 'tap', 'credits', 'credit', 'siga', 'подписывайся', 'forza',
    'visit', 'bio', 'golf', 'bmw', 'япония', 'www', 'рассрочка', 'opel',
    'honda', 'ford', 'audi'
];

const accessibilityWords = ['text', 'текс', 'человек', 'люди', 'people'];

const token = '846500630:AAHcIYj2O7ooF7H7m0p8Pwp0idmOVEaVW4c';
const bot = new TelegramBot(token, { polling: true });

bot.onText(/track-hashtag [A-Za-z0-9_]*/, (msg, match) => {
    const userId = msg.from.id;
    const hashtag = match[0].split(' ')[1];

    nissanGtrList.push({ userId, hashtag });

    bot.sendMessage(userId, `Started tracking hashtag: #${hashtag}`);
});

bot.onText(/stop [A-Za-z0-9_]*/, (msg, match) => {
    const userId = msg.from.id;
    const hashtag = match[0].split(' ')[1];

    nissanGtrList = nissanGtrList.filter(item => {
        if (item.hashtag === hashtag) {
            bot.sendMessage(userId, `Stopped tracking hashtag: #${hashtag}`);

            console.log(`Stopped tracking hashtag: #${hashtag}`);

            return false;
        } 

        return true;
    });
});

bot.on("polling_error", (err) => console.log(err));

setInterval(() => {
    for (let hashtag of nissanGtrList) {
        fetch(`https://www.instagram.com/explore/tags/${hashtag.hashtag}/?__a=1`)
            .then(res => res.json())
            .then(data => {
                let edges = data.graphql.hashtag.edge_hashtag_to_media.edges;

                let videoWithTheMostViews = edges.filter(post => (post.node.__typename === "GraphVideo"
                    && post.node.taken_at_timestamp > moment().subtract(30, 'minutes').unix()
                    && post.node.video_view_count > 1
                    && stopWords.filter(word => post.node.edge_media_to_caption.edges[0].node.text.toLowerCase().includes(word)).length === 0
                    && !blackList.includes(post.node.owner.id)))
                    .sort((a, b) => b.node.video_view_count - a.node.video_view_count)[0] || null;

                let imageWithTheMostLikes = edges.filter(post => (post.node.__typename === "GraphImage"
                    && post.node.taken_at_timestamp > moment().subtract(30, 'minutes').unix()
                    && post.node.edge_liked_by.count > 1
                    && stopWords.filter(word => post.node.edge_media_to_caption.edges[0].node.text.toLowerCase().includes(word)).length === 0
                    && accessibilityWords.filter(word => post.node.accessibility_caption.includes(word)).length === 0
                    && !blackList.includes(post.node.owner.id)))
                    .sort((a, b) => b.node.edge_liked_by.count - a.node.edge_liked_by.count)[0] || null;

                [videoWithTheMostViews, imageWithTheMostLikes].forEach(post => {
                    if (post !== null) {
                        bot.sendMessage(hashtag.userId, `https://www.instagram.com/p/${post.node.shortcode}/`);
                    }
                });
            })
            .catch(err => bot.sendMessage(hashtag.userId, err.message));
    }
}, 1800000);

