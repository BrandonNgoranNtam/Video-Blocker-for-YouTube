// Class used for matching text to blocked keywords.

/**
 * @typedef {Object} KeywordArrayOptions
 * @property {','} [separator]
 * @property {true} [separateNewLines]
 * @property {true} [trim]
 * @property {true} [ignoreEmpty]
 * @property {false} [disableRegex]
 * @property {KeywordModifier[]} [modifiers]
 */

/**
 * @typedef {Object} KeywordModifier
 * @property {string} name
 * @property {string[]} aliases
 * @property {boolean} negative
 * @property {boolean} optionChanger
 * @property {(info: AnyYoutubeContentInfo, value: string, options: MatchOptions, negative: boolean ) => boolean} check
 */

/**
 * @typedef {Object} KeywordValue
 * @property {string} [str]
 * @property {RegExp} [regex]
 * @property {RegExp} [wordBoundRegex] - `str` but as a regex with word boundary. ex: `/\bfoo\b/i`
 * @property {RegExp} [wordBoundRegexSensitive] - `str` but as a regex with a case sensitive word boundary. ex: `/\bfoo\b/`
 * @property {boolean} negative - means the opposite, content must not match this keyword.
 * @property {boolean} invalid - something wrong when converting str to regex.
 * @property {Array<KeywordModifier & {value: string}>} modifiers
 */

/**
 * @typedef {Object} Keyword
 * @property {string} str
 * @property {KeywordValue[]} keywords
 */

/**
 * @typedef {Object} MatchOptions
 * @property {false} caseSensitive
 * @property {false} exactMatch
 * @property {false} wordBoundary
 * @property {(texts: string[], kw: KeywordValue) => string} customMatch - This will overwrite the default match
 */

class Matcher {

