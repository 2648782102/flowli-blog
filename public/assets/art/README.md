# Study wall art

Two physically rendered hanging scrolls flank the homepage reading column.

| File | Work | Artist | Date | Source |
| --- | --- | --- | --- | --- |
| `scroll-wanghui.webp` | Landscape | Wang Hui (王翚) | 1693 | The Met, CC0 |
| `scroll-morikage.webp` | Landscape | Kusumi Morikage (久隅守景) | 17th century | The Met, CC0 |

The paintings and the silk damask mounting are cropped from public-domain
museum photographs of the real mounts. The curvature, wooden roller, turned
end knobs and the upper-left lighting are rendered in Three.js and baked to a
transparent WebP, so the site itself ships no WebGL. `-sm.webp` are 480px
variants for narrow/high-density screens.

The mount itself is *not* relit. Its photograph already carries gallery light
that is correct for silk, and pushing it through the scene key clipped the
damask weave to white — so the sheet is drawn unlit and only the form
shading computed from its curvature is multiplied in. The 天杆 and 轴头 are
drawn unlit for the same reason, with their cylinder shading painted from
each vertex's normal. Only the walnut 地杆 and the soft shadow are lit.

Re-bake with `node scripts/bake-scroll/bake.mjs` from the repository root.
The bake needs `puppeteer-core` and a local Chrome; neither is a site
dependency. Output is deterministic — re-running produces byte-identical
WebPs.
