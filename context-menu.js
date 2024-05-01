// Create and handle context menu functionalities.

chrome.runtime.onInstalled.addListener(details => {

    CreateContextMenus();

    SM.get([SMK.DEV_reloadTabId, SMK.apiKey, SMK.enabledAPI]).then(items => {

        updateAPIContextMenus(Boolean(items.apiKey && items.enabledAPI));

        if (!items.DEV_reloadTabId) return;

        chrome.tabs.reload(items.DEV_reloadTabId).catch(err => {});

        SM.remove(SMK.DEV_reloadTabId);
    });

    SM.onChange({
        keyCallback: (keyName) => {
            if (![SMK.apiKey, SMK.enabledAPI].includes(keyName)) return;

            SM.get([SMK.apiKey, SMK.enabledAPI]).then(items => {
                updateAPIContextMenus(Boolean(items.apiKey && items.enabledAPI));
            });
        }
    })
});

function updateAPIContextMenus(enabled) {
    chrome.contextMenus.update(CONTEXT_MENU_IDS.viewTags, {
        enabled: enabled,
        title: enabled ? utils.i18n('ContextMenuViewTags') : `${utils.i18n('ContextMenuViewTags')} (${utils.i18n('RequireAPI')})`
    }, () => {
        chrome.runtime.lastError;
    });

    chrome.contextMenus.update(CONTEXT_MENU_IDS.blockUnblockChannelWithAPI, {
        enabled: enabled,
        title: enabled ? utils.i18n('BlockUnblockChannel') : `${utils.i18n('BlockUnblockChannel')} (${utils.i18n('RequireAPI')})`
    }, () => {
        chrome.runtime.lastError;
    });
}

