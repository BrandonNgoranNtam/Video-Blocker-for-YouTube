
const statusElement = document.querySelector('#status');
const switchStatus = document.querySelector('#switch_status');
const enableIn = document.querySelector('#enable_in');
const extSwitch = document.querySelector('#ext_switch');
const extSwitchContainer = document.querySelector('.switch');
const sliderInput = document.querySelector('#enable_in input');
const sliderText = document.querySelector('#enable_in_time');
const sliderRemainingTime = document.querySelector('#remaining_time');

const hardDisableCheckbox = document.querySelector('#hard_disable_checkbox');
const hardDisableCheckboxContainer = document.querySelector('#hard_disable_checkbox_container');
const disableButton = document.querySelector('#disable_button');
let disableRemainingClicks = 0; // counter for clicks on the disableButton

let remainingTimeInterval = null;

// 0 - 5m - 15m - 30m - 1h - 2h - 5h - 10h - 15h - 24h
const timers = [
    0, utils.minToMs(5), utils.minToMs(15), utils.minToMs(30), 
    utils.hoursToMs(1), utils.hoursToMs(2), utils.hoursToMs(5), utils.hoursToMs(10), utils.hoursToMs(15), utils.hoursToMs(24)
];

let connected = false;
let pingInterval = null;

const displayCounter = {
    video: { 
        current: 0, total: 0, 
        fullElement: document.querySelector('#videos'),
        currentElement: document.querySelector('#videos #count'), totalElement: document.querySelector('#videos #total_count') 
    },
    comment: { 
        current: 0, total: 0, 
        fullElement: document.querySelector('#comments'),
        currentElement: document.querySelector('#comments #count'), totalElement: document.querySelector('#comments #total_count') 
    },
    post: { 
        current: 0, total: 0, 
        fullElement: document.querySelector('#posts'),
        currentElement: document.querySelector('#posts #count'), totalElement: document.querySelector('#posts #total_count') 
    },
}

let totalCounts = {};

let localBlockedContents = {};
let lastCounter = {};

updateSliderRuntrackStyle();

const pageFeaturesController = pageFeatures();

