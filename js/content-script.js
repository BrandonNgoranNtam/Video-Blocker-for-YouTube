// check if contents on the page should be blocked and sync options changes.

utils.devLog('content script injected!');
let apiManagerStarting = false;
let apiManagerStarted = false;

/** @type {HTMLElement} */
let LOGO_REDIRECT = null;

/** @type { {[contentType: string] : {[contentId: string] : AnyYoutubeContentInfo}} } */
const contentsInfos = {};
/** @type { {[contentType: string] : {[contentId: string] : AnyYoutubeContentInfo}} } */
const blockedContentInfos = {};
/** @type { {[contentType: string] : {[elementId: string] : YoutubeContent}} } */
const blockedContents = {};
/** @type { {[contentType: string] : {[contentId: string] : AnyYoutubeContentInfo}} } */
const unblockedContentInfos = {};
let cacheBlockedContentTimeout = null;
const cacheBlockedContentTimeoutMS = 1000;

let EXT_ENABLED = true;

/** @type {STORAGE_ITEMS['local']} */
let LOCAL_ITEMS = {};

MM.on(MMK.alert, message => {
    alert(message);
});

SM.get().then(async items => {
    LOCAL_ITEMS = items;

    passwordModal.setPassword(items.password);
    passwordModal.createPasswordModal();

    shortsManager.start();
    contentFinder.start();
    playerFinder.start();

    EXT_ENABLED = items.extensionEnabled;

    if (EXT_ENABLED) {
        setYoutubeLogoRedirectState(items.logoRedirectToSubs);
    }

    updateKeywords(items);

    utils.devLog('items:', items);

    if (items.enabledAPI) startAPI().then(() => {
        checkAllContents(true);
    });

    contentFinder.onContentInfoUpdate((info, content) => {
        checkContent(content);
    });

    contentFinder.onChannelRendererInfoUpdate((info, channelRenderer) => {
        checkChannelRenderer(channelRenderer);
    });

    let saveCacheTimeout = null;
    const saveCacheMs = 2000;

    apiManager.onVideoDatas(datas => {
        utils.devLog(`API datas:`, datas);

        checkAllContents(true);

        if (!items.enableCacheAPI) return;

        clearTimeout(saveCacheTimeout);
        saveCacheTimeout = setTimeout(saveAPICache, saveCacheMs);
    });

    contentFinder.getCurrentContentElements();

    /** @param {YoutubeContent} content */
    function checkContent(content) {
        if (!EXT_ENABLED) return;

        const contentType = content.getType();

        if (!contentsInfos[contentType]) contentsInfos[contentType] = {};
        contentsInfos[contentType][content.info.id] = content.info;

        const blockInfo = content.shouldBeBlocked(content.info);

        if (items.enabledAPI && apiManagerStarted && contentType === CONTENT_TYPES.video && content.info?.id && !content.info.isMix) {
            apiManager.addVideoToQueue(content.info.id);
        }

        if (blockInfo) {
            content.block(blockInfo);

            addContentToBlockedList(content);
        } else {
            removeContentFromBlockedList(content);

            content.unblock();
        }
    }

    /** @param {YoutubeChannelRenderer} channelRenderer */
    function checkChannelRenderer(channelRenderer) {
        if (!EXT_ENABLED) return;

        const blockInfo = channelRenderer.shouldBeBlocked(channelRenderer.info);

        if (blockInfo) {
            channelRenderer.block(blockInfo);
        } else {
            channelRenderer.unblock();
        }
    }

    if (EXT_ENABLED) toggleShortsShelfs(items.blockShorts);

    // update items.
    SM.onChange(changes => {
        Object.keys(changes).forEach(key => {
            items[key] = changes[key].newValue;
            utils.devLog('item changed:', key, changes[key].newValue);
        });

        LOCAL_ITEMS = items;

        if (changes[SMK.passwordConfig]) {
            passwordModal.updateUnlockTimeLabel(PasswordModal.GetUnlockTimeFromStorage(LOCAL_ITEMS));
        }

        if (items.extensionEnabled && (changes[SMK.blockShorts] || changes[SMK.showOverlays] || changes[SMK.showOverlaysForVideos])) {
            toggleShortsShelfs(!(items.blockShorts && !(items.showOverlays && items.showOverlaysForVideos)));
        }

        updateKeywords(items);
        checkAllContents();
    });

    SM.onChange({
        watchKeys: {
            enabledAPI: (value, oldValue) => {
                if (!value) return;
                if (apiManagerStarting || apiManagerStarted) return;

                startAPI().then(() => {
                    checkAllContents(true);
                });
            },
            apiKey: value => {
                apiManager.setAPIKey(value);
            },
            enableCacheAPI: value => {
                if (!value) return;
                if (!apiManagerStarted) return;

                saveAPICache();
            },
            extensionEnabled: value => {
                if (!value) {
                    onExtensionDisable();
                } else {
                    onExtensionEnable();
                }
            },
            logoRedirectToSubs: value => {
                if (EXT_ENABLED) setYoutubeLogoRedirectState(value);
            },
            password: value => {
                passwordModal.setPassword(value);
            },
            addBlockChannelButton: value => {
                // toggle channel block buttons
                if (!EXT_ENABLED) return;
                toggleChannelBlockButtons(value);
            },
            showBlockChannelButtonOnHover: value => {
                // toggle if channel block buttons need to be shown only on hover.
                document.querySelectorAll(`[${EL_ATTRIBUTES.hasChannelBlockButton}]`).forEach(el => {
                    if (value)
                        el.removeAttribute(EL_ATTRIBUTES.alwaysShowChannelBlockButton);
                    else
                        el.setAttribute(EL_ATTRIBUTES.alwaysShowChannelBlockButton, 'true');
                });
            }
        }
    })

    /** @param {boolean} show */
    function toggleChannelBlockButtons(show) {
        document.querySelectorAll(`.${EL_CLASSES.channelBlockButton}`).forEach(el => {
            if (show)
                el.classList.remove(EL_CLASSES.hide);
            else
                el.classList.add(EL_CLASSES.hide);
        });
    }

    /** @param {boolean} show */
    function toggleShortsShelfs(show) {
        // shorts shelf that appear on the right side as video suggestions.
        const videoSuggestionShelf = document.querySelector('ytd-watch-next-secondary-results-renderer ytd-reel-shelf-renderer');

        if (show) {
            videoSuggestionShelf?.classList.remove(EL_CLASSES.hide);
        } else {
            videoSuggestionShelf?.classList.add(EL_CLASSES.hide);
        }
    }

    /** @param {YoutubeContent} content */
    function addContentToBlockedList(content) {
        const contentType = content.getType();

        if (content.info.id) {
            if (!blockedContentInfos[contentType]) blockedContentInfos[contentType] = {};
            blockedContentInfos[contentType][content.info.id] = content.info;
        }

        if (!blockedContents[contentType]) blockedContents[contentType] = {};
        blockedContents[contentType][content.elementId] = content;

        updateCounter();
        updateCacheBlockedContent();
    }

    /** @param {YoutubeContent} content */
    function removeContentFromBlockedList(content) {
        const isBlocked = content.blocked;
        const contentType = content.getType();

        if (content.info.id && isBlocked) {
            if (blockedContentInfos[contentType]) delete blockedContentInfos[contentType][content.info.id];
            if (!unblockedContentInfos[contentType]) unblockedContentInfos[contentType] = {};
            unblockedContentInfos[contentType][content.info.id] = content.info;
        }

        if (blockedContents[contentType]) delete blockedContents[contentType][content.elementId];

        updateCounter();
        updateCacheBlockedContent();
    }

    function unblockAllContents() {
        for (const contentType in blockedContents) {
            for (const content of Object.values(blockedContents[contentType])) {
                removeContentFromBlockedList(content);
                content.unblock();
            }
        }

        for (const channelRenderer of contentFinder.channelRenderers) {
            channelRenderer.unblock();
        }

    }

    function onExtensionDisable() {
        EXT_ENABLED = false;

        setYoutubeLogoRedirectState(false);
        unblockAllContents();
        toggleChannelBlockButtons(false);
        toggleShortsShelfs(true);
    }

    function onExtensionEnable() {
        EXT_ENABLED = true;

        setYoutubeLogoRedirectState(items.logoRedirectToSubs);
        checkAllContents(true);
        toggleChannelBlockButtons(items.addBlockChannelButton);
        toggleShortsShelfs(!items.blockShorts);
    }

    function checkAllContents(updateBeforeCheck = false) {
        for (const contentType in contentFinder.contents) {
            for (const content of Object.values(contentFinder.contents[contentType])) {
                if (updateBeforeCheck) content.updateInfo();
                checkContent(content);
            }
        }

        for (const channelRenderer of contentFinder.channelRenderers) {
            if (updateBeforeCheck) channelRenderer.updateInfo();
            checkChannelRenderer(channelRenderer);
        }

        if (playerFinder.miniPlayer) {
            if (updateBeforeCheck) playerFinder.miniPlayer.updateInfo();
            checkContent(playerFinder.miniPlayer);
        }

        if (playerFinder.watchVideo) {
            if (updateBeforeCheck) playerFinder.watchVideo.updateInfo();
            checkContent(playerFinder.watchVideo);
        }
    }

    /** Set the key and cache API data. Based on the items. */
    async function startAPI() {
        apiManagerStarting = true;
        let cacheData = null;

        if (items.enableCacheAPI) {
            const itemsLocal = await SM.get(SMK.local_APIdatas);
            cacheData = itemsLocal.local_APIdatas;
        }

        apiManager.setAPIKey(items.apiKey);
        if (cacheData) apiManager.addDatasToCache(CONTENT_TYPES.video, Object.values(cacheData));

        utils.devLog('API started', apiManager);
        apiManagerStarted = true;
        apiManagerStarting = false;
    }

    function saveAPICache() {
        SM.getAndSet(SMK.local_APIdatas, items => {
            items.local_APIdatas = { ...items.local_APIdatas, ...apiManager.apiContentCache[CONTENT_TYPES.video] };
            return items;
        }).then(() => {
            utils.devLog('API data cache saved!');
        });
    }

    function updateCounter() {
        MM.emitToRuntime(MMK.counterTotal, getTotalCounter());
        MM.emitToRuntime(MMK.counter, getCounter());
    }

    // Popup requesting the counter.
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        chrome.runtime.lastError;
        if (message !== MMK.popup_requestCounter) return;

        sendResponse(getCounter());
    });

    /** @return {{ [contentType: string] : number }} */
    function getCounter() {
        const counter = {};
        for (const contentType in blockedContentInfos) {
            counter[contentType] = Object.keys(blockedContentInfos[contentType]).length;
        }
        return counter;
    }

    function getTotalCounter() {
        let out = 0;
        for (const contentType in blockedContentInfos) {
            out += Object.keys(blockedContentInfos[contentType]).length;
        }
        return out;
    }

    function updateCacheBlockedContent() {
        clearTimeout(cacheBlockedContentTimeout);
        cacheBlockedContentTimeout = null;

        cacheBlockedContentTimeout = setTimeout(() => {

            SM.get([SMK.local_blockedContents]).then(localItems => {
                if (!localItems.local_blockedContents) localItems.local_blockedContents = {};

                for (const contentType in blockedContentInfos) {
                    if (!localItems.local_blockedContents[contentType]) localItems.local_blockedContents[contentType] = {};

                    for (const contentId in blockedContentInfos[contentType]) {
                        localItems.local_blockedContents[contentType][contentId] = true;
                    }
                }

                for (const contentType in unblockedContentInfos) {
                    if (!localItems.local_blockedContents[contentType]) continue;

                    for (const contentId in unblockedContentInfos[contentType]) {
                        if (localItems.local_blockedContents[contentType][contentId])
                            delete localItems.local_blockedContents[contentType][contentId];
                    }
                }

                SM.set(localItems);
            });

        }, cacheBlockedContentTimeoutMS);
    }

    function setYoutubeLogoRedirectState(enabled) {
        const logo = document.querySelector('a#logo');
        if (!logo) return;

        if (enabled) {

            if (LOGO_REDIRECT) {
                LOGO_REDIRECT.classList.remove(EL_CLASSES.hide);
                return;
            }

            logo.parentElement.style.position = 'relative';
            logo.parentElement.insertAdjacentHTML('afterbegin', `
                <a id="logo-redirect" class="yt-simple-endpoint ${EL_CLASSES.fill}" style="z-index: 99;" dir="auto">
            `);
            LOGO_REDIRECT = logo.parentElement.querySelector('#logo-redirect');

            LOGO_REDIRECT.addEventListener('click', e => {
                const subsPageButton = [...document.querySelectorAll('ytd-guide-renderer a, ytd-mini-guide-entry-renderer a')].find(a => a.href.endsWith('/feed/subscriptions'));
                if (subsPageButton) {
                    subsPageButton.click();
                } else {
                    window.open('/feed/subscriptions', '_self');
                }
            });

        } else if (LOGO_REDIRECT) {

            LOGO_REDIRECT.classList.add(EL_CLASSES.hide);
        }
    }

});

// update css script on interval
var cssLink = document.createElement("link");

// Set the attributes of the link element
cssLink.rel = "stylesheet";
cssLink.type = "text/css";
cssLink.href = chrome.runtime.getURL('css/content-script.css');
document.head.appendChild(cssLink);

if (utils.IS_DEV) {
    setInterval(() => {
        cssLink.href = cssLink.href.replace(/(\?time=\d+|$)/, `?time=${Date.now()}`);
    }, 1000);
}

