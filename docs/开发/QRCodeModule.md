
# QRCodeModule.js 二次开发文档

> 版本对应：QRCodeModule v1.0.0 / 2026-09-20
> 模块 id：`qrcode`
> 阅读前提：已读 Core.js 文档（模块契约、`readExcelTable` 不需要、`loadLibrary`、`showLoading`）
> 依赖：`qrcode` 库（生成二维码）、`jszip` 库（多图打包）、`jspdf` 库（PDF 导出）、`docx` 库（DOCX 导出）

---

## 定位

**是**：地堆二维码生成器。输入库位列表，逐个生成 A4 版面 PNG（页眉 + 二维码 + 下方文字），支持放大预览、单张/批量保存、PDF 导出、DOCX 导出、模板下载。

**不是**：不做打印排版，不做标签尺寸，不做二维码解码。它是**图片生成器**，不是打印机。

**与 MultiQRCode 的区别**：

|      | QRCodeModule                       | MultiQRCodeModule  |
| ---- | ---------------------------------- | ------------------ |
| 定位 | 生成**成品图片**             | **实时预览** |
| 版面 | A4（595×842）+ 页眉 + 文字        | 只二维码 + 文字    |
| 输出 | PNG / PDF / DOCX                   | 无（仅预览）       |
| 字体 | 检测系统中文字体                   | 用浏览器默认       |
| 输入 | 每行一个码，支持`;` 分隔显示文字 | 支持自动格式化     |
| 上限 | 无硬性上限                         | 预览最多 10 个     |

**注意**：本模块**不进 git**（是本地版的使用模块之一，但默认内联的是 MultiQRCode）。如果你是从 git 拉源码，这个文件**存在**，但需要在 `modules.js` 里引用才能加载。

---

## 模块契约

```js
class QRCodeModule {
    constructor(app) {
        this.app = app;
        this.title = QC_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-20';
        this.iconName = 'qr-code-scan';
        this.introText = QC_TEXT.introText;
        this.helpDescription = QC_TEXT.helpDescription;
        // 状态字段...
    }
    renderPanel(panel) { ... }
    destroy() { ... }      ← 有
}
window.QRCodeModule = QRCodeModule;
```

**有 `destroy()`**，因为构造函数里通过 `bindEvents` 启动了一个 1 秒延时字体检测定时器。

---

## 状态字段

### 当前会话

| 字段              | 说明                                                           |
| ----------------- | -------------------------------------------------------------- |
| `currentHeader` | 用户上传的页眉图片（dataURL）。null 时用`app.logoImage` 或空 |
| `qrItems`       | 解析后的条目`[{code, display}]`                              |
| `qrImageSrcs`   | 生成的 PNG dataURL 数组，与`qrItems` 一一对应                |
| `currentFont`   | 检测到的中文字体`{name, family, style}`                      |

### 字体检测

| 字段                  | 说明                                    |
| --------------------- | --------------------------------------- |
| `systemFonts`       | 候选字体列表（不同 OS 排序不同）        |
| `chineseFontLoaded` | 是否检测到可用中文字体                  |
| `fontLoading`       | 加载中标志（当前未使用）                |
| `_fontTimer`        | `setTimeout` 句柄，`destroy` 里清理 |

### 模板

| 字段                   | 说明                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| `templateDocxBase64` | 模板文件 base64。**当前是 `__TEMPLATE_BASE64__` 占位符**，见坑位清单 |

### 图标缓存

```js
this._iconCache = {
    docx: app.getIcon('filetype-docx'),
    qr: app.getIcon('qr-code'),
    png: app.getIcon('filetype-png'),
    pdf: app.getIcon('filetype-pdf'),
    refresh: app.getIcon('arrow-counterclockwise'),
};
```

---

## 样式与生命周期

### `injectStyles()`

```js
this.app.injectStyle(this.id, QC_TEXT.styles);
```

按 `qrcode-styles` 去重。

### `destroy()`

同步。清理字体检测定时器。

```js
destroy() {
    if (this._fontTimer) {
        clearTimeout(this._fontTimer);
        this._fontTimer = null;
    }
}
```

**调用时机**：Core 的 `closeModule(id)`。**不写会泄漏定时器**。

### `renderPanel(panel)`

