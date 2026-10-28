/**
 * @description 条码转键值Map模块
 * @author ls_wuzhen20
 * @since 2026-06-05
 * @lastupdate 2026-09-21
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/BarcodeToMapModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class BarcodeToMapModule {
    constructor(app) {
        this.app = app;
        this.title = BT_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2026-09-21';
        this.iconName = 'upc-scan';
        this.introText = BT_TEXT.introText;
        this.helpDescription = BT_TEXT.helpDescription;
        this._iconCache = {
            copy: this.app.getIcon('copy'),
            javascript: this.app.getIcon('javascript'),
            fileEarmarkExcel: this.app.getIcon('filetype-xlsx'),
        };
        this._uploadedData = null;
        this._currentColumns = null;
        this._generatedCode = '';
        this._generatedCount = 0;
    }

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, BT_TEXT.styles);
    }

    /**
     * 解析单行文本为条码/名称对
     * @param {string} line
     * @returns {{code:string,name:string}|null}
     */
    _parseLine(line) {
        line = line.trim();
        if (!line) return null;
        let delimiter = null;
        if (line.includes('\t')) delimiter = '\t';
        else if (line.includes(',')) delimiter = ',';
        else if (/\s+/.test(line)) delimiter = ' ';
        else return null;
        if (delimiter === ' ') {
            let tokens = line.split(/\s+/);
            if (tokens.length < 2) return null;
            return { code: tokens[0], name: tokens.slice(1).join(' ') };
        } else {
            let parts = line.split(delimiter);
            if (parts.length < 2) return null;
            return { code: parts[0].trim(), name: parts.slice(1).join(delimiter === ',' ? ',' : ' ').trim() };
        }
    }

    /**
     * 单行数据转换为数组项字符串
     * @param {{code:string,name:string,fresh:string}} row
     * @returns {string}
     */
    _buildArrayEntry(row) {
        const freshVal = (row.fresh === '是' || row.fresh.toLowerCase() === 'true') ? '是' : '';
        const cleanName = String(row.name).replace(/\s+/g, '');
        return `[${JSON.stringify(row.code)}, ${JSON.stringify(cleanName)}, ${JSON.stringify(freshVal)}]`;
    }

    /**
     * 汇总当前数据源（Excel 或文本）为标准行数组
     * @returns {Array<{code:string,name:string,fresh:string}>}
     */
    _getDataRows() {
        const textarea = document.getElementById('btBarcodeRawData');
        if (this._uploadedData && this._currentColumns) {
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
        } else {
            const raw = textarea ? textarea.value : '';
            if (!raw.trim()) return [];
            const lines = raw.split(/\r?\n/);
            const rows = [];
            for (const line of lines) {
                const res = this._parseLine(line);
                if (res) rows.push({ code: res.code, name: res.name, fresh: '' });
            }
            return rows;
        }
    }

    /** 生成 productMap 数组代码，预览前 50 行 */
    _generate() {
        const rows = this._getDataRows();
        const outputPre = document.getElementById('btMapOutputCode');
        if (rows.length === 0) {
            this._generatedCode = '';
            this._generatedCount = 0;
            if (outputPre) outputPre.textContent = BT_TEXT.msg_noDataOutput;
            this.app.showMessage(BT_TEXT.msg_noData, 'error');
            return;
        }
        const fullEntries = rows.map(r => this._buildArrayEntry(r)).join(',\n');
        const fullCode = `window.productMapData = [\n${fullEntries}\n];`;
        this._generatedCode = fullCode;
        this._generatedCount = rows.length;

        const previewRows = rows.slice(0, 50);
        const previewEntries = previewRows.map(r => this._buildArrayEntry(r)).join(',\n');
        const suffix = rows.length > 50
            ? `\n// ... 省略 ${rows.length - 50} 行（复制/导出包含全部 ${rows.length} 条数据）`
            : '';
        const previewCode = `window.productMapData = [\n${previewEntries}${suffix}\n];`;
        if (outputPre) outputPre.textContent = previewCode;

        this.app.showMessage(BT_TEXT.msg_genNewArrayOk.replace('{n}', rows.length), 'success');
    }

    /**
     * 处理上传的 Excel 文件，填充列选择器
     * @param {File} file
     * @returns {Promise<void>}
     */
    async _handleExcelFile(file) {
        const uploadStatus = document.getElementById('btUploadStatus');
        const columnSelector = document.getElementById('btExcelColumnSelector');
        const codeColSelect = document.getElementById('btCodeColSelect');
        const nameColSelect = document.getElementById('btNameColSelect');
        const freshColSelect = document.getElementById('btFreshColSelect');
        const textarea = document.getElementById('btBarcodeRawData');

        const table = await this.app.readExcelTable(file, {
            emptyMessage: BT_TEXT.msg_emptyFile,
            parseErrorMessage: BT_TEXT.msg_parseExcelFailed,
        });
        if (!table) return;

        const { headers, rows } = table;
        this._uploadedData = rows;

        codeColSelect.innerHTML = '';
        nameColSelect.innerHTML = '';
        freshColSelect.innerHTML = `<option value="">${BT_TEXT.opt_none}</option>`;
        headers.forEach((h, idx) => {
            const opt1 = document.createElement('option');
            opt1.value = idx;
            opt1.textContent = h || `${BT_TEXT.opt_colPrefix}${idx + 1}`;
            codeColSelect.appendChild(opt1);
            nameColSelect.appendChild(opt1.cloneNode(true));
            freshColSelect.appendChild(opt1.cloneNode(true));
        });
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
        columnSelector.style.display = 'block';
        if (textarea) textarea.style.display = 'none';
        if (uploadStatus) uploadStatus.textContent = BT_TEXT.msg_uploaded.replace('{file}', file.name).replace('{n}', rows.length);
        this.app.showMessage(BT_TEXT.msg_parseOk.replace('{n}', rows.length), 'success');
    }

    /**
     * 绑定面板内所有事件
     * @param {HTMLElement} panel
     */
    _bindEvents(panel) {
        const textarea = panel.querySelector('#btBarcodeRawData');
        const generateNewBtn = panel.querySelector('#btGenerateNewArrayBtn');
        const copyBtn = panel.querySelector('#btCopyMapCodeBtn');
        const saveBtn = panel.querySelector('#btSaveMapJsBtn');
        const loadExampleBtn = panel.querySelector('#btLoadExampleBtn');
        const uploadBtn = panel.querySelector('#btUploadExcelBtn');
        const uploadStatus = panel.querySelector('#btUploadStatus');
        const columnSelector = panel.querySelector('#btExcelColumnSelector');
        const codeColSelect = panel.querySelector('#btCodeColSelect');
        const nameColSelect = panel.querySelector('#btNameColSelect');
        const freshColSelect = panel.querySelector('#btFreshColSelect');
        const applyColBtn = panel.querySelector('#btApplyColumnSelectionBtn');
        const switchToTextBtn = panel.querySelector('#btSwitchToTextBtn');

        generateNewBtn.addEventListener('click', () => this._generate());

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

        saveBtn.addEventListener('click', () => {
            if (!this._generatedCode) {
                this.app.showMessage(BT_TEXT.msg_generateFirst, 'error');
                return;
            }
            this.app.download(this._generatedCode, 'productMap.js', 'application/javascript');
            this.app.showMessage(BT_TEXT.msg_saved.replace('{n}', this._generatedCount), 'success');
        });

        loadExampleBtn.addEventListener('click', () => {
            textarea.value = BT_TEXT.exampleData;
            this._uploadedData = null;
            this._currentColumns = null;
            columnSelector.style.display = 'none';
            if (uploadStatus) uploadStatus.textContent = '';
            textarea.style.display = '';
            this._generate();
        });

        uploadBtn.addEventListener('click', async () => {
            try {
                const file = await this.app.pickFile({ accept: '.xlsx,.xls,.csv' });
                if (!file) return;
                await this._handleExcelFile(file);
            } catch (e) {
                this.app.showMessage(e.message, 'error');
            }
        });

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

        switchToTextBtn.addEventListener('click', () => {
            this._uploadedData = null;
            this._currentColumns = null;
            columnSelector.style.display = 'none';
            if (uploadStatus) uploadStatus.textContent = '';
            if (textarea) textarea.style.display = '';
            this.app.showMessage(BT_TEXT.msg_switchedToText, 'info');
        });

        if (!textarea.value) loadExampleBtn.click();
    }

    // ==================== UI ====================

    /** 渲染模块面板 */
    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header"><h2>${BT_TEXT.heading}</h2>${this.app.getHelpButton(this.id)}</div>
                <p class="note">${BT_TEXT.introNote}</p>
                <div class="form-group">
                    <label>${BT_TEXT.label_rawData}</label>
                    <textarea id="btBarcodeRawData" maxlength="1000" placeholder="${BT_TEXT.ph_rawData}"></textarea>
                    <div class="toolbar" style="margin-top:8px;">
                        <button id="btUploadExcelBtn" class="btn btn-secondary">${this._iconCache.fileEarmarkExcel} ${BT_TEXT.btn_uploadExcel}</button>
                        <span id="btUploadStatus" class="status-text"></span>
                        <button id="btLoadExampleBtn" class="btn btn-secondary">${BT_TEXT.btn_loadExample}</button>
                    </div>
                    <div id="btExcelColumnSelector" class="panel-box" style="display:none;">
                        <div class="columns-row">
                            <div><strong>${BT_TEXT.label_selectColumns}</strong></div>
                            <div class="bt-column-selects">
                                <label>${BT_TEXT.label_codeCol}<select id="btCodeColSelect"></select></label>
                                <label>${BT_TEXT.label_nameCol}<select id="btNameColSelect"></select></label>
                                <label>${BT_TEXT.label_freshCol}<select id="btFreshColSelect"><option value="">${BT_TEXT.opt_none}</option></select></label>
                            </div>
                            <button id="btApplyColumnSelectionBtn" class="btn btn-success">${BT_TEXT.btn_applyColumns}</button>
                            <button id="btSwitchToTextBtn" class="btn btn-secondary">${BT_TEXT.btn_switchToText}</button>
                        </div>
                    </div>
                </div>
                <div class="btn-row">
                    <button id="btGenerateNewArrayBtn" class="btn btn-success">${BT_TEXT.btn_genNewArray}</button>
                </div>
                <div class="form-group">
                    <label>${BT_TEXT.label_output}</label>
                    <pre id="btMapOutputCode" class="code-output">${BT_TEXT.outputPlaceholder}</pre>
                </div>
                <div class="btn-row">
                    <button id="btCopyMapCodeBtn" class="btn copy-btn">${this._iconCache.copy} ${BT_TEXT.btn_copyCode}</button>
                    <button id="btSaveMapJsBtn" class="btn btn-warning">${this._iconCache.javascript} ${BT_TEXT.btn_saveJs}</button>
                </div>
            </div>
        `;
        this._bindEvents(panel);
    }
}

// ==================== 文案 ====================

const BT_TEXT = {
    title: '条码转键值',
    introText: '将条码/商品对应表转为商品库数组，支持Excel上传。',
    helpDescription: '粘贴包含条码和商品名称的文本 (支持制表符/空格/逗号分隔)，或上传Excel文件。点击生成获得代码，可复制或保存为productMap.js文件。',

    heading: '条码转键值',
    introNote: '支持从Excel复制的两列数据（条码 商品名），自动识别 Tab / 空格 / 英文逗号。',
    label_rawData: '粘贴原始数据 (每行一条，列之间自动分隔，最多1000字符)',
    ph_rawData: '示例：\n12345\t富士苹果\n67890\t泰国香蕉\n6901234567890\t蒙牛纯牛奶',
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

    exampleData: `12345\t富士苹果\n67890\t泰国香蕉\n54321\t赣南脐橙\n6901234567890\t蒙牛纯牛奶\n6971234567890123\t农夫山泉矿泉水\n888888\t原味薯片`,

        styles: `.bt-column-selects{display:flex;gap:var(--sp-3);flex-wrap:wrap}
.code-output{background:var(--bg-sub);color:var(--text-strong);border:1px solid var(--border);padding:var(--sp-4);border-radius:var(--r);overflow-x:auto;font-size:var(--fs-sm);white-space:pre-wrap;max-height:300px;font-family:Consolas,Monaco,"Courier New",monospace;line-height:1.5;margin:0}`
};

window.BarcodeToMapModule = BarcodeToMapModule;