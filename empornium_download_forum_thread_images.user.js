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

	// const parser = new DOMParser();
	const original_uri = new URL(document.location.href);
	DEBUG && console.log(original_uri);
	const threadId = original_uri.pathname.split('/')[3];

	const getPageDOM = async (uri) => {
		const resp = await fetch(uri);
		const html = await resp.text();
		const parser = new DOMParser();
		const dom = parser.parseFromString(html, 'text/html');

		return dom;
	};

	const getPageCount = async () => {
		original_uri.searchParams.forEach((value, varName) => {
			if (varName !== 'page') {
				original_uri.searchParams.delete(varName);
				DEBUG && console.log(`Deleting ${varName} from searchParams`)
			}
		})
		original_uri.searchParams.set('page', 1);
		// DEBUG && console.log('Updated URI object', original_uri);
		const page1DOM = await getPageDOM(original_uri.href);
		const lastThreadPageLink = page1DOM.querySelector('.linkbox.pager a.pager_last');

		if (!lastThreadPageLink) {
			DEBUG && console.log('Thread has only 1 page.');
			return 1;
		}

		// DEBUG && console.log('Last page href', lastThreadPageLink.href);
		const lastThreadPageURL = new URL(lastThreadPageLink.href);
		// DEBUG && console.log(lastThreadPageURL);
		const lastPageNum = lastThreadPageURL.searchParams.get('page');
		// DEBUG && console.log(`Last page Num in function ${lastPageNum}`);

		return Number.parseInt(lastPageNum, 10);
	};
	const lastPageNum = await getPageCount();
	DEBUG && console.log('The last page in the thread is', lastPageNum);

	const getMediaLinks = async (uri, pageCount) => {
		const media = [];
		const threadURI = new URL(uri);
		for (let idx = 1; idx <= pageCount; idx++) {
			threadURI.hash = '';
			threadURI.searchParams.set('page', idx);
			DEBUG && console.log('Media Links', idx, threadURI.href);
			const pageDOM = await getPageDOM(threadURI.href);
			const posts = pageDOM.querySelectorAll('.post_container');
			posts.forEach(post => {
				const postId = post.id.substring(7);
				const imgs = post.querySelectorAll('img.scale_image');
				if (imgs) {
					imgs.forEach(img => {
						const href = img.src ? img.src : img.getAttribute('data-src');
						media.push({postId, href});
						console.log(`Page #${idx}`, postId, href);
					});
				}
			});
		}
	};

	const media = await getMediaLinks(original_uri.href, lastPageNum);
	DEBUG && console.log(media);
})();
