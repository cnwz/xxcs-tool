/**
 * @description 整理动线模块
 * @author me@cnwz.me
 * @since 2026-09-11
 * @lastupdate 2026-09-21
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/SortingModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class SortingModule {
    /**
     * @param {Core} app
     */
    constructor(app) {
        this.app = app;
        this.title = SM_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2026-09-21';
        this.iconName = 'list-ul';
        this.introText = SM_TEXT.introText;
        this.helpDescription = SM_TEXT.helpDescription;
        this.shelves = [];
        this.rawData = [];
        this.headers = [];
        this.headerIndex = {};
        this.dragSrcIndex = null;
        this.selectedCodesBeforeReorder = [];
        this.departmentPattern = (this.app.validations && this.app.validations.departmentPattern) || /^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/;
        this._iconCache = {
            gear: this.app.getIcon('gear'),
            arrowUp: this.app.getIcon('arrow-up'),
            arrowDown: this.app.getIcon('arrow-down'),
            xlsx: this.app.getIcon('filetype-xlsx'),
            refresh: this.app.getIcon('arrow-counterclockwise'),
            list: this.app.getIcon('list-ul'),
        };
    }

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, SM_TEXT.styles);
    }

    // ==================== 数据处理 ====================

    /**
     * 读取行中指定列的值
     * @param {Array} row
     * @param {string|number} key
     * @returns {string}
     */
    getCell(row, key) {
        const idx = typeof key === 'string' ? this.headerIndex[key] : key;
        if (idx === undefined || idx >= row.length) return '';
        const val = row[idx];
        return (val !== undefined && val !== null) ? String(val).trim() : '';
    }

    /**
     * 按别名列表查找列 key
     * @param {string[]} aliases
     * @returns {string|null}
     */
    findColumnKey(aliases) {
        for (let alias of aliases) {
            if (this.headerIndex[alias] !== undefined) return alias;
        }
        return null;
    }

    /**
     * 判断货架类型：含 DD 层为地堆，否则货架
     * @param {Object} shelf
     * @returns {string}
     */
    getShelfType(shelf) {
        for (const loc of shelf.locations) {
            const parts = loc.locationCode.split('-');
            if (parts.length >= 4 && parts[3] === 'DD') return SM_TEXT.shelfType_pile;
        }
        return SM_TEXT.shelfType_rack;
    }

    /** 按起始值和步长重算全部货架的排序值 */
    applySortOrder() {
        const start = parseInt(document.getElementById('smStartValue')?.value) || 10;
        const step = parseInt(document.getElementById('smStepValue')?.value) || 10;
        for (let i = 0; i < this.shelves.length; i++) {
            this.shelves[i].sortOrder = start + i * step;
        }
    }

    /**
     * 解析 Excel 行数据，构建 shelves
     * @param {Array<Array>} rows
     */
    processRawData(rows) {
        if (rows.length < 2) throw new Error(SM_TEXT.err_needTwoRows);
        this.headers = (rows[0] || []).map(h => String(h == null ? '' : h).trim());
        this.headerIndex = {};
        this.headers.forEach((h, idx) => { if (h) this.headerIndex[h] = idx; });

        const locationCodeKey = this.findColumnKey(['库位号', '库位编码']);
        const locationTypeKey = this.findColumnKey(['库位类型', '库位类别', '类型']);
        const warehouseKey = this.findColumnKey(['仓库名称', '所属仓库', '库区']);
        const sortingKey = this.findColumnKey(['分拣排序', '分拣优先级']);
        const departmentKey = this.findColumnKey(['所属部门', '部门']);

        if (!locationCodeKey || !locationTypeKey) {
            throw new Error(SM_TEXT.err_missingRequiredCols);
        }

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

            let parts = locationCode.split('-');
            let shelfCode = parts.slice(0, 3).join('-');
            if (parts.length < 3) shelfCode = locationCode;

            let warehouseName = '';
            if (warehouseKey) warehouseName = this.getCell(row, warehouseKey);
            if (!warehouseName && this.headerIndex['仓库名称'] !== undefined) warehouseName = this.getCell(row, '仓库名称');
            if (!warehouseName && this.headerIndex['库区'] !== undefined) warehouseName = this.getCell(row, '库区');

            let priorityRaw = sortingKey ? this.getCell(row, sortingKey) : '';
            let priorityNum = null;
            if (priorityRaw && !isNaN(parseFloat(priorityRaw))) {
                priorityNum = parseFloat(priorityRaw);
            }

            const locationItem = {
                locationCode: locationCode,
                warehouseName: warehouseName || '',
                originalSorting: priorityRaw,
                priority: priorityNum,
                department: department
            };
            if (!shelfMap.has(shelfCode)) {
                shelfMap.set(shelfCode, { code: shelfCode, locations: [], priority: priorityNum });
            } else {
                const existing = shelfMap.get(shelfCode);
                if (existing.priority === null && priorityNum !== null) existing.priority = priorityNum;
            }
            shelfMap.get(shelfCode).locations.push(locationItem);
        }
        if (shelfMap.size === 0) {
            throw new Error(SM_TEXT.err_noValidLocations);
        }
        this.shelves = Array.from(shelfMap.values()).map(shelf => ({
            code: shelf.code,
            locations: shelf.locations,
            originalPriority: shelf.priority,
            sortOrder: 0
        }));
        this.shelves.sort((a, b) => {
            if (a.originalPriority !== null && b.originalPriority !== null) {
                if (a.originalPriority !== b.originalPriority) return a.originalPriority - b.originalPriority;
            } else if (a.originalPriority !== null) return -1;
            else if (b.originalPriority !== null) return 1;
            return a.code.localeCompare(b.code);
        });
        this.applySortOrder();
    }

    /**
     * 按给定货架编码顺序重排
     * @param {string[]} orderList
     */
    reorderShelvesByCodeOrder(orderList) {
        this.captureSelectedCodes();
        const orderMap = new Map();
        orderList.forEach((code, idx) => { orderMap.set(code, idx); });
        const matched = [];
        const unmatched = [];
        for (const shelf of this.shelves) {
            if (orderMap.has(shelf.code)) matched.push(shelf);
            else unmatched.push(shelf);
        }
        matched.sort((a, b) => orderMap.get(a.code) - orderMap.get(b.code));
        this.shelves = [...matched, ...unmatched];
        this.applySortOrder();
        this.renderShelfList();
        this.app.showMessage(SM_TEXT.msg_reorderSuccess, 'success');
    }

    /**
     * 获取已勾选货架的下标列表
     * @returns {number[]}
     */
    getSelectedIndices() {
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
    }

    /** 记录当前勾选货架的编码 */
    captureSelectedCodes() {
        this.selectedCodesBeforeReorder = [];
        const checkboxes = document.querySelectorAll('#smShelfListContainer .item-checkbox:checked');
        checkboxes.forEach(cb => {
            const code = cb.getAttribute('data-code');
            if (code) this.selectedCodesBeforeReorder.push(code);
        });
    }

    /** 恢复勾选状态 */
    restoreSelectedCodes() {
        const checkboxes = document.querySelectorAll('#smShelfListContainer .item-checkbox');
        checkboxes.forEach(cb => {
            const code = cb.getAttribute('data-code');
            if (this.selectedCodesBeforeReorder.includes(code)) cb.checked = true;
            else cb.checked = false;
        });
        this.updateSelectedCount();
    }

    /**
     * 处理文件上传
     * @returns {Promise<void>}
     */
    async handleFileUpload(file) {
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
    }

    /**
     * 从 Excel 导入货架顺序
     * @returns {Promise<void>}
     */
    async importOrderFromExcel() {
        const fileInput = document.getElementById('smSortingOrderFileInput');
        const file = fileInput.files[0];
        if (!file) {
            this.app.showMessage(SM_TEXT.msg_pleaseSelectOrderFile, 'error');
            return;
        }
        try {
            const json = await this.app.readExcel(file);
            if (!json || json.length < 1) throw new Error(SM_TEXT.err_fileEmpty);
            let headerRow = json[0];
            let shelfCodeColIdx = -1;
            for (let i = 0; i < headerRow.length; i++) {
                const cell = String(headerRow[i] || '').toLowerCase();
                if (cell.includes('货架') || cell.includes('shelf') || cell.includes('编码') || cell === 'code') {
                    shelfCodeColIdx = i;
                    break;
                }
            }
            if (shelfCodeColIdx === -1) shelfCodeColIdx = 0;
            const orderList = [];
            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (row && row.length > shelfCodeColIdx) {
                    let code = row[shelfCodeColIdx];
                    if (code && typeof code === 'string') code = code.trim();
                    if (code) orderList.push(String(code));
                }
            }
            if (orderList.length === 0) throw new Error(SM_TEXT.err_noShelfCodes);
            this.reorderShelvesByCodeOrder(orderList);
            fileInput.value = '';
        } catch (err) {
            console.error(err);
            this.app.showMessage(SM_TEXT.msg_importOrderFailed + err.message, 'error');
        }
    }

    /** 从文本框导入货架顺序 */
    importOrderFromText() {
        const textarea = document.getElementById('smSortingOrderText');
        let rawText = textarea.value;
        if (!rawText.trim()) {
            this.app.showMessage(SM_TEXT.msg_enterCodesInText, 'warning');
            return;
        }
        let codes = [];
        if (rawText.includes('\n')) {
            codes = rawText.split(/\r?\n/);
        } else if (rawText.includes(',')) {
            codes = rawText.split(',');
        } else {
            codes = rawText.split(/\s+/);
        }
        codes = codes.map(c => c.trim()).filter(c => c.length > 0);
        if (codes.length === 0) {
            this.app.showMessage(SM_TEXT.msg_noCodesParsed, 'warning');
            return;
        }
        this.reorderShelvesByCodeOrder(codes);
        textarea.value = '';
    }

    /** 上移已勾选货架 */
    moveUpSelected() {
        let indices = this.getSelectedIndices();
        if (indices.length === 0) { this.app.showMessage(SM_TEXT.msg_selectShelvesFirst, 'warning'); return; }
        if (indices[0] === 0) { this.app.showMessage(SM_TEXT.msg_alreadyTop, 'warning'); return; }
        this.captureSelectedCodes();
        let newShelves = [...this.shelves];
        for (let idx of indices) {
            if (idx > 0) [newShelves[idx - 1], newShelves[idx]] = [newShelves[idx], newShelves[idx - 1]];
        }
        this.shelves = newShelves;
        this.applySortOrder();
        this.renderShelfList();
        this.app.showMessage(SM_TEXT.msg_moveUpOk, 'success');
    }

    /** 下移已勾选货架 */
    moveDownSelected() {
        let indices = this.getSelectedIndices();
        if (indices.length === 0) { this.app.showMessage(SM_TEXT.msg_selectShelvesFirst, 'warning'); return; }
        const maxIdx = this.shelves.length - 1;
        if (indices[indices.length - 1] === maxIdx) { this.app.showMessage(SM_TEXT.msg_alreadyBottom, 'warning'); return; }
        this.captureSelectedCodes();
        let newShelves = [...this.shelves];
        for (let i = indices.length - 1; i >= 0; i--) {
            let idx = indices[i];
            if (idx < maxIdx) [newShelves[idx + 1], newShelves[idx]] = [newShelves[idx], newShelves[idx + 1]];
        }
        this.shelves = newShelves;
        this.applySortOrder();
        this.renderShelfList();
        this.app.showMessage(SM_TEXT.msg_moveDownOk, 'success');
    }

    /**
     * 导出结果为 Excel
     * @returns {Promise<void>}
     */
    async exportResults() {
        if (!this.shelves.length) {
            this.app.showMessage(SM_TEXT.msg_nothingToExport, 'error');
            return;
        }
        const ok = await this.app.loadLibrary('xlsx');
        if (!ok) {
            this.app.showMessage('XLSX 库加载失败，请检查网络', 'error');
            return;
        }
        const exportRows = [];
        for (const shelf of this.shelves) {
            const sortVal = shelf.sortOrder;
            for (const loc of shelf.locations) {
                exportRows.push({
                    '仓库名称': loc.warehouseName,
                    '库位号': loc.locationCode,
                    '分拣排序': sortVal
                });
            }
        }
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
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, SM_TEXT.exportSheetName);
        const fileName = SM_TEXT.exportFileName.replace('{ts}', new Date().toISOString().slice(0, 19).replace(/:/g, '-'));
        const arr = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.app.download(arr, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        this.app.showMessage(SM_TEXT.msg_exportOk, 'success');
    }

    /** 重置模块到初始状态 */
    resetModule() {
        document.getElementById('smSortingResultArea').classList.add('hidden');
        const startInput = document.getElementById('smStartValue');
        const stepInput = document.getElementById('smStepValue');
        if (startInput) startInput.value = '10';
        if (stepInput) stepInput.value = '10';
        this.shelves = [];
        this.rawData = [];
        const container = document.getElementById('smShelfListContainer');
        if (container) container.innerHTML = '';
        this.app.showMessage(SM_TEXT.msg_reset, 'info');
    }

    /** 渲染货架列表 */
    renderShelfList() {
        const container = document.getElementById('smShelfListContainer');
        if (!container) return;
        container.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'sorting-list';
        ul.id = 'smSortingList';

        this.shelves.forEach((shelf, idx) => {
            const li = document.createElement('li');
            li.className = 'sorting-item';
            li.setAttribute('data-index', idx);
            li.setAttribute('data-code', shelf.code);
            li.draggable = true;

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'item-checkbox';
            chk.setAttribute('data-code', shelf.code);

            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.innerHTML = this._iconCache.list;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'sorting-item-content';
            const priorityText = shelf.originalPriority !== null
                ? SM_TEXT.badge_originalPriority.replace('{n}', shelf.originalPriority)
                : SM_TEXT.badge_originalPriorityNone;
            const shelfType = this.getShelfType(shelf);
            contentDiv.innerHTML = `
                <span class="shelf-code">${this.app.escapeHtml(shelf.code)}</span>
                <span class="shelf-type-badge">${shelfType}</span>
                <span class="original-priority-badge">${priorityText}</span>
                <span class="sort-order-badge">${SM_TEXT.badge_newSortOrder.replace('{n}', shelf.sortOrder)}</span>
            `;

            li.appendChild(chk);
            li.appendChild(handle);
            li.appendChild(contentDiv);
            ul.appendChild(li);
        });
        container.appendChild(ul);
        this.initDragAndDrop();
        this.restoreSelectedCodes();
    }

    /** 初始化拖拽排序事件 */
    initDragAndDrop() {
        const items = document.querySelectorAll('#smSortingList .sorting-item');
        const handleDragStart = (e) => {
            const li = e.target.closest('.sorting-item');
            if (!li) return;
            this.dragSrcIndex = parseInt(li.getAttribute('data-index'));
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.dragSrcIndex);
            li.classList.add('dragging');
        };
        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const targetLi = e.target.closest('.sorting-item');
            if (targetLi && targetLi !== document.querySelector('.dragging')) targetLi.classList.add('drag-over');
        };
        const handleDragLeave = (e) => {
            const targetLi = e.target.closest('.sorting-item');
            if (targetLi) targetLi.classList.remove('drag-over');
        };
        const handleDrop = (e) => {
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
        };
        const handleDragEnd = () => {
            document.querySelectorAll('.sorting-item').forEach(item => item.classList.remove('dragging', 'drag-over'));
            this.dragSrcIndex = null;
        };
        items.forEach(item => {
            item.removeEventListener('dragstart', handleDragStart);
            item.removeEventListener('dragover', handleDragOver);
            item.removeEventListener('dragleave', handleDragLeave);
            item.removeEventListener('drop', handleDrop);
            item.removeEventListener('dragend', handleDragEnd);
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('dragleave', handleDragLeave);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });
    }

    /** 刷新已选数量显示 */
    updateSelectedCount() {
        const count = this.getSelectedIndices().length;
        const span = document.getElementById('smSelectedCount');
        if (span) span.textContent = SM_TEXT.selectedCount.replace('{n}', count);
    }

    /**
     * 绑定面板事件
     * @param {HTMLElement} panel
     */
    bindEvents(panel) {
        panel.querySelector('#smSortingMoveUpBtn')?.addEventListener('click', () => this.moveUpSelected());
        panel.querySelector('#smSortingMoveDownBtn')?.addEventListener('click', () => this.moveDownSelected());
        panel.querySelector('#smSortingExportBtn')?.addEventListener('click', () => this.exportResults());
        panel.querySelector('#smSortingResetBtn')?.addEventListener('click', () => this.resetModule());
        panel.querySelector('#smImportOrderExcelBtn')?.addEventListener('click', () => this.importOrderFromExcel());
        panel.querySelector('#smApplyOrderTextBtn')?.addEventListener('click', () => this.importOrderFromText());
        const startEl = panel.querySelector('#smStartValue');
        const stepEl = panel.querySelector('#smStepValue');
        const updateHandler = () => {
            if (this.shelves.length) {
                this.applySortOrder();
                this.renderShelfList();
            }
        };
        if (startEl) startEl.addEventListener('input', updateHandler);
        if (stepEl) stepEl.addEventListener('input', updateHandler);
        panel.querySelector('#smShelfListContainer')?.addEventListener('change', (e) => {
            if (e.target.classList && e.target.classList.contains('item-checkbox')) this.updateSelectedCount();
        });
    }

    // ==================== UI ====================

    /** 渲染模块面板 */
    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                ${this.app.uploadSection({
                    title: SM_TEXT.title,
                    moduleId: this.id,
                    btnId: 'smSortingUploadBtn',
                    btnLabel: SM_TEXT.btn_upload,
                })}
            </div>
            <div id="smSortingResultArea" class="section hidden">
                <div class="table-header"><h2>${SM_TEXT.heading_sort}</h2></div>
                <div class="notice sm-notice-bar">${SM_TEXT.tip_sort}</div>
                <div class="sm-collapsible-wrap">
                    <div class="sm-collapsible-header" id="smSortingParamToggle">
                        <span>${this._iconCache.gear}  ${SM_TEXT.heading_paramToggle}</span>
                        <span class="sm-collapsible-arrow">▼</span>
                    </div>
                    <div class="sm-collapsible-content" id="smSortingParamContent">
                        <div class="sm-param-row">
                            <div class="sm-param-item">
                                <label for="smStartValue">${SM_TEXT.label_startValue}</label>
                                <input type="number" id="smStartValue" value="10" step="1" min="0">
                            </div>
                            <div class="sm-param-item">
                                <label for="smStepValue">${SM_TEXT.label_stepValue}</label>
                                <input type="number" id="smStepValue" value="10" step="1" min="1">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="sm-order-import">
                    <div class="sm-order-row">
                        <div class="sm-order-excel">
                            <label for="smSortingOrderFileInput">${SM_TEXT.label_importOrderExcel}</label>
                            <input type="file" id="smSortingOrderFileInput" accept=".xls,.xlsx">
                            <button id="smImportOrderExcelBtn" class="btn btn-secondary sm-btn-sm">${SM_TEXT.btn_importOrderExcel}</button>
                        </div>
                        <div class="sm-order-text">
                            <label for="smSortingOrderText">${SM_TEXT.label_importOrderText}</label>
                            <textarea id="smSortingOrderText" rows="2" placeholder="${SM_TEXT.ph_importOrderText}"></textarea>
                            <button id="smApplyOrderTextBtn" class="btn btn-secondary sm-btn-sm">${SM_TEXT.btn_applyOrderText}</button>
                        </div>
                    </div>
                </div>
                <div class="btn-row sm-actions">
                    <button id="smSortingMoveUpBtn" class="btn btn-secondary sm-btn-sm">${this._iconCache.arrowUp} ${SM_TEXT.btn_moveUp}</button>
                    <button id="smSortingMoveDownBtn" class="btn btn-secondary sm-btn-sm">${this._iconCache.arrowDown} ${SM_TEXT.btn_moveDown}</button>
                    <button id="smSortingExportBtn" class="btn">${this._iconCache.xlsx} ${SM_TEXT.btn_export}</button>
                    <button id="smSortingResetBtn" class="btn btn-secondary">${this._iconCache.refresh} ${SM_TEXT.btn_reset}</button>
                    <span id="smSelectedCount" class="status-text" style="margin-left:auto">${SM_TEXT.selectedCount.replace('{n}', 0)}</span>
                </div>
                <div class="sorting-list-wrapper" id="smShelfListContainer"></div>
                <div class="sm-foot-note">${SM_TEXT.footNote}</div>
            </div>
        `;
        const toggleBtn = panel.querySelector('#smSortingParamToggle');
        const content = panel.querySelector('#smSortingParamContent');
        if (toggleBtn && content) {
            toggleBtn.addEventListener('click', () => {
                const isVisible = content.style.display !== 'none';
                content.style.display = isVisible ? 'none' : 'block';
                toggleBtn.querySelector('.sm-collapsible-arrow').innerHTML = isVisible ? '▲' : '▼';
            });
        }
        this.bindEvents(panel);
        this.app.bindUploadSection({btnId: 'smSortingUploadBtn',onFile: (file) => this.handleFileUpload(file),});
        this.app._log(`${this.title} 模块加载成功`);
    }
}

// ==================== 文案 ====================

const SM_TEXT = {
    title: '整理动线',
    introText: '上传包含分拣位的货架数据，按货架整理分拣顺序，支持拖拽排序和批量移动，自动生成间隔10的分拣排序值。',
    helpDescription: '<p>上传导出的Excel文件（格式需包含"库位号"、"库位类型"、"分拣排序"、"所属仓库/库区"等字段）。</p><p>系统将自动提取库位号的前三段作为货架标识，筛选出所有"分拣位"库位，并按照原"分拣排序"值升序排列货架。</p><p>可拖拽调整货架顺序或使用多选按钮批量移动，最终按顺序每货架递增10生成新的"分拣排序"值。</p><p>导出结果仅填写"库位号"、"仓库名称"、"分拣排序"，其余字段留空，可直接用于批量更改。</p><p>也可通过"导入顺序(Excel)"或"按输入顺序排序"快速调整货架顺序。</p><p>可设置起始值和步长（默认10，可折叠）。</p>',

    btn_upload: '上传并解析',
    heading_sort: '货架动线排序',
    tip_sort: '提示：已经按原"分拣排序"值升序排列货架。直接拖拽列表项可调整顺序，或勾选货架后点击【上移/下移】批量移动。最终每个货架下的所有库位将获得新的分拣排序值（步长10）。',
    heading_paramToggle: '排序参数设置',
    label_startValue: '起始值',
    label_stepValue: '步长',
    label_importOrderExcel: '导入顺序(Excel):',
    btn_importOrderExcel: '按Excel顺序排序',
    label_importOrderText: '手动输入顺序(货架编码，每行一个或用逗号/空格分隔):',
    ph_importOrderText: '例如:\nA-01-01, B-02-03, C-03-05\n或每行一个',
    btn_applyOrderText: '按输入顺序排序',
    btn_moveUp: '上移选中',
    btn_moveDown: '下移选中',
    btn_export: '导出结果',
    btn_reset: '重置',
    selectedCount: '已选择 {n} 个货架',
    footNote: '* 每个货架下包含所有分拣位库位，拖拽调整顺序后分拣值自动重新计算。',

    shelfType_pile: '地堆',
    shelfType_rack: '货架',
    badge_originalPriority: '原优先级: {n}',
    badge_originalPriorityNone: '原优先级: 无',
    badge_newSortOrder: '新分拣值: {n}',

    exportSheetName: '批量更改',
    exportFileName: '分拣顺序调整_{ts}.xlsx',

    msg_parseSuccess: '文件解析成功，已加载分拣位数据',
    msg_parseFailed: '解析失败: ',
    msg_readFileFailed: '读取文件失败',
    msg_reorderSuccess: '货架顺序已按指定方式重新排列',
    msg_pleaseSelectOrderFile: '请选择顺序文件',
    msg_importOrderFailed: '导入顺序失败: ',
    msg_enterCodesInText: '请在文本框中输入货架编码',
    msg_noCodesParsed: '未解析出货架编码',
    msg_selectShelvesFirst: '请先勾选要移动的货架',
    msg_alreadyTop: '已经在顶部，无法上移',
    msg_moveUpOk: '已上移选中货架',
    msg_alreadyBottom: '已经在底部，无法下移',
    msg_moveDownOk: '已下移选中货架',
    msg_nothingToExport: '没有数据可导出',
    msg_exportOk: '导出成功，文件已下载',
    msg_reset: '已重置',

    err_needTwoRows: '至少需要两行数据',
    err_fileEmpty: '文件内容为空',
    err_missingRequiredCols: '缺少必要字段: 库位号/库位编码 或 库位类型',
    err_noValidLocations: '未找到任何符合条件的"分拣位"库位（需为分拣位且所属部门格式正确）',
    err_noShelfCodes: '未找到货架编码数据',

    styles: `.sorting-list{list-style:none;margin:0;padding:0}
