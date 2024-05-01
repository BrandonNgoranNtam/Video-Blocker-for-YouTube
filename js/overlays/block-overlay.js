// Add and remove overlay on top of the videos.

/** @type {Object<string, BlockOverlay>} */
const overlays = {};

/** 
 * @typedef {Object} BlockInfo
 * @property {string} contentId
 * @property {string} optionId
 * @property {string} reason
 * @property {boolean} channelBlock
*/

class BlockOverlay {

    /** @param {HTMLElement} element @param {BlockInfo} blockInfo @param {YoutubeContent} content */
    constructor(element, blockInfo, content, type = 'grid') {
        this.id = _.random(1_000_000, 9_999_999);
        this.element = element;

        this.element.setAttribute(EL_ATTRIBUTES.overlayId, this.id);

        /** @type {HTMLElement} */
        this.reasonElement = null;
        /** @type {HTMLElement} */
        this.overlayElement = null;
        /** @type {HTMLElement} */
        this.revealButton = null;
        /** @type {HTMLElement} */
        this.unblockButton = null;
        /** @type {HTMLElement} */
        this.optionsButton = null;

        this.type = type;

        /** @type {BlockInfo?} */
        this.blockInfo = null;

        /** @type {YoutubeContent} */
        this.content = content;

        this.revealed = false;
        this.hidden = false;

        this.create();
        if (blockInfo) this.setBlockInfo(blockInfo);

        overlays[this.id] = this;
    }

    static GetOverlay(element) {
        const overlayId = element.getAttribute(EL_ATTRIBUTES.overlayId);
        if (!overlayId) return null;
        return overlays[overlayId] ?? null;
    }

    create() {
        if (!this.element) return utils.devLogWarn('Cannot create a block overlay without an element.');
        if (this.overlayElement) return;

        const revealButton = document.createElement('button');
        revealButton.classList.add(EL_CLASSES.revealButton, EL_CLASSES.hide);
        revealButton.innerHTML = /*html*/ `
            <div>
                <i class="fa fa-eye"></i>
            </div>
        `

        revealButton.setAttribute('type', this.type);

        revealButton.addEventListener('click', e => {
            this.toggleContentReveal();
        });

        const overlay = document.createElement('div');

        overlay.className = `ytb-overlay`;
        overlay.setAttribute('type', this.type);

        const iconUrl = chrome.runtime.getURL('images/icon-128.png');
        const blockedStr = utils.i18n('BLOCKED');
        const unblockStr = utils.i18n('Unblock');
        const optionsStr = utils.i18n('Options');

        if (this.type === 'grid') {
            overlay.innerHTML = /*html*/`
                <img src="${iconUrl}">
                <h2>${blockedStr}</h2>
                <div id="reason"></div>
                <div id="buttons">
                    <a id="unblock" tabindex="0">${unblockStr}</a>
                    <a id="options" tabindex="0">${optionsStr}</a>
                </div>
            `
        } else {
            overlay.innerHTML = /*html*/`
                <img src="${iconUrl}">
                <div class="details">
                    <h2>${blockedStr}</h2>
                    <div id="reason"></div>
                    <div id="buttons">
                        <a id="unblock" tabindex="0">${unblockStr}</a>
                        <a id="options" tabindex="0">${optionsStr}</a>
                    </div>
                </div>
            `
        }

        this.optionsButton = overlay.querySelector('#options');
        utils.onClick(this.optionsButton, e => {
            this.onOptionsClicked(e);
        });

        this.unblockButton = overlay.querySelector('#unblock');
        utils.onClick(this.unblockButton, e => {
            this.onUnblockClicked(e);
        });

        if (this.hasVideoPreview()) {
            // Videos previews usually show up in front of the message.
            // Let's disable the preview whenever the user in hovering the video.



            // TODO: prevent audio still playing.            
            this.element.addEventListener('mouseenter', ev => {
                if (this.hidden) return; // if no overlay, don't need to disable preview.

                if (playerFinder.previewPlayer) playerFinder.previewPlayer.disable();

                // const preview = document.querySelector('#video-preview');
                // if (preview) preview.classList.add(EL_CLASSES.hide);
            });

            this.element.addEventListener('mouseleave', ev => {

                if (playerFinder.previewPlayer) playerFinder.previewPlayer.enable();

                // const preview = document.querySelector('#video-preview');
                // if (preview) preview.classList.remove(EL_CLASSES.hide);
            });
        }

        this.reasonElement = overlay.querySelector('#reason');
        this.overlayElement = overlay;

        this.revealButton = revealButton;

        this.element.classList.add(EL_CLASSES.overlayContainer);
        
        this.element.setAttribute(EL_ATTRIBUTES.overlayType, this.type);
        
        this.updateInfo();

        this.element.insertAdjacentElement('afterbegin', revealButton);
        this.element.insertAdjacentElement('afterbegin', overlay);
    }

    show() {
        if (this.overlayElement) this.overlayElement.classList.remove(EL_CLASSES.hide);
        if (this.revealButton) {
            const isShortsVideo = this.element.matches('ytd-reel-video-renderer');
            const shouldHide = ((!LOCAL_ITEMS.showOverlays || !LOCAL_ITEMS.showOverlaysForVideos) && isShortsVideo) || LOCAL_ITEMS.removeRevealButton;

            if (shouldHide) {
                this.revealButton.classList.add(EL_CLASSES.hide);

                if (this.revealed) this.hideContent();
            } else {
                this.revealButton.classList.remove(EL_CLASSES.hide);
            }
        }
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

        this.hidden = false;
    }

