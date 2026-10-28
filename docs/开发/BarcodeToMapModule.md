
# BarcodeToMapModule.js 二次开发文档

> 版本对应：BarcodeToMapModule v1.0.0 / 2026-09-21
> 模块 id：`barcodetomap`
> 阅读前提：已读 Core.js 文档（模块契约、`readExcelTable`、`pickFile`、`copyText`、`download`）
> 依赖：无第三方库（不用 xlsx，因为 `readExcelTable` 内部处理）

---

## 定位

**是**：条码/商品对应表转键值代码生成器。把"条码 → 商品名"的对应关系转成 `window.productMapData = [...]` 的 JS 数组代码，供 MultiQRCode 模块使用。

**不是**：不直接修改 MultiQRCode 的商品库文件，不做数据持久化。**它只是代码生成器**——用户复制/下载生成的 `productMap.js`，手动放回项目。

**上游**：条码数据（从 Excel 粘贴或上传）
**下游**：`productMap.js`（MultiQRCode 依赖）

**典型工作流**：

```
芥末/ERP 导出条码表
  → 粘贴到本模块（或上传 Excel）
  → 生成 productMapData 代码
  → 复制 / 保存 productMap.js
  → 替换 src/js/data/productMap.js
  → MultiQRCode 重新加载
```

---

## 模块契约

```js
class BarcodeToMapModule {
    constructor(app) {
        this.app = app;
        this.title = BT_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-21';
        this.iconName = 'upc-scan';
        this.introText = BT_TEXT.introText;
        this.helpDescription = BT_TEXT.helpDescription;
        // 状态字段...
        // 图标缓存...
    }
    renderPanel(panel) { ... }
}
window.BarcodeToMapModule = BarcodeToMapModule;
```

**无 `destroy()`**。所有事件都绑在 panel 内的 DOM 上，panel 移除即销毁。

**无 `injectStyles()` 方法**。样式在 `renderPanel` 里通过 `this.app.injectStyle(this.id, BT_TEXT.styles)` 注入。

**等等**——看代码：

```js
renderPanel(panel) {
    this.injectStyles();
    ...
}
```

有 `injectStyles()`。见下文。

---

## 状态字段

| 字段                | 类型                                  | 说明                                          |
| ------------------- | ------------------------------------- | --------------------------------------------- |
| `_uploadedData`   | `Array\|null`                        | Excel 上传后的行数组（二维）。null 表示未上传 |
| `_currentColumns` | `{codeCol, nameCol, freshCol}\|null` | 当前列选择。null 表示未选                     |
| `_generatedCode`  | `string`                            | 上次生成的完整代码（用于复制/保存）           |
| `_generatedCount` | `number`                            | 上次生成的数据条数                            |

**两套数据源互斥**：`_uploadedData` 非 null → Excel 分支，否则走 textarea。

**`_currentColumns.freshCol`**：**可为 -1**，表示不用"当日鲜标记"列。不同于 `codeCol` / `nameCol`（必填）。

**图标缓存**：

```js
this._iconCache = {
    copy: app.getIcon('copy'),
    javascript: app.getIcon('javascript'),
    fileEarmarkExcel: app.getIcon('filetype-xlsx'),
};
```

---

## 样式与生命周期

### `injectStyles()`

```js
injectStyles() {
    this.app.injectStyle(this.id, BT_TEXT.styles);
}
```

按 `barcodetomap-styles` 去重。

### `renderPanel(panel)`

同步。渲染整个面板。**在开头调 `injectStyles()`**。

---

## 数据解析

### `_parseLine(line)`

同步。解析单行文本为 `{code, name} | null`。

**分隔符优先级**（`\t` > `,` > 空格）：

```js
line = line.trim();
if (!line) return null;
let delimiter = null;
if (line.includes('\t')) delimiter = '\t';
else if (line.includes(',')) delimiter = ',';
else if (/\s+/.test(line)) delimiter = ' ';
else return null;
```

**规则**：

1. 空行 → null
2. 优先 `\t`（Excel 复制最常见）
3. 其次 `,`（CSV）
4. 其次空格
5. 都不含 → **返回 null**（单列数据无效）

**分列逻辑**：

**空格分隔时**：

```js
let tokens = line.split(/\s+/);
if (tokens.length < 2) return null;
return { code: tokens[0], name: tokens.slice(1).join(' ') };
```

**第 1 个 token 是 code，剩余全部拼成 name**。

**其他分隔符时**：

```js
let parts = line.split(delimiter);
if (parts.length < 2) return null;
return {
    code: parts[0].trim(),
    name: parts.slice(1).join(delimiter === ',' ? ',' : ' ').trim()
};
```

**逗号分隔**：剩余部分**用逗号重新拼**（保留商品的逗号）。

