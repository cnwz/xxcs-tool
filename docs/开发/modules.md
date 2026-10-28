# modules.js 二次开发文档

> 对应文件：`src/js/modules.js`
> 作用：**模块清单**。Core 靠它知道"有哪些模块可以加载"
> 阅读前提：已读 Core.js 文档（模块系统、`_loadManifest`、`_collectModuleItems`、`_loadModuleClass`）

---

## 定位

`modules.js` 是**一份声明式清单**。它做三件事：

1. **列出所有可选模块**（文件、标题、图标、简介）
2. **告诉 Core 模块从哪加载**（`basePath`）
3. **给 tab 栏、帮助弹窗、"其他功能"弹窗提供元数据**

它**不实现模块**，也不做加载。加载是 Core 的事。

**两个来源**：

- **内联模块**（`index.html` 里 push 到 `app.inlineModules`）：**不进清单**
- **清单模块**（本文件里列出）：Core 按需加载 `js/module/XxxModule.js`

同一个模块不能两处都有。当前 `MultiQRCodeModule` 是内联的，所以**不在清单里**。

---

## 文件结构

`src/js/modules.js` 全文（结构）：

```js
/**
 * @description 模块清单：Core 按此清单加载可选模块
 * @author ls_wuzhen20
 * @since 2026-06-30
 * @lastupdate 2026-10-03
 * @version 1.0.0
 * @license Unlicense
 */

window.__MODULES__ = {
    basePath: 'js/module/',
    list: [
        { file: 'XxxModule.js', title: '...', icon: '...', intro: '...' },
        { file: 'YyyModule.js', title: '...', icon: '...', intro: '...' },
        // ...
    ]
};
```

**唯一作用**：给 `window.__MODULES__` 赋值。Core 在 `_loadManifest` 里读这个全局。

**赋值后立刻被 Core 清空**：`this.manifest = window.__MODULES__; window.__MODULES__ = null;`，所以其他代码**不应**依赖这个全局。

---

## 字段说明

### 顶层字段

| 字段         | 类型              | 默认             | 说明                                           |
| ------------ | ----------------- | ---------------- | ---------------------------------------------- |
| `basePath` | `string`        | `'js/module/'` | 模块文件的目录前缀。**必须带尾斜杠**     |
| `list`     | `Array<Object>` | —               | 模块列表。**必须非空**，否则清单加载失败 |

**`basePath` 的拼接**（Core `_loadModuleClass`）：

```js
const basePath = this.manifest.basePath || 'js/module/';
const logicalPath = `${basePath}${item.file}`;    // 'js/module/XxxModule.js'
```

**如果不写 `basePath`**：默认 `'js/module/'`。**通常不用写**。

**如果需要自定义目录**（比如把模块放到 `js/plugins/`）：

```js
window.__MODULES__ = {
    basePath: 'js/plugins/',
    list: [ ... ]
};
```

### `list` 项字段

| 字段      | 类型       | 必填         | 说明                                                       |
| --------- | ---------- | ------------ | ---------------------------------------------------------- |
| `file`  | `string` | **是** | 模块文件名，如`'XxxModule.js'`。**必须带 `.js`** |
| `title` | `string` | 建议         | tab 显示名。缺省时用 id                                    |
| `icon`  | `string` | 建议         | Bootstrap Icons 名。缺省时用`'circle'`                   |
| `intro` | `string` | 建议         | "其他功能"弹窗里的简介。缺省时空                           |

**`file` 的规则**：

- 只能有 `.js` 一个后缀（`XxxModule.js`，不能 `XxxModule.min.js`）
- **文件名（去 `.js`）必须等于类名**（`XxxModule.js` → `window.XxxModule`）
- Core 靠这个推导 `className`：
  ```js
  const className = item.file.replace(/\.js$/, '');   // 'XxxModule'
  // 检查：typeof window['XxxModule'] === 'function'
  ```

