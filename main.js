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

/* ── Free-software site footer (shared across pages) ── */

/**
 * Resolve displayed app/server version from body/footer attributes or existing text.
 */
function resolveSiteVersion() {
    var body = document.body;
    if (body && body.getAttribute('data-version')) {
        return body.getAttribute('data-version');
    }
    var marked = document.querySelector('[data-version]');
    if (marked && marked.getAttribute('data-version')) {
        return marked.getAttribute('data-version');
    }
    var existing = document.querySelector('footer, .footer, .site-footer');
    if (existing) {
        var m = existing.textContent.match(/(?:Version|نسخه|Версия)\s*([^\s]+)/i);
        if (m && m[1] && m[1] !== '{{.Version}}') return m[1];
        // bare version left in some templates
        var bare = existing.textContent.replace(/\s+/g, ' ').trim();
        if (/^[\w.\-]+$/.test(bare) && bare.length < 32) return bare;
    }
    return '2.0';
}

/**
 * Build a consistent FOSS-oriented footer (Tabarestan GNU + free-software community).
 * Links reference tabarestangnu.ir, AGPL, Madmail and Delta Chat.
 */
function buildSiteFooterHTML(version) {
    var ver = version || resolveSiteVersion();
    return '' +
        '<div class="site-footer__inner">' +
        '  <nav aria-label="Free software references">' +
        '    <ul class="site-footer__nav">' +
        '      <li><a href="https://tabarestangnu.ir" target="_blank" rel="noopener noreferrer">طبرستان گنو</a></li>' +
        '      <li><a href="https://www.gnu.org" target="_blank" rel="noopener noreferrer">GNU</a></li>' +
        '      <li><a href="https://www.fsf.org" target="_blank" rel="noopener noreferrer">FSF</a></li>' +
        '      <li><a href="https://delta.chat" target="_blank" rel="noopener noreferrer" data-i18n="footer_delta">Delta Chat</a></li>' +
        '    </ul>' +
        '  </nav>' +
        '  <hr class="site-footer__divider" />' +
        '  <p class="site-footer__meta" data-i18n-html="footer_tagline">This is a server for connecting with <strong>Delta Chat</strong>.</p>' +
        '  <p class="site-footer__meta" data-i18n-html="footer_source_license">' +
        '    <a href="https://github.com/themadorg" target="_blank" rel="noopener noreferrer">Source code</a> is released under the ' +
        '    <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">AGPL-3.0-or-later</a>.' +
        '  </p>' +
        '  <p class="site-footer__meta" data-i18n-html="footer_powered">' +
        '    Powered by <strong>Madmail</strong> / chatmail for use with <a href="https://delta.chat" target="_blank" rel="noopener noreferrer">Delta Chat</a>.' +
        '  </p>' +
        '  <p class="site-footer__meta" data-i18n-html="footer_community">' +
        '    Free software community: <a href="https://tabarestangnu.ir" target="_blank" rel="noopener noreferrer">طبرستان گنو</a> (Tabarestan GNU).' +
        '  </p>' +
        '  <p class="site-footer__version"><span data-i18n="footer_version">Version</span> <span dir="ltr">' + ver + '</span></p>' +
        '</div>';
}

/**
 * Normalize a path for nav active-state matching.
 * Collapses trailing slashes and index.html so /apps and /apps/index.html match,
 * but / and /apps do not both look like "index.html".
 */
function normalizeNavPath(pathOrHref) {
    try {
        var url = new URL(pathOrHref, window.location.href);
        var path = url.pathname || '/';
        // Drop query/hash; treat directory URLs as their index
        if (path.endsWith('/')) {
            path = path + 'index.html';
        }
        // Normalize "/foo/index.html" -> "/foo/" and "/index.html" -> "/"
        if (path.endsWith('/index.html')) {
            path = path.slice(0, -'index.html'.length);
        }
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        return path || '/';
    } catch (e) {
        return pathOrHref || '';
    }
}