**制表符分隔**：剩余部分**用空格拼**（防止制表符残留）。

**示例**：

| 输入                   | code      | name             |
| ---------------------- | --------- | ---------------- |
| `12345\t富士苹果`    | `12345` | `富士苹果`     |
| `12345,红富士,大果`  | `12345` | `红富士,大果`  |
| `12345 富士苹果 5斤` | `12345` | `富士苹果 5斤` |
| `12345`              | —        | null（单列无效） |

**注意**：

- **不校验 code 是否为纯数字**。任何非空字符串都接受。
- **name 不清理内部空格**（`.trim()` 只清首尾）。`_buildArrayEntry` 里会**去掉所有空白**。

### `_buildArrayEntry(row)`

同步。**单行数据 → 数组项字符串**。

**参数**：`{code, name, fresh}`。

**返回**：`[${JSON.stringify(code)}, ${JSON.stringify(name)}, ${JSON.stringify(fresh)}]`。

**关键逻辑**：

```js
const freshVal = (row.fresh === '是' || row.fresh.toLowerCase() === 'true') ? '是' : '';
const cleanName = String(row.name).replace(/\s+/g, '');
return `[${JSON.stringify(row.code)}, ${JSON.stringify(cleanName)}, ${JSON.stringify(freshVal)}]`;
```

**`fresh` 归一化**：

- 值为 `'是'` → `'是'`
- 值为 `'true'`（大小写不敏感）→ `'是'`
- 其他（空、`'否'`、`'0'`）→ `''`

**`cleanName`**：**去掉所有空白字符**（不只是首尾）。`'富 士 苹果'` → `'富士苹果'`。

**`JSON.stringify`**：安全处理引号、特殊字符。`'A"B'` → `'"A\\"B"'`。

**输出示例**：

```
["12345", "富士苹果", "是"]
["67890", "泰国香蕉", ""]
```

**为什么用 `JSON.stringify` 而非模板字符串**：

- 防注入（商品名含 `"` 时）
- 处理 Unicode 转义
- 输出合法 JS 字面量

### `_getDataRows()`

同步。**统一数据源入口**。

**返回**：`[{code, name, fresh}]`。

**两个分支**：

**Excel 分支**（`_uploadedData && _currentColumns`）：

```js
const rows = [];
const codeIdx = this._currentColumns.codeCol;
const nameIdx = this._currentColumns.nameCol;
const freshIdx = this._currentColumns.freshCol !== undefined ? this._currentColumns.freshCol : -1;
for (const row of this._uploadedData) {
    if (row.length < Math.max(codeIdx, nameIdx) + 1) continue;
    const code = String(row[codeIdx] || '').trim();
    const name = String(row[nameIdx] || '').trim();
    if (code && name) {
        rows.push({ code, name, fresh: freshIdx >= 0 ? String(row[freshIdx] || '').trim() : '' });
    }
}
return rows;
```

**边界检查**：`row.length < Math.max(codeIdx, nameIdx) + 1` → 跳过。**防止下标越界**。

**但**：如果 `freshIdx >= 0` 且 `row.length <= freshIdx` → `row[freshIdx]` 是 `undefined`，`String(undefined || '')` = `''`。**空安全**。

**两列都非空才收**：`code && name`。

**文本分支**：

```js
const raw = textarea ? textarea.value : '';
if (!raw.trim()) return [];
const lines = raw.split(/\r?\n/);
const rows = [];
for (const line of lines) {
    const res = this._parseLine(line);
    if (res) rows.push({ code: res.code, name: res.name, fresh: '' });
}
return rows;
```

**注意**：**文本分支不支持"当日鲜"标记**，`fresh` 始终 `''`。

**如果要支持**：`_parseLine` 里加第 3 列解析。

### `_generate()`

同步。**生成 productMapData 代码**。

**逻辑**：

1. `_getDataRows()` 取数据
2. 空 → 清 `_generatedCode` / `_generatedCount`，`#btMapOutputCode` 显示占位，`showMessage` 报错
3. 生成**完整代码**：
   ```js
   const fullEntries = rows.map(r => this._buildArrayEntry(r)).join(',\n');
   const fullCode = `window.productMapData = [\n${fullEntries}\n];`;
   ```

   缓存到 `_generatedCode` 和 `_generatedCount`
4. 生成**预览代码**（前 50 行）：
   ```js
   const previewRows = rows.slice(0, 50);
   const previewEntries = previewRows.map(r => this._buildArrayEntry(r)).join(',\n');
   const suffix = rows.length > 50
       ? `\n// ... 省略 ${rows.length - 50} 行（复制/导出包含全部 ${rows.length} 条数据）`
       : '';
   const previewCode = `window.productMapData = [\n${previewEntries}${suffix}\n];`;
   ```
5. 写入 `#btMapOutputCode` 的 `textContent`
6. `showMessage('生成商品库数组，共 N 条')`

