
class YoutubeDropdown {
    constructor() {
        /** @type {YoutubeContent} */
        this.selectedContent = null;

        /** @type { HTMLElement[] } */
        this.dropdowns = [];

        if (!this.dropdownElement) {
            observer.watchElements([
                {
                    elements: ['tp-yt-iron-dropdown'],
                    elementAttributes: 'style',
                    onElement: (element, attr) => {
                        if (attr) {
                            const isHidden = element.style.display == 'none';
                            const hasAttr = element.hasAttribute(EL_ATTRIBUTES.dropdownHidden);
                            if (!isHidden && hasAttr) {
                                this.onDropdownVisible(element);
                            } else if (isHidden && !hasAttr) {
                                this.onDropdownHidden(element);
                            }
                            return;
                        }

                        this.addDropdown(element);
                    }
                }
            ])
        }
    }

    /** @param {HTMLElement} element */
    addDropdown(element) {
        this.dropdowns.push(element);
        element.setAttribute(EL_ATTRIBUTES.dropdownHidden, '');
    }

    /** @param {HTMLElement} element */
    onDropdownVisible(element) {
        element.removeAttribute(EL_ATTRIBUTES.dropdownHidden);
        if (!this.selectedContent) return;

        const items = element.querySelector('#items');
        if (!items) return;

        if (!items.hasAttribute(EL_ATTRIBUTES.dropdownItems)) {
            items.setAttribute(EL_ATTRIBUTES.dropdownItems, '');

            observer.observeElement(items, () => {
                if (element.hasAttribute(EL_ATTRIBUTES.dropdownHidden)) return;

                this.addButtonsToDropdown(element);
            }, { childList: true });
        }

        this.addButtonsToDropdown(element);
    } 

    /** @param {HTMLElement} element */
    onDropdownHidden(element) {
        element.setAttribute(EL_ATTRIBUTES.dropdownHidden, '');

        this.removeButtonsFromDropdown(element);
    }

    /** @param {HTMLElement} dropdownElement */
    addButtonsToDropdown(dropdownElement) {

        let blockContentButton = dropdownElement.querySelector('#block_content');
        let blockChannelButton = dropdownElement.querySelector('#block_channel');

        if (blockChannelButton || blockChannelButton) return;

        const items = dropdownElement.querySelector('#items');
        if (!items) return utils.devLogWarn('dropdown has no #items');

        const content = this.selectedContent;

        const createButton = (label, id, clickCallback) => {
            const button = document.createElement('button');
            button.className = EL_CLASSES.dropdownButton;
            button.id = id;
            button.innerHTML = /*html*/`
                <img src="${chrome.runtime.getURL('images/icon-128.png')}" alt="YTB icon">
                <span>${label}</span>
            `
            button.addEventListener('click', e => {
                clickCallback(e);
            });

            return button;
        }

        blockContentButton = createButton(utils.i18n('BlockUnblockContent'), 'block_content', e => {
            this.onBlockContentClick(content);
        });

        items.insertAdjacentElement('beforeend', blockContentButton);

        blockChannelButton = createButton(utils.i18n('BlockUnblockChannel'), 'block_channel', e => {
            this.onBlockChannelClick(content);
        });

        items.insertAdjacentElement('beforeend', blockChannelButton);

        dropdownElement.querySelector('ytd-menu-popup-renderer')?.classList.add(EL_CLASSES.dropdownContainer);
    }

    /** @param {HTMLElement} dropdownElement */
    removeButtonsFromDropdown(dropdownElement) {
        let blockContentButton = dropdownElement.querySelector('#block_content');
        let blockChannelButton = dropdownElement.querySelector('#block_channel');

        if (blockContentButton) blockContentButton.remove();
        if (blockChannelButton) blockChannelButton.remove();

        dropdownElement.querySelector('ytd-menu-popup-renderer')?.classList.remove(EL_CLASSES.dropdownContainer);
    }

    /** @param {YoutubeContent} content */
    onBlockContentClick(content) {
        if (!content || !content.info) return alert(utils.i18n('CouldNotBlockContent'));

        /** @type {YoutubeVideoInfo} */
        const video = content.info.isVideo ? content.info : null;

        // TODO: check if is blocked for the correct reason.
        if (content.blocked) {
            MM.emitToRuntime(MMK.unblockContent, {
                contentType: content.getType(),
                contentId: content.info.id,
                isShorts: video && video.isShorts
            });
        } else {
            MM.emitToRuntime(MMK.blockContent, {
                contentType: content.getType(),
                contentId: content.info.id
            });
        }

        document.body.click();
    }

    /** @param {YoutubeContent} content */
    onBlockChannelClick(content) {
        if (!content || !content.info || !content.info.channel) return alert(utils.i18n('CouldNotBlockChannel'));

        if (content.blocked) {
            MM.emitToRuntime(MMK.unblockChannel, {
                contentType: content.getType(),
                channel: content.info.channel
            });
        } else {
            MM.emitToRuntime(MMK.blockChannel, {
                contentType: content.getType(),
                channel: content.info.channel
            });
        }

        document.body.click();
        
    }

    /** @param {YoutubeContent} content */
    setSelectedContent(content) {
        this.selectedContent = content;
    }
}

const dropdown = new YoutubeDropdown();