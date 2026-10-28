
# PickingRouteModule.js 二次开发文档

> 版本对应：PickingRouteModule v1.0.0 / 2026-09-21
> 模块 id：`pickingroute`
> 阅读前提：已读 Core.js 文档（模块契约、`injectStyle`、`getHelpButton`、`CORE_HEADERS`）
> 无外部依赖（不用 xlsx / jszip / qrcode）

---

## 定位

**是**：分拣动线计算器。输入两段文本（货架设置 + 全部库位），自动计算每个货架的**分拣优先级**，再把优先级映射到每个库位，产出可导入的分拣排序表。

**不是**：不做动线可视化，不做路径规划，不做货架排序。只做"**优先级数值计算**"。

**核心逻辑**：

```
货架设置（人 + 属性 + 分割标志）
  → 优先级算法 → 货架优先级表
                    ↓
库位列表  →  查货架优先级  → 库位优先级表（对齐 CORE_HEADERS.locationChange）
```

**模块 id 命名**：文件名 `PickingRouteModule.js` → id `pickingroute`（不是 `pickingRoute`，因为 `_idFromFile` 会 `toLowerCase()`）。

**无 `destroy()`**。原因：所有事件监听都绑在 panel 内的 DOM 上，panel 被移除时一并销毁。**没有 document 级监听，没有定时器**。

---

## 模块契约

```js
class PickingRouteModule {
    constructor(app) {
        this.app = app;
        this.title = PR_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-21';
        this.iconName = 'arrow-right-circle';
        this.introText = PR_TEXT.introText;
        this.helpDescription = PR_TEXT.helpDescription;
    }
    renderPanel(panel) { ... }
}
window.PickingRouteModule = PickingRouteModule;
```

**构造函数极简**：只设契约字段，**没有任何状态字段**。

**状态存哪**：模块的中间状态（优先级 Map）存在 `this.app.data.priorityMap` 里。**这是它与其他模块的不同之处**——其他模块用 `this.xxx`，它用 `app.data`。

**为什么**：为了让其他模块也能读 `priorityMap`（比如后续扩展的"按优先级排序"模块）。**当前没有其他模块读它**，但这个设计保留了扩展点。

---

## `app.data` 共享字段

| 字段            | 类型                         | 说明                                       |
| --------------- | ---------------------------- | ------------------------------------------ |
| `priorityMap` | `Map<shelfCode, priority>` | 货架 → 优先级。每次提交都会**覆盖** |

**`priorityMap` 的生命周期**：

1. `submitShelf` 成功后 → 写入
2. `submitLocation` 每次都会**重建**（因为要先 `processShelfData` 才能匹配）
3. **模块关闭不清**。下次打开还在

**注意**：`priorityMap` 是**共享**的，如果两个实例同时打开（不可能，因为 Core 单实例），会互相覆盖。

---

## 数据结构

### 输入格式

**货架设置**（`#prText1`），每行一条：

```
货架名称,属性,分割标志
```

| 字段     | 说明                                    |
| -------- | --------------------------------------- |
| 货架名称 | `XX-XX-XX` 格式（2位字母数字段 × 3） |
| 属性     | `H` 或 `D`                          |
| 分割标志 | `=` / `x` / 空                      |

**分隔符**：制表符 `\t` 或半角逗号 `,`。**优先 `\t`**，`\t` 分不出 3 段才试 `,`。

**示例**：

```
LC-01-01,D,
LC-01-02,H,
LC-01-03,D,x
LC-01-04,H,=
```

**注意**：第三个字段**可以为空**（末尾逗号后没内容）。**空等价于 `=`**。

**库位列表**（`#prText2`），每行一条：

```
XX-XX-XX-XX-XX
```

**第 4 段**可以是 `DD`（地堆）或 2 位数字，**第 5 段** 2 位数字。

### 输出格式

**货架优先级表**：

| 货架名称 | 优先级 |
| -------- | ------ |
| LC-01-01 | 11     |
| LC-01-02 | 21     |

**库位优先级表**：对齐 `CORE_HEADERS.locationChange`（13 列），只填 3 列（仓库名称、库位号、分拣排序），其他留空。

---

## 优先级算法

这是整个模块最核心的逻辑。理解它就能理解分拣动线。

### 核心方法：`processShelfData(lines)`

同步。解析货架设置，计算优先级。

**参数**：`string[]` 每行一条。

**返回**：`{shelfData, duplicatesRemoved}`。

**`shelfData` 结构**：`[{shelfName, priority, attribute}]`。

**`duplicatesRemoved`**：`string[]`，被跳过的重复货架名。

### 初始化

```js
let lastPriority = 0;
let initialPriority = parseInt(document.getElementById('prInitialPriority').value) || 11;
```

**`initialPriority`**：从 `#prInitialPriority` 读，默认 11。

**为什么默认 11 而不是 1**：UI 提示里写了"建议不要设置为 1"。因为 1 可能与业务系统的保留值冲突。

