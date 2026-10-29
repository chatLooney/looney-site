# GlassDrawer for Rain — experimental v0.1.0

Custom Rain bundle by LooneyHere. Website: https://looney.is-a.dev/

This adds wallpaper behind Discord's server/channel drawer and adjustable menu transparency. It is a **full custom Rain JavaScript bundle**, not a theme JSON or a standalone plugin URL.

## Status and compatibility

- Builds from Rain commit `4b091e1698aa983c5f4e694ae243c9a6fd8b52fb`.
- That upstream build recommends Discord iOS build **110861**. Check Rain's debug/about information before switching. Other Discord builds are not validated by this project.
- Eight mocked-runtime/policy tests pass; bundle generation, Node syntax checking and Hermes bytecode compilation (version 98) pass.
- **Not tested on a physical iPhone.** Successful compilation does not establish visual correctness, performance, compatibility, or recovery behaviour on your installed Discord version.
- Plugin is disabled by default. Do not enable it alongside Rain's ServerDrawer plugin.
- Full native iOS sheets may remain opaque. Wallpaper blur is not a live frosted-glass effect.

## Install after checking your Rain/Discord versions

1. Save your current custom bundle URL if one is set. Keep your working Rain app and sign-in method available.
2. Disable **ServerDrawer** if enabled, then restart Discord.
3. Open **Rain → Developer → Loader Config → Load from custom URL**. This option is present only for supported Rain/Pyon loaders.
4. Set the custom URL to:

   `https://raw.githubusercontent.com/chatLooney/looney-site/main/plugins/glassdrawer/rain.js`

5. Fully close and reopen Discord. If the custom bundle does not load, return to the normal loader rather than repeatedly retrying it.
6. Open **Rain → Plugins**, find **GlassDrawer**, enable it, and restart when prompted.
7. In GlassDrawer's settings, choose the selected theme's wallpaper or supply an HTTPS image URL. Start with drawer opacity 42%, menu opacity 65%, blur 6. Lower opacity means greater transparency.

**Do not paste this JavaScript URL into Themes → Install from URL.** Continue using the Translucence Glass theme separately for its colours.

## Undo

- Turn GlassDrawer off and restart to remove its patches.
- To leave the custom Rain bundle entirely, turn off **Load from custom URL** and restart. Restore a previous custom URL if you had one.
- If Discord cannot open, the in-app off switch may be inaccessible; loader-specific recovery is not verified here. Confirm your loader's recovery method before using experimental bundles.

## What changes

The plugin wraps Rain's known `LeftPanelContent` component in an image background. Render hooks clear only neutral, large layout surfaces inside that drawer context. Small controls and coloured artwork are preserved. A separate semantic-colour hook supplies menu alpha. All hooks are removed on stop; existing theme files are not modified.

A missing image or invalid URL falls back to the normal drawer. An unsupported native View render hook or an enabled ServerDrawer prevents the plugin from starting. These guards do not validate the entire upstream Rain bundle on other Discord versions.

No account tokens, message content or member data are read by GlassDrawer. Its image background makes a normal HTTPS request to the selected wallpaper host. Other functionality in this bundle comes from upstream Rain.

## Source and reproduction

Upstream Rain: https://github.com/ra1ncord/rain/tree/4b091e1698aa983c5f4e694ae243c9a6fd8b52fb

1. Clone that commit of Rain.
2. Copy the four files in `source/` into `src/plugins/glassdrawer/`.
3. Replace `scripts/build.mjs` with the `build.mjs` beside this README; its only upstream change is the version label.
4. Copy `glassdrawer.test.mjs` to `tests/glassdrawer.test.mjs`.
5. Install dependencies using the upstream lockfile: `bun install --frozen-lockfile --ignore-scripts`.
6. Run `node --test tests/glassdrawer.test.mjs`.
7. Run `node scripts/build.mjs --release-branch main --build-minify --build-bytecode`.
8. The hosted `rain.js` is `dist/rain.min.js` from that build. JavaScript is hosted instead of precompiled bytecode to avoid assuming a device's Hermes bytecode version.

The upstream TypeScript project currently reports 85 lines of diagnostics. The modified tree was compared with the same unmodified commit using identical dependencies and reports **exactly the same diagnostics**, with no added GlassDrawer errors. This is not a clean whole-project type-check result.

## Attribution and licence

Rain is by its original contributors. Source notices and MPL-2.0 are retained; see LICENSE. GlassDrawer additions are MPL-2.0. The bundled dependency code retains its respective licences. This is an unofficial experiment and is not endorsed by Discord, Rain's maintainers, or CapnKitten. The Translucence-inspired theme is a separate file with its original attribution.
