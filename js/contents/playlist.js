
/** 
 * @typedef {Object} BaseYoutubePlaylistInfo
 * @property {string} [title]
 * @property {boolean} [isMix]
 * @property {true} isPlaylist
 */

/** @typedef {AnyYoutubeContentInfo & BaseYoutubePlaylistInfo} YoutubePlaylistInfo */

class YoutubePlaylist extends YoutubeContent {

    getType() {
        return CONTENT_TYPES.playlist;
    }

    /** @returns {YoutubePlaylistInfo} */
    getInfoFromElement() {
        
        const titleElement = this.element.querySelector('#video-title');
        const linkElement = this.element.querySelector('#content #view-more a');

        const channelLinkElement = this.element.querySelector('.ytd-channel-name a');
        const channelHandle = YoutubeContent.GetChannelHandle(channelLinkElement?.href);

        const verifiedBadge = this.element.querySelector('ytd-badge-supported-renderer.ytd-channel-name');
        const channelVerified = Boolean(verifiedBadge && verifiedBadge.children.length >= 2);

        const isMix = (
            this.element.tagName.toLowerCase() === 'ytd-radio-renderer' ||
            this.element.tagName.toLowerCase() === 'ytd-compact-radio-renderer'
        );

        const url = ( !isMix ? linkElement?.href : '' ) || '';

        return {
            id: YoutubePlaylist.GetPlaylistId(url),
            title: titleElement?.textContent.trim().replace(/  /g, ' ') || '',
            url,
            isMix,
            isPlaylist: true,
            contentType: CONTENT_TYPES.playlist,
            channel: {
                name: channelLinkElement?.textContent?.trim() || '',
                url: decodeURI(channelLinkElement?.href || ''),
                handle: channelHandle || '',
                id: channelHandle?.replace('@', '') || '',
                urlId: YoutubeContent.GetChannelUrlId(channelLinkElement?.href),
                verified: channelVerified
            }
        }
    }

    shouldAddOverlay() {
        return LOCAL_ITEMS.showOverlays && LOCAL_ITEMS.showOverlaysForVideos;
    }

    /** 
     * @param {YoutubePlaylistInfo} playlist
     * @returns {BlockInfo} 
     * */
    shouldBeBlocked(playlist) {
        if (LOCAL_ITEMS.blockMIX && playlist.isMix) return {
            optionId: 'block_mix',
            reason: `${utils.i18n('BlockReasonMixPlaylist')}`
        }
    }

    static GetPlaylistId(url) {
        if (!url) return '';
        url = decodeURI(url);
    
        // https://www.youtube.com/watch?v=...&list={PLAYLIST_ID}

        const match = (
            url.match(/(?:&|\?)list=([A-Za-z0-9_-]+)(?:&|$)/)
        );

        if (!match) return '';
        return match[1];
    }
}