**`lastPriority`**：上一条货架的优先级，用于计算下一条。**初始 0**。

### 逐行处理

**Step 1. 分段**

```js
let parts = line.split(/\t/).map(it => it.trim());
if (parts.length < 3) parts = line.split(/,/, 3).map(it => it.trim());
if (parts.length !== 3) throw new Error(PR_TEXT.err_shelfLineFormat...);
```

**优先 `\t`**：Excel 复制的数据是 `\t` 分隔。`\t` 分不出 3 段时试 `,`。

**`split(/,/, 3)` 的 `3`**：最多切 3 段。**多余逗号保留在第 3 段**（如有）。比如 `a,b,c,d` → `['a', 'b', 'c,d']`。

**Step 2. 去重**

```js
if (shelfMap.has(shelfName)) {
    let existingAttr = shelfMap.get(shelfName);
    if (existingAttr !== attribute) {
        throw new Error(PR_TEXT.err_shelfDupConflict...);
    } else {
        duplicatesRemoved.push(shelfName);
        return;
    }
}
shelfMap.set(shelfName, attribute);
```

**规则**：

- **同货架同属性** → 静默跳过，记入 `duplicatesRemoved`
- **同货架不同属性** → 抛错（属性冲突）

**`shelfMap`**：`Map<shelfName, attribute>`，只用来查重。

**Step 3. 格式校验**

```js
let shelfRegex = /^([A-Z0-9]{2})-(\d{2})-(\d{2})$/;
if (!shelfRegex.test(shelfName)) {
    throw new Error(PR_TEXT.err_shelfFormat...);
}
if (!["H", "D"].includes(attribute)) {
    throw new Error(PR_TEXT.err_shelfAttr...);
}
```

**货架名正则**：`^([A-Z0-9]{2})-(\d{2})-(\d{2})$`

- 段 1：2 位**大写**字母数字
- 段 2：2 位数字
- 段 3：2 位数字

**属性**：只允许 `H` 或 `D`。**大写**。

**Step 4. 分割标志归一化**

```js
let lowerFlag;
if (flag === "") {
    lowerFlag = "=";
} else {
    lowerFlag = flag.toLowerCase();
    if (!["=", "x"].includes(lowerFlag)) {
        throw new Error(PR_TEXT.err_shelfFlag...);
    }
}
```

**规则**：

- 空字符串 → 归一化为 `'='`
- 否则 `toLowerCase()`
- 只允许 `'='` 或 `'x'`

**`toLowerCase()` 的意义**：用户输入 `X`（大写）也能识别。**但归一化后只比较小写**。

### 优先级计算

```js
if (shelfData.length === 0) {
    priority = initialPriority;
} else {
    let prevAttribute = shelfData[shelfData.length - 1].attribute;
    if (lowerFlag === "x") {
        priority = Math.ceil((lastPriority + 10) / 100) * 100;
    } else {
        priority = attribute === "H" || (attribute === "D" && prevAttribute === "H")
            ? lastPriority + 10
            : lastPriority + 1;
    }
}
lastPriority = priority;
shelfData.push({ shelfName, priority, attribute });
```

**算法规则**：

| 情况                                    | 增量           | 说明                              |
| --------------------------------------- | -------------- | --------------------------------- |
| **第一条**                        | —             | 用`initialPriority`             |
| **分割标志 = `x`**              | 跳到下一个整百 | `ceil((last + 10) / 100) * 100` |
| **属性 = `H`**                  | +10            | 高优先级货架，跳大                |
| **属性 = `D` 且前一条是 `H`** | +10            | 从 H 切到 D 时也跳大              |
| **其他（连续 D）**                | +1             | 同类别货架，递增 1                |

**为什么要这样设计**：

- **H 组**：每个货架之间隔 10，留出后续插入空间
- **D 组**：同组内 +1，紧密排列
- **H→D 切换**：D 是新类别，跳到下一个 10 的倍数
- **`x` 分割**：用户强制分段，跳到下一个整百

**举例**（`initialPriority = 11`）：

| 输入            | 增量     | 优先级 |
| --------------- | -------- | ------ |
| `A-01-01,H,`  | 首条     | 11     |
| `A-01-02,H,`  | H        | 21     |
| `A-01-03,H,`  | H        | 31     |
| `A-01-04,D,`  | D 且前 H | 41     |
| `A-01-05,D,`  | D        | 42     |
| `A-01-06,D,`  | D        | 43     |
| `A-01-07,H,`  | H        | 53     |
| `A-01-08,D,x` | x        | 100    |
| `A-01-09,D,`  | D 且前 D | 101    |

**关键**：`x` 分割跳整百，保证不同分段之间有充足空间。

### 边界

**空输入**：

```js
if (!text.trim()) { showMessage(...); return; }
let lines = text.trim().split("\n").filter(l => l.trim());
if (lines.length === 0) { showMessage(...); return; }
```

