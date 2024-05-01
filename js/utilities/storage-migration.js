
class StorageMigration {
    /** 
     * @param {Partial<STORAGE_ITEMS['local']>} syncItems 
     * @returns {STORAGE_ITEMS['local']} 
     * */
    static ConvertStorageV3toV4(syncItems) {
        if (syncItems.storageVersion === 4) return syncItems;

        // create a clone to prevent unwanted behaviour from changing a ref.
        const newItems = structuredClone(syncItems);

        // in V4, options such as "Remove blocked videos" was changed to "Show overlay".
        // this fuction will convert these options to the new one.

        // setting to default value from v3 in case is undefined.
        newItems.removeBlockedVideos = newItems.removeBlockedVideos ?? true;
        newItems.removeBlockedComments = newItems.removeBlockedComments ?? true;
        newItems.removeBlockedPosts = newItems.removeBlockedPosts ?? true;

        const removeOverlayItemValues = [newItems.removeBlockedVideos, newItems.removeBlockedComments, newItems.removeBlockedPosts];

        // converting to v4 default values when it makes sense.
        if (removeOverlayItemValues.every(item => item === removeOverlayItemValues[0])) {
            newItems.showOverlays = removeOverlayItemValues[0] === false;
            newItems.showOverlaysForVideos = true;
            newItems.showOverlaysForComments = true;
            newItems.showOverlaysForPosts = true;
        } else {
            newItems.showOverlays = true;
            newItems.showOverlaysForVideos = !newItems.removeBlockedVideos;
            newItems.showOverlaysForComments = !newItems.removeBlockedComments;
            newItems.showOverlaysForPosts = !newItems.removeBlockedPosts;
        }

        // updating version from v3 to v4.
        newItems.storageVersion = 4;
        newItems.extensionInstallDate = Date.now();

        return newItems;
    }
}