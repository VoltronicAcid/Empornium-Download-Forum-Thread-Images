// ==UserScript==
// @name         Empornium - Download Forum Thread Images
// @namespace    https://github.com/VoltronicAcid/
// @downloadURL  https://github.com/VoltronicAcid/Empornium-Download-Forum-Thread-Images/raw/refactor/empornium_download_forum_thread_images.user.js
// @version      0.2
// @description  Download all images posted in a forum thread on empornum.me
// @author       LenAnderson
// @match        https://www.empornium.me/forum/thread/*
// @grant        GM_download
// ==/UserScript==

const DEBUG = true;

(async () => {
	'use strict';
	console.log('Executing "Download Forum Thread Images"');

	const original_uri = new URL(document.location.href);
	DEBUG && console.log(original_uri);
})();
