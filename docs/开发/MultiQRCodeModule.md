# MultiQRCodeModule.js 二次开发文档

> 版本对应：MultiQRCodeModule v1.0.0 / 2026-09-23
> 模块 id：`multiqrcode`
> 阅读前提：已读 Core.js 文档（尤其模块契约、`_loadScript`、`loadLibrary`）

---

## 定位

**是**：多二维码实时生成面板。左边输入框，右边实时预览。支持自动大写、库位码格式化、商品信息识别、搜索插入。

**不是**：不做批量导出，不做打印。那些是 QRCode / QRPrint 模块的事。

**入口**：`index.html` / `cloud.html` 里通过 `inlineModules.push(MultiQRCodeModule)` 注册，是默认模块。

---

## 模块契约

```js
class MultiQRCodeModule {
    constructor(app) {
        this.app = app;
        this.title = MQ_TEXT.title;                 // '多二维码生成'
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-23';
        this.iconName = 'qr-code';
        this.introText = MQ_TEXT.introText;         // "其他功能"弹窗里
        this.helpDescription = MQ_TEXT.helpDescription;  // 帮助弹窗
    }
    renderPanel(panel) { ... }
}
window.MultiQRCodeModule = MultiQRCodeModule;
```

**无 `destroy()`**。原因：模块内部只有 `_searchTimer` 一个定时器，且是短时（200ms 防抖），触发后自动清。没有 `document` 级监听，没有 Chart 实例。所以不写 destroy 不会泄漏。

**如果将来加定时器或全局监听，必须补 `destroy()`**。

---

## 外部数据依赖

三个外部资源，**全部通过 script 加载，不通过 fetch**：

| 资源 | 本地路径 | CDN 路径 | 全局变量 | 失败行为 |
|---|---|---|---|---|
| 商品库 | `js/data/productMap.js` | `${cdnBase}main/js/data/productMap.js` | `window.productMapData` | 降级为"基础版"，隐藏商品信息勾选 |
| 常用库位 | `js/data/commonLocations.js` | 同上 | `window.commonLocationsData` | 降级为内置默认列表 |
| qrcode 库 | `js/lib/qrcode.min.js` | cdnjs | `window.qrcode` | 预览空白，无二维码 |

三者都在构造函数里**异步发起加载，不 await**：

```js
this._loadProductMap().catch(err => this.app._log('productMap 加载失败：', err.message));
this._loadCommonLocations().catch(err => this.app._log('commonLocations 加载失败：', err.message));
this.app.loadLibrary('qrcode').catch(err => this.app._log('qrcode 库加载失败：', err.message));
```

页面能在数据到位前渲染，数据到位后自动 `_onInput()` 刷新预览。

---

## 构造函数字段

### 输入状态

| 字段 | 说明 |
|---|---|
| `_isComposing` | 中文输入法组合态，true 时不触发预览刷新 |

### 商品库

| 字段 | 说明 |
|---|---|
| `productMap` | `Map<code, {name, needFresh}>` |
| `_productMapMeta` | `{snapshot, count}`，来自 `window.productMapMeta` |
| `_loadingPromise` | 加载中的 Promise，防重复加载 |
| `_productMapLoadFailed` | 加载失败标志 |

### 常用库位

| 字段 | 说明 |
|---|---|
| `defaultCommonLocations` | 内置硬编码列表（19 条），作为兜底 |
| `commonLocations` | 当前生效列表 |
| `_commonLocationsLoading` | 加载中 Promise |
| `_commonLocationsLoadFailed` | 失败标志 |

### 搜索

| 字段 | 说明 |
|---|---|
| `_searchMode` | `'product'` 或 `'location'` |
| `_searchResults` | 当前结果数组 `[{display, value}]` |
| `_selectedIndex` | 键盘导航选中项，默认 0 |
| `_searchTimer` | 200ms 防抖定时器 |

### 图标缓存

```js
this._iconCache = {
    copy, javascript, fileEarmarkExcel
};
```

当前代码里没用到（因为面板里只有"清空"按钮用 `app.getIcon`），但保留着方便后续扩展。

---

## 生命周期

### `constructor(app)`

按上表初始化全部字段，发起三个异步加载。**不触达 DOM**。

### `injectStyles()`

```js
this.app.injectStyle(this.id, MQ_TEXT.styles);
```

按 `multiqrcode-styles` id 去重。在 `renderPanel` 第一行调。

### `renderPanel(panel)`

