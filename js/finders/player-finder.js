// this file will find and look for changes in the video of the watch page.

class PlayerFinder {

    constructor() {
        /** @type {WatchVideo} */
        this.watchVideo = null;

        /** @type {YoutubeMiniplayer} */
        this.miniPlayer = null;

        /** @type {YoutubePreviewPlayer} */
        this.previewPlayer = null;
    }

    start() {
        const player = document.querySelector('#ytd-player');
        if (player) this.createWatchVideo(player);

        document.querySelectorAll('#player-container').forEach(el => {
            this.onPlayerContainer(el);
        });

        observer.watchElements([
            {
                elements: ['#player-container'],
                onElement: (element, attr, reparenting) => {
                    this.onPlayerContainer(element);
                }
            },
            {
                elements: ['.video-stream'],
                onElement: (element) => {
                    if (!this.previewPlayer) return;

                    const video = this.previewPlayer.element.querySelector(`video:not([${EL_ATTRIBUTES.previewVideo}])`);
                    if (video) this.previewPlayer.onVideoFound(video);
                }
            }
        ]);
    }

    /** @param {HTMLElement} container */
    onPlayerContainer(container) {
        if (container.matches('.ytd-miniplayer')) {
            // miniplayer

            this.createMiniplayer(container);
        } else if (container.matches('.ytd-watch-flexy')) {
            // watch video

            this.createWatchVideo(container);
        } else if (container.matches('.ytd-video-preview')) {
            // preview video

            this.createPreviewVideo(container);
        }
    }

    /** @param {HTMLElement} element */
    createWatchVideo(element) {
        if (this.watchVideo) return;

        this.watchVideo = new WatchVideo(element, contentFinder, false);
    }

    /** @param {HTMLElement} element */
    createMiniplayer(element) {
        if (this.miniPlayer) return;

        this.miniPlayer = new YoutubeMiniplayer(element, contentFinder, false);
    }

    /** @param {HTMLElement} element */
    createPreviewVideo(element) {
        if (this.previewPlayer) return;

        this.previewPlayer = new YoutubePreviewPlayer(element);
    }
    
}

const playerFinder = new PlayerFinder();
