# Study wall art

Two physically rendered hanging scrolls flank the homepage reading column.

| File | Work | Artist | Date | Source |
| --- | --- | --- | --- | --- |
| `scroll-wanghui.webp` | Landscape | Wang Hui (王翚) | 1693 | The Met, CC0 |
| `scroll-morikage.webp` | Landscape | Kusumi Morikage (久隅守景) | 17th century | The Met, CC0 |

The paintings and the silk damask mounting are cropped from public-domain
museum photographs of the real mounts. The curvature, wooden roller, turned
end knobs and upper-left lighting are rendered in Three.js and baked to a
transparent WebP, so the site itself ships no WebGL. `-sm.webp` are 480px
variants for narrow/high-density screens.

Re-bake with `node scripts/bake-scroll/bake.mjs` from the repository root.
