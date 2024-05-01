
const videoShortsTags = ['ytd-rich-grid-slim-media', 'ytd-reel-item-renderer'];

const horizontalElements = [
    'ytd-video-renderer', // mostly videos from search page
    'ytd-compact-video-renderer', // suggested videos from right side of watch page.
    'ytd-playlist-video-renderer', // playlist videos
    'ytd-playlist-panel-video-renderer', // playlist videos
    'ytd-channel-video-player-renderer' // auto play video from channel page.
]

/** 
 * @typedef {Object} BaseYoutubeVideoInfo
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [categoryId]
 * @property {string[]} tags
 * @property {boolean} [isLive]
 * @property {boolean} [isShorts]
 * @property {boolean} [isPremiere]
 * @property {boolean} [isMix]
 * @property {boolean} [isFromPlaylist]
 * @property {boolean} [isWatchLater]
 * @property {number} [publishedAt]
 * @property {number} [duration]
 * @property {YoutubeChannelInfo} [channel]
 * @property {true} isVideo
 */

/** @typedef {AnyYoutubeContentInfo & BaseYoutubeVideoInfo} YoutubeVideoInfo */

// TODO: get video watched time?
// TODO: disable auto play from channel page

class YoutubeVideo extends YoutubeContent {

    getType() {
        return CONTENT_TYPES.video;
    }

    /** @returns {YoutubeVideoInfo} */
    getCacheInfo(videoId = '') {
        if (!videoId) videoId = this.info?.id;
        if (!videoId) return;
        if (!contentsInfos[this.getType()]) return;
        return contentsInfos[this.getType()][videoId];
    }

    getAPIdata(videoId = '') {
        if (!videoId) videoId = this.info?.id;
        if (!videoId) return;
        return apiManager.apiContentCache[this.getType()][videoId]
    }

