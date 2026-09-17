/**
 * @description 标签打印模块
 * @author mr@cnwz.me
 * @since 2026-06-30
 * @lastupdate 2026-09-16
 * @version 1.0.0
 * @wiki https://gitee.com/{repo}/wikis/模块示例/标签打印
 * @rules ./rules/LabelPrintModule.md
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class LabelPrintModule {
    constructor(app) {
        this.app = app;
        this.title = LP_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-16';
        this.iconName = 'printer';
        this.introText = LP_TEXT.introText;
        this.helpDescription = LP_TEXT.helpDescription;
        this.data = [];
        this.headers = [];
        this.selectedColumn = '';
        this.printHeader = false;
        this.customVisible = false;
        this.checkedIndices = new Set();
        this.filteredIndices = [];
        this._iconCache = {
            printer: this.app.getIcon('printer'),
            reset: this.app.getIcon('arrow-clockwise'),
        };
    }

    injectStyles() {
        this.app.injectStyle(this.id, LP_TEXT.styles);
    }

    resetAll() {
        this.data = [];
        this.headers = [];
        this.selectedColumn = '';
        this.printHeader = false;
        this.customVisible = false;
        this.checkedIndices.clear();
        this.filteredIndices = [];

        const fileInput = document.getElementById('lpUploadExcel');
        if (fileInput) fileInput.value = '';
        document.getElementById('lpColumnSelection').style.display = 'none';
        document.getElementById('lpPreviewArea').style.display = 'none';
        document.getElementById('lpActionButtons').style.display = 'none';
        document.getElementById('lpCustomPrintArea').style.display = 'none';
        const previewContainer = document.getElementById('lpPreviewTableContainer');
        if (previewContainer) previewContainer.innerHTML = '';
        const select = document.getElementById('lpColumnSelect');
        if (select) select.innerHTML = '';
        const headerCheck = document.getElementById('lpPrintHeaderCheck');
        if (headerCheck) headerCheck.checked = false;
        const search = document.getElementById('lpCustomSearchInput');
        if (search) search.value = '';
        const printContainer = document.getElementById('printContainer');
        if (printContainer) printContainer.remove();
        const style = document.getElementById('printLabelStyle');
        if (style) style.remove();
        this.app.showMessage(LP_TEXT.msg_reset, 'success');
    }

    async handleFileUpload(file) {
        if (!file) return;
        try {
            const rows = await this.app.readExcel(file);
            if (rows.length < 2) {
                this.app.showMessage(LP_TEXT.msg_excelEmpty, 'error');
                return;
            }
            if (rows.length > 50000) {
                this.app.showMessage('数据超过 5 万行，请拆分后上传', 'error');
                return;
            }
            const headers = rows[0].map(h => String(h == null ? '' : h).trim());
            const data = rows.slice(1).map(r => {
                const obj = {};
                headers.forEach((h, i) => {
                    if (h) obj[h] = (r[i] !== undefined && r[i] !== null) ? r[i] : '';
                });
                return obj;
            }).filter(row => Object.keys(row).length > 0);
            if (data.length === 0) {
                this.app.showMessage(LP_TEXT.msg_excelEmpty, 'error');
                return;
            }
            this.headers = headers.filter(h => h);
            this.data = data;
            this.selectedColumn = this.headers[0] || '';
            this.printHeader = false;
            document.getElementById('lpPrintHeaderCheck').checked = false;
            this.checkedIndices.clear();
            this.renderColumnSelection();
            this.renderPreview();
            document.getElementById('lpColumnSelection').style.display = 'block';
            document.getElementById('lpPreviewArea').style.display = 'block';
            document.getElementById('lpActionButtons').style.display = 'flex';
            document.getElementById('lpCustomPrintArea').style.display = 'none';
            this.customVisible = false;
            this.app.showMessage(LP_TEXT.msg_loaded.replace('{n}', this.data.length), 'success');
        } catch (err) {
            this.app.showMessage(LP_TEXT.msg_parseFailed + err.message, 'error');
        }
    }

    renderColumnSelection() {
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
        const headerCheck = document.getElementById('lpPrintHeaderCheck');
        headerCheck.onchange = () => {
            this.printHeader = headerCheck.checked;
        };
    }

    renderPreview() {
        const container = document.getElementById('lpPreviewTableContainer');
        if (!container) return;
        const col = this.selectedColumn;
        if (!col) {
            container.innerHTML = `<p class="lp-pad">${LP_TEXT.msg_pickCol}</p>`;
            return;
        }
        const preview = this.data.slice(0, 5);
        let html = '<table><thead><tr><th>' + this.app.escapeHtml(col) + '</th></tr></thead><tbody>';
        preview.forEach(row => {
            html += '<tr><td>' + this.app.escapeHtml(row[col] || '') + '</td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    generateLabel(rowData, includeHeader) {
        const label = document.createElement('div');
        label.style.cssText = 'width:60mm; height:40mm; position:relative; box-sizing:border-box; page-break-after:always; margin:0; padding:0; border:1px solid #eee; background:#fff;';

        if (this.app.logoImage) {
            const img = document.createElement('img');
            img.src = this.app.logoImage;
            img.style.cssText = 'position:absolute; left:2.38mm; top:0.14mm; width:22.45mm; height:7.38mm;';
            label.appendChild(img);
        }

        const qrContainer = document.createElement('div');
        qrContainer.style.cssText = 'position:absolute; left:50%; top:8.12mm; transform:translateX(-50%); width:25.03mm; height:25.03mm;';
        const col = this.selectedColumn;
        const value = rowData[col] || '';
        const qrText = includeHeader ? `${col}:${value}` : value;

        try {
            const QR = window.qrcode || window.QRCode;
            if (!QR) throw new Error(LP_TEXT.err_qrLib);
            const qr = QR(0, 'H');
            qr.addData(qrText);
            qr.make();
            const imgData = qr.createDataURL(4);
            const qrImg = document.createElement('img');
            qrImg.src = imgData;
            qrImg.style.cssText = 'width:100%; height:100%;';
            qrContainer.appendChild(qrImg);
        } catch (e) {
            console.warn('二维码生成失败', e);
            qrContainer.textContent = LP_TEXT.err_qr;
        }
        label.appendChild(qrContainer);

        const textDiv = document.createElement('div');
        textDiv.style.cssText = `position:absolute; left:50%; top:33.14mm; transform:translateX(-50%); font-family:'微软雅黑','Microsoft YaHei',sans-serif; font-size:14px; color:#000; text-align:center; width:100%;`;
        textDiv.textContent = qrText;
        label.appendChild(textDiv);

        return label;
    }

    generateLabels(rows, includeHeader) {
        const fragment = document.createDocumentFragment();
        rows.forEach(row => fragment.appendChild(this.generateLabel(row, includeHeader)));
        return fragment;
    }

    async printLabels(rows, includeHeader) {
        if (rows.length === 0) {
            this.app.showMessage(LP_TEXT.msg_noDataToPrint, 'error');
            return;
        }
        const MAX_PRINT = 100;
        if (rows.length > MAX_PRINT) {
            this.app.showMessage(LP_TEXT.msg_printLimit.replace(/\{max\}/g, MAX_PRINT).replace('{n}', rows.length), 'warning');
            rows = rows.slice(0, MAX_PRINT);
        }

        const ok = await this.app.loadLibrary('qrcode');
        if (!ok) {
            this.app.showMessage(LP_TEXT.msg_qrLibFailed, 'error');
            return;
        }

        const fragment = this.generateLabels(rows, includeHeader);
        const printContainer = document.createElement('div');
        printContainer.id = 'printContainer';
        printContainer.style.cssText = 'display:none;';
        printContainer.appendChild(fragment);
        document.body.appendChild(printContainer);

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

        window.print();

        setTimeout(() => {
            if (printContainer.parentNode) printContainer.remove();
            const s = document.getElementById('printLabelStyle');
            if (s) s.remove();
        }, 1000);
    }

    async printAll() {
        if (this.data.length === 0 || !this.selectedColumn) {
            this.app.showMessage(LP_TEXT.msg_uploadFirst, 'error');
            return;
        }
        const rows = this.data.map(row => ({ ...row }));
        await this.printLabels(rows, this.printHeader);
    }

    async printSelectedRows() {
        if (this.checkedIndices.size === 0) {
            this.app.showMessage(LP_TEXT.msg_selectAtLeastOne, 'error');
            return;
        }
        const rows = Array.from(this.checkedIndices).map(idx => this.data[idx]);
        await this.printLabels(rows, this.printHeader);
    }

    toggleCustomPanel() {
        const panel = document.getElementById('lpCustomPrintArea');
        if (!panel) return;
        this.customVisible = !this.customVisible;
        panel.style.display = this.customVisible ? 'block' : 'none';
        if (this.customVisible) this.renderCustomList();
    }

    renderCustomList() {
        const container = document.getElementById('lpCustomRowList');
        if (!container) return;
        const col = this.selectedColumn;
        if (!col) {
            container.innerHTML = `<p class="lp-pad">${LP_TEXT.msg_pickColFirst}</p>`;
            return;
        }
        const searchInput = document.getElementById('lpCustomSearchInput');
        const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
        const filtered = this.data.map((row, idx) => {
            const val = String(row[col] || '').toLowerCase();
            if (searchVal && !val.includes(searchVal)) return null;
            return { row, idx, display: row[col] || '' };
        }).filter(item => item !== null);

        this.filteredIndices = filtered.map(item => item.idx);

        const selectedCount = document.getElementById('lpSelectedCount');
        if (selectedCount) {
            const total = this.filteredIndices.length;
            const checked = this.filteredIndices.filter(idx => this.checkedIndices.has(idx)).length;
            selectedCount.textContent = LP_TEXT.msg_selectedCount.replace('{checked}', checked).replace('{total}', total);
        }

        if (filtered.length === 0) {
            container.innerHTML = `<p class="lp-no-match">${LP_TEXT.msg_noMatch}</p>`;
            return;
        }

        let html = `<div class="lp-rows-container">`;
        filtered.forEach(({ idx, display }, index) => {
            const checked = this.checkedIndices.has(idx) ? 'checked' : '';
            const bgClass = index % 2 === 0 ? 'list-item-even' : 'list-item-odd';
            html += `<div class="list-item ${bgClass}">
                <div class="lp-row-index">${index + 1}</div>
                <div class="lp-row-checkbox-cell"><input type="checkbox" class="row-checkbox" data-index="${idx}" ${checked} /></div>
                <div class="lp-row-display">${this.app.escapeHtml(display)}</div>
            </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;

        container.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (e.target.checked) this.checkedIndices.add(idx);
                else this.checkedIndices.delete(idx);
                this.updateSelectedCount();
            });
        });
    }

    updateSelectedCount() {
        const selectedCount = document.getElementById('lpSelectedCount');
        if (!selectedCount) return;
        const total = this.filteredIndices.length;
        const checked = this.filteredIndices.filter(idx => this.checkedIndices.has(idx)).length;
        selectedCount.textContent = LP_TEXT.msg_selectedCount.replace('{checked}', checked).replace('{total}', total);
    }

    selectAllRows() {
        if (!this.filteredIndices.length) return;
        this.filteredIndices.forEach(idx => this.checkedIndices.add(idx));
        this.renderCustomList();
    }

    deselectAllRows() {
        if (!this.filteredIndices.length) return;
        this.filteredIndices.forEach(idx => this.checkedIndices.delete(idx));
        this.renderCustomList();
    }

    bindEvents(panel) {
        const fileInput = panel.querySelector('#lpUploadExcel');
        fileInput.addEventListener('change', async (e) => {
            await this.handleFileUpload(e.target.files[0]);
        });

        panel.querySelector('#lpResetBtn')?.addEventListener('click', () => this.resetAll());
        panel.querySelector('#lpPrintAllBtn')?.addEventListener('click', () => this.printAll());
        panel.querySelector('#lpToggleCustomBtn')?.addEventListener('click', () => this.toggleCustomPanel());
        panel.querySelector('#lpSelectAllBtn')?.addEventListener('click', () => this.selectAllRows());
        panel.querySelector('#lpDeselectAllBtn')?.addEventListener('click', () => this.deselectAllRows());
        panel.querySelector('#lpPrintSelectedBtn')?.addEventListener('click', () => this.printSelectedRows());

        const searchInput = panel.querySelector('#lpCustomSearchInput');
        if (searchInput) searchInput.addEventListener('input', () => this.renderCustomList());
    }

    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header">
                    <h2>${LP_TEXT.heading_upload}</h2>
                    ${this.app.getHelpButton(this.id)}
                </div>
                <div class="toolbar">
                    <div class="lp-file-wrap">
                        <input type="file" id="lpUploadExcel" accept=".xlsx,.xls" />
                    </div>
                    <button id="lpResetBtn" class="btn btn-secondary lp-btn-sm">${this._iconCache.reset} ${LP_TEXT.btn_reset}</button>
                </div>
                <div id="lpColumnSelection" class="panel-box" style="display:none;">
                    <h4>${LP_TEXT.heading_selectCol}</h4>
                    <div class="lp-col-select-wrap">
                        <select id="lpColumnSelect" class="lp-col-select"></select>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="lpPrintHeaderCheck" />
                        <label for="lpPrintHeaderCheck">${LP_TEXT.label_printHeader}</label>
                    </div>
                </div>
                <div id="lpPreviewArea" class="panel-box" style="display:none;">
                    <h4>${LP_TEXT.heading_preview}</h4>
                    <div id="lpPreviewTableContainer" class="lp-preview-table"></div>
                </div>
                <div id="lpActionButtons" class="btn-row" style="display:none;">
                    <button id="lpPrintAllBtn" class="btn btn-success">${this._iconCache.printer} ${LP_TEXT.btn_printAll}</button>
                    <button id="lpToggleCustomBtn" class="btn btn-secondary">${this._iconCache.printer} ${LP_TEXT.btn_customPrint}</button>
                </div>
                <div id="lpCustomPrintArea" class="lp-custom-area" style="display:none;">
                    <h4>${LP_TEXT.heading_customRows} <span id="lpSelectedCount" class="status-text"></span></h4>
                    <div class="toolbar lp-custom-toolbar">
                        <input type="text" id="lpCustomSearchInput" placeholder="${LP_TEXT.ph_search}" class="search-input" />
                        <button id="lpSelectAllBtn" class="btn btn-secondary lp-btn-sm">${LP_TEXT.btn_selectAll}</button>
                        <button id="lpDeselectAllBtn" class="btn btn-secondary lp-btn-sm">${LP_TEXT.btn_deselectAll}</button>
                        <button id="lpPrintSelectedBtn" class="btn btn-success lp-btn-sm">${this._iconCache.printer} ${LP_TEXT.btn_printSelected}</button>
                    </div>
                    <div id="lpCustomRowList" class="list-container"></div>
                </div>
            </div>
        `;
        this.bindEvents(panel);
    }
}

const LP_TEXT = {
    title: '标签打印(测试)',
    introText: '上传Excel生成二维码标签和打印',
    helpDescription: '<p>上传包含数据的Excel文件，选择要打印的列，生成二维码标签。</p><p>支持打印全部或自定义选择行。单次打印上限 100 张，超出自动截断。</p>',

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

    styles: `.lp-file-wrap{flex:1;min-width:200px}
.lp-col-select-wrap{max-width:300px}
.lp-col-select{width:100%;padding:8px}
.lp-preview-table{max-height:300px;overflow:auto;border:1px solid #ddd;border-radius:4px}
.lp-custom-area{margin-top:20px;border-top:2px solid #eee;padding-top:15px}
.lp-custom-toolbar{margin-bottom:12px}
.lp-btn-sm{padding:6px 16px}
.lp-rows-container{display:flex;flex-direction:column}
.lp-row-index{flex:0 0 40px;text-align:center;color:#888;font-size:12px}
.lp-row-checkbox-cell{flex:0 0 40px;text-align:center}
.lp-row-checkbox-cell input{margin:0}
.lp-row-display{flex:1;padding-left:12px;font-size:13px;word-break:break-all}
.lp-pad{padding:10px}
.lp-no-match{padding:10px;text-align:center;color:#999}
body.dark-mode .lp-preview-table{border-color:#4a4a58}
body.dark-mode .lp-custom-area{border-top-color:#3a3a48}
body.dark-mode .lp-row-index{color:#999}
body.dark-mode .lp-no-match{color:#888}`
};
window.LabelPrintModule = LabelPrintModule;