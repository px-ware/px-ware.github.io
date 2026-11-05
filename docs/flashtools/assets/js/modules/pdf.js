// ===== MODUŁ: NARZĘDZIA PDF =====

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const FONTKIT_URL = 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js';
// Czcionka z polskimi znakami do znaku wodnego (standardowe czcionki PDF ich nie obsługują)
const WATERMARK_FONT_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf';

let pFiles = [];
let pMode = 'merge';

function setPdfMode(m) {
    pMode = m; pFiles = [];
    document.getElementById('pdfList').innerHTML = '';
    document.getElementById('pdfBtn').style.display = 'none';
    document.getElementById('pdfOpt_extract').style.display = m === 'extract' ? 'block' : 'none';
    document.getElementById('pdfOpt_unlock').style.display = m === 'unlock' ? 'block' : 'none';
    document.getElementById('pdfOpt_watermark').style.display = m === 'watermark' ? 'flex' : 'none';
    document.getElementById('pdfIn').accept = m === 'img2pdf' ? '.png,.jpg,.jpeg' : '.pdf';
}

function handlePdf(f) {
    const isPdf = x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name);
    const isImg = x => x.type === 'image/jpeg' || x.type === 'image/png';
    pFiles = Array.from(f).filter(pMode === 'img2pdf' ? isImg : isPdf);
    // Tryby inne niż łączenie działają na jednym pliku
    if (pMode !== 'merge' && pMode !== 'img2pdf') pFiles = pFiles.slice(0, 1);

    const list = document.getElementById('pdfList');
    if (pFiles.length) {
        list.innerHTML = pFiles.map((x, i) => `<div class="file-item">${i + 1}. ${escapeHtml(x.name)}</div>`).join('');
        document.getElementById('pdfBtn').style.display = 'block';
    } else {
        list.innerHTML = `<div class="file-item error">Nieobsługiwany typ pliku. Wybierz ${pMode === 'img2pdf' ? 'zdjęcia JPG lub PNG' : 'pliki PDF'}.</div>`;
        document.getElementById('pdfBtn').style.display = 'none';
    }
    // Pozwala wybrać ponownie ten sam plik
    document.getElementById('pdfIn').value = '';
}

// "1, 3, 5-7" -> [0, 2, 4, 5, 6]
function parsePageList(str, pageCount) {
    const idxs = [];
    for (const part of str.split(',').map(s => s.trim()).filter(Boolean)) {
        const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
        if (!m) throw new Error(`Nieprawidłowy zapis: "${part}"`);
        const a = parseInt(m[1]), b = m[2] ? parseInt(m[2]) : a;
        for (let p = Math.min(a, b); p <= Math.max(a, b); p++) {
            if (p < 1 || p > pageCount) throw new Error(`Strona ${p} nie istnieje (dokument ma ${pageCount} stron).`);
            idxs.push(p - 1);
        }
    }
    if (!idxs.length) throw new Error('Podaj numery stron.');
    return idxs;
}

async function loadPdfLib(file) {
    try {
        return await PDFLib.PDFDocument.load(await file.arrayBuffer());
    } catch (e) {
        if (/encrypted/i.test(e.message)) throw new Error(`Plik "${file.name}" jest zabezpieczony. Użyj najpierw zakładki "Odblokuj".`);
        throw new Error(`Nie udało się odczytać pliku "${file.name}".`);
    }
}

// pdf-lib nie potrafi odszyfrować PDF, więc strony renderujemy przez pdf.js i składamy nowy plik.
// Wynik zawiera strony jako obrazy (tekst nie będzie zaznaczalny).
async function unlockPdf(file, password) {
    await loadScript(PDFJS_URL);
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        // Worker z innej domeny (CDN) nie może być uruchomiony bezpośrednio - uruchamiamy go z adresu Blob
        const code = await (await fetch(PDFJS_WORKER_URL)).text();
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    }

    let src;
    try {
        src = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password }).promise;
    } catch (e) {
        if (e.name === 'PasswordException') throw new Error(password ? 'Nieprawidłowe hasło.' : 'Ten plik wymaga hasła.');
        throw new Error('Nie udało się odczytać pliku PDF.');
    }

    const out = await PDFLib.PDFDocument.create();
    for (let i = 1; i <= src.numPages; i++) {
        const page = await src.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 2 });
        const cvs = document.createElement('canvas');
        cvs.width = vp.width; cvs.height = vp.height;
        await page.render({ canvasContext: cvs.getContext('2d'), viewport: vp }).promise;
        const jpg = await out.embedJpg(await (await fetch(cvs.toDataURL('image/jpeg', 0.92))).arrayBuffer());
        out.addPage([base.width, base.height]).drawImage(jpg, { x: 0, y: 0, width: base.width, height: base.height });
    }
    return out;
}

