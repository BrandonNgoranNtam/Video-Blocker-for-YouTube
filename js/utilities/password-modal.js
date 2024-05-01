class PasswordModal {
	constructor(password = '') {
		this.password = password;
		this.modal = null;

		this.preventCancel = false;

		/** @type {{resolve: () => void, reject: (err: string) => void}[]} */
		this.pendingRequests = [];
	}

	setPassword(password) {
		this.password = password;
	}

	createPasswordModal() {
		if (this.modal) return utils.devLogWarn('attempt to create a modal even thought it is already created.');

		const modal = document.createElement('dialog');
		modal.classList.add('ytb-password-modal');

		const icon = chrome.runtime.getURL('images/icon-128.png');

		modal.innerHTML = `
			<button id="close">x</button>

			<img src="${icon}" alt="${utils.i18n('ExtName')}"></img>

			<div>
				<h2>${utils.i18n("PasswordModalTitle")}</h2>
				<p>${utils.i18n("EnterPassword")}</p>
			</div>

			<div class="password-input-container">
				<input id="ytb_modal_password" type="password" placeholder="${utils.i18n("PasswordInputPlaceholder")}"></input>
				<button id="password_toggle">
					<i class="fa fa-eye"></i>
				</button>
			</div>

			<div id="password_fail_message" class="${EL_CLASSES.hide} hidden"></div>

			<div id="keep_unlocked_container">
				<label class="checkbox-container">
					<input id="keep_unlocked" type="checkbox">
					<span class="checkmark"><span></span></span>
					<span id="keep_unlocked_label">${utils.i18n("KeepUnlockedCheckbox")}</span>
				</label>
			</div>

			<menu>
				<button id="cancel">${utils.i18n("Cancel")}</button>
				<button id="continue">${utils.i18n("Continue")}</button>
			</menu>
		`;

		document.body.insertAdjacentElement('afterbegin', modal);

		this.setPasswordModal(modal);
	}

	/** @param {HTMLDialogElement} modal */
	setPasswordModal(modal) {
		this.modal = modal;

		// handling backdrop click.
		let mouseDownInsideDialog = false;

		modal.addEventListener('mousedown', e => {
			const rect = modal.getBoundingClientRect();
			const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
				rect.left <= e.clientX && e.clientX <= rect.left + rect.width);

			mouseDownInsideDialog = isInDialog;
		})

		modal.addEventListener('mouseup', e => {
			const rect = modal.getBoundingClientRect();
			const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
				rect.left <= e.clientX && e.clientX <= rect.left + rect.width);

			if (!isInDialog && !mouseDownInsideDialog && !this.preventCancel) {
				modal.close();
			}
		});

		modal.addEventListener('close', e => { this.onModalClose(); })

		modal.querySelector('button#close').addEventListener('click', e => { this.modal.close(); });
		modal.querySelector('button#cancel').addEventListener('click', e => { this.modal.close(); });
		modal.querySelector('button#continue').addEventListener('click', e => { this.onModalContinue(); });

		const passwordInput = modal.querySelector('input#ytb_modal_password');
		passwordInput.addEventListener('keydown', e => {
			if (e.key === 'Enter') this.onModalContinue();
		});
		passwordInput.addEventListener('input', e => {
			this.setInvalidErrorMessage();
		});

		// toggle password visibility
		modal.querySelector('#password_toggle').addEventListener('click', e => {
			const type = passwordInput.getAttribute('type');
			if (type === 'password') {
				passwordInput.setAttribute('type', 'text');
				this.modal.querySelector('#password_toggle i').classList.replace('fa-eye', 'fa-eye-slash');
			} else {
				passwordInput.setAttribute('type', 'password');
				this.modal.querySelector('#password_toggle i').classList.replace('fa-eye-slash', 'fa-eye');
			}
		});
	}

	/** 
	 * @param {Object} options 
	 * @param {boolean} [options.removeCancelation]
	 * @param {boolean} [options.removeKeepUnlockedCheckbox]
	 * @param {boolean} [options.keepUnlockedChecked]
	 * @param {number} [options.unlockDate]
	 * @param {number} [options.unlockTime]
	 * @returns {Promise<{keptUnlocked: boolean, wasOpen: boolean}>} 
	 * */
	async requestPassword(options = {}) {
		if (options.removeCancelation) {
			this.modal.querySelector('button#cancel').classList.add(EL_CLASSES.hide, 'hidden');
			this.modal.querySelector('button#close').classList.add(EL_CLASSES.hide, 'hidden');
			this.preventCancel = true;
		} else {
			this.modal.querySelector('button#cancel').classList.remove(EL_CLASSES.hide, 'hidden');
			this.modal.querySelector('button#close').classList.remove(EL_CLASSES.hide, 'hidden');
			this.preventCancel = false;
		}

		if (options.removeKeepUnlockedCheckbox) {
			this.modal.querySelector('#keep_unlocked_container').classList.add(EL_CLASSES.hide, 'hidden');
		} else {
			this.modal.querySelector('#keep_unlocked_container').classList.remove(EL_CLASSES.hide, 'hidden');
		}

		this.modal.querySelector('#keep_unlocked').checked = Boolean(options.keepUnlockedChecked);

		return new Promise((resolve, reject) => {
			if (!this.password || (options.unlockDate && Date.now() < options.unlockDate)) return resolve({ keptUnlocked: this.modal.querySelector('#keep_unlocked').checked, wasOpen: false });
			if (!this.modal) return reject('a modal must be created first');
			if (!this.modal.open) this.showModal(options.unlockTime);

			this.pendingRequests.push({ resolve, reject });
		});
	}

	showModal(unlockTime) {
		if (!this.modal) return utils.devLogWarn('calling showModal without creating a modal first.');

		this.setInvalidErrorMessage();

		// set input to password in case it wasn't because of the password revealer button.
		const inputElement = this.modal.querySelector('input#ytb_modal_password');
		inputElement.setAttribute('type', 'password');
		inputElement.value = '';
		this.modal.querySelector('#password_toggle i').classList.replace('fa-eye-slash', 'fa-eye');

		this.updateUnlockTimeLabel(unlockTime);

		this.modal.showModal();
		this.modal.querySelector('#ytb_modal_password').focus();
	}

	updateUnlockTimeLabel(unlockTime) {
		if (!this.modal.querySelector('#keep_unlocked_label')) return console.warn('could not find label to update unlock time');

		this.modal.querySelector('#keep_unlocked_label').textContent = PasswordModal.ComposeUnlockTimeText(unlockTime);
	}

	static ComposeUnlockTimeText(unlockTime) {
		if (!unlockTime) return utils.i18n('KeepUnlockedCheckbox');

		if (unlockTime >= 86400)
			return utils.i18nFormat('KeepUnlockedForTime', utils.i18nFormat('DayTime', Math.floor(unlockTime / 86400)));
		if (unlockTime >= 3600)
			return utils.i18nFormat('KeepUnlockedForTime', utils.i18nFormat('HourTime', Math.floor(unlockTime / 3600)));
		if (unlockTime >= 60)
			return utils.i18nFormat('KeepUnlockedForTime', utils.i18nFormat('MinuteTime', Math.floor(unlockTime / 60)));
		if (unlockTime >= 1)
			return utils.i18nFormat('KeepUnlockedForTime', utils.i18nFormat('SecondTime', Math.floor(unlockTime / 60)));

		return utils.i18n('KeepUnlockedCheckbox');
	}

	/** @param {STORAGE_ITEMS['local']} items */
	static GetUnlockTimeFromStorage(items) {
		if (!items) return;

		const { unlockTime, unlockCustomTimeEnabled, unlockCustomHours, unlockCustomMinutes } = items.passwordConfig;

		if (unlockCustomTimeEnabled) return (unlockCustomHours * 3600) + (unlockCustomMinutes * 60);
		return unlockTime;
	}

	onModalContinue() {
		const inputValue = this.modal.querySelector('#ytb_modal_password').value;
		if (inputValue !== this.password) {
			this.modal.querySelector('input#ytb_modal_password').focus();
			return this.setInvalidErrorMessage(utils.i18n('InvalidPassword'));
		}

		this.pendingRequests.forEach(({ resolve, reject }) => {
			resolve({ keptUnlocked: this.modal.querySelector('#keep_unlocked').checked, wasOpen: this.modal.open });
		});

		this.pendingRequests = [];
		this.modal.close();
	}

	onModalClose() {
		this.pendingRequests.forEach(({ resolve, reject }) => {
			reject('cancelled');
		});
	}

	setInvalidErrorMessage(message = '') {
		const passwordMessageElement = this.modal.querySelector('#password_fail_message');
		if (message) {
			passwordMessageElement.textContent = message;
			passwordMessageElement.classList.remove(EL_CLASSES.hide);
			passwordMessageElement.classList.remove('hidden');
			passwordMessageElement.classList.remove('move');

			setTimeout(() => {
				passwordMessageElement.classList.add('move');
			}, 100);
		} else {
			passwordMessageElement.classList.add(EL_CLASSES.hide);
			passwordMessageElement.classList.add('hidden');
		}
	}
}

const passwordModal = new PasswordModal();