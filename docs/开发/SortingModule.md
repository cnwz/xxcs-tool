
# SortingModule.js 二次开发文档

> 版本对应：SortingModule v1.0.0 / 2026-09-21
> 模块 id：`sorting`
> 阅读前提：已读 Core.js 文档（模块契约、`uploadSection`、`bindUploadSection`、`readExcelTable`、`loadLibrary`、`CORE_HEADERS`）
> 依赖：`xlsx` 库（导出结果）

---

## 定位

**是**：整理动线工具。上传含分拣位的货架数据，**按货架重排分拣顺序**。支持拖拽、勾选批量移动、Excel 导入顺序、文本导入顺序，导出时给每个货架下的所有库位写新的分拣排序值。

**不是**：不重排库位内部顺序，不重排同一货架内的库位。**粒度是货架**。

**与 PickingRouteModule 的区别**：

|      | SortingModule                | PickingRouteModule       |
| ---- | ---------------------------- | ------------------------ |
| 输入 | Excel（含分拣位）            | 两段文本                 |
| 粒度 | 货架                         | 货架 + 库位              |
| 输出 | 分拣排序值（按序号 × 步长） | 分拣排序值（按属性算法） |
| 交互 | 拖拽 + 批量移动              | 无                       |
| 计算 | 无算法，纯排序               | 有优先级算法             |

**互补关系**：Sorting 是"手工排序"，PickingRoute 是"算法生成"。实际业务里可能先跑 PickingRoute 出初值，再用 Sorting 微调。

---

## 模块契约

```js
class SortingModule {
    constructor(app) {
        this.app = app;
        this.title = SM_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-21';
        this.iconName = 'list-ul';
        this.introText = SM_TEXT.introText;
        this.helpDescription = SM_TEXT.helpDescription;
        // 状态字段...
    }
    renderPanel(panel) { ... }
}
window.SortingModule = SortingModule;
```

**无 `destroy()`**。原因：

- 没有 document 级监听（拖拽用的是元素级）
- 没有定时器
- 没有 Chart

**注意**：**拖拽事件的监听都绑在 DOM 元素上**，panel 移除时一并销毁。**但**如果拖拽进行中 panel 被移除，`this.dragSrcIndex` 会保留。**无实际影响**（下次拖拽会重置）。

---

## 状态字段

| 字段                           | 类型                                                      | 说明                                      |
| ------------------------------ | --------------------------------------------------------- | ----------------------------------------- |
| `shelves`| `Array<{code, locations, originalPriority, sortOrder}>`|货架列表，**顺序即分拣顺序**|
| `rawData`| `Array`|原始 Excel 行数据（当前**未使用**）|
| `headers`|`string[]`|表头|
| `headerIndex`| `Object`|表头名 → 列索引|
| `dragSrcIndex`| `number\|null`|正在拖拽的源下标|
| `selectedCodesBeforeReorder`| `string[]`|重排前记录的勾选货架码 |
| `departmentPattern`|`RegExp`|部门校验正则（从`app.validations` 取）|

**`shelves[i]` 的结构**：

```js
{
    code: 'CW-01-01',                  // 货架码（前 3 段）
    locations: [{                      // 该货架下所有分拣位
        locationCode: 'CW-01-01-01-01',
        warehouseName: '小象超市-xxx',
        originalSorting: '100',        // 原始分拣排序（字符串）
        priority: 100,                 // 原始分拣排序（数字）或 null
        department: '小象超市-xxx'
    }],
    originalPriority: 100,             // 该货架的代表优先级
    sortOrder: 100                     // 当前排序值（由 applySortOrder 生成）
}
```

**图标缓存**：

```js
this._iconCache = {
    gear: app.getIcon('gear'),
    arrowUp: app.getIcon('arrow-up'),
    arrowDown: app.getIcon('arrow-down'),
    xlsx: app.getIcon('filetype-xlsx'),
    refresh: app.getIcon('arrow-counterclockwise'),
    list: app.getIcon('list-ul'),
};
```

**`departmentPattern`**：从 `app.validations.departmentPattern` 取，取不到用默认：

```js
/^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/
```

---

## 数据处理

### 核心方法：`getCell(row, key)`

同步。读行中指定列的值。

**参数**：

- `row`：数组
- `key`：列名（字符串）或列索引（数字）

**返回**：`string`（已 trim），无值返回 `''`。

**逻辑**：

```js
const idx = typeof key === 'string' ? this.headerIndex[key] : key;
if (idx === undefined || idx >= row.length) return '';
const val = row[idx];
return (val !== undefined && val !== null) ? String(val).trim() : '';
```

**注意**：

- **字符串 key 走 `headerIndex` 查表**
- **数字 key 直接用**
- `idx` 不存在或超界 → `''`
- `val` 是 `null` / `undefined` → `''`
- **统一 `String().trim()`**

**为什么需要这个方法**：Excel 读出来的行是数组，但业务逻辑用列名更直观。这个方法让"列名访问"和"索引访问"统一。

### `findColumnKey(aliases)`

同步。**按别名列表查列名**。

**参数**：`string[]`，别名列表。

**返回**：命中的列名，或 `null`。

**逻辑**：

```js
for (let alias of aliases) {
    if (this.headerIndex[alias] !== undefined) return alias;
}
return null;
```

**按顺序**：先试第一个别名，命中就返回。

**用途**：

```js
const locationCodeKey = this.findColumnKey(['库位号', '库位编码']);
```

兼容不同表头。

### `getShelfType(shelf)`

同步。判断货架类型。

**返回**：`'地堆'` 或 `'货架'`。

**逻辑**：

```js
for (const loc of shelf.locations) {
    const parts = loc.locationCode.split('-');
    if (parts.length >= 4 && parts[3] === 'DD') return SM_TEXT.shelfType_pile;
}
return SM_TEXT.shelfType_rack;
```

**只要有任一库位的第 4 段是 `DD`，整个货架判为地堆**。

**注意**：**只认大写 `DD`**。与 PickingRoute 一致。

### `applySortOrder()`

同步。**重算所有货架的 `sortOrder`**。

**逻辑**：

```js
const start = parseInt(document.getElementById('smStartValue')?.value) || 10;
const step = parseInt(document.getElementById('smStepValue')?.value) || 10;
for (let i = 0; i < this.shelves.length; i++) {
    this.shelves[i].sortOrder = start + i * step;
}
```

**默认**：start=10，step=10。

**结果**：

| 序号 | sortOrder |
| ---- | --------- |
| 0    | 10        |
| 1    | 20        |
| 2    | 30        |
| ...  | ...       |

**副作用**：**只改 `sortOrder`，不改 `shelves` 顺序**。

**调用时机**：

- 上传解析后（`processRawData` 末尾）
- 顺序变化后（`reorderShelvesByCodeOrder` / `moveUp` / `moveDown` / 拖拽）
- 参数输入变化后（`bindEvents` 里 `#smStartValue` / `#smStepValue` 的 input）

### `processRawData(rows)`

同步。**核心解析函数**。把 Excel 二维数组转成 `shelves`。

**参数**：`rows[0]` 是表头，`rows[1..]` 是数据。

**Step 1. 校验和表头处理**

```js
if (rows.length < 2) throw new Error(SM_TEXT.err_needTwoRows);
this.headers = (rows[0] || []).map(h => String(h == null ? '' : h).trim());
this.headerIndex = {};
this.headers.forEach((h, idx) => { if (h) this.headerIndex[h] = idx; });
```