**单条输入**：`shelfData.length === 0` 判首条，直接用 `initialPriority`。

**`Math.ceil((lastPriority + 10) / 100) * 100`**：

- `lastPriority = 11` → `ceil(21/100)*100 = 100`
- `lastPriority = 100` → `ceil(110/100)*100 = 200`
- `lastPriority = 195` → `ceil(205/100)*100 = 300`

**效果**：`x` 分割总能跳到"严格大于 lastPriority + 10 的最小整百"。

---

## 库位匹配

### 核心方法：`processLocationData(lines)`

同步。解析库位列表，查货架优先级。

**参数**：`string[]` 每行一条。

**返回**：`{locationData, duplicatesRemoved}`。

**`locationData` 结构**：`[{locationCode, priority, warehouse}]`。

**逻辑**：

**Step 1. 去重**

```js
if (locationSet.has(location)) {
    duplicatesRemoved.push(location);
    return;
}
locationSet.add(location);
```

**全局去重**：同一库位码只处理一次。

**Step 2. 格式校验**

```js
let locationRegex = /^([A-Z0-9]{2})-(\d{2})-(\d{2})-([0-9]{2}|DD)-(\d{2})$/;
let match = location.match(locationRegex);
if (!match) {
    throw new Error(PR_TEXT.err_locationFormat...);
}
let [, part1, part2, part3, part4, part5] = match;
```

**5 段正则**：

- 段 1：2 位大写字母数字
- 段 2-3：2 位数字
- 段 4：2 位数字 或 `DD`
- 段 5：2 位数字

**Step 3. 二次校验（死代码）**

```js
let part4Lower = part4.toLowerCase();
if (part4Lower !== "dd" && (part4.length !== 2 || isNaN(Number(part4)))) {
    throw new Error(PR_TEXT.err_locationPart4...);   // 永远不执行
}
if (isNaN(Number(part5))) {
    throw new Error(PR_TEXT.err_locationPart5...);   // 永远不执行
}
if (part4Lower === "dd" && part5 !== "01") {
    throw new Error(PR_TEXT.err_locationDD...);      // 可能执行
}
```

**前两个 `throw` 不可达**：正则已保证 `part4` 是 2 位数字或 `DD`，`part5` 是 2 位数字。

**第三个 `throw` 可达**：`DD` 段的第 5 段必须是 `01`。这是业务规则。

**审计发现**：前两个 `throw` 是**死代码**。删掉不影响功能，保留会误导维护者。

**Step 4. 查货架优先级**

```js
let shelfKey = `${part1}-${part2}-${part3}`;
...
if (!this.app.data.priorityMap || !this.app.data.priorityMap.has(shelfKey)) {
    throw new Error(PR_TEXT.err_locationNoShelf...);
}
let priority = this.app.data.priorityMap.get(shelfKey);
```

**货架键**：前 3 段拼接。

**前置条件**：`priorityMap` 必须已构建（`processShelfData` 或 `submitShelf`）。

**注意**：`submitLocation` 内部会**重新**调 `processShelfData`，所以即使用户只改了货架设置没点"提交"，也能正确匹配。

**Step 5. 组装**

```js
locationData.push({
    locationCode: location,
    priority: priority,
    warehouse: document.getElementById('prWarehouseName').value || ''
});
```

**`warehouse`**：从 `#prWarehouseName` 读。**可以为空**（校验允许）。

---

## UI 方法

### `validateWarehouse()`

同步。校验仓库名称输入。

**逻辑**：

```js
let warehouse = document.getElementById('prWarehouseName').value;
const pattern = (this.app.validations && this.app.validations.warehousePattern)
    || /^$|^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/;
if (!pattern.test(warehouse)) {
    document.getElementById('prWarehouseName').className = 'validation-invalid';
    return false;
} else {
    document.getElementById('prWarehouseName').className = 'validation-valid';
    return true;
}
```

**允许空**：正则 `^$|...`。**空是合法的**。

**合法格式**：`小象超市-{中文站名}-{2位大写字母}{4位数字}`，如 `小象超市-新华东街站-BJ0176`。

**副作用**：直接改 `className`，**不保留其他 class**。如果 `#prWarehouseName` 原本有别的 class，会被覆盖。

**调用时机**：

- `renderPanel` 末尾（首次校验）
- `#prWarehouseName` input 事件（实时校验）

**返回值**：`boolean`。**调用方（`submitLocation`）不用**，只用于实时反馈。

---

### `createPriorityTable(data, container, label)`

同步。渲染货架优先级表。

**参数**：

- `data`：`shelfData` 数组
- `container`：容器 DOM
- `label`：第一列表头（如"货架名称"）

**结构**：

```html
<table>
    <thead><tr><th>{label}</th><th>优先级</th></tr></thead>
    <tbody>
        <tr><td>LC-01-01</td><td>11</td></tr>
        ...
    </tbody>
</table>
```

**用 `textContent`**：不转义也不怕 XSS。

