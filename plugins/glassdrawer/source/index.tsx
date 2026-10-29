// GlassDrawer additions to Rain, MPL-2.0. Author: LooneyHere.
import { after, instead } from "@api/patcher";
import { deleteJsxCreate, onJsxCreate } from "@api/react/jsx";
import { logger } from "@lib/utils/logger";
import { findByProps } from "@metro";
import { definePlugin, isPluginEnabled } from "@plugins";
import { _colorRef } from "@plugins/_core/painter/themes/updater";
import React from "react";
import * as Native from "react-native";

import { clamp, isLayoutSurface, MENU_TOKENS, validWallpaper } from "./policy";
import Settings from "./Settings";
import { useGlassDrawer } from "./storage";

type Panel = React.ReactElement<any>;
const DrawerScope = React.createContext(false);
let dispose: (() => void) | undefined;

function renderTarget(component: any): any {
    if (typeof component?.render === "function") return component;
    if (typeof component?.type?.render === "function") return component.type;
    if (typeof component?.prototype?.render === "function") return component.prototype;
}

export default definePlugin({
    name: "GlassDrawer",
    id: "glassdrawer",
    description: "Experimental drawer wallpaper by LooneyHere. Disable ServerDrawer first. looney.is-a.dev",
    version: "0.1.0",
    // No Discord snowflake ID was supplied, so do not create a profile identity.
    author: [],
    requiresRestart: true,
    settings: Settings,
    eagerStart() {
        dispose?.();
        if (isPluginEnabled("serverdrawer")) {
            throw new Error("Disable ServerDrawer and restart before enabling GlassDrawer.");
        }
        const viewTarget = renderTarget(Native.View);
        if (!viewTarget) throw new Error("GlassDrawer: this Discord version has no supported native View render hook.");

        let active = true;
        const listeners = new Set<() => void>();
        const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
        const useActive = () => React.useSyncExternalStore(subscribe, () => active);
        const unpatches: (() => unknown)[] = [];
        let loggedImageError = false;

        function ScopedSurface({ element }: { element: Panel }) {
            return <DrawerScope.Consumer>{enabled => {
                if (!enabled || !active || !React.isValidElement<any>(element)) return element;
                const style = Native.StyleSheet.flatten(element.props.style) ?? {};
                if (!isLayoutSurface(style, element.props.pointerEvents)) return element;
                return React.cloneElement(element, { style: [element.props.style, { backgroundColor: "transparent" }] });
            }}</DrawerScope.Consumer>;
        }

        function GlassPanel({ element }: { element: Panel }) {
            const state = useGlassDrawer();
            const running = useActive();
            const [imageError, setImageError] = React.useState(false);
            // Follow the supported LeftPanelContent wrapper convention used by Rain's ServerDrawer.
            const Original = element.type as (props: any) => Panel;
            const rendered = Original(element.props);
            const background = state.useThemeWallpaper ? _colorRef.current?.background?.url : undefined;
            const url = validWallpaper(background ?? "") ?? validWallpaper(state.wallpaperUrl);
            React.useEffect(() => { setImageError(false); }, [url]);
            const enabled = running && Boolean(url) && !imageError && React.isValidElement<any>(rendered);
            const fallback = running ? <DrawerScope.Provider value={false}>{rendered}</DrawerScope.Provider> : rendered;
            if (!enabled) return fallback;
            const originalStyle = Native.StyleSheet.flatten(rendered.props?.style) ?? {};
            return <DrawerScope.Provider value={true}>
                <Native.ImageBackground source={{ uri: url }} blurRadius={clamp(state.blur, 0, 20, 6)}
                    style={{ flex: 1, backgroundColor: "#14141c" }}
                    onError={() => {
                        if (!loggedImageError) logger.warn("[GlassDrawer] Wallpaper failed; restoring the original drawer.");
                        loggedImageError = true;
                        setImageError(true);
                    }}>
                    <Native.View pointerEvents="none" style={[Native.StyleSheet.absoluteFillObject,
                        { backgroundColor: `rgba(12,12,20,${clamp(state.drawerOpacity, 0.15, 0.95, 0.42)})` }]} />
                    {React.cloneElement(rendered, { style: [originalStyle, { backgroundColor: "transparent" }] })}
                </Native.ImageBackground>
            </DrawerScope.Provider>;
        }

        const wrapPanel = (_original: unknown, element: Panel) => {
            if (!React.isValidElement<any>(element) || typeof element.type !== "function") return element;
            return <GlassPanel key={element.key} element={element} />;
        };

        try {
            unpatches.push(after("render", viewTarget, (_args, ret) => {
                if (!active || !React.isValidElement<any>(ret)) return ret;
                return <ScopedSurface element={ret} />;
            }));
            const scrollTarget = renderTarget(Native.ScrollView);
            if (scrollTarget && scrollTarget !== viewTarget) {
                unpatches.push(after("render", scrollTarget, (_args, ret) => {
                    if (!active || !React.isValidElement<any>(ret)) return ret;
                    return <ScopedSurface element={ret} />;
                }));
            }
            const tokens = findByProps("SemanticColor");
            const resolver = tokens?.default?.meta ?? tokens?.default?.internal;
            if (typeof resolver?.resolveSemanticColor === "function") {
                unpatches.push(instead("resolveSemanticColor", resolver, (args, original) => {
                    const result = original(...args);
                    const state = useGlassDrawer.getState();
                    if (!active || !state.transparentMenus) return result;
                    const colorObject = args[1];
                    if (!colorObject || typeof colorObject !== "object") return result;
                    const key = colorObject[Object.getOwnPropertySymbols(colorObject)[0]];
                    return MENU_TOKENS.has(key)
                        ? `rgba(18,18,26,${clamp(state.menuOpacity, 0.15, 0.95, 0.65)})`
                        : result;
                }));
            }
            onJsxCreate("LeftPanelContent", wrapPanel);
        } catch (error) {
            active = false;
            unpatches.reverse().forEach(fn => fn());
            throw error;
        }
        dispose = () => {
            active = false;
            listeners.forEach(fn => fn());
            deleteJsxCreate("LeftPanelContent", wrapPanel);
            unpatches.reverse().forEach(fn => fn());
            dispose = undefined;
        };
    },
    stop() { dispose?.(); }
});
