// ===== MODUŁ: DEV TOOLS =====

let devMinify = false;

function procDev(minify = null) {
    if (minify !== null) devMinify = minify;
    const v = document.getElementById('d_in').value;
    const set = (id, val) => document.getElementById(id).value = val;
    const jOut = document.getElementById('d_json');

    if (!v) {
        ['d_md5', 'd_sha', 'd_b64e', 'd_b64d', 'd_json'].forEach(id => set(id, ''));
        return;
    }

    set('d_md5', CryptoJS.MD5(v).toString());
    set('d_sha', CryptoJS.SHA256(v).toString());
    set('d_b64e', btoa(unescape(encodeURIComponent(v))));
    try { set('d_b64d', decodeURIComponent(escape(atob(v.trim())))); }
    catch (e) { set('d_b64d', '(to nie jest poprawny Base64)'); }

    try {
        const p = JSON.parse(v);
        jOut.value = devMinify ? JSON.stringify(p) : JSON.stringify(p, null, 4);
        jOut.style.color = "var(--success)";
    } catch (e) {
        jOut.value = "Błąd JSON: " + e.message;
        jOut.style.color = "var(--danger)";
    }
}
