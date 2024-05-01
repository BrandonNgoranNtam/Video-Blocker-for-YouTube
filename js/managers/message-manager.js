console.log('[message-manager.js] injected!');

/**
 * @typedef {Object} OpenOptionsMessage
 * @property {string} [urlParameters] - set the url parameters, this will override the other options.
 * @property {string} [focusElement] - selector of the element the option page should be focus to.
 * @property {string} [section] - id of the section the options page should open to.
 * @property {boolean} [newTab] (false) - whether the options should be opened in a new tab, instead of redirection to one already open.
 */

const MESSAGES = {
    urlUpdate: '',
    
    counterTotal: 0,
    /** @type {{ [contentType: string]: number }} */
    counter: {},
    popup_requestCounter: true,

    blockContent: {
        contentType: '',
        contentId: '',
        isShorts: false
    },
    unblockContent: {
        contentType: '',
        contentId: ''
    },
    blockChannel: {
        contentType: '',
        /** @type {YoutubeChannel} */
        channel: {}
    },
    unblockChannel: {
        contentType: '',
        /** @type {YoutubeChannel} */
        channel: {}
    },

    /** The value can be a selector for some element of options page to scroll to. */
    openOptions: '',
    /** @type {OpenOptionsMessage | null} opens the options page. */
    openOptionsPage: null,
    alert: '',
    /** popup checking if the tab has an active content script. */
    ping: true,

    debug_tabRestart: true,
    debug_printMainVideo: true
}

const MESSAGES_RESPONSES = {
    // ...
}

/** 
 * Keys from messages of MessageManager
 * @type { {[K in keyof MESSAGES]: K} } */
const MMK = {}
for (let key in MESSAGES) {
    MMK[key] = key;
}

class MessageManager {

    constructor() {
        /** @type {Map<string, function[]>} */
        this.callbacks = new Map();

        let isBackgroundPage = false;
        try {
            window;
        } catch(err) {
            isBackgroundPage = true;
        }

        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (!msg.__handled) return;

            const messageId = msg.__messageId;
            const message = msg.__message;

            if (msg.__sendToTab) {
                if (!isBackgroundPage) return;

                this.emitToTab(msg.__sendToTab, messageId, message).then(res => {
                    sendResponse(res);
                });
                return;
            } else if (msg.__sendToAllTabs) {
                if (!isBackgroundPage) return;

                chrome.tabs.query({}, tabs => {
                    tabs.forEach(tab => {
                        if (!tab.url || !tab.id) return;
                        if (sender.tab && sender.tab.id === tab.id) return; // don't send to itself.
                        if (tab.url && tab.url.startsWith(`chrome-extension://${chrome.runtime.id}`)) return; // ignore options/popup pages.
                        this.emitToTab(tab, messageId, message).catch(err => {});
                    })
                })
                return;
            }

            if (!this.callbacks.has(messageId)) return;

            this.callbacks.get(messageId).forEach(callback => {
                callback(message, sender, sendResponse);
            });
        });
    }
    
    get keys() {
        return MMK;
    }

    /**
     * receives message.
     * 
     * @template {keyof MESSAGES} K
     * @param {K} messageId - id of the message which wants to receive.
     * @param {(message: MESSAGES[K], sender: chrome.runtime.MessageSender, sendResponse: (response: MESSAGES_RESPONSES[K]) => void) => void} callback
     * @returns {void}
     */
    on(messageId, callback) {
        const callbacks = this.callbacks.get(messageId);
        if (!callbacks) {
            this.callbacks.set(messageId, [callback]);
        } else {
            callbacks.push(callback);
        }
    }

    /**
     * send message to runtime and all tabs.
     * @template {keyof MESSAGES} K
     * 
     * @overload
     * @param {K} messageId
     * @param {MESSAGES[K]} message
     * @returns {void}
     * 
     * @overload
     * @param {K} messageId
     * @returns {void}
     */
    emit(messageId, message) {
        if (!chrome.runtime.id) return new Promise(() => {});
        this.emitToRuntime(messageId, message).catch(err => {});
        this.emitToAllTabs(messageId, message);
    }

    /**
     * emit a message to runtime.
     * @template {keyof MESSAGES} K
     * 
     * @overload
     * @param {K} messageId
     * @param {MESSAGES[K]} message
     * @returns {Promise<MESSAGES_RESPONSES[K]>}
     * 
     * @overload
     * @param {K} messageId
     * @returns {Promise<MESSAGES_RESPONSES[K]>}
     */
    emitToRuntime(messageId, message) {
        if (!chrome.runtime.id) return new Promise(() => {});
        return chrome.runtime.sendMessage({
            __handled: true,
            __messageId: messageId,
            __message: message
        });
    }

    /**
     * emit message to a tab. (Note: tab can't receive responses from tab)
     * @template {keyof MESSAGES} K
     * 
     * @overload
     * @param {chrome.tabs.Tab | number} tab
     * @param {K} messageId
     * @param {MESSAGES[K]} message
     * @returns {Promise<MESSAGES_RESPONSES[K]>}
     * 
     * @overload
     * @param {chrome.tabs.Tab | number} tab
     * @param {K} messageId
     * @returns {Promise<MESSAGES_RESPONSES[K]>}
     */
    emitToTab(tab, messageId, message) {
        if (!chrome.runtime.id) return new Promise(() => {});
        const tabId = tab.id || tab;

        if (!chrome.tabs) {
            // this is a tab trying to send a message to a tab.
            // let's ask for the background script to send it for us.

            return chrome.runtime.sendMessage({
                __handled: true,
                __messageId: messageId,
                __message: message,
                __sendToTab: tabId
            });
        }

        return chrome.tabs.sendMessage(tabId, {
            __handled: true,
            __messageId: messageId,
            __message: message
        });
    }

    /**
     * @template {keyof MESSAGES} K
     * 
     * @overload
     * @param {K} messageId
     * @param {MESSAGES[K]} message
     * @returns {void}
     * 
     * @overload
     * @param {K} messageId
     * @returns {void}
     */
    emitToAllTabs(messageId, message) {
        if (!chrome.runtime.id) return;
        if (!chrome.tabs) {
            // this is a tab trying to send a message to all tab.
            // let's ask for the background script to send it for us.

            return chrome.runtime.sendMessage({
                __handled: true,
                __messageId: messageId,
                __message: message,
                __sendToAllTabs: true
            }).catch(err => {});
        }

        chrome.tabs.query({}, tabs => {
            tabs.forEach(tab => {
                if (!tab.url || !tab.id) return;
                if (tab.url && tab.url.startsWith(`chrome-extension://${chrome.runtime.id}`)) return; // ignore options/popup pages.

                this.emitToTab(tab, messageId, message).catch(err => {});
            });
        });
    }

}

const messageManager = new MessageManager();
// shortcut version.
const MM = messageManager;
