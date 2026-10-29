import { Stack, TableRowGroup, TableSwitchRow, TextInput } from "@metro/common/components";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { clamp } from "./policy";
import { glassDrawerSettings as settings, useGlassDrawer } from "./storage";

function Stepper({ title, value, change, step = 0.05, min = 0.15, max = 0.95, percent = true }: {
    title: string; value: number; change(value: number): void;
    step?: number; min?: number; max?: number; percent?: boolean;
}) {
    return <View style={{ flexDirection: "row", padding: 14, alignItems: "center", gap: 16 }}>
        <Text style={{ color: "#eee", flex: 1 }}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${title}`}
            onPress={() => change(clamp(value - step, min, max, min))} hitSlop={10}>
            <Text style={{ color: "#B59BEF", fontSize: 25 }}>−</Text>
        </Pressable>
        <Text style={{ color: "#eee", minWidth: 42, textAlign: "center" }}>{percent ? `${Math.round(value * 100)}%` : Math.round(value)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${title}`}
            onPress={() => change(clamp(value + step, min, max, min))} hitSlop={10}>
            <Text style={{ color: "#B59BEF", fontSize: 25 }}>+</Text>
        </Pressable>
    </View>;
}

export default function Settings() {
    const state = useGlassDrawer();
    return <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 70 }} keyboardShouldPersistTaps="handled">
        <Stack spacing={18}>
            <Text style={{ color: "#ddd", lineHeight: 21 }}>
                Experimental drawer wallpaper. Lower opacity makes the drawer more transparent. Wallpaper blur softens the image; it is not native frosted glass. Disable ServerDrawer before enabling GlassDrawer.
            </Text>
            <TableRowGroup title="Wallpaper">
                <TableSwitchRow label="Use selected theme wallpaper" value={state.useThemeWallpaper}
                    onValueChange={(v: boolean) => { settings.useThemeWallpaper = v; }} />
                <TextInput value={state.wallpaperUrl} placeholder="https://example.com/wallpaper.jpg"
                    onChange={(v: string) => { settings.wallpaperUrl = v; }} />
                <Text style={{ color: "#bbb", padding: 12 }}>The URL is a fallback when the theme has no wallpaper. HTTPS images only.</Text>
            </TableRowGroup>
            <TableRowGroup title="Glass controls">
                <Stepper title="Drawer opacity" value={state.drawerOpacity} change={v => { settings.drawerOpacity = v; }} />
                <Stepper title="Wallpaper blur" value={state.blur} step={1} min={0} max={20} percent={false}
                    change={v => { settings.blur = v; }} />
                <TableSwitchRow label="Translucent menus" value={state.transparentMenus}
                    onValueChange={(v: boolean) => { settings.transparentMenus = v; }} />
                <Stepper title="Menu opacity" value={state.menuOpacity} change={v => { settings.menuOpacity = v; }} />
            </TableRowGroup>
            <Text style={{ color: "#bbb", lineHeight: 21 }}>
                Turn GlassDrawer off in Plugins to restore the drawer. To leave this custom bundle, disable Load from custom URL in Rain’s Developer settings and restart Discord. Some iOS sheets and version-specific surfaces may remain opaque.
            </Text>
        </Stack>
    </ScrollView>;
}
