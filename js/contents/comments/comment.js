
/** 
 * @typedef {Object} BaseYoutubeCommentInfo
 * @property {string} [content]
 * @property {boolean} [hearted]
 * @property {boolean} [pinned]
 * @property {boolean} [isReply]
 * @property {boolean} [isAuthor]
 * @property {boolean} [hasReplies]
 * @property {YoutubeChannelInfo} [channel]
 * @property {true} isComment
 */

/** @typedef {AnyYoutubeContentInfo & BaseYoutubeCommentInfo} YoutubeCommentInfo */

class YoutubeComment extends YoutubeContent {

    getType() {
        return CONTENT_TYPES.comment;
    }

    /** @returns {YoutubeCommentInfo} */
    getInfoFromElement() {
        if (!this.element.parentElement) return;

        const isReply = YoutubeComment.IsReply(this.element);
        const renderer = isReply ? this.element : this.element.querySelector('ytd-comment-renderer');

        const channelLinkElement = renderer.querySelector('a#author-text');
        const channelNameElement = channelLinkElement.querySelector('span') || channelLinkElement.querySelector('yt-formatted-string');
    
        this.setChannelBlockButton();

        const contentElement = renderer.querySelector('#content');

        const channelName = channelNameElement?.textContent?.trim();
        const channelHandle = YoutubeContent.GetChannelHandle(channelLinkElement?.href) || (channelName.startsWith('@') ? channelName : '');

        const publishedTimeLinkElement = renderer.querySelector('.published-time-text a');

        const creatorHeart = renderer.querySelector('#creator-heart');
        const hearted = Boolean(creatorHeart && creatorHeart.children.length !== 0)

        const replies = renderer.parentElement.querySelector('#replies');
        const hasReplies = Boolean(!isReply && replies && replies.children.length !== 0);

        const pinnedBadge = renderer.querySelector('#pinned-comment-badge');
        const pinned = Boolean(pinnedBadge && pinnedBadge.children.length !== 0);

        const authorBadge = renderer.querySelector('#author-comment-badge');
        const isAuthor = Boolean(authorBadge && authorBadge.children.length !== 0)

        const channelVerified = Boolean(renderer.querySelector('.ytd-author-comment-badge-renderer'));

        return {
            id: YoutubeComment.GetCommentId(publishedTimeLinkElement?.href) || '',
            url: publishedTimeLinkElement?.href || '',
            content: contentElement?.textContent?.trim() || '',
            hearted,
            pinned,
            isReply,
            isAuthor,
            hasReplies,
            isComment: true,
            channel: {
                name: channelName?.replace(/\u034F/g, '') || '',
                url: decodeURI(channelLinkElement?.href || ''),
                handle: channelHandle || '',
                id: channelHandle?.replace('@', '') || '',
                urlId: YoutubeContent.GetChannelUrlId(channelLinkElement?.href),
                verified: channelVerified
            }
        }
    }

