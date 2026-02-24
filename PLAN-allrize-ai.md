# allrize.ai — Portfolio Site Implementation Brief

> **For**: Coding agent / implementer
> **Brand**: allrize.ai
> **Deploy to**: rzrizaldy.github.io
> **Style**: Classic Macintosh System 6 (1984–1991 monochrome era)
> **Owner**: Rizaldy Al Kautsar Utomo

---

## Context

Build a single-page portfolio website at `rzrizaldy.github.io` branded as **allrize.ai**. The page simulates a **Mac System 6 desktop** — the entire viewport IS the desktop, with floating windows on it. Uses the **system.css** library for authentic retro Mac UI components. Showcases Rizaldy's identity as a builder, his 3 flagship AI projects, and a CTA for Summer 2026 internships.

---

## File Structure

```
rzrizaldy.github.io/
├── index.html          ← Single self-contained file (CSS + JS embedded)
├── assets/
│   ├── og-image.png    ← Open Graph social preview (1200x630)
│   ├── favicon.ico     ← Classic Mac icon favicon
│   └── resume.pdf      ← Downloadable resume (copy from OneDrive)
├── CNAME               ← Optional: future custom domain
└── README.md           ← Repo description
```

> **Core principle**: Single `index.html` with ALL CSS and JS embedded inline. No build step. Only external dependency is system.css via CDN.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| CSS Framework | `system.css` via `https://unpkg.com/@sakun/system.css` | Authentic System 6 Mac look out-of-the-box |
| Font | `ChicagoFLF` (free web font, embed via base64 or Google Fonts fallback) | The iconic classic Mac font |
| JS | Vanilla JS, zero dependencies (~100 lines) | Draggable windows, z-index focus, menu interactions |
| Hosting | GitHub Pages (static) | Free, `rzrizaldy.github.io` |
| Icons | Inline SVG or CSS pixel art + emoji | Mac folder, document, floppy disk icons |

---

## system.css Components Reference

CDN: `https://unpkg.com/@sakun/system.css`
Docs: `https://sakofchit.github.io/system.css/`

Key components to use:

```html
<!-- Window -->
<div class="window">
  <div class="title-bar">
    <button aria-label="Close" class="close"></button>
    <h1 class="title">Window Title</h1>
    <button aria-label="Resize" class="resize"></button>
  </div>
  <div class="details-bar"><span>4 items</span></div>
  <div class="separator"></div>
  <div class="window-pane">Content here</div>
</div>

<!-- Menu Bar -->
<ul role="menu-bar">
  <li role="menu-item" tabindex="0" aria-haspopup="true">
    Menu Name
    <ul role="menu">
      <li role="menu-item"><a href="#">Item</a></li>
    </ul>
  </li>
</ul>

<!-- Modal Dialog (for Hire Me CTA) -->
<div class="modal-dialog outer-border">
  <div class="inner-border center">
    <div class="modal-contents">
      <h1 class="modal-text">Title</h1>
      <section class="field-row">Content</section>
    </div>
  </div>
</div>

<!-- Buttons -->
<button class="btn">Normal</button>
<button class="btn btn-default">Primary (bold border)</button>
```

---

## Page Architecture

The page simulates a Mac System 6 desktop. Four "windows" float on a patterned desktop background.

### 1. Menu Bar (fixed top)

```
┌──────────────────────────────────────────────────────────┐
│  🍎 allrize.ai  │  File  │  About  │  Projects  │  Contact  │         3:42 PM │
└──────────────────────────────────────────────────────────┘
```

- Uses system.css `role="menu-bar"` component
- **Apple menu (🍎 allrize.ai)**: Dropdown with "About This Mac..." → fun dialog ("Rizaldy OS v1.0 · 7 yrs experience · 128MB of ambition")
- **File**: "Download Resume" link, "View Source" → GitHub repo link
- **About**: Scrolls to / focuses the About Me window
- **Projects**: Scrolls to / focuses the Projects window
- **Contact**: Scrolls to / focuses the Hire Me dialog
- **Right-aligned clock**: Shows current time (vanilla JS `setInterval`)

