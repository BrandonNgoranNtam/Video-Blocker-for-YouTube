
class Utils {
    APP_SHORT_NAME = 'YTB';
    /** Whether the extension is in development mode, instead of production */
    IS_DEV = !('update_url' in chrome.runtime.getManifest());

    isYoutubeUrl(url) {
        if (!url) return false;
        
        if (
            url.match(/^https?:\/\/(?:(?:www|m)\.)?youtube\.com(\/|$)/) ||
            url.match(/^https?:\/\/youtube\.be(\/|$)/)
        ) return true;
    
        return false;
    }
    
    devLog(...messages) {
        if (!this.IS_DEV) return;
        console.log(`[${this.APP_SHORT_NAME}]`, ...messages);
    }
    
    devLogWarn(...messages) {
        if (!this.IS_DEV) return;
        console.warn(`[${this.APP_SHORT_NAME} warn]`, ...messages);
    }
    
    devLogError(...messages) {
        if (!this.IS_DEV) return;
        console.error(`[${this.APP_SHORT_NAME} error]`, ...messages);
    }
    
    log(...messages) {
        console.log(`[${this.APP_SHORT_NAME}]`, ...messages);
    }
    
    logWarn(...messages) {
        console.warn(`[${this.APP_SHORT_NAME} warn]`, ...messages);
    }
    
    logError(...messages) {
        console.error(`[${this.APP_SHORT_NAME} error]`, ...messages);
    }

    waitCallback(callback, interval=50, timeout) {
        return new Promise((resolve, reject) => {
            const config = { stop: false };
            const result = callback(config);
            if (result) return resolve(result);
            if (config.stop || !interval) return resolve(result);

            const intervalFunc = setInterval(() => {
                const result = callback(config);
                if (result || config.stop) {
                    clearInterval(intervalFunc);
                    return resolve(result);
                }
            }, interval);

            if (timeout) setTimeout(() => {
                clearInterval(intervalFunc);
                resolve();
            }, timeout)
        });
    }

    watchElementChange(element, callback, childList= true, subtree= true, attributes= false) {
        const observer = new MutationObserver(() => {
            callback();
        });

        observer.observe(element, {
            childList,
            subtree,
            attributes
        })
    }

    /**
     * Credit: https://gist.github.com/Yimiprod/7ee176597fef230d1451
     *
     * Deep diff between two object, using lodash
     * @param  {Object} object Object compared
     * @param  {Object} base   Object to compare with
     * @return {Object}        Return a new object who represent the diff
    */
    difference(object, base) {
        function changes(object, base) {
            return _.transform(object, function(result, value, key) {
                if (!_.isEqual(value, base[key])) {
                    result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
                }
            });
        }
        return changes(object, base);
    }

    dateStrToNumber(dateStr) {
        if (!dateStr) return 0;
        const timestamp = Date.parse(dateStr);
        return timestamp;
    }

    /**
     * Shortcut to chrome.i18n.getMessage
     * @param {string} messageName 
     */
    i18n(messageName) {
        if (!messageName) return '';
        return chrome.i18n.getMessage(messageName);
    }

    /**
     * Replace codes for params. {0} = first parameter, {1} = seconds parameter\
     * Supports plural too, ex: you blocked {0} {^0:video;videos}.
     * @param {string} messageName 
     * @param {any} params
     */
    i18nFormat(messageName, ...params) {
        if (!messageName) return '';
    
        let message = chrome.i18n.getMessage(messageName);
    
        // Replace placeholders with parameters
        for (let i = 0; i < params.length; i++) {
            const regex = new RegExp('\\{' + i + '\\}', 'g');
            message = message.replace(regex, params[i]);
        }
    
        // Handle pluralization
        const pluralRegex = /\{\^(\d+):([^;]+);([^}]+)\}/g;
        message = message.replace(pluralRegex, (match, index, singular, plural) => {
            const number = params[Number(index)];
            return number == 1 ? singular : plural;
        });
    
        return message;
    }

    removeQueriesFromUrl(url) {
        if (!url) return '';
        return url.replace(/\?.+/, '');
    }

    cleanString(str, trim = true, removeInvisibleCharacter = true, removeDoubleSpaces = false) {
        if (!str) return '';
        if (trim) str = str.trim();
        if (removeInvisibleCharacter) str = str.replace(/\u034F/g, '');
        if (removeDoubleSpaces) str = str.replace(/  /g, ' ');
        return str;
    }

    /**
     * Listen for click and hotkeys such as "Enter" and Space.
     */
    onClick(element, callback) {
        $(element).on('click keydown', e => {
            if (e.type !== 'click' && e.key !== 'Enter' && e.key !== ' ') return;
            callback(e);
        });
    }

    secToMs(s) { return s * 1000; }
    minToMs(m) { return m * 60 * 1000; }
    hoursToMs(h) { return h * 60 * 60 * 1000; }
    daysToMs(d) { return d * 24 * 60 * 60 * 1000; }

    msToSec(ms) { return ms / 1000; }
    msToMin(ms) { return ms / 60 / 1000; }
    msToHours(ms) { return ms / 60 / 60 / 1000; }
    msToDays(ms) { return ms / 24 / 60 / 60 / 1000; }
    msToHMS(ms) {
        return new Date(ms).toISOString().slice(11,19)
    }

    escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
}

const utils = new Utils();