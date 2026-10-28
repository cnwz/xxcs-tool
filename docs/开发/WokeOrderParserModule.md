# WorkOrderParserModule.js 二次开发文档

> 版本对应：WorkOrderParserModule v1.0.0 / 2026-09-24
> 模块 id：`workorderparser`
> 阅读前提：已读 Core.js 文档（模块契约、`readExcelTable`、`showImageViewer`、`injectStyle`、`loadLibrary`）
> 依赖：`chart` 库（统计 tab），`xlsx` 库（Core 自动处理）

---

## 定位

**是**：工单 Excel 解析器。上传工单数据，按分拣员分组，用三栏 MD 阅读器浏览工单详情，提供站责/非站责切换、按天/人/FAQ/商品的统计图表、反向钻取明细。

**不是**：不做工单编辑，不做工单创建，不连业务系统写数据。

**三栏布局**：

```
[分拣员]  [订单号]      [正文]
人列表    订单列表      工单卡片流
```

三栏都可以折叠/展开，配合三种视图模式。

**核心数据模型**：

```
picker → order → workOrder → row
人       订单     工单        行（商品）
```

统计单位是**工单**（`workOrder`），不是行。一个工单可以有多个商品行。

---

## 模块契约

```js
class WorkOrderParserModule {
    constructor(app) {
        this.app = app;
        this.title = WO_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-24';
        this.iconName = 'journal-text';
        this.introText = WO_TEXT.introText;
        this.helpDescription = WO_TEXT.helpDescription;
        // 状态字段...
        // 图表字段...
    }
    renderPanel(panel) { ... }
    destroy() { ... }      ← 有
}
window.WorkOrderParserModule = WorkOrderParserModule;
```

**有 `destroy()`**，因为模块内有：`document` 级点击监听、`mainBody` 滚动监听、Chart 实例、图片查看器。这三个必须在关闭时清理。

---

## 状态字段

### 数据

| 字段 | 类型 | 说明 |
|---|---|---|
| `_pickers` | `Map<string, Map<orderId, Order>>` | 顶层按分拣员，二层按订单 |
| `_sortedPickers` | `string[]` | 分拣员名排序后（`localeCompare('zh-CN')`） |
| `_flat` | `Array<{orderId, picker, cardEl}>` | 当前渲染的工单卡片索引，用于滚动定位 |
| `_stats` | `{totalRows, orderCount, pickerCount}` | 全局统计 |

**`Order` 结构**：
```js
{
    orderId,
    orderDate,
    workOrders: Map<workOrderId, {workOrderId, rows: Row[]}>
}
```

**`Row` 结构**：
```js
{
    workOrderId, orderId, picker, courier,
    productName, feedback, attachments: string[],
    result, workOrderCreatedAt,
    responsibleText, responsibleParts: [{label, value, isStation}],
    faqName, category: 'fulfillment'|'product',
    orderDate, isStation
}
```

### 视图状态

| 字段 | 说明 |
|---|---|
| `_currentPickerKey` | 当前选中分拣员 |
| `_currentOrderId` | 当前激活订单（滚动高亮） |
| `_currentTab` | `'station'` / `'nonStation'` / `'stats'` |
| `_viewMode` | `'A'`（人展开）/ `'B'`（订单展开）/ `'C'`（默认） |

### 监听句柄（必须清理）

| 字段 | 说明 |
|---|---|
| `_scrollHandler` | `mainBody` 滚动监听 |
| `_scrollRaf` | rAF 节流 id |
| `_documentClickHandler` | document 点击（视图模式切换） |
| `_viewerKeyHandler` | 图片查看器键盘监听 |

### 图表

| 字段 | 说明 |
|---|---|
| `_workOrderStats` | 懒加载的统计数据，首次进统计 tab 时构建 |
| `_charts` | 主区 Chart 实例数组，`_destroyCharts` 用 |

**注意**：`_showPickerFaqModal` / `_showReverseModal` 里创建的 Chart **不入 `_charts`**，通过 modal 关闭时 `Chart.getChart(id).destroy()` 清理。两套追踪机制。

---

## 解析

### `_parseRows(rows)`

同步。**核心解析函数**。把 Excel 二维数组转成 `_pickers`。

**参数**：`rows[0]` 是表头，`rows[1..]` 是数据。

**列查找**：

```
workOrderId       → '工单号'
orderId           → '订单号'
picker            → '分拣员mis' 或 '分拣员'
courier           → '配送员mis' 或 '配送员'
productName       → '商品名称'
feedback          → '问题反馈'
attachments       → '附件'
result            → '处理结果'
orderDate         → '订单日期'
packCompleteTime  → '打包完成时间'
woCreatedDate     → '工单创建日期'
woCreatedTime     → '工单创建时间'
category1         → '判责&工单实际一级业务分类名称'
faqName           → '判责FAQ名称' 或 '判责&工单实际FAQ'
finalResponsible  → '终判责任方'
initialResponsible→ '初判责任方'
originalResponsible → '原始责任方'
```

**列查找规则**：**精确匹配**（`h === kw`），不是包含。所以表头必须完全一致。

**按行处理**：

1. `orderId` 空 → 跳过
2. `picker` 空 → `'未指定分拣员'`
3. `workOrderId` 空 → `'__none__'`（用于后续显示时替换为"未提供"）
4. **责任方判定**（关键逻辑）：

**如果表里有初判/终判**：
```
responsibleParts = []
isStation = false
if (initialVal) {
    parts.push({label: '初判', value, isStation: initialVal === '门店'})
}
if (finalVal) {
    parts.push({label: '终判', value, isStation: finalVal === '门店'})
    isStation = finalVal === '门店'          ← 终判优先
} else if (initialVal) {
    isStation = initialVal === '门店'        ← 无终判时用初判
}
responsibleText = parts.map(p => `${p.label}：${p.value}`).join('　')
```

**如果表里只有原始责任方**：
```
responsibleText = `责任方：${originalVal}`
isStation = originalVal === '门店'
responsibleParts = [{label: '责任方', value, isStation}]
```

**分类判定**：
```
category = 'product'
if (categoryRaw.includes('履约')) category = 'fulfillment'
else if (categoryRaw.includes('商品')) category = 'product'
else if (faqRaw.includes('少送') || faqRaw.includes('错送')) category = 'fulfillment'
```