**关键设计**：

- **完整代码和预览代码分离**：预览只显示前 50 行，**但复制/保存的是全部**
- **预览在 50 行处加注释**：告诉用户省略了多少
- **`textContent` 而非 `innerHTML`**：防止商品名里的 HTML 被解析
- **`fullEntries.join(',\n')`**：每行一个数组项，逗号后换行

**输出格式**：

```js
window.productMapData = [
["12345", "富士苹果", "是"],
["67890", "泰国香蕉", ""],
["54321", "赣南脐橙", ""]
];
```

**注意**：**每项独立一行**，逗号在行尾。**不是标准 JSON**（JSON 不允许尾逗号，但这里是合法 JS）。

---

## Excel 处理

### `_handleExcelFile(file)`

异步。处理上传的 Excel。

**逻辑**：

1. `readExcelTable(file, ...)` 读文件
2. 缓存 `_uploadedData = rows`
3. **填列选择器**：
   - `codeColSelect` / `nameColSelect` 清空后遍历 headers 填 option
   - `freshColSelect` 先加 `<option value="">无</option>`，再填所有列
4. **智能猜列**：
   ```js
   const guessIndex = (keywords) => {
       for (const kw of keywords) {
           const lower = kw.toLowerCase();
           for (let i = 0; i < headers.length; i++) {
               if (headers[i].toLowerCase().includes(lower)) return i;
           }
       }
       return -1;
   };
   const codeGuess = guessIndex(['条码', '编码', 'code', '商品码']);
   const nameGuess = guessIndex(['商品', '名称', 'name', '品名']);
   if (codeGuess >= 0) codeColSelect.value = codeGuess;
   if (nameGuess >= 0) nameColSelect.value = nameGuess;
   ```
5. 显示 `#btExcelColumnSelector`
6. 隐藏 textarea
7. `#btUploadStatus` 显示文件名 + 行数
8. `showMessage('文件解析成功，共 N 行数据，请选择列')`

**猜列优先级**：

- **code**：`条码` → `编码` → `code` → `商品码`
- **name**：`商品` → `名称` → `name` → `品名`

**注意**：

- **`toLowerCase()` 在关键词和表头都做**：`Code` / `CODE` 都能匹配
- **`includes` 不是 `===`**：表头"商品名称"能匹配"商品"，也能匹配"名称"（**先匹配"商品"**）
- **`freshColSelect` 不猜**：因为"当日鲜"语义不明确，让用户手动选
- **上传后不自动生成**：用户需点"生成商品库"

**与 `_handleExcelFile` 的差别**（vs QRPrintModule）：

- **没有"应用选择"按钮**——列选择 change 事件直接触发 `_generate()`？
  - 不对，看 `_bindEvents`：`applyColBtn` 是"应用选择"按钮，需要用户点
- **智能猜列后不自动 `_currentColumns`**：用户仍需点"应用选择"

**等等**——`_bindEvents` 里：

```js
applyColBtn.addEventListener('click', () => {
    const codeIdx = parseInt(codeColSelect.value);
    const nameIdx = parseInt(nameColSelect.value);
    const freshIdx = freshColSelect.value !== '' ? parseInt(freshColSelect.value) : -1;
    if (isNaN(codeIdx) || isNaN(nameIdx) || codeIdx === nameIdx) {
        this.app.showMessage(BT_TEXT.msg_selectDiffCol, 'error');
        return;
    }
    this._currentColumns = { codeCol: codeIdx, nameCol: nameIdx, freshCol: freshIdx };
    this.app.showMessage(BT_TEXT.msg_colApplied, 'success');
    this._generate();
});
```

**"应用选择"做了 3 件事**：

1. 读 3 个 select 的值
2. 校验：`codeCol !== nameCol`，都不能是 NaN
3. **自动调 `_generate()`**——**点一次就生成**

**所以用户工作流**：上传 → 调列 → 点"应用选择" → 看到输出。

**没有"先应用再生成"两步**。

---

## 事件绑定

### `_bindEvents(panel)`

同步。绑定面板内所有事件。

**参数**：`panel`。

**绑定的监听**：

| 元素                           | 事件  | 行为                                          |
| ------------------------------ | ----- | --------------------------------------------- |
| `#btGenerateNewArrayBtn`     | click | `_generate()`                               |
| `#btCopyMapCodeBtn`          | click | `copyText(_generatedCode)`                  |
| `#btSaveMapJsBtn`            | click | `download(_generatedCode, 'productMap.js')` |
| `#btLoadExampleBtn`          | click | 加载示例 + 切回文本模式 + 自动生成            |
| `#btUploadExcelBtn`          | click | `pickFile` → `_handleExcelFile`          |
| `#btApplyColumnSelectionBtn` | click | 应用列选择 +`_generate()`                   |
| `#btSwitchToTextBtn`         | click | 切回文本模式                                  |