    /** @param {string} str @param {KeywordArrayOptions} options */
    convertToKeywordArray(str, options = {}) {

        options = _.merge({
            separator: ',',
            separateNewLines: true,
            trim: true,
            ignoreEmpty: true,
            disableRegex: false,
            modifiers: []
        }, options);

        const modifiersObj = {};

        options.modifiers.forEach(mod => {

            modifiersObj[mod.name] = mod;
            mod.aliases.forEach(al => {
                modifiersObj[al] = mod;
            });

        })

        // Separating str to an array of keyword strings. 

        const separators = [];
        if (options.separator) separators.push(options.separator);
        if (options.separateNewLines) separators.push('\n');

        const regex = new RegExp(`(?<!\\\\)[${separators.join('')}]`, 'g');
        const escapedRegex = new RegExp(`\\\\([${separators.join('')}])`, 'g');

        let keywords = str.split(regex);

        // Trimming the keywords.
        if (options.trim) keywords = keywords.map(kw => kw.trim());
        // Unescaping the escaped separators.
        if (str.match(escapedRegex)) keywords = keywords.map(kw => kw.replace(escapedRegex, '$1'));

        // Converting array of keyword string to an array of keyword objects.

        keywords = keywords.map(kw => {
            /** @type {Keyword} */
            const out = {
                str: kw,
                keywords: []
            };

            // Spliting the keyword into multiple keywords using the $& (AND) operator.
            let keywords = kw.split(/(?<!\\)\$&/g);
            // Unescaping the escaped operators.
            if (kw.match(/\\\$&/)) keywords = keywords.map(kw => kw.replace(/\\\$&/g, '$&'));

            keywords = keywords.map(kw => {
                /** @type {KeywordValue} */
                const out = {
                    str: '',
                    regex: null,
                    wordBoundRegexSensitive: null,
                    wordBoundRegex: null,
                    negative: false,
                    invalid: false,
                    modifiers: []
                };

                while (true) {
                    /** ${...} and the start or end of a string. */
                    const modifierRegex = /(?:^\s*\${([^}]*)}|\${([^}]*)}\s*$)/;
                    const match = kw.match(modifierRegex);
                    if (!match) break;

                    kw = kw.replace(modifierRegex, '');

                    const modifierStr = match[1] || match[2];
                    const modiferMatch = modifierStr.match(/^\s*([^:]+)\s*(?::\s*(.+)\s*)?$/);

                    if (!modiferMatch) continue;

                    let modifierName = modiferMatch[1];
                    const modifierValue = modiferMatch[2] || '';

                    const negative = modifierName.startsWith('!');
                    if (negative) {
                        modifierName = modifierName.replace('!', '');
                    }

                    const modifier = modifiersObj[modifierName.toLowerCase().trim()];
                    if (!modifier) continue;

                    modifier.value = modifierValue;
                    modifier.negative = negative;

                    out.modifiers.push(modifier);
                }

                // Checking if the keyword is negative. ex: !foo
                const negativeReg = /(?<=^\s*)(\\?)!/; // group 1: escaped?
                const negativeMatch = kw.match(negativeReg);
                if (negativeMatch) {
                    if (negativeMatch[1]) {
                        // Escaped negative, removing backslash. ex: \!foo
                        kw = kw.replace(negativeReg, '!');
                    } else {
                        out.negative = true;
                        kw = kw.replace(negativeReg, '');
                    }
                }

                const regexMatch = /^\/(.*)\/([a-z]*)?$/;
                const m = kw.trim().match(regexMatch);

                if (m && !options.disableRegex) {
                    try {
                        const reg = new RegExp(m[1], m[2] || '');
                        out.regex = reg;
                    } catch(err) {
                        out.invalid = true;
                    }
                } else {
                    if (options.trim) kw = kw.trim();

                    out.str = kw; // foo
                    out.wordBoundRegex = new RegExp(`\\b${utils.escapeRegExp(kw)}\\b`, 'i'); // /\bfoo\b/
                    out.wordBoundRegexSensitive = new RegExp(`\\b${utils.escapeRegExp(kw)}\\b`); // /\bfoo\b/
                }

                return out;
            });

            out.keywords = keywords;

            return out;
        });

        if (options.ignoreEmpty) {

            keywords = keywords.filter(kw => {
                if (!kw.str) return false;
                if (kw.keywords.some(kw => kw.invalid || (!kw.str && !kw.regex))) return false;

                return true;
            });
        }

        return keywords;
    }

    /** 
     * @param {string[]} texts 
     * @param {AnyYoutubeContent} content 
     * @param {Keyword[]} keywords 
     * @param {MatchOptions} options 
     * */
    match(texts, content, keywords, options = {}) {
        if (!Array.isArray(texts)) texts = [texts];

        options = _.merge({
            caseSensitive: false,
            exactMatch: false,
            wordBoundary: false,
            customMatch: null
        }, options);

        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            
            const matched = keyword.keywords.every(kw => {

                if (options.customMatch) {
                    return options.customMatch(texts, kw);
                }

                let _options = {...options};
                for (let mod of kw.modifiers) {
                    const result = mod.check(content, mod.value, _options, mod.negative);
                    if (mod.optionChanger) continue;

                    if ((mod.negative && result) || (!mod.negative && !result)) return false;
                }

                let matched = false;
                
                if (kw.regex) {
                    matched = texts.some(text => kw.regex.test(text));
                } else {
                    matched = texts.some(text => {
                        if (_options.wordBoundary) {
                            const wordBoundReg = _options.caseSensitive ? kw.wordBoundRegexSensitive : kw.wordBoundRegex;
                            return wordBoundReg.test(text);
                        } else {
                            let search = kw.str;

                            if (!_options.caseSensitive) {
                                search = search.toLowerCase();
                                text = text.toLowerCase();
                            }
    
                            if (_options.exactMatch) return text == search;
                            return text.includes(search);
                        }
                    });
                }

                return kw.negative ? !matched : matched;
                
            });

            if (matched) return keyword.str;
        }

        return '';
    }

}

const matcher = new Matcher();