    /** @returns {YoutubeVideoInfo} */
    getInfoFromElement() {
        const isVideoWall = this.isVideoWall();
        const isEndScreenVideo = this.isEndScreenVideo();

        if (isVideoWall) {
            var titleElement = this.element.querySelector('span.ytp-videowall-still-info-title');
            var linkElement = this.element;
        } else if (isEndScreenVideo) {
            var linkElement = this.element.querySelector('a.ytp-ce-covering-overlay');
            var titleElement = linkElement.querySelector('div.ytp-ce-video-title');
        } else {
            var titleElement = this.element.querySelector('#video-title') || this.element.querySelector('#title a') || this.element.querySelector('span.ytp-videowall-still-info-title');
            var linkElement = titleElement?.querySelector('a') || this.element.querySelector('a#video-title-link') || this.element.querySelector('a#thumbnail') || (titleElement?.matches('a') ? titleElement : null);
        }
        
        const channelLinkElement = this.element.querySelector('.ytd-channel-name a') || this.element.querySelector('a.ytd-channel-name');
        const channelNameElement = this.element.querySelector('.ytd-channel-name #text') || this.element.querySelector('.ytd-channel-name a') || this.element.querySelector('.ytd-channel-name');

        const videoUrl = linkElement?.href;
        const videoId = YoutubeVideo.GetVideoId(videoUrl);

        const apiData = videoId ? this.getAPIdata(videoId) : null;
        const cache = videoId ? this.getCacheInfo(videoId) : null;

        this.setChannelBlockButton();

        if (isVideoWall) {
            var channelName = this.element.querySelector('span.ytp-videowall-still-info-author').textContent.split('•')[0].trim();
        } else {
            var channelName = channelNameElement?.textContent?.trim() || cache?.channel?.name || apiData?.channelTitle || '';
        }

        let channelUrl = channelLinkElement?.href || '';
        let channelHandle = YoutubeContent.GetChannelHandle(channelUrl);

        // if is a video inside of a channel page, get channel information from the page.
        const isFromChannelPage = Boolean(document.querySelector(`[page-subtype="channels"] [${EL_ATTRIBUTES.elementId}="${this.elementId}"]`));
        const channelHeaderContainer = document.querySelector('#channel-header-container');

        if (isFromChannelPage && channelHeaderContainer) {
            const currentChannelName = utils.cleanString( channelHeaderContainer.querySelector('#channel-name #text')?.textContent );
            let currentChannelHandle = channelHeaderContainer.querySelector('#channel-handle')?.textContent.trim();
            const currentChannelUrl = utils.removeQueriesFromUrl(location.href);

            if (!currentChannelHandle && currentChannelUrl) {
                currentChannelHandle = YoutubeContent.GetChannelHandle(currentChannelUrl)
            }

            if (!channelName) channelName = currentChannelName;
            if (!channelHandle) channelHandle = currentChannelHandle;
            if (!channelUrl) channelUrl = currentChannelUrl;
        }

        const descriptionElement = this.element.querySelector('#description #content yt-formatted-string') || this.element.querySelector('.metadata-snippet-container yt-formatted-string');

        // getting video duration.
        const durationElement = this.element.querySelector('ytd-thumbnail-overlay-time-status-renderer, span.ytp-videowall-still-info-duration');
        const duration = YoutubeVideo.GetDurationFromStringFormat(durationElement?.textContent);

        // checking if channel has the verified mark ( does not appear on playlists videos )
        const verifiedBadge = this.element.querySelector('ytd-badge-supported-renderer.ytd-channel-name');
        const channelVerified = Boolean(verifiedBadge && verifiedBadge.children.length >= 2);

        // if the video is shorts.
        const shortsIcon = this.element.querySelector('[overlay-style="SHORTS"]');
        const isShorts = Boolean( shortsIcon || videoShortsTags.includes(this.element.tagName.toLowerCase()) );

        // checking if is live.
        const liveBadge = this.element.querySelector('[role="status"].badge-style-type-live-now-alternate');
        const liveOverlayIcon = this.element.querySelector('[overlay-style="LIVE"]');
        const isLive = Boolean( liveBadge || liveOverlayIcon );

        // if the video is premiere.
        const upcomingOverlayIcon = this.element.querySelector('[overlay-style="UPCOMING"]');
        const isPremiere = Boolean( upcomingOverlayIcon );

        // it's a mix playlist from home page. TODO: get as playlist instead of a video
        const radioMetadata = this.element.querySelector('ytd-video-meta-block[radio-meta]');
        const isMix = Boolean(radioMetadata);

        const urlWithoutQueries = YoutubeVideo.CreateUrlWithId(videoId, isShorts);
        const url = videoUrl || cache?.url || urlWithoutQueries;

        const playlistId = YoutubePlaylist.GetPlaylistId(url);
        const isFromPlaylist = Boolean(playlistId);
        const isWatchLater = Boolean(playlistId && playlistId === 'WL');

        const thumbnailNowPlayingOverlay = this.element.querySelector('.ytd-thumbnail ytd-thumbnail-overlay-now-playing-renderer');

        if (thumbnailNowPlayingOverlay) {
            const style = window.getComputedStyle(thumbnailNowPlayingOverlay);
            
            if (style.pointerEvents === 'auto' && playerFinder.miniPlayer) {
                playerFinder.miniPlayer.setInfo(this.info);
            } 
        }

        return {
            id: videoId || '',
            url: urlWithoutQueries,
            title: titleElement?.textContent?.trim().replace(/  /g, ' ').replace(/\u034F/g, '') || apiData?.title.replace(/\u034F/g, '') || '',
            description: descriptionElement?.textContent.replace(/\u034F/g, '').trim() || cache?.description || apiData?.description || '',
            categoryId: apiData?.categoryId || '',
            tags: apiData?.tags || [],
            isLive,
            isShorts,
            isPremiere,
            isMix,
            publishedAt: apiData?.publishedAt || 0,
            duration: duration || cache?.duration || apiData?.duration || 0,
            isVideo: !isMix,
            contentType: !isMix ? CONTENT_TYPES.video : CONTENT_TYPES.playlist,
            isFromPlaylist,
            isWatchLater,
            channel: {
                name: channelName?.replace(/\u034F/g, '') || cache?.channel?.name || apiData?.channelTitle || '',
                url: decodeURI(channelUrl || '') || cache?.channel?.url || '',
                handle: channelHandle || cache?.channel?.handle || '',
                apiId: apiData?.channelId || '',
                id: channelHandle?.replace('@', '') || cache?.channel?.id || '',
                urlId: YoutubeContent.GetChannelUrlId(channelLinkElement?.href) || cache?.channel?.urlId || '',
                verified: channelVerified || cache?.channel?.verified || false
            }
        }
    }