**`icon` 的取值**：Bootstrap Icons 图标名。`Core.getIcon(name)` 从 `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/${name}.svg` 拉。常用：

```
boxes, printer, qr-code, qr-code-scan, journal-text,
list-ul, upc-scan, arrow-right-circle, lightbulb, box
```

**`title` 和 `intro` 会被 HTML 转义吗**：

- `title` 在 `_renderTabs` 里用 `textContent` 赋值 → **不转义，安全**
- `intro` 在 `showAddModuleModal` 里拼 HTML → **未转义**。**不要写含 `<` 的内容**

---

## 完整示例

假设你有 8 个模块（Core 会加载其中的），对应的清单：

```js
window.__MODULES__ = {
    basePath: 'js/module/',
    list: [
        { file: 'BarcodeToMapModule.js',   title: '条码转键值',   icon: 'upc-scan',           intro: '将条码/商品对应表转为商品库数组，支持Excel上传。' },
        { file: 'LabelPrintModule.js',     title: '标签打印',     icon: 'printer',            intro: '上传Excel生成二维码标签和打印。' },
        { file: 'OptimizationModule.js',   title: '货架库位增减', icon: 'boxes',              intro: '上传芥末导出的货架数据，批量优化库位规格与数量。' },
        { file: 'PickingRouteModule.js',   title: '分拣动线计算', icon: 'arrow-right-circle', intro: '根据货架属性自动计算分拣优先级，生成库位动线。' },
        { file: 'QRCodeModule.js',         title: '地堆二维码生成', icon: 'qr-code-scan',      intro: '生成地堆库位二维码，支持自定义 LOGO 和文字。' },
        { file: 'QRPrintModule.js',        title: '二维码打印',   icon: 'printer',            intro: '生成二维码，支持粘贴文本或上传 Excel，导出 PDF 或图片。' },
        { file: 'SortingModule.js',        title: '整理动线',     icon: 'list-ul',            intro: '上传包含分拣位的货架数据，按货架整理分拣顺序。' },
        { file: 'WorkOrderParserModule.js',title: '工单解析',     icon: 'journal-text',       intro: '按分拣员分组浏览工单详情，支持站责筛选、统计图表与反向钻取。' },
    ]
};
```

**`MultiQRCodeModule` 不在里面**——它是内联的，`index.html` 里直接 push：

```js
const app = new Core();
app.inlineModules.push(MultiQRCodeModule);
app.init();
```

**如果两处都有**（内联 + 清单）：`_collectModuleItems` 会**优先用清单的元数据**，但不会重复列。所以不会报错，但**没必要**。

---

## Core 如何读这个文件

理解清单的用法，关键是理解 Core 的三个方法。

### 1. `_loadManifest()`

**时机**：`_backgroundInit` 里，握手之后。

**逻辑**：

```js
window.__MODULES__ = null;                            // 先清空
const ok = await this._loadWithFallback(
    'js/modules.js',
    () => !!(window.__MODULES__ && window.__MODULES__.list)
);
if (ok) {
    this.manifest = window.__MODULES__;               // 读全局
    window.__MODULES__ = null;                        // 立刻清空
    this._itemsCache = null;
    return;
}
this.manifest = null;                                 // 失败
this.showMessage('功能列表加载失败，请检查网络后刷新', 'warning');
```

**关键点**：

- **`checkFn` 检查 `list` 存在**。所以清单没设 `list` 或 `list` 空数组时会**加载失败**
- **加载成功后清空全局**。`window.__MODULES__` 之后就是 `null`
- **加载失败不阻断 Core**，只是清单模块全没了

**`_loadWithFallback` 的候选路径**（`_resolvePaths`）：

- local 模式：`['js/modules.js', '<CDN>/main/src/js/modules.js']`（CDN 兜底看握手结果）
- cloud 模式：`['<CDN>/main/src/js/modules.js']`

所以 `modules.js` **也可以从 CDN 拉**。

### 2. `_collectModuleItems()`

