#!/usr/bin/env node
/**
 * 从 JavBus 抓取演员的全部作品（CLI 入口）。
 * 实现在 build/fetchWorks.ts（dev server 导入人物后也复用同一套逻辑）。
 *
 * 用法:
 *   node --experimental-strip-types tools/fetch-works.ts 35大桥未久
 *   node --experimental-strip-types tools/fetch-works.ts --all
 *   node --experimental-strip-types tools/fetch-works.ts --all --covers        同时下载封面
 *   node --experimental-strip-types tools/fetch-works.ts --all --covers-only  只补封面不重抓
 *   node --experimental-strip-types tools/fetch-works.ts --all --out 目录
 *
 * 输出：
 *   <out>/<人物ID>.json      { actorId, name, counts:{total,censored,uncensored}, works[] }
 *   covers/<section>/<code>.jpg  （仅 --covers 时）封面图
 */
import '../build/fetchWorks.ts'
