// ===== MODUŁ: OBRÓBKA OBRAZÓW =====

const iImg = new Image();
let iLoaded = false;

function loadImg(f) {
    if (!f || !f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = e => {
        iImg.onload = () => {
            const cvs = document.getElementById('i_cvs');
            cvs.width = iImg.width; cvs.height = iImg.height;
            cvs.getContext('2d').drawImage(iImg, 0, 0);
            cvs.style.display = 'block';
            document.getElementById('i_txt').style.display = 'none';
            iLoaded = true;
        };
        iImg.src = e.target.result;
    };
    r.readAsDataURL(f);
    document.getElementById('i_in').value = '';
}

function exportImg() {
    if (!iLoaded) { alert('Najpierw wybierz zdjęcie.'); return; }
    const fmt = document.getElementById('i_fmt').value;
    const src = document.getElementById('i_cvs');
    const out = document.createElement('canvas');
    out.width = src.width; out.height = src.height;
    const ctx = out.getContext('2d');
    // JPEG nie obsługuje przezroczystości - bez białego tła przezroczyste miejsca byłyby czarne
    if (fmt === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height); }
    ctx.drawImage(src, 0, 0);
    out.toBlob(b => downloadBlob(b, "Flash_Export." + fmt.split('/')[1]), fmt, parseInt(document.getElementById('i_q').value) / 100);
}

setupDropZone(document.getElementById('i_drop'), files => loadImg(files[0]));
