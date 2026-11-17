# 化学结构式搜索工具

> 一款轻量级 PWA（渐进式网页应用），用于查询化学化合物的结构式。

---

## 功能

- ✅ **中英文双语查询** — 支持直接输入中文名（苯、甲苯、阿司匹林）或英文名（benzene, aspirin）
- ✅ **三层查询引擎** — 内置 70+ 专业词典 → MyMemory 在线翻译 → OPSIN 化学解析 → PubChem 结构式图片
- ✅ **搜索历史** — 自动保存最近 5 条搜索记录（本地浏览器存储，不上传服务器）
- ✅ **PWA 安装** — 可添加到手机主屏幕，像原生 App 一样全屏使用
- ✅ **零依赖** — 纯 HTML + CSS + 内联 JS，无外部框架，单文件即可运行

## 系统要求

- **桌面浏览器**（运行源码）：Chrome 80+ / Firefox 75+ / Edge 80+ / Safari 13+
- **PWA 安装**（安卓）：Chrome 或 Edge 浏览器
- **PWA 安装**（iOS）：Safari 浏览器（iOS 11.3+）
- **网络**：搜索功能需要联网（调用 PubChem / OPSIN / MyMemory 免费公共 API）

---

## 快速开始

### 方式一：直接浏览器打开（最简单）

双击 `app.html` 即可在浏览器中使用搜索功能。

### 方式二：本地 HTTP 服务器运行（推荐）

Service Worker 要求在 `localhost` 或 `https://` 环境下注册。本地快速启动：

```bash
# Python 3
python -m http.server 8080

# 或 Node.js
npx serve .
```

然后浏览器访问 `http://localhost:8080/`，搜索功能完全一样。

### 方式三：部署到自己的网站

把整个目录上传到你的网站根目录，访问：

```
https://yourdomain.com/app.html
```

---

## 安装为手机 PWA

### 安卓

1. 用 **Chrome 或 Edge** 打开 `app.html` 所在网址
2. 等页面加载完成（出现搜索框）
3. 点右上角 **⋮ 菜单** → **"安装应用"** 或 **"添加到主屏幕"**
4. 桌面出现图标，点击即可全屏使用

### iOS / 苹果

1. 用 **Safari** 打开 `app.html` 所在网址
2. 等页面加载完成
3. 点底部 **分享按钮**（方框加向上箭头）→ **"添加到主屏幕"**
4. 桌面出现图标，点击即可全屏使用

### PWA 与普通网页的区别

| 特性 | 普通网页 | PWA 安装版 |
|---|---|---|
| 地址栏 | 显示 | **隐藏**（全屏） |
| 图标 | 无 | 桌面图标 |
| Service Worker | 不注册 | 注册，骨架缓存 |

---

## 文件结构

```
Compound-Search-App-zh/
├── app.html                      # 主页面（含搜索逻辑）
├── manifest.json                 # PWA 清单（中文名称、图标、主题色）
├── sw.js                         # Service Worker（骨架缓存）
├── README.md                     # 本文件
└── images/
    ├── favicon-192x192.png       # PWA 图标（安卓自适应）
    ├── favicon-512x512.png       # PWA 图标（高清）
    ├── apple-touch-icon-180x180.png  # iOS 主屏图标
    ├── favicon.svg               # 小尺寸 SVG 图标
    └── favicon.ico               # 浏览器标签页图标
```

---

## 技术说明

### 查询引擎工作流

```
用户输入 "苯"
    ↓
┌─ 内置词典（70+ 条目） → 命中 → Benzene ─┐
│                                           ↓
└─ 未命中 → MyMemory 免费翻译 API → 得到英文名
                                            ↓
                                         OPSIN 化学名解析
                                            ↓
                                     返回 SMILES / InChI
                                            ↓
                                     PubChem PNG 结构式
```

### API 依赖

| API | 用途 | 是否免费 |
|---|---|---|
| [PubChem](https://pubchem.ncbi.nlm.nih.gov/) | 结构式图片获取 | ✅ 免费公共 API |
| [OPSIN](https://www.ebi.ac.uk/opsin/) | 化学名 → SMILES | ✅ 免费公共 API |
| [MyMemory](https://mymemory.translated.net/) | 中文 → 英文翻译 | ✅ 免费，日限额较高 |

### 隐私声明

本工具**完全在浏览器本地运行**，不收集任何用户数据：
- 搜索历史仅保存在浏览器 `localStorage` 中（可随时清除）
- 所有 API 调用直接在你的浏览器发起，不经过任何中间服务器

### 缓存策略（Service Worker）

- **骨架资源**（HTML/CSS/JS/图标）→ 首次访问缓存，后续访问秒开
- **API 调用**（PubChem/OPSIN/MyMemory）→ 每次实时联网请求，**永不缓存**
- 新版本发布时，`sw.js` 缓存版本号升级（v1 → v2 → ...）会触发浏览器自动更新

---

## 常见问题

**Q: 搜索没反应 / 404？**
A: 检查网络连接。PubChem/OPSIN 在国内可能需要科学上网。

**Q: iOS 上搜索历史丢失？**
A: iOS Safari 的 PWA 模式下，清除 Safari 数据会同时清除 localStorage。这是系统行为。

**Q: 为什么某些化合物搜不到结构式？**
A: OPSIN 对中文名的翻译依赖 MyMemory，若翻译不准确会导致解析失败。建议直接用英文名搜索。

**Q: 能否离线使用？**
A: **不能**。搜索功能必须联网（PubChem/OPSIN 都是在线 API）。已安装的 PWA 可离线打开骨架，但无法搜索。

---

© 2026 黄文华博士
