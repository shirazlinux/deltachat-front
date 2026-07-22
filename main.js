/*
 * Copyright (C) 2026 themadorg
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/* ── Navbar toggle ── */

function toggleNav() {
    var menu = document.getElementById('nav-menu');
    if (menu) menu.classList.toggle('navbar__menu--open');
}

/* ── Toast notification ── */

let toastEl = null;
let toastTimer = null;

function showToast(message) {
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'toast';
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('toast--visible');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toastEl.classList.remove('toast--visible');
    }, 2000);
}

/* ── Clipboard ── */

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () {
            showToast(t("toast_copied"));
        }).catch(function () {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        var successful = document.execCommand('copy');
        if (successful) showToast(t("toast_copied"));
    } catch (err) {
        console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
}

/* ── Email formatter ── */

function formatEmail(username, domain) {
    const bare = String(domain).trim().replace(/^\[|\]$/g, '');
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(bare)) {
        return username + '@[' + bare + ']';
    }
    return username + '@' + bare;
}

/** Bare hostname for dclogin `ih` / `sh` (no brackets). */
function connectHostForDclogin(fallback) {
    const fb = (fallback || '127.0.0.1').replace(/^\[|\]$/g, '');
    const fromPage = (window.location.hostname || '').replace(/^\[|\]$/g, '');
    if (!fromPage || fromPage === 'localhost' || fromPage === '127.0.0.1') {
        return fb;
    }
    return fromPage;
}

/** Render a dclogin / invite QR into an <img> (client-side, no /qr backend). */
function setQrCodeImage(imgEl, text, cellSize) {
    if (!imgEl || !text || typeof qrcode !== 'function') {
        return;
    }
    try {
        var qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        imgEl.src = qr.createDataURL(cellSize || 4, 2);
        imgEl.alt = 'QR Code';
    } catch (err) {
        console.error('QR generation failed', err);
    }
}

/** nav */
document.addEventListener('DOMContentLoaded', () => {
    const cur = location.pathname.split("/").pop() || 'index.html';
    document.querySelectorAll('.nav-links li a').forEach(a => {
        if (a.getAttribute('href') === cur) {
            a.classList.add('active');
        }
    });

    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        if (themeToggleBtn) themeToggleBtn.innerHTML = sunIcon;
    } else {
        if (themeToggleBtn) themeToggleBtn.innerHTML = moonIcon;
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('light-theme');
            const isLight = body.classList.contains('light-theme');
            
            themeToggleBtn.innerHTML = isLight ? sunIcon : moonIcon;

            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }
});