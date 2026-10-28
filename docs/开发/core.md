# Core.js 二次开发文档

> 版本对应：Core v1.0.0 / 2026-09-26
> 覆盖 `Core` 类全部方法

---

## 一、定位与边界

**Core 负责**：页面骨架、模块加载、第三方库加载、公共 UI、公共工具、主题切换。
**Core 不负责**：任何业务逻辑、数据持久化、向服务器发送数据。

加业务 = 加模块。往 Core 里塞业务是反模式。

---

## 二、启动时序

```
index.html / cloud.html / debug.html
  │
  └─ <script src="Core.js">            ← 定义 window.Core
  └─ <script>
        const app = new Core();        ← 构造函数（不触达 DOM）
        app.inlineModules.push(...);   ← 注册内联模块类
        app.init();                    ← 启动
        window.__booted = true;
     </script>
```

`init()` 内部顺序：

```
init()
  ├─ _log('Core 启动', version, mode)
  ├─ document.title = CORE_TEXT.appTitle
  ├─ _buildSkeleton()                  建 .container / #moduleTabs / #commonModal
  ├─ injectGlobalStyles()              注入 CORE_CSS
  ├─ _registerInlineModules()          注册 inlineModules
  ├─ _renderTabs()                     首画 tab（可能只有内联模块）
  ├─ document.body.classList.remove('dark-mode')
  ├─ bindCommonEvents()                帮助/复制/modal 事件委托
  ├─ _updateHelpBadge()                红点
  ├─ addThemeToggleIcon()              深浅色图标
  ├─ if (_businessUrlPlaceholder)      延时 500ms 提示配置域名
  ├─ 更新副标题（版本链接）
  ├─ if (_hasModule(defaultModuleId))
  │     await openModule(defaultModuleId)
  └─ _backgroundInit()                 ← 不 await
```

`_backgroundInit()` 内部顺序：

```
_backgroundInit()
  ├─ await _handshake()                CDN 探活
  ├─ if (cdnAlive) _checkUpdate()      比对 version.js（不 await，.catch 吞错）
  ├─ await _loadManifest()             加载 js/modules.js
  ├─ _renderTabs()                     重画（这次含清单模块）
  ├─ backgroundInitDone = true
  └─ if (_pendingAddModal)             补弹"其他功能"弹窗
```

**关键**：`_backgroundInit()` 不 await，所以页面能在握手/清单完成前显示默认模块。

---

## 三、运行模式与路径

### 三种模式

| | local | cloud | debug |
|---|---|---|---|
| 入口 | `index.html` | `cloud.html` | `debug.html` |
| `fromCDN` | false | true | false |
| Core 来源 | 内联 | CDN | 本地 |
| 模块 | 本地优先，CDN 兜底 | 只 CDN | 本地 |
| 库 | 本地 `js/lib/` 优先，CDN 兜底 | 只 CDN | 本地 |
| 握手 | 实际探活 | 直接判定可用 | 覆写为跳过 |
| 更新检查 | 有 | 有 | 跳过 |

`mode` 判定：`script.dataset.mode` 优先，否则看 `script.src` 是否含 `cdn.jsdelivr.net`。

### 三个基址（构造函数里）

```js
this.repo = 'cnwz/xxcs-tool';
this.cdnBase = `https://cdn.jsdelivr.net/gh/${repo}@`;       // 尾带 @
this.wikiBase = `https://gitee.com/${repo}/wikis/`;
this.releaseBase = `https://gitee.com/${repo}/releases/`;
```

### 业务域名

```html
<script>window.__BUSINESS_URL__ = 'https://1234.com/5678.html';</script>
```

`_parseOrigin` 只取 origin，path 丢弃。模块自己拼业务路径。

---

## 四、构造函数

### `constructor()`

无参数。构造时**不触达 DOM**（除 `document.currentScript` 读 script 标签），所有 DOM 操作在 `init()` 之后。

**初始化内容**：

| 字段 | 说明 |
|---|---|
| `version` / `lastupdate` / `releaseDate` / `releaseBatch` | 版本元信息，发布脚本替换前三个 |
| `mode` / `fromCDN` | 运行模式 |
| `repo` / `cdnBase` / `wikiBase` / `releaseBase` | 路径基址 |
| `businessUrl` / `domain` / `_businessUrlPlaceholder` | 业务网址与解析结果 |
| `localTimeout = 3000` / `cdnTimeout = 15000` | 加载超时 |
| `cdnAlive` / `handshakeDone` / `backgroundInitDone` | 状态位 |
| `_pendingAddModal` | 未就绪时暂存"其他功能"弹窗请求 |
| `_hasUpdate` / `_latestBatch` / `_latestDate` / `_latestChangelog` | 更新状态 |
| `manifest` | 模块清单（js/modules.js） |
| `modules` | 已实例化的模块：`{id: instance}` |
| `moduleClasses` | 已注册的模块类：`{id: Class}` |
| `_moduleClassPromises` | 模块类加载中的 Promise 缓存 |
| `_libPromises` | 库加载中的 Promise 缓存 |
| `_itemsCache` | `_collectModuleItems()` 的缓存 |
| `_modalOnClose` | 当前 modal 的关闭回调 |
| `_imgViewerKeyHandler` | 图片查看器键盘监听 |
| `loadedIds` | 已打开的模块 id 列表 |
| `currentModuleId` | 当前激活模块 |
| `defaultModuleId = 'multiqrcode'` | 默认模块 |
| `inlineModules = []` | HTML 推送的内联模块类 |
| `shared` / `data` | 模块间共享数据 / 当前会话数据 |
| `darkModeEnabled = false` | 深浅色状态 |
| `validations` | 部门/仓库正则 |
| `limits.maxUploadRows = 50000` | 上传行数上限 |
| `logoImage = ''` | 公共 LOGO |
| `libraries` | 第三方库表 |
| `globalCss = CORE_CSS` | 全局样式 |

最后 `window.app = this`。

**注意**：`this.validations` 和 `this.limits` 是模块读取的公共配置。改这里全局生效。

---

## 五、生命周期方法

### `_backgroundInit()`

异步。后台初始化。内部按序：握手 → 检查更新 → 加载清单 → 重画 tab → 标记 `backgroundInitDone` → 补弹 pending modal。

**调用点**：`init()` 末尾，**不 await**。

**副作用**：`backgroundInitDone = true`，`manifest` 被赋值，tab 重画。

---

### `_buildSkeleton()`

无参数。构建页面骨架。若 `document.querySelector('.container')` 已存在则**直接返回**（防止二次初始化）。

**做了**：
1. 移除 `#boot-loading`（HTML 里的占位）
2. `insertAdjacentHTML` 注入：`#messageArea`、`.container`（含 `<h1>` + `#moduleTabs`）、`#commonModal`

