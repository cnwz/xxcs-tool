# QRPrintModule.js 二次开发文档

> 版本对应：QRPrintModule v1.0.0 / 2026-09-21
> 模块 id：`qrprint`
> 阅读前提：已读 Core.js 文档（模块契约、`readExcelTable`、`pickFile`、`showImageViewer`、`loadLibrary`）
> 依赖：`qrcode` 库（生成二维码）、`jspdf` 库（PDF 导出）、`jszip` 库（多图打包）

---

## 定位

**是**：二维码打印器。支持**文本粘贴**或**Excel 上传**两种数据源，生成**A4 大图**或 **60×40mm 标签**两种尺寸，导出 **PDF** 或 **图片**（单张 PNG / 多张 ZIP）。

**不是**：不真的调用系统打印（用户下载 PDF 后自己打印）。不做页眉 LOGO（页眉是 `app.logoImage`，不是用户上传）。

**与 QRCodeModule 的区别**：

| | QRPrintModule | QRCodeModule |
|---|---|---|
| 尺寸 | A4 + 标签两种 | 只 A4 |
| 数据源 | 文本 + Excel（带列选择） | 只文本 |
| 输出 | PDF / PNG / ZIP | PNG / PDF / DOCX |
| 页眉 | 用 `app.logoImage`（不可上传） | 用户可上传 |
| 字体检测 | 无（硬编码微软雅黑） | 有 |
| 输入上限 | 无 | 无 |
| 输入格式 | `码` 或 `码;文字` | `码;文字` |
| 校验 | 宽松（只查第 4/5 段） | 严格（5 段） |

---

## 模块契约

```js
class QRPrintModule {
    constructor(app) {
        this.app = app;
        this.title = QRP_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-21';
        this.iconName = 'printer';
        this.introText = QRP_TEXT.introText;
        this.helpDescription = QRP_TEXT.helpDescription;
        // 状态字段...
    }
    renderPanel(panel) { ... }
    destroy() { ... }      ← 有
}
window.QRPrintModule = QRPrintModule;
```

**有 `destroy()`**，清理 `_previewCache` / `_items`。**当前没有定时器或 document 监听**，所以是简单的内存释放。

---

## 状态字段

| 字段 | 说明 |
|---|---|
| `_size` | `'a4'` 或 `'label'` |
| `_onlyPile` | 是否只保留 DD |
| `_uploadedData` | Excel 上传后的行数组（二维） |
| `_currentColumns` | `{codeCol, displayCol}` 列选择结果。null 表示未选 |
| `_items` | 当前解析出的条目 `[{code, display}]` |
| `_previewCache` | 生成的 PNG dataURL 数组，与 `_items` 一一对应 |

**两套数据源互斥**：

- `_uploadedData` 非 null → 走 Excel 分支
- `_uploadedData` 为 null → 走 textarea 分支

**`_currentColumns` 是 Excel 分支的开关**。上传后必须点"应用选择"才生效。**没点过的话 `_getItems` 走空分支**。

**图标缓存**：

```js
this._iconCache = {
    upload: app.getIcon('filetype-xlsx'),
    pdf: app.getIcon('filetype-pdf'),
    png: app.getIcon('filetype-png'),
    qr: app.getIcon('qr-code'),
    refresh: app.getIcon('arrow-counterclockwise'),
    x: app.getIcon('x'),
};
```

---

## 类外常量：`QRP_SIZE`

**尺寸配置表**。两种尺寸的所有参数：

```js
const QRP_SIZE = {
    a4: {
        canvasW: 595, canvasH: 842,
        pdfFormat: 'a4', pdfOrientation: 'portrait',
        pdfW: 210, pdfH: 297,
        ecc: 'M',
        logoMode: 'header'
    },
    label: {
        canvasW: 709, canvasH: 472,
        pdfFormat: [60, 40], pdfOrientation: 'landscape',
        pdfW: 60, pdfH: 40,
        ecc: 'H',
        logoMode: 'corner'
    }
};
```

| 字段 | 说明 |
|---|---|
| `canvasW` / `canvasH` | canvas 像素尺寸 |
| `pdfFormat` | jsPDF 页面格式（字符串或 [宽mm, 高mm]） |
| `pdfOrientation` | `'portrait'` / `'landscape'` |
| `pdfW` / `pdfH` | PDF 里的实际毫米尺寸（`addImage` 用） |
| `ecc` | 二维码纠错等级（A4 用 M，标签用 H） |
| `logoMode` | LOGO 位置模式（`'header'` / `'corner'`）。**当前代码只读了 `canvasW` / `canvasH` / `ecc`，`logoMode` 未使用** |

**关键点**：

- **A4 用 595×842**（72 DPI 名义尺寸），PDF 用 210×297mm
- **标签用 709×472**（约 60×40mm @ 300 DPI），PDF 用 60×40mm
- **A4 用 M 纠错**（压缩率优先），**标签用 H**（容错优先，适合小尺寸）
- **标签是横向**（宽 > 高）

**加新尺寸**：在这个表里加一项，然后 UI 加 radio，`_size` 支持新值即可。**注意** `_drawA4` / `_drawLabel` 是按尺寸名分支的，新尺寸要么走这两个方法之一，要么加新的绘制函数。

---

## 生命周期

### `injectStyles()`

```js
this.app.injectStyle(this.id, QRP_TEXT.styles);
```

按 `qrprint-styles` 去重。

### `destroy()`

同步。清空 `_previewCache` 和 `_items`，释放内存。