**注意**：**表头为空字符串的列会被跳过**（`if (h)`）。所以 `headerIndex` 里只存非空表头。

**Step 2. 列查找**

```js
const locationCodeKey = this.findColumnKey(['库位号', '库位编码']);
const locationTypeKey = this.findColumnKey(['库位类型', '库位类别', '类型']);
const warehouseKey = this.findColumnKey(['仓库名称', '所属仓库', '库区']);
const sortingKey = this.findColumnKey(['分拣排序', '分拣优先级']);
const departmentKey = this.findColumnKey(['所属部门', '部门']);

if (!locationCodeKey || !locationTypeKey) {
    throw new Error(SM_TEXT.err_missingRequiredCols);
}
```

**必需列**：`库位号`（或 `库位编码`）+ `库位类型`（或 `库位类别` / `类型`）。

**可选列**：`仓库名称` / `库区`、`分拣排序` / `分拣优先级`、`所属部门` / `部门`。

**Step 3. 逐行处理**

```js
const shelfMap = new Map();
for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const locationCode = this.getCell(row, locationCodeKey);
    const locationType = this.getCell(row, locationTypeKey);
    if (!locationCode) continue;
    if (locationType !== '分拣位') continue;

    let department = '';
    if (departmentKey) department = this.getCell(row, departmentKey);
    if (!department || !this.departmentPattern.test(department)) continue;

    // ...
}
```

**过滤规则**：

1. 行不空
2. 库位号非空
3. **`库位类型 === '分拣位'`**（核心过滤）
4. 部门匹配 `departmentPattern`

**注意**：`getCell` 已 trim，所以 `库位类型 = ' 分拣位 '` 也能过。

**Step 4. 提取货架码**

```js
let parts = locationCode.split('-');
let shelfCode = parts.slice(0, 3).join('-');
if (parts.length < 3) shelfCode = locationCode;
```

**正常情况**：`CW-01-01-01-01` → `CW-01-01`。

**异常情况**（不足 3 段）：**整串作为货架码**。**不报错**。

**Step 5. 提取其他字段**

```js
let warehouseName = '';
if (warehouseKey) warehouseName = this.getCell(row, warehouseKey);
if (!warehouseName && this.headerIndex['仓库名称'] !== undefined) warehouseName = this.getCell(row, '仓库名称');
if (!warehouseName && this.headerIndex['库区'] !== undefined) warehouseName = this.getCell(row, '库区');
```

**三级 fallback**：先按 `warehouseKey`（别名命中的），再按 `仓库名称`，再按 `库区`。

**优先级**：`所属仓库` 优先于 `仓库名称` 优先于 `库区`。因为 `findColumnKey` 按别名顺序，先命中 `仓库名称`。

**等等**——`warehouseKey = findColumnKey(['仓库名称', '所属仓库', '库区'])` 试的顺序是：

1. `仓库名称`
2. `所属仓库`
3. `库区`

**所以 `仓库名称` 列存在时优先用它**。如果不存在，用 `所属仓库`。都不存在，用 `库区`。

**然后**：

```js
if (!warehouseName && this.headerIndex['仓库名称'] !== undefined) warehouseName = this.getCell(row, '仓库名称');
```

**如果第一级没取到值（值为空）**，但列存在，再读一次。**这看起来是冗余的**（同列同值）。

**但**：如果 `warehouseKey = '所属仓库'`（说明 `仓库名称` 列不存在），这里读 `仓库名称` 会**跳过**（因为 `headerIndex['仓库名称']` 是 undefined）。

**所以逻辑是**：先从主别名取，空的话再试 `仓库名称` 列（如果它存在但不在主别名里？不可能，主别名就包含它）。

**结论**：**这段是冗余的**。可能是历史遗留。

**Step 6. 分拣排序解析**

```js
let priorityRaw = sortingKey ? this.getCell(row, sortingKey) : '';
let priorityNum = null;
if (priorityRaw && !isNaN(parseFloat(priorityRaw))) {
    priorityNum = parseFloat(priorityRaw);
}
```

**`priorityRaw`**：原始字符串（保留，用于展示）。

**`priorityNum`**：解析后的数字，非数字时为 null。

**用 `parseFloat`**：支持小数。

**Step 7. 组装 locationItem**

```js
const locationItem = {
    locationCode: locationCode,
    warehouseName: warehouseName || '',
    originalSorting: priorityRaw,
    priority: priorityNum,
    department: department
};
```

**Step 8. 挂到 shelfMap**

```js
if (!shelfMap.has(shelfCode)) {
    shelfMap.set(shelfCode, { code: shelfCode, locations: [], priority: priorityNum });
} else {
    const existing = shelfMap.get(shelfCode);
    if (existing.priority === null && priorityNum !== null) existing.priority = priorityNum;
}
shelfMap.get(shelfCode).locations.push(locationItem);
```

**`priority` 的取法**：该货架下**第一个非 null 的 priorityNum**。

**注意**：`priority` 在 shelfMap 里是临时字段，后续映射到 `originalPriority`。

**Step 9. 转数组**

```js
if (shelfMap.size === 0) {
    throw new Error(SM_TEXT.err_noValidLocations);
}
this.shelves = Array.from(shelfMap.values()).map(shelf => ({
    code: shelf.code,
    locations: shelf.locations,
    originalPriority: shelf.priority,
    sortOrder: 0
}));
```

**`sortOrder = 0`** 占位，下面会重算。

**Step 10. 排序**

```js
this.shelves.sort((a, b) => {
    if (a.originalPriority !== null && b.originalPriority !== null) {
        if (a.originalPriority !== b.originalPriority) return a.originalPriority - b.originalPriority;
    } else if (a.originalPriority !== null) return -1;
    else if (b.originalPriority !== null) return 1;
    return a.code.localeCompare(b.code);
});
```

**排序规则**：

1. **都有优先级** → 按优先级升序
2. **只 a 有** → a 在前
3. **只 b 有** → b 在前
4. **都无** → 按货架码字典序

**结果**：**有分拣排序的货架按原值排**，无分拣排序的排后面。

**Step 11. 应用排序值**

```js
this.applySortOrder();
```

**`sortOrder` 从 0 变 10/20/30...**。

---

## 重排方法

### `reorderShelvesByCodeOrder(orderList)`

同步。**按给定货架码顺序重排**。

**参数**：`string[]` 货架码列表（按期望顺序）。

**逻辑**：

1. `captureSelectedCodes()` 记录当前勾选
2. 建 `orderMap`：code → 期望下标
3. 遍历 `shelves`，`orderMap` 有 → matched，无 → unmatched
4. matched 按期望下标排，unmatched 保持原顺序
5. `this.shelves = [...matched, ...unmatched]`
6. `applySortOrder()`
7. `renderShelfList()`
8. `showMessage('货架顺序已按指定方式重新排列')`

**关键设计**：

- **`orderList` 里的货架不一定都在 `shelves` 里**：多余的忽略
- **`shelves` 里的货架不一定都在 `orderList` 里**：unmatched 保持原顺序追加
- **稳定排序**：unmatched 之间相对顺序不变

**用途**：`importOrderFromExcel` / `importOrderFromText`。

### `getSelectedIndices()`

同步。获取已勾选货架的下标列表。

**逻辑**：

