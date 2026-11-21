# Study wall art

Two physically rendered hanging scrolls flank the homepage reading column.

| Work | Artist | Date | Source |
| --- | --- | --- | --- |
| Landscape | Wang Hui (王翚) | 1693 | The Met, CC0 |
| Landscape | Kusumi Morikage (久隅守景) | 17th century | The Met, CC0 |

Each work ships at five widths — `-350`, `-480`, `-640`, `-880`, `-900` —
because the mount's slot is set by `--wall-height` and spans roughly 170–550
CSS pixels depending on the viewport. The widths are measured from the
layout, not taken from a generic ladder: 350 covers 1× to 1919, 480 covers
1× from 1920 and 2× to 1280, 640 covers 2× to 1919, and 880 covers 2× from
1920 to 3200; 900 stays the 2× original above that. The previous pair of
480/900 files meant a 2× 1600px display pulled the 173 KB original for a
268px slot.

The paintings and the silk damask mounting are cropped from public-domain
museum photographs of the real mounts. The paper curvature, the slim 天杆 and
the upper-left lighting are rendered in Three.js and baked to a transparent
WebP, so the site itself ships no WebGL.

There is deliberately no 地杆: at display size a wooden roller with bone end
knobs reads as lacquered plastic long before the eye accepts it, so the mount
ends in a bare paper edge and lets its own silhouette and cast shadow carry
the bottom of the composition.

The transparent margin around each mount is kept to 1.2%. Fewer pixels put the
paper edge on the canvas boundary, where the outermost row got clipped
mid-coverage and the bottom edge came out stair-stepped; more wasted the
frame. The bake is also supersampled 2× and downsampled with Lanczos, so the
curved silhouette has real coverage levels to interpolate from.

The page does not fade the mount into the wall. It tried, and blending paper
through alpha pulls it toward the backdrop — on the dark theme the scrolls
grew a grey halo and the paper looked dirty. Depth comes from layered
drop-shadows instead, so the paper keeps its own colour right to its edge.

The mount itself is *not* relit. Its photograph already carries gallery light
that is correct for silk, and pushing it through the scene key clipped the
damask weave to white — so the sheet is drawn unlit and only the form
shading computed from its curvature is multiplied in. The 天杆 and 轴头 are
drawn unlit for the same reason, with the bar's cylinder shading painted from
its own normals. Nothing solid is lit.

Re-bake with `node scripts/bake-scroll/bake.mjs` from the repository root.
The bake needs `puppeteer-core` and a local Chrome; neither is a site
dependency. Output is deterministic — re-running produces byte-identical
WebPs.