    setChannelBlockButton() {
        if (!LOCAL_ITEMS.addBlockChannelButton) return;
        
        const element = this.element.querySelector('#channel-info ytd-channel-name') || this.element.querySelector('ytd-channel-name')

        if (!element) return;
        if (element.hasAttribute(EL_ATTRIBUTES.hasChannelBlockButton)) return;

        const channelBlockButton = YoutubeContent.CreateChannelBlockButton();

        element.insertAdjacentElement('beforeend', channelBlockButton);
        element.setAttribute(EL_ATTRIBUTES.hasChannelBlockButton, 'true');
        if (!LOCAL_ITEMS.showBlockChannelButtonOnHover) {
            element.setAttribute(EL_ATTRIBUTES.alwaysShowChannelBlockButton, 'true');
        } else {
            element.removeAttribute(EL_ATTRIBUTES.alwaysShowChannelBlockButton);
        }

        channelBlockButton.addEventListener('click', e => {
            this.onChannelBlockButtonClick(channelBlockButton, e);
        });
    }

    shouldAddOverlay() {
        return this.isVideoWall() || this.isEndScreenVideo() ? false : (LOCAL_ITEMS.showOverlays && LOCAL_ITEMS.showOverlaysForVideos);
    }

    isVideoWall() {
        return this.element.matches('.ytp-videowall-still');
    }

    isEndScreenVideo() {
        return this.element.matches('.ytp-ce-video');
    }

