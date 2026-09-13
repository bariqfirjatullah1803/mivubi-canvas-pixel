"""Generator font pixel "MIVUBI Blok" (Regular, Bold) dan "MIVUBI Blok Display".

Setiap glyph digambar sebagai bitmap ('#' = pixel). Pixel yang bersebelahan
digabung menjadi satu kontur, lalu ditulis ke TTF dan WOFF2.

Jalankan:  pip install fonttools brotli && python scripts/build-pixel-font.py
Hasil:     static/fonts/mivubi-blok-{regular,bold,display}.{ttf,woff2}

1 pixel = 100 unit (UPM 1000), jadi huruf paling tajam di ukuran kelipatan 10px.
"""

from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

PX = 100
OUT = Path(__file__).resolve().parent.parent / "static" / "fonts"


def g(s: str) -> list[str]:
    return s.split()


# ---------------------------------------------------------------------------
# Teks: 5 kolom x 7 baris di atas baseline (+2 baris descender).
# ---------------------------------------------------------------------------
TEXT = {
    "A": g(".###. #...# #...# ##### #...# #...# #...#"),
    "B": g("####. #...# #...# ####. #...# #...# ####."),
    "C": g(".###. #...# #.... #.... #.... #...# .###."),
    "D": g("####. #...# #...# #...# #...# #...# ####."),
    "E": g("##### #.... #.... ####. #.... #.... #####"),
    "F": g("##### #.... #.... ####. #.... #.... #...."),
    "G": g(".###. #...# #.... #.### #...# #...# .###."),
    "H": g("#...# #...# #...# ##### #...# #...# #...#"),
    "I": g(".###. ..#.. ..#.. ..#.. ..#.. ..#.. .###."),
    "J": g("..### ...#. ...#. ...#. ...#. #..#. .##.."),
    "K": g("#...# #..#. #.#.. ##... #.#.. #..#. #...#"),
    "L": g("#.... #.... #.... #.... #.... #.... #####"),
    "M": g("#...# ##.## #.#.# #.#.# #...# #...# #...#"),
    "N": g("#...# #...# ##..# #.#.# #..## #...# #...#"),
    "O": g(".###. #...# #...# #...# #...# #...# .###."),
    "P": g("####. #...# #...# ####. #.... #.... #...."),
    "Q": g(".###. #...# #...# #...# #.#.# #..#. .##.#"),
    "R": g("####. #...# #...# ####. #.#.. #..#. #...#"),
    "S": g(".###. #...# #.... .###. ....# #...# .###."),
    "T": g("##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#.."),
    "U": g("#...# #...# #...# #...# #...# #...# .###."),
    "V": g("#...# #...# #...# #...# #...# .#.#. ..#.."),
    "W": g("#...# #...# #...# #.#.# #.#.# #.#.# .#.#."),
    "X": g("#...# #...# .#.#. ..#.. .#.#. #...# #...#"),
    "Y": g("#...# #...# .#.#. ..#.. ..#.. ..#.. ..#.."),
    "Z": g("##### ....# ...#. ..#.. .#... #.... #####"),
    "a": g("..... ..... .###. ....# .#### #...# .####"),
    "b": g("#.... #.... ####. #...# #...# #...# ####."),
    "c": g("..... ..... .###. #.... #.... #.... .###."),
    "d": g("....# ....# .#### #...# #...# #...# .####"),
    "e": g("..... ..... .###. #...# ##### #.... .###."),
    "f": g("..##. .#... .#... ####. .#... .#... .#..."),
    "g": g("..... ..... .#### #...# #...# #...# .#### ....# .###."),
    "h": g("#.... #.... ####. #...# #...# #...# #...#"),
    "i": g("..#.. ..... .##.. ..#.. ..#.. ..#.. .###."),
    "j": g("...#. ..... ..##. ...#. ...#. ...#. ...#. #..#. .##.."),
    "k": g("#.... #.... #..#. #.#.. ##... #.#.. #..#."),
    "l": g(".##.. ..#.. ..#.. ..#.. ..#.. ..#.. .###."),
    "m": g("..... ..... ##.#. #.#.# #.#.# #.#.# #...#"),
    "n": g("..... ..... ####. #...# #...# #...# #...#"),
    "o": g("..... ..... .###. #...# #...# #...# .###."),
    "p": g("..... ..... ####. #...# #...# #...# ####. #.... #...."),
    "q": g("..... ..... .#### #...# #...# #...# .#### ....# ....#"),
    "r": g("..... ..... #.##. ##..# #.... #.... #...."),
    "s": g("..... ..... .#### #.... .###. ....# ####."),
    "t": g(".#... .#... ####. .#... .#... .#..# ..##."),
    "u": g("..... ..... #...# #...# #...# #..## .##.#"),
    "v": g("..... ..... #...# #...# #...# .#.#. ..#.."),
    "w": g("..... ..... #...# #...# #.#.# #.#.# .#.#."),
    "x": g("..... ..... #...# .#.#. ..#.. .#.#. #...#"),
    "y": g("..... ..... #...# #...# #...# #...# .#### ....# .###."),
    "z": g("..... ..... ##### ...#. ..#.. .#... #####"),
    "0": g(".###. #...# #..## #.#.# ##..# #...# .###."),
    "1": g("..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###."),
    "2": g(".###. #...# ....# ...#. ..#.. .#... #####"),
    "3": g(".###. #...# ....# ..##. ....# #...# .###."),
    "4": g("...#. ..##. .#.#. #..#. ##### ...#. ...#."),
    "5": g("##### #.... ####. ....# ....# #...# .###."),
    "6": g("..##. .#... #.... ####. #...# #...# .###."),
    "7": g("##### ....# ...#. ..#.. .#... .#... .#..."),
    "8": g(".###. #...# #...# .###. #...# #...# .###."),
    "9": g(".###. #...# #...# .#### ....# ...#. .##.."),
    " ": g("..... ..... ..... ..... ..... ..... ....."),
    "!": g("..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#.."),
    "?": g(".###. #...# ....# ...#. ..#.. ..... ..#.."),
    ".": g("..... ..... ..... ..... ..... ..... ..#.."),
    ",": g("..... ..... ..... ..... ..... ..#.. ..#.. .#..."),
    ":": g("..... ..... ..#.. ..... ..... ..#.. ....."),
    ";": g("..... ..... ..#.. ..... ..... ..#.. ..#.. .#..."),
    "'": g("..#.. ..#.. ..... ..... ..... ..... ....."),
    '"': g(".#.#. .#.#. ..... ..... ..... ..... ....."),
    "`": g(".#... ..#.. ..... ..... ..... ..... ....."),
    "-": g("..... ..... ..... .###. ..... ..... ....."),
    "_": g("..... ..... ..... ..... ..... ..... ..... #####"),
    "+": g("..... ..#.. ..#.. ##### ..#.. ..#.. ....."),
    "=": g("..... ..... ##### ..... ##### ..... ....."),
    "/": g("....# ....# ...#. ..#.. .#... #.... #...."),
    "\\": g("#.... #.... .#... ..#.. ...#. ....# ....#"),
    "|": g("..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#.."),
    "(": g("...#. ..#.. .#... .#... .#... ..#.. ...#."),
    ")": g(".#... ..#.. ...#. ...#. ...#. ..#.. .#..."),
    "[": g(".###. .#... .#... .#... .#... .#... .###."),
    "]": g(".###. ...#. ...#. ...#. ...#. ...#. .###."),
    "{": g("...## ..#.. ..#.. .#... ..#.. ..#.. ...##"),
    "}": g("##... ..#.. ..#.. ...#. ..#.. ..#.. ##..."),
    "<": g("....# ...#. ..#.. .#... ..#.. ...#. ....#"),
    ">": g("#.... .#... ..#.. ...#. ..#.. .#... #...."),
    "@": g(".###. #...# #.### #.#.# #.### #.... .####"),
    "#": g(".#.#. .#.#. ##### .#.#. ##### .#.#. .#.#."),
    "$": g("..#.. .#### #.#.. .###. ..#.# ####. ..#.."),
    "%": g("##..# ##..# ...#. ..#.. .#... #..## #..##"),
    "&": g(".##.. #..#. #.#.. .#... #.#.# #..#. .##.#"),
    "*": g("..... #.#.# .###. ##### .###. #.#.# ....."),
    "^": g("..#.. .#.#. #...# ..... ..... ..... ....."),
    "~": g("..... ..... .#... #.#.# ...#. ..... ....."),
    "×": g("..... ..... #...# .#.#. ..#.. .#.#. #...#"),  # ×
    "·": g("..... ..... ..... ..#.. ..... ..... ....."),  # ·
    "°": g(".##.. #..#. .##.. ..... ..... ..... ....."),  # °
    "•": g("..... ..... .###. .###. .###. ..... ....."),  # •
    "…": g("..... ..... ..... ..... ..... ..... #.#.#"),  # …
    "–": g("..... ..... ..... ##### ..... ..... ....."),  # –
    "—": g("..... ..... ..... ##### ..... ..... ....."),  # —
    "‘": g("...#. ..#.. ..#.. ..... ..... ..... ....."),  # ‘
    "’": g("..#.. ..#.. .#... ..... ..... ..... ....."),  # ’
    "“": g(".#.#. #.#.. #.#.. ..... ..... ..... ....."),  # “
    "”": g(".#.#. .#.#. #.#.. ..... ..... ..... ....."),  # ”
    "←": g("..... ..#.. .#... ##### .#... ..#.. ....."),  # ←
    "→": g("..... ..#.. ...#. ##### ...#. ..#.. ....."),  # →
    "↑": g("..#.. .###. #.#.# ..#.. ..#.. ..#.. ....."),  # ↑
    "↓": g("..... ..#.. ..#.. ..#.. #.#.# .###. ..#.."),  # ↓
}

