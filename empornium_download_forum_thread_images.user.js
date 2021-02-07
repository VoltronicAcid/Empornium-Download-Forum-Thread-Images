// ==UserScript==
// @name         Empornium - Download Forum Thread Images
// @namespace    https://github.com/VoltronicAcid/
// @downloadURL  https://github.com/VoltronicAcid/Empornium-Download-Forum-Thread-Images/raw/main/empornium_download_forum_thread_images.user.js
// @version      1.1.1
// @description  Download all images posted in a forum thread on empornum.me
// @author       LenAnderson
// @match        https://www.empornium.me/forum/thread/*
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

	const log = (...msgs)=>console.log.call(console.log, '[EMP-DFTI]', ...msgs);

	const get = (url) => {
		return new Promise((resolve,reject)=>{
			const xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.addEventListener('load', ()=>{
				resolve(xhr.responseText);
			});
			xhr.addEventListener('error', ()=>{
				reject(xhr);
			});
			xhr.send();
		});
	};

	const getHtml = (url) => {
		return get(url).then(txt=>{
			const html = document.createElement('div');
			html.innerHTML = txt;
			return html;
		});
	};


	const wait = async(millis)=>new Promise(resolve=>setTimeout(resolve, millis));

	const downloadImages = async () => {
		log('downloading Images');
		let lastPage = '1';
		// Get thread ID
		const threadId = parseInt(document.location.href.replace(/^.*\/forum\/thread\/(\d+).*$/, '$1'), 10);
		const threadTitle = document.title.replace(/^.+ > ([^>]+) :: Empornium/, '$1');
		// Determine the number of pages in the thread
		if (Number.isInteger(threadId)){
			// Get the first page of the thread.
			const first_page = await getHtml(`/forum/thread/${threadId}?page=1`);
			// Search the first page for a 'Last' link
			const last_link = first_page.querySelector('.pager_last');
			// If the linkbox has a 'Last' link, parse 'Last' link for page number
			if (last_link !== null) {
				lastPage = last_link.location.href.replace(/^.*\?page=(\d+).*$/, '$1')
			}
		}
		const lastPageNo = parseInt(lastPage, 10);
		log(`Downloading media from ${lastPageNo} page${lastPageNo > 1 ? 's' : ''}`);
		// Iterate over each page and collect the media links
		for (let page = 1; page < lastPageNo; page++) {
			const download_path = `${threadTitle}/page_${page}/`;
			let images = await collectImagesFromPage(threadId, page);
			images = [...new Set(images)];
			
			// Download the media 
			for (const img of images) {
                const url_parts = img.split('/');
                const file_name = url_parts[url_parts.length - 1];
				GM_download(img, download_path + file_name);
			}
		}
	};
	// const downloadImages = async()=>{
	// 	log('downloadImages');
	// 	const threadId = parseInt(document.location.href.replace(/^.*\/forum\/thread\/(\d+).*$/, '$1'), 10);
	// 	if (Number.isInteger(threadId)) {
	// 		let lastPageNo = '1';
	// 		const pager_linkbox = document.getElementsByClassName('linkbox pager')[0];
	// 		const last_link = pager_linkbox.querySelector('.pager_last');

	// 		if (last_link === null) {
	// 			lastPageNo = document.location.href.indexOf('page=') > -1 ? document.location.href.replace(/^.*\?page=(\d+).*$/, '$1') : '1' ;
	// 		} else {
	// 			lastPageNo = lastLink.href.replace(/^.*\?page=(\d+).*$/, '$1');
	// 		}
	// 		lastPageNo = parseInt(lastPageNo, 10);
			
	// 		let imgs = [];
	// 		for (let pageNo = 1; pageNo <= lastPageNo; pageNo++) {
	// 			imgs.push(...(await collectImagesFromPage(threadId, pageNo)));

	// 			imgs = imgs.filter((it,idx)=>imgs.indexOf(it)==idx);
	// 			log(imgs);

	// 			const title = document.title.replace(/^.+ > ([^>]+) :: Empornium/, '$1');
	// 			imgs.forEach((img,idx)=>{
	// 				GM_download(img, `${title}/page${pageNo}/${idx}`);
	// 			});

	// 			imgs = [];
	// 		}
	// 		// imgs = imgs.filter((it,idx)=>imgs.indexOf(it)==idx);
	// 		// log(imgs);

	// 		// const title = document.title.replace(/^.+ > ([^>]+) :: Empornium/, '$1');
	// 		// imgs.forEach((img,idx)=>{
	// 		// 	GM_download(img, `${title}_${idx}`);
	// 		// });
	// 	}
	// };

	const collectImagesFromPage = async(threadId, pageNo)=>{
		log('collectImagesFromPage:', threadId, pageNo);
		const page = await getHtml(`/forum/thread/${threadId}?page=${pageNo}`);
		let imgs = Array.from(page.querySelectorAll('.post_content img'))
			.filter(it=>!it.closest('blockquote'))
			.filter(it=>!/^https:\/\/(www\.)?empornium\.([^.\/]+)\/static\/.*/.test(it.src))
			;
		return imgs.map(it=>it.src);
	};




    const init = ()=>{
		log('init');
		const linkbox = Array.from(document.querySelectorAll('.linkbox')).filter(it=>!it.classList.contains('pager')&&!it.nextElementSibling.classList.contains('linkbox'));
		linkbox.forEach(lb=>{
			lb.appendChild(document.createTextNode('\u00A0['));
			const link = document.createElement('a'); {
				link.href = 'javascript:;';
				link.textContent = 'Download Images';
				link.addEventListener('click', (evt)=>{
					evt.stopPropagation();
					evt.preventDefault();
					downloadImages();
				});
				lb.appendChild(link);
			}
			lb.appendChild(document.createTextNode(']'));
		});
	};
	init();
})();