.sorting-item{display:flex;align-items:center;padding:var(--sp-3) var(--sp-4);border-bottom:1px solid var(--border-soft);background-color:var(--bg-panel);cursor:grab;transition:background var(--t-fast)}
.sorting-item:hover{background:var(--bg-sub)}
.sorting-item.dragging{opacity:.5}
.sorting-item.drag-over{background:var(--accent-soft)}
.sorting-item .drag-handle{font-size:20px;margin-right:var(--sp-4);cursor:grab;color:var(--text-muted)}
.sorting-item .item-checkbox{margin-right:var(--sp-4);width:20px;height:20px;flex-shrink:0}
.sorting-item-content{flex:1;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-2)}
.shelf-code{font-weight:700;font-family:monospace;background:var(--bg-sub);color:var(--text-strong);padding:var(--sp-1) var(--sp-3);border-radius:var(--r-pill)}
.shelf-type-badge{background:var(--bg-sub);color:var(--text);padding:var(--sp-1) var(--sp-3);border-radius:var(--r-pill);font-size:var(--fs-xs)}
.original-priority-badge{background:var(--bg-sub);color:var(--text);padding:var(--sp-1) var(--sp-3);border-radius:var(--r-pill);font-size:var(--fs-xs)}
.sort-order-badge{background:var(--accent);color:#1e2a3e;padding:var(--sp-1) var(--sp-3);border-radius:var(--r-pill);font-weight:700}
.sorting-list-wrapper{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg-panel);max-height:500px;overflow-y:auto}
.sm-notice-bar{margin-bottom:var(--sp-3)}
.sm-collapsible-wrap{margin-bottom:var(--sp-3)}
.sm-collapsible-header{background:var(--bg-sub);padding:var(--sp-3) var(--sp-4);border-radius:var(--r);cursor:pointer;display:flex;justify-content:space-between;align-items:center;color:var(--text-strong)}
.sm-collapsible-arrow{font-size:var(--fs-lg)}
.sm-collapsible-content{display:none;padding:var(--sp-4);background:var(--bg-sub);border-radius:var(--r);margin-top:var(--sp-2)}
.sm-param-row{display:flex;gap:var(--sp-5);flex-wrap:wrap}
.sm-param-item{flex:1}
.sm-param-item label{font-weight:600}
.sm-param-item input{width:100%}
.sm-order-import{background:var(--bg-sub);padding:var(--sp-4);border-radius:var(--r);margin-bottom:var(--sp-4)}
.sm-order-row{display:flex;flex-wrap:wrap;gap:var(--sp-5);align-items:flex-end}
.sm-order-excel{flex:2;min-width:200px}
.sm-order-text{flex:3;min-width:260px}
.sm-order-text textarea{width:100%}
.sm-actions{margin-bottom:var(--sp-4);align-items:center}
.sm-btn-sm{padding:var(--sp-2) var(--sp-4)}
.sm-foot-note{margin-top:var(--sp-3);font-size:var(--fs-sm);color:var(--text-muted)}`
};

window.SortingModule = SortingModule;