# ---------------------------------------------------------------------------
# Display: 5 kolom x 5 baris kapital tebal (+1 baris descender).
# ---------------------------------------------------------------------------
DISPLAY = {
    "A": g(".###. #...# ##### #...# #...#"),
    "B": g("####. #...# ####. #...# ####."),
    "C": g(".#### #.... #.... #.... .####"),
    "D": g("####. #...# #...# #...# ####."),
    "E": g("##### #.... ####. #.... #####"),
    "F": g("##### #.... ####. #.... #...."),
    "G": g(".#### #.... #..## #...# .####"),
    "H": g("#...# #...# ##### #...# #...#"),
    "I": g("##### ..#.. ..#.. ..#.. #####"),
    "J": g("..### ...#. ...#. #..#. .##.."),
    "K": g("#...# #..#. ###.. #..#. #...#"),
    "L": g("#.... #.... #.... #.... #####"),
    "M": g("#...# ##.## #.#.# #...# #...#"),
    "N": g("#...# ##..# #.#.# #..## #...#"),
    "O": g(".###. #...# #...# #...# .###."),
    "P": g("####. #...# ####. #.... #...."),
    "Q": g(".###. #...# #.#.# #..#. .##.#"),
    "R": g("####. #...# ####. #..#. #...#"),
    "S": g(".#### #.... .###. ....# ####."),
    "T": g("##### ..#.. ..#.. ..#.. ..#.."),
    "U": g("#...# #...# #...# #...# .###."),
    "V": g("#...# #...# #...# .#.#. ..#.."),
    "W": g("#...# #...# #.#.# ##.## #...#"),
    "X": g("#...# .#.#. ..#.. .#.#. #...#"),
    "Y": g("#...# .#.#. ..#.. ..#.. ..#.."),
    "Z": g("##### ...#. ..#.. .#... #####"),
    "0": g(".###. #..## #.#.# ##..# .###."),
    "1": g(".##.. ..#.. ..#.. ..#.. .###."),
    "2": g("####. ....# .###. #.... #####"),
    "3": g("####. ....# .###. ....# ####."),
    "4": g("#..#. #..#. ##### ...#. ...#."),
    "5": g("##### #.... ####. ....# ####."),
    "6": g(".###. #.... ####. #...# .###."),
    "7": g("##### ....# ...#. ..#.. ..#.."),
    "8": g(".###. #...# .###. #...# .###."),
    "9": g(".###. #...# .#### ....# .###."),
    " ": g("..... ..... ..... ..... ....."),
    ".": g("..... ..... ..... ..... ..#.."),
    ",": g("..... ..... ..... ..... ..#.. .#..."),
    "!": g("..#.. ..#.. ..#.. ..... ..#.."),
    "?": g(".###. #...# ..##. ..... ..#.."),
    "-": g("..... ..... .###. ..... ....."),
    ":": g("..... ..#.. ..... ..#.. ....."),
    "'": g("..#.. ..#.. ..... ..... ....."),
    '"': g(".#.#. .#.#. ..... ..... ....."),
    "&": g(".##.. #..#. .##.# #..#. .##.#"),
    "+": g("..... ..#.. .###. ..#.. ....."),
    "/": g("....# ...#. ..#.. .#... #...."),
    "(": g("..#.. .#... .#... .#... ..#.."),
    ")": g("..#.. ...#. ...#. ...#. ..#.."),
    "×": g("..... .#.#. ..#.. .#.#. ....."),
    "·": g("..... ..... ..#.. ..... ....."),
}
# Display tidak punya huruf kecil: a–z memakai glyph kapital.
for ch in "abcdefghijklmnopqrstuvwxyz":
    DISPLAY[ch] = DISPLAY[ch.upper()]