SM.get([
    SMK.password, SMK.passwordConfig,
    SMK.extensionEnabled, SMK.extensionEnableDate, SMK.extensionEnableLastSliderValue, SMK.totalBlocks, SMK.harderToDisable,
    SMK.harderToDisableAmount,
    SMK.showOverlays, SMK.showOverlaysForVideos, SMK.showOverlaysForComments, SMK.showOverlaysForPosts,
]).then(items => {

    handlePasswordRequest();

    totalCounts = items.totalBlocks;

    const optionsHandler = new OptionHandler(items);

    optionsHandler.addField('#ext_switch', SMK.extensionEnabled);
    optionsHandler.addField('#hard_disable_checkbox', SMK.harderToDisable);

    const showOverlayOption = optionsHandler.addField('#show_overlays', SMK.showOverlays);
    optionsHandler.addField('#show_video_overlay', SMK.showOverlaysForVideos);
    optionsHandler.addField('#show_comment_overlay', SMK.showOverlaysForComments);
    optionsHandler.addField('#show_post_overlay', SMK.showOverlaysForPosts);

    const additionalOverlayOptions = document.querySelector('#show_overlays_additional_options');

    const updateAddtionalOverlayOptionsVisibility = (visible) => {
        visible ? additionalOverlayOptions.classList.remove('hidden') : additionalOverlayOptions.classList.add('hidden');
    }

    updateAddtionalOverlayOptionsVisibility(showOverlayOption.getValue());
    showOverlayOption.listenChange(e => {
        updateAddtionalOverlayOptionsVisibility(e.target.checked);
    });

    sliderInput.value = items.extensionEnableLastSliderValue;
    updateSliderRuntrackStyle();

    sliderInput.onchange = ev => {
        onSliderChange();
    }

    sliderInput.oninput = ev => {
        updateSliderText();
        updateSliderRuntrackStyle();
    }

    onSwitch(items.extensionEnableDate);

    const updateDisableButtons = () => {
        disableRemainingClicks = items.harderToDisableAmount;
        disableButton.textContent = utils.i18nFormat('PopupExtensionDisableButton', disableRemainingClicks);

        if (extSwitch.checked) {
            hardDisableCheckboxContainer.classList.add('hide');
    
            if (hardDisableCheckbox.checked) {
                extSwitchContainer.style.opacity = 0.5;
                extSwitch.disabled = true;
                disableButton.classList.remove('hide');
            } else {
                extSwitch.disabled = false;
                extSwitchContainer.style.opacity = 1;
                disableButton.classList.add('hide');
            }
        } else {
            extSwitchContainer.style.opacity = 1;
            disableButton.classList.add('hide');
            hardDisableCheckboxContainer.classList.remove('hide');
        }
    }

    updateDisableButtons();

    extSwitch.addEventListener('change', e => {
        updateDisableButtons();
    });
    disableButton.addEventListener('click', e => {
        if (disableButton.classList.contains('hide')) return;

        if (disableRemainingClicks <= 1) {
            extSwitch.disabled = false;
            extSwitch.click();
        }

        disableRemainingClicks--;
        disableButton.textContent = utils.i18nFormat('PopupExtensionDisableButton', disableRemainingClicks);
    });

    // Syncing outside storage changes.
    SM.onChange({
        callback: (newItems, oldItems) => {
            optionsHandler.fields.forEach(field => {
                if (typeof newItems[field.storageKey] !== 'undefined') {
                    field.setValue(newItems[field.storageKey]);
    
                    if (field.storageKey == SMK.extensionEnabled) onSwitch(0);
                }
            });
        }
    });

    optionsHandler.listenChange((field, ev) => {
        let saveItem = {};
        saveItem[field.storageKey] = field.getValue();

        if (field.storageKey == SMK.extensionEnabled) {
            onSwitch(0);
            saveItem[SMK.extensionEnableDate] = 0;
        }

        SM.set(saveItem);
    });

    function handlePasswordRequest() {
        if (!items.extensionEnabled) return;
        if (!items.password) return;
        if (items.passwordConfig.keepUnlockedEnabled && items.passwordConfig.unlockDate && Date.now() < items.passwordConfig.unlockDate) return;

        const passwordRequestElement = document.querySelector('#password_request');
        trapFocus(passwordRequestElement);

        const keepUnlocked = passwordRequestElement.querySelector('#keep_unlocked');
        keepUnlocked.checked = items.passwordConfig.keepUnlockedEnabled;

        passwordRequestElement.querySelector('#keep_unlocked_label').textContent = PasswordModal.ComposeUnlockTimeText(items.passwordConfig.unlockTime);
        passwordRequestElement.classList.remove('hidden');

        const passwordInput = passwordRequestElement.querySelector('#password');
        passwordInput.focus();

        const invalidPasswordElement = passwordRequestElement.querySelector('#invalid_password');
        const continueButton = passwordRequestElement.querySelector('#continue');

        const passwordSubmit = () => {
            if (passwordInput.value !== items.password) {
                invalidPasswordElement.classList.remove('hidden');
                return;
            }

            passwordRequestElement.classList.add('hidden');

            if (keepUnlocked.checked) {
                items.passwordConfig.keepUnlockedEnabled = true;

                if (items.passwordConfig.unlockCustomTimeEnabled) {
                    const h = items.passwordConfig.unlockCustomHours;
                    const m = items.passwordConfig.unlockCustomMinutes;

                    items.passwordConfig.unlockDate = Date.now() + (h * 3600000) + (m * 60000);
                } else {
                    items.passwordConfig.unlockDate = Date.now() + (items.passwordConfig.unlockTime * 1000);
                }

                SM.set({ passwordConfig: items.passwordConfig });
            } else {
                items.passwordConfig.keepUnlockedEnabled = false;

                SM.set({ passwordConfig: items.passwordConfig });
            }
            
        }

        const updateContinueButtonDisable = () => {
            if (passwordInput.value) {
                continueButton.removeAttribute('disabled', '');
            } else {
                continueButton.setAttribute('disabled', '');
            }
        }

        updateContinueButtonDisable();

        passwordInput.addEventListener('input', e => {
            invalidPasswordElement.classList.add('hidden');
            updateContinueButtonDisable();
        });

        passwordInput.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            passwordSubmit();
        });

        continueButton.addEventListener('click', passwordSubmit);
    }

    /** prevent focusing on elements outside the one being set as the parameter */
    function trapFocus(element) {
        var focusableEls = element.querySelectorAll('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
        var firstFocusableEl = focusableEls[0];  
        var lastFocusableEl = focusableEls[focusableEls.length - 1];
        var KEYCODE_TAB = 9;
      
        element.addEventListener('keydown', function(e) {
          var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);
      
          if (!isTabPressed) { 
            return; 
          }
      
          if ( e.shiftKey ) /* shift + tab */ {
            if (document.activeElement === firstFocusableEl) {
              lastFocusableEl.focus();
                e.preventDefault();
              }
            } else /* tab */ {
            if (document.activeElement === lastFocusableEl) {
              firstFocusableEl.focus();
                e.preventDefault();
              }
            }
        });
      }
});

SM.get([SMK.local_blockedContents]).then(items => {
    if (items.local_blockedContents) localBlockedContents = items.local_blockedContents;
    if (connected) setCounter(lastCounter);
});

