// ===== MODUŁ: TEKST & MARKDOWN =====

function parseTxt() {
    const v = document.getElementById('t_in').value;
    document.getElementById('t_chr').innerText = v.length;
    document.getElementById('t_wrd').innerText = v.trim() ? v.trim().split(/\s+/).length : 0;
    document.getElementById('t_lin').innerText = v ? v.split('\n').length : 0;
    // DOMPurify usuwa z podglądu niebezpieczny kod (np. <script>, onerror=...)
    document.getElementById('t_out').innerHTML = v ? DOMPurify.sanitize(marked.parse(v)) : 'Podgląd HTML...';
}

function fmtTxt(t) {
    const e = document.getElementById('t_in');
    let v = e.value;
    if (t === 'UP') v = v.toUpperCase();
    if (t === 'LO') v = v.toLowerCase();
    if (t === 'CL') v = v.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').trim();
    // \p{L} obsługuje polskie litery (zwykłe \w ich nie rozpoznaje)
    if (t === 'TI') v = v.toLowerCase().replace(/(^|[^\p{L}\p{N}'])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
    e.value = v;
    parseTxt();
}

function genLorem() {
    const e = document.getElementById('t_in');
    const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    e.value = e.value ? e.value + '\n\n' + lorem : lorem;
    parseTxt();
}