**时机**：`_renderTabs` / `showAddModuleModal`。**有缓存 `_itemsCache`**。

**逻辑**：

```js
// A. 先遍历已注册的模块类（moduleClasses）
for (const id of Object.keys(this.moduleClasses)) {
    const fromManifest = this.manifest?.list?.find(m => this._idFromFile(m.file) === id);
    if (fromManifest) {
        items.push(fromManifest);       // 清单里有 → 用清单元数据
    } else {
        items.push({                     // 清单里没有 → 用默认元数据
            file: `${Cls.name}.js`,
            title: id,
            icon: 'circle',
            intro: '',
        });
    }
}

// B. 再遍历清单里剩下的（尚未注册的）
if (this.manifest?.list) {
    for (const m of this.manifest.list) {
        const id = this._idFromFile(m.file);
        if (seen.has(id)) continue;      // 已收录，跳过
        items.push(m);
    }
}
```

**关键点**：

- **去重靠 `seen` Set**：内联模块和清单里同一个 id 不会重复
- **清单的元数据优先**：即使模块是通过内联注册的，只要清单里有同 id 项，就用清单的 `title`/`icon`/`intro`
- **结果缓存**：`_itemsCache`，`_registerInlineModules` 和 `_loadModuleClass` 会清缓存

### 3. `_loadModuleClass(id)`

**时机**：`openModule(id)` 时，模块类未加载。

**逻辑**：

```js
const item = this.manifest.list.find(m => this._idFromFile(m.file) === id);
if (!item) return null;                              // 清单里没有

const className = item.file.replace(/\.js$/, '');    // 'XxxModule'
const basePath = this.manifest.basePath || 'js/module/';

const ok = await this._loadWithFallback(
    `${basePath}${item.file}`,                       // 'js/module/XxxModule.js'
    () => typeof window[className] === 'function'     // 加载后验证类名
);

if (ok) {
    this.moduleClasses[id] = window[className];      // 存
}
```

**关键点**：

- **`basePath` 为空时用默认 `'js/module/'`**
- **验证靠 `typeof window[className] === 'function'`**。所以：
  - 模块必须 `window.XxxModule = XxxModule`（末尾要有）
  - 类名必须等于文件名去掉 `.js`
- **`_loadWithFallback` 会走 CDN 兜底**（local 模式下握手成功时）

---

## 常见操作

### 新增一个模块

**两步**：

1. **建文件**：`src/js/module/XxxModule.js`

   ```js
   class XxxModule { constructor(app) { ... } renderPanel(panel) { ... } }
   window.XxxModule = XxxModule;
   ```
2. **加清单**：

   ```js
   { file: 'XxxModule.js', title: 'XXX', icon: 'box', intro: '...' }
   ```

**完成**。用户打开工具后，点"其他功能"就能看到新模块。

### 删除一个模块

**删清单一行**即可。文件不用删（留作备用）。

**注意**：如果该模块**已被用户打开**（`loadedIds` 里有），tab 不会自动消失。用户刷新页面才会生效。

### 改模块标题 / 图标 / 简介

**只改清单**。`title` / `icon` / `intro` 都在清单里，模块文件里不用改。

**注意**：模块文件里的 `this.title` 用于**帮助弹窗的标题**和 **wiki 链接生成**，与清单的 `title` 是**两个东西**。

| 位置                 | 用途                                                  |
| -------------------- | ----------------------------------------------------- |
| 清单的`title`      | tab 名、"其他功能"弹窗里的名字                        |
| 模块的`this.title` | 帮助弹窗标题、`{wiki}` 链接的 `使用/{title}` 部分 |

**建议**：保持一致，避免混乱。

### 改模块文件目录

```js
window.__MODULES__ = {
    basePath: 'js/plugins/',     // 改成新目录
    list: [ ... ]
};
```

**同时**要把 `js/module/XxxModule.js` 移到 `js/plugins/` 下。

