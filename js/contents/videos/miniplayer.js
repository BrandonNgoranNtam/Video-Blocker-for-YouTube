
class YoutubeMiniplayer extends YoutubeVideo {
    constructor(...params) {
        super(...params, false, false);

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
        });

        
        this.actualMiniplayerElement = document.querySelector('ytd-miniplayer');
        this.cardElement = this.element.parentElement.parentElement.parentElement;
        this.queueElement = this.cardElement.querySelector('#playlist #items');
        
        this.lastBlockedVideoId = '';

        this.active = this.actualMiniplayerElement.hasAttribute('active');
        if (this.active) this.findVideoElement();

        /** @type {YoutubeVideo} */
        this.selectedQueueVideo = null;

        observer.observeElement(this.queueElement, () => {
            const selectedElement = this.queueElement.querySelector('[selected]');
            if (!selectedElement) return;

            const elementId = selectedElement.getAttribute(EL_ATTRIBUTES.elementId);

            if (!this.selectedQueueVideo || this.selectedQueueVideo.elementId !== elementId) {

                const video = contentFinder.contents[CONTENT_TYPES.video][elementId];
                if (!video) return;

                this.onQueueVideoSelected(video);
            }
        }, { childList: true, attributeFilter: ['selected', EL_ATTRIBUTES.elementId], attributes: true, subtree: true });

        observer.observeElement(this.actualMiniplayerElement, () => {
            const active = this.actualMiniplayerElement.hasAttribute('active');
            if (this.active !== active) this.onActiveChange(active);
        }, { attributeFilter: ['active'], attributes: true, characterData: true })

    }

    onActiveChange(active) {
        this.active = active;

        if (this.active && !this.video) this.findVideoElement();
    }

    shouldPauseVideo() {
        return this.video && this.blocked && this.active && !this.blockOverlay.hidden
    }

    /** @param {YoutubeVideo} video */
    onQueueVideoSelected(video) {
        this.selectedQueueVideo = video;
        this.info = this.selectedQueueVideo.info;

        utils.devLog('mini-player video selected:', video, this.info);

        this.emitUpdate();
    }

    updateInfo() {
        if (!this.selectedQueueVideo) return;
        this.info = this.selectedQueueVideo.info;
    }

    getVideoElement() {
        if (this.video) return;
        
        this.video = this.element.querySelector('video');
        if (!this.video) return;

        if (this.shouldPauseVideo()) this.video.pause();

        this.video.addEventListener('play', e => {
            this.onVideoCanPlay();
        });

    }

    /** @param {YoutubeVideoInfo} info */
    onMiniplayerButtonClicked(info) {
        this.setInfo(info);
    }

    /** @param {YoutubeVideoInfo} info */
    setInfo(info) {
        this.info = info;
        this.emitUpdate();
    }

    onVideoCanPlay() {
        const thumbnailsNowPlayerOverlay = [...document.querySelectorAll('.ytd-thumbnail ytd-thumbnail-overlay-now-playing-renderer')];
        const hasNowPlaying = thumbnailsNowPlayerOverlay.some(overlay => window.getComputedStyle(overlay).pointerEvents === 'auto');
        if (!this.hasQueue() && !hasNowPlaying && this.blocked) {
            this.unblock();
        }

        if (this.shouldPauseVideo()) this.video.pause();
    }

    hasQueue() {
        return Boolean(this.queueElement.querySelector('[selected]'));
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
        
        this.blockOverlay.show(LOCAL_ITEMS.removeWatchAnyway, true);

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
        if (!this.active) return false;
        if (!autoSkipBlockedVideos && !LOCAL_ITEMS.autoSkipBlockedVideos) return false;
        if (LOCAL_ITEMS.ignorePlaylistVideos) return false;
        if (!this.blocked) return false;
        if (this.blockOverlay.hidden) return false;

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
            if (this.blockOverlay.hidden) return utils.devLog(`auto-skip cancelled because overlay is revealed.`, this);
            if (!this.active) return utils.devLog(`auto-skip cancelled because mini-player is no longer open.`, this);
            if (!this.blocked) return utils.devLog(`auto-skip cancelled because video is no longer blocked.`, this);

            const nextButton = this.cardElement.querySelector('.ytp-next-button', this);
            if (!nextButton) return utils.devLogWarn('could not find the nextButton to auto skip the video.', this);

            // checking if is the last one in the queue.
            let last = false;
            try {
                const playlistItems = this.cardElement.querySelectorAll('#playlist #items #playlist-items');
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

        utils.devLog('looking for video');

        this.lookingForVideo = true;

        utils.waitCallback(cfg => {
            if (!this.active) cfg.stop = true;

            this.getVideoElement();
            return this.video;
        }, 100).finally(() => {
            this.lookingForVideo = false;
            if (!this.video) utils.devLog('could not find video');
        });
    }
}