def pixels(rows: list[str], cap_rows: int, bold: bool) -> set[tuple[int, int]]:
    """Baris bitmap -> koordinat pixel (x, y) dengan y ke atas; baris cap terakhir duduk di baseline."""
    pts = {(x, cap_rows - 1 - r) for r, row in enumerate(rows) for x, c in enumerate(row) if c == "#"}
    if bold:  # bold pixel klasik: setiap pixel digeser 1 ke kanan dan digabung
        pts |= {(x + 1, y) for x, y in pts}
    return pts


def contours(pts: set[tuple[int, int]]) -> list[list[tuple[int, int]]]:
    """Gabungkan pixel menjadi kontur: sisi yang dipakai dua pixel saling meniadakan."""
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    for x, y in pts:
        # searah jarum jam (y ke atas) = kontur luar TrueType
        for a, b in (((x, y), (x, y + 1)), ((x, y + 1), (x + 1, y + 1)), ((x + 1, y + 1), (x + 1, y)), ((x + 1, y), (x, y))):
            if (b, a) in edges:
                edges.remove((b, a))
            else:
                edges.add((a, b))
    out_by_start: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for a, b in edges:
        out_by_start.setdefault(a, []).append(b)
    loops = []
    while out_by_start:
        start = next(iter(out_by_start))
        loop = [start]
        cur = start
        while True:
            nxt = out_by_start[cur].pop()
            if not out_by_start[cur]:
                del out_by_start[cur]
            if nxt == start:
                break
            loop.append(nxt)
            cur = nxt
        # buang titik di tengah garis lurus
        simple = [
            p
            for i, p in enumerate(loop)
            if (loop[i - 1][0] - p[0], loop[i - 1][1] - p[1]) != (p[0] - loop[(i + 1) % len(loop)][0], p[1] - loop[(i + 1) % len(loop)][1])
            and not (
                (loop[i - 1][0] == p[0] == loop[(i + 1) % len(loop)][0]) or (loop[i - 1][1] == p[1] == loop[(i + 1) % len(loop)][1])
            )
        ]
        loops.append(simple)
    return loops