```js
const checkboxes = document.querySelectorAll('#smShelfListContainer .item-checkbox:checked');
const indices = [];
checkboxes.forEach(cb => {
    const li = cb.closest('.sorting-item');
    if (li) {
        const idx = parseInt(li.getAttribute('data-index'));
        if (!isNaN(idx)) indices.push(idx);
    }
});
return indices.sort((a, b) => a - b);
```

**用 `data-index`**：从 DOM 读下标，与 `shelves` 数组的下标对应。

**排序**：返回的下标是升序的。

### `captureSelectedCodes()`

同步。**记录当前勾选的货架码**（不是下标）。

**逻辑**：

```js
this.selectedCodesBeforeReorder = [];
const checkboxes = document.querySelectorAll('#smShelfListContainer .item-checkbox:checked');
checkboxes.forEach(cb => {
    const code = cb.getAttribute('data-code');
    if (code) this.selectedCodesBeforeReorder.push(code);
});
```

**为什么记 code 而不是 index**：因为**重排后下标会变**，code 不变。

### `restoreSelectedCodes()`

同步。**根据 code 恢复勾选状态**。

**逻辑**：

```js
const checkboxes = document.querySelectorAll('#smShelfListContainer .item-checkbox');
checkboxes.forEach(cb => {
    const code = cb.getAttribute('data-code');
    if (this.selectedCodesBeforeReorder.includes(code)) cb.checked = true;
    else cb.checked = false;
});
this.updateSelectedCount();
```

**注意**：**会把没在 `selectedCodesBeforeReorder` 里的全部设为未勾选**。所以这个方法**不是"恢复"而是"重置"**。

**调用时机**：`renderShelfList` 末尾（**每次渲染都调用**）。

**副作用**：如果用户在重排后**手动勾选**，然后**再次渲染**（比如改了 start/step），勾选会被**清空**（因为 `selectedCodesBeforeReorder` 是旧的）。

**等等**——看 `renderShelfList`：

```js
renderShelfList() {
    // ... 创建列表 ...
    container.appendChild(ul);
    this.initDragAndDrop();
    this.restoreSelectedCodes();
}
```

**每次都调 `restoreSelectedCodes`**。

**但**：在 `moveUpSelected` 里，顺序是：

```js
captureSelectedCodes();           // 1. 记录当前勾选
// ... 修改 shelves ...
applySortOrder();
renderShelfList();                // 2. 渲染 + restore
```

**所以**：`captureSelectedCodes` 在 `renderShelfList` **之前**调用，`selectedCodesBeforeReorder` 是**当前**勾选状态。`restoreSelectedCodes` 恢复的就是当前状态。

**但**：`bindEvents` 里 `#smStartValue` 的 input 事件：

```js
const updateHandler = () => {
    if (this.shelves.length) {
        this.applySortOrder();
        this.renderShelfList();           // ← 没调 captureSelectedCodes
    }
};
```

**改 start/step 时**：`renderShelfList` 会调 `restoreSelectedCodes`，用**旧的** `selectedCodesBeforeReorder`。**如果用户在两次输入之间勾选了新货架**，勾选会**丢失**。

**这是个 bug**。修复：在 input handler 里先 `captureSelectedCodes()`。

### `handleFileUpload(file)`

异步。处理上传。

**逻辑**：

```js
const table = await this.app.readExcelTable(file, {
    emptyMessage: SM_TEXT.err_fileEmpty,
    parseErrorMessage: SM_TEXT.msg_parseFailed,
});
if (!table) return;

try {
    const json = [table.headers, ...table.rows];
    this.processRawData(json);
    this.app.showMessage(SM_TEXT.msg_parseSuccess, 'success');
    document.getElementById('smSortingResultArea').classList.remove('hidden');
    this.renderShelfList();
} catch (err) {
    console.error(err);
    this.app.showMessage(SM_TEXT.msg_parseFailed + err.message, 'error');
}
```

**注意**：

- `readExcelTable` 失败 → 内部已提示，直接 return
- `processRawData` 抛错 → catch 显示
- 成功后**移除 `hidden`**，显示结果区
- `renderShelfList` 渲染列表

**`json` 的构造**：`[table.headers, ...table.rows]`。因为 `processRawData` 期望**第一行是表头**。

### `importOrderFromExcel()`

异步。**从 Excel 导入货架顺序**。

**逻辑**：

1. 读 `#smSortingOrderFileInput` 的文件
2. 无文件 → 报错
3. `readExcel(file)` → 二维数组
4. **智能找列**：

   ```js
   for (let i = 0; i < headerRow.length; i++) {
       const cell = String(headerRow[i] || '').toLowerCase();
       if (cell.includes('货架') || cell.includes('shelf') || cell.includes('编码') || cell === 'code') {
           shelfCodeColIdx = i;
           break;
       }
   }
   if (shelfCodeColIdx === -1) shelfCodeColIdx = 0;
   ```

   **找表头含"货架"/"shelf"/"编码"/"code"的列**，找不到用第一列。
5. 从第 2 行开始读该列，非空 push 到 `orderList`
6. 空列表 → 报错
7. `reorderShelvesByCodeOrder(orderList)`
8. 清空 input 的 value

**注意**：`readExcel` 是 Core 提供的**原始读法**，返回二维数组。与 `readExcelTable` 不同，**不做空文件校验**。

**`headerRow` 是 `json[0]`**，可能未定义（如果 json 是空数组）。**但前面有 `if (!json || json.length < 1) throw`**。

### `importOrderFromText()`

同步。**从文本框导入顺序**。

**逻辑**：

1. 读 `#smSortingOrderText`
2. 空 → 提示
3. **智能切分**：

   ```js
   if (rawText.includes('\n')) codes = rawText.split(/\r?\n/);
   else if (rawText.includes(',')) codes = rawText.split(',');
   else codes = rawText.split(/\s+/);
   ```

   优先按行，其次逗号，最后空格。
4. trim + 过滤空
5. 空 → 提示
6. `reorderShelvesByCodeOrder(codes)`
7. 清空 textarea

**注意**：**三种分隔符互斥**。含换行的输入**不识别逗号**。所以：

```
A-01-01, A-01-02
A-01-03
```

会被解析为 `['A-01-01, A-01-02', 'A-01-03']`（**第一个元素含逗号**，作为整体）。

**结果**：`A-01-01, A-01-02` 不是合法货架码，会 unmatched。

**当前行为**：**混合分隔符的输入会出问题**。

### `moveUpSelected()`

同步。**上移勾选货架**。

**逻辑**：

1. 取 `getSelectedIndices()`，空 → 提示
2. 第一个是 0 → 提示"已经在顶部"
3. `captureSelectedCodes()`
4. **从下往上**交换（按 `indices` 升序遍历）：

   ```js
   for (let idx of indices) {
       if (idx > 0) [newShelves[idx - 1], newShelves[idx]] = [newShelves[idx], newShelves[idx - 1]];
   }
   ```

5. `applySortOrder()` → `renderShelfList()` → 提示

**为什么从下往上**：避免下标错乱。比如 `[3, 5, 7]` 上移：

- 处理 7：换 6, 7 → `[3, 5, 6, 7]`
- 处理 5：换 4, 5
- 处理 3：换 2, 3

**如果从上往下**：

