"""Illustrations du site Ma Petite Commune (styles A « ligne claire » et C « carte et données »).
Toutes les couleurs passent par les variables du site, pour suivre le mode clair et le mode sombre."""
import math

INK = "var(--pl-ink,#121614)"
INK2 = "var(--pl-ink-2,#59615C)"
LINE = "var(--pl-line,#D6DBD5)"
ACC = "var(--pl-accent,#2160C8)"
ACCS = "var(--pl-accent-soft,#DCE6F6)"
PANEL = "var(--pl-panel,#FBFCFA)"
RED = "#D64545"
# Tons de la mosaïque (style C) : dérivés de l'encre, donc lisibles dans les deux modes
TILES = [f"color-mix(in srgb,{INK} {p}%,{PANEL})" for p in (8, 14, 20, 11, 17)]

S = f'fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'


def svg(vb, body, title=None, cls="illus"):
    if title:
        return (f'<svg class="{cls}" xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" '
                f'aria-label="{title}">{body}</svg>')
    return f'<svg class="{cls}" xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" aria-hidden="true" focusable="false">{body}</svg>'


def flag(x, y):
    return (f'<line x1="{x}" y1="{y+45}" x2="{x}" y2="{y}" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'
            f'<rect x="{x}" y="{y}" width="12" height="22" fill="{ACC}"/>'
            f'<rect x="{x+12}" y="{y}" width="12" height="22" fill="#fff" stroke="{LINE}" stroke-width="1"/>'
            f'<rect x="{x+24}" y="{y}" width="12" height="22" fill="{RED}"/>')


def hexpts(x, y, r):
    return " ".join(f"{x+r*math.cos(math.radians(a+30)):.1f},{y+r*math.sin(math.radians(a+30)):.1f}" for a in range(0, 360, 60))


def pin(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0 C-16 0 -26 12 -26 26 C-26 46 0 68 0 68 '
            f'C0 68 26 46 26 26 C26 12 16 0 0 0Z" fill="{INK}"/><circle cx="0" cy="26" r="10" fill="{PANEL}"/></g>')


# ---------- A. Héros de l'accueil ----------
HERO = svg("0 0 600 400", f'''
<g {S}>
<path d="M20 300 C110 250 190 262 270 282 S450 240 580 290" stroke="{LINE}" stroke-width="2"/>
<line x1="30" y1="330" x2="570" y2="330"/>
<path d="M80 250 L130 208 L180 250"/><rect x="90" y="250" width="80" height="80"/><rect x="110" y="270" width="18" height="18"/><path d="M142 330 V296 H160 V330"/>
<path d="M210 200 L300 150 L390 200 Z"/><rect x="220" y="200" width="160" height="120"/><circle cx="300" cy="180" r="11"/><path d="M300 173 V180 L305 184"/>
<rect x="236" y="216" width="22" height="30"/><rect x="342" y="216" width="22" height="30"/><rect x="236" y="270" width="22" height="30"/><rect x="342" y="270" width="22" height="30"/>
<path d="M284 320 V284 A16 16 0 0 1 316 284 V320"/><path d="M206 330 V320 H394 V330"/>
<path d="M420 262 L462 228 L504 262"/><rect x="428" y="262" width="68" height="68"/><rect x="444" y="280" width="16" height="16"/>
<line x1="555" y1="330" x2="555" y2="285"/><circle cx="555" cy="262" r="24"/>
<line x1="45" y1="330" x2="45" y2="300"/><circle cx="45" cy="286" r="15"/>
</g>
{flag(300,105)}
<circle cx="468" cy="140" r="50" fill="{ACCS}" fill-opacity=".75" stroke="{ACC}" stroke-width="5"/>
<line x1="504" y1="176" x2="540" y2="212" stroke="{ACC}" stroke-width="11" stroke-linecap="round"/>
<g fill="{ACC}"><rect x="440" y="140" width="11" height="22" rx="2"/><rect x="456" y="126" width="11" height="36" rx="2"/><rect x="472" y="132" width="11" height="30" rx="2"/><rect x="488" y="116" width="11" height="46" rx="2"/></g>
<line x1="434" y1="164" x2="504" y2="164" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>
''', title="Illustration : la mairie d'un village et ses maisons, avec une loupe qui fait apparaître un petit graphique de ses finances", cls="illus illus-hero")

