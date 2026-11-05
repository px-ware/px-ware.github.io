// ===== WSPÓLNE FUNKCJE POMOCNICZE (ładowane na każdej stronie) =====

// Rok w stopce
const footerYear = document.getElementById('footerYear');
if (footerYear) footerYear.textContent = new Date().getFullYear();

// Zliczanie kliknięć (anonimowo, bez cookies)
document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('a, button, summary, .tab');
    if (!el) return;
    const link = el.tagName === 'A';
    const data = JSON.stringify({
        p: location.pathname,
        k: link ? 'link' : 'button',
        t: link ? (el.getAttribute('href') || '') : '',
        l: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
    });
    try {
        if (navigator.sendBeacon) navigator.sendBeacon('/flashtools/e', data);
        else fetch('/flashtools/e', { method: 'POST', body: data, keepalive: true });
    } catch (err) { }
}, { capture: true, passive: true });

// Podświetlenie aktywnej pozycji menu (porównanie adresu linku z adresem strony)
const normalizePath = p => p.replace(/index\.html$/, '');
document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', normalizePath(a.pathname) === normalizePath(location.pathname));
});

// Przełączanie zakładek (.tabs > .tab[data-target])
document.querySelectorAll('.tabs').forEach(g => {
    g.addEventListener('click', e => {
        const tab = e.target.closest('.tab');
        if (!tab || !g.contains(tab)) return;
        Array.from(g.children).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tgt = tab.getAttribute('data-target');
        g.parentElement.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById(tgt);
        if (content) content.classList.add('active');
        g.dispatchEvent(new CustomEvent('tabchange', { detail: tgt }));
    });
});

function copyTextToClipboard(txt, btn = null) {
    navigator.clipboard.writeText(txt).then(() => {
        if (btn) { const orig = btn.innerText; btn.innerText = "✅"; setTimeout(() => btn.innerText = orig, 1500); }
    }).catch(() => prompt("Skopiuj ręcznie:", txt));
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Luminancja względna wg WCAG (kolor w formacie #rrggbb)
function getLuminance(hex) {
    const x = parseInt(hex.slice(1), 16);
    const a = [(x >> 16) & 255, (x >> 8) & 255, x & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
function contrastRatio(hexA, hexB) {
    const la = getLuminance(hexA), lb = getLuminance(hexB);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// Leniwe ładowanie bibliotek używanych rzadko (np. pdf.js)
const loadedScripts = {};
function loadScript(src) {
    if (!loadedScripts[src]) {
        loadedScripts[src] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.onload = resolve;
            s.onerror = () => { delete loadedScripts[src]; reject(new Error('Nie udało się wczytać ' + src)); };
            document.head.appendChild(s);
        });
    }
    return loadedScripts[src];
}

// Obsługa przeciągania i upuszczania plików na .drop-zone
function setupDropZone(zone, onFiles) {
    if (!zone) return;
    ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('dragover'); }));
    zone.addEventListener('drop', e => { if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); });
}

function storageGet(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
}
function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { }
}