async function getWatermarkFont(doc, txt) {
    // Standardowa czcionka wystarcza dla znaków ASCII
    if (/^[\x20-\x7E]*$/.test(txt)) return doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    await loadScript(FONTKIT_URL);
    doc.registerFontkit(fontkit);
    const bytes = await (await fetch(WATERMARK_FONT_URL)).arrayBuffer();
    return doc.embedFont(bytes, { subset: true });
}

async function processPdf() {
    const btn = document.getElementById('pdfBtn');
    const origLabel = btn.innerText;
    btn.disabled = true; btn.innerText = '⏳ Przetwarzanie...';
    try {
        const { PDFDocument, rgb, degrees } = PDFLib;
        let final = await PDFDocument.create();

        if (pMode === 'merge') {
            for (const f of pFiles) {
                const d = await loadPdfLib(f);
                (await final.copyPages(d, d.getPageIndices())).forEach(p => final.addPage(p));
            }
        } else if (pMode === 'extract') {
            const src = await loadPdfLib(pFiles[0]);
            const idxs = parsePageList(document.getElementById('pdf_extr_val').value, src.getPageCount());
            (await final.copyPages(src, idxs)).forEach(p => final.addPage(p));
        } else if (pMode === 'unlock') {
            final = await unlockPdf(pFiles[0], document.getElementById('pdf_pass_val').value);
        } else if (pMode === 'watermark') {
            final = await loadPdfLib(pFiles[0]);
            const txt = document.getElementById('pdf_wm_txt').value;
            if (!txt.trim()) throw new Error('Podaj tekst znaku wodnego.');
            const sz = parseInt(document.getElementById('pdf_wm_sz').value) || 60;
            const hex = document.getElementById('pdf_wm_col').value;
            const color = rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
            const font = await getWatermarkFont(final, txt);

            // Wyśrodkowanie obróconego o 45° tekstu na stronie
            const tw = font.widthOfTextAtSize(txt, sz), th = font.heightAtSize(sz, { descender: false });
            const ang = Math.PI / 4;
            const offX = (tw / 2) * Math.cos(ang) - (th / 2) * Math.sin(ang);
            const offY = (tw / 2) * Math.sin(ang) + (th / 2) * Math.cos(ang);
            final.getPages().forEach(p => {
                const { width, height } = p.getSize();
                p.drawText(txt, { x: width / 2 - offX, y: height / 2 - offY, size: sz, font, color, opacity: 0.3, rotate: degrees(45) });
            });
        } else if (pMode === 'img2pdf') {
            for (const f of pFiles) {
                const bytes = await f.arrayBuffer();
                const img = f.type === 'image/jpeg' ? await final.embedJpg(bytes) : await final.embedPng(bytes);
                const pg = final.addPage();
                const scl = img.scaleToFit(pg.getWidth() - 40, pg.getHeight() - 40);
                pg.drawImage(img, { x: pg.getWidth() / 2 - scl.width / 2, y: pg.getHeight() / 2 - scl.height / 2, width: scl.width, height: scl.height });
            }
        }
        downloadBlob(new Blob([await final.save()], { type: "application/pdf" }), `Flash_${pMode}.pdf`);
    } catch (e) {
        console.error(e);
        alert("Błąd przetwarzania: " + (e.message || "sprawdź poprawność plików."));
    } finally {
        btn.disabled = false; btn.innerText = origLabel;
    }
}

setupDropZone(document.getElementById('pdfDrop'), handlePdf);