- 处理 3：换 2, 3 → 原 3 到 2，原 5 到 5，原 7 到 7
- 处理 5：**原 5 现在在 5**（没变），换 4, 5
- 处理 7：**原 7 现在在 7**，换 6, 7

**结果一样**。**因为交换是局部的，不影响更大下标**。

**等等**——`indices` 是**原始下标**，交换后**下标会变**。比如 `[3, 5]` 上移：

- 处理 3：原 3 到 2，原 4 到 3
- 处理 5：**原 5 现在在 5**？不，原 4 到 3 了，原 5 还在 5

**对，原 5 没变**。因为交换只影响 idx 和 idx-1。

**所以顺序无所谓**。但代码里是升序，可能是有意的。

**等等**——如果是**降序**：

- 处理 5：原 5 到 4，原 4 到 5
- 处理 3：原 3 到 2，原 2 到 3

**但如果 5 处理完后，原 3 可能在 3**。仍然正确。

**结论**：**升序降序都行**，因为交换是局部的。

### `moveDownSelected()`

同步。**下移勾选货架**。

**逻辑**：

1. 取 `getSelectedIndices()`，空 → 提示
2. 最后一个是 `maxIdx` → 提示"已经在底部"
3. `captureSelectedCodes()`
4. **从后往前**交换：

   ```js
   for (let i = indices.length - 1; i >= 0; i--) {
       let idx = indices[i];
       if (idx < maxIdx) [newShelves[idx + 1], newShelves[idx]] = [newShelves[idx], newShelves[idx + 1]];
   }
   ```

5. `applySortOrder()` → `renderShelfList()` → 提示

**为什么从后往前**：同理，避免换完后的 idx 指向错误。

**举例**：`[3, 5, 7]` 下移（maxIdx=10）：

- 处理 7：换 7, 8 → 原 7 到 8，原 8 到 7
- 处理 5：换 5, 6 → 原 5 到 6，原 6 到 5
- 处理 3：换 3, 4

**结果**：原 3 → 4，原 5 → 6，原 7 → 8。**正确**。

**如果从前往后**：

- 处理 3：原 3 → 4
- 处理 5：**原 5 现在是 5**？不，交换 5, 6 不影响 5 之前的。**原 5 还在 5**。
- 处理 7：同上

**结果一样**。**因为交换是局部的**。

**为什么从后往前**：**约定俗成**。

---

## 导出

### `exportResults()`

异步。**导出为 Excel**。

**逻辑**：

1. 无数据 → 报错
2. `loadLibrary('xlsx')`
3. **遍历每个货架的每个库位**，产出导出行：

   ```js
   exportRows.push({
       '仓库名称': loc.warehouseName,
       '库位号': loc.locationCode,
       '分拣排序': sortVal
   });
   ```

   **`sortVal` 是该货架的 `sortOrder`**，同一货架下所有库位用同一个值。
4. **按 `CORE_HEADERS.locationChange` 的列顺序**组装二维数组：

   ```js
   const headers = CORE_HEADERS.locationChange;
   const sheetData = [headers];
   for (const row of exportRows) {
       const newRow = [];
       for (const h of headers) {
           if (h === '仓库名称') newRow.push(row['仓库名称'] || '');
           else if (h === '库位号') newRow.push(row['库位号'] || '');
           else if (h === '分拣排序') newRow.push(row['分拣排序'] !== undefined ? row['分拣排序'] : '');
           else newRow.push('');
       }
       sheetData.push(newRow);
   }
   ```

   **只有 3 列填值，其他 10 列留空**。
5. `XLSX.utils.aoa_to_sheet` → `book_new` → `book_append_sheet`
6. 文件名：`SM_TEXT.exportFileName.replace('{ts}', timestamp)` → `分拣顺序调整_{ts}.xlsx`
7. `XLSX.write` → `app.download`

**注意**：

- **`sheetData` 顺序**：先所有货架的库位，**按 `shelves` 顺序**（即当前排序）
- **每个货架下多个库位**：**同一 `sortOrder`**
- **列顺序完全对齐 `CORE_HEADERS.locationChange`**，保证导入时列对得上

**文件名的时间戳格式**：

```js
new Date().toISOString().slice(0, 19).replace(/:/g, '-')
```

**结果**：`2026-10-03T14-30-45`（ISO 格式但冒号换横线）。

**与 `app.timestamp()`（yymmddhhmm）不同**。

---

## 重置

### `resetModule()`

同步。**重置到初始状态**。

**逻辑**：

1. 加 `hidden` class 到 `#smSortingResultArea`
2. `#smStartValue` → `'10'`
3. `#smStepValue` → `'10'`
4. `this.shelves = []` / `this.rawData = []`
5. 清 `#smShelfListContainer` 的 innerHTML
6. `showMessage('已重置')`

**注意**：**不清 `headers` / `headerIndex` / `selectedCodesBeforeReorder`**。

**影响**：如果重新上传，这些会被覆盖。**无实际影响**。

**不关文件 input**：`#smSortingOrderFileInput` 的 value **没清**。用户可以重新上传同一个文件（`input` 的 value 变化会触发 `change`）。

**等等**：如果 input 的 value 没清，用户选同一个文件**不会触发 change**。所以：

- 用户第一次上传 file A → 生效
- 用户点"重置"
- 用户再次上传 file A → **没反应**（因为 input 值没变）

**这是个 bug**。修复：`resetModule` 里清 `fileInput.value = ''`。

---

## 渲染

### `renderShelfList()`

同步。**渲染货架列表**。

**逻辑**：

1. 清 `#smShelfListContainer`
2. 创建 `<ul class="sorting-list" id="smSortingList">`
3. **遍历 `this.shelves`**，每个 `<li class="sorting-item">`：

   ```html
   <li class="sorting-item" data-index="{idx}" data-code="{shelf.code}" draggable="true">
       <input type="checkbox" class="item-checkbox" data-code="{shelf.code}">
       <span class="drag-handle">{list 图标}</span>
       <div class="sorting-item-content">
           <span class="shelf-code">{code}</span>
           <span class="shelf-type-badge">{地堆|货架}</span>
           <span class="original-priority-badge">原优先级: {n}|无</span>
           <span class="sort-order-badge">新分拣值: {n}</span>
       </div>
   </li>
   ```

4. `container.appendChild(ul)`
5. **`initDragAndDrop()`** 初始化拖拽
6. **`restoreSelectedCodes()`** 恢复勾选

**`data-index` 的意义**：拖拽和批量移动都靠这个关联 DOM 与 `shelves` 数组。

**`shelf-code` 用 `escapeHtml`**：货架码是数据，防 XSS。

**`priorityText`**：

```js
const priorityText = shelf.originalPriority !== null
    ? SM_TEXT.badge_originalPriority.replace('{n}', shelf.originalPriority)
    : SM_TEXT.badge_originalPriorityNone;
```

**注意**：`originalPriority` 可能是 `0`，`0 !== null` 是 true，会显示"原优先级: 0"。**正确**。

### `initDragAndDrop()`

同步。**初始化拖拽排序**。

**逻辑**：

1. 取所有 `.sorting-item`
2. 定义 `handleDragStart` / `handleDragOver` / `handleDragLeave` / `handleDrop` / `handleDragEnd`
3. **先 removeEventListener 再 addEventListener**，避免重复绑

**关键 handler**：

**`handleDragStart`**：

