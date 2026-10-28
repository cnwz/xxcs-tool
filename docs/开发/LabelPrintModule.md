
# LabelPrintModule.js 二次开发文档

> 版本对应：LabelPrintModule v1.0.0 / 2026-09-20
> 模块 id：`labelprint`
> 阅读前提：已读 Core.js 文档（模块契约、`readExcelTable`、`loadLibrary`、`app.logoImage`）
> 依赖：`qrcode` 库（生成二维码）

---

## 定位

**是**：标签打印器。上传 Excel，选一列，生成 **60×40mm 二维码标签**，支持打印全部或勾选部分。标签结构：LOGO + 二维码 + 底部文字。

**不是**：不生成 PDF，不生成图片文件。**只调 `window.print()`**，依赖浏览器/系统的打印对话框。

**与 QRPrintModule 的 label 尺寸对比**：

|        | LabelPrintModule          | QRPrintModule (label)             |
| ------ | ------------------------- | --------------------------------- |
| 用途   | 单个打印（需勾选 / 全打） | 批量导出                          |
| 输出   | `window.print()`        | PDF / PNG / ZIP                   |
| 尺寸   | 60×40mm 硬编码           | 60×40mm（在`QRP_SIZE` 里配置） |
| 数据源 | 只 Excel（一列）          | 文本 + Excel                      |
| 列选择 | 单选（一列）              | 双选（code + display）            |
| 预览   | 前 5 行表格               | 完整 canvas 图                    |
| 依赖   | `@page` CSS             | `jsPDF` / `jszip`             |

**选择建议**：要**下载**用 QRPrintModule；要**直接打印**（用户按打印按钮）用 LabelPrintModule。

---

## 模块契约

```js
class LabelPrintModule {
    constructor(app) {
        this.app = app;
        this.title = LP_TEXT.title;              // '标签打印(测试)'
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-20';
        this.iconName = 'printer';
        this.introText = LP_TEXT.introText;
        this.helpDescription = LP_TEXT.helpDescription;
        // 状态字段...
    }
    renderPanel(panel) { ... }
    destroy() { ... }      ← 有
}
window.LabelPrintModule = LabelPrintModule;
```

