#!/usr/bin/env node
/**
 * 扫描 data/ 下所有原始表格 html，输出厂商名称（去重）。
 * 与前端共用同一套解析规则（src/lib/parse.ts 的 Node 实现）。
 *
 * 用法:
 *   node --experimental-strip-types tools/list-makers.js          去重结果写入 script/makers.txt（按名称排序）
 *   node --experimental-strip-types tools/list-makers.js --count  附带出现次数，按次数降序
 *   node --experimental-strip-types tools/list-makers.js --json   写入 script/makers.json
 *   node --experimental-strip-types tools/list-makers.js --out a.txt      指定输出路径
 *   node --experimental-strip-types tools/list-makers.js --actor 35大桥未久  只看某个人物
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePersonNode } from '../src/lib/parse.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(here, '..', '..', 'data')

const args = process.argv.slice(2)
const has = flag => args.includes(flag)
const flagValue = flag => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : null
}

/** 递归收集 html */
function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.html?$/i.test(e.name)) out.push(p)
  }
  return out
}

/* ---------------- main ---------------- */

const onlyActor = flagValue('--actor')
const files = walk(dataDir)

if (!files.length) {
  console.error(`未在 ${dataDir} 找到 html 文件`)
  process.exit(1)
}

const counts = new Map()
let records = 0
let usedFiles = 0

for (const file of files) {
  const actor = path.basename(file).replace(/\.html?$/i, '')
  if (onlyActor && actor !== onlyActor) continue
  usedFiles++
  for (const row of parsePersonNode(fs.readFileSync(file, 'utf-8'), actor).rows) {
    records++
    const name = (row.maker || '').trim()
    if (!name || name === '未标注') continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }
}

const list = [...counts.entries()]
list.sort(
  has('--count')
    ? (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh')
    : (a, b) => a[0].localeCompare(b[0], 'zh')
)

let text
if (has('--json')) {
  text = JSON.stringify(list.map(([name, count]) => ({ name, count })), null, 2)
} else if (has('--count')) {
  const width = Math.min(40, Math.max(...list.map(([n]) => [...n].length))) + 2
  text = list.map(([name, n]) => name.padEnd(width, ' ') + n).join('\n')
} else {
  text = list.map(([name]) => name).join('\n')
}

/* 默认写到 script/ 目录（data 与 web 的旁边）；--out 可指定其他位置 */
const defaultOut = path.resolve(dataDir, '..', has('--json') ? 'makers.json' : 'makers.txt')
const outPath = flagValue('--out') ? path.resolve(flagValue('--out')) : defaultOut
fs.writeFileSync(outPath, text + '\n', 'utf-8')

console.log(`已写入 ${outPath}`)
console.log(`共 ${list.length} 个厂商（${usedFiles} 个文件 / ${records} 条记录）${onlyActor ? `，人物：${onlyActor}` : ''}`)
console.log(has('--count') ? '按出现次数降序，直接打开文件复制即可' : '按名称排序，直接打开文件复制即可')