**注意**：`categoryRaw` 是精确字符串包含判断，不是枚举。`faqRaw` 的兜底也只在 `categoryRaw` 都没命中时生效。

5. 组装 `record`，挂到对应层级：`pickers[pickerName] → orderMap[orderId] → workOrders[workOrderId].rows`

**末尾**：`_sortedPickers` 排序，`_currentPickerKey` 默认第一个，`_stats` 填充，`_workOrderStats = null`，`_charts = []`。

**注意**：`_workOrderStats` 和 `_charts` 在这里被**置空**，意味着重新上传后统计会重新构建。

### `_formatDate(val)`

同步。归一化日期为 `yyyy-mm-dd`。

**支持格式**：`YYYY-MM-DD` / `YYYY/MM/DD` / `YYYY-M-D` / `YYYY/M/D`。
**其他**：原样返回字符串。

**正则**：`/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/`，前 3 段匹配即用，忽略后面。

### `_parseAttachments(str)`

同步。附件字段拆 URL 列表。

**分隔符**：`;` 或 `；`（中英文分号）。
**过滤**：trim 后非空，且 `^https?://` 或 `data:image` 开头。

**注意**：不验证 URL 有效性，只过滤明显非 URL 的。加载失败由 `<img>` 的 `onerror` 处理。

---

## 过滤（行级）

**核心概念**：一个工单里有多个商品行，**每行独立判定站责**。所以同一工单可能既有站责行又有非站责行。

**过滤粒度是行，不是工单**。切 tab 时按行过滤，工单只要还有符合的行就显示。

### `_getFilteredOrders(pickerKey)`

同步。取某分拣员名下符合当前 tab 的订单。

**返回**：`Array<{orderId, orderDate, workOrders: Map}>`。

**逻辑**：
1. `wantStation = _currentTab === 'station'`
2. 遍历该人的 orderMap
3. 每个 order 里遍历 workOrders，**行级过滤** `r.isStation === wantStation`
4. 过滤后还有行的工单才保留
5. 订单按 `orderId` **降序**排列（`b.localeCompare(a)`）

**注意**：过滤是在**每次 tab 切换 / 人切换**时现算的，不缓存。

### `_getFilteredPickers()`

同步。取当前 tab 下**有数据**的分拣员列表。

**逻辑**：遍历 `_sortedPickers`，检查该人名下**任一订单任一工单任一行**符合 `isStation === wantStation`。

**优化**：用 `has` 标志提前跳出。

### `_countByTab(isStation)`

同步。统计某 tab 下的**工单数**（工单级去重）。

**逻辑**：遍历所有 picker / order / workOrder，只要该工单**有一行**符合 `isStation` 就 +1。

**注意**：与 `_getFilteredOrders` 不同，这里**数工单**，不数行。

---

## 事件

### `_bindEvents(panel)`

同步。绑定面板级事件。

**只做一件事**：绑 `document` 点击，处理视图模式切换。

**逻辑**：
1. **先移除旧的** `_documentClickHandler`（防重复绑）
2. 新的 handler：
   - `_viewMode === 'C'` → 不处理
   - 点击在 `.wo-columns` 内 → 不处理
   - 点击在 `.img-viewer` 内 → 不处理
   - `#woColumns` 不存在或隐藏 → 不处理
   - 否则 → 切回 `'C'` 模式

**意义**：用户在人/订单展开态（A/B）下点正文外区域，自动收回默认三栏。

**注意**：`panel` 参数**实际没用到**（绑的是 document）。这是历史遗留。

### `_handleFile(file)`

异步。处理上传的工单 Excel。

**逻辑**：
1. 文件 > 20MB → 报错
2. `showLoading(this.id, '正在解析…')`
3. `readExcelTable(file, ...)`
4. `rows = [table.headers, ...table.rows]`
5. `_parseRows(rows)`
6. `_renderAll()`
7. `showMessage('解析成功，共 N 条记录')`
8. `finally { hideLoading(this.id) }`

**注意**：上传行数上限由 Core 的 `readExcelTable` 控制（默认 5 万行）。

---

## 渲染

### `_renderAll()`

同步。**全量渲染入口**。

**逻辑**：
1. 无数据 → 隐藏 `#woContentArea`，报错
2. 显示 `#woContentArea`
3. 计算两个 tab 的工单数
4. **当前 tab 智能选择**：如果站责为 0 且非站责 > 0，切到 `'nonStation'`
5. `_viewMode = 'C'`
6. `_currentOrderId = null`
7. `_renderTabBar()` → `_renderPickerList()` → `_renderPickerContent()`
8. `_applyViewMode()` → `_updateViewByTab()`
9. 有内容 → `_setActive(_flat[0].orderId)` 高亮第一个

### `_updateViewByTab()`

同步。按当前 tab 切换内容区显隐。

**逻辑**：
- `stats` → 隐藏 `#woColumns`，显示 `#woStatsArea`
- 其他 → 反过来

**注意**：`stats` tab 下正文区完全不显示（不是仅仅隐藏），所以 `_flat` 里的 cardEl 会失效。

### `_renderTabBar()`

同步。渲染顶部 tab。

**三个 tab**：
- `站责 (N)`
- `非站责 (N)`
- `统计`

**绑定**：每个 tab 点击 → 切 tab → 重渲染。

**tab 切换逻辑**：
- 切到 `stats` → `_updateViewByTab()` + `_renderStatsArea()`
- 切到其他 → 重置 `_currentOrderId` / `_viewMode` → `_updateViewByTab()` → `_renderPickerList()` → `_renderPickerContent()` → `_applyViewMode()` → `_setActive(_flat[0])`

**注意**：切回数据 tab 时**不重建** `_pickers`，只是重新过滤和渲染。

### `_renderPickerList()`

同步。渲染人列表（全量 + slim 两种）。

**逻辑**：
1. `_getFilteredPickers()` 取列表
2. 当前选中人不在列表 → 切到列表第一个
3. 全量列表（`#woPickerList`）：
   - 每个 `<li>` 含 `.wo-picker-item[data-picker]`，显示人名 + 工单数
   - 当前选中人加 `.active`
4. slim 列表（`#woPickerSlim`）：
   - 每个 `<button class="icon-btn[data-picker]">`，内容是人名图标
   - 当前选中人加 `.active`

