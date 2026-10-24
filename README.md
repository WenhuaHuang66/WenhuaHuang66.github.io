# 黄文华博士的个人网站

**The Personal Website of Dr. Wenhua Huang**

线上地址：<https://wenhuahuang66.github.io>

本仓库是黄文华博士（天津大学化学系副教授）的个人网站源码，基于 Jekyll 与 Academic Pages 模板构建，采用**中英双语**结构：英文主站位于根路径 `/`，中文镜像位于 `/zh/`，可在页面顶部一键切换。

## 站点结构

| 导航（英文） | 导航（中文） | 网址（英 / 中） | 内容目录（英 / 中） |
|---|---|---|---|
| Home | 首页 | `/` · `/zh/` | `_pages/about.md` · `_pages/zh-home.md` |
| Blogs | 博客 | `/blogs/` · `/zh/blogs/` | `_posts/` · `_posts_zh/` |
| Popular Science | 科普 | `/popular-science/` · `/zh/popular-science/` | `_talks/` · `_talks_zh/` |
| Science Fiction | 科幻小说 | `/science-fiction/` · `/zh/science-fiction/` | `_teaching/` · `_teaching_zh/` |
| Programs | 程序 | `/programs/` · `/zh/programs/` | `_portfolio/` |
| Publications | 论文 | `/publications/` · `/zh/publications/` | `_publications/` |
| About | 关于 | `/about/` · `/zh/about/` | `_pages/about-page.md` · `_pages/zh-about-page.md` |

导航名称与顺序分别定义在 `_data/navigation.yml`（英文）和 `_data/navigation-zh.yml`（中文）。

## 新增内容

所有文章均为带 frontmatter 的 Markdown 文件，文件名格式为 `YYYY-MM-DD-slug.md`。中文内容**必须**放入 `_zh` 后缀的集合，并加上 `locale: zh-CN`，否则会错误地出现在英文区。

### 博客

- 英文 → `_posts/`
- 中文 → `_posts_zh/`

```yaml
---
title: "文章标题"
date: 2026-10-21
collection: posts_zh   # 英文博客写 posts
locale: zh-CN          # 仅中文需要
tags: [标签一, 标签二]
---
```

### 科普 / 科幻小说 / 程序

- 科普：英文 → `_talks/`，中文 → `_talks_zh/`
- 科幻小说：英文 → `_teaching/`；中文小说在 `_data/novels_zh.yml` 中以列表形式维护（每部小说两行：`title` + 番茄小说 `url`，最新的排在前面），中文板块页自动显示最新 5 部，超过 5 部时出现“更多”按钮指向 `/zh/science-fiction/all/`
- 程序 → `_portfolio/`

frontmatter 需包含 `collection` 与 `permalink`，直接复制同类现有文件最稳妥。

### 论文

`_publications/` 下每个文件对应一篇论文，`category` 字段决定所属分组（`manuscripts` 期刊 / `conferences` 会议 / `books` 著作）。

## 特色功能

- **首页化合物结构搜索**：支持中英文化合物名。中文名优先命中内置专业词典（73 个常见化合物）；未命中则调用 MyMemory 翻译接口转换为英文名；再经 OPSIN（EBI）解析结构标识，最终从 PubChem 取得结构式图片。全部失败时提示“没搜到此化合物结构式。”。纯前端实现，无需后端服务。
- **数学公式**：采用 MathJax，正文可用 `$...$`（行内）或 `$$...$$`（独立成行）。分隔符配置见 `_includes/footer/custom.html`。
- **板块列表规则（全站统一）**：点击导航进入任一板块（博客、科普、科幻小说、程序、论文，中英文相同）只显示**最新 5 条**，不足 5 条时显示实际条数；超过 5 条时页面底部出现“更多 / More”按钮，指向该板块的全部列表页（如 `/publications/all/`、`/zh/blogs/all/`）。预览逻辑集中在 `_includes/section-list.html`，全部列表页保留原有的按年份（博客）或按类别（论文）分组。

## 本地预览（Windows）

需要 Ruby 3.2 及以上（建议使用 RubyInstaller 的 Ruby+Devkit 版本）。

```powershell
cd C:\MyPersonalWebsite
bundle install
bundle exec jekyll serve
```

打开 <http://localhost:4000>（英文）与 <http://localhost:4000/zh/>（中文）。

- 修改文章或页面后自动重建，刷新浏览器即可看到
- 修改 `_config.yml` 后需重启服务
- Windows 上 `Gemfile` 已包含 `tzinfo-data`，用于解决 “No source of timezone data could be found” 报错

## 部署

仓库已配置 GitHub Actions（`.github/workflows/`）。将改动推送到 `main` 分支后会自动构建并发布到 <https://wenhuahuang66.github.io>，一般几分钟内生效。

## 维护备忘

- Google Analytics 4 跟踪 ID 目前为占位值 `G-XXXXXXXXXX`（`_config.yml` 的 `analytics` 段），拿到真实 ID 后替换即可
- 侧边栏头像文件为 `images/profile.png`
- 文章配图统一放在 `images/` 目录，正文中以相对路径引用
- 文章评论已关闭（`_config.yml` 中 `comments.provider` 留空）

## 来源与许可

本站基于 [Academic Pages](https://academicpages.github.io/) 模板构建，该模板源自 [Minimal Mistakes](https://mmistakes.github.io/minimal-mistakes/) 主题（© 2016 Michael Rose，MIT License）。原始模板的版权与许可说明见 [LICENSE.md](LICENSE.md)。