    /** 
     * @param {YoutubeVideoInfo} video
     * @returns {BlockInfo} 
     * */
    shouldBeBlocked(video) {
        if (LOCAL_ITEMS.ignorePlaylistVideos && video.isFromPlaylist) return;
        if (LOCAL_ITEMS.ignoreWatchLaterPlaylist && video.isWatchLater) return;

        if (video.isMix && LOCAL_ITEMS.blockMIX) {
            return {
                optionId: 'block_mix',
                reason: `${utils.i18n('BlockReasonMixPlaylist')}`
            }
        }

        let keywordMatch = '';

        // Channels
        if (video.channel) {
            const channelIndentifiers = [
                video.channel.name, video.channel.url, video.channel.id, video.channel.handle, video.channel.urlId
            ].filter(c => Boolean(c));

            // Whitelist check
            keywordMatch = matcher.match(channelIndentifiers, video, keywords.whitelistChannels, {
                caseSensitive: LOCAL_ITEMS.whitelistChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.whitelistChannelsExactMatch
            });
            if (keywordMatch) return; // Channel on whitelist, pass!
            
            keywordMatch = matcher.match(channelIndentifiers, video, keywords.videoChannels, {
                caseSensitive: LOCAL_ITEMS.blockedVideoChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.blockedVideoChannelsExactMatch
            });
            if (keywordMatch) return {
                optionId: 'block_video_channels',
                reason: utils.i18n('BlockReasonVideoChannel') + ' ' + video.channel.name + (keywordMatch !== video.channel.name ? ` (${keywordMatch})` : ''),
                channelBlock: true
            }

            // General Channels
            keywordMatch = matcher.match(channelIndentifiers, video, keywords.channels, {
                caseSensitive: LOCAL_ITEMS.blockedChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.blockedChannelsExactMatch
            });
            if (keywordMatch) return {
                optionId: 'block_channels',
                reason: utils.i18n('BlockReasonChannel') + ' ' + video.channel.name + (keywordMatch !== video.channel.name ? ` (${keywordMatch})` : ''),
                channelBlock: true
            }
        }

        // Videos
        if (video.id) keywordMatch = matcher.match(video.id, video, keywords.videos, {
            customMatch: (texts, kw) => {
                const id = YoutubeVideo.GetVideoId(kw.str) || kw.str;
                if (video.id == id) return kw.str;
            }
        });
        if (keywordMatch) return {
            optionId: 'block_videos',
            reason: utils.i18n('BlockReasonSpecificVideo') + ' ' + video.id + (video.id !== keywordMatch ? ` (${keywordMatch})` : ''),
            contentId: video.id
        }

        // Shorts
        if (video.isShorts && LOCAL_ITEMS.blockShorts) return {
            optionId: 'block_shorts',
            reason: utils.i18n('BlockReasonShorts')
        }

        if (video.isLive && LOCAL_ITEMS.blockLive) return {
            optionId: 'block_live',
            reason: utils.i18n('BlockReasonLive')
        }

        if (video.isPremiere && LOCAL_ITEMS.blockPremiere) return {
            optionId: 'block_premiere',
            reason: utils.i18n('BlockReasonPremiere')
        }

        // Categories
        if (video.categoryId && LOCAL_ITEMS.blockedCategories.includes(video.categoryId)) return {
            optionId: 'categories',
            reason: `${utils.i18n('BlockReasonCategory')} ${utils.i18n(`Category${video.categoryId}`) || CATEGORIES_IDS[video.categoryId]}`
        }

        // Max Duration
        if (YoutubeVideo.IsDurationLonger(video.duration, LOCAL_ITEMS.blockedVideoDuration)) {
            return {
                optionId: 'video_max_duration',
                reason: utils.i18n('BlockReasonDuration').replace(/%1/g, LOCAL_ITEMS.blockedVideoDuration)
            }
        }

        // Min Duration
        if (YoutubeVideo.IsDurationShorter(video.duration, LOCAL_ITEMS.blockedVideoMinDuration, video.isShorts)) {
            return {
                optionId: 'video_min_duration',
                reason: utils.i18n('BlockReasonMinDuration').replace(/%1/g, LOCAL_ITEMS.blockedVideoMinDuration)
            }
        }

        // Is video too old
        if (YoutubeVideo.IsVideoTooOld(video.publishedAt, LOCAL_ITEMS.blockedVideoMaxOlder)) {
            return {
                optionId: 'video_max_older',
                reason: `Video older than %1 day(s).`.replace(/%1/g, LOCAL_ITEMS.blockedVideoMaxOlder)
            }
        }

        // Is video too newer
        if (YoutubeVideo.IsVideoTooNew(video.publishedAt, LOCAL_ITEMS.blockedVideoMaxNewer)) {
            return {
                optionId: 'video_max_newer',
                reason: `Video newer than %1 day(s).`.replace(/%1/g, LOCAL_ITEMS.blockedVideoMaxNewer)
            }
        }

        // Title
        if (video.title) keywordMatch = matcher.match(video.title, video, keywords.titles, {
            caseSensitive: LOCAL_ITEMS.blockedTitlesCaseSensitive,
            wordBoundary: LOCAL_ITEMS.blockedTitlesWordBound
        });
        if (keywordMatch) return {
            optionId: 'block_titles',
            reason: `${utils.i18n('BlockReasonTitle')} ` + keywordMatch
        }
        
        if (video.title) keywordMatch = matcher.match(video.title, video, keywords.contents, {
            caseSensitive: LOCAL_ITEMS.blockedContentKeywordCaseSensitive,
            wordBoundary: LOCAL_ITEMS.blockedContentKeywordWordBound
        });
        if (keywordMatch) return {
            optionId: 'block_content',
            reason: `${utils.i18n('BlockReasonTitle')} ` + keywordMatch
        }

        // Description
        if (video.description) keywordMatch = matcher.match(video.description, video, keywords.descriptions, {
            caseSensitive: LOCAL_ITEMS.blockedDescriptionsCaseSensitive,
            wordBoundary: LOCAL_ITEMS.blockedDescriptionsWordBound
        });
        if (keywordMatch) return {
            optionId: 'block_descriptions',
            reason: `${utils.i18n('BlockReasonDescription')} ` + keywordMatch
        }

        // Tags
        if (video.tags && video.tags.length) keywordMatch = matcher.match(video.tags, video, keywords.tags, {
            exactMatch: true
        });
        if (keywordMatch) return {
            optionId: 'block_tags',
            reason: `${utils.i18n('BlockReasonTag')} ` + keywordMatch
        }
    }