**事件绑定**：`listEl.onclick` / `slimEl.onclick` 用**直接赋值**（不是 addEventListener），所以每次渲染自动覆盖旧监听。

**点击行为**（`selectPicker`）：
1. `_currentPickerKey = picker`
2. `_currentOrderId = null`
3. `_viewMode = 'A'`（人展开）
4. 重渲染人列表 + 内容 + 应用视图模式
5. 高亮第一个订单

**注意**：`e.stopPropagation()` 防止冒泡到 document（会触发 `_documentClickHandler` 切回 C 模式）。

### `_applyViewMode()`

同步。应用视图模式。

**逻辑**：
- 清 `.state-a` / `.state-b`
- `'A'` → 加 `.state-a`
- `'B'` → 加 `.state-b`
- `'C'` → 都不加

**CSS 效果**（在 `WO_TEXT.styles` 里定义）：
- `.state-a` → main 栏收窄成 slim
- `.state-b` → picker 栏收窄成 slim，order 栏固定宽度，main 栏展开

**注意**：本方法**不改 `_viewMode`**，只应用。

### `_renderPickerContent()`

同步。**核心渲染函数**。渲染订单列表 + 正文卡片流。

**输入**：`_currentPickerKey` 和当前 tab。

**逻辑**：

1. 清空 `#woOrderList` 和 `#woMainBody`，清 `_flat`
2. 无当前人 → 显示空提示
3. `_getFilteredOrders(currentPickerKey)` 取订单
4. 无订单 → 显示空提示
5. **遍历每个订单**：
   - **订单列表项**：显示订单号 + 商品名摘要（前 2 个 + `+N`）
   - **订单卡片**：
     - header：订单号链接（`buildUrl('?order=id' + orderId)`）+ 日期 + 工单数
     - subheader：分拣员 + 配送员（取第一个非空）
     - 每个工单块：`_buildWorkOrderBlockHtml`
6. 拼 HTML 后整体赋值
7. **构建 `_flat`**：每个卡片记录 `{orderId, picker, cardEl}`
8. **附件图片懒加载**：遍历每个订单的附件，创建 `<img>`，绑定 `onerror` 降级为 `<a>`，`onclick` 打开查看器
9. `mainBodyEl.scrollTop = 0`
10. **绑订单列表点击**：切到 B 模式 + 高亮 + 滚动到卡片
11. **绑定滚动监听**（先移除旧的）：`_onMainScroll`
12. `requestAnimationFrame` → `_updateActiveOutline()`

**附件处理细节**：

```js
// 找附件区块
const targetSec = this._findAttachmentSection(record.cardEl, rec);
// 创建 img
img.loading = 'lazy';              // 懒加载
img.referrerPolicy = 'no-referrer'; // 不发 referer
img.addEventListener('error', ...); // 降级为 <a>
img.addEventListener('click', ...); // 打开查看器
```

**`orderAttachments` 数组**是**整个订单**的附件合集（跨工单跨行），点图片时打开的是这个合集。所以用户能在一个订单里翻页看所有图。

**注意**：`_currentPickerKey` 变了不会自动重渲染，需要调用方显式调 `_renderPickerContent()`。

### `_findAttachmentSection(cardEl, rec)`

同步。**定位附件区块**（用于把 `<img>` 插进正确位置）。

**参数**：
- `cardEl`：订单卡片 DOM
- `rec`：某行记录

**逻辑**：
1. 按 `data-woid` 找工单块
2. 遍历该块内所有 `.wo-product-row`
3. 优先用 `data-rowkey` 匹配（`_rowKey(rec)`）
4. 匹配不到用 `nameEl.textContent === rec.productName` 兜底
5. 找到行后找 label 是 `'附件'` 的 `.wo-section`

**返回**：附件区块 DOM 或 `null`。

**为什么需要这个方法**：`_renderPickerContent` 先拼 HTML（附件区块为空），再异步填图。填入位置靠这个函数找。

### `_rowKey(rec)`

同步。生成行唯一 key。

```js
return `${rec.workOrderId}|${rec.productName || ''}`;
```

**用于** `_findAttachmentSection` 的匹配。

**坑**：同一工单下同名商品（同商品多行）会撞 key，附件会插到第一行。

### `_buildWorkOrderBlockHtml(wo, esc)`

同步。生成单个工单块的 HTML。

**参数**：
- `wo`：`{workOrderId, rows}`
- `esc`：`escapeHtml` 函数（外部传入，避免重复查找）

**结构**：

```html
<div class="wo-workorder-block" data-woid="{workOrderId}">
    <div class="wo-workorder-header">
        <div>工单号：{id}（{n} 个商品）</div>
        <div class="wo-workorder-header-row">
            <span>判责FAQ：...</span>
            <span>初判：...（有则显示）</span>
            <span>终判：...（有则显示）</span>
            <span>时间：...</span>
        </div>
    </div>
    <!-- 每行 -->
    <div class="wo-product-row" data-rowkey="{rowKey}">
        <div class="wo-product-name">{商品名}</div>
        <div class="wo-section">
            <div class="wo-section-label">问题反馈</div>
            <div class="wo-section-content">{feedback}</div>
        </div>
        <!-- 有附件时 -->
        <div class="wo-section">
            <div class="wo-section-label">附件</div>
            <div class="wo-attachments"></div>  <!-- 空，由 _renderPickerContent 填 -->
        </div>
        <div class="wo-section">
            <div class="wo-section-label">处理结果</div>
            <div class="wo-section-content">{result}</div>
        </div>
    </div>
</div>
```

**响应式部分**：

`headerMetaHtml` 里初判/终判的颜色：
- `isStation === true` → `wo-station`（红色）
- `isStation === false` → `wo-other`（绿色）

**注意**：颜色绑定的是 `responsibleParts[i].isStation`，是**该判责环节**的判定，与整个工单的 `isStation` 可能不同。比如初判"门店"终判"供应商"，初判段显红，终判段显绿。

**`woid` 为 `'__none__'` 时**：显示为 `'未提供'`（`WO_TEXT.workOrderLabelEmpty`）。

**注意**：`headerLine` 里 `esc(woidLabel)` 会转义，但 `workOrderLabel` 模板本身不含 HTML，所以只是防注入。

### `_sectionHtml(labelText, content)`

同步。生成 section HTML。

