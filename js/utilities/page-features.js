// Add quality life stuff for html pages.

/** 
 * @typedef {Object} PageFeaturesOptions 
 * @property {HTMLElement} [themeButton] - by clicking this button will toggle the `dark` class from html element.
 * @property {boolean} [passwordTogglers] (true) -
 * elements with `password-toggle` attribute can toggle the visibility of password inputs, 
 * you can specify the id of the password input in the button using the `password-toggle` attribute, otherwise it will use the password input that is the previous sibling.
 * @property {boolean} [optionControls] (true) -
 * checkboxes elements with `option-control` attribute will hide or disable other elements whether is checked or not. \
 * add one of the following attributes below to the elements you want to control and as values set the id of the checkbox that will control them. \
 * `hide-when-option-checked`, `hide-when-option-unchecked`, `disable-when-option-checked`, `disable-when-option-unchecked`
 * @property {boolean} [saveTextAreaSizes] (false) - this will save the size of textareas that has the `save-size` attribute in the localStorage and it will be restored when opening the page again.
 * @property {boolean} [optionsLinks] (false) - links that have the attribute `option-href` will open the options page with the parameters gave in the attribute.
 * */

/** @param {PageFeaturesOptions} options */
const pageFeatures = (options = {}) => {
    /** @type {PageFeaturesOptions} */
    const defaultOptions = {
        passwordTogglers: true,
        optionControls: true,
        saveTextAreaSizes: false,
        optionsLinks: false
    }
    options = Object.assign(defaultOptions, options);

    const setThemeButton = (themeButton) => {
        if (!themeButton) return console.warn('button from setThemeButton does not exist');
        const html = document.querySelector('html');

        const updateAriaAttr = () => { themeButton.setAttribute('aria-checked', html.classList.contains('dark').toString()); }
        updateAriaAttr();

        themeButton.addEventListener('click', e => {
            html.classList.toggle('dark');
            updateAriaAttr();
        });
    }

    if (options.themeButton) setThemeButton(options.themeButton);

    const setPasswordTogglers = () => {
        const passwordButtons = document.querySelectorAll('[password-toggle]');
        if (!passwordButtons.length) return;

        passwordButtons.forEach(button => {
            /** @type {HTMLInputElement | undefined} */
            let passwordInput;

            const passwordInputId = button.getAttribute('password-toggle');
            if (passwordInputId) {
                passwordInput = document.getElementById(passwordInputId);
            }
            if (!passwordInput) {
                passwordInput = button.previousElementSibling;
            }

            if (!passwordInput) return console.warn('could not get the password input for the toggle button', button);
            if (!passwordInput.matches('input[type="text"], input[type="password"]')) return console.warn('password toggle button got an element that is not a input text or input password', button);

            const updateIcon = (passwordIsHidden) => {
                // update the "eye" icon from the button if has one.
                const icon = button.querySelector('i.fa.fa-eye, i.fa.fa-eye-slash');
                if (!icon) return;
                
                if (passwordIsHidden) {
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                } else {
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                }
            }

            button.addEventListener('click', e => {
                if (passwordInput.type == 'password') {
                    passwordInput.type = 'text';
                    button.setAttribute('aria-checked', 'true');
                    updateIcon(false);
                } else if (passwordInput.type == 'text') {
                    passwordInput.type = 'password';
                    button.setAttribute('aria-checked', 'false');
                    updateIcon(true);
                }
            });
        })
    }

    if (options.passwordTogglers) setPasswordTogglers();

    /** @type {Array<() => void>} */
    const optionsControlCheckers = [];
    const checkOptionsControls = () => {
        optionsControlCheckers.forEach(check => check());
    }

    /** @param {HTMLElement | HTMLElement[]} controlElements */
    const setOptionsControls = (controlElements) => {
        if (!Array.isArray(controlElements)) controlElements = [controlElements];
        
        controlElements.forEach(controlEl => {
            if (!controlEl.id) return console.warn('option control has no id', controlEl);
            if (!controlEl.matches('input[type="checkbox"], input[type="radio"]')) return console.warn('option control must be a input from type "checkbox" or "radio"', controlEl);
            if (controlEl.hasAttribute('option-control-set')) return console.warn('option control was already setted', controlEl);

            controlEl.setAttribute('option-control-set', '');

            const checkState = () => {
                const elementsToHide = document.querySelectorAll([
                    `[hide-when-option-checked="${controlEl.id}"]`,
                    `[hide-when-option-unchecked="${controlEl.id}"]`,
                ].join(', '));
    
                const elementsToDisable = document.querySelectorAll([
                    `[disable-when-option-checked="${controlEl.id}"]`,
                    `[disable-when-option-unchecked="${controlEl.id}"]`,
                ].join(', '));

                if (controlEl.checked) {
                    elementsToHide.forEach(element => {
                        if (element.hasAttribute('hide-when-option-checked')) {
                            element.classList.add('hidden');
                        } else {
                            element.classList.remove('hidden');
                        }
                    });

                    elementsToDisable.forEach(element => {
                        if (element.hasAttribute('disable-when-option-checked')) {
                            element.setAttribute('disabled', '');
                            element.setAttribute('aria-disabled', 'true');

                            element.querySelectorAll('input').forEach(input => {
                                input.setAttribute('disabled', '');
                                input.setAttribute('aria-disabled', 'true');
                            });
                        } else {
                            element.removeAttribute('disabled');
                            element.removeAttribute('aria-disabled');

                            element.querySelectorAll('input').forEach(input => {
                                input.removeAttribute('disabled');
                                input.removeAttribute('aria-disabled');
                            });
                        }
                    });
                } else {
                    elementsToHide.forEach(element => {
                        if (element.hasAttribute('hide-when-option-checked')) {
                            element.classList.remove('hidden');
                        } else {
                            element.classList.add('hidden');
                        }
                    });

                    elementsToDisable.forEach(element => {
                        if (element.hasAttribute('disable-when-option-checked')) {
                            element.removeAttribute('disabled');
                            element.removeAttribute('aria-disabled');

                            element.querySelectorAll('input').forEach(input => {
                                input.removeAttribute('disabled');
                                input.removeAttribute('aria-disabled');
                            });
                        } else {
                            element.setAttribute('disabled', '');
                            element.setAttribute('aria-disabled', 'true');

                            element.querySelectorAll('input').forEach(input => {
                                input.setAttribute('disabled', '');
                                input.setAttribute('aria-disabled', 'true');
                            });
                        }
                    });
                }
            }

            controlEl.addEventListener('input', e => {
                checkState();
            });

            optionsControlCheckers.push(checkState);
            checkState();
        });
    }

    if (options.optionControls) setOptionsControls([...document.querySelectorAll('[option-control]')]);

    const handleTextAreaSizeSaving = () => {
        const textareas = document.querySelectorAll('textarea[save-size]');

        /** @type { { [textAreaId: string]: [number, number] } } */
        let textareasSizes = localStorage.getItem('textareas');
        if (!textareasSizes) {
            textareasSizes = {};
        } else {
            textareasSizes = JSON.parse(textareasSizes);
        }

        const saveTextArea = (ta, w, h) => {
            textareasSizes[ta.id] = [w, h];

            localStorage.setItem('textareas', JSON.stringify(textareasSizes));
        }

        const isOutOfBound = (x, w) => {
            return x + w > window.innerWidth;
        }

        const outOfBoundOffset = 30;

        textareas.forEach(textarea => {
            if (!textarea.id) return console.warn('to save size of text area it must have an id', textarea);

            if (textareasSizes[textarea.id]) {
                let w = textareasSizes[textarea.id][0];
                let h = textareasSizes[textarea.id][1];

                let rect = textarea.getBoundingClientRect();
                if (isOutOfBound(rect.left, w)) {
                    textarea.style.width = (window.innerWidth - rect.left - outOfBoundOffset) + 'px';
                } else {
                    textarea.style.width = w + 'px';
                }

                textarea.style.height = h + 'px';
            }

            let timeout = null;

            const onResize = () => {

                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    let rect = textarea.getBoundingClientRect();

                    if (textareasSizes[textarea.id] && rect.width == textareasSizes[textarea.id][0] && rect.height == textareasSizes[textarea.id][1]) {
                        return;
                    }
                    
                    saveTextArea(textarea, rect.width, rect.height);
                }, 200);
                
            }

            new MutationObserver(onResize).observe(textarea, {
                attributes: true, attributeFilter: [ "style" ]
            });
        });
    }
    if (options.saveTextAreaSizes) handleTextAreaSizeSaving();

    const handleOptionsLinks = () => {
        const linkElements = document.querySelectorAll('a[option-href], a[option-redirect], a[option-section]');
        linkElements.forEach(linkElement => {

            linkElement.addEventListener('click', e => {
                const urlParameters = linkElement.getAttribute('option-href');
                const optionRedirect = linkElement.getAttribute('option-redirect');
                const optionSection = linkElement.getAttribute('option-section');
                
                MM.emitToRuntime(MMK.openOptionsPage, {
                    urlParameters,
                    focusElement: optionRedirect,
                    section: optionSection
                });
            });

        });
    }

    if (options.optionsLinks) handleOptionsLinks();

    return {
        setThemeButton,
        setPasswordTogglers,
        setOptionsControls,
        checkOptionsControls,
        clearSavedTextAreas: () => {
            localStorage.removeItem('textareas');
        }
    }
}