### 2. Desktop Background

- Classic Mac crosshatch/checkerboard pattern via CSS repeating background
- Color: `#666699` tinted purple-gray (classic Mac desktop) or subtle dithered pattern
- Can use CSS: `background: repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%) 0 0 / 4px 4px;`

### 3. Boot Sequence (Easter Egg — Optional but Recommended)

- On page load, show 1.5-second "Happy Mac" startup screen:
  - Centered classic Mac smiling face icon (CSS pixel art or inline SVG)
  - Then desktop fades in
  - Sets the retro tone immediately

---

## Window Specifications

### Window A: "About_Rizaldy.txt" — The ReadMe

**Position**: Upper-left area (desktop), full-width (mobile)
**Size**: ~500px wide, auto height

```
┌──────────────────────────────────────────┐
│ [x]     About_Rizaldy.txt          [□]  │
├──────────────────────────────────────────┤
│ 4 items          12.7 MB available       │
├──────────────────────────────────────────┤
│                                          │
│  I architect responsible AI solutions    │
│  for developing markets.                 │
│                                          │
│  📍 Pittsburgh, PA (from Jakarta, ID)    │
│  🎓 Carnegie Mellon University           │
│     MS Public Policy - Data Analytics    │
│     AI Management Concentration          │
│     Expected May 2027                    │
│                                          │
│  💼 7 years @ Telkomsel (largest telco   │
│     in Indonesia). Data Scientist II.    │
│     ML models, mobility data pipelines.  │
│                                          │
│  🏆 Awards:                              │
│     • 1st Place Prompt-a-Thon (MSFT)     │
│     • LPDP Full-Ride to CMU              │
│     • 1st AWS PRFAQ Challenge            │
│     • Ganesha Karsa (ITB top honor)      │
│                                          │
│  🛠 Skills:                              │
│  [Python] [SQL] [PySpark] [JS]           │
│  [Hadoop] [PostgreSQL] [MongoDB]         │
│  [Tableau] [PowerBI] [Streamlit]         │
│  [ML] [GenAI] [GCP] [AWS]               │
│                                          │
└──────────────────────────────────────────┘
```

**Content source** (use this text):

> I architect responsible AI solutions for developing markets — ensuring technology helps people thrive, not just survive.
>
> My professional journey began at Indonesia's telecommunications sector. During 7 years at Telkomsel, I deployed credit-scoring models that expanded financial inclusion, designed campaign algorithms that significantly lifted revenue, and led mobility data pipelines at national scale.
>
> A full-ride LPDP scholarship brought me from Bandung to Pittsburgh. At Carnegie Mellon's Heinz College, I study Data Analytics with an AI Management concentration — bringing an underrepresented international perspective to conversations on AI and public policy.

**Education**:
- Carnegie Mellon University, Heinz College — MS Public Policy & Management, Data Analytics (AI Management). Expected May 2027
- Institut Teknologi Bandung (ITB) — BS Information Systems & Technology. 2014–2018

**Awards**:
- 1st Place, Prompt-a-Thon — agentic AI ideation (Microsoft Indonesia, 2025)
- LPDP Scholarship Awardee — full-ride to CMU (Indonesian Endowment Fund, 2024)
- 1st Place, AWS PRFAQ Challenge — company-wide innovation (Amazon x Telkomsel, 2023)
- Ganesha Karsa — highest university distinction (ITB, 2018)

**Skills tags**: `Python` `SQL` `PySpark` `JavaScript` `HTML` `Hadoop` `PostgreSQL` `MySQL` `MongoDB` `Tableau` `PowerBI` `Looker` `Streamlit` `Plotly` `Machine Learning` `Generative AI` `GCP` `AWS`