**注意**：`发布.js` 里有个 `JS_SUBDIRS` 数组，通常包含 `['lib', 'data']`。**如果 `basePath` 不在这个列表里**，构建流程不会复制对应目录到 `dist/`。**改 `basePath` 是维护者的事，不在本文档范围**。

### 动态生成清单

`modules.js` 是静态文件。Core 加载后清空全局，所以**运行时改清单无效**。

**如果需要动态清单**（比如从服务端拉），需要改 Core 的 `_loadManifest`。

**当前设计**：静态清单 + 静态模块。

### 只保留部分模块

用户从 git 拿到源码后，可能不想加载全部模块。**改清单 `list` 即可**。

**副作用**：`_collectModuleItems` 里遍历 `moduleClasses` 时，如果某个模块已注册（比如内联）但不在清单里，会用**默认元数据**（title=id、icon=circle）。**这通常不是用户想要的**。

**所以更彻底的做法**：同时删掉清单项 + 不在 HTML 里内联该模块。

---

## 与内联模块的关系

**内联模块**是 `index.html` 里 push 进 `app.inlineModules` 的类：

```js
const app = new Core();
app.inlineModules.push(MultiQRCodeModule);      // 内联
app.init();
```

**内联模块不进清单**。它们的特点：

|                                  | 内联模块                | 清单模块                   |
| -------------------------------- | ----------------------- | -------------------------- |
| 加载时机                         | `init()` 时立刻       | `openModule()` 时按需    |
| 来源                             | HTML 里的`<script>`   | `js/module/XxxModule.js` |
| 是否在清单                       | 否                      | 是                         |
| 是否在 tab 里                    | 是（首画就有）          | 是（加载后才有）           |
| `_collectModuleItems` 的元数据 | 默认或清单（如果同 id） | 清单                       |

**为什么有这个区分**：

- **内联**：默认模块（如 MultiQRCode），必须**打开即用**，不能等 CDN
- **清单**：可选模块，用户点"其他功能"时才加载，**节省首屏**

**如果两个地方都有同一个 id**（比如 MultiQRCode 既内联又在清单里）：

- 不报错
- `_collectModuleItems` 会用清单的元数据
- 但 `MultiQRCodeModule` 已经通过 `inlineModules` 注册到 `moduleClasses`，**不会**再走 `_loadModuleClass`

**结论**：**不要把默认模块同时放在两处**。设计上应该二选一。

---

## 坑位清单

### 1. 文件名的 `Module` 后缀不能省

Core 通过 `_idFromFile` 推导 id：

```js
_idFromFile(file) {
    return String(file).replace(/\.js$/i, '').replace(/Module$/i, '').toLowerCase();
}
```

`'XxxModule.js'` → `'xxx'`。**如果文件名没 `Module` 后缀**，`'Xxx.js'` → `'xxx'`（去 `.js` 后是 `'Xxx'`，`Xxx` 不以 `Module` 结尾，所以结果是 `'xx'`？）

等等，再看：

- `'XxxModule.js'` → 去 `.js` → `'XxxModule'` → 去 `Module` → `'Xxx'` → 小写 → `'xxx'` ✓
- `'Xxx.js'` → 去 `.js` → `'Xxx'` → 不以 `Module` 结尾，**不去** → 小写 → `'xxx'`

**两种文件名都得到 `'xxx'`**。但类名检查是 `typeof window[className] === 'function'`，`className = file.replace(/\.js$/, '')`：

- `'XxxModule.js'` → `'XxxModule'` → 检查 `window.XxxModule`
- `'Xxx.js'` → `'Xxx'` → 检查 `window.Xxx`

**两个都能工作**，只要类名匹配。**但 `_idFromClassName` 只认 `Module` 后缀**：

```js
_idFromClassName('XxxModule')  // → 'xxx'
_idFromClassName('Xxx')        // → 'xx'  ← 与文件推导的 id 不一致！
```

**所以内联模块如果类名不带 `Module` 后缀**，`_registerInlineModules` 里的 id 会和 `_idFromFile` 推导的 id **不一致**。