**逻辑**：
- `content` 非空 → `wo-section-content`
- `content` 空 → `wo-section-content wo-empty`，内容显示 `'（无）'`

**用途**：统一"问题反馈"和"处理结果"两个 section 的渲染。

### `_setActive(orderId)`

同步。设置激活订单。

**逻辑**：
1. 清所有 `.wo-order-item.active` 和 `.wo-order-card.highlight`
2. 从 `_flat` 找记录
3. 对应的订单列表项加 `.active`
4. 对应的卡片加 `.highlight`
5. `_currentOrderId = orderId`

**注意**：`orderId` 通过 CSS 属性选择器匹配，如果 orderId 含特殊字符（引号、方括号），选择器会失效。当前业务假设 orderId 是纯数字或字母。

### `_onMainScroll()`

同步。滚动节流。

**逻辑**：
- 已有 rAF → 直接返回
- 无 → 申请 rAF，回调里清 id 并调 `_updateActiveOutline`

**用途**：滚动时更新高亮，60fps 节流。

### `_updateActiveOutline()`

同步。**根据滚动位置更新高亮**。

**逻辑**：
1. 取 `#woMainBody` 的 `getBoundingClientRect`
2. 阈值 = `mainRect.top + 40`
3. 遍历 `_flat`，找**最后一个 top <= 阈值**的卡片
4. 与当前不同 → `_setActive(active.orderId)`

**意义**：滚动时自动高亮当前视口顶部附近的订单。

**注意**：`_flat` 必须按 DOM 顺序排（按订单列表顺序），否则遍历顺序错乱。

---

## 图片查看器

### `_showImageViewer(images, startIndex)`

同步。委托给 `app.showImageViewer`。

**参数**：
- `images`：图片 URL 数组
- `startIndex`：起始索引

**选项**：`{loop: true, showOpenOriginal: true}`。

**注意**：**模块自己的 `_viewerKeyHandler` 在这里没用**——`app.showImageViewer` 内部有自己的键盘处理。`_closeImageViewer` 和 `_viewerKeyHandler` 是给模块自己实现查看器时的历史遗留（现在没用上）。

### `_closeImageViewer()`

同步。移除所有 `.img-viewer`，清 `_viewerKeyHandler`。

**当前状态**：由于 `_showImageViewer` 委托给了 app 的方法，`_closeImageViewer` **实际不会被调用**（除非用户代码手动调）。`destroy` / `_reset` 里调了它，是无害的清理。

---

## 生命周期

### `destroy()`

同步。**释放资源**。

**做四件事**：
1. `_closeImageViewer()`
2. `_destroyCharts()`
3. 移除 `_documentClickHandler`
4. 移除 `mainBody` 的 scroll 监听

**调用时机**：Core 的 `closeModule(id)` 里。

**如果加新的全局监听或定时器，必须在这里清理。**

### `_reset(panel)`

同步。**重置模块**。

**做**：

1. `_closeImageViewer()`
2. `_destroyCharts()`
3. 移除 `_documentClickHandler`
4. 重置所有状态字段为空
5. 清 `#woTabBar` / `#woPickerList` / `#woPickerSlim` / `#woOrderList` / `#woMainBody`
6. 移除 `mainBody` 的 scroll 监听
7. 隐藏 `#woContentArea`
8. `showMessage('已重置')`

**注意**：`panel` 参数**实际未用**，全部 `document.getElementById`。

**重置 vs destroy 的区别**：

| | `_reset` | `destroy` |
|---|---|---|
| 清理监听 | ✓ | ✓ |
| 清 DOM | ✓ | ✗（Core 会移除整个 panel） |
| 清状态 | ✓（全部） | ✗（实例即将丢弃） |
| 消息提示 | ✓ | ✗ |

---

## 统计

### `_ensureChartLib()`

异步。确保 Chart.js 加载。

**返回**：`Promise<boolean>`。委托给 `app.loadLibrary('chart')`。

### `_destroyCharts()`

同步。销毁所有主区图表。

**逻辑**：遍历 `_charts`，逐个 `destroy()`，清空数组。用 `try/catch` 吞异常（可能已被销毁）。

**注意**：**不清理 modal 里的图**。modal 里的图由 modal 的 `close` 回调处理。

### `_buildWorkOrderStats()`

同步。**构建工单级统计数据**。懒加载（`_workOrderStats` 缓存）。

**返回**：`{total, category, byDate, byPicker, faqCount, productCount, pickerFaq, faqToRecords, productToRecords}`。

**字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `total` | `number` | 工单总数 |
| `category` | `{fulfillment, product}` | 分类计数 |
| `byDate` | `Map<date, {fulfillment, product}>` | 按天 |
| `byPicker` | `Map<picker, {fulfillment, product, total}>` | 按人 |
| `faqCount` | `Map<faq, number>` | FAQ 计数 |
| `productCount` | `Map<product, number>` | 商品计数 |
| `pickerFaq` | `Map<picker, {fulfillment: Map, product: Map}>` | 人的分类 FAQ |
| `faqToRecords` | `Map<faq, Record[]>` | FAQ 反向索引（**按行展开**） |
| `productToRecords` | `Map<product, Record[]>` | 商品反向索引（**按行展开**） |

**核心逻辑**：

1. 遍历每个 picker 的每个 order 的每个 workOrder
2. **工单级判定**：`hasStation = rows.some(isStation)`，`hasNon = rows.some(!isStation)`，都无 → 跳过
3. **代表行**：`rep = wo.rows[0]`，用于 category / orderDate / faqName
4. **工单级计数**：`total++`，`category[rep.category]++`
5. **按天**：`byDate[date][rep.category]++`
6. **按人**：`byPicker[picker][rep.category]++`，`byPicker[picker].total++`
7. **FAQ 按工单去重**：用 `Set` 收集该工单里所有不同 FAQ，每个 +1
   - `faqCount[faq]++`
   - `pickerFaq[picker][rep.category][faq]++`
   - **明细按行展开**：该工单里 `r.faqName === faq` 的行都 push 到 `faqToRecords[faq]`
8. **商品按工单去重**：同 FAQ 逻辑

**关键设计**：

