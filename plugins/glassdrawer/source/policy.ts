// GlassDrawer additions to Rain, MPL-2.0. https://looney.is-a.dev/
export const MENU_TOKENS = new Set([
    "BACKGROUND_FLOATING", "BACKGROUND_NESTED_FLOATING", "BACKGROUND_SURFACE_HIGH",
    "BACKGROUND_SURFACE_HIGHEST", "BG_SURFACE_OVERLAY", "BG_SURFACE_OVERLAY_TMP",
    "MODAL_BACKGROUND", "MODAL_FOOTER_BACKGROUND", "MOBILE_ACTIONSHEET_BACKGROUND",
    "MOBILE_ACTIONSHEET_GRADIENT_BACKGROUND_DEFAULT"
]);

export function clamp(value: number, min: number, max: number, fallback: number): number {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function validWallpaper(value: string): string | undefined {
    // Keep image fetching limited to HTTPS, without embedded login credentials.
    if (typeof value !== "string" || value.length > 2048) return;
    const url = value.trim();
    if (!/^https:\/\/[^\s/?#@]+(?:[/?#][^\s]*)?$/i.test(url)) return;
    return url;
}

export function neutralSurface(color: unknown): boolean {
    if (typeof color !== "string") return false;
    let rgb: number[];
    if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(color)) {
        rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    } else {
        const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (!match) return false;
        rgb = match.slice(1, 4).map(Number);
    }
    return Math.max(...rgb) <= 100 && Math.max(...rgb) - Math.min(...rgb) <= 28;
}

export function isLayoutSurface(style: Record<string, any>, pointerEvents?: string): boolean {
    // Leave click targets, avatars, image overlays, borders, and colourful cards alone.
    if (pointerEvents === "none" || !neutralSurface(style.backgroundColor)) return false;
    return Number(style.flex) > 0 || Number(style.flexGrow) > 0
        || (style.position === "absolute" && style.top === 0 && style.bottom === 0)
        || (typeof style.height === "number" && style.height >= 180
            && (style.width === "100%" || typeof style.width === "number" && style.width >= 180));
}