# ---------- Rubriques de l'accueil (A, sauf Observer en C) ----------
RUB_INFORMER = svg("0 0 140 80", f'''
<g {S}><rect x="14" y="10" width="78" height="60" rx="3"/><line x1="24" y1="22" x2="62" y2="22" stroke-width="4"/>
<line x1="24" y1="34" x2="82" y2="34"/><line x1="24" y1="43" x2="82" y2="43"/><line x1="24" y1="52" x2="70" y2="52"/><line x1="24" y1="61" x2="76" y2="61"/></g>
<circle cx="100" cy="42" r="18" fill="{ACCS}" fill-opacity=".8" stroke="{ACC}" stroke-width="3.5"/>
<line x1="113" y1="55" x2="126" y2="68" stroke="{ACC}" stroke-width="6" stroke-linecap="round"/>''')

RUB_APPRENDRE = svg("0 0 140 80", f'''
<path d="M30 34 H52 V70 H30Z M52 60 H84 V70 H52Z M84 34 H118 V70 H84Z" fill="{ACCS}"/>
<path d="M30 34 H52 M84 34 H118" stroke="{ACC}" stroke-width="3.5" stroke-linecap="round"/>
<g {S}><path d="M30 8 V70 H118 V20"/><path d="M52 8 V60 H84 V20"/><line x1="26" y1="8" x2="56" y2="8"/><line x1="80" y1="20" x2="122" y2="20"/></g>
<path d="M41 20 v8 m-4 -4 l4 4 l4 -4" fill="none" stroke="{ACC}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>''')

def mosaic(cols, rows, r, ox, oy, hi=None, dx=None):
    dx = dx or r * 1.75
    out = []
    for j in range(rows):
        for i in range(cols):
            x = ox + i * dx + (dx / 2 if j % 2 else 0)
            y = oy + j * r * 1.5
            fill = ACC if (i, j) == hi else TILES[(j * 3 + i * 7) % 5]
            out.append(f'<polygon points="{hexpts(x, y, r)}" fill="{fill}" stroke="{PANEL}" stroke-width="2"/>')
    return "".join(out)

RUB_OBSERVER = svg("0 0 140 80", mosaic(6, 4, 11, 18, 14, hi=(3, 2), dx=19) + pin(84.5, 6, .42))

# ---------- Vignettes des articles (A ; Observer en C) ----------
def hemicycle():
    out = []
    k = 0
    for rr, n in ((34, 9), (50, 13), (66, 17)):
        for i in range(n):
            a = math.radians(180 + 180 * i / (n - 1))
            x, y = 120 + rr * math.cos(a), 100 + rr * math.sin(a)
            col = ACC if i > n * 0.62 else INK2
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.2" fill="{col}"/>')
    return "".join(out)

VIG = {}
VIG["plf27-suivi"] = svg("0 0 240 120", f'''{hemicycle()}
<g {S}><rect x="106" y="86" width="28" height="18" rx="2"/><line x1="40" y1="108" x2="200" y2="108"/></g>''')

VIG["plf27-cpeb"] = svg("0 0 240 120", f'''
<g {S}><line x1="120" y1="22" x2="120" y2="104"/><path d="M98 104 H142"/><circle cx="120" cy="22" r="4"/>
<line x1="66" y1="36" x2="174" y2="50"/>
<path d="M66 36 L48 74 M66 36 L84 74 M174 50 L156 88 M174 50 L192 88"/>
<path d="M44 74 Q66 90 88 74Z M152 88 Q174 104 196 88Z"/></g>
<g fill="{ACC}" stroke="{PANEL}" stroke-width="2"><ellipse cx="66" cy="70" rx="13" ry="4.5"/><ellipse cx="66" cy="63" rx="13" ry="4.5"/><ellipse cx="66" cy="56" rx="13" ry="4.5"/><ellipse cx="174" cy="84" rx="13" ry="4.5"/></g>''')

