import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { ticker } = await params;
    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://seekingalpha.com/api/sa/combined/${ticker}.xml`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: response.status });
        }

        const xmlText = await response.text();

        // Very basic XML parsing using string matching since we're in Node.js
        // Extracting <item> blocks
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xmlText)) !== null && items.length < 10) {
            const itemHtml = match[1];

            const titleMatch = itemHtml.match(/<title>([\s\S]*?)<\/title>/);
            const linkMatch = itemHtml.match(/<link>([\s\S]*?)<\/link>/);
            const pubDateMatch = itemHtml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
            const authorMatch = itemHtml.match(/<sa:author_name>([\s\S]*?)<\/sa:author_name>/);

            // Exclude the symbol/news items which are just brief announcements, focus on Articles
            const link = linkMatch ? linkMatch[1].trim() : '';
            if (!link.includes('seekingalpha.com/article')) {
                continue;
            }

            items.push({
                title: titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'No Title',
                link: link,
                pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
                author: authorMatch ? authorMatch[1].trim() : 'Seeking Alpha Analyst'
            });

            if (items.length >= 5) break;
        }

        return NextResponse.json({ articles: items });

    } catch (error) {
        console.error('SeekingAlpha fetch error:', error);
        return NextResponse.json({ error: 'Failed to parse RSS' }, { status: 500 });
    }
}
