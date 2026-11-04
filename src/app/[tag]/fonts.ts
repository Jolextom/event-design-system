import { Inter, Sora } from "next/font/google";

// next/font loaders must be called at module scope; every public event page imports from here.
// Inter for body text, Sora for headings (applied via the `display` class).
export const inter = Inter({ subsets: ["latin"], display: "swap" });
export const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-sora" });
export const display = "font-[family-name:var(--font-sora)]";
