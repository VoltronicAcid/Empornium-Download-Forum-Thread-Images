// ==UserScript==
// @name         Empornium - Download Forum Thread Images
// @namespace    https://github.com/VoltronicAcid/
// @downloadURL  https://github.com/VoltronicAcid/Empornium-Download-Forum-Thread-Images/raw/refactor/empornium_download_forum_thread_images.user.js
// @require      https://unpkg.com/idb/build/iife/index-min.js
// @version      0.2.2
// @description  Download all images and videos posted in a forum thread on empornum.me
// @author       VoltronicAcid
// @match        https://www.empornium.me/forum/thread/*
// @grant        GM_download
// ==/UserScript==

const DEBUG = false;

(async () => {
	'use strict';
	const db_name = 'empornium';
	const table_name = 'threads';
	const uniqLinks = new Set();

	const slugify = (text) => {
		return text.toString()
					.replace(/\s+/g, '-')           // Replace spaces with -
					.replace(/[^\w\-]+/g, '')       // Remove all non-word chars
					.replace(/\-\-+/g, '-')         // Replace multiple - with single -
					.replace(/^-+/, '')             // Trim - from start of text
					.replace(/-+$/, '');            // Trim - from end of text
	};

	const getPageDOM = async (uri) => {
		const resp = await fetch(uri);
		const html = await resp.text();
		const parser = new DOMParser();
		const dom = parser.parseFromString(html, 'text/html');

		return dom;
	};

	const getPageCount = async (baseUri) => {
		const uri = new URL(baseUri);

		uri.searchParams.set('page', 1);
		DEBUG && console.log('getPageCount - page #1 uri\n', uri);
		const firstPageDOM = await getPageDOM(uri.href);
		const pagerLast = firstPageDOM.querySelector('.linkbox.pager a.pager_last');

		if (!pagerLast) {
			DEBUG && console.log('Thread has only 1 page.');
			return 1;
		}

		const lastThreadPageURL = new URL(pagerLast.href);
		DEBUG && console.log('getPageCount - last page uri\n', lastThreadPageURL);
		const lastPageNum = lastThreadPageURL.searchParams.get('page');

		return Number.parseInt(lastPageNum, 10);
	};

	const getMediaFromPosts = (posts) => {
		const mediaLinks = [];
		const downloaded = false;
		posts.forEach(post => {
			const postId = post.id.substring(7);
			const mediaNodes = post.querySelectorAll('img.scale_image, a');
			if (mediaNodes) {
				const re = /(\.mp4|\.webm|\.mkv|\.m4v)$/; // file extensions for video files
				mediaNodes.forEach(node => {
					let href;
					if (node.nodeName === 'IMG') {
						// Hidden images have store the uri in the 'data-src' attribute
						href = node.src ? node.src : node.getAttribute('data-src');
					}

					if (node.nodeName === 'A' && re.test(node.href)) {
						// Video URLs are prefixed with 'http://anonym.es?'
						href = node.href.split('?')[1];
					}

					if (href && !uniqLinks.has(href)) {
						uniqLinks.add(href);
						mediaLinks.push({postId, href, downloaded});
						DEBUG && console.log(postId, href);
					}
				});
			}
		});

		return mediaLinks;
	}

	const getAllMediaLinks = async (uri, pageCount) => {
		const media = [];
		const threadURI = new URL(uri);
		for (let idx = 1; idx <= pageCount; idx++) {
			threadURI.hash = '';
			threadURI.searchParams.set('page', idx);
			DEBUG && console.log('Media Links', idx, threadURI.href);
			const pageDOM = await getPageDOM(threadURI.href);
			const posts = pageDOM.querySelectorAll('.post_container');
			const links = getMediaFromPosts(posts);

			media.push(...links);
		}

		return media;
	};

	const saveMediaToDB = (threadId, name, pageNum, posts) => {
		const openReq = indexedDB.open(db_name, 1);

		// Create db, if needed.
		openReq.onupgradeneeded = function(evt) {
			const db = evt.target.result;
			const schema = {keyPath: 'threadId', autoincrement: false};
			db.createObjectStore(table_name, schema);
		};

		// Add to db.
		openReq.onsuccess = function(evt) {
			const db = evt.target.result;
			const read_trnsct = db.transaction(table_name, 'readonly');
			const readonly_table = read_trnsct.objectStore(table_name);
			const thread_record = readonly_table.get(threadId);
			let curr_row;
			thread_record.onerror = function(evt) {
				console.log('Thread not in db');
				console.log(evt.result.target);
			};
			thread_record.onsuccess = function(evt) {
				if (evt.target.result) {
					curr_row = JSON.parse(JSON.stringify(evt.target.result));
				}
				
				const update_trnsct = db.transaction(table_name, 'readwrite');
				const update_table = update_trnsct.objectStore(table_name);
				let merged_row;
				if (!curr_row) {
					merged_row = {
						threadId, 
						name, 
						downloaded: false, 
						pages: { 
							[pageNum]: {
								posts, 
								downloaded: false
							} 
						} 
					};
				} else {
					const pages = {...curr_row.pages, [pageNum]:{ posts, downloaded: false}}
					merged_row = {
						threadId, 
						name, 
						downloaded: false, 
						pages
					};
				}

				update_table.put(merged_row);
			};
		};
	};

	const getMediaForPage = (threadId, pageNum) => {
		const openReq = indexedDB.open(db_name, 1);

		openReq.onsuccess = function(evt) {
			const db = evt.target.result;
			const readonly_table = db.transaction(table_name, 'readonly').objectStore(table_name);
			const retrieveRow = readonly_table.get(threadId);

			retrieveRow.onerror = function(evt) {
				console.log(evt.target.result);
				return ;
			}

			retrieveRow.onsuccess = function(evt) {
				const threadMedia = evt.target.result;
				if (threadMedia && threadMedia.pages[pageNum]) {
					console.log(`Links for page #${pageNum}`, threadMedia.pages[pageNum].posts);
				}
				
				return threadMedia ? threadMedia.pages[pageNum] : undefined;
			}
		}
	};

	const idbGetPageMedia = async (threadId, pageNum) => {
		const db = await idb.openDB(db_name);
		const threadMedia = await db.get(table_name, threadId);

		return threadMedia ? threadMedia.pages[pageNum] : undefined;
	}

	const addLinkToPage = () => {
		const linkboxes = document.querySelectorAll('.linkbox:not(.pager)');
		linkboxes.forEach(box => {
			const openBrace = document.createTextNode('\u00A0[');	// '&nbsp;['
			const closeBrace = document.createTextNode(']');
			const downloadLink = document.createElement('a');
			downloadLink.href = 'javascript:void(0);';		// prevent scrolling to the top of the page
			downloadLink.text = 'Download Media';
			downloadLink.addEventListener('click', (evt) => {
				evt.stopPropagation();
				evt.preventDefault();

				console.log('ToDo: Download Media');
			}, { once: true }); // Only execute the function once

			box.appendChild(openBrace);
			box.appendChild(downloadLink);
			box.appendChild(closeBrace);
		});
	};

	const init = async () => {
		addLinkToPage();
		const threadUri = new URL(document.location.href);
		const threadId = Number.parseInt(threadUri.pathname.split('/')[3], 10);
		const baseUri = new URL(threadUri.origin + threadUri.pathname);
		const totalPages = await getPageCount(baseUri.href);
		const threadTitle = slugify(document.querySelector('h2').innerText.split(' > ')[2]);
		DEBUG && console.log(`Init Function\nURI\t=\t${threadUri}\nthreadId\t=\t${threadId}\npages=${totalPages}`);

		let totalLinks = 0;
		for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
			baseUri.searchParams.set('page', pageNum);
			const dom = await getPageDOM(baseUri.href);
			const posts = dom.querySelectorAll('.post_container');
			const links = getMediaFromPosts(posts);
			totalLinks += links.length;

			// Only save pages with media to the db
			if (links.length) {
				console.log(`Saving media from page #${pageNum}`)
				saveMediaToDB(threadId, threadTitle, pageNum, links);
			}
		}

		for (let pageNum = 1; pageNum <= totalPages; pageNum++){
			const links = await idbGetPageMedia(threadId, pageNum);
			console.log(`Page #${pageNum} links\n`, links);
		}
		console.log(`Thread contains ${totalLinks} media link${totalLinks > 1 ? 's' : ''} on ${totalPages} page${totalPages > 1 ? 's' : ''}.`);
	};

	init();
})();