**不**注入 CSS（那是 `injectGlobalStyles` 的事）。

---

### `_checkUpdate()`

异步。从 CDN 拉 `version.js`，与 `releaseBatch` 对比。

**读取**：`window.__LATEST__ = { batch, date, changelog }`
**行为**：不一致则置 `_hasUpdate = true`，缓存 `_latestBatch` / `_latestDate` / `_latestChangelog`，调 `_updateHelpBadge()` 加红点。
**副作用**：拉完后把 `window.__LATEST__` 清空。

**调用点**：`_backgroundInit()` 里，`if (cdnAlive)` 才调。

---

### `_closeModal()`

无参数。隐藏 `#commonModal`，并触发 `_modalOnClose` 回调（如果存在），之后清空 `_modalOnClose`。

**为什么用这个方法而不是直接 `style.display = 'none'`**：直接隐藏不会触发 `onClose`，导致 `confirm` / `choose` 的 Promise 永远 pending。

**调用点**：`modalCloseBtn` 点击、遮罩点击、`choose`/`confirm` 的按钮点击、模块内部主动关闭。

---

### `_handshake()`

异步。CDN 探活。

**逻辑**：
- `handshakeDone` 已为 true → 返回缓存的 `cdnAlive`
- `fromCDN` → 直接判定可用
- 否则动态插 `<script src="${cdnBase}main/ping.txt">`，`onload` 判可用，`onerror` 或 **2 秒超时**判不可用

**调用点**：`_backgroundInit()`、MultiQRCode 的备用路径。

**副作用**：`cdnAlive` 被赋值。

---

### `_loadManifest()`

异步。加载 `js/modules.js`。

**逻辑**：
1. 清空 `window.__MODULES__`
2. 走 `_loadWithFallback('js/modules.js', () => !!(window.__MODULES__ && window.__MODULES__.list))`
3. 成功 → `this.manifest = window.__MODULES__`，清空 `window.__MODULES__`，清 `_itemsCache`
4. 失败 → `this.manifest = null`，`showMessage` 警告

**清单格式**：
```js
window.__MODULES__ = {
    basePath: 'js/module/',
    list: [
        { file: 'OptimizationModule.js', title: '...', icon: 'boxes', intro: '...' },
    ]
};
```

---

### `_log(...args)`

无参数签名（...args）。**默认空实现**，发布版被 Terser 去掉。

`debug.html` 覆写：
```js
Core.prototype._log = function(...args) { console.log('[Core]', ...args); };
```

**注意**：模块里用 `this.app._log(...)` 打调试日志，发布版不输出。

---

### `init()`