**`#btCopyMapCodeBtn`**：

```js
copyBtn.addEventListener('click', async () => {
    if (!this._generatedCode) {
        this.app.showMessage(BT_TEXT.msg_nothingToCopy, 'error');
        return;
    }
    try {
        await this.app.copyText(this._generatedCode);
        this.app.showMessage(BT_TEXT.msg_copied.replace('{n}', this._generatedCount), 'success');
    } catch (e) {
        this.app.showMessage(BT_TEXT.msg_copyFailed, 'error');
    }
});
```

**`copyText` 是异步的**，await + try/catch。

**`#btSaveMapJsBtn`**：

```js
saveBtn.addEventListener('click', () => {
    if (!this._generatedCode) {
        this.app.showMessage(BT_TEXT.msg_generateFirst, 'error');
        return;
    }
    this.app.download(this._generatedCode, 'productMap.js', 'application/javascript');
    this.app.showMessage(BT_TEXT.msg_saved.replace('{n}', this._generatedCount), 'success');
});
```

**`download` 是同步的**（内部触发 a.click）。

**MIME 类型**：`'application/javascript'`。

**`#btLoadExampleBtn`**：

```js
loadExampleBtn.addEventListener('click', () => {
    textarea.value = BT_TEXT.exampleData;
    this._uploadedData = null;
    this._currentColumns = null;
    columnSelector.style.display = 'none';
    if (uploadStatus) uploadStatus.textContent = '';
    textarea.style.display = '';
    this._generate();
});
```

**做 3 件事**：

1. 清 Excel 状态（`_uploadedData` / `_currentColumns`）
2. 切回文本模式（显示 textarea，隐藏列选择器）
3. **自动 `_generate()`**

**`#btUploadExcelBtn`**：

```js
uploadBtn.addEventListener('click', async () => {
    try {
        const file = await this.app.pickFile({ accept: '.xlsx,.xls,.csv' });
        if (!file) return;
        await this._handleExcelFile(file);
    } catch (e) {
        this.app.showMessage(e.message, 'error');
    }
});
```

**try/catch 处理 `pickFile` 的 reject**（文件过大等）。

**accept 包含 `.csv`**：Excel 也能读 CSV。

**`#btSwitchToTextBtn`**：

```js
switchToTextBtn.addEventListener('click', () => {
    this._uploadedData = null;
    this._currentColumns = null;
    columnSelector.style.display = 'none';
    if (uploadStatus) uploadStatus.textContent = '';
    if (textarea) textarea.style.display = '';
    this.app.showMessage(BT_TEXT.msg_switchedToText, 'info');
});
```

**只切状态，不生成**。用户需手动点"生成商品库"。

**注意**：`_switchToText` **未重置 `_generatedCode`**。如果之前生成过，切回后**旧的输出还在**。

**末尾**：

```js
if (!textarea.value) loadExampleBtn.click();
```

**首次进入自动加载示例**。条件是**textarea 值为空**。

**注意**：**这行在 `_bindEvents` 末尾**。意味着 `renderPanel` 调用 `_bindEvents` 后**自动触发一次示例加载 + 生成**。

**用户体验**：**打开模块就看到示例数据和输出**，不用手动点"加载示例"。

---

## renderPanel

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    <div class="table-header">
        <h2>条码转键值</h2>
        [帮助按钮]
    </div>
    <p class="note">支持从Excel复制的两列数据（条码 商品名），自动识别 Tab / 空格 / 英文逗号。</p>

    <!-- 输入区 -->
    <div class="form-group">
        <label>粘贴原始数据 (每行一条，列之间自动分隔，最多1000字符)</label>
        <textarea id="btBarcodeRawData" maxlength="1000" placeholder="示例：..."></textarea>
        <div class="toolbar" style="margin-top:8px;">
            <button id="btUploadExcelBtn">上传Excel文件</button>
            <span id="btUploadStatus" class="status-text"></span>
            <button id="btLoadExampleBtn">加载示例数据</button>
        </div>
        <div id="btExcelColumnSelector" class="panel-box" style="display:none;">
            <div class="columns-row">
                <div><strong>选择列：</strong></div>
                <div class="bt-column-selects">
                    <label>条码列：<select id="btCodeColSelect"></select></label>
                    <label>商品名列：<select id="btNameColSelect"></select></label>
                    <label>当日鲜标记列：<select id="btFreshColSelect"><option value="">无</option></select></label>
                </div>
                <button id="btApplyColumnSelectionBtn" class="btn btn-success">应用选择</button>
                <button id="btSwitchToTextBtn" class="btn btn-secondary">切换回文本输入</button>
            </div>
        </div>
    </div>

    <!-- 生成按钮 -->
    <div class="btn-row">
        <button id="btGenerateNewArrayBtn" class="btn btn-success">生成商品库</button>
    </div>

    <!-- 输出 -->
    <div class="form-group">
        <label>生成的代码 (预览前50行，超出显示…，复制/导出为全部数据)</label>
        <pre id="btMapOutputCode" class="code-output">// 点击生成按钮后显示结果</pre>
    </div>

    <!-- 复制/保存 -->
    <div class="btn-row">
        <button id="btCopyMapCodeBtn" class="btn copy-btn">复制代码</button>
        <button id="btSaveMapJsBtn" class="btn btn-warning">保存为 productMap.js</button>
    </div>
