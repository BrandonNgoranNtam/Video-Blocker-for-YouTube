
const LOCAL_GENERAL_DEFAULT_ITEMS = {
    autoSave: false,
    logoRedirectToSubs: false,
    harderToDisable: false,
    harderToDisableAmount: 25,
    
    blockedContentKeywords: '',
    blockedContentKeywordCaseSensitive: false,
    blockedContentKeywordWordBound: false,
}

const LOCAL_PASSWORD_DEFAULT_ITEMS = {
    password: '',
    passwordConfig: {
        keepUnlockedEnabled: true,
        unlockTime: 300,
        unlockDate: 0,
        unlockCustomTimeEnabled: false,
        unlockCustomHours: 0,
        unlockCustomMinutes: 0
    },
}

const LOCAL_VIDEO_DEFAULT_ITEMS = {
    blockedTitles: '',
    blockedTitlesCaseSensitive: false,
    blockedTitlesWordBound: false,

    blockedVideoChannels: '',
    blockedVideoChannelsCaseSensitive: false,
    blockedVideoChannelsExactMatch: true,

    blockedTags: '',
    blockedVideos: '',

    blockedDescriptions: '',
    blockedDescriptionsCaseSensitive: false,
    blockedDescriptionsWordBound: false,

    blockShorts: false,
    autoSkipBlockedShorts: true,

    blockLive: false,
    blockPremiere: false,
    blockMIX: false,
    ignorePlaylistVideos: false,
    ignoreWatchLaterPlaylist: false,
    blockOpenedVideos: true,
    autoSkipBlockedVideos: true,
    removeWatchAnyway: false,
    blockedVideoDuration: 0,
    blockedVideoMinDuration: 0,
    blockedVideoMaxOlder: 0,
    blockedVideoMaxNewer: 0,
    blockedCategories: [],
}

const LOCAL_CHANNEL_DEFAULT_ITEMS = {
    blockedChannels: '',
    blockedChannelsCaseSensitive: false,
    blockedChannelsExactMatch: true,

    addBlockChannelButton: false,
    showBlockChannelButtonOnHover: true,

    whitelistChannels: '',
    whitelistChannelsCaseSensitive: false,
    whitelistChannelsExactMatch: true,
}

const LOCAL_COMMENT_DEFAULT_ITEMS = {
    blockedCommentContents: '',
    blockedCommentContentsCaseSensitive: false,
    blockedCommentContentsWordBound: false,
    blockedCommentUsers: '',
    blockedCommentUsersCaseSensitive: false,
    blockedCommentUsersExactMatch: true,
    blockedComments: '',
}

const LOCAL_POST_DEFAULT_ITEMS = {
    blockedPostContents: '',
    blockedPostContentsCaseSensitive: false,
    blockedPostContentsWordBound: false,

    blockedPostChannels: '',
    blockedPostChannelsCaseSensitive: false,
    blockedPostChannelsExactMatch: true,

    blockedPosts: '',
}

const LOCAL_API_DEFAULT_ITEMS = {
    enabledAPI: false,
    apiKey: '',
    enableCacheAPI: true,
    preventAPIpages: false,
    APIBlacklistSubsPage: true,
    APIBlacklistHomePage: false,
    APIBlacklistWatchPage: false,
    APIBlacklistChannelPage: false,
    APIBlacklistPlaylistPage: false,
    APIBlacklistTrendingPage: false,
    APIBlacklistShortsPage: false,
    APIBlacklistPages: '',
}

const LOCAL_OVERLAY_DEFAULT_ITEMS = {
    showOverlays: false,
    showOverlaysForVideos: true,
    showOverlaysForComments: true,
    showOverlaysForPosts: true,
    removeRevealButton: false,
    removeUnblockButton: false,
    removeBlockReason: false,
    removeOptionsButton: false,
}