**结论**：**文件名和类名都带 `Module` 后缀**，这是唯一安全的约定。

### 2. 类名必须和文件名一致

```js
const className = item.file.replace(/\.js$/, '');   // 'XxxModule'
// 检查：typeof window[className] === 'function'
```

**如果文件里写的是 `window.YyyModule = YyyModule`**（不同名），检查失败，模块加载失败。

**不要**改文件名而不改类名，或反之。

### 3. `list` 空数组会导致清单加载失败

```js
const ok = await this._loadWithFallback(
    'js/modules.js',
    () => !!(window.__MODULES__ && window.__MODULES__.list)
);
```

`window.__MODULES__.list = []` → `!![]` 是 `true`（空数组是 truthy）→ **检查通过**。

所以**空数组不会导致失败**。但 `_collectModuleItems` 里就没有清单项了，只有内联模块。

**结论**：`list: []` 是合法的（虽然没用）。

### 4. `basePath` 必须带尾斜杠

```js
const logicalPath = `${basePath}${item.file}`;   // 'js/module/' + 'XxxModule.js' = 'js/module/XxxModule.js'
```

**如果 `basePath` 是 `'js/module'`**（无尾斜杠）：

```
'js/module' + 'XxxModule.js' = 'js/moduleXxxModule.js'   ← 错了
```

**结论**：**`basePath` 必须带尾斜杠**。默认值 `'js/module/'` 是对的。

### 5. 文件名大小写敏感

Linux / macOS 默认区分大小写，Windows 不区分。

**如果 `file: 'XxxModule.js'` 但实际文件是 `Xxxmodule.js`**：

- Linux/macOS：加载失败（404）
- Windows：加载成功

**建议**：**大小写完全一致**。`Module` 大写 M。

### 6. 清单里的 `file` 和 `js/module/` 目录必须真实存在

`_loadWithFallback` 会真的去加载 `${basePath}${file}`。如果文件不存在：

- 本地 404 → 尝试 CDN
- CDN 也 404 → 返回 `false`
- `_loadModuleClass` 返回 `null`
- `openModule` 里显示"模块加载失败" + `showMessage`

**用户视角**：点"其他功能"选了模块，tab 出现但内容显示"模块加载失败"。

**修复**：清单项删掉，或把文件放对位置。

### 7. `title` / `intro` 不转义

`_renderTabs` 里 `title` 用 `textContent`，**安全**。

`showAddModuleModal` 里 `intro` **直接拼 HTML**：

```js
content += `<div class="module-item" data-id="${id}">...<strong>${m.title || id}</strong> — ${m.intro || ''}</div>`;
```

**如果 `intro` 含 `<` 或 `&`**：会破坏 HTML 或注入。

**当前**：所有 intro 都是纯文本，无风险。

**建议**：**不要写 HTML 到 intro**。要富文本，改 `showAddModuleModal`。

### 8. 清单项顺序 = "其他功能"弹窗的顺序

`_collectModuleItems` 保持 `list` 数组的顺序。所以**改清单顺序 = 改弹窗顺序**。

**tab 栏顺序**：由 `loadedIds` 决定，**与清单无关**。用户打开的模块按打开顺序排在 tab 里。

### 9. 清单不影响"加载哪些模块"

`_loadModuleClass(id)` 只在用户**主动打开**时才调用。清单里的模块**不会自动加载**。

**所以清单长一点没关系**，只是"其他功能"弹窗里的选项多几个。

**首屏性能**只受**内联模块**影响。

### 10. 清单的 `_itemsCache`

`_collectModuleItems` 缓存结果到 `_itemsCache`。清缓存的时机：

- `_loadManifest` 成功后
- `_registerInlineModules` 里
- `_loadModuleClass` 成功后

**如果运行时改了清单**（`this.manifest.list.push(...)`）**不清缓存**，`_collectModuleItems` 还是旧的。

**用户手动改清单**：不可能，因为清单在静态文件里。

