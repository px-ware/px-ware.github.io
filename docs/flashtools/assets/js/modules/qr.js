// ===== MODUŁ: KODY QR =====

// Domyślnie biblioteka koduje tylko znaki ASCII - polskie litery wymagają UTF-8
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

const QR_HISTORY_KEY = 'ft_qr_h';
let qrLogo = null;
let qrHistTimer;

const qrVal = id => document.getElementById(id).value;

// Znaki specjalne w formacie WIFI: \ ; , : "
const escWifi = s => s.replace(/([\\;,:"])/g, '\\$1');
// Znaki specjalne w vCard / iCalendar: \ ; , oraz nowe linie
const escVcf = s => s.replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');

// "2026-10-04T15:30" (czas lokalny) -> "20261004T133000Z" (UTC)
function toICalUtc(local) {
    if (!local) return '';
    const d = new Date(local);
    if (isNaN(d)) return '';
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function loadQrLogo(input) {
    if (input.files[0]) {
        const r = new FileReader();
        r.onload = e => { qrLogo = e.target.result; updateQR(); };
        r.readAsDataURL(input.files[0]);
    } else { qrLogo = null; updateQR(); }
}

function setQrPreset(fg, bg, rnd) {
    document.getElementById('qrFg').value = fg;
    document.getElementById('qrBg').value = bg;
    document.getElementById('qrRounded').checked = rnd;
    updateQR();
}

function getQrText() {
    const tab = document.querySelector('#qrTabs .tab.active').getAttribute('data-target');
    switch (tab) {
        case 'qr-url': return qrVal('q_url') || "https://example.com";
        case 'qr-text': return qrVal('q_txt') || " ";
        case 'qr-wifi': return `WIFI:T:${qrVal('q_wt')};S:${escWifi(qrVal('q_ws'))};P:${qrVal('q_wt') === 'nopass' ? '' : escWifi(qrVal('q_wp'))};;`;
        case 'qr-vcard': return `BEGIN:VCARD\nVERSION:3.0\nFN:${escVcf(qrVal('q_vn'))}\nORG:${escVcf(qrVal('q_vc'))}\nTEL:${escVcf(qrVal('q_vp'))}\nEMAIL:${escVcf(qrVal('q_ve'))}\nEND:VCARD`;
        case 'qr-email': {
            const subj = qrVal('q_es');
            return `mailto:${qrVal('q_em')}${subj ? '?subject=' + encodeURIComponent(subj) : ''}`;
        }
        case 'qr-sms': return `SMSTO:${qrVal('q_sp')}:${qrVal('q_sb')}`;
        case 'qr-phone': return `tel:${qrVal('q_ph')}`;
        case 'qr-geo': return `geo:${qrVal('q_gl')},${qrVal('q_gn')}`;
        case 'qr-social': return `${qrVal('q_so_p')}${qrVal('q_so_u')}`;
        case 'qr-crypto': {
            const amount = qrVal('q_cr_m').trim();
            return `${qrVal('q_cr_t')}:${qrVal('q_cr_a')}${amount ? '?amount=' + encodeURIComponent(amount) : ''}`;
        }
        case 'qr-event': {
            const lines = ['BEGIN:VEVENT', `SUMMARY:${escVcf(qrVal('q_ev_t'))}`];
            const start = toICalUtc(qrVal('q_ev_s')), end = toICalUtc(qrVal('q_ev_e'));
            if (start) lines.push(`DTSTART:${start}`);
            if (end) lines.push(`DTEND:${end}`);
            if (qrVal('q_ev_l')) lines.push(`LOCATION:${escVcf(qrVal('q_ev_l'))}`);
            lines.push('END:VEVENT');
            return lines.join('\n');
        }
    }
    return "FlashTools";
}

function updateQR() {
    const txt = getQrText();
    const fg = document.getElementById('qrFg').value;
    const bg = document.getElementById('qrBg').value;
    const round = document.getElementById('qrRounded').checked;
    const render = document.getElementById('qrRender');

    let qr;
    try {
        qr = qrcode(0, qrLogo || txt.length > 150 ? 'H' : 'M');
        qr.addData(txt);
        qr.make();
    } catch (e) {
        render.innerHTML = '<p class="qr-error">Za dużo danych do zakodowania w kodzie QR.</p>';
        return;
    }

    const size = 300, margin = 15, mCnt = qr.getModuleCount(), cSz = (size - margin * 2) / mCnt;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${bg}" rx="${round ? 16 : 0}"/>`;
    for (let r = 0; r < mCnt; r++) for (let c = 0; c < mCnt; c++) {
        if (qr.isDark(r, c)) svg += `<rect x="${margin + c * cSz}" y="${margin + r * cSz}" width="${cSz + .3}" height="${cSz + .3}" fill="${fg}" rx="${round ? cSz / 2 : 0}"/>`;
    }
    if (qrLogo) {
        const lSz = size * 0.25, lP = (size - lSz) / 2;
        svg += `<rect x="${lP - 5}" y="${lP - 5}" width="${lSz + 10}" height="${lSz + 10}" fill="${bg}" rx="10"/><image href="${qrLogo}" x="${lP}" y="${lP}" width="${lSz}" height="${lSz}"/>`;
    }
    svg += `</svg>`;
    render.innerHTML = svg;

    let rat = contrastRatio(bg, fg);
    if (qrLogo) rat -= 1.0;
    const bar = document.getElementById('qrReadability');
    bar.style.width = rat > 4.5 ? '100%' : (rat > 2.5 ? '50%' : '15%');
    bar.style.background = rat > 4.5 ? 'var(--success)' : (rat > 2.5 ? 'var(--warning)' : 'var(--danger)');

    // Zapis do historii dopiero gdy użytkownik przestanie pisać (a nie po każdym znaku)
    clearTimeout(qrHistTimer);
    qrHistTimer = setTimeout(() => addQrHist(txt), 1500);
}

function getQrHist() {
    try { return JSON.parse(storageGet(QR_HISTORY_KEY, '[]')) || []; } catch (e) { return []; }
}
function addQrHist(txt) {
    let hist = getQrHist();
    if (hist[0] === txt) return;
    hist = [txt, ...hist.filter(h => h !== txt)].slice(0, 10);
    storageSet(QR_HISTORY_KEY, JSON.stringify(hist));
    renderQrHist(hist);
}
function renderQrHist(h) {
    document.getElementById('qrHistory').innerHTML = h.map(i => `<div class="list-item">${escapeHtml(i)}</div>`).join('');
}
function clearQrHist() {
    storageSet(QR_HISTORY_KEY, '[]');
    renderQrHist([]);
}

function downloadQR(t) {
    const svg = document.querySelector("#qrRender svg");
    if (!svg) return;
    const svgStr = new XMLSerializer().serializeToString(svg);
    addQrHist(getQrText());
    if (t === 'svg') {
        downloadBlob(new Blob([svgStr], { type: "image/svg+xml" }), "FlashQR.svg");
    } else {
        const cvs = document.createElement("canvas"), ctx = cvs.getContext("2d"), img = new Image();
        img.onload = () => {
            cvs.width = img.width * 4; cvs.height = img.height * 4;
            ctx.scale(4, 4); ctx.drawImage(img, 0, 0);
            cvs.toBlob(b => downloadBlob(b, "FlashQR.png"), "image/png");
        };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
    }
}

// Zmiana zakładki typu kodu odświeża podgląd
document.getElementById('qrTabs').addEventListener('tabchange', updateQR);
renderQrHist(getQrHist());
updateQR();