const STORAGE_ITEMS = {
    sync: {},
    local: { 
        storageVersion: 4,
        /** date of first installation of the extension */
        extensionInstallDate: 0,
        /** date to remind to donate again */
        donationRemindDate: 0,
        /** time interval selected to remind to donate again */
        donationSelectedTime: 0,
        /** whether the user opted to never be reminded to donate */
        donationShouldNeverRemind: false,

        // Password
        ...LOCAL_PASSWORD_DEFAULT_ITEMS,

        contentFilter: '',

        extensionEnabled: true,
        extensionEnableDate: 0,
        extensionEnableLastSliderValue: 0,

        // This is only set when exporting settings.
        /** @type { {[contentType: string]: number} } */
        totalBlocks: {},
        
        // General
        ...LOCAL_GENERAL_DEFAULT_ITEMS,

        // Videos
        ...LOCAL_VIDEO_DEFAULT_ITEMS,

        // Channels
        ...LOCAL_CHANNEL_DEFAULT_ITEMS,

        // Comments
        ...LOCAL_COMMENT_DEFAULT_ITEMS,

        // Posts
        ...LOCAL_POST_DEFAULT_ITEMS,

        // API
        ...LOCAL_API_DEFAULT_ITEMS,

        // Overlays
        ...LOCAL_OVERLAY_DEFAULT_ITEMS,

        // Debug
        debug_tabToReload: 0,

        DEV_reloadTabId: '', 
        /** @type { { [contentId: string] : VideoAPIData } } */
        local_APIdatas: {},
        /** @type { { [contentType: string] : { [contentId: string] : true} } } */
        local_blockedContents: {},
    },
    session: {},
    managed: {}
}

/** @type { {[K in keyof STORAGE_ITEMS['local']]: K} } */
const SMK = {}
Object.keys(STORAGE_ITEMS.local).forEach(k => ( SMK[k] = k ));

/** @type { {[K in keyof STORAGE_ITEMS['sync']]: K} } */
const SMK_SYNC = {}
Object.keys(STORAGE_ITEMS.sync).forEach(k => ( SMK_SYNC[k] = k ));

/** @type { {[K in keyof STORAGE_ITEMS['session']]: K} } */
const SMK_SESSION = {}
Object.keys(STORAGE_ITEMS.session).forEach(k => ( SMK_SESSION[k] = k ));

/** @type { {[K in keyof STORAGE_ITEMS['managed']]: K} } */
const SMK_MANAGED = {}
Object.keys(STORAGE_ITEMS.managed).forEach(k => ( SMK_MANAGED[k] = k ));

/**
 * @template {'sync' | 'local' | 'session' | 'managed'} T
 */
class ExtensionStorageManagerArea {
    /** @param {T} area */
    constructor(area = 'local') {
        this.area = area;
    }

    /** @param {Partial<STORAGE_ITEMS[T]>} items */
    set(items) {
        if (!chrome.runtime.id) return new Promise(() => {});

        return chrome.storage[this.area].set(items);
    }

    /**
     * <K extends keyof S>(items: K[]) => Promise<{[X in K]: S[X]}>
     * 
     * @template {keyof STORAGE_ITEMS[T]} K
     * 
     * @overload
     * @param {K[]} items
     * @returns {Promise<{[X in K]: STORAGE_ITEMS[T][X]}>}
     * 
     * @overload
     * @param {K} items
     * @returns {Promise<{[X in K]: STORAGE_ITEMS[T][X]}>}
     * 
     * @overload
     * @returns {Promise<STORAGE_ITEMS[T]>}
     * 
     */
    get(items) {
        if (!chrome.runtime.id) return new Promise(() => {});

        if (!items) return chrome.storage[this.area].get(null).then(items => {
            Object.entries(STORAGE_ITEMS[this.area]).forEach(([k, value]) => {
                if (k in items) return;

                items[k] = STORAGE_ITEMS[this.area][k];
            });

            return items;
        });

        if (typeof items === 'string') items = [items];
        if (Array.isArray(items)) {
            let keys = [...items];
            items = {};

            keys.forEach(k => {
                if (k in STORAGE_ITEMS[this.area]) {
                    items[k] = STORAGE_ITEMS[this.area][k];
                } else {
                    items[k] = null;
                }
            });
        }
        return chrome.storage[this.area].get(items);
    }
    /**
     * @template {keyof STORAGE_ITEMS[T]} K
     * 
     * @overload
     * @param {K[]} items
     * @param {(_items: { [X in K]: STORAGE_ITEMS[T][X] }) => STORAGE_ITEMS[T]} setFunc
     * @returns {Promise<void>}
     * 
     * @overload
     * @param {K} items
     * @param {(_items: { [X in K]: STORAGE_ITEMS[T][X] }) => STORAGE_ITEMS[T]} setFunc
     * @returns {Promise<void>}
     * 
     * @overload
     * @param {(items: STORAGE_ITEMS[T]) => STORAGE_ITEMS[T]} setFunc
     * @returns {Promise<void>}
     * 
     */
    getAndSet(items, setFunc) {
        if (!chrome.runtime.id) return new Promise(() => {});

        if (!setFunc) {
            setFunc = items;
            items = undefined;
        }

        return this.get(items).then(_items => {
            let newItems = setFunc(_items);
            if (!newItems) return;

            return this.set(newItems);
        });
    }