见[第十四节](#十四)。

---

## 商品库加载

### `_loadProductMap()`

异步。返回 `Promise<void>`。

**逻辑**：

```
if (_loadingPromise) return _loadingPromise      ← 幂等
_loadingPromise = (async () => {
    if (fromCDN) {
        加载 `${cdnBase}main/js/data/productMap.js`
        if (window.productMapData) return _applyProductMapData()
    } else {
        if (!window.productMapData) 加载 'js/data/productMap.js'
        if (window.productMapData) return _applyProductMapData()

        await _handshake()                        ← 手动触发 CDN 探活
        if (cdnAlive && releaseBatch !== 'dev') {
            加载 `${cdnBase}${releaseBatch}/js/data/productMap.js`
            if (window.productMapData) return _applyProductMapData()
        }
    }
    _productMapLoadFailed = true
    _updateProductMapUI()
    throw new Error(...)
})()
```

**关键点**：

1. **`_handshake()` 是手动调用的**。正常流程里 `_handshake` 由 `_backgroundInit()` 触发，但 MultiQRCode 是默认模块，构造时后台初始化可能还没跑。这里主动调一次，防止 `cdnAlive` 还是初始值 false。
2. **`releaseBatch !== 'dev'` 才走 CDN 兜底**。dev 版是开发态，不连生产 CDN。
3. `_loadingPromise` 缓存，多处调用只加载一次。

### `_applyProductMapData()`

同步。把 `window.productMapData` 应用到内部 `productMap`。

**逻辑**：

1. 非数组 → 置失败标志，抛错
2. 读 `window.productMapMeta`（可选）：
   ```js
   { snapshot: '2026-09-23', count: 12345 }
   ```
   没有就用 `{snapshot: '', count: data.length}`
3. `_parseArrayProductMap(data)` 解析
4. 成功 → `_productMapLoadFailed = false`，`_updateProductMapUI()`，`_onInput()`

**返回**：无。抛错时调用方（`_loadProductMap`）的 catch 会处理。

### `_parseArrayProductMap(arr)`

同步。解析三列数组为 Map。

**数据格式**：

```js
window.productMapData = [
    ['12345', '富士苹果', '是'],
    ['67890', '泰国香蕉', ''],
    ['6901234567890', '蒙牛纯牛奶', '否'],
];
```

**字段**：
- `[0]` 条码（数字或字符串）
- `[1]` 商品名
- `[2]` 当日鲜标记：`'是'` / `'true'` 视为 true，其他为 false

**校验**：
- `item` 非数组或长度 < 3 → 抛错 `err_arrayNeedThreeCols`
- `code` 或 `name` 为空 → 跳过该行（不算错）

**结果**：`this.productMap = Map<code, {name, needFresh}>`。

### `_updateProductMapUI()`

同步。刷新商品库状态 UI。

**做两件事**：

1. `#basicVersionTag`（标题旁的"基础版"标签）：失败时显示，成功时隐藏
2. `#productMapStatus`（勾选旁的版本文字）：
   - 失败 → "（基础版）" + 红色
   - 成功 → "正常，数据版本" + `（${snapshot}）` + 绿色
3. `#showProductInfoGroup`：
   - 失败 → 隐藏整组（用户无法勾选）
   - 成功 → 显示，且**默认勾选**（如果是首次），并触发 `_onInput()`

**注意**：`_updateProductMapUI` 可能在面板还没渲染时被调用（构造函数异步加载完成），所以每一步都要判空。

---

## 常用库位加载

### `_loadCommonLocations()`

异步。结构与 `_loadProductMap` 相同，但失败时**不抛错**，而是降级为 `defaultCommonLocations`。

**失败处理**：
```js
this.commonLocations = [...this.defaultCommonLocations];
this._commonLocationsLoadFailed = true;
console.warn(...)
```

**不阻断**模块初始化，因为常用库位只是搜索的辅助数据。

### `defaultCommonLocations`

硬编码 19 条，包括：
```
YC-CW-CZ-00-00, YC-CW-FJ-00-00, YC-CW-RK-00-00,
YC-CW-T0-00-00, YC-CW-XJ-00-00,
YC-LC-BS-FC-00, YC-LC-BS-SP-00, YC-LC-CZ-00-00,
...
YC-LD-BS-SP-00, YC-LD-CZ-00-00, ...
```

这些是**非标准库位码**（第三段是 2-3 字符字母，第 4 段是 `00` 或 `FC/SP`），与五段库位码 `XX-XX-XX-XX-XX` 不同。所以 `commonLocations` 的搜索**不走** `validateLocationCode`，而是走宽松的规范化子串匹配。

---

## 商品库外部 API

三个方法供其他模块调用。**当前没有其他模块在用**，但保留作为扩展点。

### `setProductMap(data)`

同步。外部替换整个商品库。

**参数**：三列数组（同 `productMapData` 格式）。
**副作用**：重置 `productMap`，`_productMapLoadFailed = false`，刷新 UI，触发 `_onInput()`。
**异常**：非数组 → 抛 `err_unknownMapFormat`。

### `addProductMapping(key, productName, needFresh)`

同步。追加单条映射。

**参数**：
- `key`：条码
- `productName`：商品名
- `needFresh`：默认 false

**副作用**：如果之前 `_productMapLoadFailed` 为 true，会被置 false（用户手动补数据后解除降级态）。

### `_getProductInfo(code)`

同步。**内部方法**，但对外也可用。

**返回**：`{name: string|null, needFresh: boolean}`。

**兼容两种 Map 值**：
- 新格式 `{name, needFresh}`
- 旧格式（字符串）—— 代码里有 `typeof entry === 'string'` 判断，但当前 `_parseArrayProductMap` 只产新格式，所以这个是历史兼容。

---

## 输入处理

### `_onInput()`

同步。输入变化入口。

**逻辑**：

```js
if (_isComposing) return;                    ← 输入法组合中，不刷新
if (typeof qrcode === 'undefined') {
    loadLibrary('qrcode').then(ok => { if (ok && !_isComposing) _renderPreviews(); });
    return;
}
_renderPreviews();
```

**关键**：qrcode 库还没加载完时，先触发加载，加载完再渲染。**不阻塞用户输入**。

### `_insertAtCursor(textarea, textToInsert)`

同步。在光标位置插入文本。

**逻辑**：
- 有 `selectionStart` → 替换选区，光标移到插入内容之后
- 没有（罕见）→ `value += textToInsert`
- 插入后 `textarea.focus()` + `_onInput()`

**用途**：快速键入按钮、搜索结果点击插入。

### `_formatLocationCode(code)`

同步。9/10 位无 `-` 字符串按位置插 `-`。

**规则**：

| 输入 | 去掉 `-` 后长度 | 输出 |
|---|---|---|
| `CW01010101` | 10 | `CW-01-01-01-01` |
| `C01010101` | 9 | `C-01-01-01-01`（首段 1 位） |
| `CW010101` | 8 | 原样返回 |
| `CW-01-01-01-01` | 10 | 原样（已有 `-`，但已被规则命中，输出同上） |

**细节**：
- 先 `code.replace(/-/g, '')` 去掉所有 `-`
- 校验 `/^[a-zA-Z0-9]+$/`，含其他字符直接返回原值
- 10 位 → `match(/.{1,2}/g)` 切 5 段
- 9 位 → `match(/^(.{1})(.{2})(.{2})(.{2})(.{2})$/)` 切首段 1 位

**注意**：这个函数**不转大写**。大写由 `_processLine` 的 `autoUppercase` 处理。

### `_processLine(line, autoUppercase, formatLocation)`

同步。处理单行输入，返回 `[{content, display}]` 数组。

**逻辑**：

```
trim 空行 → []
content = autoUppercase ? trimmed.toUpperCase() : trimmed
isPureNumber = /^\d+$/
inProductMap = isPureNumber && productMap.has(content)

if (formatLocation && (!isPureNumber || !inProductMap)) {
    content = _formatLocationCode(content)          ← 非商品码才格式化
}

if (formatLocation) {
    tokens = trimmed.split(/\s+/)                    ← 按空格切
    if (tokens.length > 1) {
        return tokens.map(token => { ...每 token 独立处理... })   ← 一行多个码
    }
}

return [{ content, display: content }]
```

**关键点**：

1. **纯数字且命中商品库 → 不格式化**。商品码不会被库位格式化搞乱。
2. **按空格切多码**：一行 `CW-01-01-01-01 CW-02-02-02-02` 会产生两个二维码。
3. **`display` 始终等于 `content`**（当前设计）。将来如果想"内容编码 A，下方显示 B"，可以在这里改。**但注意**：QRCode 模块支持 `;` 分隔的显示文字，MultiQRCode **不支持**。这是两个模块的差异。

### `_renderPreviews()`

同步。渲染预览区。

**逻辑**：

```js
textarea 值 → lines
遍历每行 _processLine → allItems
过滤掉 content 为空、content.length > 50 的
shown = allItems.slice(0, 10)                    ← 最多 10 个
if (allItems.length > 10) 显示"仅显示前 10 个"提示
遍历 shown → _generateQRItem(...)
```

**上限**：
- `MAX_ITEMS = 10`：预览只显示 10 个
- `MAX_LEN = 50`：单个内容超 50 字符跳过

**刷新方式**：**整体清空重建**（`previewContainer.innerHTML = ''`）。没有 diff。10 个以内的重建成本可接受。

---

## 商品码识别

这是 MultiQRCode 最复杂的部分，处理的是"扫码枪扫出来的原始数字串"。

### `_parseNumberSegments(numericStr)`

同步。解析长数字串。

**返回**：`{productCode, formattedDate, weightGrams, usedLen, dateStr, time} | null`。

**规则**：

| 前缀 | 基础长度 | 商品码长度 | 示例 |
|---|---|---|---|
| `26` | 20 | 5 或 7 | 26 + 商品码(5/7) + 日期(6) + ... |
| `28` | 23 | 5 或 7 | |
| `29` | 23 | 5 或 7 | |
| `31` | 27 | 5 或 7 | |

**解析步骤**：

1. 长度必须 ≥ 20
2. 前缀必须是 `26/28/29/31` 之一
3. `codeLen = len - baseLen`，必须是 5 或 7
4. `productCode = substring(2, 2 + codeLen)`
5. `dateStr = substring(2 + codeLen, 2 + codeLen + 6)`，格式化为 `YY年MM月DD日`
6. `time = substring(dateStart + 6, dateStart + 8)`，只有 `00` 或 `12` 才有效
7. **重量**：非 `26` 前缀时，`substring(len - 5, len - 1)` 是 4 位克数

**返回 null 的情况**：长度不足、前缀不认、`codeLen` 不是 5/7。

### `_isFresh(dateStr, time, now)`

同步。判断是否当日鲜。

**规则**：

```
diffDays = today - prodDay（天）
diffDays === 0 → true                      ← 今天生产
diffDays === 1 && hour === 12 → true       ← 昨天中午12点
其他 → false
```

**注意**：`hour` 来自 `time` 字段（`00` 或 `12`），只有 `12` 才触发"昨天也算"。这是业务规则。

### `_buildExtraInfoHTML(segments, now)`

同步。构造二维码下方附加信息的 HTML。

**输出**：

```html
<div class="multi-qr-extra-info">
    [商品] 富士苹果 <span style="font-weight:bold;color:#ee6aa7;">当日鲜</span>
    <br>[日期] 2026年09月23日 12:00
    [重量] 500 g
</div>
```

**细节**：

1. **商品名**：
   - 命中 `productMap` → 用商品名
   - 未命中 → `[商品码] 12345 (未录入)`
   - 商品标记 `needFresh` 且 `time` 有效 → 查 `_isFresh`，符合则加 `<span>当日鲜</span>`
2. **日期**：总是显示（只要 `formattedDate` 非空）
3. **重量**：`weightGrams !== null && !isNaN && !== 0` 才显示

**安全**：`productName` 通过 `MQ_TEXT.info_product.replace('{name}', nameDisplay)` 直接字符串拼接。**如果商品名含 HTML 会被注入**。当前商品名是内部数据，假设可信。

### `_colorizeDisplayText(display, rawContent, usedLen)`

同步。给二维码下方文字按段染色。**返回 DocumentFragment 或 string**。

**染色规则**（针对 `display` 里的数字字符，非数字原样）：

| 段 | 位置 | 颜色 |
|---|---|---|
| 商品码 | `[2, 2 + usedLen)` | `#FFBD00`（黄） |
| 日期 | `[2 + usedLen, 2 + usedLen + 6)` | `#00c63d`（绿） |
| 重量 | 从倒数第 5 位到倒数第 2 位（含） | `#2b5799`（蓝） |

**前缀 2 位**（`26/28/29/31`）不染色。

**重量高亮的跳过条件**：
- `rawNumeric` 以 `26` 开头 → 不染重量
- 重量区 4 位数字**全是 0** → 不染（避免全 0 染色）

**为什么返回 Fragment 而不是 HTML 字符串**：直接构造 DOM 节点，避免 XSS 和转义问题。

### `_generateQRItem(content, display, container, now)`

同步。生成单个二维码预览项，追加到 `container`。

**渲染步骤**：

1. **二维码**：用 `qrcode(0, 'L')` 生成，**自己画 canvas**（不是用 `createDataURL`），因为要自定义边距：
   - `qrSize = 200`（不含边距）
   - `border = 10`
   - `totalSize = 220`
   - `cellSize = floor(200 / moduleCount)`
   - 居中偏移 `offsetX/Y = 10 + (200 - actualQrSize) / 2`
   - 白底 + 黑格
2. **下方文字**：调 `_colorizeDisplayText`（如果 `showProductInfo` 勾选），否则用原 `display`
3. **附加信息**（`showProductInfo` 勾选时）：
   - `rawNumeric.length >= 20` → 走 `_parseNumberSegments`
   - `rawNumeric.length === 13` 且命中商品库 → 显示商品名（EAN-13）
   - 其他纯数字且命中商品库 → 显示商品名

**异常处理**：`try/catch` 包裹。失败时渲染一个 `.multi-qr-preview-item.error` div，红色文字显示"生成失败:" + 内容。

**注意**：`_renderPreviews` 里已经过滤了空 content 和超长，`_generateQRItem` 内部的错误基本只在 `qrcode` 库抛异常时发生。

---

## 搜索

### `_toggleSearchMode()`

同步。切商品/库位搜索模式。

**行为**：
- 商品 → 库位：按钮文字变"常用库位"，input placeholder 变
- 库位 → 商品：反过来
- 清空 input 和结果

**不触发搜索**，用户需重新输入。

### `_normalizeLocationString(str)`

同步。库位码规范化，用于模糊匹配。

**规则**：

```
含 '-' → 按 '-' 切段
不含 '-' → 每 2 字符切一段（末尾不足 2 位保留）

每段处理：
  '00'        → '00'（保留）
  纯数字      → 去前导 0（如 '01' → '1'，'00' 保留）
  其他        → 原样

拼起来（无分隔）
```

**示例**：

| 输入 | 规范化结果 |
|---|---|
| `CW-01-01-01-01` | `CW1111` |
| `cw0101` | `cw11` |
| `CW01010101` | `CW1111` |
| `CW-01-01-DD-01` | `CW1DD1`（`DD` 是字母段，原样） |

**用途**：搜索时两边都规范化后 `includes` 子串匹配。

**注意**：`cw0101` → `cw` + `01` + `01`（切成 3 段），每段去前导 0 → `cw1 1`（`01` → `1`），拼起来 `cw11`。**因为 `cw11` 是 `cw1111` 的子串，所以能命中**。

### `_performSearch(query)`

同步。执行搜索，200ms 防抖。

**逻辑**：

```
清 _searchTimer
isLocation = (_searchMode === 'location')
minLen = isLocation ? 3 : 2

if (trimmed.length < minLen) → _hideResults()，return

_searchTimer = setTimeout(() => {
    if (product 模式) {
        if (productMap 空) → hide
        tokens = trimmed.split(/\s+/)
        for ([code, value] of productMap) {
            命中：所有 token 都在 name 或 code 里（子串，lowercase）
            收集：{display: `${name} (${code})`, value: code}
            最多 50 条
        }
        按 display 排序
    } else {
        normalizedQuery = _normalizeLocationString(trimmed)
        for (loc of commonLocations) {
            命中：normalizedLoc.includes(normalizedQuery)
            收集：{display: loc, value: loc}
            最多 50 条
        }
    }
    _searchResults = results
    _selectedIndex = 0
    _showResults(results)
}, 200)
```

**关键点**：

1. **商品模式支持多 token AND**。`统一 1L` → 名称/条码里必须同时含"统一"和"1l"。
2. **库位模式最小 3 字符**。太短会返回海量结果。
3. **两次搜索间隔 < 200ms 会取消前一次**（`clearTimeout`）。
4. **`_searchTimer` 存了定时器 id**，闭包执行时置 null。

### `_showResults(results)`

同步。渲染搜索结果列表。

**行为**：
- 空结果 → 隐藏容器
- 非空 → 清空 `#multiQrSearchResults`，每个结果创建一个 `.result-item`，绑 click → `_insertResult(value)`
- 显示容器
- 选中项（`_selectedIndex`）滚进视口

### `_hideResults()`

同步。隐藏结果，清 `_searchResults`，`_selectedIndex = -1`。

**调用时机**：input blur（延时 200ms）、Esc、模式切换、输入过短。

### `_insertResult(value)`

同步。插入搜索结果到输入框。

**行为**：
- `_insertAtCursor(textarea, value + '\n')`（末尾加换行）
- 清空搜索输入框
- `_hideResults()`
- textarea 聚焦

### `_onSearchKeydown(e)`

同步。搜索框键盘导航。

**行为**：
- `ArrowDown`：`_selectedIndex++`（循环），重画
- `ArrowUp`：`_selectedIndex--`（循环），重画
- `Enter`：插入 `results[_selectedIndex]`
- `Escape`：隐藏结果，blur

**注意**：`preventDefault()` 只在 Arrow 和 Enter 上调，Escape 不阻止。

---

## 渲染

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    <div class="table-header">
        <h2>多二维码生成 <span id="basicVersionTag">基础版</span></h2>
        [帮助按钮]
    </div>
    <div class="multi-qr-container">
        <div class="multi-qr-left">
            <!-- 勾选区 + 清空按钮 -->
            <div class="multi-qr-header">
                <div class="multi-qr-header-actions">
                    <div class="multi-qr-checkbox-group">
                        <div class="toolbar">
                            <input id="autoUppercase" checked> 自动大写
                            <input id="generateLocationCode" checked> 自动格式化库位码
                        </div>
                        <div class="checkbox-group" id="showProductInfoGroup">
                            <input id="showProductInfo" checked> 显示商品信息
                            <span id="productMapStatus"></span>
                        </div>
                    </div>
                    <button id="clearMultiQrText">清空内容 [ESC]</button>
                </div>
            </div>
            <!-- 搜索区 -->
            <div class="multi-qr-search-container">
                <a id="multiQrSearchToggle">搜索 ▼</a>
                <div id="multiQrSearchArea" style="display:none;">
                    <div class="toolbar">
                        <button id="multiQrSearchModeBtn">商品条码</button>
                        <div class="multi-qr-search-wrapper">
                            <input id="multiQrSearchInput">
                            <div id="multiQrSearchResults"></div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- 快速键入 + 输入框 -->
            <div class="multi-qr-input-area">
                <div class="quick-input-buttons">
                    <button class="quick-btn" data-quick="CW">CW</button>
                    ... LC / LD / SC-01-01-01-01 / DW / ZW / DD
                    <button class="quick-btn" data-quick="\n">↵</button>
                </div>
                <textarea id="multiQrTextInput"></textarea>
            </div>
        </div>
        <div class="multi-qr-right">
            <h4>二维码预览</h4>
            <div id="multiQrPreview"></div>
        </div>
    </div>
</div>
```

**渲染后**：`bindEvents(panel)` → `_updateProductMapUI()` → `_log`。

**关键 DOM id**（事件绑定依赖）：

| id | 用途 |
|---|---|
| `multiQrTextInput` | 主输入框 |
| `autoUppercase` | 自动大写勾选 |
| `generateLocationCode` | 库位格式化勾选 |
| `showProductInfo` / `showProductInfoGroup` | 商品信息勾选 |
| `clearMultiQrText` | 清空按钮 |
| `multiQrSearchToggle` / `multiQrSearchArea` | 搜索展开 |
| `multiQrSearchModeBtn` | 模式切换 |
| `multiQrSearchInput` / `multiQrSearchResults` | 搜索输入 + 结果 |
| `multiQrPreview` | 预览容器 |
| `basicVersionTag` / `productMapStatus` | 状态标签 |

---

## 事件绑定

### `bindEvents(panel)`

同步。绑定面板内所有事件。

**绑定的监听**：

| 元素 | 事件 | 行为 |
|---|---|---|
| `#multiQrTextInput` | `input` | `_onInput()` |
| `#multiQrTextInput` | `compositionstart` | `_isComposing = true` |
| `#multiQrTextInput` | `compositionend` | `_isComposing = false` + `_onInput()` |
| `#multiQrTextInput` | `keydown` | Esc → 清空 + `_onInput()` |
| `#autoUppercase` | `change` | 取消勾选时同时取消 `generateLocationCode`，`_onInput()` |
| `#generateLocationCode` | `change` | 勾选时同时勾上 `autoUppercase`，`_onInput()` |
| `#showProductInfo` | `change` | `_onInput()` |
| `#clearMultiQrText` | `click` | 清空 textarea + `_onInput()` |
| `.quick-btn` | `click` | `_insertAtCursor(textarea, data-quick)` |
| `#multiQrSearchToggle` | `click` | 切换 `#multiQrSearchArea` 显隐，改文字，展开时聚焦 |
| `#multiQrSearchInput` | `input` | `_performSearch(value)` |
| `#multiQrSearchInput` | `keydown` | `_onSearchKeydown(e)` |
| `#multiQrSearchInput` | `blur` | 200ms 后 `_hideResults()`（给 click 结果留时间） |
| `#multiQrSearchInput` | `focus` | 有值则重新搜索 |
| `#multiQrSearchModeBtn` | `click` | `_toggleSearchMode()` |

**末尾**：`setTimeout(() => this._onInput(), 0)`，触发首次渲染。

**勾选联动**：

- 取消"自动大写" → 连带取消"自动格式化库位码"（因为格式化假设输入已大写）
- 勾"自动格式化库位码" → 连带勾"自动大写"

---

## MQ_TEXT 文案

### 结构

```js
const MQ_TEXT = {
    title: '多二维码生成',
    introText: '...',
    helpDescription: `...`,

    // 标签 / 按钮
    tag_basicVersion: '基础版',
    label_autoUppercase: '自动大写',
    label_formatLocation: '自动格式化库位码',
    label_showProductInfo: '显示商品信息',
    btn_clear: '清空内容',
    btn_clearHint: '[ ESC ]',
    heading_preview: '二维码预览',

    // 搜索
    search_toggleCollapsed: '搜索 ▼',
    search_toggleExpanded: '搜索 ▲',
    search_productCode: '商品条码',
    search_commonLocation: '常用库位',
    ph_searchProduct: '...',
    ph_searchProductShort: '...',
    ph_input: '...',

    // 商品信息渲染
    alt_qr: '二维码',
    status_mapLoadFailed: '（基础版）',
    status_newMap: '正常，数据版本',
    info_product: '[商品] {name}',
    info_productCodeUnregistered: '[商品码] {code} (未录入)',
    info_date: '<br>[日期] 20{date}{time}',
    info_weight: '[重量] {w} g',
    info_freshTag: ' <span ...>当日鲜</span>',

    // 错误
    err_unknownMapFormat: '...',
    err_arrayNeedThreeCols: '...',
    err_noProductMapData: '...',
    err_productMapLoadFailed: '...',
    err_qrGenerateFailed: '生成失败:',
    warn_commonLocationsLoadFailed: '...',

    // 样式
    styles: `...`
};
```

### 帮助文案里的 `{wiki}` 占位

`helpDescription` 里没有 `{wiki}` / `{wiki:xxx}`，Core 的 `help-btn` 委托逻辑不会替换。如果要加，写：

```js
helpDescription: `
    <p>说明...</p>
    <p><a href="{wiki:商品库格式}" target="_blank">商品库格式</a></p>
    <p><a href="{wiki}" target="_blank">完整说明</a></p>
`,
```

替换后 `{wiki}` → `${wikiBase}使用/多二维码生成`（Core 用 `encodeURIComponent(module.title)`）。

### 样式 token

`styles` 里全部用 Core 变量：

```css
.mq-basic-tag { color: var(--danger); }
.multi-qr-container { gap: var(--sp-6); }
...
```

深色模式自动跟随。**不要写死颜色**。

### 已知硬编码颜色

`_buildExtraInfoHTML` 里"当日鲜"用 `#ee6aa7`，`_colorizeDisplayText` 里用 `#FFBD00` / `#00c63d` / `#2b5799`。这三个是**刻意**的语义色，跟主题无关：

- 黄 = 商品码
- 绿 = 日期
- 蓝 = 重量
- 粉 = 当日鲜

改成 CSS 变量的话要考虑深浅色下是否都可读。

---

## 扩展场景

### 加一种快速键入按钮

在 `renderPanel` 的 `.quick-input-buttons` 里加：

```html
<button type="button" class="quick-btn" data-quick="XY">XY</button>
```

事件绑定里 `.quick-btn` 是 querySelectorAll 遍历，自动生效。

### 加搜索模式（比如"供应商"）

1. 构造函数加 `this._searchMode = 'product' | 'location' | 'supplier'`
2. `_toggleSearchMode` 改成三态循环
3. `_performSearch` 加一个分支
4. 数据来源加一个 `_loadSupplierList()`（参考 `_loadCommonLocations`）

### 改预览上限

`_renderPreviews` 里 `MAX_ITEMS = 10` / `MAX_LEN = 50`。都是局部常量，直接改。

### 支持 `;` 分隔的显示文字（对齐 QRCode 模块）

`_processLine` 当前不看 `;`。要支持的话：

```js
_processLine(line, autoUppercase, formatLocation) {
    const parts = line.split(';');
    let content = parts[0].trim();
    let display = parts.length > 1 ? parts.slice(1).join(';').trim() : content;
    ...
    return [{ content, display }];
}
```

同时 `_generateQRItem` 里 `textDiv.textContent = coloredContent` 要改成用 `display`。

**注意**：这与"空格切多码"逻辑冲突。空格和分号都要支持的话，需要明确优先级。

### 换 qrcode 纠错等级

`_generateQRItem` 里 `qrcode(0, 'L')`。改成 `'M'` / `'Q'` / `'H'` 可提高容错，但模块数变多，`cellSize` 变小。

### 商品库改用 fetch

当前是 script 加载（`window.productMapData`）。改用 fetch 的话：

```js
const res = await fetch(url);
const data = await res.json();
```

**但会引入新问题**：`file://` 下 fetch 被 CORS 拦。当前 script 方式在 `file://` 下可用，这是**本地版能离线跑的关键**。改之前要想清楚。

### 商品库改用增量更新

当前 `_parseArrayProductMap` 每次全量替换。要支持增量的话，加一个 `mergeProductMap(entries)` 方法：

```js
mergeProductMap(entries) {
    for (const [code, name, fresh] of entries) {
        this.productMap.set(code, { name, needFresh: fresh === '是' });
    }
    this._onInput();
}
```

---

## 坑位清单

### 1. `_handshake()` 手动调用

`_loadProductMap` / `_loadCommonLocations` 里在 local 模式下会主动 `await this.app._handshake()`。因为 MultiQRCode 是默认模块，构造时 `_backgroundInit` 可能还没跑。**如果删掉这行，CDN 兜底路径在首次启动时不会触发**。

### 2. `releaseBatch !== 'dev'` 才走 CDN 兜底

dev 版跳过，因为开发时不需要 CDN。改成 `releaseBatch !== 'dev' && releaseBatch !== 'test'` 之类要谨慎，会改变本地开发行为。

### 3. `_processLine` 的空格切分与"内容含空格"冲突

如果用户输入的是商品名含空格的内容（如 `统一 1L`），勾了 `generateLocationCode` 时会被切成两个码。**当前设计假设：勾了库位格式化 = 输入是库位码，不会有空格**。

不勾 `generateLocationCode` 时不会切空格，整行当一个码。

### 4. `_generateQRItem` 里 `_parseNumberSegments` 被调两次

第一次在 `_colorizeDisplayText` 前，第二次在附加信息渲染时。**重复解析**。数据量大时是性能问题。当前 10 个上限下无感。

### 5. `productMap` 的两种值格式

`_getProductInfo` 兼容 `{name, needFresh}` 和字符串两种值。但 `_parseArrayProductMap` 只产新格式。**`_applyProductMapData` 里如果外部直接赋值 `window.productMapData` 为 `Map` 对象（而不是数组），会抛错**。

### 6. `_normalizeLocationString` 对非标准库位码的处理

`YC-CW-CZ-00-00` 这种非标准格式，规范化后是 `YCCWCZ00`。搜索时也要按这个规范化。如果用户搜 `yccwcz`，会命中；搜 `yc-cw-cz`，也会命中（含 `-` 按段切）。

### 7. `showProductInfo` 默认勾选由 `_updateProductMapUI` 控制

商品库加载**成功**后，如果 checkbox 是未勾选状态，会**自动勾上**并触发 `_onInput()`。这是"加载完就默认开启"的逻辑，加载失败则隐藏整组。

**如果用户主动取消勾选后再触发 `_updateProductMapUI`（比如 addProductMapping），会被重新勾上**。当前没有这种调用链，但值得注意。

### 8. `qrcode` 库加载失败后预览空白

`_onInput` 检测到 `typeof qrcode === 'undefined'` 会触发 `loadLibrary`，但如果已经加载过且失败（`_libPromises` 被删），`loadLibrary` 会**重试**。重试也失败的话，预览就一直空白，用户看不到任何错误提示。

**改进方向**：连续失败 N 次后 `showMessage` 提示。

### 9. `_searchTimer` 未在 `destroy` 清理

模块没有 `destroy()`。如果用户在 200ms 内切走了 tab，定时器仍会执行，回调里访问已卸载的 DOM。`_showResults` / `_hideResults` 都做了判空，不会报错，但会浪费一次搜索。

**如果加了 `destroy()`**，记得：
```js
destroy() {
    if (this._searchTimer) {
        clearTimeout(this._searchTimer);
        this._searchTimer = null;
    }
}
```

### 10. `_colorizeDisplayText` 的 `usedLen` 兜底

`_generateQRItem` 里：

```js
let usedLen = 7;
let segments = null;
if (rawNumeric.length >= 20) {
    segments = this._parseNumberSegments(rawNumeric);
    if (segments) usedLen = segments.usedLen;
}
if (segments) coloredContent = this._colorizeDisplayText(display, rawNumeric, usedLen);
else coloredContent = display;
```

`usedLen` 默认 7 是死值，只在 `segments` 非空时用到，所以实际永远是 `segments.usedLen`。**但注意**：`segments` 为 null 时走 `else`，`usedLen` 不会被使用。这段可以简化，但当前逻辑正确。

### 11. `_buildExtraInfoHTML` 的商品名未转义

```js
nameDisplay = productName + MQ_TEXT.info_freshTag;
parts.push(MQ_TEXT.info_product.replace('{name}', nameDisplay));
// 后面 innerHTML 赋值
```

如果 `productName` 含 `<script>`，会被注入。当前商品库是可信数据源，但如果将来改成用户可上传，**必须转义**。

### 12. `_generateQRItem` 里的 canvas 尺寸

`qrSize = 200` 是固定值，`cellSize = floor(200 / moduleCount)`。当二维码版本高（moduleCount 大）时，`cellSize` 可能变成 1 甚至 0，`actualQrSize` 会明显小于 200，边距变大。

**极端情况**：内容超长导致 `moduleCount > 200`，`cellSize = 0`，二维码**完全空白**。`MAX_LEN = 50` 已经防住了，但如果改大 `MAX_LEN` 要一起改 `qrSize`。

### 13. 快速键入 `SC-01-01-01-01` 是全码

其他按钮是 `CW` / `LC` 等**前缀**，用户点完还要继续输入。`SC-01-01-01-01` 是**完整码**，点一下就生成一个二维码。如果这不符合预期，改成 `SC`。

### 14. `alt_qr` 是 `'二维码'`

`img.alt` 是 `'二维码'`，不是内容。屏幕阅读器只会读"二维码"，不会读实际内容。如果可访问性重要，改成 `img.alt = content`。

### 15. `_updateProductMapUI` 在 DOM 未就绪时被调用

构造函数里异步加载商品库，可能在 `renderPanel` 之前完成。所有 DOM 查询都做了判空（`if (tag)` / `if (statusSpan)` / `if (!checkboxGroup) return`），所以安全。

### 16. `TERSER_RESERVED` 必须包含 `MultiQRCodeModule` 和 `MQ_TEXT`

发布配置里已有。**如果改动类名或常量名，必须同步改**。

### 17. 模块 id 是 `multiqrcode`

由 `_idFromClassName('MultiQRCodeModule')` 推导。**改了类名 = 改了模块 id**，会影响 `defaultModuleId` 和 `inlineModules`。

---

## 一页速查

```
入口：  index.html / cloud.html 内联注册
id：    multiqrcode
数据：  productMap.js + commonLocations.js + qrcode 库
默认：  Core.defaultModuleId = 'multiqrcode'

输入处理：
  _onInput → 防抖入口（_isComposing 时跳过）
  _processLine → 单行处理（大写 + 格式化 + 空格切分）
  _formatLocationCode → 9/10 位补横线

商品识别：
  _parseNumberSegments → 拆商品码/日期/重量
  _isFresh → 当日鲜判断
  _buildExtraInfoHTML → 附加信息
  _colorizeDisplayText → 按段染色

搜索：
  _toggleSearchMode → 商品/库位切换
  _normalizeLocationString → 库位规范化（去横线+大小写+子串）
  _performSearch → 200ms 防抖
  _showResults / _hideResults / _insertResult / _onSearchKeydown

渲染：
  renderPanel → 面板 HTML
  bindEvents → 面板事件
  _renderPreviews → 预览刷新（最多 10 个）
  _generateQRItem → 单个二维码（手画 canvas）

状态 UI：
  _updateProductMapUI → 商品库状态标签 + 勾选区显隐
```

---
@license Unlicense