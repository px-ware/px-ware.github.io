# px-ware.github.io

Zapasowa, statyczna kopia strony [pxware.pl](https://pxware.pl) (razem z SafeCheck, NetworkMaster i FlashTools),
publikowana przez GitHub Pages pod adresem https://px-ware.github.io.

- `docs/` to gotowa strona (to ją serwuje GitHub Pages: gałąź `main`, folder `/docs`).
- `tools/mirror.mjs` tworzy `docs/` od nowa, pobierając aktualne strony z pxware.pl.

## Tryby

**backup** (obecny): strona działa, ale każda podstrona wskazuje Google (`<link rel="canonical">`), że oryginałem jest pxware.pl.
Dzięki temu w wynikach wyszukiwania nie ma duplikatów, a cała pozycja w Google zostaje przy pxware.pl.

**primary**: kopia staje się główną stroną: adresy kanoniczne, mapy witryn i `robots.txt` wskazują px-ware.github.io.
Na to trzeba przełączyć, gdy domena pxware.pl przestanie działać.

## Odświeżenie kopii (po zmianach na pxware.pl)

```
node tools/mirror.mjs
git add -A && git commit -m "Odświeżenie kopii" && git push
```

## Przełączenie na github.io jako główną stronę

Zrób to, **zanim** domena wygaśnie (skrypt pobiera strony z pxware.pl).
Adres pxware@pxware.pl przestanie działać razem z domeną, więc podaj inny:

```
CONTACT_EMAIL=nowy@adres.pl node tools/mirror.mjs --mode=primary
git add -A && git commit -m "github.io jako główna strona" && git push
```

Potem w Google Search Console dla usługi `https://px-ware.github.io/` prześlij mapy witryn
(`sitemap.xml`, `safecheck/sitemap.xml`, `networkmaster/sitemap.xml`, `flashtools/sitemap.xml`).

Jeśli domena już wygasła: pełna kopia hostingu jest w prywatnym repozytorium `px-ware/strony`.
Można ją uruchomić lokalnie (`php -S localhost:8000 -t www`) i wskazać jako źródło:
`SOURCE=http://localhost:8000 CONTACT_EMAIL=... node tools/mirror.mjs --mode=primary`.

## Czego kopia nie ma

- formularza kontaktowego (wymaga PHP): zamiast niego jest przycisk otwierający e-mail,
- licznika statystyk i panelu `/zero`,
- automatycznie aktualizowanych numerów wersji z GitHuba: kopia pokazuje stan z chwili ostatniego odświeżenia.