/** Mark the current page link in the navbar (path-based, not bare filename). */
function highlightActiveNav() {
    var curPath = normalizeNavPath(window.location.pathname);
    document.querySelectorAll('.nav-links li a').forEach(function (a) {
        a.classList.remove('active');
        var href = a.getAttribute('href') || '';
        if (!href || href === '#' || href.indexOf('javascript:') === 0) {
            return;
        }
        var linkPath = normalizeNavPath(href);
        if (linkPath === curPath) {
            a.classList.add('active');
        }
    });
}

/**
 * Resolve a root asset path that works from / and nested pages like /apps/.
 */
function resolveRootAsset(name) {
    try {
        var path = window.location.pathname || '/';
        // Nested under /apps/ (or similar single subdir with its own index)
        if (/\/apps(\/|$)/.test(path)) {
            return '../' + name;
        }
    } catch (e) { /* fall through */ }
    return '/' + name;
}

/**
 * Inject Tabarestan GNU brand mark into the main navbar when missing.
 */
function ensureBrandLogo() {
    if (document.body && (
        document.body.hasAttribute('data-no-site-footer') ||
        document.body.classList.contains('app-shell')
    )) {
        return;
    }
    var nav = document.querySelector('nav.navbar');
    if (!nav || nav.querySelector('.brand-logo')) return;

    var homeHref = resolveRootAsset('index.html').replace(/^\//, '') || 'index.html';
    // Prefer absolute root for home when at site root
    if (homeHref === 'index.html' || homeHref === '/index.html') {
        homeHref = 'index.html';
    }
    var logoSrc = resolveRootAsset('logo-tabarestan.png');

    var brand = document.createElement('a');
    brand.className = 'brand-logo';
    brand.href = homeHref;
    brand.setAttribute('aria-label', 'طبرستان گنو — Tabarestan GNU');
    brand.innerHTML =
        '<img src="' + logoSrc + '" alt="طبرستان گنو" width="40" height="42" />' +
        '<span class="brand-logo__text">' +
        '  <strong>طبرستان گنو</strong>' +
        '  <small>Tabarestan GNU</small>' +
        '</span>';

    // Place brand before theme toggle / menu (first visual item)
    nav.insertBefore(brand, nav.firstChild);
}

/**
 * Ensure every public page has one consistent site footer.
 * Skips app.html-style clients via data-no-site-footer / body.app-shell.
 */
function ensureSiteFooter() {
    if (document.body && (
        document.body.hasAttribute('data-no-site-footer') ||
        document.body.classList.contains('app-shell') ||
        document.documentElement.hasAttribute('data-no-site-footer')
    )) {
        return;
    }

    var version = resolveSiteVersion();
    var candidates = document.querySelectorAll('footer, .footer.site-footer, .site-footer, div.footer');
    var target = null;

    if (candidates.length) {
        // Prefer a real <footer> if present
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i].tagName === 'FOOTER' || candidates[i].classList.contains('site-footer')) {
                target = candidates[i];
                break;
            }
        }
        if (!target) target = candidates[0];

        // Remove duplicates
        for (var j = 0; j < candidates.length; j++) {
            if (candidates[j] !== target) {
                candidates[j].parentNode && candidates[j].parentNode.removeChild(candidates[j]);
            }
        }

        if (target.tagName !== 'FOOTER') {
            var replacement = document.createElement('footer');
            replacement.className = 'site-footer';
            replacement.setAttribute('data-version', version);
            replacement.innerHTML = buildSiteFooterHTML(version);
            target.parentNode.replaceChild(replacement, target);
        } else {
            target.classList.add('site-footer');
            target.setAttribute('data-version', version);
            target.innerHTML = buildSiteFooterHTML(version);
        }
    } else if (document.body) {
        var footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.setAttribute('data-version', version);
        footer.innerHTML = buildSiteFooterHTML(version);
        document.body.appendChild(footer);
    }
}

