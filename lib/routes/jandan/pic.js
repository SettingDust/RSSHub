const got = require('@/utils/got');
const cheerio = require('cheerio');

const baseUrl = 'http://jandan.net/';

module.exports = async (ctx) => {
    const { sub_model } = ctx.params;

    const response = await got({
        method: 'get',
        url: `${baseUrl}${sub_model}/`,
        headers: {
            Referer: 'http://jandan.net',
        },
    });

    const $ = cheerio.load(response.data);
    const items = [];
    $('.commentlist > li').each((_, item) => {
        // Get current comment id, if comment_id is 'adsense', just need to skip..
        const comment_id = $(item).attr('id');
        if (comment_id === 'adsense') {
            return;
        }

        // Get current comment's link.
        const link = `https://jandan.net${$(item).find('.righttext').find('a').attr('href')}`;

        const imgList = [];
        $(item)
            .find('.view_img_link')
            .each((_, item) => {
                const imgUrl = $(item).attr('href');

                if (imgUrl !== undefined) {
                    imgList.push(imgUrl);
                }
            });
        if (imgList.length === 0) {
            return;
        }

        const text = $(item).find('.text p').text() || '';
        const post_author = $(item).find('.author strong').text() || '';
        const time_info = $(item).find('.author small').text() || '';
        const [, time_diff, time_interval, ] = time_info.match(/@?(\d*) ?([^ ]+) ?([^ ]+)/);
        const local_time = Date.now();

        let post_time;
        
        switch (time_interval) {
            case '秒':
            case 'seconds':
                post_time = new Date(local_time - time_diff * 1000).toUTCString();
                break;
            case '分钟':
            case 'minutes':
                post_time = new Date(local_time - time_diff * 1000 * 60).toUTCString();
                break;
            case '小时':
            case 'hours':
                post_time = new Date(local_time - time_diff * 1000 * 3600).toUTCString();
                break;
            case '天':
            case 'days':
                post_time = new Date(local_time - time_diff * 1000 * 3600 * 24).toUTCString();
                break;
            case '月':
            case 'months':
                post_time = new Date(local_time - time_diff * 1000 * 3600 * 24 * 30).toUTCString();
                break;
            case '年':
            case 'years':
                post_time = new Date(local_time - time_diff * 1000 * 3600 * 24 * 365).toUTCString();
                break;
            default:
                post_time = new Date(local_time).toUTCString();
                break;
        }

        // TODO: should load user's comments.

        items.push({
            guid: comment_id,
            title: `${comment_id}${text === '' ? '' : '/' + text}`,
            author: post_author,
            pubDate: post_time,
            description:
                `${text}<br>` +
                imgList.reduce((description, imgUrl) => {
                    description += `<img src="http:${imgUrl}"><br>`;
                    return description;
                }, ''),
            link,
        });
    });

    let rss_title;
    let description;

    switch (sub_model) {
        case 'pic':
            rss_title = '煎蛋无聊图';
            description = '煎蛋官方无聊图，无限活力的热门图区';
            break;

        case 'ooxx':
            rss_title = '煎蛋随手拍';
            description = '分享你的经典一刻';
            break;

        case 'zoo':
            rss_title = '煎蛋动物园';
            description = '专吸各种萌物';
            break;

        case 'girl':
            rss_title = '煎蛋女装图';
            description = '';
            break;

        case 'top-ooxx':
            rss_title = '煎蛋随手拍热榜';
            description = '手机相册中的有趣的图片';
            break;

        case 'top-4h':
            rss_title = '煎蛋4小时热榜';
            description = '煎蛋无聊图4小时热门排行榜';
            break;

        case 'top':
            rss_title = '煎蛋无聊图热榜';
            description = '煎蛋无聊图热门排行榜';
            break;

        default:
            rss_title = '未知内容';
            description = '未知内容，请前往 https://github.com/DIYgod/RSSHub/issues 提交 issue';
    }

    ctx.state.data = {
        title: `${rss_title}`,
        link: `${baseUrl}${sub_model}/`,
        description: `${description}`,
        item: items,
    };
};