```js
const li = e.target.closest('.sorting-item');
if (!li) return;
this.dragSrcIndex = parseInt(li.getAttribute('data-index'));
e.dataTransfer.effectAllowed = 'move';
e.dataTransfer.setData('text/plain', this.dragSrcIndex);
li.classList.add('dragging');
```

**`dragSrcIndex` 存到实例**，因为 drop 时要读。

**`handleDragOver`**：

```js
e.preventDefault();                    // 允许 drop
e.dataTransfer.dropEffect = 'move';
const targetLi = e.target.closest('.sorting-item');
if (targetLi && targetLi !== document.querySelector('.dragging')) {
    targetLi.classList.add('drag-over');
}
```

**`preventDefault` 是必须的**，否则 drop 不会触发。

**`handleDrop`**：

```js
e.preventDefault();
const targetLi = e.target.closest('.sorting-item');
if (!targetLi) return;
targetLi.classList.remove('drag-over');
const dragIndex = this.dragSrcIndex;
const dropIndex = parseInt(targetLi.getAttribute('data-index'));
if (dragIndex !== null && dragIndex !== dropIndex && dragIndex >= 0 && dropIndex >= 0) {
    this.captureSelectedCodes();
    const [moved] = this.shelves.splice(dragIndex, 1);
    this.shelves.splice(dropIndex, 0, moved);
    this.applySortOrder();
    this.renderShelfList();
}
const draggingItem = document.querySelector('.dragging');
if (draggingItem) draggingItem.classList.remove('dragging');
this.dragSrcIndex = null;
```

**`splice` 逻辑**：

- `dragIndex = 2`, `dropIndex = 5`：
  - splice(2, 1) → 移除下标 2 的元素
  - **此时原下标 5 的元素现在在下标 4**
  - splice(5, 0, moved) → 插入到下标 5（原下标 6 的元素之前）
  - **结果**：原下标 2 的元素到了原下标 5 的位置

**关键理解**：`splice(dragIndex, 1)` 后，**大于 dragIndex 的下标都减 1**。所以 `dropIndex` 如果 > `dragIndex`，实际插入位置比 `dropIndex` 早一位。

**splice 的精确行为**：

`splice(start, deleteCount, ...items)`：

- 删除 `deleteCount` 个元素
- 在 `start` 位置插入 `items`

**所以**：

- `dragIndex = 2`, `dropIndex = 5`：
  - 移除下标 2 元素（**5 → 4，6 → 5，...**）
  - 在**当前**下标 5（**原下标 6**）之前插入
  - **结果**：原下标 2 的元素在**原下标 5 之后**

**等等**——这就意味着**拖到 5 是"插到原 6 之前"**。

**用户期望**：拖到 target 位置，**插到 target 的前面**。

**当前行为**：

- 拖到**比源大**的位置 → 插到 target 前一位
- 拖到**比源小**的位置 → 插到 target 位置

**不对称！**

**举例**：

`shelves = [A, B, C, D, E, F]`，拖 A（idx=0）到 E（idx=4）：

1. splice(0, 1) → `[B, C, D, E, F]`（A 移除）
2. splice(4, 0, A) → `[B, C, D, E, A, F]`

**A 在 E 后面**。**如果用户期望 A 在 E 前面**（E 之上），这是错的。

**再看**：拖 F（idx=5）到 B（idx=1）：

1. splice(5, 1) → `[A, B, C, D, E]`（F 移除）
2. splice(1, 0, F) → `[A, F, B, C, D, E]`

**F 在 B 前面**。**正确**。

**所以**：**从上往下拖**（dragIndex < dropIndex）时，插入位置偏移 1。

**修复**：

```js
const insertIndex = dragIndex < dropIndex ? dropIndex : dropIndex;
const [moved] = this.shelves.splice(dragIndex, 1);
this.shelves.splice(insertIndex, 0, moved);
```

**或者**（更直观）：

```js
const [moved] = this.shelves.splice(dragIndex, 1);
const insertIndex = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
this.shelves.splice(insertIndex, 0, moved);
```

**结果**：无论方向，插入位置都是 target 的"前一位或原位"。

**这是已知 bug**。当前行为在**向下拖**时偏移一位。

**`handleDragEnd`**：

```js
document.querySelectorAll('.sorting-item').forEach(item =>
    item.classList.remove('dragging', 'drag-over'));
this.dragSrcIndex = null;
```

**清理所有拖拽状态**。

### `updateSelectedCount()`

同步。更新 `#smSelectedCount` 文本。

```js
const count = this.getSelectedIndices().length;
const span = document.getElementById('smSelectedCount');
if (span) span.textContent = SM_TEXT.selectedCount.replace('{n}', count);
```

**调用时机**：`restoreSelectedCodes` 末尾、`#smShelfListContainer` 的 change 事件。

---

## 事件绑定

### `bindEvents(panel)`

同步。绑定面板内事件。

**绑定的监听**：

| 元素 | 事件 | 行为 |
| -------------------------- | -------------- | ------------------------------------ |
| `#smSortingMoveUpBtn` | click | `moveUpSelected()` |
| `#smSortingMoveDownBtn` | click | `moveDownSelected()` |
| `#smSortingExportBtn` | click | `exportResults()` |
| `#smSortingResetBtn` | click | `resetModule()` |
| `#smImportOrderExcelBtn` | click | `importOrderFromExcel()` |
| `#smApplyOrderTextBtn` | click | `importOrderFromText()` |
| `#smStartValue` | input | `applySortOrder + renderShelfList` |
| `#smStepValue` | input | 同上 |
| `#smShelfListContainer` | change（委托） | 勾选变化 →`updateSelectedCount()` |

**`#smStartValue` / `#smStepValue` 的 input handler**：

```js
const updateHandler = () => {
    if (this.shelves.length) {
        this.applySortOrder();
        this.renderShelfList();
    }
};
```

**问题**：**没调 `captureSelectedCodes`**。改 start/step 会**丢失勾选**（见 `restoreSelectedCodes` 的坑）。

**`change` 委托**：

```js
panel.querySelector('#smShelfListContainer')?.addEventListener('change', (e) => {
    if (e.target.classList && e.target.classList.contains('item-checkbox')) {
        this.updateSelectedCount();
    }
});
```

**只更新计数**，**不更新 `selectedCodesBeforeReorder`**。

**注意**：`renderShelfList` 会替换整个 `#smShelfListContainer` 的 innerHTML，所以**每次渲染都要重绑 change**。但委托在 container 上，**重绑在 container 上，不会丢**。

**等等**——`renderShelfList` 只清 container 的 innerHTML，**container 本身没换**。所以委托监听**保留**。

---

## 折叠面板

### 折叠逻辑

在 `renderPanel` 里**内联绑定**：

```js
const toggleBtn = panel.querySelector('#smSortingParamToggle');
const content = panel.querySelector('#smSortingParamContent');
if (toggleBtn && content) {
    toggleBtn.addEventListener('click', () => {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        toggleBtn.querySelector('.sm-collapsible-arrow').innerHTML = isVisible ? '▲' : '▼';
    });
}
```

**行为**：

- 初始 `display: none`（CSS 里定义）
- 点击 toggle → 显/隐 + 换箭头
- **`isVisible` 判断**：`style.display !== 'none'`

**注意**：**初始时 `style.display` 是空字符串**（因为 CSS 里的 `display: none` 不是 inline style）。所以：

