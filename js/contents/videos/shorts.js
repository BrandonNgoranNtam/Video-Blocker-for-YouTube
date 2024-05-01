
class YoutubeShorts extends YoutubeVideo {

    /** @returns {YoutubeVideoInfo} */
    getInfoFromElement() {

        const titleElement = this.element.querySelector('a.ytp-title-link');
        const linkElement = titleElement;
        
        const channelLinkElement = this.element.querySelector('.ytd-channel-name a') || this.element.querySelector('a.ytd-channel-name');
        const channelNameElement = this.element.querySelector('.ytd-channel-name #text') || this.element.querySelector('.ytd-channel-name a') || this.element.querySelector('.ytd-channel-name');

        if (!linkElement) {
            const playerContainer = this.element.querySelector('#player-container');
            let vidId = '';
            if (playerContainer?.style?.backgroundImage) {
                const videoIdMatch = playerContainer.style.backgroundImage.match(/\/vi\/([A-Za-z0-9_-]{11})\//);
                vidId = videoIdMatch ? videoIdMatch[1] : '';
            }

            var videoId = vidId;
            var videoUrl = YoutubeVideo.CreateUrlWithId(videoId, true);

        } else {
            var videoUrl = linkElement?.href;
            var videoId = YoutubeVideo.GetVideoId(videoUrl);
        }

        this.setChannelBlockButton();

        const apiData = videoId ? this.getAPIdata(videoId) : null;
        const cache = videoId ? this.getCacheInfo(videoId) : null;

        const channelName = channelNameElement?.textContent?.trim() || cache?.channel?.name || apiData?.channelTitle || '';
        const channelHandle = YoutubeContent.GetChannelHandle(channelLinkElement?.href);

        const descriptionElement = this.element.querySelector('#description yt-formatted-string');

        // checking if channel has the verified mark ( does not appear on playlists videos )
        const verifiedBadge = this.element.querySelector('ytd-badge-supported-renderer.ytd-channel-name');
        const channelVerified = Boolean(verifiedBadge && verifiedBadge.children.length >= 2);

        const urlWithoutQueries = YoutubeVideo.CreateUrlWithId(videoId, true);

        return {
            id: videoId || '',
            url: urlWithoutQueries,
            title: titleElement?.textContent?.trim().replace(/  /g, ' ').replace(/\u034F/g, '') || cache?.title || apiData?.title.replace(/\u034F/g, '') || '',
            description: descriptionElement?.textContent.replace(/\u034F/g, '').trim() || cache?.description || apiData?.description || '',
            categoryId: apiData?.categoryId || '',
            tags: apiData?.tags || [],
            isLive: false,
            isShorts: true,
            isPremiere: false,
            isMix: false,
            publishedAt: apiData?.publishedAt || 0,
            duration: apiData?.duration || 0, // TODO
            isVideo: true,
            contentType: CONTENT_TYPES.video,
            isFromPlaylist: false,
            isWatchLater: false,
            channel: {
                name: channelName?.replace(/\u034F/g, '') || cache?.channel?.name || apiData?.channelTitle || '',
                url: decodeURI(channelLinkElement?.href || '') || cache?.channel?.url || '',
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
        
        const element = this.element.querySelector('ytd-channel-name');

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

    isActive() {
        return this.element.hasAttribute('is-active');
    }

    shouldAddOverlay() {
        return true;
    }

    checkInfo() {
        super.checkInfo();

        // if active short changed, tell shorts manager.
        if ( this.isActive() && (!shortsManager.activeShortVideo || shortsManager.activeShortVideo.elementId !== this.elementId)) {
            shortsManager.onActiveShortsChange(this);
        }
    }

    block(...params) {
        const wasBlocked = this.blocked;

        super.block(...params);
        if (this.isActive()) {

            if (!wasBlocked) shortsManager.onActiveShortBlocked();
            if (shortsManager.videoPlayer) shortsManager.videoPlayer.pause();
        }
    }

}