function CreateContextMenus() {
    // Block/Unblock content
    chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.blockUnblockContent,
        title: utils.i18n('BlockUnblockContent'),
        contexts: ['link'],
        targetUrlPatterns: [
            '*://*.youtube.com/watch?v=*',
            '*://*.youtube.com/shorts/*',
            '*://youtu.be/*',
            '*://*.youtube.com/channel/*/community?lc=*',
            '*://*.youtube.com/post/*',
        ]
    }, () => { chrome.runtime.lastError; });

    // Block/Unblock channel (using API)
    chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.blockUnblockChannelWithAPI,
        title: `${utils.i18n('BlockUnblockChannel')} (${utils.i18n('RequireAPI')})`,
        contexts: ['link'],
        enabled: false,
        targetUrlPatterns: [
            '*://*.youtube.com/watch?v=*',
            '*://*.youtube.com/shorts/*',
            '*://youtu.be/*',
        ]
    }, () => { chrome.runtime.lastError; });

    // Block/Unblock channel
    chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.blockUnblockChannel,
        title: utils.i18n('BlockUnblockChannel'),
        contexts: ['link'],
        targetUrlPatterns: [
            '*://*.youtube.com/channel/*',
            '*://*.youtube.com/c/*',
            '*://*.youtube.com/user/*',
            '*://*.youtube.com/@*',
        ]
    }, () => { chrome.runtime.lastError; });

    // View tags
    chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.viewTags,
        title: `${utils.i18n('ContextMenuViewTags')} (${utils.i18n('RequireAPI')})`,
        contexts: ['link'],
        enabled: false,
        documentUrlPatterns: [
            YOUTUBE_URL_PATTERN
        ],
        targetUrlPatterns: [
            '*://*.youtube.com/watch?v=*',
            '*://*.youtube.com/shorts/*',
        ]
    }, () => { chrome.runtime.lastError; console.log('view tags created') });

    // Keyword blocking
    chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.blockKeywordParentId,
        title: utils.i18n('ContextMenuBlockText'),
        contexts: ['selection']
    });

    // Video
    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordParentId,
        id: CONTEXT_MENU_IDS.blockKeywordVideoParentId,
        title: utils.i18n('Video'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordVideoParentId,
        id: CONTEXT_MENU_IDS.blockKeywordVideoTitle,
        title: utils.i18n('ContextMenuBlockVideoTitle'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordVideoParentId,
        id: CONTEXT_MENU_IDS.blockKeywordVideoDescription,
        title: utils.i18n('ContextMenuBlockVideoDescription'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordVideoParentId,
        id: CONTEXT_MENU_IDS.blockKeywordVideoChannel,
        title: utils.i18n('ContextMenuBlockVideoChannels'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordVideoParentId,
        id: CONTEXT_MENU_IDS.blockKeywordVideoTags,
        title: utils.i18n('ContextMenuBlockVideoTags'),
        contexts: ['selection']
    });

    // Comment
    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordParentId,
        id: CONTEXT_MENU_IDS.blockKeywordCommentParentId,
        title: utils.i18n('Comment'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordCommentParentId,
        id: CONTEXT_MENU_IDS.blockKeywordCommentContent,
        title: utils.i18n('ContextMenuBlockCommentContent'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordCommentParentId,
        id: CONTEXT_MENU_IDS.blockKeywordCommentChannel,
        title: utils.i18n('ContextMenuBlockCommentChannel'),
        contexts: ['selection']
    });

    // Post
    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordParentId,
        id: CONTEXT_MENU_IDS.blockKeywordPostParentId,
        title: utils.i18n('Post'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordPostParentId,
        id: CONTEXT_MENU_IDS.blockKeywordPostContent,
        title: utils.i18n('ContextMenuBlockPostContent'),
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        parentId: CONTEXT_MENU_IDS.blockKeywordPostParentId,
        id: CONTEXT_MENU_IDS.blockKeywordPostChannel,
        title: utils.i18n('ContextMenuBlockPostChannel'),
        contexts: ['selection']
    });

    if (utils.IS_DEV) {
        // The context menus below will be used only on dev mode.

        // Context menu to reload extension.
        chrome.contextMenus.create({
            id: CONTEXT_MENU_IDS.reloadExtension,
            title: 'Reload',
            contexts: ['action']
        });

        // Context menu to reload extension and tab.
        chrome.contextMenus.create({
            id: CONTEXT_MENU_IDS.reloadExtensionAndTab,
            title: 'Reload with Tab',
            contexts: ['action']
        });
    }
}