```js
const isVisible = content.style.display !== 'none';   // '' !== 'none' → true
```

**首次点击时 `isVisible = true`**，会设为 `display = 'none'`。**但初始已经是隐藏的**（CSS 里 `display: none`）。

**结果**：**首次点击没视觉效果**（已经隐藏，又设为隐藏）。**第二次点击才展开**。

**这是 bug**。修复：

```js
const isVisible = content.style.display === 'block';
```

**或者**用 class 切换：

```js
content.classList.toggle('hidden');
```

**当前体验**：用户第一次点好像没反应，第二次才展开。

### `#smSortingParamToggle` 的初始状态

HTML 里：

```html
<div class="sm-collapsible-content" id="smSortingParamContent">
```

CSS 里：

```css
.sm-collapsible-content{display:none;padding:...}
```

**默认隐藏**。**`style.display` 是空字符串**。

---

## renderPanel

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    [Core.uploadSection（上传 + 无重置）]
</div>
<div id="smSortingResultArea" class="section hidden">
    <div class="table-header"><h2>货架动线排序</h2></div>
    <div class="notice sm-notice-bar">提示：...</div>

    <!-- 折叠参数面板 -->
    <div class="sm-collapsible-wrap">
        <div class="sm-collapsible-header" id="smSortingParamToggle">
            <span>{gear}  排序参数设置</span>
            <span class="sm-collapsible-arrow">▼</span>
        </div>
        <div class="sm-collapsible-content" id="smSortingParamContent">
            <div class="sm-param-row">
                <div class="sm-param-item">
                    <label for="smStartValue">起始值</label>
                    <input type="number" id="smStartValue" value="10" step="1" min="0">
                </div>
                <div class="sm-param-item">
                    <label for="smStepValue">步长</label>
                    <input type="number" id="smStepValue" value="10" step="1" min="1">
                </div>
            </div>
        </div>
    </div>

    <!-- 导入顺序 -->
    <div class="sm-order-import">
        <div class="sm-order-row">
            <div class="sm-order-excel">
                <label for="smSortingOrderFileInput">导入顺序(Excel):</label>
                <input type="file" id="smSortingOrderFileInput" accept=".xls,.xlsx">
                <button id="smImportOrderExcelBtn">按Excel顺序排序</button>
            </div>
            <div class="sm-order-text">
                <label for="smSortingOrderText">手动输入顺序：</label>
                <textarea id="smSortingOrderText" rows="2" placeholder="..."></textarea>
                <button id="smApplyOrderTextBtn">按输入顺序排序</button>
            </div>
        </div>
    </div>

    <!-- 操作按钮 -->
    <div class="btn-row sm-actions">
        <button id="smSortingMoveUpBtn">上移选中</button>
        <button id="smSortingMoveDownBtn">下移选中</button>
        <button id="smSortingExportBtn">导出结果</button>
        <button id="smSortingResetBtn">重置</button>
        <span id="smSelectedCount" class="status-text">已选择 0 个货架</span>
    </div>

    <!-- 货架列表 -->
    <div class="sorting-list-wrapper" id="smShelfListContainer"></div>
    <div class="sm-foot-note">* 每个货架下包含所有分拣位库位...</div>
</div>
```

**末尾**：

```js
// 折叠逻辑绑定
this.bindEvents(panel);
this.app.bindUploadSection({
    btnId: 'smSortingUploadBtn',
    onFile: (file) => this.handleFileUpload(file),
});
this.app._log(`${this.title} 模块加载成功`);
```

**注意**：

- **`uploadSection` 没传 `resetId`**。重置在结果区里的 `#smSortingResetBtn`
- **`bindUploadSection` 没传 `accept`**，用默认 `'.xls,.xlsx'`
- **`renderPanel` 里内联绑定折叠逻辑**，`bindEvents` 里绑其他

**关键 DOM id**：

| id                                                      | 用途                  |
| ------------------------------------------------------- | --------------------- |
| `smSortingUploadBtn`                                  | 上传按钮              |
| `smSortingResultArea`                                 | 结果区（初始 hidden） |
| `smSortingParamToggle` / `smSortingParamContent`    | 折叠面板              |
| `smStartValue` / `smStepValue`                      | 参数                  |
| `smSortingOrderFileInput` / `smImportOrderExcelBtn` | Excel 导入            |
| `smSortingOrderText` / `smApplyOrderTextBtn`        | 文本导入              |
| `smSortingMoveUpBtn` / `smSortingMoveDownBtn`       | 上/下移               |
| `smSortingExportBtn` / `smSortingResetBtn`          | 导出/重置             |
| `smSelectedCount`                                     | 已选计数              |
| `smShelfListContainer`                                | 货架列表容器          |

---

## SM_TEXT 文案

### 结构

```js
const SM_TEXT = {
    title: '整理动线',
    introText: '...',
    helpDescription: '...',

    btn_upload, heading_sort, tip_sort, heading_paramToggle,
    label_startValue, label_stepValue,
    label_importOrderExcel, btn_importOrderExcel,
    label_importOrderText, ph_importOrderText, btn_applyOrderText,
    btn_moveUp, btn_moveDown, btn_export, btn_reset,
    selectedCount, footNote,

    shelfType_pile, shelfType_rack,
    badge_originalPriority, badge_originalPriorityNone, badge_newSortOrder,

    exportSheetName, exportFileName,

    // 消息
    msg_parseSuccess, msg_parseFailed, msg_readFileFailed,
    msg_reorderSuccess, msg_pleaseSelectOrderFile, msg_importOrderFailed,
    msg_enterCodesInText, msg_noCodesParsed, msg_selectShelvesFirst,
    msg_alreadyTop, msg_moveUpOk, msg_alreadyBottom, msg_moveDownOk,
    msg_nothingToExport, msg_exportOk, msg_reset,

    // 错误
    err_needTwoRows, err_fileEmpty, err_missingRequiredCols,
    err_noValidLocations, err_noShelfCodes,

    styles
};
```

**`helpDescription`**：静态 HTML，**无 `{wiki}` 占位符**。

**`styles`**：定义了折叠面板、拖拽列表、徽章等。全用 Core 变量，深色自动跟随。

**`exportFileName`**：

```js
exportFileName: '分拣顺序调整_{ts}.xlsx',
```

用 `{ts}` 占位，代码里 `.replace('{ts}', ...)`。

**`selectedCount`**：

```js
selectedCount: '已选择 {n} 个货架',
```

**注意**：`{}` 占位符是**自定义**，不是模板字符串的 `${}`。代码里用 `.replace('{n}', count)`。

---

## 拖拽的正确行为 vs 当前行为

这是个重要的坑，展开说明。

**用户期望**（典型拖拽排序）：

- 拖 item A 到 item B **上方** → A 插到 B **前**
- 拖 item A 到 item B **下方** → A 插到 B **后**

**当前实现**：

```js
const [moved] = this.shelves.splice(dragIndex, 1);
this.shelves.splice(dropIndex, 0, moved);
```

**分析**：

- 拖 A（idx=1）到 C（idx=3）：

  - splice(1, 1) → 移除 A，`shelves = [B, C, D]`
  - splice(3, 0, A) → 插入到 3，`shelves = [B, C, D, A]`
  - **A 到了最后**（C 之后）
  - **用户期望**：A 在 C 前
