import { Data, Route } from '@/types';
import { config } from '@/config';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import timezone from '@/utils/timezone';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';
import logger from '@/utils/logger';

interface Response {
    count: number;
    index: string;
    pages: number;
    data: string;
}

export const route: Route = {
    path: '/vikacg/resources/:type',
    example: '/private/vikacg/resources/6?tags=avg&tags=动态',
    features: {
        requireConfig: [
            {
                name: 'VIKACG_COOKIE',
                optional: false,
                description: 'VikACG Cookie',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '维咔VikACG',
    maintainers: ['SettingDust'],
    handler: async (ctx) => {
        const { type } = ctx.req.param();
        const tags = ctx.req.queries('tags') ?? [];
        const cookie = config.private.vikacg.cookie;
        if (!cookie) {
            throw new Error('VIKACG_COOKIE is not set');
        }
        const typeData: Record<
            string | number,
            {
                name: string;
                optionName: string;
            }
        > = await cache.tryGet('vikacg:type', async () => {
            const data = await ofetch<string>('https://www.vikacg.com/assets/next/TqsZ2qEW.js');
            const trimmed = data.slice(data.indexOf(',a={') + 3, data.indexOf(';'));
            logger.error('Type data illegal', trimmed);
            if (!trimmed.startsWith('{') && !trimmed.endsWith('}')) {
                throw new Error(`Type data illegal ${trimmed}`);
            }
            // eslint-disable-next-line no-eval
            return eval(`(${trimmed})`);
        });

        const typeName = typeData[type];
        const typePath = typeName.optionName.replaceAll(/[A-Z]/g, (it) => `/${it.toLowerCase()}`);
        const url = `https://www.vikacg.com/${typePath}`;
        const $page = load(await cache.tryGet(`vikacg:description:${type}`, async () => await ofetch<string>(url)));

        const body = {
            paged: 1,
            post_paged: 1,
            post_count: 24,
            post_type: 'post-1',
            post_cat: [type],
            tags,
            post_order: 'modified',
            post_meta: ['user', 'date', 'des', 'cats'],
            metas: {},
        };
        const { data: itemsData } = await ofetch<Response>('https://www.vikacg.com/api/b2/v1/getPostList', {
            method: 'POST',
            headers: {
                Cookie: cookie,
            },
            body,
        });
        const $items = load(itemsData, null, false);
        return <Data>{
            title: `${typeName.name} ${tags.map((it) => `#${it}`).join(' ')} < 维咔 VikACG`,
            description: $page('meta[name="description"]').attr('content'),
            link: url,
            item: $items('li.post-list-item')
                .toArray()
                .map((element) => {
                    const $ = load(element, null, false);
                    return {
                        title: $('div.post-info > h2').text(),
                        link: $('div.post-info > h2 > a').attr('href'),
                        pubDate: timezone(parseDate($('time.b2timeago').attr('datetime')!), +8),
                        description: $('div.post-info > div.post-excerpt').text(),
                        author: $('a.post-list-meta-avatar').attr('href'),
                        category: [$('.post-list-cat').text()],
                        image: $('.post-module-thumb source').data('src'),
                    };
                }),
        };
    },
};