// Adding functionality to the context menus.
chrome.contextMenus.onClicked.addListener( (info, tab) => {

    switch (info.menuItemId) {
        case CONTEXT_MENU_IDS.reloadExtension:
            chrome.runtime.reload();
            break;
        case CONTEXT_MENU_IDS.reloadExtensionAndTab:
            SM.set({ DEV_reloadTabId: tab.id }).then(() => {
                chrome.runtime.reload();
            });
            break;
        case CONTEXT_MENU_IDS.blockUnblockContent:
            blockOrUnblockContentByUrl(info.linkUrl, tab);
            break;
        case CONTEXT_MENU_IDS.blockUnblockChannel:
            blockOrUnblockChannelByUrl(info.linkUrl, tab);
            break;
        case CONTEXT_MENU_IDS.viewTags:
            const sendTags = (tags) => {

                if (!tags || !Array.isArray(tags)) {
                    var message = utils.i18n('CouldNotGetTags');
                } else if (tags.length == 0) {
                    var message = utils.i18n('VideoWithEmptyTags');
                } else {
                    var message = `Tags: ${tags}`;
                }
    
                MM.emitToTab(tab, MMK.alert, message).catch(err => {});
            };
    
            SM.get([ SMK.apiKey, SMK.enabledAPI, SMK.enableCacheAPI ]).then(async items => {
                const videoId = YoutubeVideo.GetVideoId(info.linkUrl);
    
                if (items.enableCacheAPI) {
                    let localItems = await SM.get([ SMK.local_APIdatas ]);
    
                    if (localItems.local_APIdatas && localItems.local_APIdatas[videoId]) {
                        sendTags(localItems.local_APIdatas[videoId].tags);
                        return;
                    }
                }
    
                if (!items.enabledAPI || !items.apiKey) return sendTags(utils.i18n('RequireAPI'));
    
                fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${items.apiKey}&part=snippet,contentDetails`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                }).then(async res => {
                    const data = await res.json();
                    if (!data || !data.items) return sendTags(null);
                    
                    utils.devLog(`API Request:`, data.items);
    
                    sendTags(data.items[0].snippet.tags || []);
                }).catch(err => {
                    console.log(`Error trying to get tags from video "${videoId}".\n`, err);
                    sendTags(null);
                });
    
            });
            break;
        case CONTEXT_MENU_IDS.blockUnblockChannelWithAPI:

            SM.get([ SMK.apiKey, SMK.enabledAPI, SMK.enableCacheAPI ]).then(async items => {
                const videoId = YoutubeVideo.GetVideoId(info.linkUrl);
    
                if (items.enableCacheAPI) {
                    let localItems = await SM.get([ SMK.local_APIdatas ]);
    
                    if (localItems.local_APIdatas && localItems.local_APIdatas[videoId]) {
                        blockChannel({
                            name: localItems.local_APIdatas[videoId].channelTitle
                        });
                        return;
                    }
                }
    
                if (!items.enabledAPI || !items.apiKey) return sendTags(utils.i18n('RequireAPI'));
    
                fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${items.apiKey}&part=snippet,contentDetails`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                }).then(async res => {
                    const data = await res.json();
                    if (!data || !data.items) return sendAlertToTab(tab, utils.i18n('SomethingWentWrong'));
                    
                    utils.devLog(`API Request:`, data.items);
    
                    blockChannel({
                        name: data.items[0].snippet.channelTitle
                    });
    
                }).catch(err => {
                    console.log(`Error trying to get channelTitle from "${videoId}".\n`, err);
                    sendAlertToTab(tab, utils.i18n('SomethingWentWrong'));
                });
            });
        
            break;
        default:
            if (
                info.parentMenuItemId == CONTEXT_MENU_IDS.blockKeywordVideoParentId ||
                info.parentMenuItemId == CONTEXT_MENU_IDS.blockKeywordCommentParentId ||
                info.parentMenuItemId == CONTEXT_MENU_IDS.blockKeywordPostParentId
            ) {
                let storageKey = '';
                let separateByLines = false;
                let trimKeyword = false;

                // Video
                if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordVideoTitle) {
                    storageKey = SMK.blockedTitles;
                } else if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordVideoDescription) {
                    storageKey = SMK.blockedDescriptions;
                } else if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordVideoTags) {
                    storageKey = SMK.blockedTags;
                } else if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordVideoChannel) {
                    storageKey = SMK.blockedVideoChannels;
                    separateByLines = true;
                    trimKeyword = true;
                }

                // Comment
                if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordCommentContent) {
                    storageKey = SMK.blockedCommentContents;
                } else if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordCommentChannel) {
                    storageKey = SMK.blockedCommentUsers;
                    separateByLines = true;
                    trimKeyword = true;
                }

                // Post
                if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordPostContent) {
                    storageKey = SMK.blockedPostContents;
                } else if (info.menuItemId == CONTEXT_MENU_IDS.blockKeywordPostChannel) {
                    storageKey = SMK.blockedPostChannels;
                    separateByLines = true;
                    trimKeyword = true;
                }

                if (!storageKey) return utils.devLog('trying to block selection text with an empty storageKey', info, storageKey);

                let keyword = info.selectionText;
                if (trimKeyword) keyword = keyword.trim();

                blockKeyword(keyword, storageKey, separateByLines);
            } else {
                console.log(`Context menu "${info.menuItemId}" has no functionality.`, info);
            }


            break;
    }
});

