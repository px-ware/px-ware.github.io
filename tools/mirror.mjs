// Statyczna kopia pxware.pl dla GitHub Pages (px-ware.github.io), zapisywana do docs/.
//
// Pobiera gotowe strony z działającej witryny (to, co generuje PHP), zapisuje je jako pliki HTML
// razem z CSS, JS i obrazkami, a potem przerabia to, co bez PHP nie zadziała.
//
// Użycie:
//   node tools/mirror.mjs                 tryb "backup": oryginałem dla Google zostaje pxware.pl
//   node tools/mirror.mjs --mode=primary  tryb "primary": github.io staje się główną stroną
//                                         (adresy kanoniczne, mapy witryn i robots.txt na github.io)
//   CONTACT_EMAIL=adres@... node tools/mirror.mjs ...
//                                         podmienia adres e-mail na wszystkich stronach
//                                         (pxware@pxware.pl przestanie działać razem z domeną)
//   SOURCE=https://... node tools/mirror.mjs
//                                         inne źródło niż https://pxware.pl (np. lokalny serwer z kopii hostingu)

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://pxware.pl';
const SOURCE = (process.env.SOURCE || SITE).replace(/\/$/, '');
const MIRROR = 'https://px-ware.github.io';
const MODE = (process.argv.find(a => a.startsWith('--mode=')) || '--mode=backup').slice(7);
const EMAIL = process.env.CONTACT_EMAIL || '';
const OLD_EMAIL = 'pxware@pxware.pl';
// "bot" w nazwie: licznik statystyk na pxware.pl liczy te pobrania jako boty, nie odsłony.
const UA = 'pxware-mirror-bot/1.0 (+https://github.com/px-ware/px-ware.github.io)';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const SITEMAPS = ['/sitemap.xml', '/safecheck/sitemap.xml', '/networkmaster/sitemap.xml', '/flashtools/sitemap.xml'];
// Strony spoza map witryn, do których prowadzą linki (FlashTools ma je poza sitemap.xml).
const EXTRA_PAGES = ['/flashtools/privacy.html', '/flashtools/terms.html'];
// Adresy, których nie kopiujemy: licznik kliknięć, prywatny panel, wewnętrzne katalogi.
// Weryfikacja usługi https://px-ware.github.io/ w Google Search Console: plik musi zostać na stronie.
const GSC_VERIFICATION_FILE = 'googlee4a1a6d7c2cd56a6.html';
const SKIP =/^\/(?:e$|zero(?:\/|$)|includes\/|storage\/|[a-z]+\/e$|[a-z]+\/inc\/)/;

if (!['backup', 'primary'].includes(MODE)) {
    console.error('Nieznany tryb: ' + MODE);
    process.exit(1);
}

const pages = new Set();
const assets = new Set();
const saved = [];
const problems = [];

