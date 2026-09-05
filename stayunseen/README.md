# Stay Unseen — website

Product page for the extension, built into this folder so it can be uploaded as-is.
Static: no build step, no dependencies, no server-side anything.

```
web/
  index.html      the product page
  privacy.html    the privacy policy, same shell
  styles.css      one stylesheet for both pages
  script.js       accent switch, reveals, card tilt, canvas field, gallery tabs
  assets/         popup screenshots, the extension icon, the comparison illustration
  downloads/      the three packaged builds the download buttons point at
```

Deploy by copying the folder to a static host. Every path in the HTML is relative, so
it works from a subdirectory (`/stay-unseen/`) as well as from a domain root.

`site/` is a separate, earlier attempt by another tool and is not used by anything here.

## Design

Ported from the `mheadowshtml.html` personal-space template: the same single-hue colour
system, canvas particle and wireframe field, perspective grid, floating orbs, tilting 3D
card stage with HUD and scan-line treatment, and `IntersectionObserver` reveals.

The one hue in `--ps-h` derives every colour on the page. It defaults to **272** —
the extension popup's own `#c084fc` violet — and the header switch moves it to 210 (blue)
or 139 (green), remembered in `localStorage`. Changing the default means changing that
one number in `styles.css` and the matching `data-ps-theme` attribute in the HTML.

`--brand-gradient` (Facebook blue → violet → Instagram magenta → orange) is deliberately
*not* hue-derived: it is the icon's own artwork and stays fixed across accents.

## The screenshots

`assets/popup-*.png` are real captures of the extension's own popup — its unmodified
`popup/popup.html`, `popup.css` and `popup.js` — not mockups. Regenerate them with:

```bash
python3 tools/capture-popup.py
```

That script renders the popup in headless Firefox behind a stubbed `chrome.storage.local`,
once per UI state, at 2× device pixel ratio and the popup's real 372 px width. It seeds the
stored counters and log rows so the states are reproducible, spoofs a Chrome user agent
(so the status row reads `active (DNR)`, matching the Chrome build) and anchors the clock
so log timestamps do not change between runs. Its docstring covers the details.

Six states, matching the gallery tabs: `popup-main`, `popup-per-feature`, `popup-paused`,
`popup-status`, `popup-diagnostics`, `popup-main-light`.

The gallery shows each capture at its full height inside a 372 px frame that scrolls, so
nothing is cropped. If a regenerated capture changes height, update the `height` attribute
on its `<img>` in `index.html` (CSS px = image height ÷ 2) so the page does not reflow while
images load.

`assets/whatitdoes.jpeg` is a drawn illustration, not a capture, and is captioned as such
on the page.

## The downloads

`downloads/` holds its own copies of the three zips rather than linking into `dist/`,
because `build.py` clears `dist/` on every run. After cutting a new version:

```bash
cp dist/*.zip web/downloads/
```

Then update the version string and the three download `href`s in `index.html`, the
`ps-status-pill` text, and the footer line on both pages.

## Local preview

```bash
python3 -m http.server 8731 --directory web
```

Then open <http://localhost:8731/>. Opening `index.html` straight off disk works too;
only the `file://` origin makes the download links behave slightly differently.
