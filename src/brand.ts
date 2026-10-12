/**
 * Zcash brand colors. ink and gold are the two published brand colors
 * (#231F20 black, #F4B728 yellow). paper, mute and line are neutrals
 * derived for text and borders on the ink background, not brand colors.
 *
 * Only the palette is used. The Zcash logo is a trademarked mark and is
 * deliberately not reproduced anywhere in this project.
 */
export const BRAND = {
  ink: "#231F20",
  gold: "#F4B728",
  paper: "#F5F3F0",
  mute: "#B4AEAF",
  line: "#4A4445",
} as const;

export type Style = "gold" | "goldBold" | "bold" | "dim";

const ESC = "\u001b[";
const RESET = `${ESC}0m`;

// 24-bit foreground for #F4B728
const GOLD = `${ESC}38;2;244;183;40m`;

const OPEN: Record<Style, string> = {
  gold: GOLD,
  goldBold: `${ESC}1m${GOLD}`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
};

export function colorEnabled(env: Record<string, string | undefined>, isTTY: boolean): boolean {
  const noColor = env["NO_COLOR"];
  if (noColor !== undefined && noColor !== "") return false;
  const force = env["FORCE_COLOR"];
  if (force !== undefined && force !== "" && force !== "0") return true;
  return isTTY;
}

export function paint(text: string, style: Style, enabled: boolean): string {
  return enabled ? `${OPEN[style]}${text}${RESET}` : text;
}
