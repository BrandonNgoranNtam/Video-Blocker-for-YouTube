
class YoutubeChannelRenderer {

    /** @param {HTMLElement} element */
    constructor(element) {
        this.element = element;
        /** @type {YoutubeChannelInfo} */
        this.info = {};

        this.blocked = false;

        /** @type {BlockInfo | null} */
        this.blockInfo = null;

        this.element.setAttribute(EL_ATTRIBUTES.channelRenderer, '');

        const mutation = new MutationObserver((mutations) => {
            this.onElementUpdate();
        });

        mutation.observe(this.element, {
            attributes: true,
            childList: true,
            subtree: true
        });

        this.updateInfo();

        if (utils.IS_DEV) {
            // if dev mode, print the channel render by right clicking while holding shift.
            this.element.addEventListener('contextmenu', e => {
                if (e.shiftKey) {
                    e.preventDefault();
                    utils.devLog(this.info, this);
                }
            });
        }
    }

    onElementUpdate() {
        this.updateInfo();
    }

    updateInfo() {
        const channelLinkElement = this.element.querySelector('a#main-link');
        const channelNameElement = this.element.querySelector('ytd-channel-name yt-formatted-string#text');
        const verifiedBadge = this.element.querySelector('ytd-badge-supported-renderer');
        const isVerified = verifiedBadge && !verifiedBadge.hasAttribute('hidden');

        const channelHandle = YoutubeVideo.GetChannelHandle(channelLinkElement?.href);

        const oldInfo = structuredClone(this.info);

        this.info.name = channelNameElement?.textContent.replace(/\u034F/g, '');
        this.info.url = decodeURI(channelLinkElement?.href || '') || '';
        this.info.apiId = '';
        this.info.id = channelHandle?.replace('@', '') || '';
        this.info.urlId = YoutubeContent.GetChannelUrlId(channelLinkElement?.href) || '';
        this.info.verified = isVerified;

        this.setChannelBlockButton();

        if (!_.isEqual(oldInfo, this.info)) 
            contentFinder.emitChannelRendererInfoUpdate(this.info, this);
    }

    /** @param {BlockInfo} blockInfo */
    block(blockInfo) {
        this.element.classList.add(EL_CLASSES.hide);
        this.blocked = true;
        this.blockInfo = blockInfo;
    }

    unblock() {
        this.element.classList.remove(EL_CLASSES.hide);
        this.blocked = false;
        this.blockInfo = null;
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

    /** @param {HTMLElement} channelBlockButton @param {MouseEvent} e */
    onChannelBlockButtonClick(channelBlockButton, e) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.info) return alert(utils.i18n('CouldNotBlockChannel'));

        if (this.blocked && this.blockInfo?.channelBlock) {
            passwordModal.requestPassword({
                keepUnlockedChecked: LOCAL_ITEMS.passwordConfig.keepUnlockedEnabled,
                unlockDate: LOCAL_ITEMS.passwordConfig.unlockDate,
                unlockTime: PasswordModal.GetUnlockTimeFromStorage(LOCAL_ITEMS)
            }).then(() => {
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

                MM.emitToRuntime(MMK.unblockChannel, {
                    channel: this.info
                });
            }).catch(err => {
                if (err !== 'cancelled') console.error(err);
            });
        } else {
            MM.emitToRuntime(MMK.blockChannel, {
                channel: this.info
            });
        }
    }

    /** 
     * @returns {BlockInfo}
     */
    shouldBeBlocked() {
        const channel = this.info;

        if (Object.keys(channel).length === 0) return;

        let keywordMatch = '';

        // Channels
        const channelIndentifiers = [
            channel.name, channel.url, channel.id, channel.handle, channel.urlId
        ].filter(c => Boolean(c));

        // Whitelist check
        keywordMatch = matcher.match(channelIndentifiers, channel, keywords.whitelistChannels, {
            caseSensitive: LOCAL_ITEMS.whitelistChannelsCaseSensitive,
            exactMatch: LOCAL_ITEMS.whitelistChannelsExactMatch
        });
        if (keywordMatch) return; // Channel on whitelist, pass!
        
        // Video channels
        keywordMatch = matcher.match(channelIndentifiers, channel, keywords.videoChannels, {
            caseSensitive: LOCAL_ITEMS.blockedVideoChannelsCaseSensitive,
            exactMatch: LOCAL_ITEMS.blockedVideoChannelsExactMatch
        });
        if (keywordMatch) return {
            optionId: 'block_video_channels',
            reason: utils.i18n('BlockReasonChannel') + ' ' + channel.name + (keywordMatch !== channel.name ? ` (${keywordMatch})` : ''),
            channelBlock: true
        }

        // Comment users
        keywordMatch = matcher.match(channelIndentifiers, channel, keywords.commentUsers, {
            caseSensitive: LOCAL_ITEMS.blockedCommentUsersCaseSensitive,
            exactMatch: LOCAL_ITEMS.blockedCommentUsersExactMatch,
        });
        if (keywordMatch) return {
            optionId: 'block_comments_users',
            reason: `${utils.i18n('BlockReasonChannel')} ` + keywordMatch,
            channelBlock: true
        }

        // Post authors
        keywordMatch = matcher.match(channelIndentifiers, channel, keywords.postChannels, {
            caseSensitive: LOCAL_ITEMS.blockedPostChannelsCaseSensitive,
            exactMatch: LOCAL_ITEMS.blockedPostChannelsExactMatch,
        });
        if (keywordMatch) return {
            optionId: 'block_post_channels',
            reason: `${utils.i18n('BlockReasonChannel')} ` + keywordMatch,
            channelBlock: true
        }

        // General Channels
        keywordMatch = matcher.match(channelIndentifiers, channel, keywords.channels, {
            caseSensitive: LOCAL_ITEMS.blockedChannelsCaseSensitive,
            exactMatch: LOCAL_ITEMS.blockedChannelsExactMatch
        });
        if (keywordMatch) return {
            optionId: 'block_channels',
            reason: utils.i18n('BlockReasonChannel') + ' ' + channel.name + (keywordMatch !== channel.name ? ` (${keywordMatch})` : ''),
            channelBlock: true
        }
    }
}