</div>
```

**注意**：

- **`maxlength="1000"`**：textarea 最多 1000 字符
- **`#btMapOutputCode` 是 `<pre>` 不是 `<textarea>`**：只读输出
- **`#btCopyMapCodeBtn` 有 `copy-btn` class**：Core 的复制委托会拦截？

**等等**——Core 的事件委托：

```js
const copyBtn = t.closest('.copy-btn');
if (!copyBtn) return;
const tableId = copyBtn.getAttribute('data-table');
if (tableId) this.copyTable(tableId);
```

**`copy-table` 委托读 `data-table`**。本模块的按钮**没有 `data-table`**，所以**委托不触发**（`if (tableId)` 判断）。**安全**。

**但**：`.copy-btn` 的样式会被应用（绿色渐变）。**视觉一致，行为不同**。

**末尾**：

```js
this._bindEvents(panel);
```

**`renderPanel` 里没显式调用 `injectStyles()`**？

**看代码**：

```js
renderPanel(panel) {
    this.injectStyles();
    panel.innerHTML = `...`;
    this._bindEvents(panel);
}
```

**有**。第一行。

**关键 DOM id**：

| id                                                               | 用途       |
| ---------------------------------------------------------------- | ---------- |
| `btBarcodeRawData`                                             | 文本输入   |
| `btUploadExcelBtn` / `btUploadStatus`                        | Excel 上传 |
| `btExcelColumnSelector`                                        | 列选择面板 |
| `btCodeColSelect` / `btNameColSelect` / `btFreshColSelect` | 列下拉     |
| `btApplyColumnSelectionBtn` / `btSwitchToTextBtn`            | 应用/切换  |
| `btGenerateNewArrayBtn`                                        | 生成       |
| `btMapOutputCode`                                              | 输出       |
| `btCopyMapCodeBtn` / `btSaveMapJsBtn`                        | 复制/保存  |
| `btLoadExampleBtn`                                             | 加载示例   |

---

## BT_TEXT 文案

### 结构

```js
const BT_TEXT = {
    title: '条码转键值',
    introText: '将条码/商品对应表转为商品库数组，支持Excel上传。',
    helpDescription: '...',

    heading: '条码转键值',
    introNote: '支持从Excel复制的两列数据（条码 商品名），自动识别 Tab / 空格 / 英文逗号。',
    label_rawData: '粘贴原始数据 (每行一条，列之间自动分隔，最多1000字符)',
    ph_rawData: '...',
    btn_uploadExcel: '上传Excel文件',
    btn_loadExample: '加载示例数据',
    label_selectColumns: '选择列：',
    label_codeCol: '条码列：',
    label_nameCol: '商品名列：',
    label_freshCol: '当日鲜标记列：',
    opt_none: '无',
    opt_colPrefix: '列',
    btn_applyColumns: '应用选择',
    btn_switchToText: '切换回文本输入',
    btn_genNewArray: '生成商品库',
    label_output: '生成的代码 (预览前50行，超出显示…，复制/导出为全部数据)',
    outputPlaceholder: '// 点击生成按钮后显示结果',
    btn_copyCode: '复制代码',
    btn_saveJs: '保存为 productMap.js',

    // 消息
    msg_noData: '没有有效数据',
    msg_noDataOutput: '// 没有有效数据，请检查输入或上传文件。',
    msg_genNewArrayOk: '生成商品库数组，共 {n} 条',
    msg_nothingToCopy: '没有可复制的代码，请先生成',
    msg_copied: '代码已复制到剪贴板（共 {n} 条）',
    msg_copyFailed: '复制失败',
    msg_generateFirst: '请先生成有效的代码',
    msg_saved: 'productMap.js 已保存（共 {n} 条）',
    msg_emptyFile: '文件为空或只有表头',
    msg_parseOk: '文件解析成功，共 {n} 行数据，请选择列',
    msg_parseExcelFailed: '解析Excel失败: ',
    msg_uploaded: '已上传: {file} ({n}行数据)',
    msg_selectDiffCol: '请选择不同的列',
    msg_colApplied: '列选择已应用，可生成',
    msg_switchedToText: '已切换回文本输入模式',

    exampleData: `12345\t富士苹果\n67890\t泰国香蕉\n...`,

    styles: `.bt-column-selects{...}
