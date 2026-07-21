// Reader theme + typography for the immersive Bible reader.
//
// A warm "paper" (sepia) palette is centralized as CSS variables on
// `.reader-shell` — one place to tune, with a warm-dark variant for dark mode.
// The ESV HTML (verse numbers, headings, poetry) and note highlights are styled
// against those variables so the whole reader reads as one surface.
export function EsvStyles() {
  return (
    <style>{`
      .reader-shell {
        --reader-bg: #f7f1e3;
        --reader-surface: #f2ead9;
        --reader-fg: #37322a;
        --reader-muted: #9a8f79;
        --reader-heading: #857a5f;
        --reader-border: rgba(63,50,26,.13);
        --reader-accent: #9c6b3d;
        --hl-yellow: rgba(240,196,70,.42);
        --hl-green: rgba(150,198,110,.40);
        --hl-blue: rgba(120,170,224,.38);
        --hl-pink: rgba(233,138,166,.40);
      }
      @media (prefers-color-scheme: dark) {
        .reader-shell {
          --reader-bg: #17140f;
          --reader-surface: #1c1811;
          --reader-fg: #e7ddca;
          --reader-muted: #948a74;
          --reader-heading: #b6a684;
          --reader-border: rgba(233,219,186,.13);
          --reader-accent: #cf9f68;
          --hl-yellow: rgba(214,178,74,.36);
          --hl-green: rgba(138,190,120,.32);
          --hl-blue: rgba(128,170,224,.32);
          --hl-pink: rgba(222,140,170,.32);
        }
      }

      .esv { line-height: 1.85; color: var(--reader-fg); font-size: 1.05rem; }
      .esv .extra_text, .esv .copyright, .esv .footnotes { display: none; }
      .esv ::selection { background: rgba(156,107,61,.22); }
      .esv h3 {
        font-weight: 600; font-size: 0.95rem; margin: 2rem 0 0.5rem;
        color: var(--reader-heading); }
      .esv p { margin: 1rem 0; }
      .esv .verse-num, .esv .chapter-num {
        font-size: 0.62em; font-weight: 700; vertical-align: super; line-height: 0;
        color: var(--reader-muted); margin: 0 0.18em 0 0.05em; }
      .esv .block-indent { margin-left: 1.5rem; }
      .esv a { color: inherit; text-decoration: none; }

      /* Poetry: each line is already a block, so the ESV's <br> tags double the
         spacing. Drop them and set a tighter per-line rhythm, keeping a small
         gap between stanzas (the empty line-group markers). */
      .esv br { display: none; }
      .esv .line { display: block; line-height: 1.5; }
      .esv .begin-line-group { display: block; }
      .esv .begin-line-group:not(:first-child) { height: 0.55rem; }

      /* Highlights */
      .esv mark {
        background: transparent; color: inherit; border-radius: 0.15em;
        padding: 0 0.04em; cursor: pointer;
        -webkit-box-decoration-break: clone; box-decoration-break: clone; }
      .esv mark[data-c="yellow"] { background: var(--hl-yellow); }
      .esv mark[data-c="green"]  { background: var(--hl-green); }
      .esv mark[data-c="blue"]   { background: var(--hl-blue); }
      .esv mark[data-c="pink"]   { background: var(--hl-pink); }
      .esv mark[data-has-note="1"] {
        text-decoration: underline dotted; text-underline-offset: 0.2em;
        text-decoration-color: var(--reader-accent); }
    `}</style>
  );
}

export const ESV_COPYRIGHT =
  "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway. Used by permission. All rights reserved.";
