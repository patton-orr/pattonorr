// Typography for the immersive Bible reader's scripture body (serif, poetry,
// verse numbers, note highlights). The warm "paper" palette itself lives in
// globals.css as `.faith-theme` (shared with the Faith dashboard pages); these
// rules just consume those --reader-* / --hl-* variables from a .faith-theme
// ancestor (the reader root carries the class).
export function EsvStyles() {
  return (
    <style>{`
      .esv {
        font-family: var(--reader-serif);
        line-height: 1.85; color: var(--reader-fg); font-size: 1.05rem; }
      .esv .extra_text, .esv .copyright, .esv .footnotes { display: none; }
      .esv ::selection { background: rgba(156,107,61,.22); }
      .esv h3 {
        font-weight: 600; font-size: 0.95rem; margin: 2rem 0 0.5rem;
        color: var(--reader-heading); }
      .esv p { margin: 1rem 0; }
      .esv .verse-num, .esv .chapter-num {
        font-size: 0.62em; font-weight: 700; vertical-align: super; line-height: 0;
        color: var(--reader-muted); margin: 0 0.18em 0 0.05em;
        /* Iowan/Palatino default to old-style figures; force lining figures so
           the superscript verse numbers stay even. */
        font-variant-numeric: lining-nums; font-feature-settings: "lnum" 1; }
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
