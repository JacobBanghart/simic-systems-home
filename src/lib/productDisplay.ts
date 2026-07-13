const SET_CODE_SUFFIX = / \([A-Z0-9]{2,5}\)\s*$/u;

function stripSetCode(name: string): string {
  const match = name.match(SET_CODE_SUFFIX);
  return match ? name.slice(0, match.index) : name;
}

/**
 * Set name only, e.g. "Tarkir: Dragonstorm - Collector Booster Display (TDM)"
 * -> "Tarkir: Dragonstorm". Always splits at the *first* " - ", after
 * stripping any trailing set-code suffix — some catalog entries repeat the
 * set name again right before the code (e.g. "Innistrad: Crimson Vow -
 * Collector Booster Display - Innistrad: Crimson Vow (VOW)"), so the last
 * " - " lands in the wrong place; the first one is always the boundary
 * between the set name and the product type. Used on category listing
 * pages, which already convey the product type via a fixed suffix of their
 * own (" Collector Boosters" / " Play Boosters") so the type portion of the
 * name would be redundant.
 */
export function extractSetName(productName: string): string {
  const base = stripSetCode(productName);
  const sep = base.indexOf(" - ");
  return (sep >= 0 ? base.slice(0, sep) : base).trim();
}

/**
 * Full descriptive name (set + product type), e.g.
 * "Tarkir: Dragonstorm - Collector Booster Display (TDM)" ->
 * "Tarkir: Dragonstorm - Collector Booster Display" — only the trailing
 * set-code suffix is stripped, not the " - <product type>" portion (unlike
 * extractSetName). Used on the product detail page, which wants the full
 * descriptive name rather than just the set name.
 */
export function extractProductDisplayName(productName: string): string {
  const match = productName.match(SET_CODE_SUFFIX);
  if (!match) return productName.trim();
  const base = productName.slice(0, match.index);
  const sep = base.lastIndexOf(" - ");
  return (sep >= 0 ? base.slice(0, sep) : productName).trim();
}
