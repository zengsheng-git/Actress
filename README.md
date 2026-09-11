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