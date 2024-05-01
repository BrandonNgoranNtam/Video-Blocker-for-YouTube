
class YoutubeMobileComment extends YoutubeComment {

    /** @return {YoutubeCommentInfo} */
    getInfoFromElement() {
        const content = this.element.querySelector('.comment-text span')?.textContent.replace(/\u034F/g, '') || '';

        const channelUrl = this.element.querySelector('a.comment-icon-container')?.href || '';
        const channelName = this.element.querySelector('.comment-title span')?.textContent.replace(/\u034F/g, '').trim() || '';
        const channelHandle = YoutubeVideo.GetChannelHandle(channelUrl);

        const isThread = this.element.parentElement.matches('ytm-comment-thread-renderer');

        const isAuthor = this.element.querySelector('.comment-title')?.getAttribute('is-owner') === 'true';
        const isReply = !isThread;

        const hasReplies = isThread ? Boolean(this.element.parentElement.querySelector('ytm-comment-replies-renderer')) : false;

        return {
            id: '',
            url: '',
            content: content,
            hearted: false, // TODO
            pinned: false, // TODO
            isReply: isReply,
            isAuthor: isAuthor,
            hasReplies: hasReplies,
            isComment: true,
            channel: {
                name: channelName || '',
                url: decodeURI(channelUrl) || '',
                handle: decodeURI(channelHandle) || '',
                apiId: '',
                id: channelHandle.replace('@', '') || '',
                urlId: YoutubeContent.GetChannelUrlId(channelUrl) || '',
                verified: false // TODO
            }
        }
    }

    getElementToHide() {
        if (this.element.parentElement.matches('ytm-comment-thread-renderer')) return this.element.parentElement;
        return this.element;
    }

    shouldAddOverlay() {
        return false;
    }

}