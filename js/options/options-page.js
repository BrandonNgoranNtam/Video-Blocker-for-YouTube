// Add functionality to the page to things other than storage.

const optionsControls = [];

(() => {
    const sideBarToggle = document.querySelector('#sidebar-toggle');

    donation();
    sidebar();
    handleUrlParams();

    function sidebar() {

        const darkOverlay = document.querySelector('#dark_overlay');
        const sideBar = document.querySelector('#sidebar');

        // Toggle on click.
        const onclick = ev => {
            sideBar.classList.toggle('max-sm:hidden');
        }
        
        sideBarToggle.onclick = onclick;
        darkOverlay.onclick = onclick;
    }

    function donation() {
        const donationElement = document.querySelector('#donation');
        const donationButton = document.querySelector('#donation button');
        
        donationButton.onclick = ev => {
            donationElement.classList.toggle('show');
        }

        // Close by clicking outside.
        document.addEventListener('click', event => {
            if (!donationElement.contains(event.target)) donationElement.classList.remove('show');
        });
    }

    function handleUrlParams() {
        const defaultHash = 'general';
        let lastElementFocused = null;
        let currentHash = '';

        const availableHashes = new Set();
        document.querySelectorAll('#contents > .content').forEach(el => availableHashes.add(el.id));

        const readCurrentUrlParams = () => {
            const urlParams = new URLSearchParams(location.search);

            const elementToFocusQuery = urlParams.get("el") || '';
            let sectionHashId = window.location.hash.substring(1);

            let elementToFocus = null;
            if (elementToFocusQuery) {
                elementToFocus = document.getElementById(elementToFocusQuery);
                if (!elementToFocus) console.log(`could not find element to focus from query "el" with an id of ${elementToFocusQuery}`);
            }

            if (elementToFocus && elementToFocus !== lastElementFocused) {
                // set section to the one that the element to focus is inside.
                const parents = $(elementToFocus).parents('#contents .content');
                const parent = parents[0];

                if (parent) sectionHashId = parent.id;
            }

            if (!sectionHashId) {
                sectionHashId = defaultHash;
            } else if (!availableHashes.has(sectionHashId)) {
                sectionHashId = currentHash || defaultHash;
            }

            const scroolToTop = currentHash !== sectionHashId;

            currentHash = sectionHashId;

            // toggling aria-select from button on the sidebar
            document.querySelectorAll('aside a').forEach(el => {
                if (el.id === sectionHashId) {
                    el.setAttribute('aria-selected', 'true');
                } else {
                    el.removeAttribute('aria-selected');
                }
            });

            // toggling the content sections
            document.querySelectorAll('#contents > .content').forEach(el => {
                if (el.id === sectionHashId) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });

            if (elementToFocus && elementToFocus !== lastElementFocused) {
                lastElementFocused = elementToFocus;

                elementToFocus.focus();
                const elementToHighlight = elementToFocus.parentElement?.tagName === 'LABEL' && elementToFocus.tagName !== 'TEXTAREA' ? elementToFocus.parentElement : elementToFocus;
                
                elementToFocus.scrollIntoView({
                    block: 'center',
                    inline: 'center'
                }); 
                elementToHighlight.classList.add('flash');
                setTimeout(() => {
                    elementToHighlight.classList.remove('flash');
                }, 1000);

            } else if (scroolToTop) {
                window.scrollTo({ top: 0 });
            }
        }

        readCurrentUrlParams();

        window.onhashchange = e => {
            readCurrentUrlParams();
        };

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message === 'is options open') sendResponse(true);
        })

        MM.on(MMK.openOptionsPage, message => {
            if (!message) message = {};
            if (message.newTab) return;

            let urlParameters = '';
            if (message.urlParameters) 
                urlParameters = message.urlParameters;
            else {
                if (message.focusElement) urlParameters += `el=` + message.focusElement;
                if (message.section) urlParameters += `#` + message.section;
            }

            const urlParams = new URLSearchParams(urlParameters.split('#')[0]);
            const elementToFocusQuery = urlParams.get("el") || '';
            let hash = urlParameters.split('#')[1] || '';
            if (hash) hash = '#' + hash;

            chrome.tabs.getCurrent().then(tab => {
                chrome.tabs.highlight({ tabs: tab.index }).then(() => {
                    if (!urlParameters) return;

                    lastElementFocused = null;

                    const baseUrl = location.href.split(/[?#]/)[0];

                    const newUrlParams = new URLSearchParams(location.search);
                    if (!elementToFocusQuery) {
                        newUrlParams.delete('el');
                    } else {
                        newUrlParams.set('el', elementToFocusQuery);
                    }

                    let queryParams = newUrlParams.toString();
                    if (queryParams) queryParams = '?' + queryParams;

                    const newUrl = baseUrl + queryParams + (hash ?? location.hash);
                    history.pushState({}, '', newUrl);

                    readCurrentUrlParams();
                })
            }).catch(err => {
                console.log('could not current tab:', err);
            });
        });
    }

})();

function checkOptionsControls() {
    optionsControls.forEach(check => {
        check();
    });
}