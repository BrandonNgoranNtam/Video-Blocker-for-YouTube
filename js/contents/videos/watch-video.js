
let skipVideoTimeout = null;

class WatchVideo extends YoutubeVideo {
    constructor(...params) {
        super(...params, false, false);

        MM.on(MMK.urlUpdate, newUrl => {
            this.checkUrl();
        });

        this.lastBlockedVideoId = '';

        this.listeningToVideoLoad = false;
        this.lookingForVideo = false;

        /** @type {HTMLVideoElement} */
        this.video = null; 
        this.metadataElement = document.querySelector('ytd-watch-metadata');
        this.descriptionElement = document.querySelector('#description.ytd-video-secondary-info-renderer');
        this.scriptTagElement = document.querySelector('script#scriptTag');
        this.miniplayerButton = document.querySelector('button.ytp-miniplayer-button');
        /** @type {HTMLElement} */
        this.timeDurationElement = null;

        if (this.metadataElement) this.onMetadataFound();
        if (this.descriptionElement) this.onDescriptionFound();
        if (this.miniplayerButton) this.onMiniplayerButtonFound();
        this.getTimeDurationElement();

        contentFinder.contents[CONTENT_TYPES.video][this.elementId] = this;

        this.playlistId = '';
        this.autoSkipTimeout = null;
        
        this.waitForElements();
        this.checkUrl();

        SM.onChange({
            watchKeys: {
                autoSkipBlockedVideos: value => {
                    if (!value) return;
                    if (this.shouldAutoSkip(value)) this.startAutoSkip();
                },
                removeWatchAnyway: value => {
                    if (!this.blocked) return;
                    this.blockOverlay.show(value);
                }
            }
        })
    }

    /**
     * Retrieves the dropdown button element from the metadata element.
     *
     * @return {Element|null} The dropdown button element or null if not found.
     */
    getDropdownButton() {
        return this.metadataElement?.querySelector('yt-button-shape[id="button-shape"]');
    }

    checkUrl() {
        const videoId = YoutubeVideo.GetVideoId(location.href);
        if (!videoId) return;

        this.playlistId = YoutubePlaylist.GetPlaylistId(location.href);

        this.updateVideoId(videoId);
        this.findVideoElement();
        this.getTimeDurationElement();
    }

    getVideoElement() {
        if (this.video) return;
        
        this.video = this.element.querySelector('video');
        if (!this.video) return;

        this.getTimeDurationElement();

        utils.devLog('video element found', this.video);

        if (this.shouldPauseVideo()) this.video.pause();

        this.video.addEventListener('play', e => {
            this.onVideoPlay();
        });

    }

    onVideoPlay() {
        utils.devLog('video play', this.video);
        if (this.shouldPauseVideo()) this.video.pause();
    }

    shouldPauseVideo() {
        return this.video && this.blocked && WatchVideo.IsWatchPage() && !this.blockOverlay.hidden
    }

    waitForElements() {
        observer.watchElements([
            {
                elements: ['ytd-watch-metadata'],
                onElement: element => {
                    if (this.metadataElement) return;

                    this.metadataElement = element;
                    this.onMetadataFound();
                }
            }, {
                elements: ['#description'],
                onElement: element => {
                    if (this.descriptionElement) return;
                    if (!element.classList.contains('ytd-video-secondary-info-renderer')) return;

                    this.descriptionElement = element;
                    this.onDescriptionFound();
                }
            }, {
                elements: ['button.ytp-miniplayer-button'],
                onElement: element => {
                    if (this.miniplayerButton) return;

                    this.miniplayerButton = element;
                    this.onMiniplayerButtonFound();
                }
            }
        ])
    }

    onMetadataFound() {
        this.watchElementChange(this.metadataElement, () => { this.getMetadataInfo(); });
        this.getMetadataInfo();
    }

    onDescriptionFound() {
        this.watchElementChange(this.descriptionElement, () => { this.getDescriptionInfo(); })
        this.getDescriptionInfo();
    }

    onMiniplayerButtonFound() {
        // miniplayer has no playlist when the user start a queue by clicking in the miniplayer button on video player.
        // so let's pass the info to it.
        this.miniplayerButton.addEventListener('click', e => {
            if (playerFinder.miniPlayer) playerFinder.miniPlayer.onMiniplayerButtonClicked(this.info);
        });
    }

    getTimeDurationElement() {
        if (this.timeDurationElement) return;

        this.timeDurationElement = this.element.querySelector('.ytp-time-duration');
        if (!this.timeDurationElement) return;

        this.onTimeDurationChange();

        observer.observeElement(this.timeDurationElement, () => {
            this.onTimeDurationChange();
        }, { characterData: true, childList: true, subtree: true });
    }

