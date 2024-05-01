
/**
 * @typedef {Object} ShowModalOptions
 * @property {boolean} [closeByClickingBackdrop] (true)
 * @property {boolean} [closeOnSubmit] (true)
 * @property {number} [closingDelay] (100) ms
 * @property {(dialog: HTMLDialogElement) => void} [onSubmit]
 * @property {(dialog: HTMLDialogElement, wasSubmitted: boolean) => void} [onClose]
 * @property {(dialog: HTMLDialogElement) => void} [onShow]
 */

class Modal {
    /** @type {HTMLDialogElement} */
    dialog = null;

    #closeByClickingBackdrop = false;
    #closeOnSubmit = false;
    #closingDelay = 250;

    #closedAsSubmit = false;

    /** @type {{resolve: ()=>void, reject: ()=>void}[]} */
    #promises = [];
    /** @type {() => void} */
    #optionsOnSubmit = null;
    /** @type {(dialog: HTMLDialogElement) => void} */
    #optionsOnClose = null;

    /** @param {HTMLDialogElement} dialogElement */
    constructor(dialogElement = null) {
        if (dialogElement) this.setModalDialogElement(dialogElement);
    }

    /** @param {HTMLDialogElement} dialogElement */
    setModalDialogElement(dialogElement) {
        if (this.dialog) return utils.devLogWarn('Can\'t set modal dialog multiple times');
        this.dialog = dialogElement;

        let mouseDownInsideDialog = false;

		this.dialog.addEventListener('mousedown', e => {
            if (!this.#closeByClickingBackdrop) return;

			const rect = this.dialog.getBoundingClientRect();
			const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
			rect.left <= e.clientX && e.clientX <= rect.left + rect.width);

			mouseDownInsideDialog = isInDialog;
		});

		this.dialog.addEventListener('mouseup', e => {
            if (!this.#closeByClickingBackdrop) return;

			const rect = this.dialog.getBoundingClientRect();
			const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
			rect.left <= e.clientX && e.clientX <= rect.left + rect.width);

			if (!isInDialog && !mouseDownInsideDialog && !this.preventCancel) {
				this.closeModal()
			}
		});

        this.dialog.addEventListener('close', e => {
            this.#onClose();
        });

        const closeButtons = this.dialog.querySelectorAll('[modal-close]');
        closeButtons.forEach(button => {
            button.addEventListener('click', e => {
                this.closeModal()
            });
        });

        const submitButtons = this.dialog.querySelectorAll('[modal-submit]');
        submitButtons.forEach(button => {
            button.addEventListener('click', e => {
                this.#onSubmit();
            });
        });

        
    }

    /** @param {ShowModalOptions} options @returns {void} */
    showModal(options = {}) {
        if (!this.dialog) return utils.devLogWarn(`can't show modal, the modal must be set using ${this.setModalDialogElement.name} first.`);

        this.#closeByClickingBackdrop = options.closeByClickingBackdrop ?? true;
        this.#closeOnSubmit = options.closeOnSubmit ?? true;

        if (options.onSubmit) this.#optionsOnSubmit = options.onSubmit;
        if (options.onClose) this.#optionsOnClose = options.onClose;
        if (options.closingDelay) this.#closingDelay = options.closingDelay;

        this.dialog.showModal();

        this.dialog.querySelector('[modal-focus]')?.focus();
        
        if (options.onShow) options.onShow(this.dialog);
    }

    /** @param {ShowModalOptions} options @returns {Promise<void>} */
    showModalPromise(options = {}) {
        if (!this.dialog) return utils.devLogWarn(`can't show modal, the modal must be set using ${this.setModalDialogElement.name} first.`);

        return new Promise((resolve, reject) => {
            this.#promises.push({ resolve, reject });

            this.showModal(options);
        });
    }

    async closeModal(wasSubmitted = false) {
        const isReduced = window.matchMedia(`(prefers-reduced-motion: reduce)`) === true || window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;
        if (this.#closingDelay && !isReduced) {
            this.dialog.setAttribute('closing', '');
            await (() => { return new Promise(resolve => setTimeout(resolve, this.#closingDelay)) })();
        }
        
        this.#closedAsSubmit = wasSubmitted;
        this.dialog.close();
        this.dialog.removeAttribute('closing');
    }

    #onSubmit() {
        this.#promises.forEach(promise => { promise.resolve(); });
        this.#promises = [];

        if (this.#optionsOnSubmit) {
            this.#optionsOnSubmit(this.dialog);
            this.#optionsOnSubmit = null;
            this.#optionsOnClose = null;
        }

        if (this.#closeOnSubmit) this.closeModal(true);
    }

    #onClose() {
        this.#promises.forEach(promise => { promise.reject('closed'); });
        this.#promises = [];

        if (this.#optionsOnClose) {
            this.#optionsOnClose(this.dialog, this.#closedAsSubmit);
            this.#optionsOnClose = null;
            this.#optionsOnSubmit = null;
        }

        this.#closedAsSubmit = false;
    }
}