异步。启动入口。见[第二节](#二)的时序。

**返回值**：Promise<void>。
**副作用**：整个页面被构建，默认模块被打开，后台初始化启动。

**调用前必须**：`app.inlineModules.push(...)` 已执行。

---

## 六、加载器方法

### `_loadScript(src, timeout)`

异步。加载单个 `<script>`，返回 `Promise<boolean>`。

**参数**：
- `src`：URL
- `timeout`：毫秒，默认 `cdnTimeout`（15s）

**行为**：
- `onload` → resolve(true)
- `onerror` → resolve(false)，并从 DOM 移除
- 超时 → resolve(false)，并从 DOM 移除

**幂等**：内部 `done` 标志保证只 resolve 一次。

---

### `_loadWithFallback(logicalPath, checkFn)`

异步。按候选路径依次尝试加载，任一成功返回 true。

**参数**：
- `logicalPath`：逻辑路径（如 `'js/module/X.js'`）
- `checkFn`：可选。加载后验证函数，返回 true 才算成功

**行为**：遍历 `_resolvePaths(logicalPath)` 的路径：
- 远程路径用 `cdnTimeout`，本地用 `localTimeout`
- 加载成功且 `checkFn()` 通过 → 返回 true
- 全部失败 → 返回 false

---

### `_resolvePaths(logicalPath)`

同步。返回候选路径数组。

**逻辑**：
- `fromCDN` → 只返回 `[`${cdnBase}main/src/${logicalPath}`]`
- 否则 → `[logicalPath]`，若 `cdnAlive` 则追加 `[`${cdnBase}${releaseBatch}/src/${logicalPath}`]`

**注意**：CDN 路径分两种 —— `main/src/` 和 `${batch}/src/`。前者跟随 main 分支，后者锁定版本。

---

### `loadLibrary(name)`

异步。按需加载第三方库。

**参数**：`name` 是 `this.libraries` 的 key（xlsx / jszip / qrcode / jspdf / docx / chart）。

**行为**：
- 未定义的库 → console.error + 返回 false
- `window[lib.global]` 已存在 → 直接 true（不重复加载）
- 有 `_libPromises[name]` → 复用
- local 模式：先试 `lib.local`（超时 `localTimeout`）
- CDN 可用 / cloud 模式：试 `lib.cdn`（超时 `cdnTimeout`）
- 全部失败 → `delete _libPromises[name]`（允许重试），返回 false

**返回值**：`Promise<boolean>`。

**模块用法**：
```js
const ok = await this.app.loadLibrary('xlsx');
if (!ok) { this.app.showMessage('库加载失败', 'error'); return; }
// window.XLSX 可用
```

---

## 七、模块系统方法

### `_collectModuleItems()`

同步。汇总所有可用模块项（内联 + 清单），带缓存 `_itemsCache`。

**逻辑**：
1. 遍历 `moduleClasses` 里的 id，从清单里找对应项（找到用清单的 title/icon，找不到用默认 `{file: 'XxxModule.js', title: id, icon: 'circle', intro: ''}`）
2. 再遍历清单，补充尚未收录的
3. 结果去重（`seen`）

**用途**：`_renderTabs()` 和 `showAddModuleModal()` 读这个。

**缓存失效点**：`_registerInlineModules()` 和 `_loadModuleClass()` 成功后清 `_itemsCache`。

---

### `_ensurePanel(id)`

同步。确保 `#panel-${id}` 存在，不存在就创建并追加到 `.container`。

**返回**：panel 元素。

**注意**：不清理 panel 内容，只保证元素存在。

---

### `_hasModule(id)`

同步。判断模块是否可用。

**逻辑**：`moduleClasses[id]` 有 或 `manifest.list` 里有对应项。

**用途**：`init()` 里判断默认模块是否存在。

---

### `_idFromClassName(name)`

同步。`'MultiQRCodeModule'` → `'multiqrcode'`。

**规则**：去掉 `Module` 后缀，转小写。

---

### `_idFromFile(file)`

同步。`'MultiQRCodeModule.js'` → `'multiqrcode'`。

**规则**：去掉 `.js` 和 `Module` 后缀，转小写。

---

### `_loadModuleClass(id)`

异步。按需加载模块类。

**逻辑**：
1. `moduleClasses[id]` 存在 → 返回
2. `_moduleClassPromises[id]` 存在 → 复用
3. `manifest` 为空 → 返回 null
4. 从清单找 `file`，构造 `className = file.replace(/\.js$/, '')`
5. `_loadWithFallback(basePath + file, () => typeof window[className] === 'function')`
6. 成功 → 存 `moduleClasses[id]`，清 `_itemsCache`，返回类
7. 失败 → 返回 null

**返回值**：`Promise<Class|null>`。

**注意**：`className` 从文件名推导，所以文件名（去掉 .js）必须等于类名。

---

### `_registerInlineModules()`

同步。把 `this.inlineModules` 里的类注册到 `moduleClasses`。

**逻辑**：
- 遍历 `inlineModules`
- 非 function → 跳过
- `id = _idFromClassName(Cls.name)`
- `moduleClasses[id] = Cls`，清 `_itemsCache`

**调用点**：`init()` 里，`_buildSkeleton()` 之后。

**注意**：`init()` 之后再 push 无效。

---

### `_switchTo(id)`

同步。切换激活模块。

**逻辑**：
1. 若 id 不在 `loadedIds` 里则 push
2. `currentModuleId = id`
3. 所有 `.tab-content` 的 active 类按 `panel-${id}` 设置
4. `_renderTabs()` 重画 tab 栏

**不重新渲染 panel**，只切显示。

---

### `closeModule(id)`

异步。关闭模块。

**逻辑**：
1. `loadedIds.length <= 1` → 提示"至少保留一个功能页"，返回
2. id 不在 loadedIds → 返回
3. `instance.destroy()`（如果有），catch 异常
4. `delete modules[id]`
5. 移除 `#panel-${id}`
6. 从 loadedIds 里删 id
7. `_renderTabs()`
8. 如果关的是当前模块 → `openModule(loadedIds[0])`

**返回值**：Promise<void>。

**注意**：`destroy()` 必须写，否则定时器、document 监听、Chart 实例会泄漏。

---

### `openModule(id)`

异步。打开模块（已加载则切换，未加载则加载后渲染）。

**逻辑**：
1. `currentModuleId === id` → 直接返回
2. `modules[id]` 存在 → `_switchTo(id)` 返回
3. `moduleClasses[id]` 和 `manifest` 都没有且 `backgroundInitDone === false` → 提示"加载中"
4. `_ensurePanel(id)`
5. `moduleClasses[id]` 不存在 → 先塞 `'加载中…'`，`await _loadModuleClass(id)`
   - 期间如果已被其他调用加载完 → `_switchTo(id)` 返回
   - 加载失败 → panel 塞错误提示，`showMessage`，返回
6. `new Cls(this)`，`instance.id = id`，存 `modules[id]`
7. `panel.innerHTML = ''`
8. `instance.renderPanel(panel)`（try/catch，失败则 destroy + 清 panel + 删 modules[id]）
9. `_switchTo(id)`

**返回值**：Promise<void>。

---

## 八、UI 方法

### `_renderTabs()`

同步。渲染 `#moduleTabs`。

**逻辑**：
1. 首次调用时在 `bar` 上绑**事件委托**（`bar._tabsDelegated`），处理 `.tab-close` / `.tab-add` / `.tab[data-module]` 的点击
2. 清空 `bar.innerHTML`
3. 遍历 `loadedIds`，每个从 `_collectModuleItems()` 找对应项，渲染 tab
   - `loadedIds.length > 1` 时显示关闭按钮
4. 追加 `.tab-add`（"其他功能"）
5. 对每个 `loadedIds` 调 `_ensurePanel(id)`

**为什么用事件委托**：每次重画会清 `innerHTML`，直接绑子元素会丢。

---

### `_updateHelpBadge()`

同步。更新 `#globalHelpBtn` 的图标和红点。

**逻辑**：`_hasUpdate` 为 true 时加 `<span class="help-badge">`。

**调用点**：`init()`、`_checkUpdate()`、用户点开帮助（会重置 `_hasUpdate`）。

---

### `choose(title, content, options)`

异步。三选一对话框。

**参数**：
- `title`：标题
- `content`：HTML 字符串或 Node
- `options`：`[{ label, class, value }, ...]`

**返回值**：`Promise<value|null>`。点按钮返回对应 `value`，点 X 或遮罩返回 `null`。

**内部**：`settled` 标志防止重复 resolve；每个按钮点击后 `_closeModal()`；通过 `onClose` 处理主动关闭。

**用法**：
```js
const action = await this.app.choose('冲突', content, [
    { label: '覆盖', class: 'btn-warning', value: 'override' },
    { label: '跳过', class: 'btn-secondary', value: 'skip' },
    { label: '取消', class: 'btn-secondary', value: 'cancel' },
]);
if (action === 'cancel') return;
```

---

### `confirm(title, content, opts)`

异步。确认对话框。

**参数**：
- `opts.okText` / `opts.okClass` / `opts.cancelText`

**返回值**：`Promise<boolean>`。OK → true，Cancel / X / 遮罩 → false。

---

### `emptyState(text)`

同步。返回空状态 HTML 片段：`<div class="empty-state">${escaped}</div>`。

**用途**：列表为空时的占位。

---

### `getHelpButton(moduleId, iconName, label)`

同步。返回帮助按钮 HTML。

**参数**：
- `moduleId`：写到 `data-module`，点击时 Core 会读 `modules[moduleId].helpDescription`
- `iconName`：默认 `'question-circle'`
- `label`：默认 `'帮助'`

**用法**：模块 `renderPanel` 里拼在 `<div class="table-header">` 里。

**点击效果**：读 `module.helpDescription`，替换 `{wiki}` / `{wiki:xxx}`，追加版本行，`showModal`。

---

### `getIcon(name, size, extraClass)`

同步。返回 Bootstrap Icons 的 `<img>` HTML。

**参数**：
- `name`：`'box'` / `'filetype-xlsx'` / `'person'` 等，来自 Bootstrap Icons 名
- `size`：默认 26
- `extraClass`：附加 class

**注意**：`filetype-*` 类名会加 `icon-img-filetype`，深色模式下**不加** invert（因为是彩色图标）。

---

### `injectGlobalStyles()`

同步。注入 `CORE_CSS` 到 `<head>`，id 为 `shelfToolGlobalStyles`。已存在则跳过。

**调用点**：`init()`。

---

### `injectStyle(id, css)`

同步。模块级样式注入，id 为 `${id}-styles`。已存在则跳过。

**模块用法**：
```js
injectStyles() {
    this.app.injectStyle(this.id, XX_TEXT.styles);
}
```

---

### `loadingState(text)`

同步。返回加载中 HTML：`<div class="loading-state">${escaped}</div>`。

---

### `showLoading(id, text)`

同步。在 `#panel-${id}` 上盖遮罩。

**行为**：
- 找不到 panel → 返回
- 已存在 `.module-loading-overlay` → 跳过
- 创建 `.module-loading-overlay` + `.module-loading-text`，追加到 panel

**注意**：遮罩是 absolute 定位，依赖 panel 有 `position: relative`（由 `.tab-content` 保证）。

---

### `hideLoading(id)`

同步。移除 panel 上的遮罩。

**推荐用法**：
```js
this.app.showLoading(this.id, '正在处理…');
try { ... } finally { this.app.hideLoading(this.id); }
```

---

### `uploadSection(opts)`

同步。返回标准上传区 HTML 片段。

**参数**：
- `opts.title`：区块标题，默认 `'上传数据'`
- `opts.moduleId`：传了才显示帮助按钮
- `opts.btnId`：默认 `'uploadBtn'`
- `opts.btnLabel`：默认 `'上传并解析'`
- `opts.resetId`：可选，传了显示重置按钮
- `opts.resetLabel`：可选，默认 `'重置'`

**返回结构**：
```html
<div class="table-header"><h2>...</h2>[帮助按钮]</div>
<div class="toolbar">
    <button id="xxxUploadBtn" class="btn">... 上传并解析</button>
    [重置按钮]
</div>
```

---

### `bindUploadSection(opts)`

同步。绑定上传区事件。

**参数**：
- `opts.btnId`：必填
- `opts.accept`：默认 `'.xls,.xlsx'`
- `opts.onFile`：`(file) => void`，必填
- `opts.resetId` / `opts.onReset`：可选

**行为**：
- 点击上传按钮 → `pickFile({ accept })` → 有文件则 `await onFile(file)`
- 异常 → `showMessage(e.message, 'error')`
- 若配了 reset → 点击调 `onReset()`

**注意**：内部用 `document.getElementById` 而非 panel 域查询，所以 btnId 必须全局唯一。

---

### `printImage(src)`

同步。打印单张图片（A4 全页）。

**实现**：动态创建隐藏 `<iframe>`，写 A4 打印 CSS，插 `<img>`，调 `iframe.contentWindow.print()`，1 秒后移除 iframe。

**限制**：`src` 必须可被 iframe 加载（dataURL / blob URL / 同源图）。

---

### `showAddModuleModal()`

同步。弹"其他功能"对话框。

**逻辑**：
- `backgroundInitDone === false` 且 `manifest` 为空 → 置 `_pendingAddModal = true`，弹"加载中"提示，返回
- 清 `_pendingAddModal`
- 从 `_collectModuleItems()` 里过滤掉 `loadedIds` 已有的
- 全加载过 → "所有功能都已打开"
- 清单和内联都无 → "功能列表加载失败"
- 否则列出可加载项
- 给每个 `.module-item` 绑点击 → `_closeModal()` + `openModule(id)`

---

### `showImageViewer(images, startIndex, options)`

同步。全屏图片查看器。

**参数**：
- `images`：`string[]`
- `startIndex`：默认 0
- `options.loop`：循环翻页，默认 false
- `options.showOpenOriginal`：显示"在新标签页打开原图"
- `options.showPrint`：显示"打印"

**返回值**：`{ close }` 可编程关闭，或 `null`（无图）。

**行为**：
- 清掉所有已有的 `.img-viewer`（单例）
- 清掉旧的 `_imgViewerKeyHandler`
- 渲染：关闭按钮、计数器、prev/next（多图时）、stage、actions
- 键盘：Esc 关闭、←/→ 翻页（多图时）
- 点击遮罩关闭
- 点击图片本身不关闭

**注意**：`loop` 为 false 时，prev/next 在首/尾会 disabled。

---

### `showMessage(message, type)`

同步。顶部消息条。

**参数**：
- `message`：字符串
- `type`：`'success'` / `'error'` / `'info'` / `'warning'`

**行为**：
- `#messageArea` 不存在 → 直接返回
- 同屏最多 3 条，超出移除最老的
- 追加 `<div class="message ${type}">`
- 3 秒后自动移除

**注意**：`message` 不做 HTML 转义，是 `textContent` 赋值，安全。

---

### `showModal(title, content, extraControls, onClose)`

同步。通用模态框。

**参数**：
- `title`：标题（`textContent` 赋值）
- `content`：HTML 字符串或 Node
- `extraControls`：可选 Node，追加到 `#modalExtraControls`
- `onClose`：可选 `() => void`，X 或遮罩关闭时触发

**行为**：
- `#commonModal` 不存在 → 返回
- 清空 `modalBody` / `modalExtraControls`，按类型塞 content / extraControls
- `_modalOnClose = onClose`
- `display: block`

**注意**：`content` 是字符串时会走 `innerHTML`，模块必须**自己保证**已转义或内容是可信 HTML。

---

## 九、主题方法

### `addThemeToggleIcon()`

同步。在 `#globalHelpBtn` 前插 `#themeToggleIcon`。

**行为**：
- 已有 `#themeToggleIcon` → 返回
- 创建 `<span id="themeToggleIcon">`，插到帮助按钮前
- 调 `updateThemeIcon(darkModeEnabled)` 设图标
- 点击 → `toggleDarkMode()`（阻止冒泡，避免触发帮助按钮）

**调用点**：`init()`。

---

### `toggleDarkMode()`

同步。切 `body.dark-mode` 类，翻转 `darkModeEnabled`，更新图标。

---

### `updateThemeIcon(isDark)`

同步。`isDark` 为 true 时用 `moon-fill`，否则 `sun`。

---

## 十、工具方法

### `_isBusinessUrlPlaceholder(url)`

同步。判断是否未配置业务网址。

**逻辑**：空 → true；`_parseOrigin` 得空 → true；origin 匹配 `/^https?:\/\/a\.com$/i` → true。

**用途**：`init()` 里决定是否弹"请先配置业务网址"。

---

### `_parseOrigin(url)`

同步。解析 origin。

**逻辑**：
- 空 → 返回 `''`
- 无 `http(s)://` 前缀 → 补 `https://`
- `try new URL(s).origin` 失败 → 返回 `''`

**注意**：**只保留 origin，丢弃 path**。业务路径由模块自己拼。这是有意的（业务路径不进 git）。

---

### `buildUrl(path)`

同步。拼 domain 前缀的完整 URL。

**逻辑**：
- `domain` 为空 → 返回原 path（不做处理）
- `path` 为空 → 返回 domain
- 否则 → `domain + '/' + path.replace(/^\/+/, '')`

**用法**：
```js
this.app.buildUrl('?order=id123')  // → https://1234.com/?order=id123
```

**注意**：如果 `path` 不以 `/` 或 `?` 开头，需要手动加。业务具体路径由模块负责。

---

### `cdnUrl(path)`

同步。拼 CDN URL：`${cdnBase}main/${path}`。

**注意**：固定用 `main` 分支。

---

### `copyTable(tableId)`

同步。复制 HTML 表格为 TSV。

**逻辑**：
1. 找 `#${tableId}`
2. 读 `thead tr:first-child` 的 th/td 作为表头
3. 读 `tbody tr`（找不到则找所有非 thead 的 tr）作为数据
4. 每行 cells 用 `\t` 拼，行间 `\n`，末尾加 `\n`
5. `copyText(text)` → 成功 / 失败 `showMessage`

**触发点**：`bindCommonEvents` 里对 `.copy-btn` 的委托。

---

### `copyText(text)`

异步。复制文本到剪贴板。

**逻辑**：
- `navigator.clipboard` 存在且 `isSecureContext` → `clipboard.writeText`
- 否则 → 动态 `<textarea>` + `execCommand('copy')`（file:// 兜底）

**返回**：`Promise<void>`，失败 reject。

---

### `download(data, filename, mimeType)`

同步。下载数据为文件。

**参数**：
- `data`：`Blob` / `ArrayBuffer` / `Uint8Array` / `string`
- `mimeType`：默认 `'application/octet-stream'`

**行为**：
- Blob → 直接用
- ArrayBuffer / Uint8Array / string → `new Blob([data], { type: mimeType })`
- 其他类型 → throw
- `URL.createObjectURL` → 造 `<a>` → click → `revokeObjectURL`（1s 后）

---

### `escapeHtml(str)`

同步。HTML 转义。

**转义**：`&` `<` `>` `"` `'`。
**null/undefined** → `''`。

**模块里拼 innerHTML 时必用**。

---

### `getLayerLocationSettings()`

同步。读每层库位数量设置。

**依赖 DOM id**：
- `input[name="optimizationMode"]`（通过 `getOptimizationMode()`）
- `#locationsPerLayer`、`#layerCount`（batch 模式）
- `#layerLocation_${i}`（individual 模式）

**返回**：`{1: n1, 2: n2, ...}`。

**注意**：**只服务于 OptimizationModule**，DOM id 硬编码。新模块不要复用。

---

### `getOptimizationMode()`

同步。读 `input[name="optimizationMode"]` 的选中值，默认 `'batch'`。

**注意**：同上，强耦合 OptimizationModule。

---

### `getRadioValue(name, defaultValue)`

同步。读 radio 组当前选中值。

**参数**：
- `name`：`input[name="${name}"]`
- `defaultValue`：无选中时返回

---

### `pickFile(opts)`

异步。弹文件选择器。

**参数**：
- `opts.accept`：`accept` 属性
- `opts.maxSize`：字节，超出 reject

**返回**：`Promise<File|null>`。用户取消 → `null`。

**注意**：input 元素不进 DOM（`input.click()` 也有效）。

---

### `readExcel(file)`

异步。读 Excel 为二维数组。

**逻辑**：
1. `await loadLibrary('xlsx')`，失败 throw `'XLSX 库未加载'`
2. `arrayBuffer` → `Uint8Array` → `XLSX.read`
3. 取第一个 sheet → `sheet_to_json(_, { header: 1, defval: '' })`

**返回**：`Promise<Array<Array>>`。

---

### `readExcelTable(file, opts)`

异步。读 Excel 为 `{headers, rows}`，带校验。

**参数**：
- `opts.maxRows`：覆盖 `limits.maxUploadRows`
- `opts.emptyMessage`：空文件提示
- `opts.tooManyMessage`：超限提示，含 `{n}` 占位
- `opts.parseErrorMessage`：解析失败前缀

**逻辑**：
1. `readExcel` 失败 → `showMessage(parseErrorMessage + e.message)`，返回 null
2. `jsonData.length < 2` → 提示空文件，返回 null
3. 行数超限 → `tooManyMessage.replace('{n}', limit)`，返回 null
4. `headers` 是首行 trim 后的字符串数组
5. `rows` 是剩余行

**返回**：`Promise<{headers, rows} | null>`。

**注意**：行数上限含表头行，所以实际上限是 `limit - 1` 条数据。

---

### `releaseUrl(tag)`

同步。`${releaseBase}tag/${tag}`。

---

### `timestamp()`

同步。生成 `yymmddhhmm` 时间戳（10 位）。用于文件名。

**示例**：`2026-10-03 14:30` → `'2610031430'`。

---

### `updateUIfOptimizationMode()`

同步。按优化模式切 UI 显隐。

**依赖 DOM id**：`#batchModeActions`、`#locationsPerLayerGroup`、`#individualLayerLocations`。

**注意**：与 `OptimizationModule._applyModeUI` 功能重叠，且依赖不同 id。**优先用 `_applyModeUI`**。这个方法保留是历史遗留。

---

### `validateFile(file, opts)`

同步。校验文件类型和大小。

**参数**：
- `opts.maxSize`：字节
- `opts.accept`：逗号分隔。支持三种：
  - `.xxx` → 按扩展名
  - `type/*` → 按 MIME 前缀
  - `type/subtype` → 按 MIME 精确匹配

**返回**：`boolean`。

---

### `validateLocationCode(code)`

同步。校验库位码：五段，段 4 是 `DD` 或两位数字，段 5 是两位数字。

**逻辑**：
1. 按 `-` 切，长度必须 5
2. 前三段拼成 shelfCode，走 `validateShelfCode`
3. `parts[3]` 必须 `=== 'DD'` 或 `/^\d{2}$/`
4. `parts[4]` 必须 `/^\d{2}$/`

**注意**：**只认大写 `DD`**。上游调用者负责规范化。

---

### `validateShelfCode(code)`

同步。校验货架码：三段，段 2 是两位字母数字，段 3 非空。

**注意**：段 1（区）不校验。

---

### `wikiUrl(page, version)`

同步。`${wikiBase}${page}`，带 version 时追加 `#v${version}`。

---

## 十一、事件绑定方法

### `bindCommonEvents()`

同步。绑全局事件委托。**只在 `init()` 里调一次**。

**绑定内容**：

1. `#globalHelpBtn` 点击 → 组装帮助内容：
   - `_hasUpdate` 为 true 时显示更新提示（含 changelog 前 5 条 + "另有 N 条"）
   - 列出所有模块的 title + intro
   - Core 版本行
   - `globalHelpBody`（替换 `{repo}`）
   - 更新后清 `_hasUpdate` / `_latestXxx`，`_updateHelpBadge()` 消红点

2. `document` 点击委托 → 处理 `.help-btn`：
   - 读 `data-module`
   - 从 `modules[moduleId].helpDescription` 取内容
   - 替换 `{wiki:anchor}` → `${wikiBase}#anchor`，`{wiki}` → `wikiBase`
   - 追加版本行
   - `showModal`

3. `#modalCloseBtn` 点击 → `_closeModal()`

4. `window` 点击 → `event.target === modal` 时 `_closeModal()`（点遮罩）

5. `document` 点击委托 → 处理 `.copy-btn`：
   - 读 `data-table`
   - `copyTable(tableId)`

---

## 十二、公共常量与文案

### `CORE_HEADERS`

```js
CORE_HEADERS.locationChange   // 13 列：批量更改
CORE_HEADERS.locationNew      // 22 列：批量新增
CORE_HEADERS.locationDeleted  // 2 列：删除库位
```

模块导出 Excel 时直接用，保证列顺序一致。

---

### `CORE_CSS`

`:root` 定义全部设计 token：

**颜色**：`--accent` / `--accent-hover` / `--accent-text` / `--accent-soft` / `--text-strong` / `--text` / `--text-muted` / `--bg-body` / `--bg-panel` / `--bg-sub` / `--bg-hover` / `--bg-input` / `--border` / `--border-soft` / `--success` / `--danger` / `--warn` / `--info`

**圆角**：`--r-sm` / `--r` / `--r-lg` / `--r-pill`

**阴影**：`--shadow-sm` / `--shadow` / `--shadow-accent` / `--shadow-accent-lg`

**间距**：`--sp-1` ... `--sp-6`（4/8/12/16/20/24）

**字号**：`--fs-xs` ... `--fs-xl`（12/13/15/16/18/22）

**过渡**：`--t-fast` / `--t`

`body.dark-mode` 覆盖颜色类 token，模块用变量自动跟随。

---

### `CORE_TEXT`

```js
appTitle: '二维码及库位优化工具',
help: '帮助',
info: '说明',
themeToggleTitle: '...',
modal_addModuleTitle: '...',
modal_globalHelpTitle: '...',
msg_copyTableSuccess: '...',
msg_copyTableFailed: '...',
globalHelpBody: '<p>...{repo}...</p>',
```

---

## 十三、扩展场景

### 加新模块

1. 新建 `src/js/module/MyModule.js`，类名 `MyModule`，末尾 `window.MyModule = MyModule`
2. `src/js/modules.js` 的 `list` 加 `{file: 'MyModule.js', title, icon, intro}`
3. `发布配置.js` 的 `TERSER_RESERVED` 加 `'MyModule'` 和模块内的 `'XX_TEXT'` / `'XX_CSS'`
4. 发布

### 加新第三方库

1. `.js` 放 `src/js/lib/`
2. `libraries` 表加一条（含 `global`）
3. 确认 `发布配置.js` 的 `JS_SUBDIRS` 含 `'lib'`（默认含）

### 改默认模块

```js
// Core.js 构造函数
this.defaultModuleId = 'myid';
```

### 改上传上限

```js
this.limits = { maxUploadRows: 100000 };
```

或模块级：
```js
this.app.readExcelTable(file, { maxRows: 100000 });
```

### 改主题色

改 `CORE_CSS` 的 `:root` 里 `--accent*` 四个变量。

### 业务链接

```js
const href = `${this.app.domain}/your/path.html?id=${id}`;
```

**不要**写死域名。

---

## 十四、坑位清单

### 1. `TERSER_RESERVED` 必须含所有全局名

每加一个新模块的类名、`XX_TEXT` / `XX_CSS`，都要加进 `发布配置.js` 的 `TERSER_RESERVED`。

**否则**：Terser mangle 掉类名 → `app.inlineModules.push(XxxModule)` 找不到类；`typeof window[className] === 'function'` 检查失败。

这是**最容易踩的坑**，发布后白屏先查这里。

### 2. 发布脚本对 Core 的三处替换依赖赋值写法

```js
this.version = '1.0.0';           // → 新版本
this.releaseDate = '2026-09-26';  // → 日期
this.releaseBatch = 'dev';        // → 批次
```

改成 `this.version = "..."` 或加空格会**替换失败**。

### 3. `inlineModules.push()` 必须在 `init()` 前

`init()` 里只读一次，之后 push 无效。

### 4. 模块 id 唯一

`_idFromClassName` / `_idFromFile` 推导规则相同，可能撞车。撞了后面的被 `seen` 跳过。

### 5. `destroy()` 必须写

不写 → 定时器、`document` 级监听、Chart 实例泄漏。

### 6. `getLayerLocationSettings` / `getOptimizationMode` / `updateUIfOptimizationMode` 与 OptimizationModule 强耦合

DOM id 硬编码，只服务于 OptimizationModule。新模块不要复用。

### 7. `_parseOrigin` 丢弃 path

有意。业务路径由模块拼。需要 path 自己解析。

### 8. `_log` 默认空

`debug.html` 覆写。发布版被 Terser 去掉。

### 9. `readExcelTable` 行数上限含表头

实际上限是 `limit - 1` 条数据。

### 10. `showModal` 的 `onClose` 只在 `_closeModal()` 触发

自己调 `display: 'none'` 不会触发。

### 11. `bindUploadSection` 用 `document.getElementById`

btnId 必须**全局唯一**，多个模块共用会串。

### 12. `_checkUpdate` 依赖 `version.js` 格式

字段名固定 `batch` / `date` / `changelog`，改格式失效。

### 13. `showModal` 的 `content` 字符串走 innerHTML

模块自己保证转义。

### 14. `cdnBase` 尾带 `@`

拼接路径时不要漏或重复。`_resolvePaths` 自动处理。

### 15. `validateLocationCode` 只认大写 `DD`

上游负责规范化。上传严格、输入宽松是策略。

---

## 十五、一页速查

```
新增模块：MyModule.js → modules.js → TERSER_RESERVED → 发布
默认模块：Core.defaultModuleId
行数上限：Core.limits.maxUploadRows
校验规则：Core.validations
新库：      Core.libraries + 放 src/js/lib/
业务域名：  window.__BUSINESS_URL__（HTML 顶部）
业务链接：  `${app.domain}/path?x=1`
样式 token：CORE_CSS 的 :root
公共表头：  CORE_HEADERS
公共文案：  CORE_TEXT
日志：      app._log(...)（发布版自动去掉）

上传区：    uploadSection + bindUploadSection
消息：      showMessage(msg, type)
弹窗：      showModal / confirm / choose
加载态：    showLoading / hideLoading
复制：      copyText / copyTable
下载：      download(blob|string, name, mime)
读表：      readExcelTable → { headers, rows }
图片查看：  showImageViewer(images, startIndex, opts)
图标：      getIcon(name, size)
帮助按钮：  getHelpButton(moduleId)
样式注入：  injectStyle(id, css)
```

---

@license Unlicense