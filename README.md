# data-browser

本地优先的作品数据浏览器：从源站抓取的人物页面与 JavBus 元数据，以 `data/` + `works-export/` 为数据源，由 Vite + React 渲染成可筛选、可导出的网页。

## 快速开始

```bash
cd web
npm install
npm run dev          # 启动开发服务器（默认 5173）
```

打开浏览器访问 `http://localhost:5173`。

## 数据来源

- `data/<ID>.html`：源站人物页（通过顶栏「导入」按钮自动抓取，或手动放置）
- `works-export/<ID>.json`：JavBus 抓取的元数据（导入后自动后台同步，可手动 `npm run works <ID>` 补抓）

## 关于外链访问

作品中部分跳转链接（sukebei、JAVLibrary、猫咪 BT 等海外资源索引站）**在中国大陆地区需要代理（VPN）才能访问**。本地代理可用时，导入和抓取脚本也能正常工作。

仓库本身不存储任何视频、磁力链或实际作品文件，仅分享番号与元数据。

## 数据更新

数据分两层：源站 HTML（`data/`）和 JavBus 元数据（`works-export/`）。两者的更新方式独立，按需选择。

**前置条件**：JavBus 抓取与导入接口都需要本地代理（默认探测 `7890/7897/10809/10808`，可通过 `JAVDB_PROXY` 环境变量自定义）。源站页面直连即可。

### 补抓/重抓 JavBus 元数据

```bash
cd web

# 重新抓取某个人物的全部 JavBus 作品（覆盖 works-export/<ID>.json）
npm run works <人物ID>

# 重新抓取 data/ 下全部人物的 JavBus 数据
npm run works:all

# 抓数据 + 同时下载封面到 covers/（更慢）
npm run works:covers

# 只补下载封面，不重抓元数据
npm run works:covers-only
```

脚本按 star 页拉取全量番号并逐番号抓详情页，300ms 限速、4 并发。单人通常 1-3 分钟，10 人约 5-8 分钟。dev server 运行时写入会自动触发页面热重载。

### 更新源站人物页（data/）

启动 dev server 后，顶栏点「导入」按钮，输入人物 ID 或完整页面链接：

- 自动抓取源站 HTML 写入 `data/<ID>.html`
- 立即解析并刷新当前页（人物卡 + 资料 + 介绍 + 作品表）
- 后台自动调用 JavBus 抓取任务，无需再手动跑 `npm run works`

**注意**：导入会覆盖该人物已有的 `data/<ID>.html`。如果之前手工编辑过该页面的资料区块，更新后改动会丢失。

### 添加新人物

两个源都需要：

1. 启动 dev server，顶栏「导入」按钮 → 输入新人物 ID
   - 抓源站页面写入 `data/`
   - 后台触发 JavBus 抓取，写入 `works-export/`
2. 或分两步：
   ```bash
   # 1. 导入 HTML（dev server 顶栏）
   # 2. CLI 补 JavBus（即使导入没跑后台任务也能用）
   npm run works <新人物ID>
   ```

### 何时用什么

| 场景 | 命令 |
|---|---|
| 我就想全部刷新一遍 | `npm run works:all` |
| 只刷新某一个人 | `npm run works 35大桥未久` |
| 某人物的资料/介绍错了 | 顶栏「导入」重抓 |
| 加一个新人物 | 顶栏「导入」 |
| 只下载封面 | `npm run works:covers-only` |

### 解析规则修改后

如果改了 `web/src/lib/parse.ts` 的 HTML 解析逻辑，**不需要重抓**——Vite 会自动重新解析 `data/*.html`，热重载刷新页面即可看到新结果。`works-export/` 走的是 JSON，解析规则与源站无关。