/**
 * Make .code-box blocks one-click copyable.
 */
function enhanceCodeBoxes() {
    var selectors = '.code-box, .code-block, .one-liner, pre.code-block';
    document.querySelectorAll(selectors).forEach(function (box) {
        if (box.querySelector('.copy-btn')) return;
        // Skip tiny inline codes
        var text = (box.textContent || '').trim();
        if (!text || text.length < 8) return;

        var codeEl = box.querySelector('code, pre') || box;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', 'Copy');
        if (typeof t === 'function' && t('copy_btn') && t('copy_btn') !== 'copy_btn') {
            btn.textContent = t('copy_btn');
        } else {
            btn.textContent = 'Copy';
        }
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            // Prefer code content; strip the copy button label if present
            var raw = (codeEl.textContent || '').trim();
            if (raw) copyToClipboard(raw);
        });
        if (window.getComputedStyle(box).position === 'static') {
            box.style.position = 'relative';
        }
        box.appendChild(btn);
    });
}

/**
 * Open a DeltaChat invite / dclogin URI (app deep-link).
 */
function openDeltaChatUri(uri) {
    if (!uri) return;
    try {
        window.location.href = uri;
    } catch (e) {
        var a = document.createElement('a');
        a.href = uri;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

/**
 * Light SEO helpers: ensure description/theme-color exist, mark up keywords.
 * Does not overwrite author-provided meta tags.
 */
function ensureBasicSeo() {
    var head = document.head;
    if (!head) return;

    function ensureMeta(name, content, prop) {
        if (!content) return;
        var sel = prop ? 'meta[property="' + prop + '"]' : 'meta[name="' + name + '"]';
        if (head.querySelector(sel)) return;
        var m = document.createElement('meta');
        if (prop) m.setAttribute('property', prop);
        else m.setAttribute('name', name);
        m.setAttribute('content', content);
        head.appendChild(m);
    }

    ensureMeta('theme-color', '#007618');
    ensureMeta('robots', 'index,follow');

    // If page has no description, derive from first meaningful paragraph
    if (!head.querySelector('meta[name="description"]')) {
        var p = document.querySelector('main p, .page-content p, .card p, body p');
        if (p) {
            var txt = (p.textContent || '').replace(/\s+/g, ' ').trim();
            if (txt.length > 40) {
                ensureMeta('description', txt.slice(0, 160));
            }
        }
    }

    // Open Graph basics
    var title = document.title || '';
    ensureMeta(null, title, 'og:title');
    var desc = head.querySelector('meta[name="description"]');
    if (desc) ensureMeta(null, desc.getAttribute('content'), 'og:description');
    ensureMeta(null, 'website', 'og:type');
}

/**
 * Site analytics (Umami) — loaded once per page for visit stats.
 * Same as:
 *   <script defer src="https://umami.sudoshz.ir/script.js"
 *           data-website-id="844d6169-117f-4ccd-8ad0-faca3737de8e"></script>
 */
function loadUmamiAnalytics() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.querySelector('script[data-website-id="844d6169-117f-4ccd-8ad0-faca3737de8e"]')) {
        return;
    }
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://umami.sudoshz.ir/script.js';
    s.setAttribute('data-website-id', '844d6169-117f-4ccd-8ad0-faca3737de8e');
    document.head.appendChild(s);
}

/** nav + theme + shared footer */
document.addEventListener('DOMContentLoaded', () => {
    ensureBrandLogo();
    ensureSiteFooter();
    highlightActiveNav();
    enhanceCodeBoxes();
    ensureBasicSeo();
    loadUmamiAnalytics();

    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Legacy docs menus (navbar__toggle / navbar__menu)
    document.querySelectorAll('.navbar__toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var menu = document.getElementById('nav-menu') || document.querySelector('.navbar__menu');
            if (menu) menu.classList.toggle('navbar__menu--open');
            if (menu) menu.classList.toggle('active');
        });
    });

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