**追加**：`container.appendChild(table)`。**不先清空**（调用方负责）。

**注意**：`createPriorityTable` **不返回** table，直接 append。

---

### `createLocationPriorityTable(data, container)`

同步。渲染库位优先级表。

**参数**：

- `data`：`locationData` 数组
- `container`：容器

**结构**：**按 `CORE_HEADERS.locationChange` 的 13 列**，每行只填 3 列。

**列填充逻辑**：

```js
CORE_HEADERS.locationChange.forEach(h => {
    let th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
});

data.forEach(item => {
    let tr = document.createElement("tr");
    // 第 1 列：仓库名称
    let td1 = document.createElement("td");
    td1.textContent = item.warehouse || '';
    tr.appendChild(td1);
    // 第 2 列：库位号
    let td2 = document.createElement("td");
    td2.textContent = item.locationCode;
    tr.appendChild(td2);
    // 第 3-5 列：空
    for (let i = 0; i < 3; i++) tr.appendChild(document.createElement("td"));
    // 第 6 列：分拣排序
    let td6 = document.createElement("td");
    td6.textContent = item.priority;
    tr.appendChild(td6);
    // 第 7-13 列：空
    for (let i = 0; i < 7; i++) tr.appendChild(document.createElement("td"));
    tbody.appendChild(tr);
});
```

**列索引对应**（`CORE_HEADERS.locationChange`）：

| 索引 | 列名             | 是否填充 |
| ---- | ---------------- | -------- |
| 0    | 仓库名称         | ✓       |
| 1    | 库位号           | ✓       |
| 2    | 名称             | —       |
| 3    | 作为补入库位     | —       |
| 4    | 作为补出库位     | —       |
| 5    | 分拣排序         | ✓       |
| 6    | 上架排序         | —       |
| 7    | 逻辑区名称       | —       |
| 8    | 单独打包分区编号 | —       |
| 9    | 库位规格名称     | —       |
| 10   | 库位BAND         | —       |
| 11   | 批次码库位       | —       |
| 12   | 常温短保品库位   | —       |

**硬编码的列偏移**：`for (let i = 0; i < 3; i++)` 和 `for (let i = 0; i < 7; i++)`。

**如果 `CORE_HEADERS.locationChange` 改了**：这两个循环的数字要跟着改。**这是个隐患**。

**建议**：改成"遍历 headers，按列名决定是否填充"：

```js
CORE_HEADERS.locationChange.forEach((h, idx) => {
    let td = document.createElement("td");
    if (h === '仓库名称') td.textContent = item.warehouse || '';
    else if (h === '库位号') td.textContent = item.locationCode;
    else if (h === '分拣排序') td.textContent = item.priority;
    tr.appendChild(td);
});
```

这样加列删列都不用改代码。

---

### `switchPriorityTab(index)`

同步。切换**内层 tab**（货架优先级表 / 库位优先级表）。

**参数**：`1` 或 `2`。

**逻辑**：

```js
const panel = document.getElementById(`panel-${this.id}`);
if (!panel) return;
panel.querySelectorAll(".tab-btn").forEach((btn, i) =>
    btn.classList.toggle("active", i + 1 === index));
panel.querySelectorAll(".tab-content-inner").forEach((content, i) => {
    content.style.display = i + 1 === index ? 'block' : 'none';
});
```

**两个机制混用**：

- **class `.active`**：给按钮加高亮样式
- **`style.display`**：控制内容显隐

**为什么不用 class 切换**：`tab-content-inner.active` 有 `display: block`，但**同时没有 `.active` 时也有 `display: none`**（在 Core 的 `CORE_CSS` 里）。理论上 class 切换就够，但这里用了 `style.display`，**覆盖了 class 效果**。

**结果**：`.tab-content-inner.active` 的 `display: block` 被 inline style 覆盖。**行为正确，但绕了一圈**。

**注意**：`panel.querySelectorAll` 是**在 panel 作用域内查询**，不会误伤其他模块的 `.tab-btn`。

**为什么不用 Core 的 `tab-content`**：Core 的 `.tab-content` 是**顶层模块面板**级别，内层用 `.tab-content-inner` 避免冲突。

---

### `submitShelf()`

同步。**提交货架设置**。

**逻辑**：

1. 读 `#prText1`
2. 清空 `#table1-container`
3. 空输入 → 报错
4. 按行 split，过滤空行
5. 空行 → 报错
6. `try`：
   - `processShelfData(lines)` → `{shelfData, duplicatesRemoved}`
   - `createPriorityTable(shelfData, container, PR_TEXT.th_shelfName)`
   - 有重复 → 加一条 notice `<p>` 显示被跳过的
   - `app.data.priorityMap = new Map()`，填充
   - `switchPriorityTab(1)`
   - `showMessage('货架优先级计算成功')`
7. `catch`：
   - `showMessage('货架处理错误：' + error.message)`
   - `container.innerHTML = ''`（清空，避免残留旧表）