.code-output{...}`
};
```

**`exampleData`**：**6 行制表符分隔数据**。展示多种格式：

- `12345\t富士苹果`（5 位数字 + 中文名）
- `6901234567890\t蒙牛纯牛奶`（13 位 EAN-13）
- `6971234567890123\t农夫山泉矿泉水`（16 位）

**覆盖真实业务场景**。

**`helpDescription`**：**无 HTML 标签**，纯文本。Core 的 help 弹窗会直接显示。

**样式**：

```css
.bt-column-selects{display:flex;gap:var(--sp-3);flex-wrap:wrap}
.code-output{background:var(--bg-sub);color:var(--text-strong);border:1px solid var(--border);
             padding:var(--sp-4);border-radius:var(--r);overflow-x:auto;
             font-size:var(--fs-sm);white-space:pre-wrap;max-height:300px;
             font-family:Consolas,Monaco,"Courier New",monospace;line-height:1.5;margin:0}
```

**`.code-output` 关键**：

- **`white-space: pre-wrap`**：保留换行，但允许换行
- **`max-height: 300px` + `overflow-x: auto`**：超出滚动
- **等宽字体**：代码可读

---

## 坑位清单

### 1. `_buildArrayEntry` 去掉商品名所有空白

```js
const cleanName = String(row.name).replace(/\s+/g, '');
```

**`'富 士 苹 果'` → `'富士苹果'`**。

**为什么**：避免商品名里的空格导致二维码搜索时匹配不上。

**副作用**：**英文商品名的空格也被去掉**。`'Coca Cola'` → `'CocaCola'`。

**当前业务**：中文商品名，空格罕见。**可接受**。

**如果要保留英文空格**：只去中文间的空格：

```js
.replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, '$1')
```

### 2. 文本输入不支持"当日鲜"

`_parseLine` 只解析 `code` 和 `name`，`fresh` 始终 `''`。

**只能通过 Excel 上传 + 列选择设置当日鲜**。

**如果要支持文本**：`_parseLine` 加第 3 列：

```js
const parts = line.split(delimiter);
return {
    code: parts[0].trim(),
    name: parts[1].trim(),
    fresh: parts.length > 2 ? parts[2].trim() : ''
};
```

### 3. `#btLoadExampleBtn` 自动触发

`_bindEvents` 末尾：

```js
if (!textarea.value) loadExampleBtn.click();
```

**首次进入模块自动加载示例**。

**副作用**：如果用户**手动清空 textarea** 后切走再切回，**又会自动加载示例**。

**因为**：`renderPanel` 只在**首次打开**时调（`openModule` 里判断 `modules[id]`）。

**切走再切回不会重渲染**，所以**不会重复触发**。

**但**：如果用户**关闭模块**（`closeModule`）后**重新打开**：

- `modules[id]` 被删除
- 新实例创建
- 新实例的 textarea 是空的
- **自动加载示例**

**符合预期**（重新打开就是全新会话）。

### 4. `applyColBtn` 后自动生成

**用户不需要**点两次（应用 + 生成）。

**但**：`msg_colApplied: '列选择已应用，可生成'` 文案说"可生成"，**实际已经生成了**。

**文案与行为不一致**。

**修复**：改成 `'列选择已应用，已生成'`。

### 5. `_handleExcelFile` 里列选择的值是字符串

```js
codeColSelect.value = codeGuess;    // 数字被转字符串
```

**`select.value` 永远是字符串**。

**在 `applyColBtn` 里**：

```js
const codeIdx = parseInt(codeColSelect.value);
```

**parseInt 转回来**。

**注意**：如果 select 没值（`value = ''`），`parseInt('') = NaN`。

**校验**：`if (isNaN(codeIdx) || isNaN(nameIdx) || codeIdx === nameIdx)`。

**但**：`codeIdx === nameIdx` **不能防** `codeIdx = 0, nameIdx = 0` 都是 NaN 的情况（因为 NaN === NaN 是 false）。**实际有 `isNaN` 先过滤，OK**。

### 6. `maxlength="1000"` 是硬限制

**textarea 超过 1000 字符**：浏览器**直接拒绝输入**。

**用户视角**：粘贴超过 1000 字符，**只保留前 1000**。**没有提示**。

**建议**：去掉 `maxlength`，或调大。

**当前**：可能是为了避免用户粘贴超大文本卡浏览器。**合理**。

