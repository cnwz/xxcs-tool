/**
 * @description 条码转键值Map模块
 * @author me@cnwz.me
 * @since 2026-06-05
 * @lastupdate 2026-09-16
 * @version 1.0.0
 * @wiki https://gitee.com/{repo}/wikis/模块示例/条码转键值
 * @rules ./rules/BarcodeToMapModule.md
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class BarcodeToMapModule {
    constructor(app) {
        this.app = app;
        this.title = BT_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-16';
        this.iconName = 'upc-scan';
        this.introText = BT_TEXT.introText;
        this.helpDescription = BT_TEXT.helpDescription;
        this._iconCache = {
            copy: this.app.getIcon('copy'),
            javascript: this.app.getIcon('javascript'),
            fileEarmarkExcel: this.app.getIcon('file-earmark-excel'),
        };
        this._uploadedData = null;
        this._currentColumns = null;
        this._generatedCode = '';
        this._generatedCount = 0;
    }

    injectStyles() {
        this.app.injectStyle(this.id, BT_TEXT.styles);
    }

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

    _buildMapEntry(row) {
        return `[${JSON.stringify(row.code)}, ${JSON.stringify(row.name)}]`;
    }

    _buildArrayEntry(row) {
        const freshVal = (row.fresh === '是' || row.fresh.toLowerCase() === 'true') ? '是' : '';
        return `[${JSON.stringify(row.code)}, ${JSON.stringify(row.name)}, ${JSON.stringify(freshVal)}]`;
    }

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

    _generate(isArray) {
        const rows = this._getDataRows();
        const outputPre = document.getElementById('btMapOutputCode');
        if (rows.length === 0) {
            this._generatedCode = '';
            this._generatedCount = 0;
            if (outputPre) outputPre.textContent = BT_TEXT.msg_noDataOutput;
            this.app.showMessage(BT_TEXT.msg_noData, 'error');
            return;
        }
        const buildEntry = isArray ? (r) => this._buildArrayEntry(r) : (r) => this._buildMapEntry(r);
        const fullEntries = rows.map(buildEntry).join(',\n');
        const fullCode = isArray
            ? `window.productMapData = [\n${fullEntries}\n];`
            : `window.productMapData = new Map([\n${fullEntries}\n]);`;
        this._generatedCode = fullCode;
        this._generatedCount = rows.length;

        const previewRows = rows.slice(0, 50);
        const previewEntries = previewRows.map(buildEntry).join(',\n');
        const suffix = rows.length > 50
            ? `\n// ... 省略 ${rows.length - 50} 行（复制/导出包含全部 ${rows.length} 条数据）`
            : '';
        const previewCode = isArray
            ? `window.productMapData = [\n${previewEntries}${suffix}\n];`
            : `window.productMapData = new Map([\n${previewEntries}${suffix}\n]);`;
        if (outputPre) outputPre.textContent = previewCode;

        const msg = isArray
            ? BT_TEXT.msg_genNewArrayOk.replace('{n}', rows.length)
            : BT_TEXT.msg_genOldMapOk.replace('{n}', rows.length);
        this.app.showMessage(msg, 'success');
    }

    async _handleExcelFile(file) {
        const uploadStatus = document.getElementById('btUploadStatus');
        const columnSelector = document.getElementById('btExcelColumnSelector');
        const codeColSelect = document.getElementById('btCodeColSelect');
        const nameColSelect = document.getElementById('btNameColSelect');
        const freshColSelect = document.getElementById('btFreshColSelect');
        const textarea = document.getElementById('btBarcodeRawData');

        try {
            const jsonData = await this.app.readExcel(file);
            if (jsonData.length < 2) {
                this.app.showMessage(BT_TEXT.msg_emptyFile, 'error');
                return;
            }
            if (jsonData.length > 50000) {
                this.app.showMessage('数据超过 5 万行，请拆分后上传', 'error');
                return;
            }
            const headers = jsonData[0].map(h => String(h).trim());
            const rows = jsonData.slice(1);
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
        } catch (err) {
            this.app.showMessage(BT_TEXT.msg_parseExcelFailed + err.message, 'error');
        }
    }

    _bindEvents(panel) {
        const textarea = panel.querySelector('#btBarcodeRawData');
        const generateOldBtn = panel.querySelector('#btGenerateOldMapBtn');
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

        generateOldBtn.addEventListener('click', () => this._generate(false));
        generateNewBtn.addEventListener('click', () => this._generate(true));

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
            this._generate(false);
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
            this._generate(false);
        });

        if (!textarea.value) loadExampleBtn.click();
    }

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
                        </div>
                    </div>
                </div>
                <div class="btn-row">
                    <button id="btGenerateOldMapBtn" class="btn btn-secondary">${BT_TEXT.btn_genOldMap}</button>
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

const BT_TEXT = {
    title: '条码转键值',
    introText: '将条码/商品对应表转为JS Map或数组，支持Excel上传，可生成新旧两种格式。',
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
    btn_genOldMap: '生成旧版Map (纯键值)',
    btn_genNewArray: '生成新版数组 (含当日鲜列)',
    label_output: '生成的代码 (预览前50行，超出显示…，复制/导出为全部数据)',
    outputPlaceholder: '// 点击生成按钮后显示结果',
    btn_copyCode: '复制代码',
    btn_saveJs: '保存为 productMap.js',

    msg_noData: '没有有效数据',
    msg_noDataOutput: '// 没有有效数据，请检查输入或上传文件。',
    msg_genOldMapOk: '生成旧版Map，共 {n} 条（已复制/导出为全部数据）',
    msg_genNewArrayOk: '生成新版数组，共 {n} 条（已复制/导出为全部数据）',
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

    exampleData: `12345\t富士苹果\n67890\t泰国香蕉\n54321\t赣南脐橙\n6901234567890\t蒙牛纯牛奶\n6971234567890123\t农夫山泉矿泉水\n888888\t原味薯片`,

    styles: `.bt-column-selects{display:flex;gap:12px;flex-wrap:wrap}
.code-output{background:#f6f8fa;color:#24292f;border:1px solid #e1e4e8;padding:16px;border-radius:10px;overflow-x:auto;font-size:13px;white-space:pre-wrap;max-height:300px;font-family:Consolas,Monaco,"Courier New",monospace;line-height:1.5;margin:0}
body.dark-mode .code-output{background:#1e1e2a;color:#e0e4e8;border-color:#3a3a44}`
};
window.BarcodeToMapModule = BarcodeToMapModule;