
class ShortsManager {
    constructor() {

        this.lookingForVideoPlayer = false;
        /** @type {HTMLVideoElement} */
        this.videoPlayer = null;

        /** @type {YoutubeShorts} */
        this.activeShortVideo = null;

        this.autoSkipTimeout = null;
        this.autoSkipTime = 1000;

        SM.onChange({
            watchKeys: {
                autoSkipBlockedShorts: value => {
                    if (!value) return; 
                    setTimeout(() => {
                        this.onActiveShortBlocked();
                    }, 100);
                }
            }
        })
    }

    start() {
        this.getVideoPlayer();

        this.checkUrl();
        MM.on(MMK.urlUpdate, () => {
            this.checkUrl();
        });
    }

    checkUrl() {
        if (!this.isShortsPage()) return;
        
        if (this.videoPlayer && document.querySelector('ytd-reel-video-renderer video') === this.videoPlayer) return;
        this.videoPlayer = null;
        
        this.findVideoPlayer();
    }

    findVideoPlayer() {
        this.getVideoPlayer();

        if (this.videoPlayer) return;
        if (this.lookingForVideo) return;

        this.lookingForVideo = true;

        utils.waitCallback(cfg => {
            if (!this.isShortsPage()) cfg.stop = true;

            this.getVideoPlayer();

            return this.video;

        }, 100).finally(() => {
            this.lookingForVideo = false;
        });
    }

    getVideoPlayer() {
        if (this.videoPlayer) return;

        this.videoPlayer = document.querySelector('ytd-reel-video-renderer video');
        if (!this.videoPlayer) return;

        this.videoPlayer.setAttribute('m', '');

        utils.devLog('shorts video found!', this.videoPlayer);

        this.videoPlayer.addEventListener('canplay', e => {
            if (this.activeShortVideo && this.activeShortVideo.blocked) this.videoPlayer.pause();
        });

        if (this.activeShortVideo && this.activeShortVideo.blocked) this.videoPlayer.pause();
    }

    /** @param {YoutubeShorts} shorts */
    onActiveShortsChange(shorts) {
        this.activeShortVideo = shorts;
        utils.devLog('active shorts changed:', shorts);

        clearTimeout(this.autoSkipTimeout);

        if (this.activeShortVideo.blocked) {
            this.onActiveShortBlocked();

            if (this.videoPlayer) this.videoPlayer.pause();
        }
    }

    // user scrolled to an blocked short or the short was blocked while active.
    onActiveShortBlocked() {
        if (!LOCAL_ITEMS.autoSkipBlockedShorts) return;
        if (!this.activeShortVideo || !this.activeShortVideo.element) return;
        if (this.activeShortVideo.element.hasAttribute(EL_ATTRIBUTES.shortSkipped)) return;

        this.autoSkipTimeout = setTimeout(() => {
            if (!LOCAL_ITEMS.autoSkipBlockedShorts) return;

            if (!this.activeShortVideo || !this.activeShortVideo.element) return;
            if (!this.activeShortVideo.blocked) return;
            if (!this.isShortsPage()) return;

            const scrollToVideoBelow = () => {
                // instead of using scrollIntoView(), this has a nicer animation, so use this if a unblocked video is exactly below.
                const buttonDown = document.querySelector('#navigation-button-down button');
                if (buttonDown) buttonDown.click();
            }

            // skip multiple blocked videos in a row.
            const shortsElements = [...document.querySelectorAll('#shorts-inner-container ytd-reel-video-renderer')];
            let flag = false;
            let distance = 0;
            const shortsToSkip = [this.activeShortVideo.element];

            const markShortsAsSkipped = () => {
                shortsToSkip.forEach(el => { if (el) el.setAttribute(EL_ATTRIBUTES.shortSkipped, '') });
            }

            for (const shortElement of shortsElements) {
                if (flag) {
                    distance++;

                    if (!shortElement.hasAttribute(EL_ATTRIBUTES.blocked)) {
                        markShortsAsSkipped();
                        
                        if (distance > 1) return shortElement.scrollIntoView();
                        return scrollToVideoBelow();
                    } else {
                        shortsToSkip.push(shortElement);
                    }

                } else if (shortElement === this.activeShortVideo.element) {
                    flag = true;
                }
            }

            markShortsAsSkipped();

            // if no blocked videos in a row was found, just go down to youtube get more videos.
            scrollToVideoBelow();

        }, this.autoSkipTime);
    }

    isShortsPage(url = '') {
        if (!url) url = location.href;
        return url.includes('/shorts/');
    }
}

const shortsManager = new ShortsManager();