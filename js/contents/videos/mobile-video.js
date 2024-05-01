
class YoutubeMobileVideo extends YoutubeVideo {

    /** @return {YoutubeVideoInfo} */
    getInfoFromElement() {
        const isShortsElement = this.element.matches('ytm-reel-item-renderer');

        const videoUrl = this.element.querySelector('a')?.href || '';

        if (isShortsElement) {
            var title = this.element.querySelector('.reel-item-metadata h3 span')?.textContent.trim() || '';
        } else {
            var title = this.element.querySelector('h3.media-item-headline span')?.textContent.trim() || '';
        }

        const videoUrlWithoutQueries = YoutubeVideo.GetVideoUrlWithoutQueries(videoUrl);
        const videoId = YoutubeVideo.GetVideoId(videoUrl);

        const apiData = videoId ? this.getAPIdata(videoId) : null;
        const cache = videoId ? this.getCacheInfo(videoId) : null;

        const channelUrl = this.element.querySelector('ytm-channel-thumbnail-with-link-renderer a')?.href || '';
        const channelName = this.element.querySelector('ytm-badge-and-byline-renderer span span')?.textContent.replace(/\u034F/g, '').trim() || '';
        const channelHandle = YoutubeVideo.GetChannelHandle(channelUrl);

        const playlistId = YoutubePlaylist.GetPlaylistId(videoUrl);
        const isFromPlaylist = Boolean(playlistId);
        const isWatchLater = Boolean(playlistId && playlistId === 'WL');

        const durationElement = this.element.querySelector('ytm-thumbnail-overlay-time-status-renderer span span');
        const duration = YoutubeVideo.GetDurationFromStringFormat(durationElement?.textContent);

        const liveBadge = this.element.querySelector('ytm-thumbnail-overlay-time-status-renderer[data-style="LIVE"]');
        const isLive = Boolean(liveBadge);

        const shortsBadge = this.element.querySelector('ytm-thumbnail-overlay-time-status-renderer[data-style="SHORTS"]');
        const isShorts = Boolean(shortsBadge) || isShortsElement;

        return {
            id: videoId || '',
            url: videoUrlWithoutQueries,
            title: title || apiData?.title.replace(/\u034F/g, '') || '',
            description: cache?.description || apiData?.description || '',
            categoryId: apiData?.categoryId || '',
            tags: apiData?.tags || [],
            isLive: isLive,
            isShorts: isShorts,
            isPremiere: false, // TODO
            isMix: false, // TODO
            publishedAt: apiData?.publishedAt || 0,
            duration: duration || cache?.duration || apiData?.duration || 0,
            isVideo: true,
            contentType: CONTENT_TYPES.video, // TODO: check if mix?
            isFromPlaylist: isFromPlaylist,
            isWatchLater: isWatchLater,
            channel: {
                name: channelName || cache?.channel?.name || apiData?.channelTitle || '',
                url: decodeURI(channelUrl) || cache?.channel?.url || '',
                handle: decodeURI(channelHandle) || cache?.channel?.handle || '',
                apiId: apiData?.channelId || '',
                id: channelHandle.replace('@', '') || cache?.channel?.id || '',
                urlId: YoutubeContent.GetChannelUrlId(channelUrl) || cache?.channel?.urlId || '',
                verified: false
            }
        }
    }

    shouldAddOverlay() {
        return false;
    }

}