### 7. `_generatedCode` 与 textarea 不一致

**场景**：

1. 用户生成一次（`_generatedCode` 有值）
2. 用户改 textarea（不加生成）
3. 用户点"复制代码"

**结果**：复制的是**上次生成**的代码，不是当前 textarea 的。

**当前行为**：**要求用户先点"生成商品库"**。

**没有强制校验**：点"复制"时**不检查** textarea 是否改了。

### 8. 上传 Excel 后切回文本，旧数据仍在

**`#btSwitchToTextBtn`**：

```js
this._uploadedData = null;
this._currentColumns = null;
columnSelector.style.display = 'none';
if (uploadStatus) uploadStatus.textContent = '';
if (textarea) textarea.style.display = '';
```

**隐藏 textarea 时没清空它的值**。所以**切回后看到的是上次 textarea 的内容**。

**行为可解释**：Excel 和文本是两套数据，切回来恢复文本。

**但用户可能困惑**："我明明上传了 Excel，怎么切回来还是旧文本？"

**建议**：切回时**清空 textarea**，或**提示用户**。

### 9. `_generate()` 的 `fullEntries.join(',\n')`

**如果数据 0 条**：`[].join(',\n') = ''`，`fullCode = 'window.productMapData = [\n\n];'`。

**有格式问题**（两空行），但**语法合法**。

**实际不会触发**：空数据在开头就 return 了。

### 10. 输出用 `<pre>` 的渲染成本

**大数据量**（比如 5000 条）：`textContent` 一次性写入 5000 行的字符串。**有渲染开销**。

**预览只显示前 50 行**：但 `textContent` 设置的是**预览代码**，不是完整代码。

**所以**：**渲染的是 50 行**，**完整代码只在内存里**。

**结论**：**无性能问题**。

### 11. `#btApplyColumnSelectionBtn` 的 `btn-success` class

**绿色按钮**。语义上"应用"是主操作，**合理**。

**但**：与"生成商品库"按钮**都是 `btn-success`**，用户可能混淆。

**建议**：区分颜色。

### 12. `_parseLine` 的单空格分隔

```js
else if (/\s+/.test(line)) delimiter = ' ';
```

**含任意空白字符就用空格分**。

**但**：`line = 'a b c'` 时 `split(' ')` → `['a', 'b', 'c']`。**对的**。

**`line = 'a\tb'`**：先匹配 `\t`，**走 tab 分支**。**不会走空格分支**。

**`line = 'a  b'`**（双空格）：`/\s+/` 匹配 → 用空格分隔 → `split(' ')` → `['a', '', 'b']`。

**等等**——`split(' ')` **不合并连续空格**。会产出空字符串。

**但**：`tokens = line.split(/\s+/)` **是正则**，会合并。

**看代码**：

```js
if (delimiter === ' ') {
    let tokens = line.split(/\s+/);
    if (tokens.length < 2) return null;
    return { code: tokens[0], name: tokens.slice(1).join(' ') };
}
```

**用 `/\s+/` 正则**，合并空格。

**`'a  b'`** → `['a', 'b']`。**正确**。

**`'  a b'`** → `['', 'a', 'b']`。**code 是空串**。

**但**：`line` 开头已经 `.trim()` 过了。所以 `'  a b'` 变成 `'a b'`。

**结论**：**trim 后再分**，无问题。

### 13. 中文"全角逗号"不支持

`_parseLine` 只认 `,`（半角）。**`，`（全角）不识别**。

**中文用户粘贴时**：如果源数据用的是全角逗号，会走空格分支（因为 `/\s+/` 也匹配？不，全角逗号不是空白字符）。

**如果 `'12345，富士苹果'`**：

- 无 `\t`
- 无 `,`
- `/\s+/` 不匹配
- `else return null`

**整行丢弃**。

**用户视角**：粘贴了数据，生成 0 条，**不知道为什么**。

**建议**：`_parseLine` 里加全角逗号支持：

```js
else if (line.includes(',') || line.includes('，')) {
    delimiter = /,/;
}
```

### 14. `_handleExcelFile` 的 `readExcelTable` 返回 null 时的处理

```js
const table = await this.app.readExcelTable(file, {
    emptyMessage: BT_TEXT.msg_emptyFile,
    parseErrorMessage: BT_TEXT.msg_parseExcelFailed,
});
if (!table) return;
```

**`readExcelTable` 内部已 `showMessage`**。`return` 直接结束。

**OK**。

### 15. `msg_emptyFile` / `msg_parseOk` 的值不匹配实际

**`msg_emptyFile: '文件为空或只有表头'`**。**正确**。

**`msg_parseOk: '文件解析成功，共 {n} 行数据，请选择列'`**。**正确**。

### 16. `_switchToText` 不是独立方法

