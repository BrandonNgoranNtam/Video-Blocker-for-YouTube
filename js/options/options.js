// Read/Save storage.
const language = utils.i18n('ThisLanguage');
const languageCode = language.replace(/_/g, '-');

document.querySelector('html').setAttribute('lang', languageCode);

const loading = document.querySelector('#loading');

const pageFeaturesController = pageFeatures({
    themeButton: document.querySelector('theme_toggle'),
    saveTextAreaSizes: true
});

/** @type {{[contentType: string]: HTMLElement}} */
const counterElements = {};
counterElements[CONTENT_TYPES.video] = document.querySelector('#counter #videos');
counterElements[CONTENT_TYPES.comment] = document.querySelector('#counter #comments');
counterElements[CONTENT_TYPES.post] = document.querySelector('#counter #posts');

if (utils.IS_DEV) {
    document.querySelectorAll('.only-debug').forEach(el => {
        el.classList.remove('hide');
    });
}

const defaultSettingsButton = document.querySelector('#default_settings');
const importSettingsInput = document.querySelector('#import_input');
const importSettingsButton = document.querySelector('#import_settings');
const exportSettingsButton = document.querySelector('#export_settings');

const apiCheck = document.querySelector('#check_api_key');
const apiStatus = document.querySelector('#api_status');
const apiCacheCount = document.querySelector('#api_cache_count');

const changelog = document.querySelector('#changelog');
const changelogNotification = document.querySelector('#changelog #notification');

const saveButton = document.querySelector('#save');

const passwordConfigElements = {
    keepUnlockedCheckbox: document.querySelector('#keep_unlocked_checkbox'),
    unlockSelectElement: document.querySelector('#unlock_time'),
    customUnlockTimeContainer: document.querySelector('#custom_unlock_time'),
    unlockCustomHoursInput: document.querySelector('#unlock_h'),
    unlockCustomMinutesInput: document.querySelector('#unlock_m'),
}

let lastLocalBlockedContents = {};