// Block content
MM.on(MMK.blockContent, (message, sender) => {
    blockContent(message.contentId, message.contentType, message.isShorts);
});

// Unblock content.
MM.on(MMK.unblockContent, (message, sender) => {
    unblockContent(message.contentId, message.contentType);
});

// Block channel.
MM.on(MMK.blockChannel, (message, sender) => {
    blockChannel(message.channel);
});

// Unblock channel.
MM.on(MMK.unblockChannel, (message, sender) => {
    unblockChannel(message.channel, message.contentType);
});

/**
 * Block content.
 * @param {string} contentId - content id of the content that will be blocked.
 * @param {string} contentType - content type of the content that will be blocked.
 * @param {boolean} isShorts  - whether the content is shorts. This will use the shorts url (/shorts/...) instead of the watch url (watch?v=...)
 * @param {STORAGE_ITEMS['local']} items - the function will use this storage instead of loading it.
 */
async function blockContent(contentId, contentType, isShorts = false, items = null) {
    let storageKey = '';
    let contentToAdd = contentId;

    if (contentType == CONTENT_TYPES.video) {
        storageKey = SMK.blockedVideos;
        if (isShorts) {
            contentToAdd = `https://www.youtube.com/shorts/${contentId}`;
        } else {
            contentToAdd = `https://www.youtube.com/watch?v=${contentId}`;
        }
    } else if (contentType == CONTENT_TYPES.comment) {
        storageKey = SMK.blockedComments;
    } else if (contentType == CONTENT_TYPES.post) {
        storageKey = SMK.blockedPosts;
    }

    if (!storageKey || !contentToAdd) return utils.devLog(`${contentType || 'content'} has no storageKey to add block.`, contentId, contentType);

    if (!items) items = await SM.get([storageKey]);

    if (!items[storageKey]) {
        items[storageKey] = contentToAdd;
    } else {
        items[storageKey] += '\n' + contentToAdd;
    }

    SM.set(items).then(() => {
        utils.devLog(`${contentType || 'content'} blocked:`, contentToAdd);
    });
}

/**
 * Unblock content.
 * @param {string} contentId - content id of the content that will be unblocked.
 * @param {string} contentType - content type of the content that will be unblocked.
 * @param {STORAGE_ITEMS['local']} items - the function will use this storage instead of loading it.
 */
async function unblockContent(contentId, contentType, items = null) {
    
    let storageKey = '';

    if (contentType == CONTENT_TYPES.video) {
        storageKey = SMK.blockedVideos;
    } else if (contentType == CONTENT_TYPES.comment) {
        storageKey = SMK.blockedComments;
    } else if (contentType == CONTENT_TYPES.post) {
        storageKey = SMK.blockedPosts;
    }

    if (!storageKey) return utils.devLog(`${contentType || 'content'} has no storageKey to unblock.`, contentId, contentType);

    if (!items) items = await SM.get([storageKey]);

    let lines = items[storageKey].split('\n');
    lines = lines.filter(line => !line.includes(contentId));

    items[storageKey] = lines.join('\n');

    SM.set(items).then(() => {
        utils.devLog(`${contentType || 'content'} unblocked:`, contentId);
    });
}

/**
 * Block or unblock content.
 * @param {string} contentId - content id of the content that will be blocked/unblocked.
 * @param {string} contentType - content type of the content that will be blocked/unblocked.
 * @param {boolean} isShorts  - whether the content is shorts. This will use the shorts url (/shorts/...) instead of the watch url (watch?v=...)
 * @param {STORAGE_ITEMS['local']} items - the function will use this storage instead of loading it.
 */
