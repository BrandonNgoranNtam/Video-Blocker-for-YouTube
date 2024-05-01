
class YoutubePreviewPlayer {

    /** @param {HTMLElement} element */
    constructor(element) {
        this.element = element;

        /** @type {HTMLVideoElement} */
        this.video = null;

        this.disabled = false;
    }

    onVideoFound(video) {
        this.video = video;

        this.video.setAttribute(EL_ATTRIBUTES.previewVideo, '');
        this.video.addEventListener('play', e => {
            this.checkVideo();
        });

        this.checkVideo();
    }

    checkVideo() {
        if (!this.video) return;
        if (this.disabled) {
            this.video.classList.add(EL_CLASSES.hide);
            if (!this.video.paused) this.video.pause();
        } else {
            this.video.classList.remove(EL_CLASSES.hide);
        }
    }

    enable() {
        this.disabled = false;
        this.checkVideo();
    }

    disable() {
        this.disabled = true;
        this.checkVideo();
    }
}