**开发者调试**：改 `this._itemsCache = null` 强制刷新。

### 11. `file` 不能含路径

`file: 'subdir/XxxModule.js'` 会拼成 `js/module/subdir/XxxModule.js`。

**技术上能工作**（`_loadScript` 不限制路径）。但 `_idFromFile` 用 `.replace(/\.js$/i, '')` 去后缀，**不会**去掉子目录：

```js
_idFromFile('subdir/XxxModule.js')  // → 'subdir/xxxmodule'？
```

不对，再算一遍：

```
'subdir/XxxModule.js'
  .replace(/\.js$/i, '')  → 'subdir/XxxModule'
  .replace(/Module$/i, '') → 'subdir/Xxx'
  .toLowerCase()           → 'subdir/xxx'
```

id 里带斜杠。**能用但很怪**。

**建议**：**所有模块放 `js/module/` 平级**，`file` 只写文件名。

### 12. 帮助弹窗里的模块列表

`bindCommonEvents` 里点帮助按钮：

```js
const items = this._collectModuleItems();
for (const m of items) {
    const id = this._idFromFile(m.file);
    intro += `<li><b>${m.title || id}</b>：${m.intro || ''}</li>`;
}
```

**帮助弹窗列出所有清单项**（不管有没有打开过）。所以**清单里的模块都会出现在帮助里**。

**如果某个模块临时不想用**：从清单删掉，帮助里也看不到。

### 13. 清单里的模块可以"打开即用"

用户点"其他功能"→ 选模块 → `openModule(id)` → `_loadModuleClass` → 加载文件 → 渲染。

**首次打开**有网络/IO 延时（本地文件也是异步 `<script>`）。

**体验**：tab 会先出现，内容先显示"加载中…"，几毫秒后替换成真实内容。

### 14. 内联模块不能"按需延迟"

内联模块在 `init()` 时注册。**无法让内联模块延迟到用户点击才加载**。

**如果某个大模块想延迟加载**：放清单，别内联。

### 15. `window.__MODULES__` 会被清空

```js
this.manifest = window.__MODULES__;
window.__MODULES__ = null;           // 清空
```

**模块文件里不要读 `window.__MODULES__`**。要读用 `this.app.manifest`。

**但**：`manifest` 在 `_backgroundInit` 完成前是 `null`。模块在 `renderPanel` 里访问 `this.app.manifest` 要判空。

### 16. 清单项的 `id` 推导可能撞车

`_idFromFile('XxxModule.js')` 和 `_idFromFile('Xxx.js')` 都得到 `'xxx'`。

**如果同时有两个这样的文件**：`_collectModuleItems` 里的 `seen` 去重会**丢掉后一个**。

**建议**：所有模块名唯一，且**都带 `Module` 后缀**。

### 17. `_loadWithFallback` 在 cloud 模式不试本地

cloud 模式下 `_resolvePaths` 只返回 CDN 路径。**清单文件必须能从 CDN 拉到**。

**本地调试**用 `debug.html`（覆盖 `_handshake` 跳过 CDN），走本地。

### 18. 清单不写 `basePath` 用默认值

```js
const basePath = this.manifest.basePath || 'js/module/';
```

**`undefined` / `''` / `null` 都会 fallback**。所以：

- 不写 `basePath`：用 `'js/module/'`
- 写 `basePath: ''`：也用 `'js/module/'`（因为空串 falsy）

**如果真想用空 basePath**（模块在根目录）：做不到，会被 fallback。

### 19. 清单的加载超时

`_loadWithFallback` 用 `cdnTimeout`（15 秒）或 `localTimeout`（3 秒）。

**本地模式**：先试 `js/modules.js`，3 秒超时。超时后如果 `cdnAlive` 再试 CDN。

**如果本地清单加载慢**：用户会看到 3 秒的"其他功能加载中"状态。

**正常情况**：本地文件几乎瞬间加载，无感。