---

### Window B: "allrize.ai/projects" — Finder Icon View

**Position**: Center-right area (desktop), full-width (mobile)
**Size**: ~600px wide

```
┌──────────────────────────────────────────────┐
│ [x]       allrize.ai / projects         [□]  │
├──────────────────────────────────────────────┤
│ 3 items          ♾ possibilities             │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │    🎨    │  │    🔍    │  │    📖    │   │
│  │  (card)  │  │  (card)  │  │  (card)  │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│  BukuGambar.AI  LPDP CTRL+F    Iqrava       │
│                                              │
│  "For my sons"  "For fellow    "For my       │
│                  scholars"      ummah"        │
│                                              │
│  [ Open → ]     [ Open → ]    [ Open → ]     │
│                                              │
└──────────────────────────────────────────────┘
```

**Three project cards**:

| # | Name | Tagline | For Whom | URL | Icon/Emoji |
|---|------|---------|----------|-----|------------|
| 1 | **BukuGambar.AI** | AI coloring pages from text & photos | "For my sons" 👨‍👦 | `https://bukugambar-ai.vercel.app` | 🎨 |
| 2 | **LPDP CTRL+F** | Find your dream university. 28,007 programs. | "For fellow scholars" 🎓 | `https://lpdp-find.vercel.app` | 🔍 |
| 3 | **Iqrava** | Quran tilawah tracker. Build streaks. | "For my ummah" ☪️ | `https://iqrava.vercel.app` | 📖 |

**Card design**: Each is a clickable unit styled like a Mac folder/app icon. CSS-styled preview box with large emoji + subtle gradient representing each app's color identity:
- BukuGambar.AI → warm cream bg (`#F7F6F3`), crayon motif
- LPDP CTRL+F → cool blue accent, search motif
- Iqrava → soft green accent, crescent motif

Each card has: icon area → name → tagline → "who it's for" → `[Open →]` button (system.css `.btn`). Opens live URL in new tab (`target="_blank"`).

---

### Window C: "Manifesto.txt" — Sticky Note

**Position**: Bottom-left (desktop), full-width (mobile)
**Size**: ~320px wide — smallest window

```
┌─────────────────────────────────┐
│ [x]    Manifesto.txt       [□]  │
├─────────────────────────────────┤
│                                 │
│  "Be a builder.                 │
│   Make information accessible.  │
│                                 │
│   For my sons.                  │
│   For my ummah.                 │
│   For fellow scholarship        │
│   hunters.                      │
│                                 │
│   And beyond."                  │
│                                 │
│            — Rizaldy, 2025      │
│                                 │
└─────────────────────────────────┘
```

- Smallest window, positioned like a sticky note
- Italic styling for quote feel (override system.css font for this window with `font-style: italic`)
- The core soul of the site

---

### Window D: "Hire Me" — Classic Mac Alert Dialog

**Position**: Bottom-right (desktop), full-width (mobile)
**Style**: system.css `modal-dialog outer-border` pattern

```
┌═══════════════════════════════════════════════┐
║ ┌───────────────────────────────────────────┐ ║
║ │  ⚠️  SEEKING SUMMER 2026 INTERNSHIP       │ ║
║ │                                           │ ║
║ │  I'm looking for:                         │ ║
║ │  AI Solutions · AI Engineering            │ ║
║ │  Analytics · Data Governance              │ ║
║ │                                           │ ║
║ │  📍 Based in Pittsburgh, PA               │ ║
║ │  🇺🇸 Open to US opportunities              │ ║
║ │                                           │ ║
║ │  ┌──────────────┐  ┌───────────────┐      │ ║
║ │  │ 📧 Email Me  │  │ 💾 Resume     │      │ ║
║ │  └──────────────┘  └───────────────┘      │ ║
║ │  ┌──────────────┐  ┌───────────────┐      │ ║
║ │  │ 🔗 LinkedIn  │  │ 🐙 GitHub     │      │ ║
║ │  └──────────────┘  └───────────────┘      │ ║
║ └───────────────────────────────────────────┘ ║
└═══════════════════════════════════════════════┘
```