**有 `destroy()`**，但**当前是空实现**（见[生命周期](#生命周期)）。

**`title` 后缀 `(测试)`**：表示这个模块**处于试验阶段**。用户看到 tab 名就知道不稳定。

---

## 状态字段

| 字段                | 类型                 | 说明                                 |
| ------------------- | -------------------- | ------------------------------------ |
| `data`            | `Array<Object>`    | 解析后的行（对象形式，key 是列名）   |
| `headers`         | `string[]`         | 表头（过滤空列名后）                 |
| `selectedColumn`  | `string`           | 当前选中的列名                       |
| `printHeader`     | `boolean`          | 是否在二维码内容里带列名前缀         |
| `customVisible`   | `boolean`          | 自定义选择面板是否展开               |
| `checkedIndices`  | `Set<number>`      | 勾选的行下标（**跨过滤保留**） |
| `filteredIndices` | `number[]`         | 当前搜索过滤后的行下标               |
| `_printContainer` | `HTMLElement\|null` | 打印用的临时容器                     |
| `_printStyle`     | `HTMLElement\|null` | 打印用的临时 style                   |

**`data` 结构**：`[{库位列名: 值, 其他列名: 值, ...}]`。

**对象化**：

```js
const data = rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => {
        if (h) obj[h] = (r[i] !== undefined && r[i] !== null) ? r[i] : '';
    });
    return obj;
}).filter(row => Object.keys(row).length > 0);
```

**空表头列被跳过**。**整行为空的行被过滤**（`Object.keys(row).length > 0`）。

**等等**——`obj` 只填**有列名的列**。如果一行**所有列都空**，`obj = {}`，`Object.keys({}).length === 0`，**被过滤**。

**如果一行只有非表头列有值**：那列没列名，**不进 obj**，所以这行可能是 `{}`，**被过滤**。**合理**（无表头的数据无意义）。

**`checkedIndices` 用 Set 而非数组**：

- **跨过滤保留**：过滤后再清过滤，勾选不丢
- **去重**：同一行不会被勾两次
- **快速查找**：`has(idx)` O(1)

**图标缓存**：

```js
this._iconCache = {
    printer: app.getIcon('printer'),
    reset: app.getIcon('arrow-counterclockwise'),
};
```

---

## 生命周期

### `injectStyles()`

```js
this.app.injectStyle(this.id, LP_TEXT.styles);
```

按 `labelprint-styles` 去重。

### `destroy()`

同步。**当前是空实现**。

**但**：模块里有一处需要清理——打印临时容器 `_printContainer` 和 `_printStyle`。

**场景**：用户在 `printLabels` 调用的 1 秒内关闭模块。

- `printLabels` 里 `window.print()` 是同步的
- `window.print()` 阻塞主线程直到用户关掉打印对话框
- 之后 `setTimeout(1000)` 清理临时容器

**如果模块在 `window.print()` 返回后但 `setTimeout` 前被关闭**：

- `_printContainer` 还在 DOM
- 1 秒后 `setTimeout` 触发清理（`this._printContainer` 引用还存在）

**结论**：**当前不会泄漏**（`setTimeout` 有引用）。

**但**：如果用户**狂点打印**（多次点击），会创建多个 `_printContainer`：

```js
const printContainer = document.createElement('div');
printContainer.id = 'printContainer';           // ← id 冲突！
...
document.body.appendChild(printContainer);
this._printContainer = printContainer;           // ← 覆盖引用
```

**第二次打印时**：

- 创建新容器，**同样 id**
- 追加到 body
- `_printContainer` 指向新容器

**结果**：

- 两个 `#printContainer`（**id 重复**）
- 旧的清理定时器清的是旧容器（`this._printContainer` 已被覆盖）
- 新容器的清理定时器清新容器

**实际风险**：

- 旧的 `#printContainer` **永远留在 DOM**
- 每次打印泄漏一个 div

**防护**：`printLabels` 开头应该**先清理旧的**：

```js
if (this._printContainer) { this._printContainer.remove(); this._printContainer = null; }
if (this._printStyle) { this._printStyle.remove(); this._printStyle = null; }
```

**`_printStyle` 同样**：`style.id = 'printLabelStyle'`，重复创建也会 id 冲突。

**结论**：**当前有潜在泄漏**。`destroy()` 应该清理：

```js
destroy() {
    if (this._printContainer) { this._printContainer.remove(); this._printContainer = null; }
    if (this._printStyle) { this._printStyle.remove(); this._printStyle = null; }
}
```

### `resetAll()`

同步。**重置到初始状态**。**带 UI 清理**。

**逻辑**：

1. 清所有状态字段
2. 清 file input 的 value
3. **隐藏 4 个面板**：`#lpColumnSelection` / `#lpPreviewArea` / `#lpActionButtons` / `#lpCustomPrintArea`
4. 清 `#lpPreviewTableContainer`
5. 清 `#lpColumnSelect`
6. 取消勾选 `#lpPrintHeaderCheck`
7. 清 `#lpCustomSearchInput`
8. **移除打印临时容器和样式**
9. `showMessage('已重置，内存已释放')`

**关键**：**打印临时资源也被清理**（虽然当前只清理引用，不检查是否在 DOM）。

**等等**——看代码：

```js
if (this._printContainer) {
    this._printContainer.remove();
    this._printContainer = null;
}
```

**调 `remove()`**。所以即使正在打印，也会被移除。

**如果重置与打印重叠**：可能打印内容被清空。**罕见场景**。

### `renderPanel(panel)`

同步。渲染面板。结构见[渲染](#渲染)。

---

## 数据源

### `handleFileUpload(file)`

异步。处理上传。

**逻辑**：

1. `readExcelTable(file, ...)`
2. 失败返回（内部已提示）
3. **表头过滤**：
   ```js
   this.headers = headers.filter(h => h);
   ```

   **去掉空列名的列**。
4. **行对象化**：
   ```js
   const data = rows.map(r => {
       const obj = {};
       headers.forEach((h, i) => {
           if (h) obj[h] = (r[i] !== undefined && r[i] !== null) ? r[i] : '';
       });
       return obj;
   }).filter(row => Object.keys(row).length > 0);
   ```
5. 空数据 → 报错
6. 初始化状态：
   - `selectedColumn = headers[0] || ''`
   - `printHeader = false`
   - `checkedIndices.clear()`
7. `renderColumnSelection()` → `renderPreview()`
8. 显示面板：`#lpColumnSelection` / `#lpPreviewArea` / `#lpActionButtons`
9. 隐藏 `#lpCustomPrintArea`
10. `customVisible = false`
11. `showMessage('成功加载 N 行数据')`

**注意**：

- **`headers` 是过滤空列名后的**，`data` 用原始 `headers` 索引
- **`selectedColumn` 用过滤后的 `this.headers[0]`**，与 `data` 的 key 对齐
- **`file` 参数未判空**（调用方保证）

### `renderColumnSelection()`

同步。**渲染列选择下拉框**。

**逻辑**：

```js
const select = document.getElementById('lpColumnSelect');
if (!select) return;
select.innerHTML = '';
this.headers.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col;
    if (col === this.selectedColumn) opt.selected = true;
    select.appendChild(opt);
});
select.onchange = () => {
    this.selectedColumn = select.value;
    this.renderPreview();
    if (this.customVisible) this.renderCustomList();
};
```

**`onchange` 是属性赋值**（**覆盖**，不累积）。

**改列时**：

- 更新 `selectedColumn`
- 刷新预览表
- 如果自定义面板展开，重渲染列表

**注意**：**改列不清 `checkedIndices`**。这是设计——用户跨列保留勾选。

**副作用**：用户切到另一列，之前的勾选还在，但**显示的内容变了**。**可能困惑**。

**建议**：改列时清勾选，或提示。

### `renderPreview()`

同步。**渲染前 5 行预览表**。

**逻辑**：

```js
const preview = this.data.slice(0, 5);
let html = '<table><thead><tr><th>' + this.app.escapeHtml(col) + '</th></tr></thead><tbody>';
preview.forEach(row => {
    html += '<tr><td>' + this.app.escapeHtml(row[col] || '') + '</td></tr>';
});
html += '</tbody></table>';
container.innerHTML = html;
```

**只显示选中列**。**前 5 行**。

**`escapeHtml`**：防 XSS。**必须有**。

**注意**：**只显示 1 列**。用户看不到其他列的值。**如果同一列值重复**，用户分不清。

**建议**：可以显示"行号 + 值"，或用多列。

### `printHeader` 的绑定

```js
const headerCheck = document.getElementById('lpPrintHeaderCheck');
headerCheck.onchange = () => {
    this.printHeader = headerCheck.checked;
};
```

**`onchange` 属性赋值**。**只更新状态**，**不刷新预览**。

**因为预览只显示值**，不显示二维码。所以 `printHeader` 不影响预览。

---

## 标签生成

### `generateLabel(rowData, includeHeader)`

同步。**生成单个标签 DOM**。

**参数**：

- `rowData`：一行数据（对象）
- `includeHeader`：是否在二维码内容里带列名前缀

**返回**：`<div>` 元素（标签）。

**结构**：

```html
<div style="width:60mm; height:40mm; position:relative; box-sizing:border-box;
            page-break-after:always; margin:0; padding:0; border:1px solid #eee; background:#fff;">
    <!-- 有 LOGO 时 -->
    <img src="..." style="position:absolute; left:2.38mm; top:0.14mm;
                          width:22.45mm; height:7.38mm;">
  
    <!-- 二维码容器 -->
    <div style="position:absolute; left:50%; top:8.12mm; transform:translateX(-50%);
                width:25.03mm; height:25.03mm;">
        <img src="data:image/gif;base64,..." style="width:100%; height:100%;">
    </div>
  
    <!-- 文字 -->
    <div style="position:absolute; left:50%; top:33.14mm; transform:translateX(-50%);
                font-family:'微软雅黑','Microsoft YaHei',sans-serif; font-size:14px;
                color:#000; text-align:center; width:100%;">
        {二维码内容}
    </div>
</div>
```

**所有样式内联**。因为打印时要用固定 mm 尺寸。

**关键尺寸**：

| 元素   | 尺寸 / 位置                  |
| ------ | ---------------------------- |
| 标签   | 60×40mm                     |
| LOGO   | 22.45×7.38mm，(2.38, 0.14)  |
| 二维码 | 25.03×25.03mm，居中，y=8.12 |
| 文字   | y=33.14mm，全宽居中          |

**LOGO 尺寸硬编码**，不按图片比例缩放。**与 QRPrintModule 的 `_drawLabel` 一致**。

**二维码内容**：

```js
const col = this.selectedColumn;
const value = rowData[col] || '';
const qrText = includeHeader ? `${col}:${value}` : value;
```

**`includeHeader = true`** → `'库位号:XXX'`。**默认 false** → `'XXX'`。

**二维码生成**：

```js
const QR = window.qrcode || window.QRCode;
if (!QR) throw new Error(LP_TEXT.err_qrLib);
const qr = QR(0, 'H');
qr.addData(qrText);
qr.make();
const imgData = qr.createDataURL(4);
```

**用 `window.qrcode || window.QRCode`**：兼容两种全局名。

**纠错等级 `'H'`**：**最高**。适合小标签。

**`createDataURL(4)`**：cellSize=4，**默认边距**。

**失败降级**：

```js
catch (e) {
    console.warn('二维码生成失败', e);
    qrContainer.textContent = LP_TEXT.err_qr;
}
```

**显示 `'QR Error'` 文本**。**不中断整个标签生成**。

**注意**：

- **二维码内容为空**：`qrText = ''`。`qrcode.addData('')` 可能抛错或生成空码。
- **`createDataURL(4)` 生成的是 GIF**（qrcode-generator 库的默认）。**不是 PNG**。
- **`img.style.width/height = '100%'`**：图片填满容器。**依赖容器尺寸**。

### `generateLabels(rows, includeHeader)`

同步。批量生成标签，返回 DocumentFragment。

```js
generateLabels(rows, includeHeader) {
    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(this.generateLabel(row, includeHeader)));
    return fragment;
}
```

**用 DocumentFragment**：批量插入性能好。

### `printLabels(rows, includeHeader)`

异步。**打印入口**。

**逻辑**：

1. 空行 → 报错
2. **上限检查**：> 100 张 → 提示 + 截断
   ```js
   if (rows.length > MAX_PRINT) {
       this.app.showMessage(LP_TEXT.msg_printLimit.replace(/\{max\}/g, MAX_PRINT).replace('{n}', rows.length), 'warning');
       rows = rows.slice(0, MAX_PRINT);
   }
   ```

   **注意 `replace(/\{max\}/g, MAX_PRINT)`**：全局替换（因为 `{max}` 出现两次）。
3. `loadLibrary('qrcode')`
4. `generateLabels` → DocumentFragment
5. **创建打印容器**：
   ```js
   const printContainer = document.createElement('div');
   printContainer.id = 'printContainer';
   printContainer.style.cssText = 'display:none;';       // 屏幕上隐藏
   printContainer.appendChild(fragment);
   document.body.appendChild(printContainer);
   this._printContainer = printContainer;
   ```
6. **注入打印样式**：
   ```js
   const style = document.createElement('style');
   style.id = 'printLabelStyle';
   style.textContent = `
       @page { size: 60mm 40mm; margin: 0; }
       @media print {
           body * { visibility: hidden; }
           #printContainer, #printContainer * { visibility: visible; }
           #printContainer { display: block !important; position: absolute; left:0; top:0; width:100%; }
           #printContainer > div { page-break-after: always; page-break-inside: avoid; border: none !important; }
           #printContainer > div { width:60mm; height:40mm; margin:0; padding:0; box-sizing:border-box; }
           #printContainer img { max-width:100%; }
       }
   `;
   document.head.appendChild(style);
   this._printStyle = style;
   ```
7. `window.print()`（**同步阻塞**）
8. `setTimeout(1000)` 清理容器和样式

**打印 CSS 关键**：

- **`@page { size: 60mm 40mm; margin: 0 }`**：告诉打印机每页 60×40mm，无边距
- **`body * { visibility: hidden }`**：隐藏所有元素
- **`#printContainer, #printContainer * { visibility: visible }`**：显示打印容器
- **`#printContainer { display: block !important }`**：屏幕上 `display:none` 的容器在打印时显示
- **`page-break-after: always`**：每张标签后分页
- **`page-break-inside: avoid`**：标签不跨页
- **`border: none !important`**：打印时去掉屏幕上的灰色边框

**为什么用 `visibility` 而不是 `display`**：

- `display: none` 会**不占空间**，打印时布局会变
- `visibility: hidden` **占空间但不可见**，保留布局
- 打印容器用 `display: block !important` 覆盖屏幕的 `display: none`

**关键**：**打印容器被 `display: block !important`**，所以会参与布局。其他元素 `visibility: hidden`，占位但不可见。**结果**：只显示打印容器，但**位置受其他元素影响**。

**更优方案**：`position: absolute; left: 0; top: 0`，**脱离文档流**。**代码里有这个**：

```css
#printContainer { display: block !important; position: absolute; left:0; top:0; width:100%; }
```

**OK**。

**`window.print()` 是同步的**：

- 调用后阻塞
- 弹出系统打印对话框
- 用户操作完（打印或取消）后返回
- 然后 `setTimeout(1000)` 开始计时

**注意**：**有些浏览器 `window.print()` 是异步的**。Safari 特别明显。

**当前 `setTimeout(1000)` 是硬编码的**。**如果用户 1 秒内没操作完**：

- 打印容器被移除
- 打印内容可能不完整

**建议**：用 `onbeforeprint` / `onafterprint` 事件代替固定延时。

### `printAll()`

异步。**打印全部数据**。

```js
async printAll() {
    if (this.data.length === 0 || !this.selectedColumn) {
        this.app.showMessage(LP_TEXT.msg_uploadFirst, 'error');
        return;
    }
    const rows = this.data.map(row => ({ ...row }));         // 浅拷贝
    await this.printLabels(rows, this.printHeader);
}
```

**浅拷贝**：`{...row}` 复制对象。**防止打印函数改原数据**。

**但**：`printLabels` 内部只读取数据，不改。**浅拷贝是冗余的**。

### `printSelectedRows()`

异步。**打印勾选行**。

```js
async printSelectedRows() {
    if (this.checkedIndices.size === 0) {
        this.app.showMessage(LP_TEXT.msg_selectAtLeastOne, 'error');
        return;
    }
    const rows = Array.from(this.checkedIndices).map(idx => this.data[idx]);
    await this.printLabels(rows, this.printHeader);
}
```

**从 Set 转数组**：`Array.from`。

**注意**：**`checkedIndices` 的下标可能越界**。如果 `data` 被重置但 `checkedIndices` 未清。

**当前**：`resetAll` 清 `checkedIndices`，`handleFileUpload` 也清。**安全**。

---

## 自定义选择面板

### `toggleCustomPanel()`

同步。**切换自定义面板显隐**。

```js
toggleCustomPanel() {
    const panel = document.getElementById('lpCustomPrintArea');
    if (!panel) return;
    this.customVisible = !this.customVisible;
    panel.style.display = this.customVisible ? 'block' : 'none';
    if (this.customVisible) this.renderCustomList();
}
```

**展开时**：调 `renderCustomList` 刷新列表。

**收起时**：**不清 `checkedIndices`**。勾选保留。

### `renderCustomList()`

同步。**渲染自定义选择列表**。

**逻辑**：

1. 取 `#lpCustomRowList`
2. 无 `selectedColumn` → 显示占位
3. 读搜索词：
   ```js
   const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
   const filtered = this.data.map((row, idx) => {
       const val = String(row[col] || '').toLowerCase();
       if (searchVal && !val.includes(searchVal)) return null;
       return { row, idx, display: row[col] || '' };
   }).filter(item => item !== null);
   ```

   **大小写不敏感的 includes 匹配**。
4. `this.filteredIndices = filtered.map(item => item.idx)`
5. 更新选中计数：
   ```js
   const total = this.filteredIndices.length;
   const checked = this.filteredIndices.filter(idx => this.checkedIndices.has(idx)).length;
   selectedCount.textContent = LP_TEXT.msg_selectedCount.replace('{checked}', checked).replace('{total}', total);
   ```

   **注意**：`checked` 只数**当前过滤后的**勾选数。所以"已选 3 / 共 10 行"里的 3 是**当前可见的**勾选数。
6. 空结果 → 显示"没有匹配的行"
7. 渲染每行：
   ```html
   <div class="list-item list-item-even|odd">
       <div class="lp-row-index">{index+1}</div>
       <div class="lp-row-checkbox-cell">
           <input type="checkbox" class="row-checkbox" data-index="{idx}" {checked}>
       </div>
       <div class="lp-row-display">{value}</div>
   </div>
   ```

   **注意 `index+1` 是过滤后的序号**（显示用），`data-index` 是**原始下标**（数据用）。
8. 给每个 checkbox 绑 change：
   ```js
   cb.addEventListener('change', (e) => {
       const idx = parseInt(e.target.dataset.index);
       if (e.target.checked) this.checkedIndices.add(idx);
       else this.checkedIndices.delete(idx);
       this.updateSelectedCount();
   });
   ```

   **`updateSelectedCount` 只更新计数**，**不重渲染**。

**关键**：

- **每次搜索都重渲染**：因为 `filteredIndices` 变了
- **`checkedIndices` 跨过滤保留**：`data-index` 是原始下标，勾选按原始下标存
- **`index+1` 是可见序号**：过滤后重新编号
- **搜索大小写不敏感**：`toLowerCase()` 两边

**性能**：**每次搜索都重建整个列表**。**大数据量有开销**。

**当前无虚拟滚动**，无节流。

### `updateSelectedCount()`

同步。**只更新计数文本**（不重渲染列表）。

```js
const total = this.filteredIndices.length;
const checked = this.filteredIndices.filter(idx => this.checkedIndices.has(idx)).length;
selectedCount.textContent = LP_TEXT.msg_selectedCount.replace('{checked}', checked).replace('{total}', total);
```

**与 `renderCustomList` 里的计数逻辑一致**。

### `selectAllRows()`

同步。**全选当前过滤后的行**。

```js
selectAllRows() {
    if (!this.filteredIndices.length) return;
    this.filteredIndices.forEach(idx => this.checkedIndices.add(idx));
    this.renderCustomList();           // 重渲染，更新勾选框
}
```

**`filteredIndices` 是当前可见的行**。全选**只选可见的**。

**勾选后重渲染**：因为 checkbox 状态需要更新。

### `deselectAllRows()`

同步。**取消全选当前过滤后的行**。

```js
deselectAllRows() {
    if (!this.filteredIndices.length) return;
    this.filteredIndices.forEach(idx => this.checkedIndices.delete(idx));
    this.renderCustomList();
}
```

**只取消可见的**。**过滤掉的行的勾选保留**。

**行为分析**：

- 用户搜索 "A"，勾选几个
- 清空搜索，全选
- **搜索 "A" 的勾选被保留**（因为 `checkedIndices` 是 Set）

**可能不符合预期**。但**逻辑一致**。

---

## 事件绑定

### `bindEvents(panel)`

同步。绑定面板内事件。

**绑定的监听**：

| 元素                     | 事件   | 行为                                    |
| ------------------------ | ------ | --------------------------------------- |
| `#lpUploadExcel`       | change | `handleFileUpload(e.target.files[0])` |
| `#lpResetBtn`          | click  | `resetAll()`                          |
| `#lpPrintAllBtn`       | click  | `printAll()`                          |
| `#lpToggleCustomBtn`   | click  | `toggleCustomPanel()`                 |
| `#lpSelectAllBtn`      | click  | `selectAllRows()`                     |
| `#lpDeselectAllBtn`    | click  | `deselectAllRows()`                   |
| `#lpPrintSelectedBtn`  | click  | `printSelectedRows()`                 |
| `#lpCustomSearchInput` | input  | `renderCustomList()`                  |

**注意**：

- **文件上传用 `change` 事件**，不是 Core 的 `bindUploadSection`
  - **为什么**：本模块的上传是 `<input type="file">` 直接嵌入，不是按钮触发
  - **与 Core 的 `uploadSection` 不同**：Core 的是 `<button>` + `pickFile()`
- **搜索框每次输入都重渲染**：无防抖
- **按钮的 `id`**：`lp` 前缀，避免与其他模块冲突

### 文件上传的处理

```js
const fileInput = panel.querySelector('#lpUploadExcel');
fileInput.addEventListener('change', async (e) => {
    await this.handleFileUpload(e.target.files[0]);
});
```

**未判空**：`e.target.files[0]` 可能 undefined（用户取消选文件？）。

**但**：`change` 事件只在**真的选了文件**时触发。用户取消不触发。

**如果 `files` 为空数组**：`files[0]` 是 undefined。`handleFileUpload(undefined)` → `readExcelTable` 报错。

**`handleFileUpload` 开头**：

```js
if (!file) return;
```

**有判空**。**安全**。

**注意**：**用户选同一文件两次**：`change` 事件**可能不触发**（因为 value 没变）。

**处理**：`handleFileUpload` 结束后清 `fileInput.value`。**当前没清**。

**后果**：用户选 file A → 处理；再次选 file A → **无反应**。

**这是个 UX bug**。修复：

```js
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';              // 立刻清空，允许重选同一文件
    await this.handleFileUpload(file);
});
```

---

## renderPanel

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    <div class="table-header">
        <h2>上传 Excel 文件</h2>
        [帮助按钮]
    </div>
    <div class="toolbar">
        <div class="lp-file-wrap">
            <input type="file" id="lpUploadExcel" accept=".xlsx,.xls" />
        </div>
        <button id="lpResetBtn" class="btn btn-secondary lp-btn-sm">重置</button>
    </div>

    <!-- 列选择（初始 hidden） -->
    <div id="lpColumnSelection" class="panel-box" style="display:none;">
        <h4>选择要打印的列（单选）</h4>
        <div class="lp-col-select-wrap">
            <select id="lpColumnSelect" class="lp-col-select"></select>
        </div>
        <div class="checkbox-group">
            <input type="checkbox" id="lpPrintHeaderCheck" />
            <label for="lpPrintHeaderCheck">打印表头（列名）</label>
        </div>
    </div>

    <!-- 预览（初始 hidden） -->
    <div id="lpPreviewArea" class="panel-box" style="display:none;">
        <h4>数据预览（前5行）</h4>
        <div id="lpPreviewTableContainer" class="lp-preview-table"></div>
    </div>

    <!-- 操作按钮（初始 hidden） -->
    <div id="lpActionButtons" class="btn-row" style="display:none;">
        <button id="lpPrintAllBtn" class="btn btn-success">打印全部</button>
        <button id="lpToggleCustomBtn" class="btn btn-secondary">自定义打印</button>
    </div>

    <!-- 自定义选择面板（初始 hidden） -->
    <div id="lpCustomPrintArea" class="lp-custom-area" style="display:none;">
        <h4>自定义选择行 <span id="lpSelectedCount" class="status-text"></span></h4>
        <div class="toolbar lp-custom-toolbar">
            <input type="text" id="lpCustomSearchInput" placeholder="搜索当前列内容..." class="search-input" />
            <button id="lpSelectAllBtn" class="btn btn-secondary lp-btn-sm">全选</button>
            <button id="lpDeselectAllBtn" class="btn btn-secondary lp-btn-sm">取消全选</button>
            <button id="lpPrintSelectedBtn" class="btn btn-success lp-btn-sm">打印选中行</button>
        </div>
        <div id="lpCustomRowList" class="list-container"></div>
    </div>
</div>
```

**关键 DOM id**：

| id                                                                                           | 用途         |
| -------------------------------------------------------------------------------------------- | ------------ |
| `lpUploadExcel`                                                                            | 文件输入     |
| `lpResetBtn`                                                                               | 重置         |
| `lpColumnSelection`                                                                        | 列选择面板   |
| `lpColumnSelect`                                                                           | 列下拉       |
| `lpPrintHeaderCheck`                                                                       | 打印表头勾选 |
| `lpPreviewArea` / `lpPreviewTableContainer`                                              | 预览         |
| `lpActionButtons` / `lpPrintAllBtn` / `lpToggleCustomBtn`                              | 操作按钮     |
| `lpCustomPrintArea` / `lpSelectedCount`                                                  | 自定义面板   |
| `lpCustomSearchInput` / `lpSelectAllBtn` / `lpDeselectAllBtn` / `lpPrintSelectedBtn` | 自定义工具栏 |
| `lpCustomRowList`                                                                          | 自定义列表   |

**末尾**：

```js
this.bindEvents(panel);
```

**注意**：**没有 `injectStyles()`**？

**看代码**：

```js
renderPanel(panel) {
    this.injectStyles();
    panel.innerHTML = `...`;
    this.bindEvents(panel);
}
```

**有**。第一行。

---

## LP_TEXT 文案

### 结构

```js
const LP_TEXT = {
    title: '标签打印(测试)',
    introText: '上传Excel生成二维码标签和打印',
    helpDescription: '...',

    heading_upload: '上传 Excel 文件',
    btn_reset: '重置',
    heading_selectCol: '选择要打印的列（单选）',
    label_printHeader: '打印表头（列名）',
    heading_preview: '数据预览（前5行）',
    btn_printAll: '打印全部',
    btn_customPrint: '自定义打印',
    heading_customRows: '自定义选择行',
    ph_search: '搜索当前列内容...',
    btn_selectAll: '全选',
    btn_deselectAll: '取消全选',
    btn_printSelected: '打印选中行',

    // 消息
    msg_reset: '已重置，内存已释放',
    msg_excelEmpty: 'Excel为空或格式不正确',
    msg_loaded: '成功加载 {n} 行数据',
    msg_parseFailed: '解析失败: ',
    msg_pickCol: '请选择一列',
    msg_pickColFirst: '请先选择一列',
    msg_selectedCount: '（已选 {checked} / 共 {total} 行）',
    msg_noMatch: '没有匹配的行',
    msg_noDataToPrint: '没有数据可打印',
    msg_uploadFirst: '请先上传数据并选择列',
    msg_selectAtLeastOne: '请至少选择一行',
    msg_printLimit: '单次打印数量超过 {max}，已截断为前 {max} 条（原 {n} 条）',
    msg_qrLibFailed: '二维码库加载失败，请检查网络',

    err_qrLib: 'QRCode library not found',
    err_qr: 'QR Error',

    styles: `...`
};
```

**`helpDescription`**：静态 HTML，**无 `{wiki}` 占位符**。

**`msg_printLimit`**：**`{max}` 出现两次**。`printLabels` 里用了 `replace(/\{max\}/g, MAX_PRINT)` **全局替换**。**`{n}` 只出现一次**，用普通 replace。

**注意**：**`{n}` 出现两次**！

```js
msg_printLimit: '单次打印数量超过 {max}，已截断为前 {max} 条（原 {n} 条）',
```

`{max}` 两次，`{n}` 一次。**但 `{n}` 只替换第一个**（用 `replace('{n}', ...)`）——**这里只有一个 `{n}`，OK**。

**如果是** `'原 {n} 条，截断为 {n}'`：**第二个 `{n}` 不会被替换**。**当前无此问题**。

**`styles`**：

```css
.lp-file-wrap{flex:1;min-width:200px}
.lp-col-select-wrap{max-width:300px}
.lp-col-select{width:100%;padding:var(--sp-2)}
.lp-preview-table{max-height:300px;overflow:auto;border:1px solid var(--border);border-radius:var(--r-sm)}
.lp-custom-area{margin-top:var(--sp-5);border-top:2px solid var(--border-soft);padding-top:var(--sp-4)}
.lp-custom-toolbar{margin-bottom:var(--sp-3)}
.lp-btn-sm{padding:var(--sp-2) var(--sp-4)}
.lp-rows-container{display:flex;flex-direction:column}
.lp-row-index{flex:0 0 40px;text-align:center;color:var(--text-muted);font-size:var(--fs-xs)}
.lp-row-checkbox-cell{flex:0 0 40px;text-align:center}
.lp-row-checkbox-cell input{margin:0}
.lp-row-display{flex:1;padding-left:var(--sp-3);font-size:var(--fs-sm);word-break:break-all}
.lp-pad{padding:var(--sp-3)}
.lp-no-match{padding:var(--sp-3);text-align:center;color:var(--text-muted)}
```

**全用 Core 变量**，深色自动跟随。

**注意**：**`.list-item` / `.list-item-even` / `.list-item-odd` 用的是 Core 的**（`CORE_CSS` 里定义）。本模块**只加子元素样式**。

---

## 打印 CSS 详解

这是本模块的核心，展开讲。

### `@page` 指令

```css
@page { size: 60mm 40mm; margin: 0; }
```

**作用**：告诉浏览器/打印机**每页是 60×40mm，无边距**。

**为什么**：

- 默认 `@page` 是 A4 或 Letter
- 标签打印机需要精确尺寸
- `margin: 0` 避免边距吃掉内容

**⚠️ 兼容性**：`@page` 的 `size` 在**不同浏览器支持不一致**：

- Chrome / Edge：支持
- Firefox：部分支持
- Safari：支持有限

**如果浏览器不支持 `@page size`**：会用默认纸张（A4），标签内容占左上角一小块。**效果差**。

**当前**：依赖浏览器支持。**没有降级方案**。

### `visibility` 方案

```css
@media print {
    body * { visibility: hidden; }
    #printContainer, #printContainer * { visibility: visible; }
    #printContainer { display: block !important; position: absolute; left:0; top:0; width:100%; }
    ...
}
```

**为什么用 visibility**：

- `display: none` 会让元素**不占位**，其他元素重排
- `visibility: hidden` **占位但不可见**，其他元素不动
- **打印容器**用 `display: block !important` **强制显示**（因为屏幕上 `display: none`）

**流程**：

1. 屏幕上：`#printContainer` 是 `display: none`，**不可见不占位**
2. 打印时：`@media print` 生效
3. 所有 `body *` 变 `visibility: hidden`（**占位但不可见**）
4. `#printContainer` 和它内部元素 `visibility: visible`
5. `#printContainer` **强制 `display: block`**，**绝对定位**到 `(0, 0)`
6. 打印内容显示在页面左上

**关键**：**`position: absolute; left: 0; top: 0`** 让打印容器脱离文档流，不受其他元素布局影响。

**如果没有 position: absolute**：打印容器会受其他元素挤压，可能偏位。

### 分页

```css
#printContainer > div { page-break-after: always; page-break-inside: avoid; }
```

**`page-break-after: always`**：每个标签后**强制分页**。

**`page-break-inside: avoid`**：标签内容**不跨页**。

**注意**：**`page-break-*` 是过时属性**，现代浏览器建议用 `break-after` / `break-inside`。**但兼容性好**。

**CSS 规范**：`page-break-*` 已被 `break-*` 取代，但旧名仍可用。

### 尺寸强制

```css
#printContainer > div { width:60mm; height:40mm; margin:0; padding:0; box-sizing:border-box; }
```

**注意**：**这段和上面的分页是同一个选择器**。可以合并：

```css
#printContainer > div {
    page-break-after: always;
    page-break-inside: avoid;
    border: none !important;
    width: 60mm;
    height: 40mm;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
```

**当前代码分了两段**，**风格不统一但功能一致**。

### 图片约束

```css
#printContainer img { max-width:100%; }
```

**二维码图片不超过容器宽**。

**但**：`generateLabel` 里已经设了 `width:100%; height:100%`。**这个约束是兜底**。

---

## 坑位清单

### 1. `destroy()` 空实现，打印资源可能泄漏

见[生命周期](#生命周期)部分。**`_printContainer` / `_printStyle` 应该在这里清理**。

**场景**：用户打印后**1 秒内**关闭模块。`setTimeout` 有引用，会清理。**当前不泄漏**。

**但如果用户狂点打印**：可能产生多个 `#printContainer`。

**修复**：

```js
destroy() {
    if (this._printContainer) { this._printContainer.remove(); this._printContainer = null; }
    if (this._printStyle) { this._printStyle.remove(); this._printStyle = null; }
}
```

### 2. 文件上传不清 value，无法重选同一文件

见[事件绑定](#事件绑定)部分。

**修复**：

```js
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    await this.handleFileUpload(file);
});
```

**等等**——清 value **必须在 `handleFileUpload` 之前**，因为 `e.target.files` 在清 value 后会变。

**正确写法**：

```js
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];       // 先读
    e.target.value = '';                  // 再清
    await this.handleFileUpload(file);    // 用 readFile 传 file
});
```

**`handleFileUpload` 接收 `file` 参数**，**不依赖 input 的 value**。**安全**。

### 3. `printLabels` 的 `setTimeout(1000)` 可能不够

**慢打印机**：用户 1 秒内没点完"打印"，容器被移除。

**修复**：用 `window.onafterprint` 事件：

```js
const cleanup = () => {
    if (this._printContainer) { this._printContainer.remove(); this._printContainer = null; }
    if (this._printStyle) { this._printStyle.remove(); this._printStyle = null; }
    window.removeEventListener('afterprint', cleanup);
};
window.addEventListener('afterprint', cleanup);
window.print();
// 兜底：3 秒后强制清理
setTimeout(cleanup, 3000);
```

**兼容性**：`afterprint` 在 Chrome / Firefox / Edge 支持。**Safari 部分支持**。

**当前用固定延时**：简单但可能不够。

### 4. 二维码内容可能含 HTML 特殊字符

`qrText` 从数据拼，**可能含 `"` 等**。

**但**：`qr.createDataURL` 生成图片，**不涉及 HTML**。**安全**。

**文字部分**：

```js
textDiv.textContent = qrText;
```

**用 `textContent`**，**不解析 HTML**。**安全**。

### 5. `generateLabel` 的 LOGO 尺寸硬编码

```js
img.style.cssText = 'position:absolute; left:2.38mm; top:0.14mm; width:22.45mm; height:7.38mm;';
```

**固定 22.45×7.38mm**，**不按图片比例**。

**如果 `app.logoImage` 宽高比不是 ~3.04:1**：**会被拉伸**。

**与 QRPrintModule 的 `_drawLabel` 一致**（都是硬编码）。

**建议**：抽成一个可配置常量，或按比例计算。

### 6. 打印上限 100 张

```js
const MAX_PRINT = 100;
```

**硬编码**。**超出截断**。

**为什么是 100**：避免 `window.print()` 处理几百页时卡死。

**用户视角**：想打 200 张，被截断到 100。**没有二次确认**。

**建议**：加 `confirm` 询问。

### 7. `printAll` 的浅拷贝是冗余的

见 `printAll` 部分。**不影响功能**。

### 8. `renderPreview` 只显示一列

**用户看不到上下文**。**可能误判数据**。

**当前**：简单。

### 9. 改列不清勾选

见 `renderColumnSelection` 部分。

**后果**：用户切列后，之前的勾选还在。**打印时会打错行**（因为用的是新列的 `data[idx]`，勾选是按旧下标）。

**实际**：`data[idx]` 是**整行对象**，包含所有列。所以打印时用**新列的值**。

**用户期望**：切列后勾选应该重置（因为显示内容变了）。

**建议**：改列时清 `checkedIndices`，或提示用户。

### 10. `renderCustomList` 每次搜索重渲染

**大数据量**（如 5000 行）**每次按键都重建 5000 个 DOM 节点**。

**当前无防抖、无虚拟滚动**。

**建议**：加 200ms 防抖。

### 11. `selectAllRows` / `deselectAllRows` 只操作可见行

**用户期望**：全选**所有**数据（不只是过滤后的）。

**当前**：**只选可见的**。

**文案**："全选" / "取消全选"**没说"可见"**。**可能误导**。

**建议**：文案改成"全选当前" / "取消当前"，或加说明。

### 12. `checkedIndices` 的下标持久性

**跨上传**：`handleFileUpload` 清 `checkedIndices`。**安全**。

**但**：如果用户**重新上传**，之前勾选的下标**不再对应相同数据**。**清空是对的**。

### 13. `_printContainer` / `_printStyle` 未在 `resetAll` 中判空

```js
if (this._printContainer) {
    this._printContainer.remove();
    this._printContainer = null;
}
```

**判空**。**OK**。

### 14. 打印容器 `id="printContainer"` 可能与其他页面元素冲突

**当前**：模块独立，无冲突。

**但如果多个模块都用 `id="printContainer"`**：会冲突。

**建议**：加模块前缀，如 `labelPrintContainer`。

### 15. 打印样式 `id="printLabelStyle"` 同上

**建议**：加模块前缀。

### 16. `window.print()` 的阻塞特性

**某些浏览器**（尤其移动端）**`window.print()` 可能不阻塞**。

**后果**：`setTimeout` 在对话框打开前就开始计时，容器提前移除。

**当前**：假设桌面浏览器。

### 17. 打印后页面状态

**`window.print()` 返回后**：

- 页面恢复正常
- 打印容器还在 DOM（1 秒内）
- `_printStyle` 还在 head

**用户**：如果在 1 秒内操作，可能看到打印容器（`display: none`，**看不见**）。

**OK**。

### 18. `qrText` 含中文时的编码

**`qrcode.addData`**：默认 UTF-8 编码？**取决于 qrcode-generator 库的版本**。

**qrcode-generator 1.4.4**：`addData(data, mode)`，**默认根据内容自动选 mode**。中文会选 **8-bit byte mode**，用 UTF-8 编码。

**扫描结果**：**UTF-8 解码**。**大多数扫描 App 支持**。

**如果 App 只认 ISO-8859-1**：会乱码。**罕见**。

### 19. 预览和打印内容不一致

**预览**：`renderPreview` 显示**前 5 行的选中列值**（纯文本）。

**打印**：`generateLabel` 生成**LOGO + 二维码 + 文字**。

**两者完全不同**。用户可能以为预览就是打印效果。

**建议**：加一个"打印预览"按钮，展示真实标签。

### 20. `msg_loaded` 与实际不符

```js
msg_loaded: '成功加载 {n} 行数据',
```

**`n` 是 `this.data.length`**——**过滤后的**行数。

**用户期望**：显示 Excel 里的原始行数。

**如果原始 100 行，过滤后 95 行**：显示"成功加载 95 行数据"。

**可能困惑**。

**建议**：显示"原始 N 行，有效 M 行"。

### 21. `handleFileUpload` 的 `file` 未判空

```js
async handleFileUpload(file) {
    if (!file) return;
    ...
}
```

**判了**。**OK**。

### 22. 列选择下拉的 `value` 是列名（字符串）

```js
opt.value = col;
```

**列名可能含特殊字符**（如 `"`）？**但业务里列名一般安全**。

**`select.value` 读出来是字符串**。**直接用作 `data` 的 key**。**OK**。

### 23. `headerCheck.onchange` 只更新状态

**`printHeader` 改变不影响预览**（预览只有值）。**合理**。

**但**：如果用户改了 `printHeader` 后再打印，**二维码内容会变**。

**用户可能不知道**。

**建议**：预览时显示二维码内容示例。

### 24. `renderColumnSelection` 的 `onchange` 覆盖

**用 `onchange` 属性赋值**，**不是 `addEventListener`**。

**好处**：不会累积监听。

**坏处**：如果其他地方也 `addEventListener('change', ...)`，**两者都会触发**。

**当前**：只有这一处。**OK**。

### 25. 打印中的临时 DOM 会被 Core 的 modal 影响

**如果打印过程中弹 Core 的 modal**：

- Modal 是 `position: fixed`，`z-index: 10000`
- 打印时 `visibility: hidden` 会**隐藏 modal**
- **但**：`@media print` 的 `body *` 选择器**也匹配 modal**

**结果**：打印时 modal 被隐藏。**符合预期**。

### 26. 重置后 `_printStyle` 在 head 里的残留

**`resetAll` 清理 `_printStyle`**：

```js
if (this._printStyle) {
    this._printStyle.remove();
    this._printStyle = null;
}
```

**如果正在打印**：**移除 style** 可能导致打印异常。

**场景**：用户点"打印全部" → 系统打印对话框弹出（`window.print()` 阻塞） → 用户在对话框里按"取消" → 返回 → 1 秒内点"重置"

**此时**：`setTimeout` 还没触发，`_printStyle` 还在。`resetAll` 移除它。**无影响**（打印已结束）。

**OK**。

### 27. `lp-file-wrap` 的样式

```css
.lp-file-wrap{flex:1;min-width:200px}
```

**在 toolbar 里占满剩余空间**。**OK**。

**但**：`<input type="file">` 是**默认样式**，**没有美化**。

**与 Core 的 `uploadSection` 的 `<button>` 风格不一致**。

### 28. 自定义选择面板的序号与原始行号不一致

**过滤后 `index+1` 是可见序号**。

**用户期望**：可能是**原始行号**（Excel 里的第 N 行）。

**当前**：显示过滤后的序号。**用户搜 "A" 看到 1, 2, 3，清空后变成 1, 2, 3, 4, 5**。

**建议**：显示原始行号（`idx + 1`），或两者都显示。

### 29. `updateSelectedCount` 只在部分场景调用

**调用时机**：

- `renderCustomList` 里
- checkbox change 里

**不调用**：

- 上传后（`handleFileUpload` 里**没调**）
- 重置后（`resetAll` 里**没调**）

**后果**：`#lpSelectedCount` 的初始显示是**上一状态**。

**当前**：`handleFileUpload` 里 `checkedIndices.clear()` 后**没更新 UI**。用户看到的是旧计数。

**修复**：`handleFileUpload` 末尾加 `this.updateSelectedCount()`。

### 30. `renderPanel` 里无 `injectStyles` 之外的初始化

**结构**：

```js
renderPanel(panel) {
    this.injectStyles();
    panel.innerHTML = `...`;
    this.bindEvents(panel);
}
```

**没有**：

- 初始 `renderColumnSelection`
- 初始 `renderPreview`
- 初始 `updateSelectedCount`

**这些都是上传后才调**。**初始状态是隐藏的**。**OK**。

---

## 一页速查

```
入口：  modules.js 清单
id：    labelprint
依赖：  qrcode 库
用途：  60×40mm 二维码标签打印（用 window.print）

数据流：
  Excel → handleFileUpload → data（对象数组）
                              ↓
                renderColumnSelection（列下拉）
                renderPreview（前 5 行）
                renderCustomList（全部行 + 搜索 + 勾选）
                              ↓
                printAll / printSelectedRows
                              ↓
                generateLabel（DOM）
                              ↓
                printLabels → window.print()

标签结构：
  60×40mm
  LOGO(2.38, 0.14, 22.45×7.38)
  二维码(居中, y=8.12, 25.03×25.03)
  文字(y=33.14, 全宽)

打印 CSS：
  @page { size: 60mm 40mm; margin: 0 }
  body * { visibility: hidden }
  #printContainer { display: block !important; position: absolute }
  每标签 page-break-after: always

关键 DOM id：
  lpUploadExcel / lpResetBtn
  lpColumnSelection / lpColumnSelect / lpPrintHeaderCheck
  lpPreviewArea / lpPreviewTableContainer
  lpActionButtons / lpPrintAllBtn / lpToggleCustomBtn
  lpCustomPrintArea / lpSelectedCount
  lpCustomSearchInput / lpSelectAllBtn / lpDeselectAllBtn / lpPrintSelectedBtn
  lpCustomRowList

依赖 Core：
  injectStyle
  readExcelTable
  loadLibrary('qrcode')
  showMessage
  getIcon
  getHelpButton
  escapeHtml
  logoImage
  _log

已知问题：
  destroy 空实现，打印资源可能泄漏
  文件上传不清 value，无法重选同一文件
  setTimeout(1000) 可能不够
  LOGO 尺寸硬编码会拉伸
  改列不清勾选
  搜索无防抖
  全选只操作可见行
  预览与打印效果不同
  handleFileUpload 后不更新选中计数

打印兼容性：
  @page size 在 Chrome/Edge 支持好，Safari 有限
  window.print() 在移动端可能不阻塞
  page-break-* 过时但兼容性好

设计取舍：
  只调 window.print()，不生成文件
  标签尺寸硬编码 60×40mm
  上限 100 张
  依赖浏览器 @page 支持
```

---

@license Unlicense