- **计数单位是工单**：一个工单里同一 FAQ 出现 3 次只算 1 次
- **明细按行**：`faqToRecords` / `productToRecords` 存所有行，用户钻取时能看到每个商品
- **代表行**：分类用 `rows[0]`，隐含假设一个工单里所有行 category 一致（因为 `categoryRaw` 是工单级的）

**潜在问题**：如果一个工单里不同行的 `faqName` 不同（可能性小但存在），`faqCount` 会计多次（每个不同 FAQ 各一次），但 `total` 只算 1 次。导致 `sum(faqCount) > total`。

**缓存**：`_workOrderStats` 非空时直接返回。`_parseRows` 里被置 null，所以重新上传会重算。

### `_renderStatsArea()`

异步。**渲染统计区域**。

**流程**：

1. 无数据 → 显示"请先上传"
2. 显示"正在加载图表库…"
3. `await _ensureChartLib()`，失败 → 显示错误
4. `_destroyCharts()`
5. `_buildWorkOrderStats()`
6. 计算各项统计（百分比、排序、Top 10）
7. 生成 HTML 结构（统计卡片 + 图表 canvas + 榜单）
8. 赋值 `area.innerHTML`
9. 给可点击的榜单行绑定 `_showReverseModal`
10. 动态调整 `#woChartPickerWrap` 高度（按人数）
11. 创建三个 Chart：
    - **按天**：`type: 'line'`，两条线（履约/商品）
    - **按人**：`type: 'bar'`，横向（`indexAxis: 'y'`），两层堆叠，**点击柱子 → `_showPickerFaqModal`**
    - **FAQ**：`type: 'doughnut'`，Top 10，**点击扇区 → `_showReverseModal`**
12. 商品排行：只有列表，没有图

**注意**：

- **总览大卡**（`stats_globalTitle`）只显示总数 + 两类占比，没有图
- FAQ 有 doughnut 图 + 完整榜单；商品只有榜单
- 按人图点击用 `elements[0].index` 索引 `pickerRows`
- `pickerWrap.style.height` 动态计算（`rowCount * 32 + 60`），避免人少时图太矮

**`onClick` 回调签名**：`(evt, elements) => { if (!elements.length) return; ... }`。

