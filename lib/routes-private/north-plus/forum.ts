import { Data, Route } from '@/types';
import { config } from '@/config';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import timezone from '@/utils/timezone';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/north-plus/forum/:fid/:type?',
    example: '/private/north-plus/forum/6/3',
    features: {
        requireConfig: [
            {
                name: 'NORTHPLUS_COOKIE',
                optional: false,
                description: '南+ Cookie',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '南+',
    maintainers: ['SettingDust'],
    handler: async (ctx) => {
        const { fid, type } = ctx.req.param();
        const cookie = config.private.northplus.cookie;
        if (!cookie) {
            throw new Error('NORTHPLUS_COOKIE is not set');
        }
        const url = `https://north-plus.net/thread.php?fid-${fid}${type ? `-type-${type}` : ''}.html`;
        const html: string = await ofetch(url, {
            headers: {
                Cookie: cookie,
            },
        });
        const $ = load(html);
        let title = $('title').text();
        title = title.slice(0, Math.max(0, title.indexOf(' - '))).replace('| ', ' < ');
        if (type) {
            title = `${$('.threadlist .current > a').text()} < ${title}`;
        }
        return <Data>{
            title,
            description: $('meta[name="description"]').attr('content'),
            link: url,
            item: $('#ajaxtable > tbody:nth-child(2) > .tr2:eq(1) ~ .tr3')
                .toArray()
                .map((element) => {
                    const $this = $(element);
                    return {
                        title: $this.find('h3').text(),
                        link: $this.find('h3 > a').attr('href'),
                        pubDate: timezone(parseDate($this.find('.f10.gray2 ').text()), +8),
                        author: $this.find('a.bl').text(),
                    };
                }),
        };
    },
};
