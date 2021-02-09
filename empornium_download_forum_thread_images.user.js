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

const DEBUG = true;
const MAX_DOWNLOADS = 5;

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

	function slugify (str) {
		str = str.trim();
	  
		// remove accents, swap ñ for n, etc
		var from = "àáäâèéëêìíïîòóöôùúüûñç·";
		var to   = "aaaaeeeeiiiioooouuuunc-";
		for (var i=0, l=from.length ; i<l ; i++) {
			str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
		}
	
		str = str.replace(/[^A-Za-z0-9 \-_]/g, '') // remove invalid chars
			.replace(/\s+/g, '_') // collapse whitespace and replace by -
			.replace(/-+/g, '-'); // collapse dashes
	
		return str;
	}

	const downloadImages = async () => {
		log('downloading Images');
		let lastPage = '1';
		// Get thread ID
		const threadId = parseInt(document.location.href.replace(/^.*\/forum\/thread\/(\d+).*$/, '$1'), 10);
		let threadTitle = document.title.replace(/^.+ > ([^>]+) :: Empornium/, '$1');
		threadTitle = slugify(threadTitle);

		// Determine the number of pages in the thread
		if (Number.isInteger(threadId)){
			// Get the first page of the thread.
			const first_page = await getHtml(`/forum/thread/${threadId}?page=1`);
			// Search the first page for a 'Last' link
			const last_link = first_page.querySelector('.pager_last');
			// If the linkbox has a 'Last' link, parse 'Last' link for page number
			if (last_link !== null) {
				lastPage = last_link.href.replace(/^.*\?page=(\d+).*$/, '$1')
			}
		}

		const lastPageNo = parseInt(lastPage, 10);
		log(`Downloading media from ${lastPageNo} page${lastPageNo > 1 ? 's' : ''}`);
		// Iterate over each page and collect the media links
		for (let page = 1; page <= lastPageNo; page++) {
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

	const collectImagesFromPage = async(threadId, pageNo)=>{
		log('collectImagesFromPage:', threadId, pageNo);
		const page = await getHtml(`/forum/thread/${threadId}?page=${pageNo}`);
		let imgs = Array.from(page.querySelectorAll('.post_content img'))
			.filter(it=>!it.closest('blockquote'))
			.filter(it=>!/^https:\/\/(www\.)?empornium\.([^.\/]+)\/static\/.*/.test(it.src))
			;

		let re = /(\.mp4|\.webm|\.m4v)$/
		let vids = Array.from(page.querySelectorAll('.post_content a'), a => a.href).filter(link => re.test(link)); 
		vids = [...new Set(vids)].map(link => link.substring(link.indexOf('?') + 1));

		imgs = imgs.map(it => it.src);

		if (DEBUG) {
			vids.forEach(link => console.log(link));
			imgs.forEach(link => console.log(link));
		}
		
		return [...imgs, ...vids];
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