SM.get().then(async items => {

    const confirmPasswordModal = new Modal(document.querySelector('#password_confirm_dialog'));

    const resetSettingOptionsModal = new Modal(document.querySelector('#reset_options_dialog'));

    passwordModal.setPasswordModal(document.querySelector('#password_request_dialog'));
    passwordModal.setPassword(items.password);

    if (items.password) {
        try {
            const result = await passwordModal.requestPassword({
                removeCancelation: true,
                keepUnlockedChecked: items.passwordConfig.keepUnlockedEnabled,
                unlockDate: items.passwordConfig.unlockDate,
                unlockTime: PasswordModal.GetUnlockTimeFromStorage(items)
            });

            if (result.wasOpen && result.keptUnlocked) {
                items.passwordConfig.keepUnlockedEnabled = true;

                if (items.passwordConfig.unlockCustomTimeEnabled) {
                    const h = items.passwordConfig.unlockCustomHours;
                    const m = items.passwordConfig.unlockCustomMinutes;

                    items.passwordConfig.unlockDate = Date.now() + (h * 3600000) + (m * 60000);
                } else {
                    items.passwordConfig.unlockDate = Date.now() + (items.passwordConfig.unlockTime * 1000);
                }

                SM.set({ passwordConfig: items.passwordConfig });

            } else if (result.wasOpen && !result.keptUnlocked && items.passwordConfig.keepUnlockedEnabled) {
                items.passwordConfig.keepUnlockedEnabled = false;

                SM.set({ passwordConfig: items.passwordConfig });
            }

            if (utils.IS_DEV && !result.wasOpen) {
                console.log('password will be unlocked in:', (items.passwordConfig.unlockDate - Date.now()) / 1000, 'seconds');
            }
        } catch (err) {
            console.log('password error:', err);
        }

    }

    if (language !== 'pt_BR') {
        document.querySelectorAll('.pix').forEach(el => el.classList.add('hidden'));
        document.querySelector('#donation').setAttribute('no-pix', '');
    }

    handleDonationModal();

    const changelogLastSeenVersion = localStorage.getItem('changelogLastSeenVersion');
    const newsFor = changelog.getAttribute('news-for');

    if (changelogLastSeenVersion !== newsFor) {
        changelogNotification.classList.remove('hidden');

        const pingIcon = changelogNotification.querySelector('#ping');
        pingIcon.classList.add('ping-anim');

        changelog.onclick = ev => {
            changelogNotification.classList.add('hidden');
            localStorage.setItem('changelogLastSeenVersion', newsFor);
        }
    }

    const optionsHandler = new OptionHandler(items);

    const autoSaveField = optionsHandler.addField('#auto_save', SMK.autoSave);
    optionsHandler.addField('#logo_redirect', SMK.logoRedirectToSubs);
    optionsHandler.addField('#hard_disable', SMK.harderToDisable);
    optionsHandler.addField('#block_content', SMK.blockedContentKeywords);
    optionsHandler.addField('#block_content_cs', SMK.blockedContentKeywordCaseSensitive);
    optionsHandler.addField('#block_content_wb', SMK.blockedContentKeywordWordBound);

    optionsHandler.addField('#block_titles', SMK.blockedTitles);
    optionsHandler.addField('#block_titles_cs', SMK.blockedTitlesCaseSensitive);
    optionsHandler.addField('#block_titles_wb', SMK.blockedTitlesWordBound);
    optionsHandler.addField('#block_video_channels', SMK.blockedVideoChannels);
    optionsHandler.addField('#block_video_channels_cs', SMK.blockedVideoChannelsCaseSensitive);
    optionsHandler.addField('#block_video_channels_em', SMK.blockedVideoChannelsExactMatch);
    optionsHandler.addField('#block_tags', SMK.blockedTags);
    optionsHandler.addField('#block_videos', SMK.blockedVideos);
    optionsHandler.addField('#block_descriptions', SMK.blockedDescriptions);
    optionsHandler.addField('#block_descriptions_cs', SMK.blockedDescriptionsCaseSensitive);
    optionsHandler.addField('#block_descriptions_wb', SMK.blockedDescriptionsWordBound);
    optionsHandler.addField('#block_shorts', SMK.blockShorts);
    optionsHandler.addField('#auto_skip_blocked_shorts', SMK.autoSkipBlockedShorts);
    optionsHandler.addField('#block_mix', SMK.blockMIX);
    optionsHandler.addField('#block_live', SMK.blockLive);
    optionsHandler.addField('#block_premiere', SMK.blockPremiere);
    optionsHandler.addField('#ignore_playlist_videos', SMK.ignorePlaylistVideos);
    optionsHandler.addField('#ignore_watch_later_playlist', SMK.ignoreWatchLaterPlaylist);
    optionsHandler.addField('#block_open_videos', SMK.blockOpenedVideos);
    optionsHandler.addField('#auto_skip_video', SMK.autoSkipBlockedVideos);

    const watchAnymayOption = optionsHandler.addField('#remove_watch_anymay', SMK.removeWatchAnyway);
    const watchAnymayOption2 = optionsHandler.addField('#remove_watch_anymay_2', SMK.removeWatchAnyway);
    watchAnymayOption.listenChange(e => { watchAnymayOption2.setValue(e.target.checked); console.log('a') });
    watchAnymayOption2.listenChange(e => { watchAnymayOption.setValue(e.target.checked); console.log('b') });

    optionsHandler.addField('#video_max_duration', SMK.blockedVideoDuration);
    optionsHandler.addField('#video_min_duration', SMK.blockedVideoMinDuration);
    optionsHandler.addField('#video_max_older', SMK.blockedVideoMaxOlder);
    optionsHandler.addField('#video_max_newer', SMK.blockedVideoMaxNewer);

    optionsHandler.addField('#add_channel_block_button', SMK.addBlockChannelButton);
    optionsHandler.addField('#show_channel_block_button_on_hover', SMK.showBlockChannelButtonOnHover);
    optionsHandler.addField('#block_channels', SMK.blockedChannels);
    optionsHandler.addField('#block_channels_cs', SMK.blockedChannelsCaseSensitive);
    optionsHandler.addField('#block_channels_em', SMK.blockedChannelsExactMatch);
    optionsHandler.addField('#whitelist_channels', SMK.whitelistChannels);
    optionsHandler.addField('#whitelist_channels_cs', SMK.whitelistChannelsCaseSensitive);
    optionsHandler.addField('#whitelist_channels_em', SMK.whitelistChannelsExactMatch);

    optionsHandler.addField('#block_comment_contents', SMK.blockedCommentContents);
    optionsHandler.addField('#block_comment_content_cs', SMK.blockedCommentContentsCaseSensitive);
    optionsHandler.addField('#block_comment_content_wb', SMK.blockedCommentContentsWordBound);
    optionsHandler.addField('#block_comments_users', SMK.blockedCommentUsers);
    optionsHandler.addField('#block_comments_users_cs', SMK.blockedCommentUsersCaseSensitive);
    optionsHandler.addField('#block_comments_users_em', SMK.blockedCommentUsersExactMatch);
    optionsHandler.addField('#block_comments', SMK.blockedComments);

    optionsHandler.addField('#block_post_contents', SMK.blockedPostContents);
    optionsHandler.addField('#block_post_contents_cs', SMK.blockedPostContentsCaseSensitive);
    optionsHandler.addField('#block_post_contents_wb', SMK.blockedPostContentsWordBound);
    optionsHandler.addField('#block_post_channels', SMK.blockedPostChannels);
    optionsHandler.addField('#block_post_channels_cs', SMK.blockedPostChannelsCaseSensitive);
    optionsHandler.addField('#block_post_channels_em', SMK.blockedPostChannelsExactMatch);
    optionsHandler.addField('#block_posts', SMK.blockedPosts);

    optionsHandler.addField('#enable_api', SMK.enabledAPI);
    const apiKeyField = optionsHandler.addField('#api_key', SMK.apiKey);
    optionsHandler.addField('#cache_api_data', SMK.enableCacheAPI);
    optionsHandler.addField('#blacklist_api_pages', SMK.preventAPIpages);
    optionsHandler.addField('#blacklist_api_subs', SMK.APIBlacklistSubsPage);
    optionsHandler.addField('#blacklist_api_home', SMK.APIBlacklistHomePage);
    optionsHandler.addField('#blacklist_api_watch', SMK.APIBlacklistWatchPage);
    optionsHandler.addField('#blacklist_api_channel', SMK.APIBlacklistChannelPage);
    optionsHandler.addField('#blacklist_api_playlists', SMK.APIBlacklistPlaylistPage);
    optionsHandler.addField('#blacklist_api_trending', SMK.APIBlacklistTrendingPage);
    optionsHandler.addField('#blacklist_api_shorts', SMK.APIBlacklistShortsPage);
    optionsHandler.addField('#blacklist_api_specific_pages', SMK.APIBlacklistPages);

    optionsHandler.addField('#show_overlays', SMK.showOverlays);
    optionsHandler.addField('#show_video_overlay', SMK.showOverlaysForVideos);
    optionsHandler.addField('#show_comment_overlay', SMK.showOverlaysForComments);
    optionsHandler.addField('#show_post_overlay', SMK.showOverlaysForPosts);
    optionsHandler.addField('#remove_reveal_button', SMK.removeRevealButton);
    optionsHandler.addField('#remove_unblock_button', SMK.removeUnblockButton);
    optionsHandler.addField('#remove_block_reason', SMK.removeBlockReason);
    optionsHandler.addField('#remove_options_reason', SMK.removeOptionsButton);

    requireAPI();

    defaultSettingsButton.onclick = defaultSettings;
    importSettingsButton.onclick = () => {
        passwordModal.requestPassword({ removeKeepUnlockedCheckbox: true }).then(() => {
            importSettingsInput.click();
        }).catch(err => {
            console.log('password modal: import settings.', err);
        });
    };
    importSettingsInput.onchange = importSettings;
    exportSettingsButton.onclick = exportSettings;

    pageFeaturesController.checkOptionsControls();
    categoryButtons();

    handlePasswordConfig();

    let hardToDisableRemainingAmount = items.harderToDisableAmount;
    handleHardToDisable();

    apiCheck.onclick = ev => {
        apiStatus.classList.remove('hidden');

        apiStatus.classList.remove('success');
        apiStatus.classList.remove('error');

        const apiKey = apiKeyField.getValue();
        if (!apiKey) return apiStatus.textContent = utils.i18n('APICheckNoKey');

        apiStatus.textContent = utils.i18n('APICheckLoading');

        const checkVideoId = 'jNQXAC9IVRw' // Video: Me at the zoo.

        const onError = (err) => {
            console.log('err:', err);

            apiStatus.classList.remove('success');
            apiStatus.classList.add('error');

            apiStatus.innerHTML = `${err}`;
        }

        const url = `https://www.googleapis.com/youtube/v3/videos?id=${checkVideoId}&key=${apiKey}&part=snippet,contentDetails`;
        fetch(url).then(res => {
            res.json().then(data => {
                utils.devLog(`API Request:`, data, res);

                if (res.status == 200) {
                    apiStatus.classList.remove('error');
                    apiStatus.classList.add('success');
                } else {
                    apiStatus.classList.remove('success');
                    apiStatus.classList.add('error');
                }

                let message = `Status: ${res.status}<br>`;
                if (res.status == 200) message += utils.i18n('APICheckSuccess');
                if (data.error && data.error.message) message += `Message: ${data.error.message}<br>`;
                apiStatus.innerHTML = message;

            }).catch(onError);
        }).catch(onError);
    };

    SM.get([SMK.local_blockedContents]).then(localItems => {
        lastLocalBlockedContents = localItems.local_blockedContents;
        setCounter(lastLocalBlockedContents);
        loaded();
    }).catch(err => {
        loaded();
    });

    document.addEventListener('keydown', ev => {
        if (ev.ctrlKey && ev.key == 's') {
            ev.preventDefault();
            save();
        }
    });

    saveButton.onclick = () => {
        save();
    };

    let autoSaveTimeout = null;

    optionsHandler.listenChange(() => {
        onFieldChange();
    });

    function hasChanged() {
        const selectedCategories = getSelectedCategories();
        const hasCategoriesChanged = items.blockedCategories.length !== selectedCategories.length || !items.blockedCategories.every(e => selectedCategories.includes(e));

        return optionsHandler.hasChanged() || hasCategoriesChanged || hasPasswordConfigChanged();
    }

    function onFieldChange() {
        if (hasChanged()) {
            if (autoSaveField.getValue()) {
                clearTimeout(autoSaveTimeout);
                autoSaveTimeout = setTimeout(() => {
                    save(true);
                }, 300);
                return;
            }
            saveButton.textContent = utils.i18n('OptionSaveButton');
            saveButton.classList.remove('saved');
            saveButton.classList.add('active');
        } else {
            saveButton.classList.remove('active');
        }
    }

    function save(autoSave = false) {

        items.blockedCategories = getSelectedCategories();

        // save password config
        items.passwordConfig.keepUnlockedEnabled = passwordConfigElements.keepUnlockedCheckbox.checked;

        if (!items.passwordConfig.keepUnlockedEnabled) items.passwordConfig.unlockDate = 0;

        if (passwordConfigElements.unlockSelectElement.value === 'custom') {
            items.passwordConfig.unlockCustomTimeEnabled = true;
        } else {
            items.passwordConfig.unlockCustomTimeEnabled = false;
            items.passwordConfig.unlockTime = parseInt(passwordConfigElements.unlockSelectElement.value);
            items.passwordConfig.unlockDate = 0;
        }

        items.passwordConfig.unlockCustomHours = parseInt(passwordConfigElements.unlockCustomHoursInput.value);
        items.passwordConfig.unlockCustomMinutes = parseInt(passwordConfigElements.unlockCustomMinutesInput.value);

        optionsHandler.getStorage(items, true);

        SM.set(items).then(() => {
            utils.devLog('saved!', items);

            if (!autoSave || saveButton.classList.contains('active')) {
                saveButton.textContent = utils.i18n('OptionSaveButtonSuccess');
                saveButton.classList.add('saved');

                if (!autoSave) {
                    onFieldChange();
                } else {
                    saveButton.classList.remove('active');
                }
            }
        });

    }

    function categoryButtons() {
        const categoriesElement = document.querySelector('#categories');

        let entries = Object.entries(CATEGORIES_IDS);

        // Sort alphabetically.
        entries = entries.sort((a, b) => a[1].localeCompare(b[1]));

        const categoryButtons = [];

        for (let [id, name] of entries) {

            const categoryButton = document.createElement('button');
            categoryButton.className = 'category-button';
            categoryButton.setAttribute('category-id', id);
            categoryButton.textContent = utils.i18n(`Category${id}`) || name;

            categoryButton.onclick = ev => {
                categoryButton.toggleAttribute('aria-selected');
                onFieldChange();
            }

            categoriesElement.insertAdjacentElement('beforeend', categoryButton);
            categoryButtons.push(categoryButton);
        }

        const selectAll = document.querySelector('#select_all');
        const unselectAll = document.querySelector('#unselect_all');

        selectAll.onclick = ev => {
            categoryButtons.forEach(b => {
                b.setAttribute('aria-selected', '');
            });
            onFieldChange();
        }

        unselectAll.onclick = ev => {
            categoryButtons.forEach(b => {
                b.removeAttribute('aria-selected', '');
            });
            onFieldChange();
        }

        loadCategoryButtonsFromItems();
    }

    function loadCategoryButtonsFromItems() {
        document.querySelectorAll('.category-button').forEach(b => {
            const categoryId = b.getAttribute('category-id');
            if (items.blockedCategories.includes(categoryId))
                b.setAttribute('aria-selected', '');
            else
                b.removeAttribute('aria-selected');
        });
    }

    // Update storage changes from other sources.
    SM.onChange({
        callback: (newItems, oldItems) => {
            Object.assign(items, newItems);

            optionsHandler.fields.forEach(field => {
                if (typeof newItems[field.storageKey] !== 'undefined') {
                    field.setValue(newItems[field.storageKey]);
                }
            });

            updateHardToDisableElements(newItems.extensionEnabled === true);

            onFieldChange();
            pageFeaturesController.checkOptionsControls();
            requireAPI();
        }
    });

    SM.onChange({
        callback: (newItems, oldItems) => {
            if (newItems.local_blockedContents) {
                lastLocalBlockedContents = newItems.local_blockedContents;
                setCounter(lastLocalBlockedContents);
            }
            if (newItems.local_APIdatas) updateAPICacheCounterWithDatas(newItems.local_APIdatas);
        }
    });

    function getSelectedCategories() {
        const selectedButtons = [...document.querySelectorAll('#categories .category-button[aria-selected]')];
        return selectedButtons.map(b => b.getAttribute('category-id'));
    }

    handleDisableClickAmountRadios();

    function handleDisableClickAmountRadios() {
        const radios = document.querySelectorAll('input[type="radio"][name="disable_click_amount"]');
        radios.forEach(radio => {
            const value = parseInt(radio.value);

            if (value === items.harderToDisableAmount) {
                radio.checked = true;
            }

            radio.addEventListener('change', e => {
                if (radio.checked) SM.set({ harderToDisableAmount: value });
            })
        });
    }

    /** @param {{ [contentType: string] : { [contentId: string] : boolean} } } counter */
    function setCounter(counter = {}) {
        for (const contentType in counterElements) {
            let count = 0;
            if (counter[contentType]) {
                count = Object.keys(counter[contentType]).length;
            }

            let total = 0;
            if (items.totalBlocks[contentType]) {
                total = items.totalBlocks[contentType];
            }

            let i18nMessageName = '';
            switch (contentType) {
                case CONTENT_TYPES.video:
                    i18nMessageName = 'VideoBlockCount'
                    break;
                case CONTENT_TYPES.comment:
                    i18nMessageName = 'CommentBlockCount'
                    break;
                case CONTENT_TYPES.post:
                    i18nMessageName = 'PostBlockCount'
                    break;
                case CONTENT_TYPES.playlist:
                    i18nMessageName = 'PlaylistBLockCount'
                    break;
                default:
                    console.warn(`could not find block count localization for content of type "${contentType}"`);
                    break;
            }

            counterElements[contentType].innerHTML = utils.i18nFormat(i18nMessageName, count + total);

        }
    }

    function loaded() {
        loading.classList.add('loaded');

        setTimeout(() => {
            loading.classList.add('hide');
        }, 200);
    }

    window.onbeforeunload = ev => {
        if (hasChanged()) {
            return utils.i18n('OptionUnsavedPrompt');
        }
    };

    document.querySelector('#clear_api_cache').onclick = ev => {

        if (!confirm(utils.i18n('APICacheClearPrompt'))) return;

        SM.set({
            local_APIdatas: {}
        }).then(() => {
            updateAPICacheCounterWithDatas({});
            alert(utils.i18n('APICacheClearSuccess'))
        }).catch(err => {
            alert(utils.i18n('SomethingWentWrong'))
        });
    };

    SM.get([SMK.local_APIdatas]).then(localItems => {
        updateAPICacheCounterWithDatas(localItems.local_APIdatas || {});
    });

    (() => {
        const urlParams = new URLSearchParams(location.search)
        const elementToHightlight = urlParams.get('el');

        if (elementToHightlight) hightlightElement(elementToHightlight);
    })();

    /** @param {string | HTMLElement} element */
    function hightlightElement(element) {
        if (typeof element == 'string') element = document.getElementById(element);
        if (!element) return utils.devLog('trying to highlight an element that don\'t exist.', element);

        const parents = $(element).parents('#contents .content');
        const parent = parents[0];

        if (!parent) return utils.devLog('trying to highlight an element that don\'t have parent content.', element);

        location.hash = '#' + parent.id;

        flashElement(element, true);
    }

    /** @param {HTMLElement} element */
    function flashElement(element, focus = true) {
        element.classList.remove('flash');
        setTimeout(() => {
            element.classList.add('flash');

            if (focus) element.focus();

            setTimeout(() => {
                element.classList.remove('flash');
            }, 1000);

        }, 100);
    }

    /** @param {HTMLElement} element */
    function moveElement(element, focus = false) {
        element.classList.remove('move');
        setTimeout(() => {
            element.classList.add('move');

            if (focus) element.focus();

            setTimeout(() => {
                element.classList.remove('move');
            }, 1000);

        }, 100);
    }

    function requireAPI() {
        const hasAPI = items.enabledAPI && items.apiKey;
        const apiRequiredElements = document.querySelectorAll('.api-required');

        if (hasAPI) {
            apiRequiredElements.forEach(el => {
                el.classList.remove('no-api');
            });
        } else {
            apiRequiredElements.forEach(el => {
                el.classList.add('no-api');
            });
        }
    }

    function defaultSettings(ev) {
        resetSettingOptionsModal.showModalPromise({
            onShow: (dialog) => {
                dialog.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = true);
            }
        }).then(() => {
            passwordModal.requestPassword({ removeKeepUnlockedCheckbox: true }).then(() => {

                if (!confirm(utils.i18n('OptionDefaultSettingsPrompt'))) return;

                const dialog = document.querySelector('#reset_options_dialog');
                // the storage will be set back to the values of this object.
                const customDefaultSettings = structuredClone(STORAGE_ITEMS.local);

                // excluding some keys.
                delete customDefaultSettings.extensionEnabled;
                delete customDefaultSettings.extensionEnableDate;
                delete customDefaultSettings.extensionEnableLastSliderValue;
                delete customDefaultSettings.harderToDisable;
                delete customDefaultSettings.harderToDisableAmount;
                delete customDefaultSettings.firstTime;
                delete customDefaultSettings.extensionInstallDate;
                delete customDefaultSettings.donationRemindDate;
                delete customDefaultSettings.donationSelectedTime;
                delete customDefaultSettings.donationShouldNeverRemind;
                
                if (!dialog.querySelector('#reset_block_count').checked) {
                    delete customDefaultSettings.totalBlocks;
                    delete customDefaultSettings.local_blockedContents;
                }
                if (!dialog.querySelector('#reset_general').checked) {
                    // exclude general options
                    Object.keys(LOCAL_GENERAL_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });
                }
                if (!dialog.querySelector('#reset_videos').checked) {
                    // exclude videos options
                    Object.keys(LOCAL_VIDEO_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });
                }
                if (!dialog.querySelector('#reset_api').checked) {
                    // exclude api options
                    Object.keys(LOCAL_API_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });
                }
                if (!dialog.querySelector('#reset_channels').checked) {
                    // exclude channels options
                    Object.keys(LOCAL_CHANNEL_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });
                }
                if (!dialog.querySelector('#reset_password').checked) {
                    // exclude password options
                    Object.keys(LOCAL_PASSWORD_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });
                }
                if (!dialog.querySelector('#reset_comments').checked) {
                    // exclude comment options
                    Object.keys(LOCAL_COMMENT_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });
                }
                if (!dialog.querySelector('#reset_posts').checked) {
                    // exclude post options
                    Object.keys(LOCAL_POST_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });
                }
                if (!dialog.querySelector('#reset_overlays').checked) {
                    // exclude overlay options
                    Object.keys(LOCAL_OVERLAY_DEFAULT_ITEMS).forEach(k => {
                        delete customDefaultSettings[k];
                    });

                    // technically "remove watch anyway" is part of videos options, 
                    // but I feel like people who exclude overlay settings will want to exclude this too.
                    delete customDefaultSettings.removeWatchAnyway;
                }
    
                SM.set(customDefaultSettings).then(() => {
                    SM.get().then(clearedItems => {
                        updateStorage(clearedItems);
                        setCounter(lastLocalBlockedContents);
    
                        alert(utils.i18n('OptionDefaultSettingsSuccess'));
                    });
                });
                
            }).catch(err => {
                console.log('password modal: reset settings back to default.', err);
            });

        }).catch(err => {
            console.log('default settings modal.', err);
        });
    }

    function importSettings(ev) {
        const reader = new FileReader();

        reader.onload = function (event) {
            let itemsToImport = {};
            let fileText = event.target.result;

            try {
                itemsToImport = JSON.parse(Base64.decode(fileText));

            } catch (err) {
                alert(`${utils.i18n('SomethingWentWrong')}\n${err}`);
                console.log('Error parsing json of file imported:\n', err);
                return;
            }

            let clearSync = false;
            if (!itemsToImport.storageVersion || itemsToImport.storageVersion <= 4) {
                itemsToImport = StorageMigration.ConvertStorageV3toV4(itemsToImport);
                clearSync = true;
            }

            if (!confirm(utils.i18n('OptionImportSettingsPrompt'))) return;

            SM.set(itemsToImport).then(() => {

                if (clearSync) chrome.storage.sync.clear();

                SM.get().then(newItems => {

                    updateStorage(newItems);
                    setCounter(lastLocalBlockedContents);

                    alert(utils.i18n('OptionImportSettingsSuccess'));
                    console.log('settings imported!', itemsToImport);
                });

            }).catch(err => {
                alert(`${utils.i18n('SomethingWentWrong')}\n${err}`);
                console.log('Error saving imported settings', err, itemsToImport);
            });
        }

        reader.readAsText(ev.target.files[0]);
    }

    function exportSettings(ev) {
        let itemsToExport = structuredClone(items);

        // exclude some keys that don't make sense to export.
        delete itemsToExport.extensionEnabled;
        delete itemsToExport.extensionEnableDate;
        delete itemsToExport.extensionEnableLastSliderValue;
        delete itemsToExport.extensionInstallDate;
        delete itemsToExport.donationRemindDate;
        delete itemsToExport.donationSelectedTime;
        delete itemsToExport.donationShouldNeverRemind;

        SM.get([SMK.local_blockedContents]).then(localItems => {

            // Updating total block count.
            for (const contentType in localItems.local_blockedContents) {
                itemsToExport.totalBlocks[contentType] = Object.keys(localItems.local_blockedContents[contentType]).length;
            }

            chrome.permissions.request({
                permissions: ['downloads']
            }, (granted) => {

                if (!granted) return;

                const jsonStr = JSON.stringify(itemsToExport);
                const encodedStr = Base64.encode(jsonStr);

                const blob = new Blob([encodedStr], { type: "text/vby;charset=UTF-8" });

                const url = URL.createObjectURL(blob);
                const filename = `videoblocker_${Date.now()}.vby`;

                chrome.downloads.download({ url, filename });
            });

        });
    }

    /** @param {STORAGE_ITEMS['local']} newItems */
    function updateStorage(newItems) {
        if (newItems) {
            items = newItems;
            optionsHandler.updateStorage(items);
        }

        optionsHandler.fields.forEach(field => {
            if (typeof items[field.storageKey] !== 'undefined') {
                field.setValue(items[field.storageKey]);
            }
        });

        loadCategoryButtonsFromItems();
        loadPasswordConfig();
        setCounter(lastLocalBlockedContents);
        pageFeaturesController.checkOptionsControls();
        onFieldChange();
        requireAPI();
    }

    function updateAPICacheCounterWithDatas(apiDatas) {
        apiCacheCount.textContent = Object.keys(apiDatas).length;
    }

    function handlePasswordConfig() {
        const setPasswordArea = document.querySelector('#set_password_area');
        const changePasswordArea = document.querySelector('#change_password_area');

        const setPasswordInput = document.querySelector('#set_password_input');
        const setConfirmPasswordInput = document.querySelector('#set_confirm_password_input');
        const setPasswordButton = document.querySelector('#set_password_button');
        const unmatchedPasswordMsgElement = document.querySelector('#unmatched_password_message');

        const removePasswordButton = document.querySelector('#remove_password_button');

        const changeOldPasswordInput = document.querySelector('#change_password_old');
        const changeNewPasswordInput = document.querySelector('#change_password_new');
        const changeConfirmNewPasswordInput = document.querySelector('#change_password_confirm_new');

        const invalidOldPasswordMessage = document.querySelector('#invalid_old_password_msg');
        const invalidNewPasswordMessage = document.querySelector('#invalid_new_password');

        const updatePasswordButton = document.querySelector('#update_password_button');

        const updatePasswordAreas = () => {
            if (items.password) {
                changePasswordArea.classList.remove('hidden');
                setPasswordArea.classList.add('hidden');
            } else {
                changePasswordArea.classList.add('hidden');
                setPasswordArea.classList.remove('hidden');
            }

            setPasswordInput.value = '';
            setConfirmPasswordInput.value = '';
            changeOldPasswordInput.value = '';
            changeNewPasswordInput.value = '';
            changeConfirmNewPasswordInput.value = '';
        }

        updatePasswordAreas();

        // hide unmatched message when user type in some input
        setPasswordInput.addEventListener('input', e => { unmatchedPasswordMsgElement.classList.add('hidden') });
        setConfirmPasswordInput.addEventListener('input', e => { unmatchedPasswordMsgElement.classList.add('hidden') });

        setPasswordInput.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            setConfirmPasswordInput.focus();
        });

        setConfirmPasswordInput.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            setPasswordButton.click();
        });

        changeOldPasswordInput.addEventListener('input', e => { invalidOldPasswordMessage.classList.add('hidden') });
        changeOldPasswordInput.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            changeNewPasswordInput.focus();
        });

        changeNewPasswordInput.addEventListener('input', e => { invalidNewPasswordMessage.classList.add('hidden') });
        changeNewPasswordInput.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            changeConfirmNewPasswordInput.focus();
        });

        changeConfirmNewPasswordInput.addEventListener('input', e => { invalidNewPasswordMessage.classList.add('hidden') });
        changeConfirmNewPasswordInput.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            updatePasswordButton.click();
        });

        setPasswordButton.addEventListener('click', e => {
            if (items.password) return console.warn('Set password button was clicked even thought it was already setted.');

            const password = setPasswordInput.value.trim();
            const confirmPassword = setConfirmPasswordInput.value.trim();

            if (!password) {
                unmatchedPasswordMsgElement.textContent = utils.i18n('PasswordInvalidEmpty');
                return unmatchedPasswordMsgElement.classList.remove('hidden');
            }

            if (password !== confirmPassword) {
                unmatchedPasswordMsgElement.textContent = utils.i18n('PasswordInvalidMatch');
                return unmatchedPasswordMsgElement.classList.remove('hidden');
            }

            confirmPasswordModal.showModalPromise({
                onShow: () => {
                    confirmPasswordModal.dialog.querySelector('#confirmation_checkbox').checked = false;
                    confirmPasswordModal.dialog.querySelector('button#cancel').focus();
                    pageFeaturesController.checkOptionsControls();
                }
            }).then(() => {
                SM.set({ password }).then(() => {
                    console.log('Password set!');
                    alert(utils.i18n('SetPasswordSuccess'));
                }).catch(err => {
                    console.error('could not set password:', err);
                    alert(utils.i18n('SomethingWentWrong'));
                });
            }).catch(err => {
                console.log('password confirmation cancelled:', err);
            });

        });

        removePasswordButton.addEventListener('click', e => {

            passwordModal.requestPassword({ removeKeepUnlockedCheckbox: true }).then(() => {
                if (!confirm(utils.i18n('RemovePasswordConfirmation'))) return;

                SM.set({ password: '' }).then(() => {
                    console.log('password removed!');
                    alert(utils.i18n('RemovePasswordSuccess'));
                }).catch(err => {
                    console.error('could not remove password:', err);
                    alert(utils.i18n('SomethingWentWrong'));
                });
            }).catch(err => {
                console.log('request password cancelled:', err);
            });
        });

        updatePasswordButton.addEventListener('click', e => {
            const oldPassword = changeOldPasswordInput.value.trim();

            if (oldPassword !== items.password) {
                invalidOldPasswordMessage.textContent = utils.i18n('InvalidPassword');
                return invalidOldPasswordMessage.classList.remove('hidden');
            }

            const newPassword = changeNewPasswordInput.value.trim();
            const newPasswordConfirmation = changeConfirmNewPasswordInput.value.trim();

            if (!newPassword) {
                invalidNewPasswordMessage.textContent = utils.i18n('PasswordInvalidEmpty');
                return invalidNewPasswordMessage.classList.remove('hidden');
            }

            if (newPassword !== newPasswordConfirmation) {
                invalidNewPasswordMessage.textContent = utils.i18n('PasswordInvalidMatch');
                return invalidNewPasswordMessage.classList.remove('hidden');
            }

            confirmPasswordModal.showModalPromise({
                onShow: () => {
                    confirmPasswordModal.dialog.querySelector('#confirmation_checkbox').checked = false;
                    confirmPasswordModal.dialog.querySelector('button#cancel').focus();
                    pageFeaturesController.checkOptionsControls();
                }
            }).then(() => {
                SM.set({ password: newPassword }).then(() => {
                    console.log('new password set!');
                    alert(utils.i18n('UpdatePasswordSucess'));

                }).catch(err => {
                    console.log('could not save new password:', err);
                    alert('SomethingWentWrong');
                });
            }).catch(err => {
                console.log('password confirmation cancelled:', err);
            });

        });

        const {
            customUnlockTimeContainer,
            keepUnlockedCheckbox,
            unlockCustomHoursInput,
            unlockCustomMinutesInput,
            unlockSelectElement
        } = passwordConfigElements;

        loadPasswordConfig();

        const updateCustomTimeContainerVisibility = () => {
            if (unlockSelectElement.value === 'custom') {
                customUnlockTimeContainer.classList.remove('hidden');
            } else {
                customUnlockTimeContainer.classList.add('hidden');
            }
        }

        updateCustomTimeContainerVisibility();

        unlockSelectElement.addEventListener('change', e => {
            updateCustomTimeContainerVisibility();
            onFieldChange();
        });

        keepUnlockedCheckbox.addEventListener('change', e => { onFieldChange(); });
        unlockCustomHoursInput.addEventListener('input', e => { onFieldChange(); });
        unlockCustomMinutesInput.addEventListener('input', e => { onFieldChange(); });

        SM.onChange({
            watchKeys: {
                password: value => {
                    items.password = value;
                    passwordModal.setPassword(value);
                    updatePasswordAreas();
                }
            }
        });
    }

    function hasPasswordConfigChanged() {
        const {
            keepUnlockedCheckbox,
            unlockCustomHoursInput,
            unlockCustomMinutesInput,
            unlockSelectElement
        } = passwordConfigElements;

        if (items.passwordConfig.keepUnlockedEnabled !== keepUnlockedCheckbox.checked) return true;
        if (unlockSelectElement.value === 'custom') {
            if (!items.passwordConfig.unlockCustomTimeEnabled) return true;
        } else {
            if (items.passwordConfig.unlockTime !== parseInt(unlockSelectElement.value) || items.passwordConfig.unlockCustomTimeEnabled) return true;
        }

        if (items.passwordConfig.unlockCustomHours !== parseInt(unlockCustomHoursInput.value)) return true;
        if (items.passwordConfig.unlockCustomMinutes !== parseInt(unlockCustomMinutesInput.value)) return true;

        return false;
    }

    function loadPasswordConfig() {
        const {
            keepUnlockedCheckbox,
            unlockCustomHoursInput,
            unlockCustomMinutesInput,
            unlockSelectElement
        } = passwordConfigElements;

        keepUnlockedCheckbox.checked = items.passwordConfig.keepUnlockedEnabled;

        unlockSelectElement.value = items.passwordConfig.unlockCustomTimeEnabled ? 'custom' : items.passwordConfig.unlockTime.toString();

        unlockCustomHoursInput.value = items.passwordConfig.unlockCustomHours.toString();
        unlockCustomMinutesInput.value = items.passwordConfig.unlockCustomMinutes.toString();
    }

    function handleHardToDisable() {
        const hardButtonToDisable = document.querySelector('#hard_to_disable_button');
        hardButtonToDisable.addEventListener('click', hardToDisableOnClick);

        updateHardToDisableElements();
    }

    function updateHardToDisableElements(resetAmount = false) {
        const hardButtonToDisable = document.querySelector('#hard_to_disable_button');
        const hardToDisableContainer = document.querySelector('#hard_disable_container');
        const hardToDisableInputs = hardToDisableContainer.querySelectorAll('input');

        if (resetAmount) hardToDisableRemainingAmount = items.harderToDisableAmount;

        if (items.harderToDisable && items.extensionEnabled && hardToDisableRemainingAmount > 0) {
            hardToDisableButtonUpdateText();
            hardButtonToDisable.classList.remove('hidden');
            hardToDisableContainer.classList.add('disabled');
            hardToDisableInputs.forEach(el => el.setAttribute('disabled', ''));
        } else {
            hardButtonToDisable.classList.add('hidden');
            hardToDisableContainer.classList.remove('disabled');
            hardToDisableInputs.forEach(el => el.removeAttribute('disabled'));
        }    
    }

    /** @param {MouseEvent} e */
    function hardToDisableOnClick(e) {
        hardToDisableRemainingAmount--;

        if (hardToDisableRemainingAmount <= 0) {
            return updateHardToDisableElements();
        }

        hardToDisableButtonUpdateText();
    }

    function hardToDisableButtonUpdateText() {
        const hardButtonToDisable = document.querySelector('#hard_to_disable_button');
        hardButtonToDisable.textContent = utils.i18nFormat('HardToDisableButtonOption', hardToDisableRemainingAmount);
    }

    function handleDonationModal() {
        const donationDialog = document.querySelector('#donation_reminder');
        const donationReminderModal = new Modal(donationDialog);

        const shouldBeReminded = () => {
            if (!items.extensionInstallDate) return false;
            if (items.donationShouldNeverRemind) return false;
            if (items.donationRemindDate && Date.now() > items.donationRemindDate) return true;
            if (!items.donationRemindDate && Date.now() > items.extensionInstallDate + utils.daysToMs(30)) return true;
            return false;
        }

        // set in how many time from now on should be reminded to donate again. (set 0 to disable the reminder)
        const setDonationReminder = (timeMs) => {
            const donationRemindDate = Date.now() + timeMs;

            SM.set({ 
                donationSelectedTime: timeMs, 
                donationRemindDate,
                donationShouldNeverRemind: timeMs === 0,
            }).then(() => {
                if (timeMs === 0) return console.log(`donation reminder disabled`);
                console.log(`donation reminder set to ${new Date(donationRemindDate)}`, donationRemindDate);
            });
        }

        // validate remind time radios
        donationDialog.querySelectorAll('input[type="radio"][name="remind_time"]').forEach(radio => {
            const time = parseInt(radio.value);
            if (isNaN(time)) console.warn('donation remind radio has no value that correspond to hours', radio);
        });

        if (shouldBeReminded()) {
            // if passed one month since the extension been installed or if current date surpassed the remind time.

            donationReminderModal.showModal({ onClose: (dialog) => {

                // otherwise set the remind to the the ones specified in the checked radio.
                const checkedRadio = donationDialog.querySelector('input[type="radio"][name="remind_time"]:checked');
                const hours = parseInt(checkedRadio.value);

                if (hours === 0) {
                    // user opted to never be reminded again.
                    setDonationReminder(0);
                    return;
                }

                if (isNaN(hours)) return console.warn('donation remind radio has no value that correspond to hours', checkedRadio);

                setDonationReminder(utils.hoursToMs(hours));
            }});
        }
    }
});

let darkMode = true;
let darkModeItem = window.localStorage.getItem('dark-mode');
setDarkMode(!darkModeItem || darkModeItem == 'true');

document.querySelector('#theme_toggle').onclick = ev => {
    setDarkMode(!darkMode, true);
}

function setDarkMode(enabled, saveIt = false) {
    if (enabled) {
        darkMode = true;
        document.documentElement.classList.add('dark');
    } else {
        darkMode = false;
        document.documentElement.classList.remove('dark');
    }

    if (!saveIt) return;
    window.localStorage.setItem('dark-mode', darkMode);
}