// Typography for ESV HTML content (verse numbers, headings, poetry).
export function EsvStyles() {
  return (
    <style>{`
      .esv { line-height: 1.9; color: #18181b; font-size: 1.05rem; }
      @media (prefers-color-scheme: dark) { .esv { color: #e4e4e7; } }
      .esv .extra_text, .esv .copyright, .esv .footnotes { display: none; }
      .esv h3 { font-weight: 600; font-size: 0.95rem; margin: 2rem 0 0.5rem; color: #71717a; }
      .esv p { margin: 1rem 0; }
      .esv .verse-num, .esv .chapter-num {
        font-size: 0.62em; font-weight: 700; vertical-align: super; line-height: 0;
        color: #a1a1aa; margin: 0 0.18em 0 0.05em; }
      .esv .block-indent { margin-left: 1.5rem; }
      .esv .line { display: block; }
      .esv a { color: inherit; text-decoration: none; }
    `}</style>
  );
}

export const ESV_COPYRIGHT =
  "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway. Used by permission. All rights reserved.";