**注意**：

- **只处理 `#prText1`**，不看 `#prText2`
- **每次都重建 `priorityMap`**
- **成功后切到 tab 1**

**重复货架的提示**：

```js
let note = document.createElement("p");
note.className = "notice";
note.textContent = PR_TEXT.msg_dupShelfRemoved
    .replace('{n}', duplicatesRemoved.length)
    .replace('{list}', duplicatesRemoved.join(", "));
container.appendChild(note);
```

**显示在表格下方**。

---

### `submitLocation()`

同步。**提交库位列表**。

**逻辑**：

1. 读 `#prText2`（库位）和 `#prText1`（货架）
2. 清空 `#table2-container`
3. **前置校验**：
   - `#prText1` 为空 → 报错"请先输入货架设置"
   - `#prText2` 为空 → 报错"请输入全部库位数据"
4. `#prText2` 按行 split，过滤空行
5. 空行 → 报错
6. `try`：
   - **重新解析货架设置**（`processShelfData`）→ 重建 `priorityMap`
   - `processLocationData(locationLines)` → `{locationData, duplicatesRemoved}`
   - `createLocationPriorityTable(locationData, container)`
   - 有重复库位 → 加 notice
   - `switchPriorityTab(2)`
   - `showMessage('库位优先级匹配成功')`
7. `catch`：`showMessage`，清 container

**关键点**：

- **不依赖 `submitShelf` 的副作用**。每次提交都会重新解析货架设置。
- **`#prText1` 改变后不用先点"提交货架"**，直接点"提交全部库位"也能工作
- **但 `#table1-container` 不会更新**（如果用户只调 `#prText2` 后提交库位）
- **成功后切到 tab 2**

---

## 事件绑定

### `bindEvents(panel)`

同步。绑定面板内所有事件。

**参数**：`panel`（Core 创建的 `#panel-pickingroute`）。

**绑定的监听**：

| 元素                     | 事件  | 行为                                                                   |
| ------------------------ | ----- | ---------------------------------------------------------------------- |
| `#prSubmitShelfBtn`    | click | `submitShelf()`                                                      |
| `#prSubmitLocationBtn` | click | `submitLocation()`                                                   |
| `#prWarehouseName`     | input | `validateWarehouse()`                                                |
| `.tab-btn`（全部）     | click | `switchPriorityTab(parseInt(btn.getAttribute('data-priority-tab')))` |

**注意**：

- **全部用 `panel.querySelector`**，作用域内查询
- **`optional chaining`**：`?.addEventListener`，元素不存在时不报错
- **tab-btn 用 `data-priority-tab`**（不是 `data-tab`，避免与 Core 的 tab 冲突）

**`data-priority-tab` 是字符串**，`parseInt` 转数字。

---

## renderPanel

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    <div class="table-header">
        <h2>动线计算</h2>
        [帮助按钮]
    </div>

    <!-- 参数行 -->
    <div class="form-row">
        <div class="form-group">
            <label for="prInitialPriority">初始优先级值</label>
            <input type="number" id="prInitialPriority" min="1" max="9999" value="11">
            <p class="note">提示：纯数字，建议不要设置为1</p>
        </div>
        <div class="form-group">
            <label for="prWarehouseName">仓库名称</label>
            <input type="text" id="prWarehouseName" placeholder="小象超市-新华东街站-BJ0176">
        </div>
    </div>

    <!-- 双栏输入 -->
    <div class="columns-row" style="margin-bottom:25px;">
        <div class="input-group">
            <label for="prText1">货架设置：</label>
            <textarea id="prText1" placeholder="示例： LC-01-01,D, LC-01-02,H,x"></textarea>
            <p class="note">提示：（格式：货架名称,属性,分割标志）分隔符仅为半角的逗号。</p>
            <button id="prSubmitShelfBtn" class="btn">提交货架设置</button>
        </div>
        <div class="input-group">
            <label for="prText2">全部库位：</label>
            <textarea id="prText2"></textarea>
            <p class="note">格式：XX-XX-XX-XX-XX，一行一条。</p>
            <button id="prSubmitLocationBtn" class="btn">提交全部库位</button>
        </div>
    </div>

    <!-- 内层 tab -->
    <div class="tabs-inner">
        <div class="tabs">
            <div class="tab-btn active" data-priority-tab="1">货架优先级表格</div>
            <div class="tab-btn" data-priority-tab="2">库位优先级表格</div>
        </div>
        <div id="priorityTab1" class="tab-content-inner active">
            <p>货架优先级计算结果：</p>
            <div id="table1-container"></div>
        </div>
        <div id="priorityTab2" class="tab-content-inner">
            <p>库位优先级匹配结果（优先级取自对应货架）：</p>
            <div id="table2-container"></div>
        </div>
    </div>