- 拖 A（idx=3）到 B（idx=1）：

  - splice(3, 1) → 移除 A，`shelves = [B, C, D]`
  - splice(1, 0, A) → 插入到 1，`shelves = [B, A, C, D]`
  - **A 到了 B 之后**
  - **用户期望**：A 在 B 前

**两个方向都是"插到 target 后"**。

**修复**（对齐用户期望"插到 target 前"）：

```js
const [moved] = this.shelves.splice(dragIndex, 1);
const insertIndex = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
this.shelves.splice(insertIndex, 0, moved);
```

**测试**：

- 拖 A（1）到 C（3）：insertIndex = 2，`shelves = [B, A, C, D]` → **A 在 C 前** ✓
- 拖 A（3）到 B（1）：insertIndex = 1，`shelves = [B, A, C, D]` → **A 在 B 后**，但**用户拖到 B 上应该"插到 B 前"**？

**用户期望分析**：

- 拖 A **到** B（targetLi = B） → 期望 A 在 B 前
- 拖 A **到** B 下方（targetLi = C） → 期望 A 在 B 和 C 之间

**所以修复应该**：**永远插到 target 前**：

```js
const [moved] = this.shelves.splice(dragIndex, 1);
const insertIndex = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
this.shelves.splice(insertIndex, 0, moved);
```

**但**：`dragIndex < dropIndex` 时 `dropIndex - 1` 是**target 后一位**（因为移除了一位）。

**再分析**：

- 拖 A（idx=1）到 C（idx=3）：

  - 移除 A 后，C 现在在 idx 2
  - 想 A 在 C 前（idx 2）→ insertIndex = 2
  - `dropIndex - 1 = 2` ✓
- 拖 A（idx=3）到 B（idx=1）：

  - 移除 A 后，B 还在 idx 1
  - 想 A 在 B 前（idx 1）→ insertIndex = 1
  - `dropIndex = 1` ✓（因为 dragIndex > dropIndex，不减）

**结论**：**`dragIndex < dropIndex ? dropIndex - 1 : dropIndex`** 是修复。

**当前代码**：**没减 1**，导致 `dragIndex < dropIndex` 时**A 插到 target 后**。

**这是个已知 bug**。

---

## 其他坑位清单

### 1. 改 start/step 丢失勾选

见 `restoreSelectedCodes` 部分。

**修复**：`#smStartValue` / `#smStepValue` 的 input handler 里先 `captureSelectedCodes()`。

### 2. 折叠面板首次点击无效果

见"折叠逻辑"部分。

**修复**：`const isVisible = content.style.display === 'block';`

### 3. 拖拽插入位置偏移

见"拖拽的正确行为"部分。

**修复**：`const insertIndex = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;`

### 4. `resetModule` 不清 file input

见 `resetModule` 部分。

**修复**：`document.getElementById('smSortingOrderFileInput').value = '';`

### 5. `importOrderFromText` 混合分隔符

含换行的输入**不识别逗号**。

**修复**：先按行切，每行再按逗号/空格切：

```js
let codes = rawText.split(/\r?\n/)
    .flatMap(line => line.split(/[,，\s]+/))
    .map(c => c.trim())
    .filter(Boolean);
```

### 6. `processRawData` 里 `warehouseKey` 的冗余 fallback

见"Step 5"部分。

**修复**：删掉冗余的 fallback。

### 7. `restoreSelectedCodes` 每次渲染都调

**副作用**：如果外部改了勾选（不是通过 DOM 事件），下次渲染会恢复旧状态。

**当前**：所有勾选都通过 DOM 事件，无问题。

### 8. `renderShelfList` 的 `data-index` 与 `shelves` 下标强耦合

**如果** `shelves` 变化但没重渲染：DOM 的 `data-index` 会与 `shelves` 不一致。

**当前**：所有变化都伴随重渲染。**安全**。

### 9. 拖拽事件的 `e.target` 可能是子元素

```js
const li = e.target.closest('.sorting-item');
```

**用 `closest`**，从子元素往上找 `.sorting-item`。**正确**。

**但**：`dragstart` 事件的 `e.target` 一般是 `<li>`（因为 `draggable="true"` 在 li 上）。`e.target.closest` 能找到自己。

### 10. `drag-over` class 的清理

`handleDragOver` 给 target 加 class，`handleDragLeave` 移除，`handleDrop` 移除，`handleDragEnd` 移除所有。

**如果** dragover 触发多次（抖动）：class 反复加删。**无碍**。

### 11. 拖拽没做"拖到 list 外"的处理

如果用户拖到 `#smShelfListContainer` **外面**：

- `e.target.closest('.sorting-item')` 返回 null
- `handleDragOver` 不加 class（因为 `targetLi` 是 null）
- `handleDrop` 直接 return

**结果**：**无变化**。

**合理**。

### 12. `exportResults` 的列顺序与 `CORE_HEADERS` 强耦合

如果 `CORE_HEADERS.locationChange` 加列，导出会自动包含新列（值空）。**OK**。

**但**：如果 `CORE_HEADERS.locationChange` **改名**（比如"库位号"→"库位编码"），导出会因为 `h === '库位号'` 不匹配而**全部为空**。

**当前**：`CORE_HEADERS` 稳定。**潜在风险**。

### 13. `exportResults` 里的 `sortVal` 是 `shelf.sortOrder`

**同一货架下所有库位用同一值**。

**如果业务期望**：同一货架内不同库位不同排序值？

**当前**：**不支持**。

### 14. `err_readFileFailed` / `msg_readFileFailed` 未使用

文案里有，但代码里没用。

**实际错误处理**：`importOrderFromExcel` 里 catch 显示 `msg_importOrderFailed + err.message`。

**`readExcel` 抛错**会被这个 catch 捕获。

**所以** `msg_readFileFailed` 是**死文案**。

### 15. `resetModule` 里 `rawData` 被清但没被用过

```js
this.rawData = [];
```

**`rawData` 从初始化后就没被读写过**。**死字段**。

**可以删**。

### 16. `renderShelfList` 的 `escapeHtml`

```js
contentDiv.innerHTML = `
    <span class="shelf-code">${this.app.escapeHtml(shelf.code)}</span>
    <span class="shelf-type-badge">${shelfType}</span>
    <span class="original-priority-badge">${priorityText}</span>
    <span class="sort-order-badge">${SM_TEXT.badge_newSortOrder.replace('{n}', shelf.sortOrder)}</span>
`;
```

**`shelf.code` 转义**（防 XSS）。

**`shelfType` 是 `'地堆'` / `'货架'`**，常量，安全。

**`priorityText` 是模板 + 数字**，安全。

**`SM_TEXT.badge_newSortOrder.replace('{n}', shelf.sortOrder)`**：`sortOrder` 是数字，安全。

**OK**。

### 17. 拖拽的 `draggable="true"` 在 `<li>` 上

**整个 li 可拖**，不只在 handle 上。

**`drag-handle` 只是视觉提示**。

**如果只想 handle 可拖**：

```html
<li class="sorting-item"> <!-- 不设 draggable -->
    <span class="drag-handle" draggable="true">...</span>
```

**但要处理拖起时高亮整个 li**。**当前设计是整 li 可拖**，简单。

### 18. `initDragAndDrop` 里 `removeEventListener` 需要同一个函数引用

```js
item.removeEventListener('dragstart', handleDragStart);
```