    /**
     * @template {keyof STORAGE_ITEMS[T]} K
     * 
     * @param {K | K[]} items
     * @returns {Promise<void>}
     */
    remove(items) {
        if (!chrome.runtime.id) return new Promise(() => {});

        if (typeof items === 'string') items = [items];

        return chrome.storage[this.area].remove(items);
    }

    /** @returns {Promise<void>} */
    clear() {
        if (!chrome.runtime.id) return new Promise(() => {});

        return chrome.storage[this.area].clear();
    }

    /**
     * @typedef {{[K in keyof STORAGE_ITEMS[T]]: (newValue: STORAGE_ITEMS[T][K], oldValue: STORAGE_ITEMS[T][K]) => void}} StorageOnChangeWatchKeys
    */

    /**
     * @typedef {(changes: { [key: string]: chrome.storage.StorageChange; }, areaName: "sync" | "local" | "session" | "managed") => void} StorageOnChangeCallback
     */

    /**
     * @template K
     * @typedef {Object} StorageOnChangeOptions
     * @property { StorageOnChangeWatchKeys } watchKeys - watch each key changes.
     * @property { (newItems: Partial<STORAGE_ITEMS[T]>, oldItems: Partial<STORAGE_ITEMS[T]>, changes: chrome.storage.StorageChange) => void } callback - full change in the entire items.
     * @property { (keyName: K, newValue: STORAGE_ITEMS[T][K], oldValue: STORAGE_ITEMS[T][K]) => void } keyCallback - callback with the key that changed with the new value and old value.
     */

    /**
     * Callback for any storage change.
     * @param {StorageOnChangeOptions<K> | StorageOnChangeCallback} options
     * @template { keyof STORAGE_ITEMS[T] } K
     */
    onChange(options) {
        if (!chrome.runtime.id) return;

        const isFunc = typeof options === 'function';

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== this.area) return;

            if (isFunc) return options(changes);

            if (options.watchKeys) {
                Object.entries(options.watchKeys).forEach(([k, callback]) => {
                    if (!changes[k]) return;

                    callback(changes[k].newValue, changes[k].oldValue);
                });
            }

            if (options.keyCallback) {
                Object.entries(changes).forEach(([k, changes]) => {
                    options.keyCallback(k, changes.newValue, changes.oldValue);
                });
            }

            if (!options.callback) return;

            const newItems = {};
            const oldItems = {};

            for (let k in changes) {
                newItems[k] = changes[k].newValue;
                oldItems[k] = changes[k].oldValue;
            }

            options.callback(newItems, oldItems, changes);
        });
    }
}

/** @extends {ExtensionStorageManagerArea<'local'>} */
class ExtensionStorageManager extends ExtensionStorageManagerArea {
    constructor() {
        super();

        this.sync = new ExtensionStorageManagerArea('sync');
        this.session = new ExtensionStorageManagerArea('session');
        this.managed = new ExtensionStorageManagerArea('managed');
    }
}

const storageManager = new ExtensionStorageManager();
// shortcut version.
const SM = storageManager;