**Four CTA buttons** (system.css `.btn`):
- **📧 Email Me** → `mailto:rutomo@andrew.cmu.edu` — use `.btn-default` (bold/primary)
- **💾 Resume** → `assets/resume.pdf` (download)
- **🔗 LinkedIn** → `https://linkedin.com/in/rizaldykautsar` (new tab)
- **🐙 GitHub** → `https://github.com/rzrizaldy` (new tab)

---

## Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| **Desktop (>1024px)** | Windows arranged in overlapping layout (CSS Grid/absolute positioning), draggable via JS, menu bar fixed top |
| **Tablet (768–1024px)** | Windows in 2-column grid, no drag, menu bar simplified |
| **Mobile (<768px)** | Windows stack vertically full-width, menu bar as hamburger or simplified row, no drag |

- Desktop: windows overlap slightly (like a real cluttered Mac desktop) with absolute/CSS grid positioning
- Mobile: windows have `width: 100%`, stacked in order: About → Projects → Manifesto → Hire Me
- Menu bar always visible at top

---

## JavaScript Features (~100 lines vanilla JS)

```
1. Window Focus     — Click any window → bring to front (z-index management)
2. Draggable        — Desktop only: mousedown on title-bar to drag. mouseup to stop.
3. Menu Nav         — Click menu items → scroll to / focus relevant window
4. Boot Animation   — DOMContentLoaded → show Happy Mac 1.5s → fade in desktop
5. Close/Restore    — Click [x] → hide window with animation. Menu item restores it.
6. Clock            — Right side of menu bar, updates every minute
```

---

## Meta / SEO / Social Sharing

```html
<title>allrize.ai — Rizaldy Utomo | Builder of AI for Developing Markets</title>
<meta name="description" content="Portfolio of Rizaldy Al Kautsar Utomo. CMU Heinz. Builder of BukuGambar.AI, LPDP CTRL+F, and Iqrava. Seeking Summer 2026 AI internship.">
<meta property="og:title" content="allrize.ai — Rizaldy Utomo">
<meta property="og:description" content="Classic Mac-styled portfolio. Builder of AI solutions for developing markets.">
<meta property="og:image" content="assets/og-image.png">
<meta property="og:url" content="https://rzrizaldy.github.io">
<meta name="twitter:card" content="summary_large_image">
```

---

## Implementation Checklist

1. [ ] Create `index.html` — full HTML skeleton with all 4 windows + menu bar
2. [ ] Embed `<style>` — import system.css CDN + custom desktop layout CSS + responsive breakpoints + ChicagoFLF font + desktop background pattern
3. [ ] Embed `<script>` — window focus, drag, menu nav, boot animation, clock
4. [ ] Create `assets/` — OG image, favicon (classic Mac icon), copy resume PDF from `/Users/rzrizaldy/Library/CloudStorage/OneDrive-Personal/#CMU-Lecture/0. Internship and Job/Resume - Rizaldy Utomo.pdf`
5. [ ] Create `README.md` — brief repo description
6. [ ] Test in browser — all windows render, links work, responsive behavior
7. [ ] Init git, commit, push to `rzrizaldy/rzrizaldy.github.io`
8. [ ] Verify live at `https://rzrizaldy.github.io`

---

## Contact Information (for links)

- **Email**: rutomo@andrew.cmu.edu
- **Phone**: +1 (412) 848-8366
- **GitHub**: github.com/rzrizaldy
- **LinkedIn**: linkedin.com/in/rizaldykautsar
- **Location**: Pittsburgh, PA, USA

---

*Generated: Feb 2026 — This is a build brief for an implementation agent. Do not modify the design intent without owner approval.*