同步。渲染整个面板。结构见[第十五节](#十五)。

---

## 字体检测

这是本模块最特殊的部分。Canvas 上画中文时，`ctx.fillText` 用的字体如果不含中文字形，会显示成方框（豆腐块）。所以要在生成前检测系统里有没有中文字体。

### `getOperatingSystem()`

同步。从 `navigator.userAgent` 判断 OS。

**返回值**：`'Windows'` / `'macOS'` / `'Linux'` / `'Android'` / `'iOS'` / `'Unknown'`。

**逻辑**：简单字符串包含判断，顺序敏感（`Mac` 要在 `iOS` 前？实际不会冲突，因为 iOS 的 UA 也含 `Mac OS X`）。

### `detectOperatingSystem()`

同步。根据 OS 重排 `systemFonts`。

**逻辑**：

1. 每组 OS 有一组推荐字体（Windows 推荐 微软雅黑等，macOS 推荐苹方等）
2. 把推荐的提到前面，其他保持原顺序
3. 结果写回 `this.systemFonts`

**意义**：`detectSystemFonts` 按顺序试，优先试系统自带的。**注意**：这个方法**只重排列表**，不真的检测。检测在 `detectSystemFonts`。

### `detectSystemFonts()`

同步。**真正的字体检测**。

**逻辑**：

1. 默认 `currentFont = sans-serif`
2. 用 canvas 测量"字体测试"四个字在默认字体下的宽度
3. 遍历 `systemFonts`，每个用 `12px "${font.family}"` 测量
4. **宽度差 > 1px** → 认为该字体真的被应用（不是 fallback），采用
5. 找到第一个可用字体 → `chineseFontLoaded = true`，跳出
6. `detectOperatingSystem()`（**注意：在检测之后调**，这个顺序有点反直觉）
7. 如果没检测到，按 OS 猜一个默认字体

**关键设计**：

- **`宽差 > 1px`** 是启发式：不同字体渲染同一文字宽度应该不同。如果和默认字体一样宽，说明浏览器 fallback 了
- **只测"字体测试"4 个字**：中文字符能区分中西字体
- **`currentFont` 永远有值**：检测失败也给个 OS 默认

**调用时机**：`bindEvents` 里 `setTimeout(..., 1000)`。**延时 1 秒**是为了不阻塞面板首次渲染。

**注意**：这个方法**在不同浏览器上结果可能不同**，因为字体回退机制不同。`chineseFontLoaded` 只影响 UI 提示文案，不影响功能。

### `containsChinese(text)`

同步。正则 `/[\u4e00-\u9fa5]/` 判断是否含中文。

**用途**：生成时提示用户"将使用系统字体"。

---

## 输入处理

### `getLines()`

同步。读 `#qcInput` 的值，按行 split，trim，过滤空行。

**返回**：`string[]`。

### `filterItems(lines)`

同步。解析每行，返回有效条目。

**返回**：`[{code, display}]`。

**解析规则**：

1. 按 `;` 切分：`parts[0]` 是 code，`parts[1..]` 是 display
2. `code` 要么是**5 位纯数字**，要么是**5 段库位码**
3. `#qcFilterDD` 勾选时，只保留第 4 段为 `DD` 的

**库位码验证**（与 Core 不同，本模块自己写了一遍）：

```js
if (codeParts.length !== 5) return;
if (!/^\d{2}$/.test(area) || !/^\d{2}$/.test(shelf) || !/^\d{2}$/.test(position)) return;
if (layer !== 'DD' && !/^\d+$/.test(layer)) return;
```

**注意**：

- **`DD` 只认大写**
- **layer 是 `\d+`，不是 `\d{2}`**（允许多位数字）
- 与 `Core.validateLocationCode` 规则**不完全一致**

**建议**：如果要做统一校验，改用 `this.app.validateLocationCode`。但当前实现允许 `layer` 多位数字，比 Core 宽松。

### `generateFileName()`

同步。`二维码${app.timestamp()}`。

---

## 页眉管理

### `getCurrentHeader()`

同步。返回当前生效的页眉。

**优先级**：

1. `this.currentHeader`（用户上传的）
2. `#qcUseDefaultHeader` 勾选时 → `this.app.logoImage`
3. 都无 → `null`

**注意**：`app.logoImage` 由 Core 提供，默认是空字符串。

### `handleHeaderUpload(event)`

同步。处理页眉图片上传。

**逻辑**：

1. 取 `event.target.files[0]`
2. `app.validateFile(file, { accept: 'image/*', maxSize: 5MB })`
3. 校验失败：按大小或类型分别报错，清空 input
4. 用 `FileReader.readAsDataURL` 读为 dataURL
5. 成功后：
   - `currentHeader = dataURL`
   - 取消勾选"默认页眉"，并禁用该 checkbox
   - `updateHeaderPreview()`

**注意**：`useDefault.disabled = true`。**禁用状态由 `resetHeader` 恢复**。

### `resetHeader()`

同步。重置为默认页眉。

**行为**：

- `currentHeader = null`
- 清空 input 的 value
- `#qcFileName` 文本恢复默认
- `#qcUseDefaultHeader` 启用 + 勾选
- `updateHeaderPreview()`

### `updateHeaderPreview()`

同步。更新页眉预览区。

**逻辑**：

- `getCurrentHeader()` 有值 → 创建 `<img>`，加载失败降级为 placeholder
- 无值 → 显示 `.preview-placeholder`（"空白页眉"）

**注意**：`img.onerror` 只在**图片加载失败**时触发，不影响 `currentHeader` 的状态。

---

## 生成流程

### `generateQRCodes()`

异步。**生成入口**。

**逻辑**：

1. `showLoading(this.id, '正在生成预览…')`
2. `await loadLibrary('qrcode')`，失败报错
3. `getLines()` → `filterItems(lines)`
4. 有中文 → `showMessage` 提示（有字体 / 用系统字体）
5. `#qcResult` 更新计数
6. `await renderQRCodes(this.qrItems)`
7. 加 `.active` 类显示结果区
8. `finally { hideLoading(this.id) }`

**注意**：**无输入也会走到 renderQRCodes**，只是 `qrItems` 为空，什么都不渲染。**没有前置校验**。

### `renderQRCodes(items)`

异步。渲染所有二维码为 `<img>`。

**逻辑**：

1. 清空 `#qcContainer` 和 `qrImageSrcs`
2. 遍历 `items`：
   - 跳过无效项（`!item.code` / 非字符串 / 空串）
   - `await createImageCanvas(item)` → canvas
   - `canvas.toDataURL('image/png')` → dataURL
   - `qrImageSrcs.push(dataUrl)`
   - 创建 `<img>` 加到容器，`data-index` 记录下标
3. **单个失败不影响其他**：`try/catch` 包每个循环体，失败 `console.error`

**注意**：`data-index` 用的是**原始 items 的下标**，不是 `qrImageSrcs` 的下标。所以 `qrImageSrcs[i]` 和 `data-index=i` 可能不对应（如果中间有失败跳过）。**这是个已知的不一致**——`showEnlarged(index)` 打开查看器时，用 `data-index` 索引 `qrImageSrcs`，可能错位。

### `saveImages()`

异步。保存为图片。

**逻辑**：

1. 无 items → 报错
2. 判断是否含中文，决定加载提示文案
3. `showLoading`
4. 单个 item → `generateSingleImage`
5. 多个 item → `generateMultipleImages`
6. `finally { hideLoading }`

**注意**：**用的是 `this.qrItems`，不是 `qrImageSrcs`**。所以用户改了输入框但没点"生成二维码"，会保存上次的 items。

### `generateSingleImage(item)`

异步。生成单张 PNG 并下载。

**逻辑**：

1. `createImageCanvas(item)` → canvas
2. `canvas.toBlob` 为 PNG blob
3. `app.download(blob, '二维码_${display || code}.png', 'image/png')`
4. 含中文时提示用了哪个字体

**返回**：Promise<void></void>。抛错时调用方处理。

### `generateMultipleImages(items)`

异步。多张打包为 ZIP。

**逻辑**：

1. `loadLibrary('jszip')`
2. 遍历 items，`Promise.all` 并行生成 canvas → blob → `zip.file`
3. `Promise.allSettled` 收集结果，统计成功数
4. 成功数 0 → 抛错
5. `zip.generateAsync({ type: 'blob' })`
6. `app.download(blob, '二维码_${timestamp}.zip', 'application/zip')`
7. 消息提示（含中文时说明字体）

**注意**：**文件名冲突**。`二维码_${display}_${index + 1}.png` 里的 `index` 是**数组下标**，不是成功计数。所以 `display` 相同时不会冲突，但顺序可能不连续。

**并行**：`Promise.all` 让所有生成并发跑，快但占内存。**注意**：如果 items 有几百个，可能卡浏览器。**当前无数量限制**。

---

## Canvas 生成

### `createImageCanvas(item)`

异步。**核心渲染函数**。生成一个 595×842 的 canvas。

**返回**：`Promise<HTMLCanvasElement>`。

**结构**：

```
画布 595×842（约 A4 @ 72dpi）
├── 页眉图片（可选，画在左上，最大宽 50%、高 60px）
├── 二维码（居中，450×450）
└── 文字（二维码下方，居中，字号自适应）
```

**布局参数**：

| 元素       | 值                                                  |
| ---------- | --------------------------------------------------- |
| 画布       | 595 × 842                                          |
| 页眉位置   | (10, 20)                                            |
| 页眉最大宽 | `canvasWidth * 0.5`                               |
| 页眉最大高 | 60                                                  |
| 二维码尺寸 | 450 × 450                                          |
| 二维码 X   | `(595 - 450) / 2 = 72.5`                          |
| 二维码 Y   | 有页眉：`50 + headerHeight + 50`；无页眉：`150` |
| 文字 Y     | `qrY + qrSize + 150`（无页眉=750，有页眉=更下）   |

**异步等待**：用 `Promise` 包裹，等页眉图片和二维码图片都 `onload` 后才 `resolve`。

**`checkAll` 机制**：两个 `onload` 都可能先完成，用 `headerLoaded` / `qrLoaded` 标志，两个都 true 才调 `drawText`。

**文字绘制**：

1. 从 72px 往下试，找到单行放得下的最大字号
2. 放得下 → 单行居中绘制
3. 放不下 → 用 20px 字号，`wrapText` 换行，多行居中

**`drawText` 内容**：`item.display || item.code`。

**⚠️ 已知缺陷**（上一轮审计发现）：

计算二维码 Y 坐标和文字 Y 坐标时：

```js
let headerHeight = headerImg
    ? Math.min((canvasWidth * 0.9 / headerImg.naturalWidth) * headerImg.naturalHeight, 60)
    : 0;
```

**用了 `0.9`**，但绘制页眉时用的是 `0.5`：

```js
let maxWidth = canvasWidth * 0.5;
```

两者不一致。当页眉图片宽高比很大时，`headerHeight` 会比实际绘制的大，导致二维码和文字**偏下**，可能超出画布。

**修复方向**：抽出一个 `computeHeaderHeight()` 函数，绘制和定位共用。

### `wrapText(ctx, text, maxWidth, fontSize)`

同步。按字符逐字测宽，超出则换行。

**返回**：`string[]` 每行文本。

**注意**：`fontSize` 参数**实际没用到**（函数内部用 `ctx.measureText`，只依赖 `ctx.font` 已设置）。保留是为了接口清晰。

### `getImageDimensions(arrayBuffer)`

异步。用 `createImageBitmap` 读图片宽高。

**返回**：`{width, height}`。

**用途**：`exportDocx` 里计算页眉的缩放尺寸。

**注意**：`createImageBitmap` 是较新 API，**IE 和旧 Safari 不支持**。当前假设用户用现代浏览器。

---

## 导出 PDF

### `exportPdf()`

异步。将 `qrImageSrcs` 导出为多页 PDF。

**逻辑**：

1. 无 items → 报错
2. `showLoading`
3. `loadLibrary('jspdf')`
4. `const { jsPDF } = window.jspdf`（**注意**：jspdf UMD 版本的全局是 `window.jspdf`，`jsPDF` 是它的属性）
5. 创建 PDF：`format: [595, 842]`（点，约 A4）
6. 遍历 `qrImageSrcs`，每个 `addImage` 到一页
7. `pdf.save()` 触发下载
8. `finally { hideLoading }`

**注意**：

- **用的是 `qrImageSrcs` 而不是 `qrItems`**，所以 PDF 页面顺序与预览顺序一致
- **不含页眉数据**，PDF 用的是已经画好的 canvas dataURL
- 异常 catch 会 `console.error` + `showMessage`

---

## 导出 DOCX

### `exportDocx()`

异步。**最复杂的导出**。用 `docx` 库生成 DOCX。

**依赖**：`loadLibrary('docx')`。

**从全局取**：

```js
const { Document, Packer, Paragraph, ImageRun, Header, AlignmentType, TextRun } = window.docx;
```

**流程**：

1. 无 items → 报错
2. `showLoading`
3. `loadLibrary('docx')`
4. **准备页眉**：
   - 有页眉图 → `fetch(headerSrc)` → blob → `arrayBuffer` → 读宽高
   - 无 → 跳过
5. **计算页面属性**：
   - A4 页面，`margin.top: 5cm`（给页眉留空间）
   - 其他 margin：1.27cm
6. **构建共享 Header**：
   - 缩放页眉到高 105px，按比例算宽
   - 一个 `Header` 对象，含一个 `ImageRun`
7. **遍历每个 item**：
   - 生成二维码（用 `qrcode(0, 'M')` 和 `createDataURL(20, 0)`）
   - `fetch(qrDataUrl)` → blob → `arrayBuffer`
   - 创建一个 section，含：
     - `Paragraph` 放二维码 ImageRun（605×605 px）
     - 空 `Paragraph`（间隔，`size: 120`）
     - `Paragraph` 放文字 `TextRun`（`size: 120` = 60pt？）
   - **每个 item 一个 section**，不是一页
8. `new Document({ sections })` → `Packer.toBlob` → `download`

**关键概念：section vs page**

docx 库里，"section" 是**分节符**级别的东西，不是"分页"。**多个 section 会各起一页**（因为每个 section 有独立的页面设置）。

所以每个 item 一个 section，**结果就是每个二维码一页**。这是**故意的**。

**尺寸单位**：

- docx 的 `transformation: { width, height }` 单位是 **px**（80 DPI 名义）
- 605px 的二维码 ≈ 7.5 英寸 ≈ 19cm，A4 宽 21cm，够放
- 字号 `size: 120` 是 **half-points**，即 60pt，很大

**注意**：

- **每个 section 有独立的 headers**：代码里每个 section 都传 `headers: sharedHeaders`
- **`emptyParagraph` 和 `textParagraph` 的 `line: 1200, lineRule: 'exact'`**：精确行高，防止自动行高不一致
- **`fetch` 页眉和二维码 dataURL**：dataURL 走 `fetch` 是合法的，浏览器支持

**性能**：每个 item 都要生成二维码 + fetch + 转 ArrayBuffer。**100 个二维码会明显慢**。

**坑**：`fetch(qrDataUrl)` 在**非常旧的浏览器**上可能不支持 `data:` 协议，当前无兼容处理。

### `downloadTemplate()`

同步。下载模板文件。

**逻辑**：

1. 检查 `templateDocxBase64` 是否含占位符 `__TEMPLATE_BASE64__`
2. 含 → 报错"模板文件不存在"
3. 否则 base64 转 Uint8Array → `download`

**⚠️ 已知缺陷**：

`templateDocxBase64` 初始值是：

```js
this.templateDocxBase64 = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,__TEMPLATE_BASE64__";
```

**`__TEMPLATE_BASE64__` 是占位符，但没有任何流程替换它**。

- 上游维护者的构建流程里**没有对 QRCodeModule 做占位符替换**
- git 里的源码就是占位符状态
- 用户点"模板文件"按钮 → 报"模板文件不存在"

**这是设计上的遗留**。如果要用这个功能：

**方案 A**：把真实 base64 直接写进源码（进 git，不推荐）

**方案 B**：新增一个数据文件 `js/data/template.js`，导出 `window.__QR_TEMPLATE_BASE64__`，模块启动时读

**方案 C**：删掉"模板文件"按钮，避免用户点了报错

---

## 放大预览

### `showEnlarged(index)`

同步。打开图片查看器。

**逻辑**：`app.showImageViewer(this.qrImageSrcs, index, { showPrint: true })`。

**注意**：`index` 来自 `<img>` 的 `data-index`，是**原始 items 的下标**，可能与 `qrImageSrcs` 的下标不一致（见 `renderQRCodes` 的注释）。

---

## 事件绑定

### `bindEvents(panel)`

同步。绑定面板内所有事件。

**绑定的监听**：

| 元素                       | 事件          | 行为                                              |
| -------------------------- | ------------- | ------------------------------------------------- |
| `#qcGenQrBtn`            | click         | `generateQRCodes()`                             |
| `#qcSaveImgBtn`          | click         | `saveImages()`                                  |
| `#qcExportPdfBtn`        | click         | `exportPdf()`                                   |
| `#qcExportDocxBtn`       | click         | `exportDocx()`                                  |
| `#qcDownloadTemplateBtn` | click         | `downloadTemplate()`                            |
| `#qcHeaderImageUpload`   | change        | `handleHeaderUpload(event)`                     |
| `#qcResetHeaderBtn`      | click         | `resetHeader()`                                 |
| `#qcUseDefaultHeader`    | change        | `updateHeaderPreview()`                         |
| `#qcContainer`           | click（委托） | 点`.qrcode-item img` → `showEnlarged(index)` |

**末尾**：

```js
this._fontTimer = setTimeout(() => this.detectSystemFonts(), 1000);
```

**延时 1 秒**再检测字体，避免阻塞渲染。

**注意**：`renderPanel` 末尾还会调一次 `updateHeaderPreview()`，与 `bindEvents` 里的 `#qcUseDefaultHeader` 的 change 监听**没有冲突**（一个初始化，一个响应变化）。

---

## renderPanel

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    <div class="table-header">
        <h2>地堆二维码生成</h2>
        <div>
            <button id="qcDownloadTemplateBtn">模板文件</button>
            [帮助按钮]
        </div>
    </div>

    <!-- 默认页眉勾选 -->
    <div class="panel-box">
        <div class="checkbox-group">
            <input id="qcUseDefaultHeader" checked> 默认页眉
        </div>
        <p class="note">...</p>
    </div>

    <!-- 页眉上传 + 预览 -->
    <div class="header-upload-section">
        <div class="upload-controls">
            <label>上传页眉图片</label>
            <div class="file-input-wrapper">
                <input type="file" id="qcHeaderImageUpload" accept="image/*">
                <div class="file-input-button">选择图片文件</div>
            </div>
            <div id="qcFileName">未选择文件，将使用默认页眉</div>
            <button id="qcResetHeaderBtn">重置为默认页眉</button>
        </div>
        <div class="preview-container">
            <h4>页眉预览</h4>
            <div id="qcHeaderPreview">...</div>
        </div>
    </div>

    <!-- 输入区 -->
    <div class="form-group">
        <label for="qcInput">输入库位列表</label>
        <textarea id="qcInput" placeholder="..."></textarea>
        <p class="note">...</p>
    </div>

    <!-- 操作区 -->
    <div class="actions">
        <div class="checkbox-group">
            <input id="qcFilterDD"> 只保留地堆
        </div>
        <div class="btn-row">
            <button id="qcGenQrBtn">生成二维码</button>
            <button id="qcSaveImgBtn">保存为图片</button>
            <button id="qcExportPdfBtn">导出PDF</button>
            <button id="qcExportDocxBtn">导出DOCX</button>
        </div>
    </div>

    <!-- 结果区 -->
    <div class="result-section">
        <h3>生成结果</h3>
        <div id="qcResult">等待生成...</div>
        <div id="qcContainer" class="qrcode-container"></div>
    </div>
</div>
```

**末尾**：

```js
this.bindEvents(panel);
this.updateHeaderPreview();
this.app._log(this.title + '加载成功');
```

**关键 DOM id**：

| id                                                                           | 用途            |
| ---------------------------------------------------------------------------- | --------------- |
| `qcInput`                                                                  | 库位输入        |
| `qcFilterDD`                                                               | 只保留 DD 勾选  |
| `qcUseDefaultHeader`                                                       | 默认页眉勾选    |
| `qcHeaderImageUpload` / `qcFileName`                                     | 页眉上传        |
| `qcResetHeaderBtn`                                                         | 重置页眉        |
| `qcHeaderPreview`                                                          | 页眉预览        |
| `qcGenQrBtn` / `qcSaveImgBtn` / `qcExportPdfBtn` / `qcExportDocxBtn` | 四个操作按钮    |
| `qcDownloadTemplateBtn`                                                    | 模板下载        |
| `qcResult` / `qcContainer`                                               | 结果计数 + 容器 |

---

## QC_TEXT 文案

### 结构

```js
const QC_TEXT = {
    title, introText, helpDescription,

    // 标题
    heading, btn_template,
    label_useDefaultHeader, note_headerHint,
    label_uploadHeader, fileBtn_pick, fileNameDefault, btn_resetHeader,
    headerPreview, headerEmpty,
    label_input, ph_input, note_inputHint, label_onlyDD,
    btn_generate, btn_saveImg, btn_exportPdf, btn_exportDocx,
    heading_result, resultWaiting, resultCount,

    // 放大
    alt_qr, modal_enlarge, btn_prev, btn_next, btn_print,
    templateFileName,

    // 消息
    msg_imageOnly, msg_imageTooLarge, msg_headerUploaded, msg_readFailed,
    msg_headerReset, msg_imageLoadFallback,
    msg_hasChineseSystem, msg_hasChineseWithFont,
    msg_generateFirst, msg_generating, msg_generatingWithSystemFont,
    msg_generatingMultiple, msg_exportingPdf, msg_exportingDocx,
    msg_generateFailed, msg_imageSaved, msg_imageSavedWithFont,
    msg_multiSaved, msg_multiSavedWithFont,
    msg_pdfOk, msg_pdfFailed, msg_docxOk, msg_docxFailed,
    msg_templateMissing, msg_templateDownloaded, msg_templateDownloadFailed,
    msg_libNotReady, msg_docxLibNotReady,

    // 错误
    err_canvasToBlobFailed, err_allImagesFailed,
    err_qrGenerateFailed, err_canvasFailed, err_drawTextFailed,

    styles
};
```

**`helpDescription` 用 HTML 字符串**（不是模板字符串），因为内部有 `<p>` 但无变量插值。

**无 `{wiki}` 占位符**。要加的话，在 `helpDescription` 里写 `{wiki}` / `{wiki:xxx}`，Core 的 `help-btn` 委托会替换。

**样式**：所有颜色用 Core 变量，`qrcode-item:hover` 有缩放动画，深色模式自动跟随。

---

## 坑位清单

### 1. `__TEMPLATE_BASE64__` 占位符不会自动替换

见 `downloadTemplate` 部分。用户点"模板文件"会报错。

**决策点**：要么删按钮，要么用数据文件方式实现。

### 2. 页眉高度计算的 `0.5` vs `0.9` 不一致

`createImageCanvas` 里：

- 绘制页眉用 `canvasWidth * 0.5`
- 计算 Y 坐标用 `canvasWidth * 0.9`

**后果**：宽高比大的页眉图片会导致二维码/文字偏下。

**修复方向**：抽函数，两处共用。

### 3. `data-index` 与 `qrImageSrcs` 下标可能错位

`renderQRCodes` 里 `data-index` 用**原始 item 下标**，`qrImageSrcs` 只 push 成功的。中间有失败时错位。

**修复方向**：`data-index` 改用 `qrImageSrcs.length - 1`，或者成功后立刻记录。

### 4. `saveImages` / `exportPdf` / `exportDocx` 用的是 `qrItems`

**不是** `qrImageSrcs`。所以：

- 用户改了输入框 → 没重新生成 → 直接点"导出"
- 导出的是**上次生成的 items**，不是当前输入

**当前行为**：可接受（有 `msg_generateFirst` 提示），但用户可能困惑。

### 5. 无输入上限

`filterItems` 没有数量上限。输入 1000 行会生成 1000 个 canvas，卡浏览器。

**MultiQRCode 有 10 个上限**，本模块**没有**。

**建议**：加一个上限（如 100），超出提示。

### 6. `filterItems` 与 `Core.validateLocationCode` 规则不一致

本模块：

```js
if (layer !== 'DD' && !/^\d+$/.test(layer)) return;
```

Core：

```js
if (parts[3] !== 'DD' && !/^\d{2}$/.test(parts[3])) return false;
```

**本模块允许多位 layer 数字**，Core 只允许两位。

**后果**：同一条数据可能在两个模块里行为不同。

### 7. `detectSystemFonts` 的宽度差阈值是 1px

不同字体渲染同一文字宽度差可能小于 1px（比如都是 12px 等宽），导致误判为"没检测到"。

**当前**：只影响 UI 提示（"检测到中文字体" vs "使用系统默认"），不影响功能。

### 8. `detectSystemFonts` 用 `12px` 硬编码

**没考虑**：不同设备像素比、高分辨率屏。`12px` 在 retina 屏上测宽度可能不准。

**修复方向**：用 `24px` 或 `48px` 提高信噪比。

### 9. `detectOperatingSystem` 在 `detectSystemFonts` 之后调

顺序反了。应该先按 OS 重排，再检测。当前逻辑：

1. 按原始顺序检测，找到第一个可用字体就停
2. 再按 OS 重排（对已经找到的字体没影响，只影响失败时的兜底）

**影响**：Windows 上可能先检测到 macOS 字体（如果 Chromium 装了），而微软雅黑没被优先试。

**修复**：把 `detectOperatingSystem()` 提到 `detectSystemFonts` 开头。

### 10. `QRCodeModule` 与 `QRPrintModule` 的 `QR` 命名冲突

两个模块都用了 `qrcode` 库，但**全局名一致**。加载两次会共用全局，没问题。

**但**：`QRCodeModule` 用 `qrcode(0, 'L')`（纠错等级 L），`QRPrintModule` 用 `qrcode(0, cfg.ecc)`（A4 用 M，标签用 H）。**同一全局变量**，无冲突，因为每次都重新 `qrcode(...)`。

### 11. `createImageCanvas` 里 `headerImg.naturalWidth` 可能为 0

如果页眉图片是 SVG 且未指定宽高，`naturalWidth` 可能为 0。除 0 会得到 `Infinity`，`Math.min(Infinity, 60) = 60`，最终 `targetWidth` 计算会出问题。

**当前无保护**。**建议**：加 `headerImg.naturalWidth > 0` 检查。

### 12. `exportDocx` 里每个 item 一个 section

**每个 section 有独立的页面设置**，DOCX 里就是**分页**。所以：

- 100 个二维码 → 100 页
- 每页只有一页页眉 + 一个二维码 + 一行字

**优点**：每页独立，好控制

**缺点**：DOCX 文件可能较大（每个 section 都存一份 header 引用）

### 13. `exportDocx` 用 `fetch(dataUrl)`

`fetch` 对 `data:` URL 是浏览器新特性，**老版本可能不支持**。

**修复方向**：用 `atob` + `Uint8Array` 手动转，不依赖 fetch。

### 14. `qrImageSrcs` 未在 `resetHeader` 中清空

`resetHeader` 只重置页眉，**不清二维码**。这是**有意的**——用户可能只想换页眉然后重新生成。

**但**：如果用户忘记重新生成，`qrImageSrcs` 还是旧页眉的版本。

### 15. `qrcode-item img:hover` 有 `transform: scale(1.02)`

**在非常密集的容器里可能导致相邻元素被覆盖**。因为 `transform` 不改变布局，只改绘制。

**当前**：默认 A4 那么大，不密集，无感。

### 16. `showEnlarged` 的 `data-index` 是字符串

`parseInt(img.dataset.index, 10)` 转数字。**没转的话** `qrImageSrcs[index]` 可能取到 `undefined`。已经处理了。

### 17. `detectSystemFonts` 只在首次进入模块时跑一次

**缓存**在 `this.currentFont`。用户中途装字体不会重检测。

**当前**：可接受。

### 18. `saveImages` 里 `generateSingleImage` 抛错不 catch

```js
if (this.qrItems.length === 1) {
    await this.generateSingleImage(this.qrItems[0]);
    return;
}
```

`generateSingleImage` 内部有 try/catch，会 `rethrow`。外层 `saveImages` 的 `try` 会捕获，`finally` 里 `hideLoading`。

**逻辑正确**，但用户看到的是通用错误。

### 19. `generateMultipleImages` 用 `Promise.all` 无限并行

**1000 个 item 会同时开 1000 个 canvas**。浏览器可能 OOM。

**当前无分片**。**建议**：按批处理，如每 20 个一批。

### 20. `renderQRCodes` 的 `await` 在循环里

```js
for (let i = 0; i < items.length; i++) {
    ...
    const canvas = await this.createImageCanvas(item);
    ...
}
```

**串行生成**，慢但内存友好。**与 `generateMultipleImages` 的并行策略相反**。

### 21. `QC_TEXT.helpDescription` 是 HTML 字符串

不是模板字符串（反引号），用了单引号 + `+` 拼接。**改文案时注意引号**。

### 22. `templateFileName` 是 `'模板文件.docx'`

与 DOCX 导出文件名 `二维码_${timestamp}.docx` 不同。**模板和产物是两回事**。

### 23. `createImageCanvas` 里 `resolve(canvas)` 在 `drawText` 里

**如果页眉或二维码加载失败**，`drawText` 不会被调用，Promise **永久 pending**。

**当前**：`qrImg.onerror` 会 reject，`headerImg.onerror` 只 warn 并继续（`headerLoaded = true`）。所以只有二维码加载失败才会 reject。

**如果 qrcode 库返回的 dataURL 无法加载**（极罕见），会 reject，被 `renderQRCodes` catch。

### 24. `wrapText` 的 `fontSize` 参数未使用

签名有 `fontSize`，但函数体不读它。**读代码的人会困惑**。

**修复方向**：删参数，或函数内用它（如 `ctx.font = ${fontSize}px ...` 自动设置）。

---

## 一页速查

```
入口：  modules.js 清单
id：    qrcode
依赖：  qrcode / jszip / jspdf / docx 库
用途：  地堆二维码 A4 图片生成

流程：
  输入 → filterItems → generateQRCodes → renderQRCodes
  导出 → saveImages / exportPdf / exportDocx

Canvas 布局：
  595×842
  页眉 (10, 20)，最大 50% 宽 / 60 高
  二维码 450×450 居中，Y 依赖页眉
  文字居中，72px 起找最大字号

字体检测：
  detectSystemFonts（1 秒延时）
  用 canvas measureText 比较宽度
  宽度差 > 1px 判为可用

关键 DOM id：
  qcInput / qcFilterDD
  qcUseDefaultHeader / qcHeaderImageUpload / qcFileName
  qcResetHeaderBtn / qcHeaderPreview
  qcGenQrBtn / qcSaveImgBtn / qcExportPdfBtn / qcExportDocxBtn
  qcDownloadTemplateBtn
  qcResult / qcContainer

已知缺陷：
  __TEMPLATE_BASE64__ 占位符不替换
  页眉高度 0.5 vs 0.9 不一致
  data-index 与 qrImageSrcs 可能错位
  无输入上限
  filterItems 校验规则与 Core 不一致

依赖 Core：
  loadLibrary('qrcode' / 'jszip' / 'jspdf' / 'docx')
  showLoading / hideLoading
  showMessage
  showImageViewer
  download
  injectStyle
  getIcon
  validateFile
  timestamp
  logoImage（默认页眉）
  escapeHtml
  _log
```

---

@license Unlicense
