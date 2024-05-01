const localizeGetLanguage = function () {
    let lang = chrome.i18n.getMessage('@@ui_locale');
    let hasTranslation = chrome.i18n.getMessage('ThisLanguage') !== lang ? false : true;

    if (!hasTranslation) return 'en';
    return lang;
}

const localizeHtmlPage = function () {
    const prefix = 'data-i18n';
    const attributes = ['', 'placeholder', 'title', 'value', 'innerHTML', 'aria-label', 'alt'];

    for (let at of attributes) {
        let attribute = `${prefix}-${at}`;

        if (!at) attribute = prefix;

        let elements = document.querySelectorAll(`[${attribute}]`);
        for (let element of elements) {

            let messageValue = '';
            let messageName = element.getAttribute(attribute);
            let messageParams = [];

            if (messageName.includes(',')) {
                messageParams = messageName.split(/(?<!\\),/g);
                messageName = messageParams.shift();

                messageParams = messageParams.map(p => {
                    // trim and/or convert to number.
                    p = p.replace('\\,', ',').trim();
                    if (/^\d+$/.test(p)) p = parseInt(p);
                    return p;
                });

                messageValue = utils.i18nFormat(messageName, ...messageParams);
            } else {
                messageValue = utils.i18n(messageName);
            }

            if (!messageValue) {
                console.log(`Message i18n "${messageName}" not found.`, element);
                continue;
            }

            if (at == 'innerHTML') {
                element.innerHTML = messageValue;
            } else if (!at) {
                for (let childNode of element.childNodes) {
                    if (childNode.nodeType === Node.TEXT_NODE) {
                        childNode.nodeValue = messageValue;
                    }
                }
            } else {
                element.setAttribute(at, messageValue);
            }
        }
    }

    // Data urls

    let lang = localizeGetLanguage();
    if (lang == 'en') return;

    let urlElements = document.querySelectorAll('[data-i18n-url]');

    for (let element of urlElements) {
        let attType = element.getAttribute('data-i18n-url');
        if (!attType) {
            console.log('[utilities/localize.js] Element with data-i18n-url without provinding the attribute data-i18n-type', element);
            continue;
        }

        let url = element.getAttribute(attType);
        if (!url) {
            console.log(`[utilities/localize.js] Attribute provided by data-i18n-type ("${attType}"), dont exist on the element`, element);
            continue;
        }

        let newUrl = url.replace(/en\//g, `${lang}/`);

        element.setAttribute(attType, newUrl);
    }
}

localizeHtmlPage();