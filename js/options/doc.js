
pageFeatures({ optionsLinks: true });

let backToOptionsButton = document.querySelectorAll('.back-to-options');
backToOptionsButton.forEach(bt => {
    bt.onclick = BackToOptions;
});

function BackToOptions() {
    MM.emitToRuntime(MMK.openOptionsPage).then(() => {
        window.close();
    });
    // chrome.tabs.query({active: true}, function(tabs){
        // chrome.runtime.openOptionsPage();
        // chrome.tabs.remove(tabs[0].id);
    // });
}