**逻辑内联在事件里**，不是独立方法。

**如果要复用**（比如其他按钮也触发），**建议抽方法**。

### 17. `exampleData` 里的数据实际有效

```js
exampleData: `12345\t富士苹果\n67890\t泰国香蕉\n54321\t赣南脐橙\n6901234567890\t蒙牛纯牛奶\n6971234567890123\t农夫山泉矿泉水\n888888\t原味薯片`
```

6 条，都是有效的"条码 商品名"格式。**加载示例后立即生成 6 条数据**。

### 18. `outputPlaceholder` 与实际不符

```js
outputPlaceholder: '// 点击生成按钮后显示结果',
```

**但首次进入自动加载示例 + 生成**，**用户看不到这个占位符**。

**只有清空 textarea 后点"生成商品库"** 才会看到。

**当前**：**占位符是死的**。

**修复**：去掉自动加载示例，或改占位符文案。

### 19. `#btBarcodeRawData` 是 `maxlength=1000` 但示例可能超

**示例数据的长度**：`12345\t富士苹果\n67890\t泰国香蕉\n54321\t赣南脐橙\n6901234567890\t蒙牛纯牛奶\n6971234567890123\t农夫山泉矿泉水\n888888\t原味薯片`

**估算**：约 130 字符。**远小于 1000**。**OK**。

### 20. `_currentColumns.freshCol` 默认 undefined

```js
const freshIdx = this._currentColumns.freshCol !== undefined ? this._currentColumns.freshCol : -1;
```

**如果 `_currentColumns` 是 `{codeCol, nameCol}`**（没 freshCol），`freshIdx = -1`。

**但 `applyColBtn` 里总是设置 freshCol**：

```js
this._currentColumns = { codeCol, nameCol, freshCol: freshIdx };
```

**`freshIdx = freshColSelect.value !== '' ? parseInt(...) : -1`**。

**空值 → -1**。**有值 → 数字**。

**所以 `freshCol` 永远是数字**。`undefined` 分支**不可达**。

**结论**：**这段 fallback 是防御性的**，但实际不需要。

### 21. `msg_selectDiffCol` 的提示不够精确

```js
msg_selectDiffCol: '请选择不同的列'
```

**实际校验**：`isNaN(codeIdx) || isNaN(nameIdx) || codeIdx === nameIdx`。

**三种情况**：

1. codeCol 未选（NaN）
2. nameCol 未选（NaN）
3. codeCol === nameCol

**文案只提"不同"**，没提"必须选"。

**建议**：拆分文案。

### 22. `exampleData` 里有个潜在问题

**`6971234567890123` 是 16 位**。`JSON.stringify` 输出字符串，**不会丢精度**。

**但**：如果用户拿这个数据当"商品码"用，**16 位可能不是标准 EAN**。

**示例数据**：只是为了展示格式，**不代表真实商品码规则**。

---

## 一页速查

```
入口：  modules.js 清单
id：    barcodetomap
依赖：  无（readExcelTable 内部加载 xlsx）
用途：  条码/商品名 → productMapData 代码

输入格式：
  Excel：两列以上（条码列 + 商品名列 + 可选当日鲜列）
  文本：每行 "条码 商品名"，分隔符 \t > , > 空格

输出格式：
  window.productMapData = [
  ["12345", "富士苹果", "是"],
  ["67890", "泰国香蕉", ""]
  ];

关键逻辑：
  _parseLine      单行文本 → {code, name}
  _buildArrayEntry 单条 → JSON 数组项
  _getDataRows    统一数据源
  _generate       生成完整 + 预览代码

数据处理：
  商品名去掉所有空白
  fresh：'是' / 'true' → '是'，其他 → ''
  用 JSON.stringify 防注入

关键 DOM id：
  btBarcodeRawData
  btUploadExcelBtn / btUploadStatus
  btExcelColumnSelector / btCodeColSelect / btNameColSelect / btFreshColSelect
  btApplyColumnSelectionBtn / btSwitchToTextBtn
  btGenerateNewArrayBtn / btMapOutputCode
  btCopyMapCodeBtn / btSaveMapJsBtn
  btLoadExampleBtn

依赖 Core：
  injectStyle
  readExcelTable
  pickFile
  copyText
  download
  showMessage
  getIcon
  getHelpButton
  _log

已知问题：
  _bindEvents 末尾自动加载示例（首次进入无占位符）
  applyColBtn 提示"可生成"但已生成
  文本不支持当日鲜
  全角逗号不识别
  切回文本不清 textarea
  示例数据较简单

设计取舍：
  预览只显示前 50 行，复制/保存全部
  Excel 和文本两套数据互斥
  select 值一律字符串，手动 parseInt
  上传后手动选列，不自动生成
```

---

@license Unlicense
