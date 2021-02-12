// ==UserScript==
// @name         Empornium - Download Forum Thread Images
// @namespace    https://github.com/VoltronicAcid/
// @downloadURL  https://github.com/VoltronicAcid/Empornium-Download-Forum-Thread-Images/raw/refactor/empornium_download_forum_thread_images.user.js
// @version      0.2.1
// @description  Download all images and videos posted in a forum thread on empornum.me
// @author       VoltronicAcid
// @match        https://www.empornium.me/forum/thread/*
// @grant        GM_download
// ==/UserScript==

const DEBUG = true;

(async () => {
	'use strict';
	console.log('Executing "Download Forum Thread Images"');

	const parser = new DOMParser();
	const original_uri = new URL(document.location.href);
	DEBUG && console.log(original_uri);
	const threadId = original_uri.pathname.split('/')[3];
	const getPageCount = async () => {
		original_uri.searchParams.forEach((value, varName) => {
			if (varName !== 'page') {
				original_uri.searchParams.delete(varName);
				DEBUG && console.log(`Deleting ${varName} from searchParams`)
			}
		})
		original_uri.searchParams.set('page', 1);
		DEBUG && console.log('Updated URI object', original_uri);
		const resp = await fetch(original_uri.href);
		const html = await resp.text();
		const page1DOM = parser.parseFromString(html, 'text/html');
		const lastThreadPageLink = page1DOM.querySelector('.linkbox.pager a.pager_last');
		if (!lastThreadPageLink) {
			DEBUG && console.log('Thread has only 1 page.');
			return 1;
		}

		DEBUG && console.log('Last page href', lastThreadPageLink.href);
		const lastThreadPageURL = new URL(lastThreadPageLink.href);
		DEBUG && console.log(lastThreadPageURL);
		const lastPageNum = lastThreadPageURL.searchParams.get('page');
		DEBUG && console.log(`Last page Num in function ${lastPageNum}`);
		
		return Number.parseInt(lastPageNum, 10);
	};
	const lastPageNum = await getPageCount();
	DEBUG && console.log('The last page in the thread is', lastPageNum);
})();