    onTimeDurationChange() {
        const duration = YoutubeVideo.GetDurationFromStringFormat(this.timeDurationElement.textContent);
        if (duration && this.info.duration !== duration) {
            
            this.info.duration = duration;
            this.emitUpdate();
        }
    }

    updateVideoId(videoId) {
        if (this.info.id === videoId) return;

        const cacheInfo = videoId ? this.getCacheInfo(videoId) : null;
        const apiData = videoId ? this.getAPIdata(videoId) : null;

        const urlWithoutQueries = videoId ? YoutubeVideo.GetVideoUrlWithoutQueries(location.href || cacheInfo?.url) : '';
        const url = location.href || cacheInfo?.url || urlWithoutQueries || '';

        const playlistId = YoutubePlaylist.GetPlaylistId(url);
        const isFromPlaylist = Boolean(playlistId);
        const isWatchLater = Boolean(playlistId && playlistId === 'WL');

        /** @type {YoutubeVideoInfo} */
        const info = {
            id: videoId,
            isVideo: true,
            contentType: CONTENT_TYPES.video,
            title: cacheInfo?.title || apiData?.title || '',
            url,
            description: cacheInfo?.description || apiData?.description || '',
            tags: apiData?.tags || [],
            categoryId: cacheInfo?.categoryId || apiData?.categoryId || '',
            channel: cacheInfo?.channel || (apiData ?? { name: apiData?.channelTitle, apiId: apiData?.channelId }) || null,
            duration: cacheInfo?.duration || apiData?.duration || 0,
            isFromPlaylist,
            isWatchLater,
            isPlaylist: false,
            isPremiere: false, // TODO
            isLive: false, // TODO
            isShorts: false,
            publishedAt: cacheInfo?.publishedAt || apiData?.publishedAt || 0,
        }

        utils.devLog('new watch video', info);
        
        this.info = info;
        this.emitUpdate();
    }

    getMetadataInfo() {
        if (!this.metadataElement) return;

        /** @type {YoutubeVideoInfo} */
        const info = this.info;

        const apiData = this.getAPIdata();
        const cacheInfo = this.getCacheInfo();

        const titleElement = this.metadataElement.querySelector('#title yt-formatted-string');
        info.title = titleElement?.textContent.replace(/  /g, ' ').replace(/\u034F/g, '').trim() || cacheInfo?.title || apiData?.title.replace(/\u034F/g, '') || '';

        const channelLinkElement = this.metadataElement.querySelector('#channel-name a');
        const channelHandle = YoutubeVideo.GetChannelHandle(channelLinkElement?.href);

        const verifiedBadge = this.metadataElement.querySelector('#channel-name ytd-badge-supported-renderer');
        const channelVerified = Boolean( verifiedBadge && verifiedBadge.children.length >= 2 );

        this.setChannelBlockButton();

        info.channel = {
            name: channelLinkElement?.textContent?.replace(/\u034F/g, '').trim() || cacheInfo?.title || apiData?.channelTitle || '',
            url: decodeURI(channelLinkElement?.href || '') || cacheInfo?.channel?.url || '',
            handle: channelHandle || cacheInfo?.channel?.handle || '',
            id: channelHandle?.replace('@', '') || cacheInfo?.channel?.id || '',
            urlId: YoutubeContent.GetChannelUrlId(channelLinkElement?.href) || cacheInfo?.channel?.urlId || '',
            verified: channelVerified || cacheInfo?.channel?.verified || false,
            apiId: apiData?.channelId || ''
        }

        this.handleDropdownButton();

        this.emitUpdate();
    }

