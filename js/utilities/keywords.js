
const keywords = {
    contents: [],
    titles: [],
    descriptions: [],
    videoChannels: [],
    tags: [],
    videos: [],

    channels: [],
    whitelistChannels: [],

    commentContents: [],
    commentUsers: [],
    comments: [],

    postContents: [],
    postChannels: [],
    posts: [],

    apiIgnoredPages: []
}

/** @param {STORAGE_ITEMS['local']} items */
function updateKeywords(items) {

    // Any content
    keywords.contents = matcher.convertToKeywordArray(items.blockedContentKeywords, {
        modifiers: MODIFIERS
    });

    // Video titles
    keywords.titles = matcher.convertToKeywordArray(items.blockedTitles, {
        modifiers: MODIFIERS
    });

    // Video channels
    keywords.videoChannels = matcher.convertToKeywordArray(items.blockedVideoChannels, {
        modifiers: MODIFIERS,
        separator: '',
        separateNewLines: true
    });

    // Video descriptions
    keywords.descriptions = matcher.convertToKeywordArray(items.blockedDescriptions, {
        modifiers: MODIFIERS
    });

    // Tags
    keywords.tags = matcher.convertToKeywordArray(items.blockedTags, {
        modifiers: MODIFIERS
    });

    // Videos
    keywords.videos = matcher.convertToKeywordArray(items.blockedVideos, {
        separator: '',
        separateNewLines: true,
        disableRegex: true
    });

    // Channels
    keywords.channels = matcher.convertToKeywordArray(items.blockedChannels, {
        modifiers: MODIFIERS,
        separator: '',
        separateNewLines: true
    });

    // Whitelist Channels
    keywords.whitelistChannels = matcher.convertToKeywordArray(items.whitelistChannels, {
        modifiers: MODIFIERS,
        separator: '',
        separateNewLines: true
    });

    // Comment contents
    keywords.commentContents = matcher.convertToKeywordArray(items.blockedCommentContents, {
        modifiers: MODIFIERS
    });

    // Comment users
    keywords.commentUsers = matcher.convertToKeywordArray(items.blockedCommentUsers, {
        modifiers: MODIFIERS,
        separator: '',
        separateNewLines: true
    });

    // Comments (ID or link)
    keywords.comments = matcher.convertToKeywordArray(items.blockedComments, {
        separator: '',
        separateNewLines: true,
        disableRegex: true
    });

    // Post contents.
    keywords.postContents = matcher.convertToKeywordArray(items.blockedPostContents, {
        modifiers: MODIFIERS
    });

    // Post channels.
    keywords.postChannels = matcher.convertToKeywordArray(items.blockedPostChannels, {
        modifiers: MODIFIERS,
        separator: '',
        separateNewLines: true
    });

    // Posts
    keywords.posts = matcher.convertToKeywordArray(items.blockedPosts, {
        separator: '',
        separateNewLines: true,
        disableRegex: true
    });

    keywords.apiIgnoredPages = matcher.convertToKeywordArray(items.APIBlacklistPages, {
        separator: '',
        separateNewLines: true
    });
}