async function blockOrUnblockContent(contentId, contentType, isShorts = false, items = null) {
    let storageKey = '';

    if (contentType == CONTENT_TYPES.video) {
        storageKey = SMK.blockedVideos;
    } else if (contentType == CONTENT_TYPES.comment) {
        storageKey = SMK.blockedComments;
    } else if (contentType == CONTENT_TYPES.post) {
        storageKey = SMK.blockedPosts;
    }

    if (!storageKey) return utils.devLog(`${contentType || 'content'} has no storageKey to check if was blocked.`, contentId);

    if (!items) items = await SM.get([storageKey]);

    // Checking if content is blocked.
    
    const blocked = items[storageKey].split('\n').some(line => line.includes(contentId));

    if (blocked) {
        unblockContent(contentId, contentType, items);
    } else {
        blockContent(contentId, contentType, isShorts, items);
    }
}

/**
 * Block channel.
 * @param {YoutubeChannel} channel - channel that will be blocked.
 * @param {STORAGE_ITEMS['local']} items - the function will use this storage instead of loading it.
 */
async function blockChannel(channel, items = null) {
    const channelIndentifier = channel.handle || channel.name || channel.urlId || channel.url;
    if (!channelIndentifier) return utils.devLog('no channel name or url to block', channel);

    if (!items) items = await SM.get(SMK.blockedChannels);

    if (!items.blockedChannels) {
        items.blockedChannels = channelIndentifier;
    } else {
        items.blockedChannels += '\n' + channelIndentifier;
    }

    SM.set(items).then(() => {
        utils.devLog('channel blocked:', channelIndentifier);
    });
}

/**
 * Unblock channel.
 * @param {YoutubeChannel} channel - channel that will be unblocked.
 * @param {string} contentType - this will be used to get the storage key to unblock video channels, comment users, and post channels.
 * @param {STORAGE_ITEMS['local']} items - the function will use this storage instead of loading it.
 */
async function unblockChannel(channel, contentType = '', items = null) {
    let storageKey = '';

    if (contentType) {
        if (contentType == CONTENT_TYPES.video) {
            storageKey = SMK.blockedVideoChannels;
        } else if (contentType == CONTENT_TYPES.comment) {
            storageKey = SMK.blockedCommentUsers;
        } else if (contentType == CONTENT_TYPES.post) {
            storageKey = SMK.blockedPostChannels;
        } else {
            utils.devLog('unblocking channel with contentType but could not find the storageKey associated. Ignoring it...', contentType);
        }
    }
   
    const keys = [SMK.blockedChannels];
    if (storageKey) keys.push(storageKey);

    if (!items) items = await SM.get(keys);
    
    const removeChannel = (storageValue) => {
        return storageValue.split('\n').filter(ch => {
            if (channel.name && ch.toLowerCase() == channel.name.toLowerCase()) return false;
            if (channel.handle && ch.toLowerCase() == channel.handle.toLowerCase()) return false;
            if (channel.id && ch == channel.id) return false;
            if (channel.url && ch == channel.url) return false;
            if (channel.url && (channel.url.startsWith(ch) || ch.startsWith(channel.url))) return false;
            if (channel.urlId && ch == channel.urlId) return false;
            if (channel.decodedUrlId && ch == channel.decodedUrlId) return false;

            return true;
        }).join('\n');
    }

    items.blockedChannels = removeChannel(items.blockedChannels);
    if (storageKey) items[storageKey] = removeChannel(items[storageKey]);

    SM.set(items).then(() => {
        utils.devLog('channel unblocked:', channel);
    });
}

/**
 * Block/unblock channel.
 * @param {YoutubeChannel} channel - channel that will be blocked/unblocked.
 * @param {string} contentType - this will be used to get the storage key to block/unblock video channels, comment users, and post channels.
 * @param {STORAGE_ITEMS['local']} items - the function will use this storage instead of loading it.
 */