    setChannelBlockButton() {
        if (!LOCAL_ITEMS.addBlockChannelButton) return;
        if (!this.metadataElement) return;
        
        const element = this.metadataElement.querySelector('ytd-channel-name');

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

    getDescriptionInfo() {
        if (!this.descriptionElement) return;

        /** @type {YoutubeVideoInfo} */
        const info = this.info;

        const apiData = this.getAPIdata();
        const cacheInfo = this.getCacheInfo();

        const descElement = this.descriptionElement.querySelector('span');
        info.description = descElement?.textContent.replace(/\u034F/g, '').trim() || cacheInfo?.description || apiData?.description.replace(/\u034F/g, '') || '';

        this.emitUpdate();
    }

    watchElementChange(element, callback) {
        const observer = new MutationObserver(() => {
            callback();
        });

        observer.observe(element, {
            childList: true,
            subtree: true
        })
    }

    updateInfo() {
        this.getMetadataInfo();
        this.getDescriptionInfo();
    }

    /** @param {BlockInfo} blockInfo */
    shouldUpdateBlock(blockInfo) {
        if (this.info.id !== this.lastBlockedVideoId) return true;
        if (this.blockInfo.reason !== blockInfo.reason) return true;
        if (this.info.id !== this.lastBlockedVideoId) return true;
        if (this.blockInfo.optionId !== blockInfo.optionId) return true;
        return false;
    }

    /** @param {BlockInfo} blockInfo */
    block(blockInfo) {

        if (this.blocked && !this.shouldUpdateBlock(blockInfo)) {
            return;
        }

        this.lastBlockedVideoId = this.info.id;
        this.blockInfo = blockInfo;

        this.blocked = true;
        this.element.setAttribute(EL_ATTRIBUTES.blocked, '');

        if (!this.blockOverlay) this.blockOverlay = new WatchVideoBlockOverlay(this.element, blockInfo, this);

        this.blockOverlay.setBlockInfo(blockInfo);
        this.blockOverlay.setContent(this);

        this.blockOverlay.show(LOCAL_ITEMS.removeWatchAnyway);

        if (this.shouldPauseVideo()) this.video.pause();

        if (this.shouldAutoSkip()) {
            this.startAutoSkip();
        }
    }

    unblock() {
        this.lastBlockedVideoId = '';
        this.blockInfo = null;

        if (!this.blocked) return;

        this.blocked = false;
        this.element.removeAttribute(EL_ATTRIBUTES.blocked);

        this.blockOverlay.setBlockInfo({});
        this.blockOverlay.hide();
    }

    shouldAutoSkip(autoSkipBlockedVideos = false) {
        if (!this.playlistId) return false;
        if (!autoSkipBlockedVideos && !LOCAL_ITEMS.autoSkipBlockedVideos) return false;
        if (LOCAL_ITEMS.ignorePlaylistVideos) return false;
        if (!this.blocked) return false;
        if (this.blockOverlay.hidden) return false;
        if (!YoutubeVideo.GetVideoId(location.href)) return false;

        return true;
    }

    startAutoSkip() {
        if (this.autoSkipTimeout) {
            clearTimeout(this.autoSkipTimeout);
            this.autoSkipTimeout = null;
        }

        utils.devLog('starting auto skip...');
        this.autoSkipTimeout = setTimeout(async () => {
            if (!LOCAL_ITEMS.blockOpenedVideos || !LOCAL_ITEMS.autoSkipBlockedVideos) return utils.devLog(`auto-skip cancelled because ${SMK.blockOpenedVideos} or ${SMK.autoSkipBlockedVideos} are disabled.`, this);
            if (this.blockOverlay.hidden) return utils.devLog(`auto-skip cancelled because overlay is not hidden.`, this);
            if (!this.playlistId) return utils.devLog(`auto-skip cancelled because video is no longer in a playlist.`, this);
            if (!this.blocked) return utils.devLog(`auto-skip cancelled because video is no longer blocked.`, this);

            const nextButton = document.querySelector('#primary #player .ytp-next-button', this);
            if (!nextButton) return utils.devLogWarn('could not find the nextButton to auto skip the video.', this);

            // checking if is the last one in the playlist.
            let last = false;
            try {
                const playlistItems = document.querySelectorAll('#secondary-inner #playlist #playlist-items');
                if (playlistItems && playlistItems.length && playlistItems[playlistItems.length -1].hasAttribute('selected')) {
                    last = true;
                }
            } catch(err) {
                utils.devLog(`auto-skip could not find if the video was the last one in playlist`, err, this);
            }

            if (!last) {
                nextButton.click();
                utils.devLog('video auto-skipped', this);
            } else {
                utils.devLog('auto-skip ignored because it is the last video from playlist.', this);
            }
        }, 5000); 
    }

    findVideoElement() {
        this.getVideoElement();

        if (this.video) return;
        if (this.lookingForVideo) return;

        utils.devLog('looking for video...');

        this.lookingForVideo = true;

        utils.waitCallback(cfg => {
            if (!WatchVideo.IsWatchPage()) cfg.stop = true;
            this.getVideoElement();
            return this.video;
        }, 100).finally(() => {
            this.lookingForVideo = false;
            if (!this.video) utils.devLog('could not find video');
        });
    }

    static IsWatchPage(url = '') {
        if (!url) url = location.href;
        return url.includes('/watch?') && Boolean(YoutubeVideo.GetVideoId(url));
    }
    
}