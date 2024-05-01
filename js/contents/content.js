
/**
 * @typedef {Object} YoutubeChannelInfo
 * @property {string} [name]
 * @property {string} [url]
 * @property {string} [handle]
 * @property {string} [apiId]
 * @property {string} [id]
 * @property {string} [urlId]
 * @property {string} [verified]
 */

/**
 * @typedef {Object} AnyYoutubeContentInfo
 * @property {string} [id]
 * @property {string} [url]
 * @property {string} contentType
 * @property {boolean} [isVideo]
 * @property {boolean} [isComment]
 * @property {boolean} [isPost]
 * @property {boolean} [isPlaylist]
 */

class YoutubeContent {

    /** @param {HTMLElement} element @param {ContentFinder} contentFinder */
    constructor(element, contentFinder, autoWatchChanges = true, startCheckingInfo = true) {
        this.element = element;
        this.contentFinder = contentFinder;

        this.elementId = _.random(1_000_000, 9_999_999).toString();
        /** @type {AnyYoutubeContentInfo} */
        this.info = {};

        this.blocked = false;
        /** @type {BlockInfo | null} */
        this.blockInfo = null;

        this.watchingChanges = false;
        this.isFirstInfo = true;

        /** @type {BlockOverlay} */
        this.blockOverlay = null;
        this.element.setAttribute(EL_ATTRIBUTES.elementId, this.elementId);

        /** @type {HTMLElement} */
        this.dropdownButton = null;

        if (startCheckingInfo) this.checkInfo();
        if (autoWatchChanges) this.watchChanges();
    }

    getType() {
        return 'content';
    }

    checkInfo() {
        const newInfo = this.tryGetInfoFromElement(this.element);
        if (_.isEqual(this.info, newInfo)) return; // nothing changed.
        
        this.info = newInfo;

        this.emitUpdate();

        if (this.isFirstInfo) {

            if (utils.IS_DEV) {
                // print the content when clicking holding shift (only on dev mode)
                this.element.addEventListener('contextmenu', e => {
                    if (!e.shiftKey) return;

                    e.preventDefault();
                    e.stopPropagation();

                    utils.devLog(`${this.getType()}:`, this.info, this, this.element);
                });
            }

            this.isFirstInfo = false;
        }
    }

    emitUpdate() {
        this.contentFinder.emitContentInfoUpdate(this.info, this);
    }

    updateInfo() {
        const newInfo = this.tryGetInfoFromElement(this.element);
        this.info = newInfo;
    }

    watchChanges() {
        if (this.watchingChanges) return utils.devLog('already watching element', this, this.element);

        const mutation = new MutationObserver((mutations) => {
            this.checkInfo();
        });

        mutation.observe(this.element, {
            attributes: true,
            childList: true,
            subtree: true
        });

        this.watchingChanges = true;
    }

    /** @returns {AnyYoutubeContentInfo} */
    getInfoFromElement() {
        return {};
    }

    tryGetInfoFromElement() {
        let info = null;
        let error = null;

        try {
            this.handleDropdownButton();
            info = this.getInfoFromElement();
        } catch(err) {
            error = err;
        }

        if (!info) utils.devLog(`could not get info from type "${this.getType()}" in element "${this.element.tagName}", page: ${location.href.substring(location.href.indexOf('.com/') + 4)}`, this.element, error);
        return info ?? {};
    }

    /** 
     * @param {AnyYoutubeContentInfo} info 
     * @param {STORAGE_ITEMS['local']} items
     * @returns {BlockInfo}
     *  */
    shouldBeBlocked(items) {
        return;
    }

    getBlockOverlayType() {
        return 'grid';
    }

    getElementToHide() {
        return this.element;
    }

    shouldAddOverlay() {
        return false;
    }

