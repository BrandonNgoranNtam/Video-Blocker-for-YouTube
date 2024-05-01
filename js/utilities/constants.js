
const CONTENT_TYPES = Object.freeze({
    video: 'video',
    comment: 'comment',
    post: 'post',
    playlist: 'playlist',
    channel: 'channel'
});

const EL_ATTRIBUTES = Object.freeze({
    elementId: 'ytb-element-id',
    contentType: 'ytb-type',
    overlayId: 'ytb-overlay-id',
    blocked: 'ytb-blocked',
    dropdownButton: 'ytb-dropdown-button',
    dropdownHidden: 'ytb-dropdown-hidden',
    dropdownItems: 'ytb-dropdown-items',
    shortSkipped: 'ytb-shorts-skipped',
    previewVideo: 'ytb-preview-video',
    hasChannelBlockButton: 'ytb-has-channel-block-button',
    alwaysShowChannelBlockButton: 'ytb-always-show-channel-block',
    channelRenderer: 'ytb-channel-renderer',
    overlayType: 'ytb-overlay-type',
    overlayContentHidden: 'ytb-overlay-content-hidden'
});

const EL_CLASSES = Object.freeze({
    overlayContainer: 'ytb-overlay-container',
    revealButton: 'ytb-reveal-button',
    hide: 'ytb-hide',
    dropdownButton: 'ytb-dropdown-button',
    dropdownContainer: 'ytb-dropdown-container',
    fill: 'ytb-fill',
    channelBlockButton: 'ytb-channel-block-button'
});

const CATEGORIES_IDS = Object.freeze({
    "2": 'Autos & Vehicles',
    "1": 'Film & Animation',
    "10": 'Music',
    "15": 'Pets & Animals',
    "17": 'Sports',
    "18": 'Short Movies',
    "19": 'Travel & Events',
    "20": 'Gaming',
    "21": 'Videoblogging',
    "22": 'People & Blogs',
    "23": 'Comedy',
    "24": 'Entertainment',
    "25": 'News & Politics',
    "26": 'Howto & Style',
    "27": 'Education',
    "28": 'Science & Technology',
    "29": 'Nonprofits & Activism',
    "30": 'Movies',
    "31": 'Anime/Animation',
    "32": 'Action/Adventure',
    "33": 'Classics',
    "34": 'Movie/Comedy',
    "35": 'Documentary',
    "36": 'Drama',
    "37": 'Family',
    "38": 'Foreign',
    "39": 'Horror',
    "40": 'Sci-Fi/Fantasy',
    "41": 'Thriller',
    "42": 'Shorts',
    "43": 'Shows',
    "44": 'Trailers'
});

const PAGE_IDS = Object.freeze({
    subs: 'subs',
    home: 'home',
    watch: 'watch',
    channel: 'channel',
    playlist: 'playlist',
    trending: 'trending',
    shorts: 'shorts'
});

const CONTEXT_MENU_IDS = Object.freeze({
    reloadExtension: 'reloadExtension',
    reloadExtensionAndTab: 'reloadExtensionAndTab',

    blockUnblockContent: 'blockUnblockContent',
    blockUnblockChannel: 'blockUnblockChannel',
    blockUnblockChannelWithAPI: 'blockUnblockChannelWithAPI',
    viewTags: 'viewTags',

    blockKeywordParentId: 'blockKeyword',

    blockKeywordVideoParentId: 'blockKeyword-video',
    blockKeywordVideoTitle: 'blockKeyword-video-title',
    blockKeywordVideoDescription: 'blockKeyword-video-desc',
    blockKeywordVideoChannel: 'blockKeyword-video-channel',
    blockKeywordVideoTags: 'blockKeyword-video-tag',

    blockKeywordCommentParentId: 'blockKeyword-comment',
    blockKeywordCommentContent: 'blockKeyword-comment-content',
    blockKeywordCommentChannel: 'blockKeyword-comment-channel',

    blockKeywordPostParentId: 'blockKeyword-post',
    blockKeywordPostContent: 'blockKeyword-post-content',
    blockKeywordPostChannel: 'blockKeyword-post-channel',
});

const YOUTUBE_URL_PATTERN = '*://*.youtube.com/*';
const YOUTUBE_URL_REGEX = /^(http|https):\/\/.+\.youtube\.com\/.*$/;