</div>
```

**末尾**：

```js
this.bindEvents(panel);
this.validateWarehouse();
this.app._log(this.title + '加载成功');
```

**关键 DOM id**：

| id                                             | 用途                                             |
| ---------------------------------------------- | ------------------------------------------------ |
| `prInitialPriority`                          | 初始优先级                                       |
| `prWarehouseName`                            | 仓库名                                           |
| `prText1`                                    | 货架设置                                         |
| `prText2`                                    | 库位列表                                         |
| `prSubmitShelfBtn` / `prSubmitLocationBtn` | 两个提交按钮                                     |
| `table1-container` / `table2-container`    | 两个表格容器                                     |
| `priorityTab1` / `priorityTab2`            | 内层 tab 内容（**id 硬编码，但代码不用**） |

**`data-priority-tab` 属性**：用于事件绑定区分 tab 编号。

**初始状态**：

- tab 1 有 `.active` class（高亮）
- `priorityTab1` 有 `.active` class
- 但代码里**没有** `style.display`，所以首次显示依赖 CSS 的 `.tab-content-inner.active { display: block }`

**首次切换到 tab 2 后**：`priorityTab1` 得到 `style.display = 'none'`，`priorityTab2` 得到 `style.display = 'block'`。此时**再切回 tab 1**，`priorityTab1` 的 `style.display` 被覆盖为 `'block'`。

**所以初始状态和后续状态的行为不同**：

- 初始：靠 class 显隐
- 后续：靠 inline style

**结果一致**，但**两种机制并存**。这是设计上的小瑕疵。

---

## PR_TEXT 文案

### 结构

```js
const PR_TEXT = {
    title: '分拣动线计算',
    introText: '根据货架属性自动计算分拣优先级，生成库位动线。',
    helpDescription: '...',

    heading: '动线计算',
    label_initialPriority: '初始优先级值',
    note_initialPriority: '提示：纯数字，建议不要设置为1',
    label_warehouse: '仓库名称',
    ph_warehouse: '小象超市-新华东街站-BJ0176',
    label_shelfConfig: '货架设置：',
    ph_shelfConfig: '示例： LC-01-01,D, LC-01-02,H,x',
    note_shelfConfig: '提示：（格式：货架名称,属性,分割标志）分隔符仅为半角的逗号。',
    btn_submitShelf: '提交货架设置',
    label_allLocations: '全部库位：',
    note_allLocations: '格式：XX-XX-XX-XX-XX，一行一条。',
    btn_submitLocation: '提交全部库位',
    tab_shelfPriority: '货架优先级表格',
    tab_locationPriority: '库位优先级表格',
    tab1Desc: '货架优先级计算结果：',
    tab2Desc: '库位优先级匹配结果（优先级取自对应货架）：',

    th_shelfName: '货架名称',
    th_priority: '优先级',

    // 消息
    msg_enterShelfData: '请输入货架设置数据',
    msg_noValidShelf: '无有效货架数据',
    msg_enterShelfFirst: '请先输入货架设置数据，再提交库位',
    msg_enterLocationData: '请输入全部库位数据',
    msg_noValidLocation: '无有效库位数据',
    msg_dupShelfRemoved: '提示：已自动移除{n}个重复货架（属性一致）: {list}',
    msg_dupLocationRemoved: '提示：已自动移除{n}个重复库位: {list}',
    msg_shelfCalcOk: '货架优先级计算成功',
    msg_locationMatchOk: '库位优先级匹配成功',
    msg_shelfError: '货架处理错误：{msg}',
    msg_locationError: '库位处理错误：{msg}',

    // 错误
    err_shelfLineFormat: '第{n}行：需为"货架名称,属性,分割标志"三列（支持逗号或制表符分割，分割标志可空）',
    err_shelfDupConflict: '第{n}行：货架"{name}"重复且属性不一致（已存在: {a}, 当前: {b}）',
    err_shelfFormat: '第{n}行：货架名称"{name}"格式错误（需XX-XX-XX）',
    err_shelfAttr: '第{n}行：属性"{attr}"无效（仅支持H/D）',
    err_shelfFlag: '第{n}行：分割标志"{flag}"无效（仅支持=、x或空）',
    err_locationFormat: '第{n}行：库位"{loc}"格式错误（需XX-XX-XX-XX-XX）',
    err_locationPart4: '第{n}行：库位"{loc}"第4段无效（仅支持2位数字或DD）',
    err_locationPart5: '第{n}行：库位"{loc}"第5段需为两位数字',
    err_locationDD: '第{n}行：库位"{loc}"第4段为DD时，第5段需为01',
    err_locationNoShelf: '第{n}行：库位"{loc}"对应货架"{shelf}"未在货架设置中找到',

    styles: `...`
};
```

**`helpDescription`**：静态 HTML，**无 `{wiki}` 占位符**。

**`styles`**：

```css
.tabs-inner{margin-top:var(--sp-6)}
.input-group{flex:1;min-width:320px}
```

**只有两条**！这个模块几乎没自定义样式，全用 Core 提供的：

- `.section` / `.table-header` / `.form-row` / `.form-group` / `.columns-row` / `.input-group`
- `.tabs` / `.tab-btn` / `.tab-content-inner`
- `.btn` / `.note` / `.notice`
- `table` / `th` / `td`

**这就是 Core 的 CSS 设计目标**：让模块写业务时不用管样式。

---

## 错误消息的 `{n}` / `{loc}` / `{name}` / `{attr}` / `{flag}` / `{shelf}` / `{a}` / `{b}` 占位符

每个 `err_*` 模板都有**命名占位符**，代码里用 `.replace()` 填：

```js
throw new Error(PR_TEXT.err_shelfFormat
    .replace('{n}', index + 1)
    .replace('{name}', shelfName));