### 20. 清单不影响 `Core.defaultModuleId`

```js
this.defaultModuleId = 'multiqrcode';   // 在 Core 构造函数里
```

`init()` 里：

```js
if (this._hasModule(this.defaultModuleId)) {
    await this.openModule(this.defaultModuleId);
}
```

`_hasModule('multiqrcode')` 检查：

```js
if (this.moduleClasses['multiqrcode']) return true;                // 内联的
if (this.manifest?.list?.some(...)) return true;                    // 清单里的
return false;
```

**MultiQRCode 是内联的**，所以 `defaultModuleId` 生效。

**如果默认模块是清单里的**：

```js
this.defaultModuleId = 'optimization';
```

`init()` 里 `_backgroundInit` 还没完成（`manifest` 还是 null），`_hasModule` 会返回 false，**不会打开**。

**等等**——再看 `init()` 的顺序：

```js
async init() {
    // ...
    this._registerInlineModules();       // 注册内联
    this._renderTabs();
    // ...
    if (this._hasModule(this.defaultModuleId)) {
        await this.openModule(this.defaultModuleId);
    }
    this._backgroundInit();               // 后台开始
}
```

`_hasModule` 在 `_backgroundInit` **之前**调，`manifest` 是 `null`，所以**只检查内联模块**。

**结论**：**`defaultModuleId` 必须是内联模块**。清单里的模块**不能**作为默认。

**如果设成清单模块**：`_hasModule` 返回 false，**不会打开任何模块**。用户看到空页面。

**修复**：把想当默认的模块内联，或者改 Core 让 `init` 等 `_backgroundInit`（会变慢）。

---

## 一页速查

```
文件：src/js/modules.js
作用：声明模块清单
形态：静态 JS 文件，构建时 terser 压缩

结构：
  window.__MODULES__ = {
      basePath: 'js/module/',                     // 可选，默认这个
      list: [
          { file: 'XxxModule.js', title: '...', icon: '...', intro: '...' },
          // ...
      ]
  };

字段：
  basePath    必须带尾斜杠。默认 'js/module/'
  list        模块数组
  file        必填。文件名必须带 .js，且类名 = 去 .js 后
  title       tab 名。"其他功能"弹窗里的名字
  icon        Bootstrap Icons 名
  intro       简介。"其他功能"弹窗里显示

关键规则：
  - 文件名必须等于类名（去 .js）
  - 类名必须带 Module 后缀（_idFromClassName 只认这个）
  - 模块文件末尾必须有 window.XxxModule = XxxModule
  - 内联模块不进清单
  - defaultModuleId 必须是内联模块
  - basePath 必须带尾斜杠
  - 大小写敏感

Core 读取时机：
  _loadManifest   → init 后 _backgroundInit 里（握手之后）
  _collectModuleItems → _renderTabs / showAddModuleModal
  _loadModuleClass    → openModule 时按需

清单文件的加载路径：
  local 模式：'js/modules.js'，失败后 CDN 兜底（看握手）
  cloud 模式：'<CDN>/main/src/js/modules.js'

清单项的 id 推导：
  _idFromFile('XxxModule.js')  → 'xxx'

清单项的数据流：
  清单 → _loadManifest → this.manifest
         → _collectModuleItems → tab / "其他功能"弹窗 / 帮助列表
         → _loadModuleClass → 加载 js/module/XxxModule.js

新增模块两步：
  1. 建 src/js/module/XxxModule.js（含 window.XxxModule = XxxModule）
  2. 清单加 { file: 'XxxModule.js', title, icon, intro }

删除模块一步：
  清单删一行

常见坑：
  文件名/类名不一致 → 加载失败
  漏 window.XxxModule = XxxModule → 加载失败
  basePath 漏尾斜杠 → 路径拼接错
  清单里的模块做 defaultModuleId → 不打开
  运行时改清单 → _itemsCache 不刷新
  intro 含 < → 弹窗 HTML 破坏
```

---

@license Unlicense
