// ===== MODUŁ: STUDIO KOLORÓW =====

const hexToRgbStr = h => { const x = parseInt(h.slice(1), 16); return `${(x >> 16) & 255}, ${(x >> 8) & 255}, ${x & 255}`; };

function updColor() {
    const bg = document.getElementById('c_bg').value;
    const fg = document.getElementById('c_fg').value;
    document.getElementById('c_h_bg').innerText = bg; document.getElementById('c_r_bg').innerText = hexToRgbStr(bg);
    document.getElementById('c_h_fg').innerText = fg; document.getElementById('c_r_fg').innerText = hexToRgbStr(fg);

    const bx = document.getElementById('c_box');
    bx.style.backgroundColor = bg; bx.style.color = fg;

    const r = contrastRatio(bg, fg);
    const an = document.getElementById('c_an'), al = document.getElementById('c_al');
    document.getElementById('c_rat').innerText = r.toFixed(2);
    an.innerText = `Zwykły tekst: ${r >= 4.5 ? 'spełnia ✅' : 'nie spełnia ❌'}`; an.style.color = r >= 4.5 ? 'var(--success)' : 'var(--danger)';
    al.innerText = `Duży tekst: ${r >= 3.0 ? 'spełnia ✅' : 'nie spełnia ❌'}`; al.style.color = r >= 3.0 ? 'var(--success)' : 'var(--danger)';

    const cBase = parseInt(bg.slice(1), 16);
    const [rB, gB, bB] = [(cBase >> 16) & 255, (cBase >> 8) & 255, cBase & 255];
    let pal = '';
    for (let i = 0; i < 5; i++) {
        const f = 1 - (i * 0.15);
        const shade = '#' + [rB * f, gB * f, bB * f].map(x => Math.floor(x).toString(16).padStart(2, '0')).join('');
        pal += `<div class="palette-swatch" style="background:${shade};" title="${shade}" onclick="copyTextToClipboard('${shade}')"></div>`;
    }
    document.getElementById('c_pal').innerHTML = pal;
}

const cImg = new Image();
const cCvs = document.getElementById('c_cvs');
const cCtx = cCvs.getContext('2d', { willReadFrequently: true });

function loadColorImg(input) {
    if (!input.files[0]) return;
    const r = new FileReader();
    r.onload = e => {
        cImg.onload = () => { cCvs.width = cImg.width; cCvs.height = cImg.height; cCtx.drawImage(cImg, 0, 0); cCvs.style.display = 'block'; };
        cImg.src = e.target.result;
    };
    r.readAsDataURL(input.files[0]);
}

// Nasłuch rejestrowany raz (wcześniej dokładany przy każdym wczytaniu zdjęcia)
cCvs.addEventListener('click', evt => {
    const rect = cCvs.getBoundingClientRect();
    const x = Math.floor((evt.clientX - rect.left) * cCvs.width / rect.width);
    const y = Math.floor((evt.clientY - rect.top) * cCvs.height / rect.height);
    const p = cCtx.getImageData(x, y, 1, 1).data;
    const hex = "#" + ((p[0] << 16) | (p[1] << 8) | p[2]).toString(16).padStart(6, '0');
    document.getElementById('c_pick_box').style.background = hex;
    document.getElementById('c_pick_txt').innerText = hex;
    document.getElementById('c_bg').value = hex;
    updColor();
});
updColor();
