const MAX_VIDEOS_REQUEST = 50;
const currentAPIDataVersion = 2;

/**
 * @typedef {Object} VideoAPIData
 * @property {string} id
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [categoryId]
 * @property {string} [channelId]
 * @property {string} [channelTitle]
 * @property {string[]} [tags]
 * @property {number} [publishedAt]
 * @property {number} [duration]
 * @property {number} v - version, this is a way to check if the cached data is outdated.
 */

class APIManager {
    constructor() {
        
        this.maxVideoRequest = 50;
        this.apiContentCallbacks = [];
        
        /** @type {{ [contentType: string] : { [contentId: string] : VideoAPIData } }} */
        this.apiContentCache = {};
        this.apiKey = '';

        /** @type {{ [contentType: string] : { [contentId: string] : true } }} */
        this.queue = {};

        for (const type of Object.values(CONTENT_TYPES)) {
            this.queue[type] = {};
            this.apiContentCache[type] = {};
        }

        this.queueTimeout = null;
        this.queueMs = 1000;

        this.pageId = '';
        this.isBlacklistedPage = false;

        MM.on(MMK.urlUpdate, () => {
            this.onUrlUpdate();
        });

    }
    
    setAPIKey(key) {
        this.apiKey = key;
    }

    /** @param {keyof CONTENT_TYPES} type @param {VideoAPIData[]} datas */
    addDatasToCache(type, datas) {
        if (!type) return utils.devLogWarn('No type provided to add to cache.');
        if (!datas) return utils.devLogWarn('No datas provided to add to cache.');
        if (!this.apiContentCache[type]) return utils.devLogWarn(`The type "${type}" does not exist in cache.`);

        for (let i = 0; i < datas.length; i++) {
            const data = datas[i];

            if (!data || !data.id) {
                utils.devLogWarn(`Trying to add to cache non-existing data or data that has no id. (index: ${i})`, data, datas);
                continue;
            }

            this.apiContentCache[type][data.id] = data;
        }
    }

    /** @param {(datas: VideoAPIData[]) => void} callback */
    onVideoDatas(callback) {
        this.apiContentCallbacks.push(callback);
    }

    /** @param {VideoAPIData[]} datas */
    emitVideoDatas(datas) {
        this.apiContentCallbacks.forEach(callback => {
            callback(datas);
        });
    }

    isVideoCached(videoId) {
        return Boolean( this.apiContentCache[CONTENT_TYPES.video][videoId] );
    }

    /** @param {string} videoId */
    addVideoToQueue(videoId) {
        if (!videoId) return;
        if (this.isVideoCached(videoId)) return;
        if (this.isPagePrevented) return;
        if (this.queue[CONTENT_TYPES.video][videoId]) return;

        clearTimeout(this.queueTimeout);
        this.queue[CONTENT_TYPES.video][videoId] = true;

        const queueLength = Object.keys(this.queue[CONTENT_TYPES.video]).length;

        if (queueLength === this.maxVideoRequest) {
            clearTimeout(this.queueTimeout);
            this.requestVideoDataFromQueue();
        }

        this.queueTimeout = setTimeout(() => {
            this.requestVideoDataFromQueue();
        }, this.queueMs);

    }

    requestVideoDataFromQueue() {
        const videos = Object.keys(this.queue[CONTENT_TYPES.video]);
        if (!videos || videos.length == 0) return;

        const videosChunks =  _.chunk(videos, this.maxVideoRequest);
        for (const videosIds of videosChunks) {

            this.requestVideoData(videosIds).then(datas => {
                // remove from queue.
                datas.forEach(data => delete this.queue[CONTENT_TYPES.video][data.id] );

                this.addDatasToCache(CONTENT_TYPES.video, datas);
                this.emitVideoDatas(datas);
            }).catch(err => {
                utils.devLogWarn('could not make request for videos data:', err, videosIds);
                videosIds.forEach(videoId => delete this.queue[CONTENT_TYPES.video][videoId] );
            });
            
        }
    }

