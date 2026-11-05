// ===== MODUŁ: HASŁA =====

let allP = [];

// Losowy indeks 0..max-1 bez przekłamania rozkładu (odrzucanie wartości z "ogona" zakresu)
function secureRandomIndex(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
}

function genPass() {
    let c = "";
    if (document.getElementById('pUp').checked) c += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (document.getElementById('pLo').checked) c += "abcdefghijklmnopqrstuvwxyz";
    if (document.getElementById('pNu').checked) c += "0123456789";
    if (document.getElementById('pSy').checked) c += "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    if (!c) { c = "abcdefghijklmnopqrstuvwxyz"; document.getElementById('pLo').checked = true; }

    const len = parseInt(document.getElementById('p_len').value);
    const cnt = Math.min(20, Math.max(1, parseInt(document.getElementById('p_cnt').value) || 1));

    allP = [];
    for (let p = 0; p < cnt; p++) {
        let s = "";
        for (let i = 0; i < len; i++) s += c[secureRandomIndex(c.length)];
        allP.push(s);
    }
    document.getElementById('p_out').textContent = allP[0];
    const ext = document.getElementById('p_ext');
    if (cnt > 1) { ext.style.display = 'block'; ext.innerHTML = allP.slice(1).map(x => `<div>${escapeHtml(x)}</div>`).join(''); }
    else ext.style.display = 'none';
    document.getElementById('p_copyBtn').innerText = cnt > 1 ? 'Skopiuj wszystkie' : 'Skopiuj hasło';
}

function copyPassMain() { copyTextToClipboard(allP.join('\n'), document.getElementById('p_copyBtn')); }

// Polska odmiana: 1 sekunda, 2 sekundy, 5 sekund
function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, dd = n % 100;
    return (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) ? few : many;
}

function formatCrackTime(sec) {
    if (sec < 1) return 'mniej niż sekunda';
    const units = [
        [60 * 60 * 24 * 365 * 100, 'wiek', 'wieki', 'wieków'],
        [60 * 60 * 24 * 365, 'rok', 'lata', 'lat'],
        [60 * 60 * 24 * 30, 'miesiąc', 'miesiące', 'miesięcy'],
        [60 * 60 * 24, 'dzień', 'dni', 'dni'],
        [60 * 60, 'godzina', 'godziny', 'godzin'],
        [60, 'minuta', 'minuty', 'minut'],
        [1, 'sekunda', 'sekundy', 'sekund']
    ];
    for (const [size, one, few, many] of units) {
        if (sec >= size) {
            const n = Math.round(sec / size);
            if (size === units[0][0] && n > 1000) return 'wieki wieków';
            return `${n} ${plural(n, one, few, many)}`;
        }
    }
}

const passWarnings = [
    ['top-10 ', 'Bardzo popularne hasło (Top 10)!'],
    ['top-100 ', 'Bardzo popularne hasło (Top 100)!'],
    ['very common', 'To jedno z najczęściej używanych haseł.'],
    ['similar to a commonly used', 'Hasło jest podobne do często używanego.'],
    ['names', 'Imiona i nazwiska to słabe hasła.'],
    ['straight rows', 'Wzory klawiaturowe są słabe.'],
    ['short keyboard patterns', 'Krótkie wzory klawiaturowe są łatwe do odgadnięcia.'],
    ['repeats', 'Powtórzenia są łatwe do odgadnięcia.'],
    ['sequences', 'Sekwencje (abc, 123) są łatwe do odgadnięcia.'],
    ['recent years', 'Ostatnie lata są łatwe do odgadnięcia.'],
    ['dates', 'Daty są łatwe do odgadnięcia.'],
    ['a word by itself', 'Pojedyncze słowo jest łatwe do odgadnięcia.']
];

function checkPass() {
    const v = document.getElementById('p_chk').value;
    const b = document.getElementById('p_bar'), t = document.getElementById('p_txt');
    const c = document.getElementById('p_crk'), w = document.getElementById('p_warn');
    if (!v) { b.style.width = '0%'; t.innerText = 'Wpisz hasło, aby je ocenić'; t.style.color = ''; c.innerText = ''; w.innerText = ''; return; }

    const res = zxcvbn(v);
    const cols = ["var(--danger)", "var(--warning)", "var(--warning)", "var(--success)", "var(--success)"];
    const lbl = ["Bardzo Słabe", "Słabe", "Średnie", "Silne", "Pancerne ⚡"];
    b.style.width = (res.score + 1) * 20 + '%';
    b.style.background = cols[res.score];
    t.innerText = lbl[res.score];
    t.style.color = cols[res.score];
    c.innerText = `Czas łamania: ${formatCrackTime(res.crack_times_seconds.offline_slow_hashing_1e4_per_second)}`;

    if (res.feedback.warning) {
        const raw = res.feedback.warning.toLowerCase();
        const found = passWarnings.find(([key]) => raw.includes(key));
        w.innerText = `⚠️ ${found ? found[1] : res.feedback.warning}`;
    } else w.innerText = "";
}

genPass();