    hide() {
        if (this.overlayElement) this.overlayElement.classList.add(EL_CLASSES.hide);
        // the reveal button is separated from overlayElement, so it need to be hidden too.
        if (this.revealButton) this.revealButton.classList.add(EL_CLASSES.hide);
        this.hidden = true;
    }

    revealContent() {
        if (this.overlayElement) this.overlayElement.classList.add('ytb-hide-content');
        if (this.revealButton) {
            this.revealButton.setAttribute('revealed', '');
            this.revealButton.querySelector('.fa').classList.replace('fa-eye', 'fa-eye-slash');
        }
        this.element.setAttribute(EL_ATTRIBUTES.overlayContentHidden, 'false');
        this.revealed = true;
    }

    hideContent() {
        if (this.overlayElement) this.overlayElement.classList.remove('ytb-hide-content');
        if (this.revealButton) {
            this.revealButton.removeAttribute('revealed');
            this.revealButton.querySelector('.fa').classList.replace('fa-eye-slash', 'fa-eye');
        }
        this.revealed = false;

        this.element.setAttribute(EL_ATTRIBUTES.overlayContentHidden, 'true');
        if (this.content.getType() === CONTENT_TYPES.comment) YoutubeComment.HideReplies(this.element);
    }

    toggleContentReveal() {
        this.revealed ? this.hideContent() : this.revealContent();
    }

    remove() { }

    /** @param {BlockInfo} blockInfo */
    setBlockInfo(blockInfo) {
        if (
            (!this.blockInfo && blockInfo) ||
            (this.blockInfo && blockInfo && (this.blockInfo.contentId !== blockInfo.contentId || this.blockInfo.reason !== blockInfo.reason))
        ) {
            this.hideContent();
        }

        this.blockInfo = blockInfo;
        this.updateInfo();
    }

    updateInfo() {
        if (!this.overlayElement) return utils.devLogWarn('no overlay element to update the info.');

        const hasReason = Boolean(this.blockInfo && this.blockInfo.reason);

        if (hasReason) {
            this.reasonElement.classList.remove(EL_CLASSES.hide);
            this.reasonElement.textContent = this.blockInfo.reason;
        } else {
            this.reasonElement.classList.add(EL_CLASSES.hide);
            this.reasonElement.textContent = '';
        }

        if (this.blockInfo && (this.blockInfo.contentId || this.blockInfo.channelBlock)) {
            this.unblockButton.classList.remove(EL_CLASSES.hide);
            this.unblockButton.textContent = utils.i18n(this.blockInfo.channelBlock ? 'UnblockChannel' : 'Unblock');
        } else {
            this.unblockButton.classList.add(EL_CLASSES.hide);
        }
    }

    onOptionsClicked(e) {
        MM.emitToRuntime(MMK.openOptionsPage, {
            focusElement: this.blockInfo?.optionId || ''
        });
    }

    /** @param {YoutubeContent} content */
    setContent(content) {
        this.content = content;
    }

    onUnblockClicked(e) {
        passwordModal.requestPassword({
            keepUnlockedChecked: LOCAL_ITEMS.passwordConfig.keepUnlockedEnabled,
            unlockDate: LOCAL_ITEMS.passwordConfig.unlockDate,
            unlockTime: PasswordModal.GetUnlockTimeFromStorage(LOCAL_ITEMS)
        }).then((result) => {

            if (result.wasOpen && result.keptUnlocked) {
                LOCAL_ITEMS.passwordConfig.keepUnlockedEnabled = true;

                if (LOCAL_ITEMS.passwordConfig.unlockCustomTimeEnabled) {
                    const h = LOCAL_ITEMS.passwordConfig.unlockCustomHours;
                    const m = LOCAL_ITEMS.passwordConfig.unlockCustomMinutes;

                    LOCAL_ITEMS.passwordConfig.unlockDate = Date.now() + (h * 3600000) + (m * 60000);
                } else {
                    LOCAL_ITEMS.passwordConfig.unlockDate = Date.now() + (LOCAL_ITEMS.passwordConfig.unlockTime * 1000);
                }

                SM.set({ passwordConfig: LOCAL_ITEMS.passwordConfig });

            } else if (result.wasOpen && !result.keptUnlocked && LOCAL_ITEMS.passwordConfig.keepUnlockedEnabled) {
                LOCAL_ITEMS.passwordConfig.keepUnlockedEnabled = false;

                SM.set({ passwordConfig: LOCAL_ITEMS.passwordConfig });
            }

            if (this.blockInfo.channelBlock) {
                if (!this.content.info.channel) return alert(utils.i18n('CouldNotBlockChannel'));

                MM.emitToRuntime(MMK.unblockChannel, {
                    channel: this.content.info.channel,
                    contentType: this.content.getType()
                });
            } else {
                if (!this.content.info.id) return alert(utils.i18n('CouldNotBlockContent'));

                MM.emitToRuntime(MMK.unblockContent, {
                    contentId: this.content.info.id,
                    contentType: this.content.getType()
                });
            }
        }).catch(err => {
            if (err !== 'cancelled') utils.devLogError('Error on password request:', err);
        });
    }

    hasVideoPreview() {
        return this.element.matches('ytd-rich-grid-media, [is-search]');
    }
}