    setChannelBlockButton() {
        if (!LOCAL_ITEMS.addBlockChannelButton) return;

        const element = this.element.querySelector('#header-author');
        const publishedTimeElement = element?.querySelector('.published-time-text');

        if (!element || !publishedTimeElement) return;
        if (element.hasAttribute(EL_ATTRIBUTES.hasChannelBlockButton)) return;

        const channelBlockButton = YoutubeContent.CreateChannelBlockButton();

        publishedTimeElement.insertAdjacentElement('beforebegin', channelBlockButton);
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

    getBlockOverlayType() {
        return 'horizontal';
    }

    shouldAddOverlay() {
        return LOCAL_ITEMS.showOverlays && LOCAL_ITEMS.showOverlaysForComments;
    }

    /** 
     * @param {YoutubeCommentInfo} comment
     * @returns {BlockInfo} 
     * */
    shouldBeBlocked(comment) {
        let keywordMatch = '';

        if (comment.channel) {
            // Comment Users
            const channelIndentifiers = [
                comment.channel.name, comment.channel.handle, comment.channel.id, comment.channel.url, comment.channel.urlId
            ].filter(c => Boolean(c));

            // Whitelist check
            keywordMatch = matcher.match(channelIndentifiers, comment, keywords.whitelistChannels, {
                caseSensitive: LOCAL_ITEMS.whitelistChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.whitelistChannelsExactMatch
            });
            if (keywordMatch) return; // Channel on whitelist, pass!

            keywordMatch = matcher.match(channelIndentifiers, comment, keywords.commentUsers, {
                caseSensitive: LOCAL_ITEMS.blockedCommentUsersCaseSensitive,
                exactMatch: LOCAL_ITEMS.blockedCommentUsersExactMatch,
            });
            if (keywordMatch) return {
                optionId: 'block_comments_users',
                reason: `${utils.i18n('BlockReasonCommentUser')} ` + keywordMatch,
                channelBlock: true
            }

            // General Channels
            keywordMatch = matcher.match(channelIndentifiers, comment, keywords.channels, {
                caseSensitive: LOCAL_ITEMS.blockedChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.blockedChannelsExactMatch
            });
            if (keywordMatch) return {
                optionId: 'block_channels',
                reason: `${utils.i18n('BlockReasonChannel')} ` + comment.channel.name + (keywordMatch !== comment.channel.name ? ` (${keywordMatch})` : ''),
                channelBlock: true
            }
        }

        // Comments
        if (comment.id) keywordMatch = matcher.match(comment.id, comment, keywords.comments, {
            customMatch: (texts, kw) => {
                const id = YoutubeComment.GetCommentId(kw.str) || kw.str;
                if (comment.id == id) return kw.str;
            }
        });
        if (keywordMatch) return {
            optionId: 'block_comments',
            reason: `${utils.i18n('BlockReasonSpecificComment')} ` + comment.id + (comment.id !== keywordMatch ? ` (${keywordMatch})` : ''),
            contentId: comment.id
        }

        // Comment Contents
        if (comment.content) keywordMatch = matcher.match(comment.content, comment, keywords.commentContents, {
            caseSensitive: LOCAL_ITEMS.blockedCommentContentsCaseSensitive,
            wordBoundary: LOCAL_ITEMS.blockedCommentContentsWordBound
        });
        if (keywordMatch) return {
            optionId: 'block_comment_contents',
            reason: `${utils.i18n('BlockReasonCommentContent')} ` + keywordMatch
        }

        if (comment.content) keywordMatch = matcher.match(comment.content, comment, keywords.contents, {
            caseSensitive: LOCAL_ITEMS.blockedContentKeywordCaseSensitive,
            wordBoundary: LOCAL_ITEMS.blockedContentKeywordWordBound
        });
        if (keywordMatch) return {
            optionId: 'block_content',
            reason: `${utils.i18n('BlockReasonCommentContent')} ` + keywordMatch
        }
    }

    blockInfo(...params) {
        YoutubeComment.HideReplies(this.element);
        super.block(...params);
    }

    static HideReplies(element) {
        const isReply = YoutubeComment.IsReply(element);

        if (!isReply) {
            // hide replies during block.
            const lessRepliesButton = element.querySelector('#less-replies');
            lessRepliesButton?.click();
        }
    }

    static IsReply(element) {
        return element.hasAttribute('is-reply');
    }

    static GetCommentId(url) {
        if (!url) return '';
        url = decodeURI(url);

        // https://www.youtube.com/watch?v=...&lc={ID_HERE}
        // https://www.youtube.com/channel/.../community?lc={ID_HERE}

        const match = (
            url.match(/https?:\/\/(?:(?:www|m)\.)?youtube\.com\/watch\?.*&lc=([A-Za-z0-9-_.]+)(&|$)/) ||
            url.match(/https?:\/\/(?:(?:www|m)\.)?youtube\.com\/channel\/.+\/community\?lc=([A-Za-z0-9-_.]+)(&|$)/)
        );

        if (!match) return '';
        return match[1];
    }

    /** @param {HTMLElement} element */
    static GetContentClassFromElement(element) {
        if (element.matches('ytm-comment-renderer')) return YoutubeMobileComment;
        return this;
    }
}