(() => {
    const darkModeItem = window.localStorage.getItem('dark-mode')
    if (!darkModeItem || darkModeItem == 'true') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();