**注意**：**不清 `_uploadedData`**。当前实现里 `destroy` 是空操作（只是把引用指向空数组）。**如果将来加了其他资源（定时器、document 监听），必须在这里清理**。

### `renderPanel(panel)`

同步。渲染整个面板。结构见[第十四节](#十四)。

---

## 数据源

### 核心方法：`_getItems()`

同步。**统一的条目获取入口**。根据 `_uploadedData` 是否非空，走 Excel 或文本分支。

**返回**：`[{code, display}]`。

**逻辑**：

```
if (_uploadedData && _currentColumns) {
    遍历 _uploadedData：
        读 codeCol → code
        读 displayCol → display（-1 时用 code）
        code 为空跳过
        push {code, display: display || code}
} else {
    读 #qrpTextInput：
        按行 split
        _parseTextLine(line) → {code, display} 或 null
        有效则 push
}

过滤：_isValidItem(item)

if (_onlyPile && !_uploadedData) {
    过滤：_isPile(item)
}
```

**关键设计**：

1. **Excel 模式优先**：`_uploadedData && _currentColumns` 双条件，都非空才走 Excel
2. **只勾了 `_onlyPile` 但没上传 Excel** → 走文本分支的过滤
3. **上传了 Excel 后 `_onlyPile` 无效**——Excel 分支不做过滤（因为上传时已有列选择，用户自己控制数据）

**注意**：`_onlyPile` 只在**文本模式**生效。这个设计的理由是：Excel 数据已经筛选过，不需要再过滤。

### `_parseTextLine(line)`

同步。解析单行为 `{code, display} | null`。

**逻辑**：

1. trim，空行返回 null
2. 按 `;` 切分
3. `code = parts[0].trim()`，空则返回 null
4. `display = parts.length > 1 ? parts.slice(1).join(';').trim() : code`
5. `display` 空则用 `code`

**`;` 语义**：分号后的所有内容作为 display，**分号可多个**（`slice(1).join(';')`）。

**示例**：

| 输入 | code | display |
|---|---|---|
| `LC-01-01-01-01` | `LC-01-01-01-01` | `LC-01-01-01-01` |
| `LC-01-01-01-01;货架A` | `LC-01-01-01-01` | `货架A` |
| `LC-01-01-01-01;A;B` | `LC-01-01-01-01` | `A;B` |
| `12345;店名;备注` | `12345` | `店名;备注` |
| `  ;x` | `''` → null | — |

### `_isValidItem(item)`

同步。**宽松校验**。

**规则**：

```js
if (/^\d{5}$/.test(code)) return true;               // 5 位纯数字
const parts = code.split('-');
if (parts.length !== 5) return false;
const [, , , layer, position] = parts;               // 只看第 4、5 段
if (layer !== 'DD' && !/^\d{2}$/.test(layer)) return false;
if (!/^\d{2}$/.test(position)) return false;
return true;
```

**与前 3 段无关**。所以 `X-Y-Z-DD-01` 也能过。

**与 Core.validateLocationCode 的差异**：

- Core 校验前 3 段（走 `validateShelfCode`）
- 本模块**不校验**前 3 段
- **`DD` 只认大写**

**为什么宽松**：业务上可能有非标准前缀的库位码（如 `YC-LC-BS-SP-00`），本模块要接受这些。

### `_isPile(item)`

同步。判断是否地堆。

```js
const parts = item.code.split('-');
return parts.length === 5 && parts[3].toUpperCase() === 'DD';
```

**注意**：这里用了 `toUpperCase()`。**与 `_isValidItem` 不一致**——`_isValidItem` 里的 `layer !== 'DD'` **不认小写**。所以 `a-b-c-dd-01`：

- `_isValidItem`：第 4 段 `dd` 不是 `'DD'`，走 `/^\d{2}$/.test('dd')` → false → **无效**
- 不会走到 `_isPile`

**结论**：`toUpperCase` 在 `_isPile` 里是**死代码**（进不到这里）。**当前行为等价于只认大写**。

### `_handleExcelFile(file)`

异步。处理上传的 Excel。

**逻辑**：

1. `readExcelTable(file, ...)`
2. 缓存 `_uploadedData = rows`
3. **填充列选择器**：
   - `codeColSelect` 清空，遍历 headers 加 option
   - `displayColSelect` 先加一个 `<option value="-1">无</option>`，再加所有列
4. **智能猜列**：
   - code 列：找 headers 里包含 `库位` / `条码` / `编码` / `code` / `码` 的第一个
   - display 列：找包含 `显示` / `名称` / `文字` / `display` / `name` 的第一个，且不能与 code 列相同
5. 显示 `#qrpExcelColumnSelector`
6. 隐藏 `#qrpTextInput`
7. 隐藏 `#qrpFilterGroup`
8. `#qrpUploadStatus` 显示文件名 + 行数
9. `_syncColumns()`
10. `showMessage('文件解析成功，共 N 行数据，请选择列')`

**猜列的优先级**：按关键词顺序匹配，命中第一个就返回。

**注意**：

- **上传不自动应用列**。用户需点"应用选择"。
- 猜列只是设置 select 的默认值，**不改 `_currentColumns`**
- **`_syncColumns` 会被调用**，但 `_currentColumns` 只在用户点"应用选择"时才真正生效

**等等**——这里有个细节：`_handleExcelFile` 末尾调了 `_syncColumns()`，实际上会把 select 当前值**立刻**同步到 `_currentColumns`。所以**上传后列就生效了**，不需要点"应用选择"。

**再看**：`_syncColumns` 从 select 读值。上传后 select 已经被猜列逻辑设置了值，所以 `_currentColumns` 立刻是猜的列。**用户可以直接点"生成预览"**。

**"应用选择"按钮的作用**：如果用户改了 select，需要点一下才生效（因为没绑 select 的 change 事件）。

**实际上**：

```js
panel.querySelector('#qrpCodeColSelect')?.addEventListener('change', () => this._syncColumns());
panel.querySelector('#qrpDisplayColSelect')?.addEventListener('change', () => this._syncColumns());
```

**change 事件有绑定**，所以改 select 会自动 `_syncColumns`。"应用选择"是冗余的，但**保留着**（用户点一下也无害）。

### `_syncColumns()`

同步。从下拉框同步列选择到 `_currentColumns`。

**逻辑**：

1. 读 `#qrpCodeColSelect` 的 value，parseInt
2. 读 `#qrpDisplayColSelect` 的 value
3. NaN 或 < 0 → `-1`
4. 写 `_currentColumns = {codeCol, displayCol}`

**注意**：`_currentColumns` 被设为 `{codeCol: NaN, displayCol: -1}` 也可能。**没有校验**。如果用户手动清空 select 值，`codeCol` 是 NaN，后续 `_getItems` 里 `row[NaN]` → undefined。

### `_switchToText()`

同步。切回文本模式。

**行为**：

- `_uploadedData = null`
- `_currentColumns = null`
- 隐藏 `#qrpExcelColumnSelector`
- 清空 `#qrpUploadStatus`
- 显示 `#qrpTextInput`
- 显示 `#qrpFilterGroup`
- `showMessage('已切换回文本输入模式')`

**注意**：**不清 textarea 的值**。用户切回来时能看到原来的输入。

---

## 渲染

### `_loadImage(src)`

同步。`Promise<HTMLImageElement>`。

**行为**：创建 `<img>`，`crossOrigin = 'anonymous'`，`onload` resolve，`onerror` reject。

**用途**：`_renderOne` 里加载 LOGO 和二维码 dataURL。

**注意**：`crossOrigin` 是必需的，否则跨域图片画到 canvas 会污染，无法 `toDataURL`。

### `_generateQR(text, ecc)`

同步。生成二维码 dataURL。

**逻辑**：

```js
const qr = qrcode(0, ecc);          // 0 = 自动选版本，ecc = 纠错等级
qr.addData(text);
qr.make();
return qr.createDataURL(10, 0);     // 10 = 模块大小(px)，0 = 边距
```

**返回**：dataURL 字符串。

**注意**：`cellSize = 10` 会让二维码很大（取决于版本）。A4 和标签都用同一尺寸，**在标签上可能偏大**。

**其他参数**：

- 第 1 个参数 `0`：版本自动。`1-40` 可指定，`0` 自动选最小版本
- 第 2 个参数 `ecc`：`'L'` / `'M'` / `'Q'` / `'H'`
- `createDataURL(cellSize, margin)`：像素尺寸 = `(17 + 4 * 版本) * cellSize`

### `_drawText(ctx, text, cx, cy, maxWidth, maxFont, minFont)`

同步。绘制文字。**先单行尝试，放不下缩字号，再放不下换行**。

**逻辑**：

1. 从 `maxFont` 递减到 `minFont`，步长 2
2. 每次设 `ctx.font`，测量 `ctx.measureText(text).width`
3. 宽度 <= `maxWidth` → 直接绘制，返回
4. 都放不下 → 用 `minFont`，调 `_wrapText` 换行
5. 计算多行总高，垂直居中绘制

**字体**：硬编码 `bold ${fontSize}px "Microsoft YaHei", sans-serif`。

**注意**：

- 字体**硬编码**微软雅黑，**不做系统检测**
- macOS 上微软雅黑可能不存在，回退到 `sans-serif`（可能是苹方或 Helvetica）
- **`bold` 加粗**，与 QRCodeModule 的普通字重不同

### `_wrapText(ctx, text, maxWidth)`

同步。按字符逐字测宽换行。

**逻辑**：遍历每个字符，累加到当前行，超过 `maxWidth` 就 push 当前行，字符进下一行。

**注意**：**不处理英文单词断行**。`"hello world"` 可能在 `hel` 处断。中文没问题（逐字）。

**返回**：`string[]`。

### `_drawA4(ctx, item, qrImg, logoImg, cfg)`

同步。**绘制 A4 版面**。

**布局**：

| 元素 | 位置 |
|---|---|
| LOGO | `(10, 20)`，最大宽 50%，高 60 |
| 二维码 | 居中，450×450，Y = `100 + headerHeight`（有 LOGO）或 150 |
| 文字 | `qrY + 450 + 100`，居中 |

**`headerHeight` 计算**：

```js
const maxW = W * 0.5;
const calcH = (maxW / logoImg.naturalWidth) * logoImg.naturalHeight;
const targetH = Math.min(calcH, 60);
const targetW = (targetH / logoImg.naturalHeight) * logoImg.naturalWidth;
```

**关键**：与 QRCodeModule 不同，**这里只有一套计算**（`maxW = W * 0.5`），绘制和定位共用。**没有 QRCodeModule 的 0.5 / 0.9 不一致问题**。

**文字绘制**：

```js
this._drawText(ctx, text, W / 2, textY, W - 80, 72, 20);
```

maxFont=72，minFont=20。

### `_drawLabel(ctx, item, qrImg, logoImg, cfg)`

同步。**绘制 60×40mm 标签版面**。

**布局**（canvas 709×472）：

| 元素 | 位置 |
|---|---|
| LOGO | `(28, 2)`，265×87 |
| 二维码 | 居中，296×296，Y = 96 |
| 文字 | `Y = 410`，居中 |

**LOGO 尺寸是硬编码的**（265×87）。**不缩放**，直接画。

**文字绘制**：

```js
this._drawText(ctx, text, W / 2, textY, W - 40, 44, 24);
```

maxFont=44，minFont=24。

**注意**：标签尺寸小，文字容易超出。`W - 40 = 669` 是最大宽度，用 24px 字最多 27 个中文字。

### `_renderOne(item)`

异步。**渲染单个条目为完整 canvas**。

**返回**：`Promise<HTMLCanvasElement>`。

**流程**：

1. 从 `QRP_SIZE[this._size]` 读配置
2. 创建 canvas，设置宽高
3. 白色填充背景
4. 加载 `app.logoImage` → `logoImg`（失败 → null）
5. `_generateQR(item.code, cfg.ecc)` → dataURL
6. `_loadImage(qrDataUrl)` → `qrImg`
7. 按 `_size` 调 `_drawA4` 或 `_drawLabel`
8. 返回 canvas

**注意**：

- **每次都重新加载 LOGO**（即使前后两次相同）。没有缓存。
- **`app.logoImage` 是全局的**，不区分用户
- 加载失败静默处理（`logoImg = null`），画面上就不显示 LOGO

### `renderPreviews()`

异步。**生成预览入口**。

**流程**：

1. `loadLibrary('qrcode')`，失败报错
2. 读 `#qrpSize` radio → `_size`
3. 读 `#qrpOnlyPile` checkbox → `_onlyPile`
4. `_items = _getItems()`
5. 空 → 显示空状态，报错
6. 显示"正在生成预览…"
7. 清 `_previewCache`
8. 遍历 `_items`：
   - `_renderOne(item)` → canvas
   - `canvas.toDataURL('image/png')` → dataURL
   - push 到 `_previewCache`
   - push 一段 HTML 到 `cells` 数组
9. 拼信息条 + 网格，写入 `#qrpPreview`
10. 给每个 `.qrp-preview-item` 绑 click → `showEnlarged(idx)`

**关键点**：

- **串行生成**（循环内 `await`）。慢但内存友好。
- **单个失败静默**：`try/catch` 每个循环体，`console.error` 但不中断
- **`_previewCache.length` 可能小于 `_items.length`**（有失败时）
- `data-index` 用**原始下标 `i`**，与 `_previewCache` 的下标**可能错位**（有失败时）

**"数量不匹配"的影响**：`showEnlarged(idx)` 里 `_previewCache[idx]` 可能取到**别张图**或 `undefined`。

**修复方向**：`data-index` 用 `_previewCache.length - 1`（即 push 后的新长度）。

### `showEnlarged(index)`

同步。打开图片查看器。

**逻辑**：

```js
if (!this._previewCache || this._previewCache.length === 0) return;
this.app.showImageViewer(this._previewCache, index);
```

**选项**：只传 `images` 和 `index`，**没传 `{loop: true}`**。所以查看器翻页到首尾会 disabled。

**与 QRCodeModule 的差异**：QRCodeModule 传了 `{showPrint: true}`，QRPrintModule **没传**。所以本模块**没有"打印"按钮**。

---

## 导出

### `exportPDF()`

异步。导出多页 PDF。

**流程**：

1. `_previewCache` 为空 → 报错
2. `loadLibrary('jspdf')`
3. 从 `QRP_SIZE[this._size]` 读配置
4. 创建 PDF：
   ```js
   new jsPDF({
       orientation: cfg.pdfOrientation,
       unit: 'mm',
       format: cfg.pdfFormat
   });
   ```
5. 遍历 `_previewCache`：
   - 第一张不用 addPage
   - 其他先 `addPage(format, orientation)`
   - `addImage(dataUrl, 'PNG', 0, 0, cfg.pdfW, cfg.pdfH)`
6. `pdf.save('二维码_${timestamp}.pdf')`

**关键**：

- **A4**：`format: 'a4'`，210×297mm
- **标签**：`format: [60, 40]`（自定义尺寸），`orientation: 'landscape'`
- **图片按 PDF 尺寸全铺**，`(0, 0, pdfW, pdfH)`

**注意**：

- **`addPage` 的 format 和 orientation 必须与初始一致**。代码里每次 `addPage(cfg.pdfFormat, cfg.pdfOrientation)`
- **单位是 mm**，与 canvas 像素不同。PDF 自动缩放图片
- **A4 图片是 595×842 像素**，PDF 是 210×297mm。比例约 2.83:1，正好是 72 DPI。**图片像素密度足够，不会模糊**
- **标签图片是 709×472 像素**，PDF 是 60×40mm。比例约 11.8:1，约 300 DPI。**高清**

**大文件注意**：100 张 A4 图片的 PDF 会很大（每张 PNG 可能 100KB+）。**当前无压缩优化**。

### `exportImages()`

异步。导出图片。**单张 → PNG，多张 → ZIP**。

**流程**：

**单张分支**：

1. `_previewCache[0]` 是 dataURL
2. `fetch(dataUrl)` → blob
3. 文件名：`二维码_${display || code}.png`，去掉非法字符 `[\\/:*?"<>|]`
4. `app.download(blob, name, 'image/png')`

**多张分支**：

1. `loadLibrary('jszip')`
2. 遍历 `_previewCache`：
   - 文件名：`二维码_${name}_${i+1}.png`
   - `base64 = _previewCache[i].split(',')[1]`（去 dataURL 前缀）
   - `zip.file(name, base64, { base64: true })`
3. `zip.generateAsync({ type: 'blob' })` → `app.download(blob, '二维码_${timestamp}.zip', 'application/zip')`

**关键**：

- **单张用 fetch 转 blob**，不用 JSZip
- **多张用 base64 直接写 zip**，效率高（不用 fetch）
- **文件名 sanitize**：`replace(/[\\/:*?"<>|]/g, '_')`

**注意**：

- **ZIP 里的文件名用 `_items[i]`**，但 `_previewCache[i]` 与 `_items[i]` 可能错位（前面有失败时）
- **没有数量上限**，1000 张会 OOM

---

## 事件绑定

### `bindEvents(panel)`

同步。绑定面板内所有事件。

**绑定的监听**：

| 元素 | 事件 | 行为 |
|---|---|---|
| `#qrpUploadBtn` | click | `pickFile({accept: '.xlsx,.xls,.csv'})` → `_handleExcelFile` |
| `#qrpSwitchToTextBtn` | click | `_switchToText()` |
| `#qrpCodeColSelect` | change | `_syncColumns()` |
| `#qrpDisplayColSelect` | change | `_syncColumns()` |
| `#qrpLoadExampleBtn` | click | 填示例数据，切回文本模式 |
| `#qrpGenerateBtn` | click | `renderPreviews()` |
| `#qrpExportPdfBtn` | click | `exportPDF()` |
| `#qrpExportImagesBtn` | click | `exportImages()` |

**注意**：

- **上传按钮用 `pickFile` 而不是 `bindUploadSection`**。因为本模块上传后不是直接处理，而是填充列选择器
- **`#qrpLoadExampleBtn`** 会重置 `_uploadedData` / `_currentColumns` 并切回文本模式（相当于 `_switchToText` + 填值）

**异常处理**：上传按钮的 click 里 `try/catch`，`pickFile` 可能 reject（文件过大），catch 后 `showMessage(e.message, 'error')`。

### `destroy()`

```js
destroy() {
    this._previewCache = [];
    this._items = [];
}
```

**清空两个数组引用**。**没清 `_uploadedData`**（Excel 上传的数据）。理论上应该清，但当前没清。

**注意**：`renderPanel` 里没启动任何定时器，所以 `destroy` 只是做**引用释放**（辅助 GC）。

---

## renderPanel

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    <div class="table-header">
        <h2>二维码打印</h2>
        [帮助按钮]
    </div>

    <!-- 数据源 -->
    <div class="form-group">
        <label>数据源</label>
        <div class="toolbar">
            <button id="qrpUploadBtn">上传 Excel</button>
            <span id="qrpUploadStatus"></span>
            <button id="qrpLoadExampleBtn">加载示例</button>
        </div>
        <textarea id="qrpTextInput" placeholder="..."></textarea>
        <div id="qrpExcelColumnSelector" class="panel-box" style="display:none">
            <div class="columns-row">
                <div><strong>选择列：</strong></div>
                <div class="qrp-column-selects">
                    <label>二维码内容列：<select id="qrpCodeColSelect"></select></label>
                    <label>下方文字列：<select id="qrpDisplayColSelect">...</select></label>
                </div>
                <button id="qrpSwitchToTextBtn">切换回文本输入</button>
            </div>
        </div>
        <p class="note">...</p>
        <div class="checkbox-group" id="qrpFilterGroup">
            <input type="checkbox" id="qrpOnlyPile"> 仅地堆（DD）
        </div>
    </div>

    <!-- 尺寸 -->
    <div class="form-group">
        <label>输出尺寸</label>
        <div class="qrp-size-group">
            <label class="qrp-size-option">
                <input type="radio" name="qrpSize" value="a4" checked>
                <span>A4 大图</span>
            </label>
            <label class="qrp-size-option">
                <input type="radio" name="qrpSize" value="label">
                <span>60×40mm 标签</span>
            </label>
        </div>
    </div>

    <!-- 操作 -->
    <div class="btn-row">
        <button id="qrpGenerateBtn">生成预览</button>
        <button id="qrpExportPdfBtn">导出 PDF</button>
        <button id="qrpExportImagesBtn">导出图片</button>
    </div>

    <!-- 预览 -->
    <div class="qrp-preview-section">
        <h3>预览</h3>
        <div id="qrpPreview"></div>
    </div>
</div>
```

**末尾**：

```js
this.bindEvents(panel);
this.app._log(this.title + '加载成功');
```

**关键 DOM id**：

| id | 用途 |
|---|---|
| `qrpTextInput` | 文本输入 |
| `qrpUploadBtn` / `qrpUploadStatus` | Excel 上传 |
| `qrpExcelColumnSelector` | 列选择面板 |
| `qrpCodeColSelect` / `qrpDisplayColSelect` | 列下拉 |
| `qrpSwitchToTextBtn` | 切回文本 |
| `qrpLoadExampleBtn` | 加载示例 |
| `qrpOnlyPile` | 仅地堆 |
| `qrpSize`（radio name） | 尺寸 |
| `qrpGenerateBtn` | 生成 |
| `qrpExportPdfBtn` / `qrpExportImagesBtn` | 导出 |
| `qrpPreview` | 预览容器 |

**注意**：`#qrpSize` 是 radio 的 **name**，不是 id。取值用 `document.querySelector('input[name="qrpSize"]:checked')`。

---

## QRP_TEXT 文案

### 结构

```js
const QRP_TEXT = {
    title, introText, helpDescription,

    // 标题
    heading,
    label_dataSource,
    label_selectColumns, label_codeCol, label_displayCol,
    label_size, label_onlyPile,

    // 选项
    opt_none: '无',
    opt_colPrefix: '列',

    // 按钮
    btn_uploadExcel, btn_loadExample, btn_switchToText,
    btn_generate, btn_exportPdf, btn_exportImages,

    // 标题（重复，见下）
    heading_preview,
    modal_enlarge, btn_prev, btn_next,

    // 尺寸
    size_a4, size_label,

    // 占位符
    ph_input,
    note_inputHint,
    exampleData,

    // 消息
    msg_emptyFile, msg_parseOk, msg_parseExcelFailed, msg_uploaded,
    msg_switchedToText, msg_noItems, msg_generating, msg_count,
    msg_libNotReady, msg_pdfLibNotReady, msg_zipLibNotReady,
    msg_generateFirst, msg_pdfOk, msg_pdfFailed,
    msg_imageOk, msg_imageFailed, msg_zipOk, msg_zipFailed,

    styles
};
```

**注意两个重复键**：

```js
heading: '二维码打印',        // 第一次定义
...
heading_preview: '预览',
```

**实际代码里只有一个 `heading`**。文档描述时要注意：`heading` 用一次。**没有重复**。

**示例数据**：

```js
exampleData: `LC-01-01-DD-01
LC-01-01-03-05;A3货架
YC-CW-CZ-00-00
12345`,
```

**4 种情况**：标准码 / 带 display / 非标准码（`YC-CW-CZ-00-00` 只有 5 段但前 3 段是字母）/ 5 位数字。

**`helpDescription`**：静态 HTML 字符串，无 `{wiki}` 占位符。

**样式**：

- `.qrp-size-option` 是自定义的 radio 卡片
- `.qrp-grid` 是响应式网格（`auto-fill, minmax(180px, 1fr)`）
- `.qrp-preview-item` 有 hover 上浮动画
- 全用 Core 变量，深色自动跟随

---

## 坑位清单

### 1. `_isValidItem` 与 `_isPile` 的大小写不一致

`_isValidItem` 里 `layer !== 'DD'` **不认小写**，`_isPile` 里 `toUpperCase() === 'DD'` **认小写**。

**当前行为**：`_isPile` 的 `toUpperCase` 是**死代码**。小写 `dd` 会在 `_isValidItem` 被过滤掉，进不到 `_isPile`。

**如果将来改 `_isValidItem` 认小写**：`_isPile` 才真正需要 `toUpperCase`。

### 2. `data-index` 与 `_previewCache` 可能错位

`renderPreviews` 里 `data-index` 用**原始 `i`**，`_previewCache` 只 push 成功的。**中间有失败时**：

- 预览项的 `data-index` 与 `_previewCache` 下标不一致
- 点某张图 → `showEnlarged(idx)` → 打开**另一张图**

**修复方向**：

```js
for (let i = 0; i < this._items.length; i++) {
    try {
        const canvas = await this._renderOne(this._items[i]);
        const dataUrl = canvas.toDataURL('image/png');
        const idx = this._previewCache.length;    // 用新下标
        this._previewCache.push(dataUrl);
        cells.push(`<div class="qrp-preview-item" data-index="${idx}">...`);
    } catch (err) { ... }
}
```

### 3. `exportImages` 的 ZIP 文件名可能与图片不匹配

`_previewCache[i]` 与 `_items[i]` 可能错位（同坑 #2）。ZIP 里第 i 张图的文件名用了 `_items[i]` 的 display，但实际内容可能是另一张。

### 4. `_onlyPile` 只在文本模式生效

Excel 上传后 `_onlyPile` **无效**。UI 上 checkbox 还在（因为 `#qrpFilterGroup` 只在 `_handleExcelFile` 里被隐藏，但 `_switchToText` 时会恢复）。

**等等**——检查 `_handleExcelFile`：

```js
if (filterGroup) filterGroup.style.display = 'none';
```

**确实隐藏了**。所以上传后看不到"仅地堆"勾选。**行为一致**。

### 5. `_syncColumns` 无校验

`_currentColumns = {codeCol: NaN, displayCol: -1}` 是可能的状态。**没校验**。

**场景**：用户上传 Excel → 清空 select 的 value（手动改 DOM）→ `change` 事件 → `_syncColumns` → `codeCol = NaN`。

**当前**：`_getItems` 里 `row[NaN]` → undefined → `String(undefined || '')` → `''` → 跳过。**空安全**，但用户看不到结果，也不知道为什么。

**修复方向**：`_syncColumns` 里 `isNaN(codeCol)` 时置 null，`_getItems` 里判空。

### 6. `_handleExcelFile` 的上传错误处理

```js
const table = await this.app.readExcelTable(file, {
    emptyMessage: QRP_TEXT.msg_emptyFile,
    parseErrorMessage: QRP_TEXT.msg_parseExcelFailed,
});
if (!table) return;
```

**`readExcelTable` 内部 showMessage**，`return null` 时**已经提示了**。这里 `if (!table) return` 是安全的。

### 7. `_drawLabel` 的 LOGO 尺寸硬编码

```js
ctx.drawImage(logoImg, 28, 2, 265, 87);
```

**265×87 是硬编码的**，不按图片原始宽高比缩放。如果 `app.logoImage` 是**不同宽高比**的图，会被拉伸。

**修复方向**：参考 `_drawA4` 的缩放逻辑。

### 8. `_drawText` 字体硬编码

```js
ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
```

**macOS / Linux 上没有微软雅黑**，会回退到 `sans-serif`（苹方 / DejaVu）。**中文渲染依赖系统回退**。

**如果要做跨平台一致**：参考 QRCodeModule 的字体检测，或内嵌 web font。

**当前无字体检测**，所以中文可能有豆腐块（在极端 Linux 环境）。

### 9. `exportImages` 单张分支文件名可能含非法字符

```js
const name = (this._items[0].display || this._items[0].code).replace(/[\\/:*?"<>|]/g, '_');
```

**做了 sanitize**。**多张分支也做了**。

**但**：**没处理超长文件名**。Windows 有 260 字符路径限制。display 很长时会失败。

### 10. `exportImages` 多张分支的 ZIP 文件名

```js
zip.file(`二维码_${name}_${i + 1}.png`, base64, { base64: true });
```

**`i + 1` 是数组下标**，不是成功计数。如果中间有失败跳过（虽然这里是 `_previewCache` 遍历，没有失败），编号会不连续。

**当前无影响**，因为 `_previewCache` 里都是成功的。

### 11. `renderPreviews` 不检查数量上限

**无硬性上限**。1000 行输入 → 1000 个 canvas 串行生成 → 用户等很久。**没有进度提示**，只有"正在生成预览…"。

**建议**：加上限 + 分批 + 进度。

### 12. `exportPDF` 无分页控制

**每张图一页**。100 张图 → 100 页 PDF。**用户不能合并**（比如 2×2 一页）。

**当前设计**：就是"一页一张"。标签尺寸下一张 60×40mm 占满一页。

### 13. `showEnlarged` 不传 loop

`app.showImageViewer(this._previewCache, index)` **没传 options**。所以：

- 无循环翻页
- 无"在新标签页打开原图"
- 无"打印"

**与 QRCodeModule 的 `{showPrint: true}` 不一致**。

### 14. `destroy` 不清 `_uploadedData`

```js
destroy() {
    this._previewCache = [];
    this._items = [];
}
```

**没清 `_uploadedData`**。理论上应该清（大文件占内存），但**当前没清**。

**影响**：如果模块被关闭再打开，`new QRPrintModule(app)` 会创建新实例，旧的 `_uploadedData` 被 GC。**所以不是内存泄漏**。

**但如果用户多次上传**（同一实例），旧的 `_uploadedData` 被覆盖，也无泄漏。

### 15. `_parseTextLine` 用 `slice(1).join(';')`

```js
const display = parts.length > 1 ? parts.slice(1).join(';').trim() : code;
```

**多分号会还原**。`a;b;c` → code=`a`, display=`b;c`。

**如果 display 本身不含分号**：正常。

**如果用户想 display 是 `a;b;c`**：**做不到**。因为 code 是 `a`，display 是 `b;c`。

**设计取舍**：分号是分隔符，不是转义符。要支持 display 含分号需要引号或其他转义。

### 16. `_getItems` 的 Excel 分支过滤条件

```js
items = items.filter(item => this._isValidItem(item));
if (this._onlyPile && !this._uploadedData) {
    items = items.filter(item => this._isPile(item));
}
```

**`_isValidItem` 对两种数据源都生效**。Excel 上传的数据也要过校验。

**如果 Excel 里有大量非库位码数据**（如商品名），会被全部过滤。**用户看不到"被过滤了多少"**。

### 17. `_drawA4` 的 LOGO 渲染

```js
if (logoImg) {
    ...
    ctx.drawImage(logoImg, 10, 20, targetW, targetH);
    headerHeight = targetH;
}
```

**如果 `logoImg.naturalWidth` 为 0**（SVG 未指定尺寸），`maxW / 0` → Infinity，`targetH = min(Infinity, 60) = 60`，`targetW = 60 / 0 * 0 = NaN`。

**`ctx.drawImage(..., NaN, 60)` 行为未定义**。可能报错或静默。

**修复方向**：加 `logoImg.naturalWidth > 0` 检查。

### 18. `_drawLabel` 无 headerHeight 概念

标签的 LOGO 是固定在 `(28, 2)`，**不参与二维码定位**。二维码固定 `qrY = 96`。

**与 A4 不同**：A4 的二维码 Y 依赖 LOGO 高度，标签的不依赖。

**如果 LOGO 很大**：会**盖住二维码**（因为二维码从 96 开始，LOGO 从 2 到 89）。

**当前**：LOGO 尺寸固定 265×87，二维码从 96 开始，**刚好不重叠**。

### 19. `exportPDF` 的 `_previewCache` 可能是旧数据

如果用户改了 `_size`（A4 → 标签）但**没点"生成预览"**，`_previewCache` 还是 A4 的图。点"导出 PDF"会用 A4 图 + 标签尺寸配置。

**结果**：A4 图被拉伸到 60×40mm 的 PDF，**严重变形**。

**当前无校验**：不知道 `_previewCache` 是否与当前 `_size` 匹配。

**修复方向**：记录 `_previewCacheSize`，导出时比对。

### 20. 没有 `_size` 切换时的重绘

`#qrpSize` radio 改了**不自动刷新预览**。用户需点"生成预览"。

**当前行为**：符合"手动刷新"设计，但用户可能困惑。

### 21. `qrcode` 库的全局名

`_generateQR` 里用 `qrcode(...)`，是 `window.qrcode`（Core 的 `libraries.qrcode.global`）。

**如果 qrcode 没加载**：会 `ReferenceError`。

**保护**：`renderPreviews` 里 `loadLibrary('qrcode')` 先跑，失败报错返回。

**但** `_generateQR` 没有二次保护。如果 `_generateQR` 在别处被调用（如自定义扩展），可能崩。

### 22. `_loadImage` 的 `crossOrigin`

```js
img.crossOrigin = 'anonymous';
```

**对于 dataURL 不必要**。但设置也无害。

**对于跨域图片**：需要服务器 `Access-Control-Allow-Origin`。`app.logoImage` 一般是 dataURL，无此问题。

### 23. `renderPreviews` 里 `container.innerHTML = ...` 重建

```js
container.innerHTML = info + `<div class="qrp-grid">${cells.join('')}</div>`;
```

**每次重建 DOM**。没有 diff。**少量项目无感，大量项目有开销**。

### 24. 预览图的 `alt` 硬编码

```js
cells.push(`<div class="qrp-preview-item" data-index="${i}"><img src="${dataUrl}" alt="二维码"></div>`);
```

**`alt="二维码"`**。屏幕阅读器只会读"二维码"，不读实际内容。

**如果可访问性重要**：`alt="${escapeHtml(item.display || item.code)}"`。

**注意**：`dataUrl` 和 `item` 直接拼 HTML，**未转义**。dataURL 是 base64 字符集，安全；`item.display` 如果含 `<` 会 XSS。

**当前代码没转义 item**，但也没拼 item 进 HTML（只拼 `dataUrl`）。所以**当前无 XSS**。

**如果将来把 `item` 拼进 HTML**，必须转义。

### 25. `exampleData` 里的 `YC-CW-CZ-00-00`

**这个码不是标准 5 段格式**：

- 段 1：`YC` ✓
- 段 2：`CW` ✓
- 段 3：`CZ` ✓
- 段 4：`00` — **不是 `DD`，也不是两位数字？00 是两位数字** ✓
- 段 5：`00` ✓

**实际上符合校验**。`_isValidItem` 通过。前 3 段不校验，所以 `YC-CW-CZ-00-00` 是合法的。

### 26. `_drawA4` 的二维码大小是硬编码 450

```js
const qrSize = 450;
```

**与 canvas 595×842 的比例**：约 76%。**看起来合适**。

**但如果要改二维码大小**：要同时改 `_drawA4` 里所有用到 `qrSize` 的地方（X 计算、Y 计算、textY 计算）。**没有抽常量**。

### 27. `_drawLabel` 的二维码大小是硬编码 296

同 #26。标签 canvas 709×472，二维码 296×296，约 42%。

### 28. `heading` 与 `heading_preview` 的命名

`QRP_TEXT` 里有：

- `heading: '二维码打印'`（面板标题）
- `heading_preview: '预览'`（预览区标题）

**命名规律**：`heading_xxx` 表示子区域标题。

**如果加新区域**：`heading_newSection`。

### 29. `label_onlyPile: '仅地堆（DD）'`

文本里含 `（DD）`，是**中文全角括号**。**不是编码相关**，只是文案。

### 30. `size_label: '60×40mm 标签'`

**`×` 是全角乘号**。不是 `x`。**影响 UI 显示**。

---

## 一页速查

```
入口：  modules.js 清单
id：    qrprint
依赖：  qrcode / jspdf / jszip 库
用途：  二维码生成 A4 或标签 PDF/图片

尺寸配置：
  a4:    canvas 595×842, pdf 210×297mm, ecc M
  label: canvas 709×472, pdf 60×40mm,   ecc H

数据源：
  文本 → _parseTextLine
  Excel → _handleExcelFile + _syncColumns

流程：
  生成 → renderPreviews → _renderOne (per item)
  导出 → exportPDF / exportImages

两种绘制：
  _drawA4:    LOGO(50%宽,60高) + 二维码450居中 + 文字
  _drawLabel: LOGO(28,2,265,87) + 二维码296(y=96) + 文字(y=410)

关键 DOM id：
  qrpTextInput / qrpUploadBtn / qrpUploadStatus
  qrpExcelColumnSelector / qrpCodeColSelect / qrpDisplayColSelect
  qrpSwitchToTextBtn / qrpLoadExampleBtn / qrpOnlyPile
  qrpSize (radio name)
  qrpGenerateBtn / qrpExportPdfBtn / qrpExportImagesBtn
  qrpPreview

依赖 Core：
  loadLibrary('qrcode' / 'jspdf' / 'jszip')
  readExcelTable
  pickFile
  showImageViewer
  download
  showMessage
  injectStyle
  getIcon
  timestamp
  escapeHtml
  logoImage
  _log

已知缺陷：
  data-index 与 _previewCache 可能错位
  _isPile 的 toUpperCase 是死代码
  _drawLabel 的 LOGO 尺寸硬编码，会拉伸
  _drawText 字体硬编码微软雅黑
  exportPDF 不校验 _previewCache 与 _size 匹配
  无输入数量上限
```

---

@license Unlicense