    getBlockOverlayType() {
        return horizontalElements.includes(this.element.tagName.toLowerCase()) ? 'horizontal' : 'grid';
    }

    getElementToHide() {
        if (this.element.matches('ytd-rich-grid-slim-media')) {
            return $(this.element).parents('ytd-rich-item-renderer')[0] || this.element;
        }
        return this.element;
    }

    static GetVideoId(url) {
        if (!url) return '';
        url = decodeURI(url);
    
        // shorts: https://www.youtube.com/shorts/{ID_HERE}
        // videos: https://www.youtube.com/watch?v={ID_HERE}
        // videos or shorts: https://youtu.be/{ID_HERE}
    
        const match = (
            url.match(/^https?:\/\/(?:(?:www|m)\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:\?.*|$)/) ||
            url.match(/^https?:\/\/(?:(?:www|m)\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:&.*|$)/) ||
            url.match(/^https?:\/\/youtube\.be\/([A-Za-z0-9_-]{11})(?:\?.*|$)/)
        );
    
        if (!match) return '';
        return match[1];
    }

    /** Get duration in seconds from duration format from youtube (hh:mm:ss) */
    static GetDurationFromStringFormat(str) {
        if (!str) return 0;
        const durationMatch = str.trim().match(/^(?:(\d+):)?(\d+):(\d+)$/);
        if (!durationMatch) return 0;

        const hours = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseInt(durationMatch[3]);

        return (hours * 3600) + (minutes * 60) + seconds;
    }

    static IsDurationLonger(videoDuration, checkDuration) {
        if (!videoDuration) return false;
        if (!checkDuration || checkDuration < 0) return false;
        return videoDuration > checkDuration;
    }

    static IsDurationShorter(videoDuration, checkDuration, isShorts= false) {
        if (!checkDuration || checkDuration < 0) return false;
        if (isShorts && checkDuration >= 60) return true;
        if (!videoDuration) return false;
        return videoDuration < checkDuration;
    }

    /** @param {number} publishedDate @param {number} days */
    static IsVideoTooOld(publishedDate, days) {
        if (!publishedDate) return false; 
        if (!days || days <= 0) return false; 

        const date = new Date();
        date.setDate(date.getDate() - days);
        
        return publishedDate < date.getTime();
    }

    /** @param {number} publishedDate @param {number} days */
    static IsVideoTooNew(publishedDate, days) {
        if (!publishedDate) return false; 
        if (!days || days <= 0) return false; 

        const date = new Date();
        date.setDate(date.getDate() - days);

        return publishedDate > date.getTime();
    }

    static CreateUrlWithId(videoId, isShorts = false) {
        if (!videoId) return '';
        if (isShorts) {
            return `https://www.youtube.com/shorts/${videoId}`;
        } else {
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
    }

    /** 
     * Remove unecessary queries from video url.\
     * `.../watch?v=abcEv49_2T5&list=...` -> `.../watch?v=abcEv49_2T5`
     * @param {string} url 
     * */
    static GetVideoUrlWithoutQueries(url) {
        return url.replace(/&.+/, '');
    }

    /** @param {HTMLElement} element */
    static GetContentClassFromElement(element) {
        if (element.matches('ytd-reel-video-renderer')) return YoutubeShorts;
        if (element.matches('ytm-video-with-context-renderer, ytm-reel-item-renderer')) return YoutubeMobileVideo;
        return this;
    }
}