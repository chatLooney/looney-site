import { createPluginStore } from "@api/storage";

export const { useStore: useGlassDrawer, settings: glassDrawerSettings } = createPluginStore("glassdrawer", {
    useThemeWallpaper: true,
    wallpaperUrl: "https://i.ibb.co/WNrbr1Yz/Alpine-Amnesia.png",
    drawerOpacity: 0.42,
    menuOpacity: 0.65,
    blur: 6,
    transparentMenus: true,
});
