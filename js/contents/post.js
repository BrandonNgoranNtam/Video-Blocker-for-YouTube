
/** 
 * @typedef {Object} BaseYoutubePostInfo
 * @property {string} [content]
 * @property {boolean} [hasPoll]
 * @property {boolean} [hasQuiz]
 * @property {YoutubeChannelInfo} [channel]
 * @property {true} isPost
 */

/** @typedef {AnyYoutubeContentInfo & BaseYoutubePostInfo} YoutubePostInfo */

class YoutubePost extends YoutubeContent {

    getType() {
        return CONTENT_TYPES.post;
    }

    /** @returns {YoutubePostInfo} */
    getInfoFromElement() {
        // this is for posts that show up on the home page and on the channel page in the community tab.
        const channelLinkElement = this.element.querySelector('#author a') || this.element.querySelector('a#author-text');
        const channelNameElement = this.element.querySelector('#author a span') || this.element.querySelector('a#author-text span');

        const contentElement = this.element.querySelector('#home-content-text') || this.element.querySelector('#content-text');

        const publishedTimeLinkElement = this.element.querySelector('#published-time-text a');
        const channelHandle = YoutubeContent.GetChannelHandle(channelLinkElement?.href);

        const pollAttachmentElement = this.element.querySelector('#poll-attachment');
        const hasPoll = pollAttachmentElement && !pollAttachmentElement.hasAttribute('hidden') && pollAttachmentElement.children.length !== 0;

        const quizAttachmentElement = this.element.querySelector('#quiz-attachment');
        const hasQuiz = quizAttachmentElement && !quizAttachmentElement.hasAttribute('hidden') && quizAttachmentElement.children.length !== 0;

        this.setChannelBlockButton();

        return {
            id: YoutubePost.GetPostId(publishedTimeLinkElement?.href),
            url: publishedTimeLinkElement?.href,
            content: contentElement?.textContent?.trim(),
            hasPoll,
            hasQuiz,
            isPost: true,
            contentType: CONTENT_TYPES.post,
            channel: {
                name: channelNameElement?.textContent?.replace(/\u034F/g, '').trim() || '',
                url: decodeURI(channelLinkElement?.href || ''),
                handle: channelHandle || '',
                id: channelHandle?.replace('@', '') || '',
                urlId: YoutubeContent.GetChannelUrlId(channelLinkElement?.href) || '',
                verified: false // TODO
            }
        }
    }

    setChannelBlockButton() {
        if (!LOCAL_ITEMS.addBlockChannelButton) return;
        
        const element = this.element.querySelector('#header');
        const elementToInsertBefore = this.element.querySelector('#author-divider, #published-time-text');

        if (!element || !elementToInsertBefore) return;
        if (element.hasAttribute(EL_ATTRIBUTES.hasChannelBlockButton)) return;

        const channelBlockButton = YoutubeContent.CreateChannelBlockButton();

        elementToInsertBefore.insertAdjacentElement('beforebegin', channelBlockButton);
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

    shouldAddOverlay() {
        return LOCAL_ITEMS.showOverlays && LOCAL_ITEMS.showOverlaysForPosts;
    }

    /** 
     * @param {YoutubePostInfo} post
     * @returns {BlockInfo} 
     * */
    shouldBeBlocked(post) {
        let keywordMatch = '';

        if (post.channel) {
            // Post Channels
            const channelIndentifiers = [
                post.channel.name, post.channel.handle, post.channel.id, post.channel.url, post.channel.urlId
            ].filter(c => Boolean(c));

            // Whitelist check
            keywordMatch = matcher.match(channelIndentifiers, post, keywords.whitelistChannels, {
                caseSensitive: LOCAL_ITEMS.whitelistChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.whitelistChannelsExactMatch
            });
            if (keywordMatch) return; // Channel on whitelist, pass!

            keywordMatch = matcher.match(channelIndentifiers, post, keywords.postChannels, {
                caseSensitive: LOCAL_ITEMS.blockedPostChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.blockedPostChannelsExactMatch,
            });
            if (keywordMatch) return {
                optionId: 'block_post_channels',
                reason: `${utils.i18n('BlockReasonPostChannel')} ` + keywordMatch,
                channelBlock: true
            }

            // General Channels
            keywordMatch = matcher.match(channelIndentifiers, post, keywords.channels, {
                caseSensitive: LOCAL_ITEMS.blockedChannelsCaseSensitive,
                exactMatch: LOCAL_ITEMS.blockedChannelsExactMatch
            });
            if (keywordMatch) return {
                optionId: 'block_channels',
                reason: `${utils.i18n('BlockReasonChannel')} ` + post.channel.name + (keywordMatch !== post.channel.name ? ` (${keywordMatch})` : ''),
                channelBlock: true
            }
        }

        // Posts
        if (post.id) keywordMatch = matcher.match(post.id, post, keywords.posts, {
            customMatch: (texts, kw) => {
                const id = YoutubePost.GetPostId(kw.str) || kw.str;
                if (post.id == id) return kw.str;
            }
        });
        if (keywordMatch) return {
            optionId: 'block_posts',
            reason: `${utils.i18n('BlockReasonSpecificPost')} ` + post.id + (post.id !== keywordMatch ? ` (${keywordMatch})` : ''),
            contentId: post.id
        }

        // Post Content
        if (post.content) keywordMatch = matcher.match(post.content, post, keywords.postContents, {
            caseSensitive: LOCAL_ITEMS.blockedPostContentsCaseSensitive,
            wordBoundary: LOCAL_ITEMS.blockedPostContentsWordBound
        });
        if (keywordMatch) return {
            optionId: 'block_post_contents',
            reason: `${utils.i18n('BlockReasonPostContent')} ` + keywordMatch
        }

        if (post.content) keywordMatch = matcher.match(post.content, post, keywords.contents, {
            caseSensitive: LOCAL_ITEMS.blockedContentKeywordCaseSensitive,
            wordBoundary: LOCAL_ITEMS.blockedContentKeywordWordBound
        });
        if (keywordMatch) return {
            optionId: 'block_content',
            reason: `${utils.i18n('BlockReasonPostContent')} ` + keywordMatch
        }
    }

    static GetPostId(url) {
        if (!url) return '';
        url = decodeURI(url);

        // https://www.youtube.com/post/{ID_HERE}

        const match = url.match(/https?:\/\/(?:(?:www|m)\.)?youtube\.com\/post\/([A-Za-z0-9_-]+)(\?|$)/);
        if (!match) return '';
        return match[1];
    }
}