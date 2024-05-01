// Add and remove overlay on top of the watch video.

class WatchVideoBlockOverlay extends BlockOverlay {

    /** @param {HTMLElement} element @param {BlockInfo} blockInfo @param {YoutubeContent} content */
    constructor(element, blockInfo, content) {
        super(element, blockInfo, content, 'watch');
        
        this.hideRevealButton = false;

        SM.onChange({
            watchKeys: {
                removeUnblockButton: () => { this.updateElements() },
                removeOptionsButton: () => { this.updateElements() },
                removeBlockReason: () => { this.updateElements() }
            }
        })
    }

    create() {
        if (!this.element) return utils.devLogWarn('Cannot create a block overlay without an element.');
        if (this.overlayElement) return;

        const overlay = document.createElement('div');

        overlay.className = `ytb-overlay`;
        overlay.setAttribute('type', 'watch');

        const iconUrl = chrome.runtime.getURL('images/icon-128.png');
        const blockedStr = utils.i18n('BLOCKED');
        const unblockStr = utils.i18n('Unblock');
        const optionsStr = utils.i18n('Options');
        const watchAnyway = utils.i18n('WatchAnyway');

        overlay.innerHTML = /*html*/`
            <div class="miniplayer-buttons ${EL_CLASSES.hide}">
                <button class="expand">${expandSvgIcon()}</button>
                <button class="close">${closeSvgIcon()}</button>
                <button class="prev-video">${previousVideoSvgIcon()}</button>
                <button class="next-video">${nextVideoSvgIcon()}</button>
            </div>
            <img src="${iconUrl}">
            <h2>${blockedStr}</h2>
            <div id="reason"></div>
            <a id="revealButton" tabindex="0">${watchAnyway}</a>
            <div id="buttons">
                <a id="unblock" tabindex="0">${unblockStr}</a>
                <a id="options" tabindex="0">${optionsStr}</a>
            </div>
        `

        overlay.querySelector('.miniplayer-buttons .expand').addEventListener('click', e => {
            document.querySelector('.ytp-miniplayer-expand-watch-page-button')?.click();
        });

        overlay.querySelector('.miniplayer-buttons .close').addEventListener('click', e => {
            document.querySelector('.ytp-miniplayer-close-button')?.click();
        });

        overlay.querySelector('.miniplayer-buttons .prev-video').addEventListener('click', e => {
            document.querySelector('.miniplayer .ytp-prev-button')?.click();
        });

        overlay.querySelector('.miniplayer-buttons .next-video').addEventListener('click', e => {
            document.querySelector('.miniplayer .ytp-next-button')?.click();
        });

        this.optionsButton = overlay.querySelector('#options');
        utils.onClick(this.optionsButton, e => {
            this.onOptionsClicked(e);
        });

        this.unblockButton = overlay.querySelector('#unblock');
        utils.onClick(this.unblockButton, e => {
            this.onUnblockClicked(e);
        });

        this.revealButton = overlay.querySelector('#revealButton');
        utils.onClick(this.revealButton, e => {
            this.hide();
        });

        if (this.hideRevealButton) this.revealButton.classList.add(EL_CLASSES.hide);
        
        this.reasonElement = overlay.querySelector('#reason');
        this.overlayElement = overlay;

        this.element.classList.add(EL_CLASSES.overlayContainer);

        this.updateInfo();

        this.element.insertAdjacentElement('afterbegin', overlay);
    }

    show(hideRevealButton, isMiniplayer = false) {
        if (this.overlayElement) this.overlayElement.classList.remove(EL_CLASSES.hide);
        this.hidden = false;

        this.hideRevealButton = hideRevealButton;
        if (this.hideRevealButton) {
            this.revealButton.classList.add(EL_CLASSES.hide);
        } else {
            this.revealButton.classList.remove(EL_CLASSES.hide);
        }

        if (isMiniplayer) {
            this.overlayElement.querySelector('.miniplayer-buttons').classList.remove(EL_CLASSES.hide);
        } else {
            this.overlayElement.querySelector('.miniplayer-buttons').classList.add(EL_CLASSES.hide);
        }

        this.updateElements();
    }

    updateElements() {
        if (this.unblockButton) {
            if (LOCAL_ITEMS.removeUnblockButton) {
                this.unblockButton.classList.add(EL_CLASSES.hide);
            } else if (this.blockInfo && (this.blockInfo.contentId || this.blockInfo.channelBlock)) {
                this.unblockButton.classList.remove(EL_CLASSES.hide);
            }
        }
        
        if (this.reasonElement) {
            const hasReason = Boolean(this.blockInfo && this.blockInfo.reason);

            if (LOCAL_ITEMS.removeBlockReason) {
                this.reasonElement.classList.add(EL_CLASSES.hide);
            } else if (hasReason) {
                this.reasonElement.classList.remove(EL_CLASSES.hide);
            }
        }

        if (this.optionsButton) {
            if (LOCAL_ITEMS.removeOptionsButton) {
                this.optionsButton.classList.add(EL_CLASSES.hide);
            } else {
                this.optionsButton.classList.remove(EL_CLASSES.hide);
            }
        }
    }

    hide() {
        if (this.overlayElement) this.overlayElement.classList.add(EL_CLASSES.hide);
        this.hidden = true;
    }

    /** @param {BlockInfo} blockInfo */
    setBlockInfo(blockInfo) {
        this.blockInfo = blockInfo;
        this.updateInfo();
    }

    hasVideoPreview() {
        return this.element.matches('ytd-rich-grid-media, [is-search]');
    }
}

function expandSvgIcon() {
    return `<svg height="25px" version="1.1" viewBox="0 0 24 24" width="25px"><g fill="none" fill-rule="evenodd" stroke="none" stroke-width="1"><g transform="translate(12.000000, 12.000000) scale(-1, 1) translate(-12.000000, -12.000000) "><path d="M19,19 L5,19 L5,5 L12,5 L12,3 L5,3 C3.89,3 3,3.9 3,5 L3,19 C3,20.1 3.89,21 5,21 L19,21 C20.1,21 21,20.1 21,19 L21,12 L19,12 L19,19 Z M14,3 L14,5 L17.59,5 L7.76,14.83 L9.17,16.24 L19,6.41 L19,10 L21,10 L21,3 L14,3 Z" fill="#fff" fill-rule="nonzero"></path></g></g></svg>`
}

function closeSvgIcon() {
    return `<svg height="25px" viewBox="0 0 24 24" width="25px"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#fff"></path></svg>`
}

function previousVideoSvgIcon() {
    return `<svg height="50px" version="1.1" viewBox="0 0 36 36" width="50px"><use class="ytp-svg-shadow" xlink:href="#ytp-id-132"></use><path class="ytp-svg-fill" d="m 12,12 h 2 v 12 h -2 z m 3.5,6 8.5,6 V 12 z" id="ytp-id-132"></path></svg>`
}

function nextVideoSvgIcon() {
    return `<svg height="50px" version="1.1" viewBox="0 0 36 36" width="50px"><use class="ytp-svg-shadow" xlink:href="#ytp-id-134"></use><path class="ytp-svg-fill" d="M 12,24 20.5,18 12,12 V 24 z M 22,12 v 12 h 2 V 12 h -2 z" id="ytp-id-134"></path></svg>`
}