**`handleDragStart` 是闭包内定义的**。每次 `initDragAndDrop` 调用都**新建函数**，所以 `removeEventListener` **不生效**（新旧函数引用不同）。

**等等**——看代码：

```js
initDragAndDrop() {
    const items = document.querySelectorAll('#smSortingList .sorting-item');
    const handleDragStart = (e) => { ... };       // 每次调用新建
    // ...
    items.forEach(item => {
        item.removeEventListener('dragstart', handleDragStart);   // 移除不了旧的
        item.addEventListener('dragstart', handleDragStart);       // 加新的
    });
}
```

**问题**：`initDragAndDrop` 每次调用都创建新的 handler 函数。**旧 handler 的引用丢失**，无法移除。

**后果**：**多次 `renderShelfList` 后，同一个 item 上会叠加多个 handler**。

**等等**——`renderShelfList` 会**清空 container**，创建**全新**的 li。所以每次 `initDragAndDrop` 面对的都是新元素，**没有旧监听**。

**所以** `removeEventListener` 是**冗余的**，但**不造成 bug**。

**验证**：

1. `renderShelfList` → `container.innerHTML = ''` → 旧 li 销毁
2. 创建新 li，`initDragAndDrop` 绑新 handler
3. 再次 `renderShelfList` → 又清空 → 又绑新

**结论**：**无泄漏**。`removeEventListener` 是为了保险。

### 19. `handleDrop` 后的 `dragging` class 清理

```js
const draggingItem = document.querySelector('.dragging');
if (draggingItem) draggingItem.classList.remove('dragging');
```

**拖拽结束后移除 `dragging`**。

**但**：`handleDragEnd` 也会清理。**双重清理，无害**。

### 20. 拖拽的 `.drag-over` class 未在 drop 后清理所有

```js
targetLi.classList.remove('drag-over');
```

**只清 target 的**。如果拖拽过程中经过了多个 li，它们可能留下 `.drag-over`。

**`handleDragLeave` 会清**，但**不可靠**（快速移动可能不触发）。

**`handleDragEnd` 会清所有**：

```js
document.querySelectorAll('.sorting-item').forEach(item =>
    item.classList.remove('dragging', 'drag-over'));
```

**所以最终会被清**。

### 21. `applySortOrder` 的 start/step 默认值

```js
const start = parseInt(document.getElementById('smStartValue')?.value) || 10;
const step = parseInt(document.getElementById('smStepValue')?.value) || 10;
```

**`|| 10` 兜底**：如果 input 值空或 NaN，用 10。

**`'0'` 或 `'0.0'`**：`parseInt('0') = 0`，`0 || 10 = 10`。**0 会被当作无效**。

**但**：start 为 0 是合法的（UI 里 `min="0"`）。**这是 bug**。

**修复**：

```js
const startVal = parseInt(document.getElementById('smStartValue')?.value);
const start = isNaN(startVal) ? 10 : startVal;
```

**当前行为**：用户输 0 → 实际用 10。**用户会困惑**。

### 22. `importOrderFromExcel` 用 `readExcel` 而非 `readExcelTable`

```js
const json = await this.app.readExcel(file);
if (!json || json.length < 1) throw new Error(SM_TEXT.err_fileEmpty);
```

**`readExcel`**：

- 加载 xlsx 库
- 读文件
- 返回二维数组
- **不做行数校验、空文件校验**

**`readExcelTable`**：

- 上面 + 校验
- 返回 `{headers, rows}`

**本模块用 `readExcel`**，然后**手动校验**。

**为什么不用 `readExcelTable`**：

- `importOrderFromExcel` 需要**原始二维数组**（自己找列），`readExcelTable` 返回的 `{headers, rows}` 也能用，但要重新拼
- **轻量场景**，直接 `readExcel` 更直接

### 23. `msg_nothingToExport` 的调用

```js
if (!this.shelves.length) {
    this.app.showMessage(SM_TEXT.msg_nothingToExport, 'error');
    return;
}
```

**`shelves` 为空**（没上传或重置后）→ 报错。

**`exportResults` 的两处**：

- 顶部 `if (!this.shelves.length)`（第一次检查）
- 顶部 `loadLibrary` 失败检查

**`shelves.length === 0` 时**：第一次检查就 return 了。

**如果没有货架但有 `shelves`**？不可能，`shelves` 是数组，空数组 length 0。

### 24. `msg_noValidLocations` 的触发

**`processRawData` 里**：

```js
if (shelfMap.size === 0) {
    throw new Error(SM_TEXT.err_noValidLocations);
}
```

**过滤后没有任何有效行** → 抛错。

**用户视角**：上传的文件里没有"分拣位"或部门格式不对。

### 25. `renderPanel` 里 `hidden` class 的使用

```html
<div id="smSortingResultArea" class="section hidden">
```

**初始隐藏**。上传成功后：

```js
document.getElementById('smSortingResultArea').classList.remove('hidden');
```

**移除 `hidden`**。

**`hidden` 是 Core 的 CSS**：

```css
.hidden{display:none!important}
```

**OK**。

### 26. `bindUploadSection` 没传 `resetId`

**`resetId` 在 `uploadSection` 里没生成**。所以**没有"重置"按钮在上传区**。

**重置按钮在结果区里**：

```html
<button id="smSortingResetBtn">重置</button>
```

**两个重置的语义不同**：

- 上传区的重置：清空所有，回到初始
- 结果区的重置：`resetModule`，隐藏结果区

**当前只实现了一个**。

---

## 一页速查

```
入口：  modules.js 清单
id：    sorting
依赖：  xlsx 库（导出）
用途：  货架重排 + 分拣排序值生成

核心数据结构：
  shelves: [{code, locations, originalPriority, sortOrder}]

流程：
  上传 → processRawData → shelves（按原优先级排序）
  重排 → moveUp/moveDown/拖拽/reorderByCode
  导出 → exportResults（每个货架下所有库位统一 sortOrder）

排序值生成：applySortOrder
  sortOrder = start + i * step
  start 默认 10，step 默认 10

关键 DOM id：
  smSortingUploadBtn
  smSortingResultArea（初始 hidden）
  smSortingParamToggle / smSortingParamContent（折叠）
  smStartValue / smStepValue
  smSortingOrderFileInput / smImportOrderExcelBtn
  smSortingOrderText / smApplyOrderTextBtn
  smSortingMoveUpBtn / smSortingMoveDownBtn
  smSortingExportBtn / smSortingResetBtn
  smSelectedCount
  smShelfListContainer

依赖 Core：
  injectStyle
  uploadSection / bindUploadSection
  readExcelTable / readExcel
  loadLibrary('xlsx')
  showMessage
  escapeHtml
  getIcon
  CORE_HEADERS.locationChange
  _log

已知 bug：
  拖拽插入位置偏移（dragIndex < dropIndex 时插到 target 后）
  改 start/step 丢失勾选
  折叠面板首次点击无效果
  resetModule 不清 file input
  importOrderFromText 不识别混合分隔符
  applySortOrder 的 start=0 被当作无效

死字段/文案：
  rawData（从初始化后未使用）
  msg_readFileFailed（未使用）
  err_noShelfCodes 部分场景未触发

设计取舍：
  粒度是货架，不是库位
  导出列对齐 CORE_HEADERS.locationChange
  支持三种重排方式（拖拽/批量移动/导入顺序）
  无 destroy（事件都绑在 panel 内）
```

---

@license Unlicense