```

**注意**：

- `.replace()` **只替换第一个匹配**。如果同一占位符出现两次，第二次不会替换
- 当前所有模板都**每个占位符只出现一次**

**`err_locationPart4` / `err_locationPart5` 是死代码**（见[审计发现](#审计发现)）。

---

## 审计发现

### 1. `processLocationData` 里的两处死代码

```js
if (part4Lower !== "dd" && (part4.length !== 2 || isNaN(Number(part4)))) {
    throw new Error(PR_TEXT.err_locationPart4...);   // 不可达
}
if (isNaN(Number(part5))) {
    throw new Error(PR_TEXT.err_locationPart5...);   // 不可达
}
```

**原因**：正则 `([0-9]{2}|DD)` 和 `(\d{2})` 已经保证这两段格式。

**影响**：无功能影响，但**误导维护者**以为这里有校验。

**修复**：删掉，或把正则放宽、把校验移到运行时。

### 2. `validateWarehouse` 覆盖 `className`

```js
document.getElementById('prWarehouseName').className = 'validation-invalid';
```

**直接赋值 `className`**，**不保留其他 class**。

**当前**：`#prWarehouseName` 只有 `className` 变化，无其他 class，**无影响**。

**如果将来加了装饰 class**：会被覆盖。

**建议**：

```js
el.classList.toggle('validation-invalid', !valid);
el.classList.toggle('validation-valid', valid);
```

### 3. 内层 tab 的 class + inline style 混用