chrome.tabs.query({ active: true }).then(async tabs => {
    const tab = tabs[0];

    if (!tab.url || !isYoutubePage(tab.url)) {
        setStatus(utils.i18n('PopupNothingFound'));
        return;
    }

    SM.onChange({
        callback: (items, oldItems) => {
            if (items.local_blockedContents) localBlockedContents = items.local_blockedContents;
            if (connected) setCounter(lastCounter);
        }
    });

    const ping = () => {
        if (connected) return;

        chrome.tabs.sendMessage(tab.id, MMK.popup_requestCounter).then(res => {
            utils.devLog(res);
    
            if (!res) {
                setStatus(utils.i18n('PopupNoConnection'));
                return;
            }
    
            statusElement.classList.add('hide');
            setCounter(res);
            connected = true;

            clearInterval(pingInterval);
        }).catch(err => {
            setStatus(utils.i18n('PopupNoConnection'));
            return;
        });
    }
    
    pingInterval = setInterval(() => {
        ping();
    }, 1000);

    ping();

    MM.on(MMK.counter, (message, sender) => {
        if (sender.tab && sender.tab.id && sender.tab.id == tab.id) {
            setCounter(message);
            connected = true;
        }
    });

});

const optionButton = document.querySelector('#option_button');

optionButton.onclick = ev => {
    chrome.runtime.openOptionsPage();
};

function setStatus(text) {
    displayCounter.video.fullElement.classList.add('hide');
    statusElement.classList.remove('hide');
    statusElement.textContent = text;
}

/** @param {{ [contentType: string]: number }} counter */
function setCounter(counter) {
    statusElement.classList.add('hide');
    lastCounter = counter;

    displayCounter.video.fullElement.classList.remove('hide');
    if (!counter[CONTENT_TYPES.video]) counter[CONTENT_TYPES.video] = 0;

    for (let contentType in counter) {
        if (!displayCounter[contentType]) continue;
        
        displayCounter[contentType].current = counter[contentType];
        const localTotal = localBlockedContents[contentType] ? Object.keys(localBlockedContents[contentType]).length : 0;
        displayCounter[contentType].total = totalCounts[contentType] ? totalCounts[contentType] + localTotal : localTotal;

        displayCounter[contentType].fullElement.classList.remove('hide');
        displayCounter[contentType].currentElement.textContent = displayCounter[contentType].current;
        displayCounter[contentType].totalElement.textContent = displayCounter[contentType].total;
    }
}

function onSwitch(enableDate) {
    const enabled = extSwitch.checked;
    if (enabled) {
        enableIn.classList.add('hide');
        switchStatus.textContent = utils.i18n('PopupExtensionEnabled');
        remainingTimer(0);

    } else {
        enableIn.classList.remove('hide');
        switchStatus.textContent = utils.i18n('PopupExtensionDisabled');

        onSliderChange(enableDate);
    }
}

function onSliderChange(enableDate) {
    value = parseInt(sliderInput.value);
    updateSliderText(value);
    
    if (!enableDate) {
        enableDate = value == 0 ? 0 : Date.now() + timers[value];
    
        SM.set({
            extensionEnableDate: enableDate,
            extensionEnableLastSliderValue: value
        });
    }

    remainingTimer(enableDate);
}

function updateSliderText(value) {
    if (typeof value !== 'number') value = parseInt(sliderInput.value);
    if (value == 0) return sliderText.classList.add('hide');

    sliderText.classList.remove('hide');

    sliderText.textContent = utils.i18n('PopupDisableTimer').replace('%1', msToString(timers[value]));
}

function remainingTimer(enableDate) {
    if (enableDate == 0) {
        clearInterval(remainingTimeInterval);
        sliderRemainingTime.classList.add('hide');
        sliderRemainingTime.textContent = '';
        return;
    }

    sliderRemainingTime.classList.remove('hide');

    clearInterval(remainingTimeInterval);
    const update = () => {
        const remainingMs = enableDate - Date.now();
        if (remainingMs < 0) {
            remainingTimer(0);
            return;
        }
        sliderRemainingTime.textContent = `(${remainingMs >= 24 * 60 * 60 * 1000 ? '24:00:00' : utils.msToHMS(remainingMs)})`;
    };

    remainingTimeInterval = setInterval(update, 1000);
    update();
}

function updateSliderRuntrackStyle() {
    const value = parseInt(sliderInput.value);
    const min = parseInt(sliderInput.min);
    const max = parseInt(sliderInput.max);
    const p = (value - min) / (max - min) * 100
    sliderInput.style.background = 'linear-gradient(to right, #60a5fa 0%, #60a5fa ' + p + '%, #730000 ' + p + '%, #730000 100%)';
}

function msToString(value) {
    let hours = utils.msToHours(value);
    let minutes = utils.msToMin(value);
    let seconds = utils.msToSec(value);

    if (hours >= 1) {
        return `${hours} ${hours >= 2 ? utils.i18n('hourPlural') : utils.i18n('hour')}`;
    } else if (minutes >= 1) {
        return `${minutes} ${minutes >= 2 ? utils.i18n('minutePlural') : utils.i18n('minute')}`;
    } else {
        return `${seconds} ${seconds >= 2 ? utils.i18n('secondPlural') : utils.i18n('second')}`;
    }
}

function isYoutubePage(url) {
    return /^https?:\/\/(?:(?:www|m)\.)?youtube\.com\//.test(url);
}