**`percentLabelsPlugin` / `barValuePlugin` 是自定义 Chart.js 插件**，见[插件](#插件)部分。

### `_showPickerFaqModal(pickerName)`

同步。**弹某分拣员的 FAQ 画像弹窗**。

**数据来源**：`stats.pickerFaq.get(pickerName)` 和 `stats.byPicker.get(pickerName)`。

**内容**：
- 标题：`{人名} 的 FAQ 分布（共 N 个站责工单）`
- 概要：履约数 + 商品数
- **履约分类横向柱状图**（`_renderCategoryBarChart`）
- **商品分类横向柱状图**
- **合并环形图**（履约 + 商品所有 FAQ 合并，按数排序）
- **完整榜单**（合并列表，带百分比）

**关键实现**：

1. **动态高度**：`fulfillHeight = max(120, fulfillArr.length * 32 + 50)`
2. **弹窗容器**：手写 `.wo-img-viewer`（复用样式）
3. **关闭时销毁 Chart**：
   ```js
   ['woPickerFaqCanvas', 'woPickerFulfillCanvas', 'woPickerProductCanvas'].forEach(id => {
       const c = Chart.getChart(id);
       if (c) { try { c.destroy(); } catch (e) {} }
   });
   ```
4. **Esc 关闭** + 点遮罩关闭
5. **点 X 关闭**

**注意**：**没有用 `app.showModal`**，手写的 overlay。因为需要更自由的布局（多图 + 列表）。**这意味着它和 `#commonModal` 是两个独立的弹窗系统**，可能同时存在。

### `_renderCategoryBarChart(ctx, arr, maxValue, color)`

同步。渲染横向柱状图。

**参数**：
- `ctx`：canvas 元素
- `arr`：`Array<[label, count]>`
- `maxValue`：**最大值**，用于设置 x 轴上限（`max * 1.15`）
- `color`：柱色

**配置**：
- `indexAxis: 'y'`
- `barThickness: 20`
- `layout.padding.right: 50`（给右侧数值标签留位）
- `plugins.legend.display: false`
- `scales.x.max = maxValue * 1.15`
- **`barValuePlugin`**：在柱子右侧显示数值

**注意**：`maxValue` 需调用方传入，如果是空数组传 0，内部会 fallback 到 10。

### `_showReverseModal(type, name)`

同步。**反向钻取弹窗**。

**参数**：
- `type`：`'faq'` 或 `'product'`
- `name`：FAQ 名或商品名

**数据来源**：`faqToRecords.get(name)` 或 `productToRecords.get(name)`。

**内容**：

1. **标题**：`{name}（{FAQ/商品}，共 N 个站责工单）`
2. **按分拣员分布**：
   - 用 `Set` 存 `workOrderId|orderId` 去重
   - 显示人名 + 工单数 + 百分比 + 条形图
3. **工单明细**（最多 1000 条）：
   - 每行：工单号 / 订单号 / 分拣员 / 另一维度（product 模式显示 FAQ，faq 模式显示商品）
   - **如果 `type === 'product'` 且该行有 FAQ，整行可点击 → 递归 `_showReverseModal('faq', faqName)`**

**去重逻辑**：

```js
records.forEach(r => {
    if (!byPicker.has(r.picker)) byPicker.set(r.picker, new Set());
    byPicker.get(r.picker).add(r.workOrderId + '|' + r.orderId);
});
```

用 `Set` 去重。**注意 key 是 `workOrderId|orderId`，不是单纯 orderId**。一个订单可以有多个工单，每个工单算一次。

**截断**：超过 1000 条显示"仅显示前 1000 条，共 N 条"。

**递归钻取**：从商品进入 FAQ 明细后，点某行又进入 FAQ 钻取。**会关闭当前弹窗再打开新的**（不堆叠）。

**注意**：`_showReverseModal` 和 `_showPickerFaqModal` **都没有把 Chart 加入 `_charts`**，通过 `Chart.getChart` 追踪。**`Chart.getChart` 是 Chart.js 4.x 的 API**，按 canvas id 或元素查实例。

---

## renderPanel

### `renderPanel(panel)`

同步。渲染整个面板。

**结构**：

```html
<div class="section">
    [Core.uploadSection（上传 + 重置）]
</div>
<div id="woContentArea" class="section wo-content-area">
    <div class="wo-tabs-bar" id="woTabBar"></div>
    <div class="wo-columns" id="woColumns">
        <aside class="wo-pickers-col">
            <div class="wo-col-full">
                <div class="wo-col-title">分拣员</div>
                <ul class="wo-list" id="woPickerList"></ul>
            </div>
            <div class="wo-col-slim">
                <div class="wo-col-title wo-col-title-slim">人</div>
                <div class="wo-list-slim" id="woPickerSlim"></div>
            </div>
        </aside>
        <aside class="wo-orders-col">
            <div class="wo-col-full">
                <div class="wo-col-title">订单号</div>
                <ul class="wo-list" id="woOrderList"></ul>
            </div>
        </aside>
        <main class="wo-main">
            <div class="wo-col-full">
                <div class="wo-col-title">正文</div>
                <div class="wo-main-body" id="woMainBody"></div>
            </div>
            <div class="wo-col-slim">
                <div class="wo-col-title wo-col-title-slim wo-col-title-slim-fill">文</div>
            </div>
        </main>
    </div>
    <div class="wo-stats-area" id="woStatsArea"></div>
</div>
```

**末尾**：

```js
this._bindEvents(panel);
this.app.bindUploadSection({
    btnId: 'woUploadBtn',
    accept: '.xlsx,.xls',
    onFile: (file) => this._handleFile(file),
    resetId: 'woResetBtn',
    onReset: () => this._reset(panel),
});
this.app._log(this.title + '模块加载成功');
```

**关键 DOM id**：

| id | 用途 |
|---|---|
| `woContentArea` | 整体内容区，无数据时隐藏 |
| `woTabBar` | 顶部 tab 栏 |
| `woColumns` | 三栏布局容器（视图模式的 CSS 根） |
| `woPickerList` / `woPickerSlim` | 人列表（全量 / slim） |
| `woOrderList` | 订单列表 |
| `woMainBody` | 正文滚动区 |
| `woStatsArea` | 统计区 |
| `woUploadBtn` / `woResetBtn` | 上传区按钮 |

**注意**：三栏的 CSS 布局靠 CSS 变量控制（`--wo-slim` / `--wo-order`），改这些会同时影响三种视图模式的动画。

---

## 类外常量与插件

### `COLOR_F = '#FFA000'` / `COLOR_P = '#2196f3'`

履约 = 橙，商品 = 蓝。用于所有图表。

**注意**：这是**硬编码**，不走 CSS 变量。因为 Chart.js 需要真实色值（canvas 绘制），不认 CSS 变量。

### `PALETTE`

15 色数组，用于饼图/环形图配色。循环使用 `PALETTE[i % PALETTE.length]`。

### `percentLabelsPlugin`

**Chart.js 插件**。在 doughnut/pie 图里绘制百分比文字。

**钩子**：`afterDatasetsDraw`

**逻辑**：
- 遍历每个 arc
- 百分比 < 4% 跳过（太小放不下）
- 在 `arc.tooltipPosition()` 画白字百分比

**注意**：百分比按 **所有数据之和** 计算，不是按可见弧。所以超过 Top N 的项不显示时，百分比总和 < 100%。

### `barValuePlugin`

**Chart.js 插件**。在横向柱状图右侧绘制数值。

**钩子**：`afterDatasetsDraw`

**逻辑**：
- 遍历每个 bar
- 在 `bar.tooltipPosition().x + 6` 处画数值
- 颜色用柱色

**注意**：需要 `layout.padding.right` 预留空间（`_renderCategoryBarChart` 里设了 50px）。

### `WO_TEXT`

**结构**：

```js
const WO_TEXT = {
    title, introText, helpDescription,

    // 按钮
    btn_upload, btn_reset,

    // 栏目标题
    pickersTitle, ordersTitle, mainTitle, slimPicker, slimMain,

    // Tab 模板（含 {n}）
    tab_station, tab_nonStation, tab_stats,

    // 业务常量
    stationResponsible: '门店',
    defaultPicker: '未指定分拣员',

    // 空态
    emptyAfterParse, emptyTabHint,

    // 工单展示
    woUnit: '个工单',
    workOrderLabel, workOrderLabelEmpty, workOrderProductCount,

    // 分类
    category_fulfillment: '履约',
    category_product: '商品',
    faqShort: 'FAQ',

    // 责任方模板
    responsibleInitial, responsibleFinal, responsibleOriginal,
    meta_initialLabel, meta_finalLabel, meta_originalLabel,

    // 字段标签
    meta_faq, meta_responsible, meta_time, meta_picker, meta_courier,

    // 区块
    section_feedback, section_attachments, section_result, sectionEmpty,

    // 附件
    alt_attachment, attachmentLoadFailed,

    // 查看器
    viewerClose, viewerPrev, viewerNext, btn_openOriginal,

    // 消息
    msg_fileTooLarge, msg_emptyFile, msg_tooManyRows, msg_parseOk,
    msg_parseFailed, msg_parsing, msg_reset,

    // 统计
    stats_globalTitle, stats_total, stats_dateTitle, stats_pickerTitle,
    stats_faqTitle, stats_productTitle, stats_fullList, stats_byPicker,
    stats_workOrderDetails, stats_needUpload, stats_loadingLib, stats_libFailed,
    stats_noData, stats_noPickerData, stats_totalTooltip, stats_pickerModalTitle,
    stats_reverseSubtitle, stats_detailsTruncated, noDate,

    // 样式
    styles: `...`
};
```

**帮助文案里没有 `{wiki}`**，所以帮助弹窗不替换。要加的话在 `helpDescription` 里写 `{wiki:xxx}`，Core 会替换。

**样式**：

- 三栏动画靠 `--wo-slim` / `--wo-order` / `--wo-ease` / `--wo-slow` 四个变量
- `.state-a` / `.state-b` 通过 `flex-basis` 控制列宽
- `.wo-col-full` / `.wo-col-slim` 叠放，通过 `opacity` + `pointer-events` 切换
- 有 `@media (prefers-reduced-motion: reduce)` 尊重系统设置
- 有 `@media (max-width: 900px)` 移动端适配（改成竖排，隐藏 slim 栏）

**样式里所有颜色都用 Core 变量**，深色自动跟随。

---

## 扩展场景

### 加一个新的统计维度（比如按配送员）

1. `_buildWorkOrderStats` 里加 `byCourier: Map`
2. `_renderStatsArea` 里加一张卡片 + 创建 Chart
3. `WO_TEXT` 加对应文案

### 加一个新的 tab

1. `_renderTabBar` 里加按钮
2. 加 `_currentTab` 分支处理
3. `_updateViewByTab` 加对应显隐

### 改三栏布局宽度

改 `WO_TEXT.styles` 里 `.wo-columns` 的 `--wo-slim` / `--wo-order`：

```css
.wo-columns {
    --wo-slim: 56px;      /* 折叠后的宽度 */
    --wo-order: 240px;    /* 订单栏固定宽度（B 模式） */
}
```

### 换 Chart.js 图表类型

`_renderStatsArea` 里的 `type` 字段：
- `'line'` / `'bar'` / `'doughnut'`
- 改成 `'pie'` / `'radar'` 也行，但注意 `_renderCategoryBarChart` 用的是横向 `'bar'`

### 加附件预览的打印按钮

`_showImageViewer` 委托 app 时加 `showPrint: true`：

```js
_showImageViewer(images, startIndex) {
    this.app.showImageViewer(images, startIndex, { loop: true, showOpenOriginal: true, showPrint: true });
}
```

### 支持多列合并解析

`_parseRows` 里的列查找是**精确匹配**。要支持"列名包含关键词即可"：

```js
const findCol = (keywords) => {
    for (let i = 0; i < header.length; i++) {
        const h = header[i];
        if (!h) continue;
        for (const kw of keywords) {
            if (h.includes(kw)) return i;    // 改成 includes
        }
    }
    return -1;
};
```

**注意**：包含匹配会误命中，比如"商品名称"和"商品编码"都含"商品"。

### 用 Modal 替换手写的 pickerFaq 弹窗

把 `_showPickerFaqModal` 改成 `app.showModal` + 传 DOM Node。**但要注意**：`app.showModal` 只给一次 `body.innerHTML`，Chart 需要在插入后创建。可行但需要调整时序。

---

## 坑位清单

### 1. `_rowKey` 只用 `workOrderId|productName`

同工单下同名商品会撞 key，导致 `_findAttachmentSection` 把第二个行当第一个行处理，附件插错位置。

**改法**：`_rowKey` 加入行内序号，`_buildWorkOrderBlockHtml` 里给 `data-rowkey` 传行索引。

### 2. `_findAttachmentSection` 依赖 DOM 结构

通过 `data-rowkey` / `.wo-product-row` / `.wo-section-label` 匹配。**改动 `_buildWorkOrderBlockHtml` 的输出结构会破坏它**。

**建议**：加注释标记这个耦合。

### 3. `_documentClickHandler` 会在切 tab 时误触发

切 tab 走的是 `#woTabBar` 里的按钮点击，**不在 `.wo-columns` 里**。所以点 tab 时会触发 `_documentClickHandler` → 切回 C 模式。

**当前行为**：切 tab 后 `_viewMode` 确实切到 C，符合预期。但如果将来想"切 tab 保留视图模式"，要排除 tab 区域。

### 4. `_showPickerFaqModal` / `_showReverseModal` 的 Chart 不入 `_charts`

这两个弹窗的 Chart 通过 `Chart.getChart(id).destroy()` 清理。**如果两个弹窗同时打开**（理论上不会，因为 `_showReverseModal` 会先关闭自己），或者 canvas id 冲突（两个弹窗同名 canvas），会互相影响。

**当前 canvas id 唯一**（`woPickerFaqCanvas` / `woPickerReverseXxx`），没问题。

### 5. `_buildWorkOrderStats` 的 category 用 `rows[0]`

如果一个工单里不同行的 category 不同（理论上不该发生），分类会计错。

**根因**：`categoryRaw` 是工单级字段（`判责&工单实际一级业务分类名称`），所以理论上不该不同。

### 6. `sum(faqCount) > total`

**场景**：一个工单有 2 个不同的 FAQ，`faqCount` 里每个 +1，共 +2；但 `total` 只 +1。

**影响**：FAQ 图的百分比之和 > 100%。

**这是**：有意设计（FAQ 计数不强制对齐 total），但用户可能困惑。

### 7. `_renderPickerContent` 的 `innerHTML` 整体重建

大订单时（几百个卡片）性能有影响。**当前无分页**，一次性渲染全部。

**优化方向**：虚拟滚动，或按订单分页。

### 8. `_currentPickerKey` 变了不会自动重渲染

调用方（`_renderPickerList` 里的 `selectPicker`）显式调 `_renderPickerContent()`。**如果外部代码只改 `_currentPickerKey`，UI 不会更新**。

### 9. `_renderStatsArea` 没有 loading 反馈

除了首次的"正在加载图表库…"，后续构建统计数据没有进度提示。大数据量时会卡一下。

### 10. `_reset(panel)` 的 `panel` 参数未使用

全部 `document.getElementById` 查询。**如果未来 Core 支持多实例，会破坏**。

### 11. `_showReverseModal` 递归时会累积 document 监听

每次调用都 `document.addEventListener('keydown', keyHandler)`。**递归时**先 `close()` 关旧的（内部移除监听），再开新的。所以不会累积。

**但**：如果用户连点多个钻取入口，可能同时存在多个 overlay。当前通过"关闭自己再开新的"避免，**没有全局单例保护**。

### 12. `WO_TEXT.stationResponsible` 硬编码 `'门店'`

判断 `isStation` 靠 `=== '门店'`。**如果业务改名**（比如"站点"），要全局替换。

**注意**：这个字符串在 `_parseRows` 里判断，也在 `responsibleParts[i].isStation` 里用。**两处都要改**。

### 13. `_parseRows` 的 `packCompleteTime` 兜底

```js
const orderDateRaw = get(col.orderDate) || get(col.packCompleteTime) || woCreatedDate;
```

如果 `orderDate` 列不存在（`col.orderDate = -1`），`get(-1)` 返回 `''`，走 `packCompleteTime`。再没有走 `woCreatedDate`。

**注意**：`get` 函数对 `-1` 索引返回 `''`，安全。

### 14. `categoryRaw` 的匹配顺序

```js
if (categoryRaw.includes('履约')) category = 'fulfillment';
else if (categoryRaw.includes('商品')) category = 'product';
else if (faqRaw.includes('少送') || faqRaw.includes('错送')) category = 'fulfillment';
```

**如果 `categoryRaw` 同时含"履约"和"商品"**（比如"履约商品"），会判为 `'fulfillment'`（先匹配先赢）。

**如果 `categoryRaw` 都没有**，靠 `faqRaw` 兜底，只认"少送"/"错送"两种。其他 FAQ 都判为 `'product'`。

### 15. `_showImageViewer` 的 `images` 是整个订单的附件

点某张图时，查看器打开的是**整个订单**的附件列表，不是当前工单的。`startIndex` 指向当前图。

**这可能不符合预期**（用户可能期望只看当前工单的图）。当前实现是为了"跨工单翻页"，属于设计选择。

### 16. `_renderPickerContent` 里附件图片 `img.loading = 'lazy'`

浏览器支持不一，老浏览器会忽略。**大订单时**（几十张图）首屏性能可能受影响。

### 17. `percentLabelsPlugin` 的 4% 阈值

小于 4% 的扇区不显示百分比文字。**小项多时**（如 15 个 FAQ），大部分项看不到百分比。用户可以点扇区在 tooltip 里看。

### 18. `_renderTabBar` 里的 `count` 每次重算

`_countByTab(true)` 和 `_countByTab(false)` **每次重画 tab 都算一次**。大数据量时是性能开销。

**优化方向**：缓存到 `_stats` 里。

### 19. `destroy()` 里的 `_closeImageViewer` 是空操作

因为 `_showImageViewer` 委托给了 `app.showImageViewer`，模块的 `_viewerKeyHandler` 从未被赋值。**不影响功能**，但代码冗余。

### 20. `_showPickerFaqModal` 手写弹窗的样式内联

```js
box.style.cssText = 'background:#fff;border-radius:12px;...';
```

**样式硬编码在 JS 里**，深色模式下会显示白底。**如果 Core 将来支持深色模式更彻底**，需要重构。

### 21. `barValuePlugin` 的 `ctx.fillStyle = color`

用 `chart.data.datasets[0].backgroundColor` 作为文字颜色。**如果背景色是渐变对象**（非字符串），会失效。

### 22. `_renderCategoryBarChart` 的 `maxValue * 1.15`

硬编码 15% 留白。**长标签会溢出**（右侧没预留足够空间）。当前 `layout.padding.right = 50` 配合。

### 23. `_showReverseModal` 的明细列表最多 1000 条

超出显示提示。**但用户无法"加载更多"**，只能看到前 1000 条。

### 24. `WO_TEXT.styles` 里 `@media (max-width: 900px)` 隐藏 slim

```css
.wo-pickers-col .wo-col-slim,
.wo-main .wo-col-slim { display: none !important; }
```

**移动端无法看到 A/B 视图**。因为移动端的三栏是竖排的，A/B 模式没意义。

### 25. `_parseRows` 每次上传都重算

**没有缓存**。同一文件上传两次会重解析。**当前无防抖**，但上传是用户主动行为，影响小。

### 26. `WO_TEXT.helpDescription` 不含 `{wiki}`

帮助弹窗**不会**替换 wiki 链接。**如果需要**，在 `helpDescription` 里加 `{wiki:xxx}`。

### 27. `_renderPickerList` 用 `onclick` 属性赋值

```js
listEl.onclick = (e) => { ... };
```

**每次重渲染会覆盖旧监听**，不会累积。**但**：`addEventListener` 会累积，所以这里用 `onclick` 是对的。

### 28. `_renderPickerContent` 用 `addEventListener` 绑 scroll

```js
mainBodyEl.addEventListener('scroll', this._scrollHandler, { passive: true });
```

**每次渲染都绑**，但因为先 `removeEventListener` 旧的，所以不会累积。

### 29. `_showReverseModal` 的 `data-faq` 递归

```js
box.querySelectorAll('.wo-stat-row-clickable[data-faq]').forEach(el => {
    el.addEventListener('click', () => {
        close();
        this._showReverseModal('faq', el.dataset.faq);
    });
});
```

**先 close 旧的再开新的**，避免堆叠。但 `close()` 里有 `document.removeEventListener('keydown', keyHandler)`，**旧 keyHandler 被移除后，新弹窗的 keyHandler 是新的**。

**注意**：如果快速连点，可能在 close 前就触发了新的 `_showReverseModal`，导致旧 overlay 残留。当前无防护。

### 30. `_renderAll` 的智能 tab 选择只在首次上传生效

```js
this._currentTab = (stationCount === 0 && nonStationCount > 0) ? 'nonStation' : 'station';
```

**只在上传时判断**。用户手动切过 tab 后，重新上传会重置。**符合预期**。

---

## 一页速查

```
入口：  modules.js 清单
id：    workorderparser
数据：  _pickers (Map<人, Map<订单, 工单>>)
依赖：  chart 库（统计 tab）

核心流程：
  上传 → _parseRows → _renderAll
  切 tab → _renderTabBar → _renderPickerList → _renderPickerContent
  滚动 → _onMainScroll → _updateActiveOutline → _setActive
  统计 → _buildWorkOrderStats → _renderStatsArea
  钻取 → _showPickerFaqModal / _showReverseModal

数据层次：
  picker → order → workOrder → row
  人       订单     工单        行（商品）

关键字段：
  isStation        该行是否站责（终判优先，无终判用初判）
  category         fulfillment / product
  responsibleParts 初判/终判/原始责任方，每段带 isStation
  faqName          判责 FAQ
  attachments      附件 URL 数组
  workOrderId      '__none__' 表示无工单号

三栏布局：
  .wo-columns 的 CSS 变量 --wo-slim / --wo-order
  state-a → main 收窄
  state-b → picker 收窄，order 固定，main 展开
  state-c → 默认

统计计数：
  单位 = 工单（去重）
  明细 = 行（展开）

依赖 Core：
  readExcelTable
  showLoading / hideLoading
  showMessage
  showModal / confirm / choose
  showImageViewer
  injectStyle
  getIcon
  loadLibrary('chart')
  buildUrl（订单链接）
  escapeHtml
  _log

自带常量：
  COLOR_F / COLOR_P
  PALETTE
  percentLabelsPlugin
  barValuePlugin
```

---

@license Unlicense