    /** 
     * @param {BlockInfo} blockInfo 
     * */
    block(blockInfo) {
        this.blocked = true;
        this.blockInfo = blockInfo;
        this.element.setAttribute(EL_ATTRIBUTES.blocked, '');

        if (this.shouldAddOverlay()) {
            this.getElementToHide().classList.remove(EL_CLASSES.hide);
            if (!this.blockOverlay) this.blockOverlay = new BlockOverlay(this.getElementToSetOverlay(), blockInfo, this, this.getBlockOverlayType());

            this.blockOverlay.setBlockInfo(blockInfo);
            this.blockOverlay.setContent(this);
            this.blockOverlay.show();
        } else {
            this.getElementToHide().classList.add(EL_CLASSES.hide);
        }
    }

    getElementToSetOverlay() {
        return this.element;
    }

    unblock() {
        this.blocked = false;
        this.blockInfo = null;
        this.element.removeAttribute(EL_ATTRIBUTES.blocked);

        this.getElementToHide().classList.remove(EL_CLASSES.hide);

        if (!this.blockOverlay) return;
        this.blockOverlay.setBlockInfo({});
        this.blockOverlay.hide();
    }

    getDropdownButton() {
        return this.element.querySelector('.dropdown-trigger#button');
    }

    handleDropdownButton() {
        if (this.dropdownButton) return;

        this.dropdownButton = this.getDropdownButton();
        if (!this.dropdownButton) return;

        this.dropdownButton.setAttribute(EL_ATTRIBUTES.dropdownButton, '');
        this.dropdownButton.addEventListener('click', e => {
            dropdown.setSelectedContent(this);
        });
    }

    onSkipCountdownEnd() {}

    setChannelBlockButton() {}

    static CreateChannelBlockButton() {
        const channelBlockButton = document.createElement('button');
        channelBlockButton.className = EL_CLASSES.channelBlockButton;

        channelBlockButton.innerHTML = `
            <i class="fa fa-close"></i>
        `;

        channelBlockButton.title = utils.i18nFormat('ChannelBlockButtonTooltip', utils.i18n('ExtName'));

        return channelBlockButton;
    }

    /** @param {HTMLElement} channelBlockButton @param {MouseEvent} e */
    onChannelBlockButtonClick(channelBlockButton, e) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.info || !this.info.channel) return alert(utils.i18n('CouldNotBlockChannel'));

        if (this.blocked && this.blockInfo?.channelBlock) {
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

                utils.devLog('info channel:', this.info.channel);

                MM.emitToRuntime(MMK.unblockChannel, {
                    contentType: this.getType(),
                    channel: this.info.channel
                });
            }).catch(err => {
                if (err !== 'cancelled') console.error(err);
            });
            
        } else {
            MM.emitToRuntime(MMK.blockChannel, {
                contentType: this.getType(),
                channel: this.info.channel
            });
        }
       
    }

    static GetChannelHandle(url) {
        if (!url) return '';
        url = decodeURI(url);
    
        // https://www.youtube.com/{@Handle}
    
        const match = url.match(/https?:\/\/(?:(?:www|m)\.)?youtube\.com\/(@[^?/]+)\/?/)
        if (!match) return '';
        return match[1];
    }
    
    static GetChannelUrlId(url) {
        if (!url) return '';
        url = decodeURI(url);
    
        // https://www.youtube.com/c/{URL_ID}
        // https://www.youtube.com/channel/{URL_ID}
        // https://www.youtube.com/user/{URL_ID}
        // https://www.youtube.com/@{USER_HANDLE}
    
        const match = (
            url.match(/^https?:\/\/(?:(?:www|m)\.)?youtube\.com\/(?:channel|c)?\/(.+)(\/|\?.*|$)/) ||
            url.match(/^https?:\/\/(?:(?:www|m)\.)?youtube\.com\/user\/(.+)(\/|\?.*|$)/) || 
            url.match(/^https?:\/\/(?:(?:www|m)\.)?youtube\.com\/(@[^\s/?]+)(\/|\?.*|$)/)
        );
    
        if (!match) return '';
        return match[1];
    }

    /** @param {HTMLElement} element */
    static GetContentClassFromElement(element) {
        return this;
    }

}