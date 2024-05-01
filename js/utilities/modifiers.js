/** @type {KeywordModifier[]} */
let MODIFIERS = [];

MODIFIERS.push({
    name: 'casesensitive',
    aliases: ['case', 'cs'],
    optionChanger: true,
    check: (info, value, options, negative) => {
        options.caseSensitive = negative ? false : true;
    }
});

MODIFIERS.push({
    name: 'exact',
    aliases: ['em', 'exactmatch'],
    optionChanger: true,
    check: (info, value, options, negative) => {
        options.exactMatch = negative ? false : true;
    }
});

MODIFIERS.push({
    name: 'bound',
    aliases: ['wb', 'word', 'boundary', 'wordboundaru', 'wordbound'],
    optionChanger: true,
    check: (info, value, options, negative) => {
        options.wordBoundary = negative ? false : true;
    }
});

MODIFIERS.push({
    name: 'isplaylistvideo',
    aliases: ['pv', 'fromplaylist'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;
        return videoInfo.isFromPlaylist;
    }
});

MODIFIERS.push({
    name: 'shorts',
    aliases: ['short'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;

        return videoInfo.isShorts;
    }
});

MODIFIERS.push({
    name: 'live',
    aliases: ['lives', 'is-live', 'islive'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;

        return videoInfo.isLive;
    }
});

MODIFIERS.push({
    name: 'premiere',
    aliases: ['ispremiere', 'is-premiere', 'upcoming', 'is-upcoming'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;

        return videoInfo.isPremiere;
    }
});

MODIFIERS.push({
    name: 'duration',
    aliases: ['length', 'leng', 'greater'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;
        if (!videoInfo.duration) return false;

        if (!value) return false;
        value = parseInt(value);

        if (isNaN(value)) return false;

        return YoutubeVideo.IsDurationLonger(videoInfo.duration, value);
    }
});

MODIFIERS.push({
    name: 'minduration',
    aliases: ['minlength', 'minleng', 'shorter'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;
        if (!videoInfo.duration) return false;

        if (!value) return false;
        value = parseInt(value);

        if (isNaN(value)) return false;

        return YoutubeVideo.IsDurationShorter(videoInfo.duration, value, videoInfo.isShorts);
    }
});

MODIFIERS.push({
    name: 'older',
    aliases: ['old'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;
        if (!videoInfo.publishedAt) return false;
        
        if (!value) return false;
        value = parseInt(value);

        if (isNaN(value)) return false;

        return YoutubeVideo.IsVideoTooOld(videoInfo.publishedAt, value);
    }
});

MODIFIERS.push({
    name: 'newer',
    aliases: ['new'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;
        if (!videoInfo.publishedAt) return false;
        
        if (!value) return false;
        value = parseInt(value);

        if (isNaN(value)) return false;

        return YoutubeVideo.IsVideoTooNew(videoInfo.publishedAt, value);
    }
});

MODIFIERS.push({
    name: 'description',
    aliases: ['desc'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;

        if (!value) return false;
        if (!videoInfo.description) return false;

        const keywords = matcher.convertToKeywordArray(value, {
            modifiers: MODIFIERS
        });

        return Boolean(matcher.match(videoInfo.description, videoInfo, keywords, {
            caseSensitive: false,
            exactMatch: false,
            wordBoundary: false
        }));
    }
});

MODIFIERS.push({
    name: 'tag',
    aliases: ['tags'],
    check: (info, value, options, negative) => {
        if (!info.isVideo) return false;

        /** @type {YoutubeVideoInfo} */
        const videoInfo = info;

        if (!value) return false;
        if (videoInfo.tags.length === 0) return false;

        const keywords = matcher.convertToKeywordArray(value, {
            modifiers: MODIFIERS
        });

        return Boolean(matcher.match(videoInfo.tags, videoInfo, keywords, {
            caseSensitive: false,
            exactMatch: true,
            wordBoundary: false
        }));
    }
});

MODIFIERS.push({
    name: 'channel',
    aliases: ['ch', 'user'],
    check: (info, value, options, negative) => {
        if (!value) return false;
        if (!info.channel) return false;

        const channels = [info.channel.name, info.channel.url, info.channel.urlId, info.channel.decodedUrlId]
            .filter(e => e);

        value = value.trim();

        const keywords = matcher.convertToKeywordArray(value, {
            separator: '',
            separateNewLines: true
        });

        return Boolean(matcher.match(channels, info, keywords, {
            caseSensitive: false,
            exactMatch: true,
            wordBoundary: false
        }));
    }
});

MODIFIERS.push({
    name: 'content',
    aliases: ['text', 'ctn', 'title', 'tt'],
    check: (info, value, options, negative) => {
        if (!value) return false;
        if (info.isPlaylist) return false;

        if (info.isVideo) {
            /** @type {YoutubeVideoInfo} */
            const videoInfo = info;
            if (!videoInfo.title) return false;

            const keywords = matcher.convertToKeywordArray(value, {
                modifiers: MODIFIERS
            });

            return Boolean(matcher.match(videoInfo.title, videoInfo, keywords, {
                caseSensitive: false,
                exactMatch: false,
                wordBoundary: false
            }));

        } else if (info.isComment) {
            /** @type {YoutubeCommentInfo} */
            const commentInfo = info;
            if (!commentInfo.content) return false;

            const keywords = matcher.convertToKeywordArray(value, {
                modifiers: MODIFIERS
            });

            return Boolean(matcher.match(commentInfo.content, commentInfo, keywords, {
                caseSensitive: false,
                exactMatch: false,
                wordBoundary: false
            }));

        } else if (info.isPost) {
            /** @type {YoutubePostInfo} */
            const postInfo = info;
            if (!postInfo.content) return false;

            const keywords = matcher.convertToKeywordArray(value, {
                modifiers: MODIFIERS
            });

            return Boolean(matcher.match(postInfo.content, postInfo, keywords, {
                caseSensitive: false,
                exactMatch: false,
                wordBoundary: false
            }));

        }
    }
});

MODIFIERS.push({
    name: 'video',
    aliases: ['isvideo'],
    check: (info, value, options, negative) => {
        const out = Boolean(info.isVideo);
        return negative ? !out : out;
    }
});

MODIFIERS.push({
    name: 'comment',
    aliases: ['iscomment'],
    check: (info, value, options, negative) => {
        const out = Boolean(info.isComment);
        return negative ? !out : out;
    }
});

MODIFIERS.push({
    name: 'post',
    aliases: ['ispost'],
    check: (info, value, options, negative) => {
        const out = Boolean(info.isPost);
        return negative ? !out : out;
    }
});

MODIFIERS.push({
    name: 'playlist',
    aliases: ['isplaylist'],
    check: (info, value, options, negative) => {
        const out = Boolean(info.isPlaylist);
        return negative ? !out : out;
    }
});