def glyph_for(pts: set[tuple[int, int]]):
    pen = TTGlyphPen(None)
    for loop in contours(pts):
        pen.moveTo((loop[0][0] * PX, loop[0][1] * PX))
        for x, y in loop[1:]:
            pen.lineTo((x * PX, y * PX))
        pen.closePath()
    return pen.glyph()


def notdef(cap_rows: int):
    pen = TTGlyphPen(None)
    top = cap_rows * PX
    for (x0, y0, x1, y1), cw in (((0, 0, 500, top), True), ((100, 100, 400, top - 100), False)):
        pts = [(x0, y0), (x0, y1), (x1, y1), (x1, y0)] if cw else [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        pen.moveTo(pts[0])
        for p in pts[1:]:
            pen.lineTo(p)
        pen.closePath()
    return pen.glyph()


def build(family: str, style: str, table: dict[str, list[str]], cap_rows: int, x_rows: int, bold: bool, stem: str):
    width = 5 + (1 if bold else 0)
    advance = (width + 1) * PX
    order = [".notdef"]
    cmap, glyphs, metrics = {}, {".notdef": notdef(cap_rows)}, {".notdef": (advance, 0)}
    names_by_rows: dict[tuple[str, ...], str] = {}
    for ch, rows in table.items():
        assert all(len(r) == 5 for r in rows), f"{family} {ch!r}: setiap baris harus 5 kolom"
        assert cap_rows <= len(rows) <= cap_rows + 2, f"{family} {ch!r}: jumlah baris {len(rows)} tidak valid"
        key = tuple(rows)
        name = names_by_rows.get(key)
        if not name:  # glyph identik (mis. display a–z) berbagi satu glyph
            name = "space" if ch == " " else f"uni{ord(ch):04X}"
            names_by_rows[key] = name
            pts = pixels(rows, cap_rows, bold)
            glyphs[name] = glyph_for(pts)
            metrics[name] = (advance, min((x for x, _ in pts), default=0) * PX)
            order.append(name)
        cmap[ord(ch)] = name

    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    ascent, descent = (cap_rows + 2) * PX, -3 * PX
    fb.setupHorizontalHeader(ascent=ascent, descent=descent)
    fb.setupNameTable(
        {
            "familyName": family,
            "styleName": style,
            "uniqueFontIdentifier": f"{family.replace(' ', '')}-{style}",
            "fullName": f"{family} {style}",
            "psName": f"{family.replace(' ', '')}-{style}",
            "version": "Version 1.000",
            "copyright": "MIVUBI Canvas Pixel",
            "licenseDescription": "Font pixel buatan untuk MIVUBI Canvas Pixel.",
        }
    )
    fb.setupOS2(
        usWeightClass=700 if bold else 400,
        sTypoAscender=ascent,
        sTypoDescender=descent,
        sTypoLineGap=0,
        usWinAscent=ascent,
        usWinDescent=-descent,
        sxHeight=x_rows * PX,
        sCapHeight=cap_rows * PX,
        fsSelection=0x20 if bold else 0x40,
        achVendID="MVBI",
    )
    fb.setupPost(isFixedPitch=1)
    if bold:
        fb.font["head"].macStyle = 1
    OUT.mkdir(parents=True, exist_ok=True)
    fb.save(OUT / f"{stem}.ttf")
    font = TTFont(OUT / f"{stem}.ttf")
    font.flavor = "woff2"
    font.save(OUT / f"{stem}.woff2")
    return len(cmap)


def check():
    """Uji kecil: dua pixel bersebelahan jadi satu kontur, dan cincin 3x3 jadi luar + lubang."""
    assert len(contours({(0, 0), (1, 0)})) == 1
    ring = {(x, y) for x in range(3) for y in range(3)} - {(1, 1)}
    loops = contours(ring)
    assert len(loops) == 2 and sorted(len(loop) for loop in loops) == [4, 4]


if __name__ == "__main__":
    check()
    for args in (
        ("MIVUBI Blok", "Regular", TEXT, 7, 5, False, "mivubi-blok-regular"),
        ("MIVUBI Blok", "Bold", TEXT, 7, 5, True, "mivubi-blok-bold"),
        ("MIVUBI Blok Display", "Regular", DISPLAY, 5, 5, False, "mivubi-blok-display"),
    ):
        print(f"{args[0]} {args[1]}: {build(*args)} karakter -> static/fonts/{args[6]}.{{ttf,woff2}}")