VIG["plf27-dgf"] = svg("0 0 240 120", f'''
<g {S}><path d="M18 46 L54 28 L90 46Z"/><line x1="22" y1="100" x2="86" y2="100"/>
<line x1="30" y1="52" x2="30" y2="94"/><line x1="46" y1="52" x2="46" y2="94"/><line x1="62" y1="52" x2="62" y2="94"/><line x1="78" y1="52" x2="78" y2="94"/>
<path d="M150 70 L163 59 L176 70 V96 H150Z"/><path d="M186 76 L197 67 L208 76 V96 H186Z"/><path d="M212 82 L220 75 L228 82 V96 H212Z"/>
<line x1="140" y1="100" x2="232" y2="100"/></g>
<g fill="none" stroke="{ACC}" stroke-width="3" stroke-linecap="round"><path d="M96 50 Q128 28 160 46"/><path d="M96 62 Q150 36 196 54"/><path d="M96 74 Q170 48 220 62"/></g>
<g fill="{ACC}"><path d="M162 48 l-10 -2 l5 9Z"/><path d="M198 56 l-10 -1 l5 9Z"/><path d="M222 64 l-10 -1 l5 9Z"/></g>''')

VIG["plf27-fctva"] = svg("0 0 240 120", f'''
<g {S}><path d="M120 108 L146 40 M196 108 L162 40"/><path d="M158 100 V92 M156 76 V70 M154 58 V54" stroke-width="3"/>
<line x1="20" y1="108" x2="226" y2="108"/><line x1="66" y1="108" x2="66" y2="76"/><circle cx="66" cy="58" r="20"/><path d="M66 82 L56 70 M66 90 L76 78"/></g>
<circle cx="200" cy="30" r="17" fill="{ACC}"/><text x="200" y="36.5" text-anchor="middle" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="19" fill="{PANEL}">%</text>''')

VIG["plf27-tva-dilico"] = svg("0 0 240 120", f'''
<g {S}><path d="M30 16 V104 H218"/></g>
<line x1="30" y1="40" x2="218" y2="40" stroke="{INK}" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round"/>
<path d="M34 98 C70 92 96 76 120 58 C140 46 160 44 214 44" fill="none" stroke="{ACC}" stroke-width="4" stroke-linecap="round"/>
<path d="M120 58 C140 40 160 26 200 14" fill="none" stroke="{ACC}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round"/>''')

VIG["plf27-departements-regions"] = svg("0 0 240 120", f'''
<g fill="{PANEL}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round">
<path d="M40 24 L92 16 L106 46 L84 70 L44 64Z"/><path d="M106 46 L150 22 L196 34 L188 70 L140 78 L84 70Z"/>
<path d="M44 64 L84 70 L96 104 L50 108Z"/><path d="M84 70 L140 78 L150 106 L96 104Z" fill="{ACCS}"/><path d="M140 78 L188 70 L204 102 L150 106Z"/></g>
{pin(118, 44, .48)}''')

VIG["observer-fragilite"] = svg("0 0 240 120", mosaic(6, 5, 12, 18, 18, hi=(2, 2), dx=21) + f'''
<g transform="translate(146 30)"><rect width="84" height="62" rx="8" fill="{PANEL}" stroke="{LINE}" stroke-width="2"/>
<path d="M12 18 L30 22 L48 20 L64 34 L74 44" fill="none" stroke="{ACC}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="10" y1="52" x2="74" y2="52" stroke="{LINE}" stroke-width="2"/></g>''')

# ---------- C. Bandeau d'Observer ----------
OBS_BANNER = svg("0 0 1000 150", mosaic(30, 4, 24, 14, 22, hi=(19, 2), dx=34) + pin(684, 2, .9) + f'''
<g transform="translate(800 30)"><rect width="180" height="96" rx="12" fill="{PANEL}" stroke="{LINE}" stroke-width="2"/>
<path d="M18 70 L52 54 L86 60 L120 34 L156 24" fill="none" stroke="{ACC}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<g fill="{ACC}"><circle cx="18" cy="70" r="4"/><circle cx="52" cy="54" r="4"/><circle cx="86" cy="60" r="4"/><circle cx="120" cy="34" r="4"/><circle cx="156" cy="24" r="4"/></g>
<line x1="14" y1="82" x2="166" y2="82" stroke="{LINE}" stroke-width="2"/></g>''', cls="illus illus-banner")