async function get(path) {
    const res = await fetch(SOURCE + path, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const finalPath = new URL(res.url).pathname;
    if (!res.ok || finalPath !== new URL(SOURCE + path).pathname) {
        problems.push(`${path}: HTTP ${res.status}${finalPath !== path ? ' → ' + finalPath : ''}`);
        return null;
    }
    return res;
}

/** Ścieżka pliku w docs/ dla adresu: /a/ → a/index.html, /a → a.html, /a.css → a.css. */
function fileFor(path) {
    let p = decodeURIComponent(path);
    if (p.endsWith('/')) p += 'index.html';
    else if (!/\.[a-z0-9]+$/i.test(p.split('/').pop())) p += '.html';
    return join(OUT, p);
}

async function save(path, data) {
    const file = fileFor(path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    saved.push(path);
}

/** Lokalna ścieżka (bez zapytania i #) albo null dla adresów spoza witryny. */
function local(ref, base) {
    if (!ref || /^(?:#|mailto:|tel:|data:|javascript:)/i.test(ref)) return null;
    let u;
    try { u = new URL(ref.replace(/&amp;/g, '&'), SOURCE + base); } catch { return null; }
    if (u.origin !== SOURCE && u.origin !== SITE) return null;
    return SKIP.test(u.pathname) ? null : u.pathname;
}

function isPage(path) {
    const last = path.split('/').pop();
    return path.endsWith('/') || last.endsWith('.html') || !/\.[a-z0-9]+$/i.test(last);
}

function collect(text, base, re) {
    for (const m of text.matchAll(re)) {
        for (const ref of m[1].split(',').map(s => s.trim().split(/\s+/)[0])) {
            const p = local(ref, base);
            if (!p) continue;
            if (isPage(p)) pages.add(p); else assets.add(p);
        }
    }
}

// ---------------- przeróbki HTML ----------------

/** Formularz kontaktowy działa tylko w PHP: zamiast niego przycisk otwierający program pocztowy. */
function replaceContactForm(html) {
    const email = EMAIL || (html.match(/class="contact-email" href="mailto:([^"]+)"/) || [])[1] || OLD_EMAIL;
    return html.replace(/<form class="contact-form"[\s\S]*?<\/form>/, `<div class="contact-form">
        <h3>Napisz do nas</h3>
        <p class="form-note">Opisz projekt w kilku zdaniach i wyślij go e-mailem. Odpowiadamy zazwyczaj w ciągu 1–2 dni roboczych.</p>
        <a class="btn btn-block" href="mailto:${email}?subject=${encodeURIComponent('Zapytanie ze strony')}">Napisz e-mail</a>
      </div>`);
}

function transformHtml(html) {
    html = replaceContactForm(html);
    if (EMAIL) html = html.split(OLD_EMAIL).join(EMAIL);
    if (MODE === 'primary') {
        return html.split(SITE + '/').join(MIRROR + '/');
    }
    // Tryb backup: linki prowadzą po kopii, a adres kanoniczny i og:url dalej wskazują pxware.pl.
    return html.replace(/<[a-z][^>]*>/gi, tag => {
        if (/rel="(?:canonical|alternate)"|property="og:/i.test(tag)) return tag;
        return tag.replace(/\b(href|src|action)="https:\/\/pxware\.pl(\/[^"]*)"/g, '$1="$2"');
    });
}

function robotsTxt() {
    if (MODE === 'backup') {
        return 'User-agent: *\nAllow: /\n';
    }
    return 'User-agent: *\nAllow: /\n\n' + SITEMAPS.map(s => `Sitemap: ${MIRROR}${s}`).join('\n') + '\n';
}

// ---------------- główna część ----------------

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const sm of SITEMAPS) {
    const res = await get(sm);
    if (!res) continue;
    const xml = await res.text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const p = local(m[1].trim(), '/');
        if (p) pages.add(p);
    }
    if (MODE === 'primary') await save(sm, xml.split(SITE + '/').join(MIRROR + '/'));
}
EXTRA_PAGES.forEach(p => pages.add(p));
pages.add('/');

const done = new Set();
for (let again = true; again;) {
    again = false;
    for (const p of [...pages]) {
        if (done.has(p)) continue;
        done.add(p);
        again = true;
        const res = await get(p);
        if (!res) continue;
        if (!(res.headers.get('content-type') || '').includes('text/html')) {
            assets.add(p);
            continue;
        }
        const html = await res.text();
        collect(html, p, /\b(?:href|src|srcset)="([^"]+)"/gi);
        // og:image itp.: w meta content bierzemy tylko pełne adresy witryny (reszta to zwykły tekst).
        collect(html, p, /\bcontent="(https:\/\/pxware\.pl\/[^"\s]*)"/gi);
        await save(p, transformHtml(html));
    }
}

const doneAssets = new Set();
for (let again = true; again;) {
    again = false;
    for (const a of [...assets]) {
        if (doneAssets.has(a)) continue;
        doneAssets.add(a);
        again = true;
        const res = await get(a);
        if (!res) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (/\.css$/i.test(a)) collect(buf.toString('utf8'), a, /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
        if (/\.webmanifest$|manifest\.json$/i.test(a)) collect(buf.toString('utf8'), a, /"src"\s*:\s*"([^"]+)"/gi);
        await save(a, buf);
    }
}

// Strona błędu: GitHub Pages pokazuje docs/404.html dla każdego nieistniejącego adresu.
const notFound = await fetch(SOURCE + '/nie-ma-takiej-strony-mirror', { headers: { 'User-Agent': UA } });
await writeFile(join(OUT, '404.html'), transformHtml(await notFound.text()));
await writeFile(join(OUT, 'robots.txt'), robotsTxt());
await writeFile(join(OUT, '.nojekyll'), '');
await writeFile(join(OUT, GSC_VERIFICATION_FILE), `google-site-verification: ${GSC_VERIFICATION_FILE}`);

console.log(`Tryb: ${MODE}${EMAIL ? ', e-mail: ' + EMAIL : ''}`);
console.log(`Zapisano ${saved.length} plików (${[...done].length} stron, ${[...doneAssets].length} plików pomocniczych).`);
if (problems.length) console.log('Pominięte:\n  ' + problems.join('\n  '));
