# 拟物风（Skeuomorphism）设计基础

## 定位
以"实体材质"为核心的拟物风：金属、磨砂玻璃、皮革、纸张、橡胶按键。
与当前"扁平纸感"不同，拟物风强调：
- 真实光源（统一左上 135°）
- 材质层次（凸起 raised / 凹陷 inset / 悬浮 float）
- 物理反馈（按压下沉、拨动物件位移）

## 设计 Token

### 光源
- 光源方向：左上（135°）
- 高光：白色半透明，1px 内描边 + 顶部渐变
- 阴影：双向，右下沉影 + 左侧微光

### 材质
| 材质 | 用途 | 特征 |
| --- | --- | --- |
| metal | 导航栏、按钮 | 金属拉丝渐变，强高光 |
| glass | 卡片、面板 | 磨砂 + 内阴影 |
| leather | 侧栏、页脚 | 细纹 + 缝线边 |
| paper | 文章正文 | 纤维纹理 + 微卷边 |
| rubber | 开关、标签 | 哑光 + 内凹 |

### 层级
- raised：凸起（外阴影 + 顶部高光）
- inset：凹陷（内阴影 + 底部微光）
- float：悬浮（大投影 + 边缘光晕）

### 纸卷边
`scroll-edge` 定义在 `src/styles/skeuo.css`，用于首页精选卡和文章版权卡。卡片本身是一页纸：左缘向后卷起，卷边使用 `public/assets/scroll/curl-left-{light,dark}.png`（受光卷冠、暗侧切口、投在纸面上的阴影），纸面使用同目录的无缝纸纹。没有木轴、金属轴头或任何覆贴条；正文需在左侧预留约 `2.4rem` 空间。

### 立轴挂画
首页两侧的挂画是中式立轴，不是画框：组件在 `src/components/common/hangingScroll.astro`。它们由 `scripts/bake-scroll/` 中的 Three.js 场景离线烘焙为透明 WebP，放在 `public/assets/art/scroll-*.webp`。画心与暗花绫装裱取自大都会博物馆公有领域的立轴实物照片；纸面的弯曲、木质地杆、车制轴头和左上主光由 3D 场景生成。页面只展示静态图，用 CSS `drop-shadow` 补墙面投影，不引入运行时 WebGL。重新烘焙：`node scripts/bake-scroll/bake.mjs`（需本机 Chrome 与 `puppeteer-core`）。

## 组件规划
Phase 1（基座）：
- 设计 token + 工具类
- 拟物按钮（Btn）
- 拟物卡片（Panel）
- 拟物开关（Switch，基于 Bits UI）

Phase 2（页面）：
- 导航栏金属化
- 文章卡片纸张化
- 侧栏皮革化
- 表单控件橡胶化

## 技术约束
- 保留 Astro 静态生成（不引入 SSR 框架）
- 交互组件继续用 Svelte 5 + Bits UI（无样式，自己上材质）
- 所有视觉效果走 CSS 变量，不写死颜色
- 尊重 prefers-reduced-motion / prefers-contrast
