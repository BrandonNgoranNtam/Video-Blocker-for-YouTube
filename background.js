importScripts(
    'js/utilities/constants.js',
    'js/utilities/utils.js', 
    'js/utilities/storage-migration.js',
    'js/managers/storage-manager.js', 
    'js/managers/message-manager.js', 
    'js/contents/content.js', 
    'js/contents/videos/video.js', 
    'js/contents/comments/comment.js', 
    'js/contents/post.js', 
    'context-menu.js'
);

chrome.runtime.onInstalled.addListener(async details => {
    await chrome.storage.sync.get().then(syncItems => {
        if (Object.keys(syncItems).length === 0) return;

        if (!syncItems.storageVersion || syncItems.storageVersion <= 3) {
            // update storage v3 to v4.
            // v3 was sync, v4 is local
            const localItems = StorageMigration.ConvertStorageV3toV4(syncItems);
            return SM.set(localItems).then(() => {
                console.log('storage v3 converted to v4');
                return chrome.storage.sync.clear().then(() => { console.log('sync storage cleared') });
            });
        }
    });

    // the code below execute after storage version migration.

    // check and update extension install date.
    SM.get(SMK.extensionInstallDate).then(localItems => {
        if (!localItems.extensionInstallDate) {
            localItems.extensionInstallDate = Date.now();
            
            SM.set(localItems).then(() => {
                if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
                    // open options page if is first time using the extension.
                    chrome.runtime.openOptionsPage();
                }
            })
        }
    });
});

MM.on(MMK.openOptionsPage, message => {
    if (!message) message = {};
    const optionsPath = chrome.runtime.getURL('html/options.html');
    const optionsMatch = chrome.runtime.getURL('html/options.html*');

    const createOptionPage = () => {
        let urlParameters = '';
        if (message.urlParameters) 
            urlParameters = message.urlParameters;
        else {
            if (message.focusElement) urlParameters += `?el=` + message.focusElement;
            if (message.section) urlParameters += `#` + message.section;
        }

        chrome.tabs.create({
            url: optionsPath + urlParameters
        });
    }

    if (message.newTab) return createOptionPage();

    chrome.runtime.sendMessage('is options open').then(res => {
        if (res === true) return; // option page is already open, options-page.js will handle the rest.

        createOptionPage();
    }).catch(err => {
        createOptionPage();
    });
});

// update tab block count.
MM.on(MMK.counterTotal, (count, sender) => {
    if (!sender.tab || !sender.tab.id) return;

    if (count == 0) {
        var countText = '';
    } else if (count > 99) {
        var countText = '99+';
    } else {
        var countText = count.toString();
    }

    chrome.tabs.get(sender.tab.id).then(tab => {
        if (!tab) return;
        
        chrome.action.setBadgeText({
            tabId: tab.id,
            text: countText
        }).catch(err => {});

    }).catch(err => {});

});

// handle extension enable/disable.
let extEnabled = true;

SM.get([SMK.extensionEnableDate, SMK.extensionEnabled]).then((items) => {
    setEnableDate(items.extensionEnableDate);
    extEnabled = items.extensionEnabled;
    updateExtensionIcon(extEnabled);
});

SM.onChange({
    watchKeys: {
        extensionEnabled: value => {
            extEnabled = value;
            updateExtensionIcon(value);
        },
        extensionEnableDate: value => {
            setEnableDate(value);
        }
    }
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name == 'enableDate') {
        SM.set({
            extensionEnabled: true,
            extensionEnableDate: 0
        });

        extEnabled = true;
        updateExtensionIcon(true);
    }
});

function setEnableDate(enableDate) {
    chrome.alarms.clear('enableDate');

    if (enableDate == 0) return;
    chrome.alarms.create('enableDate', {
        when: enableDate
    });
};

/** @param {boolean} enabled */
function updateExtensionIcon(enabled) {
    if (enabled == undefined) enabled = extEnabled;

    const iconName = enabled ? 'icon' : 'pause-icon/icon_pause'

    chrome.action.setIcon({
        path: {
            '16': `images/${iconName}-16.png`,
            '48': `images/${iconName}-48.png`,
            '128': `images/${iconName}-128.png`
    
        }
    });

}

// Notify tabs from url update
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;

    MM.emitToTab(tab, MMK.urlUpdate, changeInfo.url).catch(err => {});
});