见[`switchPriorityTab`](#switchprioritytabindex)。

**结果正确，但两种机制并存**。初始化时靠 class，切换后靠 inline style。

**建议**：只用 class。

### 4. `createLocationPriorityTable` 的列偏移硬编码

```js
for (let i = 0; i < 3; i++) tr.appendChild(document.createElement("td"));
...
for (let i = 0; i < 7; i++) tr.appendChild(document.createElement("td"));
```

**如果 `CORE_HEADERS.locationChange` 加列/删列**：这两个数字要跟着改。**容易漏**。

**建议**：改成按列名判断（见[`createLocationPriorityTable`](#createlocationprioritytabledata-container)）。

### 5. `submitLocation` 不更新 tab 1

如果用户：

1. 只改 `#prText2`（库位）→ 点"提交库位"
2. 切到 tab 1 看货架优先级表

**结果**：tab 1 显示的是**上次**的货架优先级表（可能是空的，如果没提交过）。

**原因**：`submitLocation` 内部重建了 `priorityMap`，但**没更新 tab 1 的表格**。

**影响**：用户可能困惑。**但行为可解释**（tab 1 是"提交货架"的输出，tab 2 是"提交库位"的输出）。

### 6. `msg_noValidShelf` / `msg_noValidLocation` 实际未使用

文案里有：

```js
msg_noValidShelf: '无有效货架数据',
msg_noValidLocation: '无有效库位数据',
```

但 `submitShelf` / `submitLocation` 里用的是**行数校验**（`lines.length === 0`），**没用**这两个文案。

**当前**：死文案。**可以删**。

### 7. `submitLocation` 里 `shelfLines` 重复解析

```js
let shelfLines = shelfText.trim().split("\n").filter(l => l.trim());
let { shelfData } = this.processShelfData(shelfLines);
this.app.data.priorityMap = new Map();
shelfData.forEach(item => this.app.data.priorityMap.set(item.shelfName, item.priority));
```

**每次提交库位都重新解析货架**。如果货架设置很大（几百行），有性能开销。

**当前无优化**。**如果性能成问题**：加缓存，比如记 `_lastShelfText`，相同则不重解析。

### 8. `msg_dupShelfRemoved` / `msg_dupLocationRemoved` 的 `{list}` 可能很长

```js
.replace('{list}', duplicatesRemoved.join(", "))
```

**如果重复货架很多**：notice 里会显示一长串。**没有截断**。

**建议**：`slice(0, 10)` + "等 N 个"。

### 9. 内层 tab 的 `id="priorityTab1"` / `id="priorityTab2"` 未使用

HTML 里定义了 id，但 `switchPriorityTab` 用 `querySelectorAll('.tab-content-inner')`，**id 没用上**。

**可以删**。**保留也无害**。

### 10. `processShelfData` 的 `shelfMap` 只用于去重

```js
let shelfMap = new Map();
...
shelfMap.set(shelfName, attribute);
```

**`shelfMap` 只用于检查是否重复**。用 `Set` 也行（因为属性冲突时会抛错，不是静默跳过）。

**当前用 Map 存 attribute** 是为了在冲突时给出"已有属性"的信息。

**合理**。

### 11. 优先级算法的隐含假设

- **首条货架必须是 H**（否则可能得到奇怪的起始值）
- **`x` 分割之后的第一条货架**：优先级跳到整百

**边界**：如果**所有**货架都是 `x` 分割：

| 输入            | 优先级 |
| --------------- | ------ |
| `A-01-01,H,`  | 11     |
| `A-01-02,H,x` | 100    |
| `A-01-03,H,x` | 200    |
| `A-01-04,H,x` | 300    |

**每 +100**。**合理**。

### 12. `err_shelfLineFormat` 里 `{n}` 是**行号**（1-based）

`index + 1`。**用户友好**。

### 13. `err_locationNoShelf` 的 `{shelf}` 是从库位推导的

```js
let shelfKey = `${part1}-${part2}-${part3}`;
throw new Error(PR_TEXT.err_locationNoShelf
    .replace('{n}', index + 1)
    .replace('{loc}', location)
    .replace('{shelf}', shelfKey));
```

**用户能看到**"库位 `X` 对应货架 `Y` 未找到"。**好**。

### 14. `PR_TEXT.styles` 里没有 `.table-container` 相关

因为 Core 已经有：

```css
.table-container{max-height:450px;overflow-y:auto;...}
```

**本模块的 `table1-container` / `table2-container` 不是 `.table-container`**，所以**没有滚动条**！

**等等**——看 HTML：

```html
<div id="table1-container"></div>
```

**确实没有 `.table-container` class**。所以：

- 表格很长时**不出现滚动条**
- 整个页面跟着变长

**这是设计上的疏漏**（或者故意的：让表格完整展开）。

**如果想让表格滚动**：给 div 加 `class="table-container"`。

**当前行为**：无滚动，表格完整展开。**大表会撑长页面**。

### 15. `createPriorityTable` 不返回 table，只 append

**调用方必须**：

1. 先清空 container
2. 调用 `createPriorityTable`
3. 手动 append notice（如果有）

**如果 container 里有旧内容**：会**叠加**（因为函数只 append，不 clear）。

**当前**：`submitShelf` / `submitLocation` 都在调 `createXxxTable` 前手动 `container.innerHTML = ""`。**安全**。

### 16. `destroy()` 缺失

**当前没有**。因为模块没有 document 级监听、没有定时器、没有 Chart。

**但**：`app.data.priorityMap` 被清了吗？

**没有**。模块关闭后 `priorityMap` 还在。

**如果用户重新打开模块**：`submitShelf` 会重建 map。**无副作用**。

**但**：`priorityMap` 的引用**不会被 GC**（因为 `app.data` 是长期的）。

**这是个轻微的内存占用**，但不大。**可以不管**。

**如果做严格清理**：加 `destroy()` 清 `app.data.priorityMap`。

---

## 一页速查

```
入口：  modules.js 清单
id：    pickingroute
依赖：  无（不用任何第三方库）
用途：  分拣动线优先级计算

核心算法：processShelfData
  首条：initialPriority（默认 11）
  H：lastPriority + 10
  D 且前 H：lastPriority + 10
  D 且前 D：lastPriority + 1
  x 分割：ceil((last + 10) / 100) * 100

库位匹配：processLocationData
  按前 3 段查 priorityMap
  第 4 段 DD 时第 5 段必须 01

两个输出表：
  货架优先级表：货架名 + 优先级
  库位优先级表：13 列（对齐 CORE_HEADERS.locationChange），只填 3 列

内层 tab：
  .tab-btn + .tab-content-inner
  用 class .active + inline style.display

关键 DOM id：
  prInitialPriority / prWarehouseName
  prText1 / prText2
  prSubmitShelfBtn / prSubmitLocationBtn
  table1-container / table2-container
  priorityTab1 / priorityTab2

依赖 Core：
  injectStyle
  getHelpButton
  showMessage
  validations.warehousePattern
  CORE_HEADERS.locationChange
  _log
  panel 作用域（Core 提供）

已知问题：
  processLocationData 里两处死代码
  validateWarehouse 覆盖 className
  内层 tab 混用 class 和 inline style
  createLocationPriorityTable 列偏移硬编码
  table1/2-container 无滚动
  submitLocation 不刷新 tab 1
  destroy() 缺失（轻微内存占用）

命名约定：
  两个表格容器用 id，不用 .table-container（避免样式冲突？）
  内层 tab 用 data-priority-tab 而不是 data-tab
```

---

@license Unlicense
