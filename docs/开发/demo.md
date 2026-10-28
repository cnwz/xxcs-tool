# DemoModule.js —— Core 模块开发模板与文档

> 用途：本模块既是**可运行的示例**，也是**新模块开发的教学文档**。
> 演示 Core 提供的全部关键 API，并给出推荐的项目结构、命名约定、错误处理方式。
> 建议：新模块直接复制本文件骨架改造。

---

## 一、这个 Demo 做什么

一个**库位分析器**：输入或上传库位码列表，按货架分组，统计标准/地堆库位，导出 Excel。

功能虽小，但覆盖了模块开发的所有环节：

- 模块契约（constructor + renderPanel + destroy）
- 两种数据源（文本粘贴 + Excel 上传）
- 输入校验（`validateLocationCode`）
- 结果渲染（表格 + 空状态）
- 导出（`loadLibrary` + `download`）
- 交互（消息、弹窗、确认、加载态）
- 复制表格（Core 全局委托）
- 样式注入 + 图标 + 帮助按钮

---

## 二、完整代码

`src/js/module/DemoModule.js`：

```js
/**
 * @description Demo 模块：演示 Core 模块系统的完整用法，可作为新模块的开发模板
 * @author ls_wuzhen20
 * @since 2026-10-03
 * @lastupdate 2026-10-03
 * @version 1.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/模块示例/开发模板
 * @rules ./rules/DemoModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class DemoModule {
    /**
     * @param {Core} app  Core 实例，由 Core 在 openModule 时注入
     */
    constructor(app) {
        // ============ Core 在构造时未设置 this.id ============
        // this.id 由 Core 在 new Cls(app) 之后赋值，所以这里不要用它

        this.app = app;

        // ---------- 模块契约：Core 依赖这些字段 ----------
        this.title = DEMO_TEXT.title;                    // tab 名、帮助弹窗标题
        this.ver = '1.0.0';                              // 帮助弹窗页脚
        this.lastupdate = '2026-10-03';
        this.iconName = 'lightbulb';                     // Bootstrap Icons 名
        this.introText = DEMO_TEXT.introText;            // "其他功能"弹窗里的简介
        this.helpDescription = DEMO_TEXT.helpDescription;

        // ---------- 内部状态 ----------
        this.validRows = [];       // 校验通过的库位码
        this.invalidRows = [];     // 校验失败的行，[{line, raw}]
        this.groups = new Map();   // 货架码 → 库位码数组

        // ---------- 图标缓存 ----------
        // app.getIcon 返回 HTML 字符串，缓存避免重复拼
        this._iconCache = {
            xlsx: this.app.getIcon('filetype-xlsx'),
            copy: this.app.getIcon('copy'),
            refresh: this.app.getIcon('arrow-counterclockwise'),
            play: this.app.getIcon('play'),
            book: this.app.getIcon('book'),
        };
    }

    // ============ 样式 ============

    /** 注入模块样式。按 id 去重，重复调用安全 */
    injectStyles() {
        this.app.injectStyle(this.id, DEMO_TEXT.styles);
    }

    // ============ 解析 ============

    /**
     * 解析文本为行数组
     * @param {string} text
     */
    _parseLines(text) {
        const lines = String(text)
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);
        this._classify(lines);
    }

    /**
     * 分类：校验 + 分组
     * @param {string[]} lines
     */
    _classify(lines) {
        this.validRows = [];
        this.invalidRows = [];
        this.groups = new Map();

        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const code = raw.toUpperCase();

            // Core 提供的库位码校验：五段，段 4 是 DD 或两位数字，段 5 是两位数字
            if (this.app.validateLocationCode(code)) {
                this.validRows.push(code);
                const shelf = code.split('-').slice(0, 3).join('-');
                if (!this.groups.has(shelf)) this.groups.set(shelf, []);
                this.groups.get(shelf).push(code);
            } else {
                this.invalidRows.push({ line: i + 1, raw });
            }
        }
    }

    // ============ 数据源 ============

    /**
     * 处理上传的 Excel。取第一列作为库位码
     * @param {File} file
     */
    async handleUpload(file) {
        // readExcelTable 封装了 加载xlsx库 + 校验行数 + 提示错误
        const table = await this.app.readExcelTable(file, {
            emptyMessage: DEMO_TEXT.msg_emptyFile,
            parseErrorMessage: DEMO_TEXT.msg_parseFailed,
        });
        if (!table) return;   // 内部已 showMessage

        const lines = table.rows
            .map(r => String(r[0] || '').trim())
            .filter(Boolean);

        if (lines.length === 0) {
            this.app.showMessage(DEMO_TEXT.msg_noData, 'error');
            return;
        }
        this._classify(lines);
        this._renderResult();
        this.app.showMessage(DEMO_TEXT.msg_parsed.replace('{n}', lines.length), 'success');
    }

    /** 处理文本粘贴 */
    handleParseText() {
        const textarea = document.getElementById('demoTextarea');
        if (!textarea || !textarea.value.trim()) {
            this.app.showMessage(DEMO_TEXT.msg_noInput, 'error');
            return;
        }
        this._parseLines(textarea.value);
        this._renderResult();
        const total = this.validRows.length + this.invalidRows.length;
        this.app.showMessage(DEMO_TEXT.msg_parsed.replace('{n}', total), 'success');
    }

    /** 加载示例数据 */
    loadExample() {
        const textarea = document.getElementById('demoTextarea');
        if (textarea) textarea.value = DEMO_TEXT.exampleData;
    }

    // ============ 渲染 ============

    /** 渲染结果区 */
    _renderResult() {
        const area = document.getElementById('demoResultArea');
        if (!area) return;

        if (this.validRows.length === 0 && this.invalidRows.length === 0) {
            // Core 提供的空状态 HTML 片段
            area.innerHTML = this.app.emptyState(DEMO_TEXT.msg_noData);
            return;
        }

        const summary = this._renderSummary();
        const groupTable = this._renderGroupTable();
        const invalidTable = this._renderInvalidTable();

        area.innerHTML = summary + groupTable + invalidTable;
    }

    /** 汇总条 */
    _renderSummary() {
        const warnCls = this.invalidRows.length > 0 ? ' demo-stat-warn' : '';
        return `
            <div class="demo-summary">
                <span class="demo-stat"><strong>${this.validRows.length}</strong> 有效</span>
                <span class="demo-stat"><strong>${this.groups.size}</strong> 货架</span>
                <span class="demo-stat${warnCls}"><strong>${this.invalidRows.length}</strong> 无效</span>
            </div>
        `;
    }

    /** 货架分组表 */
    _renderGroupTable() {
        if (this.groups.size === 0) return '';

        const rows = [...this.groups.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([shelf, locs]) => {
                const dd = locs.filter(l => l.split('-')[3] === 'DD').length;
                const std = locs.length - dd;
                return `<tr>
                    <td>${this.app.escapeHtml(shelf)}</td>
                    <td>${locs.length}</td>
                    <td>${std}</td>
                    <td>${dd}</td>
                </tr>`;
            }).join('');

        return `
            <div class="table-title">
                <h3>${DEMO_TEXT.heading_groups}</h3>
                <button type="button" class="btn copy-btn" data-table="demoGroupTable">
                    ${this._iconCache.copy} 复制表格
                </button>
            </div>
            <div class="table-container">
                <table id="demoGroupTable">
                    <thead>
                        <tr>
                            <th>货架</th>
                            <th>库位总数</th>
                            <th>标准库位</th>
                            <th>地堆库位</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    /** 无效行表 */
    _renderInvalidTable() {
        if (this.invalidRows.length === 0) return '';

        const rows = this.invalidRows.map(r => `<tr>
            <td>${r.line}</td>
            <td>${this.app.escapeHtml(r.raw)}</td>
        </tr>`).join('');

        return `
            <div class="table-title" style="margin-top:var(--sp-5)">
                <h3>${DEMO_TEXT.heading_invalid}</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>行号</th><th>原始内容</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    // ============ 操作 ============

    /** 导出结果为 xlsx */
    async exportResult() {
        if (this.groups.size === 0) {
            this.app.showMessage(DEMO_TEXT.msg_nothingToExport, 'error');
            return;
        }

        // 按需加载第三方库
        const ok = await this.app.loadLibrary('xlsx');
        if (!ok) {
            this.app.showMessage('XLSX 库加载失败，请检查网络', 'error');
            return;
        }

        // 模块级加载态：遮罩只在 #panel-demo 上
        this.app.showLoading(this.id, '正在导出…');
        try {
            const data = [['货架', '库位总数', '标准库位', '地堆库位']];
            const sorted = [...this.groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
            for (const [shelf, locs] of sorted) {
                const dd = locs.filter(l => l.split('-')[3] === 'DD').length;
                data.push([shelf, locs.length, locs.length - dd, dd]);
            }

            // 用全局的 XLSX（loadLibrary 成功后可用）
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, '库位分析');

            const arr = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const fileName = `库位分析_${this.app.timestamp()}.xlsx`;
            this.app.download(arr, fileName,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            this.app.showMessage(DEMO_TEXT.msg_exportOk, 'success');
        } catch (err) {
            console.error('导出失败:', err);
            this.app.showMessage(DEMO_TEXT.msg_exportFailed + err.message, 'error');
        } finally {
            this.app.hideLoading(this.id);
        }
    }

    /** 重置（带二次确认） */
    async reset() {
        if (this.validRows.length === 0 && this.invalidRows.length === 0) {
            this.app.showMessage('当前没有数据', 'info');
            return;
        }

        // confirm 返回 Promise<boolean>
        const ok = await this.app.confirm(
            '确认重置',
            '<p>将清空当前所有解析结果，是否继续？</p>',
            { okText: '确认重置', okClass: 'btn-danger', cancelText: '取消' }
        );
        if (!ok) return;

        this.validRows = [];
        this.invalidRows = [];
        this.groups = new Map();

        const textarea = document.getElementById('demoTextarea');
        if (textarea) textarea.value = '';

        this._renderResult();
        this.app.showMessage(DEMO_TEXT.msg_resetOk, 'success');
    }

    /** 弹 API 速查（演示 showModal） */
    showApiList() {
        this.app.showModal('Core API 速查', `
            <p>本模块演示了以下 Core API：</p>
            <ul style="line-height:1.9;">
                <li><code>app.escapeHtml(str)</code> — HTML 转义</li>
                <li><code>app.validateLocationCode(code)</code> — 库位码校验</li>
                <li><code>app.readExcelTable(file, opts)</code> — 读 Excel</li>
                <li><code>app.loadLibrary(name)</code> — 加载第三方库</li>
                <li><code>app.download(data, name, mime)</code> — 下载文件</li>
                <li><code>app.showMessage(msg, type)</code> — 消息条</li>
                <li><code>app.showModal(title, content)</code> — 弹窗</li>
                <li><code>app.confirm(title, content, opts)</code> — 确认框</li>
                <li><code>app.showLoading(id) / app.hideLoading(id)</code> — 模块加载态</li>
                <li><code>app.getIcon(name, size)</code> — 图标 HTML</li>
                <li><code>app.injectStyle(id, css)</code> — 注入样式</li>
                <li><code>app.uploadSection(opts)</code> — 标准上传区 HTML</li>
                <li><code>app.bindUploadSection(opts)</code> — 绑上传区事件</li>
                <li><code>app.timestamp()</code> — 时间戳（yymmddhhmm）</li>
                <li><code>app.emptyState(text)</code> — 空状态 HTML</li>
            </ul>
        `);
    }

    // ============ 事件绑定 ============

    /**
     * 绑定面板内事件。所有查询用 panel.querySelector，避免跨模块冲突
     * @param {HTMLElement} panel
     */
    bindEvents(panel) {
        // optional chaining 保证元素不存在时不报错
        panel.querySelector('#demoParseBtn')?.addEventListener('click', () => this.handleParseText());
        panel.querySelector('#demoExportBtn')?.addEventListener('click', () => this.exportResult());
        panel.querySelector('#demoExampleBtn')?.addEventListener('click', () => this.loadExample());
        panel.querySelector('#demoResetBtn')?.addEventListener('click', () => this.reset());
        panel.querySelector('#demoApiBtn')?.addEventListener('click', () => this.showApiList());
    }

    // ============ 生命周期 ============

    /**
     * 释放资源。Core 在 closeModule 时调用
     * 本模块无 document 级监听、无定时器、无 Chart 实例，所以是空实现
     * 如果将来加了上述任一，必须在这里清理
     */
    destroy() {
        // 示例：
        // if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        // if (this._docHandler) { document.removeEventListener('click', this._docHandler); }
    }

    /**
     * 渲染面板。Core 在 openModule 时调用
     * @param {HTMLElement} panel  Core 创建的 #panel-${id}
     */
    renderPanel(panel) {
        this.injectStyles();

        panel.innerHTML = `
            <div class="section">
                ${this.app.uploadSection({
                    title: DEMO_TEXT.heading_upload,
                    moduleId: this.id,          // 传了才显示帮助按钮
                    btnId: 'demoUploadBtn',
                    btnLabel: DEMO_TEXT.btn_upload,
                })}
            </div>

            <div class="section">
                <div class="table-header">
                    <h2>${DEMO_TEXT.heading_input}</h2>
                    <button id="demoApiBtn" class="btn btn-secondary">
                        ${this._iconCache.book} API 速查
                    </button>
                </div>
                <div class="form-group">
                    <label for="demoTextarea">${DEMO_TEXT.label_input}</label>
                    <textarea id="demoTextarea" placeholder="${DEMO_TEXT.ph_input}"></textarea>
                    <p class="note">${DEMO_TEXT.note_input}</p>
                </div>
                <div class="btn-row">
                    <button id="demoParseBtn" class="btn">
                        ${this._iconCache.play} ${DEMO_TEXT.btn_parse}
                    </button>
                    <button id="demoExampleBtn" class="btn btn-secondary">${DEMO_TEXT.btn_example}</button>
                    <button id="demoResetBtn" class="btn btn-secondary">
                        ${this._iconCache.refresh} ${DEMO_TEXT.btn_reset}
                    </button>
                </div>
            </div>

            <div class="section">
                <div class="table-header">
                    <h2>${DEMO_TEXT.heading_result}</h2>
                    <button id="demoExportBtn" class="btn">
                        ${this._iconCache.xlsx} ${DEMO_TEXT.btn_export}
                    </button>
                </div>
                <div id="demoResultArea">
                    ${this.app.emptyState(DEMO_TEXT.msg_noData)}
                </div>
            </div>
        `;

        this.bindEvents(panel);

        // 绑上传区事件（Core 统一处理 选文件 → 校验 → onFile 回调）
        this.app.bindUploadSection({
            btnId: 'demoUploadBtn',
            accept: '.xlsx,.xls',
            onFile: (file) => this.handleUpload(file),
        });

        this.app._log(this.title + '模块加载成功');
    }
}

// ==================== 文案 ====================

const DEMO_TEXT = {
    title: '模块 Demo',
    introText: '演示 Core 模块系统的完整用法，可作为新模块开发模板。',
    helpDescription: `
        <p>这是一个教学用 demo 模块，演示了：</p>
        <ul>
            <li>模块契约（constructor 必填字段）</li>
            <li>上传区 / 文本输入两种数据源</li>
            <li>Excel 解析 + 库位码校验 + 分组</li>
            <li>结果表格 + 复制 / 导出</li>
            <li>弹窗 / 确认框 / 加载态</li>
            <li>样式注入 / 图标 / 消息</li>
        </ul>
        <p><a href="{wiki}" target="_blank">完整开发文档</a></p>
    `,

    heading_upload: '上传库位列表',
    heading_input: '输入库位列表',
    heading_result: '分析结果',
    heading_groups: '货架分组',
    heading_invalid: '无效行',

    label_input: '库位码（每行一个）',
    ph_input: 'CW-01-01-01-01\nCW-01-01-02-01\nCW-01-01-DD-01\nCW-02-01-01-01',
    note_input: '每行一个库位码，格式 XX-XX-XX-XX-XX，第四段可以是 DD（地堆）。',

    btn_upload: '上传 Excel',
    btn_parse: '解析文本',
    btn_example: '加载示例',
    btn_export: '导出结果',
    btn_reset: '重置',

    msg_noData: '暂无数据',
    msg_noInput: '请先输入库位码',
    msg_emptyFile: '文件为空或只有表头',
    msg_parseFailed: '解析失败: ',
    msg_parsed: '解析完成，共 {n} 条',
    msg_nothingToExport: '没有可导出的数据',
    msg_exportOk: '导出成功',
    msg_exportFailed: '导出失败: ',
    msg_resetOk: '已重置',

    exampleData: `CW-01-01-01-01
CW-01-01-02-01
CW-01-01-03-01
CW-01-01-DD-01
CW-02-01-01-01
CW-02-01-01-02
CW-02-02-01-01
LC-01-01-01-01
invalid-line
XX-YY-ZZ-01-01`,

    styles: `
.demo-summary{display:flex;gap:var(--sp-5);padding:var(--sp-4);background:var(--bg-sub);border-radius:var(--r);margin-bottom:var(--sp-4);flex-wrap:wrap}
.demo-stat{font-size:var(--fs);color:var(--text)}
.demo-stat strong{font-size:var(--fs-xl);color:var(--accent-text);margin-right:var(--sp-1)}
.demo-stat-warn strong{color:var(--danger)}
`
};

window.DemoModule = DemoModule;
```

---

## 三、分段讲解

### 3.1 模块契约

Core 依赖以下字段，**必须**在 constructor 里设置：

| 字段 | 用途 | 缺省后果 |
|---|---|---|
| `title` | tab 显示名、帮助弹窗标题 | tab 显示 id |
| `ver` | 帮助弹窗页脚 | 空 |
| `lastupdate` | 帮助弹窗页脚 | 空 |
| `iconName` | tab 图标 | `circle` |
| `introText` | "其他功能"弹窗里的简介 | 空 |
| `helpDescription` | 帮助弹窗正文 | 不弹帮助 |

**`this.id` 在 constructor 里不可用**。Core 的顺序是：

```js
const instance = new Cls(this);   // constructor 执行
instance.id = id;                  // 赋值在构造之后
instance.renderPanel(panel);       // 此时 this.id 才可用
```

所以 `injectStyles()` 用 `this.id` 是安全的（在 renderPanel 里调）。

**`destroy()` 是可选契约**。有则被调，无则跳过。本 Demo 无全局监听，留空即可。

### 3.2 数据源：两种入口

**A. Excel 上传** —— 用 Core 的封装：

```js
const table = await this.app.readExcelTable(file, {
    emptyMessage: '...',
    parseErrorMessage: '...',
});
if (!table) return;   // 内部已经 showMessage
const { headers, rows } = table;
```

`readExcelTable` 自动做了：加载 xlsx 库、读文件、校验非空、校验行数、错误提示。**新模块优先用它**，不要自己 `loadLibrary` + `readExcel` 重造。

**B. 文本粘贴** —— 直接读 textarea 值。

两种入口最后都汇聚到 `_classify(lines)`，保持逻辑单一。

### 3.3 校验：用 Core 的而不是自己写

```js
if (this.app.validateLocationCode(code)) { ... }
```

`validateLocationCode` 是 Core 提供的权威校验，规则：五段，段 4 是 `DD` 或两位数字，段 5 是两位数字，前三段走 `validateShelfCode`。

**不要自己写正则**，因为不同模块对"合法"的定义必须一致，写在 Core 里才能集中维护。

**注意**：`DD` 只认大写。上游要不要转大写是**业务决策**——本 Demo 选择"输入宽松"，在解析前 `raw.toUpperCase()`。

### 3.4 渲染：空状态 + 表格

`app.emptyState(text)` 是 Core 提供的空状态 HTML：

```html
<div class="empty-state">暂无数据</div>
```

**表格样式**由 Core 的 `CORE_CSS` 全局定义（`table` / `th` / `td` / `.table-container`），模块**不需要自己写表格 CSS**。

**复制表格**：只要给按钮加 `.copy-btn` 和 `data-table="tableId"`，Core 的事件委托自动处理（点击 → 转 TSV → `copyText`）。**不用自己绑事件**。

### 3.5 导出：loadLibrary + download

```js
const ok = await this.app.loadLibrary('xlsx');
if (!ok) { /* 报错 */ return; }
// 此时 window.XLSX 可用
const wb = XLSX.utils.book_new();
...
const arr = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
this.app.download(arr, fileName, mime);
```

**关键点**：

1. `loadLibrary` 是异步的，**必须 await** 并检查返回值
2. 库的全局名由 Core 决定（`libraries[name].global`），xlsx 是 `XLSX`
3. `XLSX.write(..., type: 'array')` 返回 `ArrayBuffer`，`download` 直接支持
4. 文件名用 `app.timestamp()`（yymmddhhmm）避免重名

### 3.6 加载态：只遮住自己

```js
this.app.showLoading(this.id, '正在导出…');
try { ... } finally {
    this.app.hideLoading(this.id);
}
```

`showLoading(id)` 在 `#panel-${id}` 上盖遮罩，**不会影响其他 tab**。这是**必须用 try/finally** 的原因：即使逻辑抛错，遮罩也要移除。

### 3.7 确认框：await confirm

```js
const ok = await this.app.confirm('标题', '<p>内容</p>', {
    okText: '确认重置',
    okClass: 'btn-danger',
    cancelText: '取消',
});
if (!ok) return;
```

`confirm` 返回 `Promise<boolean>`。用户点 X 或遮罩也算 cancel。

**不要**用 `window.confirm`——那会脱离工具的整体风格。

### 3.8 弹窗：showModal

```js
this.app.showModal('标题', '<p>HTML 内容</p>');
```

**content 是字符串时走 innerHTML**。所以：

- 拼 HTML 时**必须 escapeHtml** 用户数据
- 静态 HTML 可以放心拼

本 Demo 里 `showApiList` 全是静态内容，所以直接拼。

### 3.9 事件绑定：panel 作用域

```js
bindEvents(panel) {
    panel.querySelector('#demoParseBtn')?.addEventListener('click', ...);
}
```

**用 `panel.querySelector` 而不是 `document.getElementById`**。原因：

- 多个模块可能有同名 id
- `panel` 作用域避免跨模块污染
- optional chaining 保证元素不存在时不报错

**唯一例外**是 `handleParseText` / `reset` 里读 `#demoTextarea`，因为它们是在**事件回调**里执行的，此时 `panel` 不在作用域。用 `document.getElementById` 也能工作，因为 id 全局唯一。**更好的做法**是把 textarea 存成实例字段，或让回调闭包捕获。

### 3.10 renderPanel：标准结构

```js
renderPanel(panel) {
    this.injectStyles();           // 1. 先注入样式
    panel.innerHTML = `...`;        // 2. 渲染 HTML
    this.bindEvents(panel);         // 3. 绑事件
    this.app.bindUploadSection(...);// 4. 绑上传区
    this.app._log(...);             // 5. 日志
}
```

顺序固定。**injectStyles 必须第一**，因为 HTML 可能依赖样式类。

**`uploadSection` + `bindUploadSection` 配对**：

```js
// HTML 部分
panel.innerHTML = `
    ${this.app.uploadSection({
        title, moduleId, btnId, btnLabel, resetId, resetLabel
    })}
`;

// 事件部分
this.app.bindUploadSection({
    btnId, accept, onFile, resetId, onReset
});
```

`uploadSection` 生成的 HTML 里按钮 id 由 `btnId` 决定，`bindUploadSection` 按同样的 id 找按钮。**两边 id 必须一致**。

### 3.11 样式：只用 Core 变量

```css
.demo-summary {
    padding: var(--sp-4);
    background: var(--bg-sub);
    border-radius: var(--r);
}
```

**颜色、间距、圆角全部用 CSS 变量**。这样：

- 深色模式自动跟随（`body.dark-mode` 覆盖变量）
- 主题色统一换时只改 `CORE_CSS` 的 `:root`

**不要写死颜色**，除非是语义色（如"当日鲜"的粉色），此时加注释说明原因。

### 3.12 文案：集中到 XX_TEXT

所有用户可见的字符串放到 `DEMO_TEXT`，代码里用 `DEMO_TEXT.xxx` 引用。好处：

- 改文案不动逻辑
- 未来加多语言支持时替换方便
- 帮助文档写 `{wiki}` 占位符时能替换

**`helpDescription` 里的 `{wiki}` / `{wiki:xxx}` 由 Core 替换**：

- `{wiki}` → `${wikiBase}使用/${encodeURIComponent(module.title)}`
- `{wiki:xxx}` → `${wikiBase}使用/${encodeURIComponent(module.title)}#xxx`

---

## 四、Core API 覆盖清单

本 Demo 用到的 Core API，逐一对应到方法：

| API | 使用位置 | 用途 |
|---|---|---|
| `app.escapeHtml` | `_renderGroupTable` / `_renderInvalidTable` | HTML 转义 |
| `app.validateLocationCode` | `_classify` | 库位码校验 |
| `app.readExcelTable` | `handleUpload` | 读 Excel |
| `app.loadLibrary('xlsx')` | `exportResult` | 按需加载库 |
| `app.download` | `exportResult` | 下载文件 |
| `app.timestamp` | `exportResult` | 文件名时间戳 |
| `app.showMessage` | 多处 | 顶部消息条 |
| `app.showModal` | `showApiList` | 弹窗 |
| `app.confirm` | `reset` | 确认框 |
| `app.showLoading` / `app.hideLoading` | `exportResult` | 模块级遮罩 |
| `app.getIcon` | `_iconCache` | 图标 HTML |
| `app.injectStyle` | `injectStyles` | 注入样式 |
| `app.uploadSection` | `renderPanel` | 上传区 HTML |
| `app.bindUploadSection` | `renderPanel` | 绑上传区事件 |
| `app.emptyState` | `_renderResult` / `renderPanel` | 空状态 HTML |
| `app._log` | `renderPanel` | 调试日志（发布版去掉） |

**未用但值得知道**：

- `app.choose(title, content, options)` — 多选一对话框，返回选中 value
- `app.showImageViewer(images, startIndex, opts)` — 图片查看器
- `app.copyText(text)` — 复制文本（`copyTable` 内部调用）
- `app.copyTable(tableId)` — 复制表格
- `app.buildUrl(path)` — 拼业务域名
- `app.domain` — 业务域名（只读）
- `app.getHelpButton(moduleId)` — 帮助按钮 HTML（`uploadSection` 里已内嵌）
- `app.showModal(title, content, extraControls, onClose)` — 带额外控件或关闭回调的弹窗

---

## 五、把这个模块加进项目

从 git 拿到的源码结构（`src/` 下的）：

```
src/
├── js/
│   ├── modules.js                   # 模块清单
│   ├── module/                      # 模块目录
│   │   ├── Core.js
│   │   ├── MultiQRCodeModule.js
│   │   ├── OptimizationModule.js
│   │   └── ...
│   ├── lib/                         # 第三方库（xlsx / jszip / qrcode / ...）
│   └── data/                        # 数据文件（productMap.js / commonLocations.js）
├── docs/                            # 文档
├── index.html                       # 入口模板（内联占位符）
├── ping.txt                         # CDN 探活文件
└── version.js                       # 版本信息
```

**加一个新模块，只需两处改动**：

### 1. 新建文件

`src/js/module/DemoModule.js`（内容见上）

### 2. 加到清单

`src/js/modules.js` 的 `list` 里加一行：

```js
window.__MODULES__ = {
    basePath: 'js/module/',
    list: [
        // ...
        { file: 'DemoModule.js', title: '模块 Demo', icon: 'lightbulb', intro: '演示 Core 模块系统用法' },
        // ...
    ]
};
```

**完成**。改动只在这两个文件。

### 如何验证

git 里的 `src/index.html` 是**入口模板**，带 `<!-- INLINE_BLOCK -->` 占位符，直接打开**不能运行**——核心脚本要由使用者的构建流程填进去。

要在本地跑起来，自己造一个启动 HTML（放 `src/` 同级或里面都行）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>二维码及库位优化工具</title>
</head>
<body>
<div id="boot-loading" style="text-align:center;padding:60px;color:#999">正在加载…</div>
<script>window.__BUSINESS_URL__ = 'https://example.com';</script>
<script src="js/module/Core.js"></script>
<script>
const app = new Core();
app.init();
window.__booted = true;
</script>
</body>
</html>
```

打开它：

1. Core 加载 → 建骨架 → 拉 `js/modules.js` 清单
2. 默认模块（`multiqrcode`）如果也在清单里，会一起加载
3. 点顶部"其他功能" → 选"模块 Demo" → 新 tab 出现

`__BUSINESS_URL__` 是业务域名配置，改不改都行，占位符 `http://a.com` 会让 Core 弹一次配置提示。

### 注意事项

1. **不要改 `src/index.html` 里的 `<!-- INLINE_BLOCK -->`**。它由维护者的构建流程使用。你在自己的启动 HTML 里加载 `Core.js` 就好。
2. **类名和文件名必须一致**。Core 通过文件名推导类名（`DemoModule.js` → `DemoModule`），再 `typeof window['DemoModule'] === 'function'` 检查。不一致就加载失败。
3. **模块 id 由类名推导**。`_idFromClassName('DemoModule')` → `'demo'`。这个 id 会出现在 tab 的 `data-module` 属性、panel 的 `id="panel-demo"` 上。**改了类名 = 改了 id**。
4. **不要动 `src/js/lib/` 和 `src/js/data/`**，除非确实要加新库/新数据。加库要同步 `Core.libraries` 表。

---

## 六、扩展到更复杂的模块

本 Demo 是**无状态**的（每次解析替换所有数据）。更复杂的模块通常需要：

| 需求 | 参考模块 |
|---|---|
| 累积结果，跨次生成 | OptimizationModule |
| 三级数据（人/订单/工单） | WorkOrderParserModule |
| 拖拽排序 | SortingModule |
| 图片查看器 | QRCodeModule / WorkOrderParserModule |
| 实时预览 | MultiQRCodeModule |
| 图表统计 | WorkOrderParserModule |
| 打印 | LabelPrintModule |
| 多文件导出 | OptimizationModule（xlsx + zip） |
| 文件上传 + 列选择 | BarcodeToMapModule / QRPrintModule |

**共同规律**：

1. 状态字段全放 constructor，不挂 `window`
2. DOM 操作只在自己的 panel 里
3. 全局监听/定时器/Chart 必须在 `destroy()` 里清理
4. 用户可见文案抽到 `XX_TEXT`
5. 样式只用 Core 变量

---

## 七、一页速查（新模块骨架）

```js
class XxxModule {
    constructor(app) {
        this.app = app;
        this.title = XX_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-10-03';
        this.iconName = 'box';
        this.introText = XX_TEXT.introText;
        this.helpDescription = XX_TEXT.helpDescription;
        // 状态字段...
    }
    injectStyles() { this.app.injectStyle(this.id, XX_TEXT.styles); }
    bindEvents(panel) { /* panel.querySelector 域内查询 */ }
    destroy() { /* 清理全局监听/定时器/Chart */ }
    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                ${this.app.uploadSection({
                    title: '上传数据', moduleId: this.id,
                    btnId: 'xxUploadBtn', btnLabel: '上传并解析',
                })}
            </div>
            <div class="section">
                <div class="table-header"><h2>结果</h2></div>
                <div id="xxResult"></div>
            </div>
        `;
        this.bindEvents(panel);
        this.app.bindUploadSection({
            btnId: 'xxUploadBtn', accept: '.xlsx,.xls',
            onFile: (file) => this.handleFile(file),
        });
        this.app._log(this.title + '模块加载成功');
    }
}
const XX_TEXT = {
    title: '...', introText: '...', helpDescription: '...',
    styles: `...`
};
window.XxxModule = XxxModule;
```

**加进项目 2 步**：

1. `src/js/module/XxxModule.js`
2. `src/js/modules.js` 加一行

**本地验证**：

- 用你自己的启动 HTML（`<script src="js/module/Core.js">` + `new Core().init()`）
- 点"其他功能" → 选模块

**关键约束**：

- 类名 = 文件名（去掉 `.js`）
- `this.id` 在 constructor 里不可用
- 用 `panel.querySelector` 而不是 `document.getElementById`
- `destroy()` 里清理全局资源
- 文案抽到 `XX_TEXT`，样式只用 Core 变量
- 拼 HTML 时用 `app.escapeHtml` 转义用户数据

---

@license Unlicense