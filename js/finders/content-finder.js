// this file will look for and watch changes of content elements, such as videos, posts and comments.
utils.devLog('content-finder injected!');

/** @type { Object<string, typeof YoutubeContent> } */
const contentClasses = {};
contentClasses[CONTENT_TYPES.video] = YoutubeVideo;
contentClasses[CONTENT_TYPES.comment] = YoutubeComment;
contentClasses[CONTENT_TYPES.post] = YoutubePost;
contentClasses[CONTENT_TYPES.playlist] = YoutubePlaylist;

const videoElements = [
    'ytd-compact-video-renderer', // right side suggestion on watch page.
    'ytd-playlist-panel-video-renderer', // right side playlist videos on watch page.
    'ytd-rich-grid-media', // mostly of the videos, home page and subscriptions (sometimes playlists on the home page).
    'ytd-video-renderer', // search, and subscription page in list mode.
    'ytd-grid-video-renderer', // channel page and library page.
    'ytd-playlist-video-renderer', // playlist videos from playlist page.
    'ytd-rich-grid-slim-media', // shorts.
    'ytd-reel-item-renderer', // shorts.
    'ytd-channel-video-player-renderer', // auto-play video from channel page.
    'a.ytp-videowall-still', // videos that show up when a video ends.
    '.ytp-ce-video', // videos from the same channel that show up when a video is about to end.
    'ytd-reel-video-renderer', // videos from shorts page.
    'ytm-video-with-context-renderer', // many mobile videos.
    'ytm-reel-item-renderer', // many mobile shorts videos.
]

/**
 * This class is responsible for finding and managing different types of content elements on YouTube.
 */
class ContentFinder {

    constructor() {
        /** @type {{[contentType: string] : { [elementId: string]: YoutubeContent }}} */
        this.contents = {};
        /** @type { YoutubeChannelRenderer[] } */
        this.channelRenderers = [];

        for (const type of Object.values(CONTENT_TYPES)) {
            this.contents[type] = {};
        }

        this.contentListeners = new Map();
        /** @type {Map<string, (info: YoutubeChannelInfo, content: YoutubeChannelRenderer) => void>} */
        this.channelRendererListeners = new Map();
    }

    /**
     * 
     * Sets up an observer to watch for changes in various types of content elements on YouTube pages. When changes are detected, corresponding methods are called to process the elements. 
     * */
    start() {
        observer.watchElements([
            {
                // videos.
                elements: videoElements,
                onElement: element => this.getContentFromElement(element, CONTENT_TYPES.video)
            }, {
                // posts.
                elements: [
                    'ytd-post-renderer', // home posts and full posts.
                    'ytd-backstage-post-thread-renderer' // posts from channels in the commnuity tab.
                ],
                onElement: element => this.getContentFromElement(element, CONTENT_TYPES.post)
            }, {
                // comments.
                elements: ['ytd-comment-renderer', 'ytm-comment-renderer'],
                onElement: element => this.getCommentFromElement(element)
            }, {
                // playlists.
                elements: ['ytd-radio-renderer', 'ytd-playlist-renderer', 'ytd-compact-radio-renderer', 'ytd-grid-playlist-renderer'],
                onElement: element => this.getContentFromElement(element, CONTENT_TYPES.playlist)
            }, {
                // channel renderers (shown when searching for channels on search)
                elements: ['ytd-channel-renderer'],
                onElement: element => this.getContentFromChannelRenderer(element)
            }
        ]);
    }

    getCurrentContentElements() {
        // videos.
        document.querySelectorAll(videoElements.join(', ')).forEach(element => this.getContentFromElement(element, CONTENT_TYPES.video));
        // comments.
        document.querySelectorAll('ytd-comment-renderer, ytm-comment-renderer').forEach(element => this.getCommentFromElement(element) );
        // posts.
        document.querySelectorAll('ytd-post-renderer, ytd-backstage-post-thread-renderer').forEach(element => this.getContentFromElement(element, CONTENT_TYPES.post) );
        // playlist.
        document.querySelectorAll('ytd-radio-renderer, ytd-playlist-renderer, ytd-compact-radio-renderer, ytd-grid-playlist-renderer').forEach(element => this.getContentFromElement(element, CONTENT_TYPES.playlist) );
    }

    /** @param {HTMLElement} element */
    getCommentFromElement(element) {
        if (!element.matches('ytm-comment-renderer') && !element.hasAttribute('is-reply')) element = element.parentElement; // get the thread comment instead of comment renderer.

        this.getContentFromElement(element, CONTENT_TYPES.comment);
    }


    /**
     * Extracting content from a given HTML element based on its type
     * 
     *  @param {HTMLElement} element @param {string} type */
    getContentFromElement(element, type) {
        if (!element || !type) return;

        const elementId = element.getAttribute(EL_ATTRIBUTES.elementId);
        if (elementId) {
            const content = this.contents[type][elementId];
            if (!content) return;
            
            content.checkInfo();
            return;
        }

        let contentClass = contentClasses[type];
        if (!contentClass) return utils.devLogWarn(`There's no class for content "${type}"`);

        contentClass = contentClass.GetContentClassFromElement(element);
        const content = new contentClass(element, this);
        
        if (!this.contents[type]) this.contents[type] = {};
        this.contents[type][content.elementId] = content;
    }

    /**
     * Extract content from a channel renderer element
     * 
     *  @param {HTMLElement} element */
    getContentFromChannelRenderer(element) {
        if (element.hasAttribute(EL_ATTRIBUTES.channelRenderer)) return;

        const channelRenderer = new YoutubeChannelRenderer(element);
        this.channelRenderers.push(channelRenderer);
    }

    /** 
     * Register a callback function that will be invoked whenever there is an update in the content information. 
     *  It retrieves the list of callbacks associated with the 'content-update' event from the contentListeners map.
     *  It then adds the provided callback to this list and updates the map with the new list of callbacks.
     * 
     * @param { (info: Object, content: YoutubeContent) => void } callback */
    onContentInfoUpdate(callback) {
        const callbacks = this.contentListeners.get('content-update') || [];
        callbacks.push(callback);
        this.contentListeners.set('content-update', callbacks);
    }

    /** Emits an event indicating that content information has been updated. */
    emitContentInfo(info, content) {
        this.contentListeners.get('content')?.forEach(callback => callback(info, content));
    }
    /** Similar to the previous method, this one emits an event for content information updates. 
     * However, it specifically targets the 'content-update' event. */
    emitContentInfoUpdate(info, content) {
        this.contentListeners.get('content-update')?.forEach(callback => callback(info, content));
    }

    /**
     *  Register a callback function that will be invoked whenever there is an update in the information of a channel renderer. 
     *  @param { (info: YoutubeChannelInfo, content: YoutubeChannelRenderer) => void } callback */
    onChannelRendererInfoUpdate(callback) {
        const listenerId = _.uniqueId();
        this.channelRendererListeners.set(listenerId, callback);
    }
    
    /** Emits an event indicating that channel renderer information has been updated. */
    emitChannelRendererInfoUpdate(info, channelRenderer) {
        [...this.channelRendererListeners.values()].forEach(callback => {
            callback(info, channelRenderer);
        });
    }


}


const contentFinder = new ContentFinder();