async function blockOrUnblockChannel(channel, contentType = '', items = null) {
    let storageKey = '';

    if (contentType) {
        if (contentType == CONTENT_TYPES.video) {
            storageKey = SMK.blockedVideoChannels;
        } else if (contentType == CONTENT_TYPES.comment) {
            storageKey = SMK.blockedCommentUsers;
        } else if (contentType == CONTENT_TYPES.post) {
            storageKey = SMK.blockedPostChannels;
        } else {
            utils.devLog('block/unblocking channel with contentType but could not find the storageKey associated. Ignoring it...', contentType);
        }
    }
   
    const keys = [SMK.blockedChannels];
    if (storageKey) keys.push(storageKey);

    if (!items) items = await SM.get(keys);

    // Checking if channel is blocked.
    
    const hasChannel = (storageValue) => {
        return storageValue.split('\n').some(ch => {
            if (channel.name && ch.toLowerCase() == channel.name.toLowerCase()) return true;
            if (channel.handle && ch.toLowerCase() == channel.handle.toLowerCase()) return true;
            if (channel.id && ch == channel.id) return true;
            if (channel.url && ch == channel.url) return true;
            if (channel.urlId && ch == channel.urlId) return true;
            if (channel.decodedUrlId && ch == channel.decodedUrlId) return true;

            return false;
        });
    }

    const blocked = hasChannel(items.blockedChannels) || (storageKey && hasChannel(items[storageKey]));

    if (blocked) {
        unblockChannel(channel, contentType, items);
    } else {
        blockChannel(channel, items);
    }
}

/**
 * @param {string} url - url from content that want to block/unblock.
 * @param {chrome.tabs.Tab} tab - send an alert to this tab when failed.
 */
function blockOrUnblockContentByUrl(url, tab = null) {

    let contentId = '';
    let contentType = '';
    let isShorts = false;

    if (YoutubeComment.GetCommentId(url)) {
        // important to check comment first, because comment have video id too.
        contentId = YoutubeComment.GetCommentId(url);
        contentType = CONTENT_TYPES.comment;

    } else if (YoutubeVideo.GetVideoId(url)) {
        contentId = YoutubeVideo.GetVideoId(url);
        isShorts = /\/shorts\//.test(url);
        contentType = CONTENT_TYPES.video;

    } else if (YoutubePost.GetPostId(url)) {
        contentId = YoutubePost.GetPostId(url);
        contentType = CONTENT_TYPES.post;
    }

    if (!contentId || !contentType) {
        utils.devLog('Could not get content from url.', url);

        if (tab) sendAlertToTab(tab, utils.i18n('CouldNotBlockContentLink'));
        return;
    }

    blockOrUnblockContent(contentId, contentType, isShorts);
}

/**
 * @param {string} url - url from the channel that want to block/unblock.
 * @param {chrome.tabs.Tab} tab - send an alert to this tab when failed.
 */
 function blockOrUnblockChannelByUrl(url, tab = null) {

    if (!YoutubeContent.GetChannelUrlId(url)) {
        utils.devLog('Not a channel url.', url);

        if (tab) sendAlertToTab(tab, utils.i18n('CouldNotBlockChannelLink'));
        return;
    }

    const channelUrlWithoutQueries = url.replace(/\?.+/, '');
    const urlId = YoutubeContent.GetChannelUrlId(url);
    const urlDecoded = decodeURI(urlId);

    blockOrUnblockChannel({
        url: channelUrlWithoutQueries,
        urlId: urlId,
        decodedUrlId: urlDecoded
    });
}

function blockKeyword(keyword, storageKey, separateByLines = false) {
    SM.get([storageKey]).then(items => {

        keyword = separateByLines ? keyword.replace(/\n/g, '\\\n') : keyword.replace(/[,\n]/g, '\\$&');

        if (!items[storageKey]) {
            items[storageKey] = keyword;
        } else {
            items[storageKey] += (separateByLines ? '\n' : ', ') + keyword;
        }

        SM.set(items);
    });
}

/** @param {chrome.tabs.Tab} tab @param {string} message */
function sendAlertToTab(tab, message) {
    MM.emitToTab(tab.id, MMK.alert, message).catch(err => {});
}