    /** @param {string[]} videoIDs @returns {Promise<VideoAPIData[]>} */
    async requestVideoData(videoIDs, apiKey = '') {
        return new Promise((resolve, reject) => {
            if (!apiKey) apiKey = this.apiKey;
            if (!apiKey) return reject('No API key provided');

            if (videoIDs.length > 50) return reject(`Can't request more than 50 videos.`);

            $.ajax({
                url: `https://www.googleapis.com/youtube/v3/videos?id=${videoIDs}&key=${apiKey}&part=snippet,contentDetails`,
                type: 'GET',
                dataType: 'json',
                success: data => {
                    utils.devLog('Api data response:', data);
                    if (!data || !data.items) return reject('No data items');

                    const videoDatas = data.items.map( /** @returns {VideoAPIData} */ data => (
                        {
                            id: data.id,
                            title: data.snippet.title || '',
                            categoryId: data.snippet.categoryId || '',
                            description: data.snippet.description || '',
                            channelId: data.snippet.channelId || '',
                            channelTitle: data.snippet.channelTitle || '',
                            tags: data.snippet.tags || [],
                            duration: moment.duration(data.contentDetails.duration).asMilliseconds() / 1000,
                            publishedAt: utils.dateStrToNumber(data.snippet.publishedAt),
                            v: 2
                        }
                    ));

                    resolve(videoDatas);
                },
                error: error => {
                    reject(error);
                }
            });
        });
    }

    onUrlUpdate() {
        this.pageId = this.getPageId(location.href);

        if (!LOCAL_ITEMS.preventAPIpages) return this.isPagePrevented = false;

        this.isPagePrevented = this.isPageIdBlacklisted(this.pageId);
    }

    isPageIdBlacklisted(pageId) {
        if (LOCAL_ITEMS.APIBlacklistSubsPage && pageId == PAGE_IDS.subs) return true;
        if (LOCAL_ITEMS.APIBlacklistHomePage && pageId == PAGE_IDS.home) return true;
        if (LOCAL_ITEMS.APIBlacklistWatchPage && pageId == PAGE_IDS.watch) return true;
        if (LOCAL_ITEMS.APIBlacklistChannelPage && pageId == PAGE_IDS.channel) return true;
        if (LOCAL_ITEMS.APIBlacklistPlaylistPage && pageId == PAGE_IDS.playlist) return true;
        if (LOCAL_ITEMS.APIBlacklistTrendingPage && pageId == PAGE_IDS.trending) return true;
        if (LOCAL_ITEMS.APIBlacklistShortsPage && pageId == PAGE_IDS.shorts) return true;
        if (LOCAL_ITEMS.APIBlacklistPages) {
            const pageMatch = matcher.match([location.href], null, keywords.apiIgnoredPages);

            if (pageMatch) return true;
        }

        return false;
    }

    getPageId(url) {
        if ( /^https?:\/\/((?:www|m)\.)?youtube\.com\/feed\/subscriptions\/?(\?.+)?$/.test(url) ) 
            return PAGE_IDS.subs;
        if ( /^https?:\/\/((?:www|m)\.)?youtube\.com\/?(\?.+)?$/.test(url) ) 
            return PAGE_IDS.home;
        if ( /^https?:\/\/((?:www|m)\.)?youtube\.com\/watch\?v=.+$/.test(url) ) 
            return PAGE_IDS.watch;
        if ( YoutubeContent.GetChannelUrlId(url) ) 
            return PAGE_IDS.channel;
        if ( /^https?:\/\/((?:www|m)\.)?youtube\.com\/playlist\?list=.+$/.test(url) ) 
            return PAGE_IDS.playlist;
        if ( /^https?:\/\/((?:www|m)\.)?youtube\.com\/feed\/trending\/?(\?.+)?$/.test(url) ) 
            return PAGE_IDS.trending;
        if ( /^https?:\/\/((?:www|m)\.)?youtube\.com\/shorts\/.*(\?.+)?$/.test(url) ) 
            return PAGE_IDS.shorts;

        return '';
    }
}

const apiManager = new APIManager();