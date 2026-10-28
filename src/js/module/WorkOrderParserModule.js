/**
 * @description 工单解析模块，按分拣员分组，以 MD 阅读器形式浏览工单详情，并提供统计与反向钻取。
 * @author me@cnwz.me
 * @since 2026-09-10
 * @lastupdate 2026-09-24
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/WorkOrderParserModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class WorkOrderParserModule {
    /**
     * @param {Core} app
     */
    constructor(app) {
        this.app = app;
        this.title = WO_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2026-09-24';
        this.iconName = 'journal-text';
        this.introText = WO_TEXT.introText;
        this.helpDescription = WO_TEXT.helpDescription;

        this._pickers = new Map();
        this._sortedPickers = [];
        this._flat = [];
        this._currentPickerKey = null;
        this._currentOrderId = null;
        this._currentTab = 'station';
        this._viewMode = 'C';
        this._stats = { totalRows: 0, orderCount: 0, pickerCount: 0 };
        this._scrollRaf = null;
        this._scrollHandler = null;
        this._documentClickHandler = null;
        this._viewerKeyHandler = null;

        this._workOrderStats = null;
        this._charts = [];

        this._iconCache = {
            reset: this.app.getIcon('arrow-counterclockwise'),
        };
    }

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, WO_TEXT.styles);
    }

    // ==================== 解析 ====================

    /**
     * 解析 Excel 行数据，按分拣员和订单归组
     * @param {Array<Array>} rows
     */
    _parseRows(rows) {
        const header = (rows[0] || []).map(h => String(h == null ? '' : h).trim());
        const findCol = (keywords) => {
            for (let i = 0; i < header.length; i++) {
                const h = header[i];
                if (!h) continue;
                for (const kw of keywords) {
                    if (h === kw) return i;
                }
            }
            return -1;
        };
        const col = {
            workOrderId: findCol(['工单号']),
            orderId: findCol(['订单号']),
            picker: findCol(['分拣员mis', '分拣员']),
            courier: findCol(['配送员mis', '配送员']),
            productName: findCol(['商品名称']),
            feedback: findCol(['问题反馈']),
            attachments: findCol(['附件']),
            result: findCol(['处理结果']),
            orderDate: findCol(['订单日期']),
            packCompleteTime: findCol(['打包完成时间']),
            woCreatedDate: findCol(['工单创建日期']),
            woCreatedTime: findCol(['工单创建时间']),
            category1: findCol(['判责&工单实际一级业务分类名称']),
            faqName: findCol(['判责FAQ名称', '判责&工单实际FAQ']),
            finalResponsible: findCol(['终判责任方']),
            initialResponsible: findCol(['初判责任方']),
            originalResponsible: findCol(['原始责任方']),
        };

        const hasInitialFinal = col.initialResponsible >= 0 || col.finalResponsible >= 0;
        const hasOriginal = col.originalResponsible >= 0;

        const pickers = new Map();
        let totalRows = 0;
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            const get = (idx) => idx >= 0 ? String(row[idx] == null ? '' : row[idx]).trim() : '';
            const orderId = get(col.orderId);
            if (!orderId) continue;
            const pickerName = get(col.picker) || WO_TEXT.defaultPicker;
            const workOrderId = get(col.workOrderId) || '__none__';
            const woCreatedDate = get(col.woCreatedDate);
            const woCreatedTime = get(col.woCreatedTime);
            const woCreatedAt = [woCreatedDate, woCreatedTime].filter(Boolean).join(' ');
            const orderDateRaw = get(col.orderDate) || get(col.packCompleteTime) || woCreatedDate;
            const orderDate = this._formatDate(orderDateRaw);
            const categoryRaw = get(col.category1);
            const faqRaw = get(col.faqName);
            const finalVal = get(col.finalResponsible);
            const initialVal = get(col.initialResponsible);
            const originalVal = get(col.originalResponsible);
            const productName = get(col.productName);

            // 责任方：分两部分渲染，初判/终判/原始均按"是否等于门店"着色
            // 判定（isStation）只以终判（或原始责任方）为准
            let responsibleText = '';
            let responsibleParts = [];
            let isStation = false;
            if (hasInitialFinal) {
                const parts = [];
                if (initialVal) {
                    parts.push(WO_TEXT.responsibleInitial.replace('{val}', initialVal));
                    responsibleParts.push({
                        label: WO_TEXT.meta_initialLabel,
                        value: initialVal,
                        isStation: (initialVal === WO_TEXT.stationResponsible)
                    });
                }
                if (finalVal) {
                    parts.push(WO_TEXT.responsibleFinal.replace('{val}', finalVal));
                    const finalIsStation = (finalVal === WO_TEXT.stationResponsible);
                    responsibleParts.push({
                        label: WO_TEXT.meta_finalLabel,
                        value: finalVal,
                        isStation: finalIsStation
                    });
                    isStation = finalIsStation;
                } else if (initialVal) {
                    isStation = (initialVal === WO_TEXT.stationResponsible);
                }
                responsibleText = parts.join('　');
            } else if (hasOriginal) {
                responsibleText = originalVal ? WO_TEXT.responsibleOriginal.replace('{val}', originalVal) : '';
                if (originalVal) {
                    const origIsStation = (originalVal === WO_TEXT.stationResponsible);
                    responsibleParts.push({
                        label: WO_TEXT.meta_originalLabel,
                        value: originalVal,
                        isStation: origIsStation
                    });
                    isStation = origIsStation;
                }
            }

            let category = 'product';
            if (categoryRaw.includes(WO_TEXT.category_fulfillment)) category = 'fulfillment';
            else if (categoryRaw.includes(WO_TEXT.category_product)) category = 'product';
            else if (faqRaw.includes('少送') || faqRaw.includes('错送')) category = 'fulfillment';

            const record = {
                workOrderId: workOrderId,
                orderId: orderId,
                picker: pickerName,
                courier: get(col.courier),
                productName: productName,
                feedback: get(col.feedback),
                attachments: this._parseAttachments(get(col.attachments)),
                result: get(col.result),
                workOrderCreatedAt: woCreatedAt,
                responsibleText: responsibleText,
                responsibleParts: responsibleParts,
                faqName: faqRaw,
                category: category,
                orderDate: orderDate,
                isStation: isStation,
            };
            if (!pickers.has(pickerName)) pickers.set(pickerName, new Map());
            const orderMap = pickers.get(pickerName);
            if (!orderMap.has(orderId)) {
                orderMap.set(orderId, {
                    orderId: orderId,
                    workOrders: new Map(),
                    orderDate: orderDate,
                });
            }
            const order = orderMap.get(orderId);
            if (!order.orderDate && orderDate) order.orderDate = orderDate;

            if (!order.workOrders.has(workOrderId)) {
                order.workOrders.set(workOrderId, { workOrderId: workOrderId, rows: [] });
            }
            order.workOrders.get(workOrderId).rows.push(record);
            totalRows++;
        }
        let totalOrders = 0;
        for (const orderMap of pickers.values()) totalOrders += orderMap.size;
        this._pickers = pickers;
        this._sortedPickers = Array.from(pickers.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        this._currentPickerKey = this._sortedPickers.length ? this._sortedPickers[0] : null;
        this._stats = { totalRows: totalRows, orderCount: totalOrders, pickerCount: pickers.size };
        this._workOrderStats = null;
        this._charts = [];
    }

    /**
     * 归一化日期为 yyyy-mm-dd
     * @param {*} val
     * @returns {string}
     */
    _formatDate(val) {
        if (!val) return '';
        const s = String(val).trim();
        const m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        return s;
    }

    /**
     * 解析附件字段为 URL 列表
     * @param {string} str
     * @returns {string[]}
     */
    _parseAttachments(str) {
        if (!str) return [];
        return str.split(/[;；]/)
            .map(s => s.trim())
            .filter(s => s && (/^https?:\/\//i.test(s) || s.startsWith('data:image')));
    }

    // ==================== 过滤（行级） ====================

    /**
     * 获取分拣员名下符合当前 tab 的订单列表，每个工单只保留符合条件的行
     * @param {string} pickerKey
     * @returns {Array<Object>}
     */
    _getFilteredOrders(pickerKey) {
        const orderMap = this._pickers.get(pickerKey);
        if (!orderMap) return [];
        const wantStation = this._currentTab === 'station';
        const result = [];
        orderMap.forEach(order => {
            const filteredWo = new Map();
            order.workOrders.forEach((wo, key) => {
                const filteredRows = wo.rows.filter(r => r.isStation === wantStation);
                if (filteredRows.length > 0) {
                    filteredWo.set(key, { workOrderId: wo.workOrderId, rows: filteredRows });
                }
            });
            if (filteredWo.size > 0) {
                result.push({
                    orderId: order.orderId,
                    orderDate: order.orderDate,
                    workOrders: filteredWo,
                });
            }
        });
        result.sort((a, b) => b.orderId.localeCompare(a.orderId));
        return result;
    }

    /**
     * 获取当前 tab 下有数据的分拣员列表
     * @returns {string[]}
     */
    _getFilteredPickers() {
        const wantStation = this._currentTab === 'station';
        return this._sortedPickers.filter(pickerKey => {
            const orderMap = this._pickers.get(pickerKey);
            if (!orderMap) return false;
            let has = false;
            orderMap.forEach(order => {
                if (has) return;
                order.workOrders.forEach(wo => {
                    if (has) return;
                    if (wo.rows.some(r => r.isStation === wantStation)) has = true;
                });
            });
            return has;
        });
    }

    /**
     * 统计指定 tab 下的工单数（工单级去重）
     * @param {boolean} isStation
     * @returns {number}
     */
    _countByTab(isStation) {
        let count = 0;
        this._pickers.forEach(orderMap => {
            orderMap.forEach(order => {
                order.workOrders.forEach(wo => {
                    if (wo.rows.some(r => r.isStation === isStation)) count++;
                });
            });
        });
        return count;
    }

    // ==================== 事件 ====================

    /**
     * 绑定面板事件
     * @param {HTMLElement} panel
     */
    _bindEvents(panel) {
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }
        this._documentClickHandler = (e) => {
            if (this._viewMode === 'C') return;
            if (e.target.closest && e.target.closest('.wo-columns')) return;
            if (e.target.closest && e.target.closest('.img-viewer')) return;
            const cols = document.getElementById('woColumns');
            if (!cols || cols.offsetParent === null) return;
            this._viewMode = 'C';
            this._applyViewMode();
        };
        document.addEventListener('click', this._documentClickHandler);
    }

    /**
     * 处理上传的工单 Excel
     * @param {File} file
     * @returns {Promise<void>}
     */
    async _handleFile(file) {
        const MAX_FILE_SIZE = 20 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            this.app.showMessage(WO_TEXT.msg_fileTooLarge, 'error');
            return;
        }

        this.app.showLoading(this.id, WO_TEXT.msg_parsing);
        try {
            const table = await this.app.readExcelTable(file, {
                emptyMessage: WO_TEXT.msg_emptyFile,
                tooManyMessage: WO_TEXT.msg_tooManyRows,
                parseErrorMessage: WO_TEXT.msg_parseFailed,
            });
            if (!table) return;

            const rows = [table.headers, ...table.rows];
            this._parseRows(rows);
            this._renderAll();
            this.app.showMessage(WO_TEXT.msg_parseOk.replace('{n}', this._stats.totalRows), 'success');
        } finally {
            this.app.hideLoading(this.id);
        }
    }

    // ==================== 渲染 ====================

    /** 全量渲染：tab、分拣员列表、正文 */
    _renderAll() {
        const contentArea = document.getElementById('woContentArea');
        if (!this._pickers.size) {
            contentArea.style.display = 'none';
            this.app.showMessage(WO_TEXT.emptyAfterParse, 'error');
            return;
        }
        contentArea.style.display = 'block';
        const stationCount = this._countByTab(true);
        const nonStationCount = this._countByTab(false);
        this._currentTab = (stationCount === 0 && nonStationCount > 0) ? 'nonStation' : 'station';
        this._viewMode = 'C';
        this._currentOrderId = null;
        this._renderTabBar();
        this._renderPickerList();
        this._renderPickerContent();
        this._applyViewMode();
        this._updateViewByTab();
        if (this._flat.length > 0) {
            this._setActive(this._flat[0].orderId);
        }
    }

    /** 根据当前 tab 切换内容区可见性 */
    _updateViewByTab() {
        const cols = document.getElementById('woColumns');
        const stats = document.getElementById('woStatsArea');
        if (!cols || !stats) return;
        if (this._currentTab === 'stats') {
            cols.style.display = 'none';
            stats.style.display = 'block';
        } else {
            cols.style.display = '';
            stats.style.display = 'none';
        }
    }

    /** 渲染顶部 tab 栏 */
    _renderTabBar() {
        const bar = document.getElementById('woTabBar');
        if (!bar) return;
        const stationCount = this._countByTab(true);
        const nonStationCount = this._countByTab(false);
        bar.innerHTML = `
            <button class="wo-tab-btn${this._currentTab === 'station' ? ' active' : ''}" data-tab="station">${WO_TEXT.tab_station.replace('{n}', stationCount)}</button>
            <button class="wo-tab-btn${this._currentTab === 'nonStation' ? ' active' : ''}" data-tab="nonStation">${WO_TEXT.tab_nonStation.replace('{n}', nonStationCount)}</button>
            <button class="wo-tab-btn${this._currentTab === 'stats' ? ' active' : ''}" data-tab="stats">${WO_TEXT.tab_stats}</button>
        `;
        bar.querySelectorAll('.wo-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab === this._currentTab) return;
                this._currentTab = tab;
                this._renderTabBar();
                if (tab === 'stats') {
                    this._updateViewByTab();
                    this._renderStatsArea();
                } else {
                    this._currentOrderId = null;
                    this._viewMode = 'C';
                    this._updateViewByTab();
                    this._renderPickerList();
                    this._renderPickerContent();
                    this._applyViewMode();
                    if (this._flat.length > 0) {
                        this._setActive(this._flat[0].orderId);
                    }
                }
            });
        });
    }

    /** 渲染分拣员列表（全量 + slim） */
    _renderPickerList() {
        const listEl = document.getElementById('woPickerList');
        const slimEl = document.getElementById('woPickerSlim');
        if (!listEl || !slimEl) return;
        const list = this._getFilteredPickers();
        if (!list.includes(this._currentPickerKey)) {
            this._currentPickerKey = list.length ? list[0] : null;
        }
        listEl.innerHTML = '';
        slimEl.innerHTML = '';
        if (list.length === 0) {
            const li = document.createElement('li');
            li.className = 'wo-empty-hint';
            li.textContent = WO_TEXT.emptyTabHint;
            listEl.appendChild(li);
            return;
        }
        const esc = (s) => this.app.escapeHtml(s);
        list.forEach(pickerKey => {
            const orders = this._getFilteredOrders(pickerKey);
            // 工单数
            let woCount = 0;
            orders.forEach(o => { woCount += o.workOrders.size; });
            const li = document.createElement('li');
            li.innerHTML = `<div class="wo-picker-item${pickerKey === this._currentPickerKey ? ' active' : ''}" data-picker="${esc(pickerKey)}"><span class="wo-picker-name">${esc(pickerKey)}</span><span class="wo-picker-count" title="${woCount} ${WO_TEXT.woUnit}">${woCount}</span></div>`;
            listEl.appendChild(li);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-btn' + (pickerKey === this._currentPickerKey ? ' active' : '');
            btn.dataset.picker = pickerKey;
            btn.title = pickerKey;
            btn.innerHTML = this.app.getIcon('person',20);
            slimEl.appendChild(btn);
        });

        const selectPicker = (picker) => {
            this._currentPickerKey = picker;
            this._currentOrderId = null;
            this._viewMode = 'A';
            this._renderPickerList();
            this._renderPickerContent();
            this._applyViewMode();
            if (this._flat.length > 0) {
                this._setActive(this._flat[0].orderId);
            }
        };
        listEl.onclick = (e) => {
            e.stopPropagation();
            const item = e.target.closest('.wo-picker-item');
            if (!item) return;
            selectPicker(item.dataset.picker);
        };
        slimEl.onclick = (e) => {
            e.stopPropagation();
            const btn = e.target.closest('.icon-btn');
            if (!btn) return;
            selectPicker(btn.dataset.picker);
        };
    }

    /** 应用视图模式（A: picker 展开, B: 订单展开, C: 默认） */
    _applyViewMode() {
        const cols = document.getElementById('woColumns');
        if (!cols) return;
        cols.classList.remove('state-a', 'state-b');
        if (this._viewMode === 'A') cols.classList.add('state-a');
        else if (this._viewMode === 'B') cols.classList.add('state-b');
    }

    /** 渲染当前分拣员名下的订单列表与正文 */
    _renderPickerContent() {
        const orderListEl = document.getElementById('woOrderList');
        const mainBodyEl = document.getElementById('woMainBody');
        if (!orderListEl || !mainBodyEl) return;
        orderListEl.innerHTML = '';
        mainBodyEl.innerHTML = '';
        this._flat = [];

        if (!this._currentPickerKey) {
            orderListEl.innerHTML = `<li class="wo-empty-hint">${WO_TEXT.emptyTabHint}</li>`;
            return;
        }
        const orders = this._getFilteredOrders(this._currentPickerKey);
        if (orders.length === 0) {
            orderListEl.innerHTML = `<li class="wo-empty-hint">${WO_TEXT.emptyTabHint}</li>`;
            return;
        }

        const esc = (s) => this.app.escapeHtml(s);
        let orderListHtml = '';
        let mainHtml = '';

        orders.forEach((order, idx) => {
            const targetId = `wo-order-${idx}`;
            const woCount = order.workOrders.size;

            const productNames = [];
            order.workOrders.forEach(wo => {
                wo.rows.forEach(r => { if (r.productName) productNames.push(r.productName); });
            });
            const productsText = productNames.slice(0, 2).join(' / ') + (productNames.length > 2 ? ` +${productNames.length - 2}` : '');
            orderListHtml += `<li><div class="wo-order-item" data-order="${esc(order.orderId)}" data-target="${targetId}"><span class="wo-order-item-id">${esc(order.orderId)}</span><span class="wo-order-item-products">${esc(productsText)}</span></div></li>`;

            let orderPicker = '', orderCourier = '';
            order.workOrders.forEach(wo => {
                wo.rows.forEach(r => {
                    if (!orderPicker && r.picker) orderPicker = r.picker;
                    if (!orderCourier && r.courier) orderCourier = r.courier;
                });
            });

            let blocksHtml = '';
            order.workOrders.forEach(wo => {
                blocksHtml += this._buildWorkOrderBlockHtml(wo, esc);
            });

            let subheaderHtml = '';
            if (orderPicker) subheaderHtml += `<span class="wo-order-subitem"><span class="wo-meta-label">${esc(WO_TEXT.meta_picker)}：</span><span class="wo-meta-value">${esc(orderPicker)}</span></span>`;
            if (orderCourier) subheaderHtml += `<span class="wo-order-subitem"><span class="wo-meta-label">${esc(WO_TEXT.meta_courier)}：</span><span class="wo-meta-value">${esc(orderCourier)}</span></span>`;

            const orderHref = this.app.buildUrl('?order=id' + encodeURIComponent(order.orderId));
            mainHtml += `<div class="wo-order-card" id="${targetId}" data-order="${esc(order.orderId)}" data-picker="${esc(this._currentPickerKey)}"><div class="wo-order-header"><a class="wo-order-link" href="${esc(orderHref)}" target="_blank" rel="noopener noreferrer">${esc(order.orderId)}</a>${order.orderDate ? `<span class="wo-order-date">${esc(order.orderDate)}</span>` : ''}<span class="wo-order-count">${woCount} ${WO_TEXT.woUnit}</span></div>${subheaderHtml ? `<div class="wo-order-subheader">${subheaderHtml}</div>` : ''}${blocksHtml}</div>`;
        });

        orderListEl.innerHTML = orderListHtml;
        mainBodyEl.innerHTML = mainHtml;

        const cards = mainBodyEl.querySelectorAll('.wo-order-card');
        cards.forEach(card => {
            this._flat.push({
                orderId: card.dataset.order,
                picker: card.dataset.picker,
                cardEl: card,
            });
        });

        orders.forEach(order => {
            const record = this._flat.find(f => f.orderId === order.orderId);
            if (!record) return;

            const orderAttachments = [];
            order.workOrders.forEach(wo => {
                wo.rows.forEach(r => {
                    r.attachments.forEach(url => orderAttachments.push(url));
                });
            });

            let urlIdx = 0;
            order.workOrders.forEach(wo => {
                wo.rows.forEach(rec => {
                    if (rec.attachments.length === 0) return;
                    const targetSec = this._findAttachmentSection(record.cardEl, rec);
                    if (!targetSec) return;
                    const imgs = targetSec.querySelector('.wo-attachments');
                    if (!imgs) return;
                    rec.attachments.forEach(url => {
                        const currentIdx = urlIdx++;
                        const img = document.createElement('img');
                        img.className = 'wo-attachment-img';
                        img.src = url;
                        img.alt = WO_TEXT.alt_attachment;
                        img.loading = 'lazy';
                        img.referrerPolicy = 'no-referrer';
                        img.addEventListener('error', () => {
                            const fallback = document.createElement('a');
                            fallback.className = 'wo-attachment-fallback';
                            fallback.href = url;
                            fallback.target = '_blank';
                            fallback.rel = 'noopener noreferrer';
                            fallback.textContent = WO_TEXT.attachmentLoadFailed;
                            img.replaceWith(fallback);
                        });
                        img.addEventListener('click', () => this._showImageViewer(orderAttachments, currentIdx));
                        imgs.appendChild(img);
                    });
                });
            });
        });

        mainBodyEl.scrollTop = 0;

        orderListEl.onclick = (e) => {
            e.stopPropagation();
            const item = e.target.closest('.wo-order-item');
            if (!item) return;
            const orderId = item.dataset.order;
            const record = this._flat.find(f => f.orderId === orderId);
            if (!record) return;
            this._viewMode = 'B';
            this._applyViewMode();
            this._setActive(orderId);
            record.cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        if (this._scrollHandler) mainBodyEl.removeEventListener('scroll', this._scrollHandler);
        this._scrollHandler = () => this._onMainScroll();
        mainBodyEl.addEventListener('scroll', this._scrollHandler, { passive: true });

        requestAnimationFrame(() => this._updateActiveOutline());
    }

    /**
     * 定位附件区块
     * @param {HTMLElement} cardEl
     * @param {Object} rec
     * @returns {HTMLElement|null}
     */
    _findAttachmentSection(cardEl, rec) {
        const woId = rec.workOrderId;
        const blocks = cardEl.querySelectorAll('.wo-workorder-block');
        for (const block of blocks) {
            if (block.dataset.woid !== woId) continue;
            const rows = block.querySelectorAll('.wo-product-row');
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const nameEl = row.querySelector('.wo-product-name');
                const rowKey = row.dataset.rowkey || '';
                if (rowKey && rowKey === this._rowKey(rec)) {
                    const sections = row.querySelectorAll('.wo-section');
                    for (const sec of sections) {
                        const label = sec.querySelector('.wo-section-label');
                        if (label && label.textContent === WO_TEXT.section_attachments) return sec;
                    }
                } else if (!rowKey && nameEl && nameEl.textContent === (rec.productName || '')) {
                    const sections = row.querySelectorAll('.wo-section');
                    for (const sec of sections) {
                        const label = sec.querySelector('.wo-section-label');
                        if (label && label.textContent === WO_TEXT.section_attachments) return sec;
                    }
                }
            }
        }
        return null;
    }

    /**
     * 生成行唯一 key
     * @param {Object} rec
     * @returns {string}
     */
    _rowKey(rec) {
        return `${rec.workOrderId}|${rec.productName || ''}`;
    }

    /**
     * 生成单个工单块的 HTML
     * @param {Object} wo
     * @param {Function} esc
     * @returns {string}
     */
    _buildWorkOrderBlockHtml(wo, esc) {
        const rep = wo.rows[0] || {};
        const productCount = wo.rows.length;
        const woid = wo.workOrderId;

        let headerMetaHtml = '';
        headerMetaHtml += `<span><span class="wo-wh-label">${esc(WO_TEXT.meta_faq)}：</span><span class="wo-wh-value">${esc(rep.faqName || '')}</span></span>`;
        if (rep.responsibleParts && rep.responsibleParts.length) {
            rep.responsibleParts.forEach(p => {
                const cls = p.isStation ? 'wo-wh-value wo-station' : 'wo-wh-value wo-other';
                headerMetaHtml += `<span><span class="wo-wh-label">${esc(p.label)}：</span><span class="${cls}">${esc(p.value)}</span></span>`;
            });
        }
        if (rep.workOrderCreatedAt) {
            headerMetaHtml += `<span><span class="wo-wh-label">${esc(WO_TEXT.meta_time)}：</span><span class="wo-wh-value">${esc(rep.workOrderCreatedAt)}</span></span>`;
        }

        const woidLabel = (woid && woid !== '__none__') ? woid : WO_TEXT.workOrderLabelEmpty;
        const headerLine = WO_TEXT.workOrderLabel.replace('{id}', esc(woidLabel)) + WO_TEXT.workOrderProductCount.replace('{n}', productCount);

        let html = `<div class="wo-workorder-block" data-woid="${esc(woid)}">`;
        html += '<div class="wo-workorder-header">';
        html += `<div>${headerLine}</div>`;
        html += `<div class="wo-workorder-header-row">${headerMetaHtml}</div>`;
        html += '</div>';

        wo.rows.forEach(rec => {
            const rowKey = this._rowKey(rec);
            html += `<div class="wo-product-row" data-rowkey="${esc(rowKey)}">`;
            if (rec.productName) {
                html += `<div class="wo-product-name">${esc(rec.productName)}</div>`;
            }
            html += this._sectionHtml(WO_TEXT.section_feedback, rec.feedback);
            if (rec.attachments.length > 0) {
                html += `<div class="wo-section"><div class="wo-section-label">${esc(WO_TEXT.section_attachments)}</div><div class="wo-attachments"></div></div>`;
            }
            html += this._sectionHtml(WO_TEXT.section_result, rec.result);
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    /**
     * 生成 section HTML
     * @param {string} labelText
     * @param {string} content
     * @returns {string}
     */
    _sectionHtml(labelText, content) {
        const hasContent = content && content.trim();
        const cls = hasContent ? 'wo-section-content' : 'wo-section-content wo-empty';
        const text = hasContent ? this.app.escapeHtml(content) : WO_TEXT.sectionEmpty;
        return `<div class="wo-section"><div class="wo-section-label">${this.app.escapeHtml(labelText)}</div><div class="${cls}">${text}</div></div>`;
    }

    /**
     * 设置当前激活订单
     * @param {string} orderId
     */
    _setActive(orderId) {
        const record = this._flat.find(f => f.orderId === orderId);
        if (!record) return;
        this._currentOrderId = orderId;

        document.querySelectorAll('#woOrderList .wo-order-item.active').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('#woMainBody .wo-order-card.highlight').forEach(el => el.classList.remove('highlight'));

        const orderEl = document.querySelector(`#woOrderList .wo-order-item[data-order="${orderId}"]`);
        const cardEl = record.cardEl;

        if (orderEl) orderEl.classList.add('active');
        if (cardEl) cardEl.classList.add('highlight');
    }

    /** 滚动节流 */
    _onMainScroll() {
        if (this._scrollRaf) return;
        this._scrollRaf = requestAnimationFrame(() => {
            this._scrollRaf = null;
            this._updateActiveOutline();
        });
    }

    /** 根据滚动位置更新激活订单高亮 */
    _updateActiveOutline() {
        const main = document.getElementById('woMainBody');
        if (!main || this._flat.length === 0) return;
        const mainRect = main.getBoundingClientRect();
        const threshold = mainRect.top + 40;
        let active = null;
        for (const f of this._flat) {
            if (f.cardEl.getBoundingClientRect().top <= threshold) {
                active = f;
            } else {
                break;
            }
        }
        if (active && active.orderId !== this._currentOrderId) {
            this._setActive(active.orderId);
        }
    }

    // ==================== 附件查看器 ====================

    /**
     * 显示大图查看器
     * @param {string[]} images
     * @param {number} startIndex
     */
    _showImageViewer(images, startIndex) {
        this.app.showImageViewer(images, startIndex, { loop: true, showOpenOriginal: true });
    }

    /** 关闭大图查看器 */
    _closeImageViewer() {
        document.querySelectorAll('.img-viewer').forEach(v => v.remove());
        if (this._viewerKeyHandler) {
            document.removeEventListener('keydown', this._viewerKeyHandler);
            this._viewerKeyHandler = null;
        }
    }

    /** 释放资源 */
    destroy() {
        this._closeImageViewer();
        this._destroyCharts();
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }
        const mainBody = document.getElementById('woMainBody');
        if (mainBody && this._scrollHandler) {
            mainBody.removeEventListener('scroll', this._scrollHandler);
            this._scrollHandler = null;
        }
    }

    /**
     * 重置模块
     * @param {HTMLElement} panel
     */
    _reset(panel) {
        this._closeImageViewer();
        this._destroyCharts();
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }
        this._pickers = new Map();
        this._sortedPickers = [];
        this._flat = [];
        this._currentPickerKey = null;
        this._currentOrderId = null;
        this._currentTab = 'station';
        this._viewMode = 'C';
        this._stats = { totalRows: 0, orderCount: 0, pickerCount: 0 };
        this._workOrderStats = null;
        const tabBar = document.getElementById('woTabBar');
        if (tabBar) tabBar.innerHTML = '';
        const pickerList = document.getElementById('woPickerList');
        if (pickerList) pickerList.innerHTML = '';
        const pickerSlim = document.getElementById('woPickerSlim');
        if (pickerSlim) pickerSlim.innerHTML = '';
        const orderList = document.getElementById('woOrderList');
        if (orderList) orderList.innerHTML = '';
        const mainBody = document.getElementById('woMainBody');
        if (mainBody) {
            mainBody.innerHTML = '';
            if (this._scrollHandler) {
                mainBody.removeEventListener('scroll', this._scrollHandler);
                this._scrollHandler = null;
            }
        }
        const contentArea = document.getElementById('woContentArea');
        if (contentArea) contentArea.style.display = 'none';
        this.app.showMessage(WO_TEXT.msg_reset, 'success');
    }

    // ==================== 统计（工单级） ====================

    /**
     * 确保 Chart.js 已加载
     * @returns {Promise<boolean>}
     */
    async _ensureChartLib() {
        return this.app.loadLibrary('chart');
    }

    /** 销毁所有图表 */
    _destroyCharts() {
        this._charts.forEach(c => { try { c.destroy(); } catch (e) {} });
        this._charts = [];
    }

    /**
     * 构建工单级统计数据（懒加载）
     * - 计数单位 = 工单：total / byPicker / byDate / faqCount / productCount 均按工单去重
     * - 明细列表仍按行展开，便于查看每个商品
     * @returns {Object}
     */
    _buildWorkOrderStats() {
        if (this._workOrderStats) return this._workOrderStats;

        const stats = {
            total: 0,
            category: { fulfillment: 0, product: 0 },
            byDate: new Map(),
            byPicker: new Map(),
            faqCount: new Map(),
            productCount: new Map(),
            pickerFaq: new Map(),
            faqToRecords: new Map(),
            productToRecords: new Map(),
        };

        this._pickers.forEach((orderMap, pickerName) => {
            orderMap.forEach(order => {
                order.workOrders.forEach(wo => {
                    // 工单内任一行站责，则该工单计入站责统计；反之计入非站责
                    // 依据：只要工单在某个 tab 中出现过就计数一次
                    // 由于两个 tab 分开统计，这里直接按"是否含站责行"和"是否含非站责行"分别计入
                    const hasStation = wo.rows.some(r => r.isStation);
                    const hasNon = wo.rows.some(r => !r.isStation);
                    if (!hasStation && !hasNon) return;

                    // 用于统计的行集合：
                    // - 站责统计时：取该工单所有行（无论站责非站责），反映"该工单出现在站责 tab"
                    // - 但 category / faq / product 应基于有意义的代表行
                    // 简化：用首行做代表
                    const rep = wo.rows[0];
                    if (!rep) return;

                    // 工单级：total 一次
                    stats.total++;
                    stats.category[rep.category]++;

                    const date = rep.orderDate || '';
                    if (!stats.byDate.has(date)) stats.byDate.set(date, { fulfillment: 0, product: 0 });
                    stats.byDate.get(date)[rep.category]++;

                    if (!stats.byPicker.has(pickerName)) stats.byPicker.set(pickerName, { fulfillment: 0, product: 0, total: 0 });
                    const p = stats.byPicker.get(pickerName);
                    p[rep.category]++;
                    p.total++;

                    // FAQ：工单级去重（一条 FAQ 在一个工单内只记一次）
                    const faqSet = new Set();
                    wo.rows.forEach(r => { if (r.faqName) faqSet.add(r.faqName); });
                    faqSet.forEach(faqName => {
                        stats.faqCount.set(faqName, (stats.faqCount.get(faqName) || 0) + 1);
                        if (!stats.pickerFaq.has(pickerName)) {
                            stats.pickerFaq.set(pickerName, { fulfillment: new Map(), product: new Map() });
                        }
                        const bucket = stats.pickerFaq.get(pickerName);
                        const catMap = bucket[rep.category] || bucket.product;
                        catMap.set(faqName, (catMap.get(faqName) || 0) + 1);

                        if (!stats.faqToRecords.has(faqName)) stats.faqToRecords.set(faqName, []);
                        // 明细仍按行展开
                        wo.rows.filter(r => r.faqName === faqName).forEach(r => {
                            stats.faqToRecords.get(faqName).push({
                                picker: pickerName,
                                orderId: r.orderId,
                                workOrderId: r.workOrderId,
                                productName: r.productName,
                                responsibleText: r.responsibleText,
                                responsibleParts: r.responsibleParts,
                                orderDate: r.orderDate,
                            });
                        });
                    });

                    // 商品：工单级去重（一个商品在一个工单内只记一次）
                    const productSet = new Set();
                    wo.rows.forEach(r => { if (r.productName) productSet.add(r.productName); });
                    productSet.forEach(name => {
                        stats.productCount.set(name, (stats.productCount.get(name) || 0) + 1);
                        if (!stats.productToRecords.has(name)) stats.productToRecords.set(name, []);
                        wo.rows.filter(r => r.productName === name).forEach(r => {
                            stats.productToRecords.get(name).push({
                                picker: pickerName,
                                orderId: r.orderId,
                                workOrderId: r.workOrderId,
                                faqName: r.faqName,
                                responsibleText: r.responsibleText,
                                responsibleParts: r.responsibleParts,
                                orderDate: r.orderDate,
                            });
                        });
                    });
                });
            });
        });

        this._workOrderStats = stats;
        return stats;
    }

    /** 渲染统计区域 */
    async _renderStatsArea() {
        const area = document.getElementById('woStatsArea');
        if (!area) return;
        if (!this._pickers.size) {
            area.innerHTML = `<div class="wo-stats-loading">${WO_TEXT.stats_needUpload}</div>`;
            return;
        }
        area.innerHTML = `<div class="wo-stats-loading">${WO_TEXT.stats_loadingLib}</div>`;
        const ok = await this._ensureChartLib();
        if (!ok) {
            area.innerHTML = `<div class="wo-stats-loading" style="color:#f44336">${WO_TEXT.stats_libFailed}</div>`;
            return;
        }

        this._destroyCharts();
        const stats = this._buildWorkOrderStats();

        const total = stats.total;
        const pctF = total ? (stats.category.fulfillment / total * 100).toFixed(1) : '0.0';
        const pctP = total ? (stats.category.product / total * 100).toFixed(1) : '0.0';

        const pickerRows = Array.from(stats.byPicker.entries())
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.total - a.total);

        const faqSorted = Array.from(stats.faqCount.entries()).sort((a, b) => b[1] - a[1]);
        const faqTop = faqSorted.slice(0, 10);

        const productSorted = Array.from(stats.productCount.entries()).sort((a, b) => b[1] - a[1]);

        const dateSorted = Array.from(stats.byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        let faqListHtml = '';
        if (faqSorted.length === 0) {
            faqListHtml = `<div class="wo-empty-hint">${WO_TEXT.stats_noData}</div>`;
        } else {
            const maxFaq = faqSorted[0][1];
            faqListHtml = faqSorted.map(([name, count], i) => {
                const pct = total ? (count / total * 100).toFixed(1) : '0.0';
                const barW = maxFaq ? (count / maxFaq * 100) : 0;
                return `<div class="wo-stat-row wo-stat-row-clickable" data-faq="${this.app.escapeHtml(name)}"><span class="wo-stat-rank">${i + 1}</span><span class="wo-stat-name" title="${this.app.escapeHtml(name)}">${this.app.escapeHtml(name)}</span><div class="wo-stat-bar"><div class="wo-stat-bar-inner" style="width:${barW}%"></div></div><span class="wo-stat-count">${count}</span><span class="wo-stat-pct">${pct}%</span></div>`;
            }).join('');
        }

        let productListHtml = '';
        if (productSorted.length === 0) {
            productListHtml = `<div class="wo-empty-hint">${WO_TEXT.stats_noData}</div>`;
        } else {
            const maxProduct = productSorted[0][1];
            productListHtml = productSorted.map(([name, count], i) => {
                const pct = total ? (count / total * 100).toFixed(1) : '0.0';
                const barW = maxProduct ? (count / maxProduct * 100) : 0;
                return `<div class="wo-stat-row wo-stat-row-clickable" data-product="${this.app.escapeHtml(name)}"><span class="wo-stat-rank">${i + 1}</span><span class="wo-stat-name" title="${this.app.escapeHtml(name)}">${this.app.escapeHtml(name)}</span><div class="wo-stat-bar"><div class="wo-stat-bar-inner" style="width:${barW}%"></div></div><span class="wo-stat-count">${count}</span><span class="wo-stat-pct">${pct}%</span></div>`;
            }).join('');
        }

        area.innerHTML = `
            <div class="wo-stats-grid">
                <div class="wo-stat-card">
                    <h3>${WO_TEXT.stats_globalTitle}</h3>
                    <div class="wo-stat-summary">
                        <div class="wo-stat-summary-item">
                            <div class="wo-stat-summary-label">${WO_TEXT.stats_total}</div>
                            <div class="wo-stat-summary-value">${total}</div>
                        </div>
                        <div class="wo-stat-summary-item">
                            <div class="wo-stat-summary-label">${WO_TEXT.category_fulfillment}</div>
                            <div class="wo-stat-summary-value wo-accent-f">${stats.category.fulfillment}<span class="wo-stat-summary-pct">${pctF}%</span></div>
                        </div>
                        <div class="wo-stat-summary-item">
                            <div class="wo-stat-summary-label">${WO_TEXT.category_product}</div>
                            <div class="wo-stat-summary-value wo-accent-p">${stats.category.product}<span class="wo-stat-summary-pct">${pctP}%</span></div>
                        </div>
                    </div>
                </div>
                <div class="wo-stat-card">
                    <h3>${WO_TEXT.stats_dateTitle}</h3>
                    <div class="wo-chart-wrap h-300"><canvas id="woChartDate"></canvas></div>
                </div>
                <div class="wo-stat-card">
                    <h3>${WO_TEXT.stats_pickerTitle}</h3>
                    <div class="wo-chart-wrap" id="woChartPickerWrap"><canvas id="woChartPicker"></canvas></div>
                </div>
                <div class="wo-stat-card">
                    <h3>${WO_TEXT.stats_faqTitle}</h3>
                    <div class="wo-chart-wrap h-400"><canvas id="woChartFaq"></canvas></div>
                    <div class="wo-stat-list">
                        <div class="wo-stat-list-title">${WO_TEXT.stats_fullList}</div>
                        ${faqListHtml}
                    </div>
                </div>
                <div class="wo-stat-card">
                    <h3>${WO_TEXT.stats_productTitle}</h3>
                    <div class="wo-stat-list" style="margin-top:0;border-top:none;padding-top:0">
                        ${productListHtml}
                    </div>
                </div>
            </div>
        `;

        area.querySelectorAll('.wo-stat-row-clickable[data-faq]').forEach(el => {
            el.addEventListener('click', () => this._showReverseModal('faq', el.dataset.faq));
        });
        area.querySelectorAll('.wo-stat-row-clickable[data-product]').forEach(el => {
            el.addEventListener('click', () => this._showReverseModal('product', el.dataset.product));
        });

        const pickerWrap = document.getElementById('woChartPickerWrap');
        if (pickerWrap) {
            const h = Math.max(200, pickerRows.length * 32 + 60);
            pickerWrap.style.height = h + 'px';
        }

        const dateCtx = document.getElementById('woChartDate');
        if (dateCtx) {
            const labels = dateSorted.map(x => x[0] || WO_TEXT.noDate);
            const dataF = dateSorted.map(x => x[1].fulfillment);
            const dataP = dateSorted.map(x => x[1].product);
            this._charts.push(new Chart(dateCtx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: WO_TEXT.category_fulfillment, data: dataF, borderColor: COLOR_F, backgroundColor: COLOR_F + '33', tension: 0.3, pointRadius: 4, pointBackgroundColor: COLOR_F },
                        { label: WO_TEXT.category_product, data: dataP, borderColor: COLOR_P, backgroundColor: COLOR_P + '33', tension: 0.3, pointRadius: 4, pointBackgroundColor: COLOR_P },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                },
            }));
        }

        const pickerCtx = document.getElementById('woChartPicker');
        if (pickerCtx) {
            const labels = pickerRows.map(r => r.name);
            const dataF = pickerRows.map(r => r.fulfillment);
            const dataP = pickerRows.map(r => r.product);
            this._charts.push(new Chart(pickerCtx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: WO_TEXT.category_fulfillment, data: dataF, backgroundColor: COLOR_F, stack: 's' },
                        { label: WO_TEXT.category_product, data: dataP, backgroundColor: COLOR_P, stack: 's' },
                    ],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                afterBody: (items) => {
                                    const idx = items[0].dataIndex;
                                    return WO_TEXT.stats_totalTooltip.replace('{n}', pickerRows[idx].total);
                                },
                            },
                        },
                    },
                    scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }, y: { stacked: true } },
                    onClick: (evt, elements) => {
                        if (!elements.length) return;
                        const idx = elements[0].index;
                        const name = pickerRows[idx].name;
                        this._showPickerFaqModal(name);
                    },
                },
            }));
            pickerCtx.style.cursor = 'pointer';
        }

        const faqCtx = document.getElementById('woChartFaq');
        if (faqCtx) {
            const labels = faqTop.map(x => x[0]);
            const data = faqTop.map(x => x[1]);
            const colors = faqTop.map((_, i) => PALETTE[i % PALETTE.length]);
            this._charts.push(new Chart(faqCtx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{ data, backgroundColor: colors, borderWidth: 1 }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 10, bottom: 10 } },
                    plugins: {
                        legend: { position: 'right' },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const t = data.reduce((s, v) => s + v, 0);
                                    const pct = t ? (ctx.parsed / t * 100).toFixed(1) : '0.0';
                                    return `${ctx.label}：${ctx.parsed}（${pct}%）`;
                                },
                            },
                        },
                    },
                    onClick: (evt, elements) => {
                        if (!elements.length) return;
                        const idx = elements[0].index;
                        const name = faqTop[idx] && faqTop[idx][0];
                        if (!name) return;
                        this._showReverseModal('faq', name);
                    },
                },
                plugins: [percentLabelsPlugin],
            }));
            faqCtx.style.cursor = 'pointer';
        }
    }

    /**
     * 弹窗展示某分拣员的 FAQ 画像（分品类横向柱状图 + 总览大饼图 + 完整榜单）
     * @param {string} pickerName
     */
    _showPickerFaqModal(pickerName) {
        const stats = this._buildWorkOrderStats();
        const bucket = stats.pickerFaq.get(pickerName);
        const pickerData = stats.byPicker.get(pickerName);
        if (!bucket || !pickerData) {
            this.app.showMessage(WO_TEXT.stats_noPickerData, 'info');
            return;
        }

        const fulfillArr = Array.from(bucket.fulfillment.entries()).sort((a, b) => b[1] - a[1]);
        const productArr = Array.from(bucket.product.entries()).sort((a, b) => b[1] - a[1]);
        const mergedArr = [...fulfillArr, ...productArr].sort((a, b) => b[1] - a[1]);
        const total = pickerData.total;

        const fulfillMax = fulfillArr.length ? fulfillArr[0][1] : 0;
        const productMax = productArr.length ? productArr[0][1] : 0;
        const fulfillHeight = Math.max(120, fulfillArr.length * 32 + 50);
        const productHeight = Math.max(120, productArr.length * 32 + 50);

        const fulfillTitle = `${WO_TEXT.category_fulfillment}（${pickerData.fulfillment}）`;
        const productTitle = `${WO_TEXT.category_product}（${pickerData.product}）`;

        const fulfillChartHtml = fulfillArr.length
            ? `<div style="height:${fulfillHeight}px;position:relative;margin-bottom:18px"><canvas id="woPickerFulfillCanvas"></canvas></div>`
            : `<div class="wo-empty-hint">${WO_TEXT.stats_noData}</div>`;
        const productChartHtml = productArr.length
            ? `<div style="height:${productHeight}px;position:relative;margin-bottom:18px"><canvas id="woPickerProductCanvas"></canvas></div>`
            : `<div class="wo-empty-hint">${WO_TEXT.stats_noData}</div>`;

        const overlay = document.createElement('div');
        overlay.className = 'wo-img-viewer';
        overlay.style.background = 'rgba(0,0,0,.5)';
        overlay.style.backdropFilter = 'blur(3px)';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:720px;max-width:92vw;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);position:relative';
        box.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <div style="font-size:18px;font-weight:700">${this.app.escapeHtml(pickerName)}${WO_TEXT.stats_pickerModalTitle.replace('{n}', total)}</div>
                <button type="button" class="wo-img-viewer-close" style="position:static;background:#f0f0f0;color:#333;width:32px;height:32px;font-size:22px">×</button>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px">
                <div><div style="font-size:12px;color:#999">${WO_TEXT.category_fulfillment}</div><div style="font-size:22px;font-weight:700;color:#FFA000">${pickerData.fulfillment}</div></div>
                <div><div style="font-size:12px;color:#999">${WO_TEXT.category_product}</div><div style="font-size:22px;font-weight:700;color:#2196f3">${pickerData.product}</div></div>
            </div>
            <div style="font-size:14px;font-weight:700;color:#FFA000;margin-bottom:8px">${fulfillTitle}</div>
            ${fulfillChartHtml}
            <div style="font-size:14px;font-weight:700;color:#2196f3;margin-bottom:8px">${productTitle}</div>
            ${productChartHtml}
            <div style="height:280px;position:relative;margin-bottom:18px"><canvas id="woPickerFaqCanvas"></canvas></div>
            <div class="wo-stat-list" style="margin-top:0;border-top:1px solid #f0f0f0;padding-top:14px">
                <div class="wo-stat-list-title">${WO_TEXT.stats_fullList}</div>
                ${mergedArr.map(([name, count], i) => {
                    const pct = total ? (count / total * 100).toFixed(1) : '0.0';
                    const maxCount = mergedArr[0][1];
                    const barW = maxCount ? (count / maxCount * 100) : 0;
                    return `<div class="wo-stat-row"><span class="wo-stat-rank">${i + 1}</span><span class="wo-stat-name" title="${this.app.escapeHtml(name)}">${this.app.escapeHtml(name)}</span><div class="wo-stat-bar"><div class="wo-stat-bar-inner" style="width:${barW}%"></div></div><span class="wo-stat-count">${count}</span><span class="wo-stat-pct">${pct}%</span></div>`;
                }).join('')}
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const keyHandler = (e) => { if (e.key === 'Escape') close(); };
        const close = () => {
            ['woPickerFaqCanvas', 'woPickerFulfillCanvas', 'woPickerProductCanvas'].forEach(id => {
                const c = Chart.getChart(id);
                if (c) { try { c.destroy(); } catch (e) {} }
            });
            overlay.remove();
            document.removeEventListener('keydown', keyHandler);
        };
        box.querySelector('.wo-img-viewer-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', keyHandler);

        if (fulfillArr.length) {
            const ctx = document.getElementById('woPickerFulfillCanvas');
            this._renderCategoryBarChart(ctx, fulfillArr, fulfillMax, COLOR_F);
        }
        if (productArr.length) {
            const ctx = document.getElementById('woPickerProductCanvas');
            this._renderCategoryBarChart(ctx, productArr, productMax, COLOR_P);
        }

        const faqCtx = document.getElementById('woPickerFaqCanvas');
        if (faqCtx) {
            const colors = mergedArr.map((_, i) => PALETTE[i % PALETTE.length]);
            new Chart(faqCtx, {
                type: 'doughnut',
                data: {
                    labels: mergedArr.map(x => x[0]),
                    datasets: [{ data: mergedArr.map(x => x[1]), backgroundColor: colors, borderWidth: 1 }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        tooltip: {
                            callbacks: {
                                label: (c) => {
                                    const t = mergedArr.reduce((s, v) => s + v[1], 0);
                                    const pct = t ? (c.parsed / t * 100).toFixed(1) : '0.0';
                                    return `${c.label}：${c.parsed}（${pct}%）`;
                                },
                            },
                        },
                    },
                },
                plugins: [percentLabelsPlugin],
            });
        }
    }

    /**
     * 渲染单个品类的横向柱状图（带数值标签）
     * @param {HTMLElement} ctx
     * @param {Array<[string,number]>} arr
     * @param {number} maxValue
     * @param {string} color
     */
    _renderCategoryBarChart(ctx, arr, maxValue, color) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: arr.map(x => x[0]),
                datasets: [{
                    data: arr.map(x => x[1]),
                    backgroundColor: color,
                    borderRadius: 4,
                    barThickness: 20,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { right: 50 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (c) => `${c.parsed.x}`,
                        },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: maxValue ? maxValue * 1.15 : 10,
                        ticks: { precision: 0 },
                        grid: { color: '#f0f0f0' },
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 12 }, color: '#333' },
                    },
                },
            },
            plugins: [barValuePlugin],
        });
    }

    /**
     * 反向钻取：从 FAQ 或商品进入工单明细
     * @param {'faq'|'product'} type
     * @param {string} name
     */
    _showReverseModal(type, name) {
        const stats = this._buildWorkOrderStats();
        const records = type === 'product'
            ? (stats.productToRecords.get(name) || [])
            : (stats.faqToRecords.get(name) || []);
        if (!records.length) {
            this.app.showMessage(WO_TEXT.stats_noData, 'info');
            return;
        }

        // 按分拣员聚合（工单去重）
        const byPicker = new Map();
        records.forEach(r => {
            if (!byPicker.has(r.picker)) byPicker.set(r.picker, new Set());
            byPicker.get(r.picker).add(r.workOrderId + '|' + r.orderId);
        });
        const pickerEntries = Array.from(byPicker.entries())
            .map(([name, set]) => [name, set.size])
            .sort((a, b) => b[1] - a[1]);
        const maxCount = pickerEntries[0][1];
        const total = pickerEntries.reduce((s, [, n]) => s + n, 0);

        const titleWord = type === 'product' ? WO_TEXT.category_product : WO_TEXT.faqShort;

        const pickerListHtml = pickerEntries.map(([p, count], i) => {
            const pct = total ? (count / total * 100).toFixed(1) : '0.0';
            const barW = maxCount ? (count / maxCount * 100) : 0;
            return `<div class="wo-stat-row"><span class="wo-stat-rank">${i + 1}</span><span class="wo-stat-name">${this.app.escapeHtml(p)}</span><div class="wo-stat-bar"><div class="wo-stat-bar-inner" style="width:${barW}%"></div></div><span class="wo-stat-count">${count}</span><span class="wo-stat-pct">${pct}%</span></div>`;
        }).join('');

        const maxDetails = 1000;
        const detailsShown = records.slice(0, maxDetails);
        let detailsHtml = detailsShown.map(r => {
            let otherText;
            if (type === 'product') {
                otherText = r.faqName || '';
            } else {
                otherText = r.productName || '';
            }
            const rowCls = (type === 'product' && r.faqName) ? 'wo-stat-row wo-stat-row-clickable' : 'wo-stat-row';
            const otherAttr = (type === 'product' && r.faqName) ? ` data-faq="${this.app.escapeHtml(r.faqName)}"` : '';
            return `<div class="${rowCls}"${otherAttr}><span class="wo-stat-rank"></span><span class="wo-stat-name" style="flex:0 0 200px;font-family:monospace">${this.app.escapeHtml(r.workOrderId === '__none__' ? '' : r.workOrderId)}</span><span class="wo-stat-name" style="flex:0 0 140px;font-family:monospace">${this.app.escapeHtml(r.orderId)}</span><span class="wo-stat-name" style="flex:0 0 120px">${this.app.escapeHtml(r.picker)}</span><span class="wo-stat-name" title="${this.app.escapeHtml(otherText)}">${this.app.escapeHtml(otherText)}</span></div>`;
        }).join('');
        if (records.length > maxDetails) {
            detailsHtml += `<div class="wo-empty-hint">${WO_TEXT.stats_detailsTruncated.replace('{shown}', maxDetails).replace('{total}', records.length)}</div>`;
        }

        const overlay = document.createElement('div');
        overlay.className = 'wo-img-viewer';
        overlay.style.background = 'rgba(0,0,0,.5)';
        overlay.style.backdropFilter = 'blur(3px)';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:880px;max-width:92vw;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);position:relative';

        box.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <div style="font-size:18px;font-weight:700;word-break:break-all">${this.app.escapeHtml(name)} <span style="font-size:14px;color:#999;font-weight:400">${WO_TEXT.stats_reverseSubtitle.replace('{type}', titleWord).replace('{n}', total)}</span></div>
                <button type="button" class="wo-img-viewer-close" style="position:static;background:#f0f0f0;color:#333;width:32px;height:32px;font-size:22px">×</button>
            </div>
            <div class="wo-stat-list" style="margin-top:0;border-top:none;padding-top:0">
                <div class="wo-stat-list-title">${WO_TEXT.stats_byPicker}</div>
                ${pickerListHtml}
            </div>
            <div class="wo-stat-list" style="margin-top:18px">
                <div class="wo-stat-list-title">${WO_TEXT.stats_workOrderDetails}</div>
                ${detailsHtml}
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const keyHandler = (e) => { if (e.key === 'Escape') close(); };
        const close = () => {
            overlay.remove();
            document.removeEventListener('keydown', keyHandler);
        };
        box.querySelector('.wo-img-viewer-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', keyHandler);

        box.querySelectorAll('.wo-stat-row-clickable[data-faq]').forEach(el => {
            el.addEventListener('click', () => {
                close();
                this._showReverseModal('faq', el.dataset.faq);
            });
        });
    }

    // ==================== UI ====================

    /**
     * 渲染模块面板
     * @param {HTMLElement} panel
     */
    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                ${this.app.uploadSection({
                    title: WO_TEXT.title,
                    moduleId: this.id,
                    btnId: 'woUploadBtn',
                    btnLabel: WO_TEXT.btn_upload,
                    resetId: 'woResetBtn',
                    resetLabel: WO_TEXT.btn_reset,
                })}
            </div>
            <div id="woContentArea" class="section wo-content-area">
                <div class="wo-tabs-bar" id="woTabBar"></div>
                <div class="wo-columns" id="woColumns">
                    <aside class="wo-pickers-col">
                        <div class="wo-col-full">
                            <div class="wo-col-title">${WO_TEXT.pickersTitle}</div>
                            <ul class="wo-list" id="woPickerList"></ul>
                        </div>
                        <div class="wo-col-slim">
                            <div class="wo-col-title wo-col-title-slim">${WO_TEXT.slimPicker}</div>
                            <div class="wo-list-slim" id="woPickerSlim"></div>
                        </div>
                    </aside>
                    <aside class="wo-orders-col">
                        <div class="wo-col-full">
                            <div class="wo-col-title">${WO_TEXT.ordersTitle}</div>
                            <ul class="wo-list" id="woOrderList"></ul>
                        </div>
                    </aside>
                    <main class="wo-main">
                        <div class="wo-col-full">
                            <div class="wo-col-title">${WO_TEXT.mainTitle}</div>
                            <div class="wo-main-body" id="woMainBody"></div>
                        </div>
                        <div class="wo-col-slim">
                            <div class="wo-col-title wo-col-title-slim wo-col-title-slim-fill">${WO_TEXT.slimMain}</div>
                        </div>
                    </main>
                </div>
                <div class="wo-stats-area" id="woStatsArea"></div>
            </div>
        `;
        this._bindEvents(panel);
        this.app.bindUploadSection({
            btnId: 'woUploadBtn',
            accept: '.xlsx,.xls',
            onFile: (file) => this._handleFile(file),
            resetId: 'woResetBtn',
            onReset: () => this._reset(panel),
        });
        this.app._log(this.title + '模块加载成功');
    }
}

// ==================== 常量与文案 ====================

const COLOR_F = '#FFA000';
const COLOR_P = '#2196f3';
const PALETTE = ['#FFA000', '#2196f3', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#795548', '#607d8b', '#3f51b5', '#cddc39', '#009688', '#673ab7', '#f44336', '#8bc34a'];

const percentLabelsPlugin = {
    id: 'percentLabels',
    afterDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        const data = chart.data.datasets[0].data;
        const total = data.reduce((s, v) => s + v, 0);
        if (!total) return;
        const ctx = chart.ctx;
        ctx.save();
        meta.data.forEach((arc, i) => {
            const pct = data[i] / total * 100;
            if (pct < 4) return;
            const pos = arc.tooltipPosition();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pct.toFixed(1) + '%', pos.x, pos.y);
        });
        ctx.restore();
    },
};

const barValuePlugin = {
    id: 'barValue',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        const color = chart.data.datasets[0].backgroundColor || '#333';
        meta.data.forEach((bar, i) => {
            const value = chart.data.datasets[0].data[i];
            if (value === undefined || value === null) return;
            const pos = bar.tooltipPosition();
            ctx.save();
            ctx.fillStyle = color;
            ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(value), pos.x + 6, pos.y);
            ctx.restore();
        });
    },
};

const WO_TEXT = {
    title: '工单解析',
    introText: '按分拣员分组浏览工单详情，支持站责筛选、统计图表与反向钻取。',
    helpDescription: '<p>上传工单 Excel 文件开始解析。</p><p>支持站责 / 非站责切换、按人 / 按天 / FAQ / 商品的图表统计，点击图表或榜单可从 FAQ / 商品 / 人反向钻取明细。</p>',

    btn_upload: '上传并解析',
    btn_reset: '重置',
    pickersTitle: '分拣员',
    ordersTitle: '订单号',
    mainTitle: '正文',
    slimPicker: '人',
    slimMain: '文',

    tab_station: '站责 ({n})',
    tab_nonStation: '非站责 ({n})',
    tab_stats: '统计',

    stationResponsible: '门店',
    defaultPicker: '未指定分拣员',

    emptyAfterParse: '没有解析到有效数据',
    emptyTabHint: '该分类下无数据',

    woUnit: '个工单',
    workOrderLabel: '工单号：{id}',
    workOrderLabelEmpty: '未提供',
    workOrderProductCount: '（{n} 个商品）',

    category_fulfillment: '履约',
    category_product: '商品',
    faqShort: 'FAQ',

    responsibleInitial: '初判：{val}',
    responsibleFinal: '终判：{val}',
    responsibleOriginal: '责任方：{val}',
    meta_initialLabel: '初判',
    meta_finalLabel: '终判',
    meta_originalLabel: '责任方',

    meta_faq: '判责FAQ',
    meta_responsible: '责任方',
    meta_time: '时间',
    meta_picker: '分拣员',
    meta_courier: '配送员',

    section_feedback: '问题反馈',
    section_attachments: '附件',
    section_result: '处理结果',
    sectionEmpty: '（无）',
    alt_attachment: '附件图片',
    attachmentLoadFailed: '图片加载失败，点击打开',

    viewerClose: '关闭',
    viewerPrev: '上一张',
    viewerNext: '下一张',
    btn_openOriginal: '在新标签页打开原图',

    msg_fileTooLarge: '文件过大（超过20MB），请拆分后上传',
    msg_emptyFile: '文件内容为空或只有表头',
    msg_tooManyRows: '数据超过 {n} 行，请拆分后上传',
    msg_parseOk: '解析成功，共 {n} 条记录',
    msg_parseFailed: '解析失败: ',
    msg_parsing: '正在解析…',
    msg_reset: '已重置',

    stats_globalTitle: '全局占比（站责工单）',
    stats_total: '站责工单总数',
    stats_dateTitle: '按天趋势（站责工单）',
    stats_pickerTitle: '按人排行（站责工单，点击柱子查看 FAQ 画像）',
    stats_faqTitle: 'FAQ 分布（站责工单，点击扇区或榜单查看明细）',
    stats_productTitle: '商品排行（站责工单，点击查看明细）',
    stats_fullList: '完整榜单',
    stats_byPicker: '按分拣员分布',
    stats_workOrderDetails: '工单明细',
    stats_needUpload: '请先上传工单数据',
    stats_loadingLib: '正在加载图表库…',
    stats_libFailed: '图表库加载失败，请检查网络',
    stats_noData: '无数据',
    stats_noPickerData: '该分拣员无站责数据',
    stats_totalTooltip: '合计：{n} 个工单',
    stats_pickerModalTitle: ' 的 FAQ 分布（共 {n} 个站责工单）',
    stats_reverseSubtitle: '（{type}，共 {n} 个站责工单）',
    stats_detailsTruncated: '仅显示前 {shown} 条，共 {total} 条',
    noDate: '（无日期）',

    styles: `
.wo-content-area{display:none}
.wo-tabs-bar{display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3);border-bottom:2px solid var(--border-soft)}
.wo-tab-btn{padding:var(--sp-2) var(--sp-4);border:1px solid var(--border);border-bottom:none;border-radius:var(--r) var(--r) 0 0;background:var(--bg-sub);color:var(--text);font-size:var(--fs);font-weight:600;cursor:pointer;white-space:nowrap;transition:all var(--t);font-family:inherit;margin-bottom:-2px}
.wo-tab-btn:hover{background:var(--accent-soft);color:var(--text-strong)}
.wo-tab-btn.active{background:var(--bg-panel);color:var(--accent-text);border-color:var(--border);box-shadow:0 -2px 6px rgba(255,189,0,.15)}
.wo-columns{display:flex;gap:var(--sp-3);height:calc(100vh - 380px);min-height:480px;--wo-slim:56px;--wo-order:240px;--wo-ease:cubic-bezier(.65,0,.35,1);--wo-slow:.5s}
.wo-pickers-col,.wo-orders-col,.wo-main{position:relative;border:1px solid var(--border-soft);border-radius:var(--r);overflow:hidden;min-width:0;background:var(--bg-sub);transition:flex-grow var(--wo-slow) var(--wo-ease),flex-basis var(--wo-slow) var(--wo-ease)}
.wo-pickers-col{flex:1 1 0;background:var(--bg-panel)}
.wo-orders-col{flex:1 1 0}
.wo-main{flex:1.5 1 0;background:var(--bg-panel)}
.wo-columns.state-a .wo-main{flex:0 0 var(--wo-slim)}
.wo-columns.state-b .wo-pickers-col{flex:0 0 var(--wo-slim)}
.wo-columns.state-b .wo-orders-col{flex:0 0 var(--wo-order)}
.wo-columns.state-b .wo-main{flex:1 1 0}
.wo-col-title{height:38px;padding:var(--sp-2) var(--sp-3);font-size:var(--fs-sm);font-weight:700;letter-spacing:.5px;color:var(--text-muted);border-bottom:1px solid var(--border-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-col-title-slim{display:flex;align-items:center;justify-content:center;padding:0;color:var(--text-muted)}
.wo-col-title-slim-fill{flex:1;border-bottom:none}
.wo-col-full,.wo-col-slim{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;transition:opacity .12s ease 0s;overflow:hidden}
.wo-col-slim{opacity:0;pointer-events:none}
.wo-columns.state-a .wo-main .wo-col-full,
.wo-columns.state-b .wo-pickers-col .wo-col-full{opacity:0;pointer-events:none;transition-delay:.42s}
.wo-columns.state-a .wo-main .wo-col-slim,
.wo-columns.state-b .wo-pickers-col .wo-col-slim{opacity:1;pointer-events:auto;transition-delay:.42s}
.wo-list{list-style:none;margin:0;padding:var(--sp-2);flex:1;overflow-y:auto;overflow-x:hidden}
.wo-list-slim{padding:var(--sp-2) 0;flex:1;display:flex;flex-direction:column;align-items:center;gap:var(--sp-1);overflow-y:auto;overflow-x:hidden}
.wo-picker-item{height:42px;padding:var(--sp-2) var(--sp-3);margin-bottom:var(--sp-1);border-radius:var(--r-sm);display:flex;justify-content:space-between;align-items:center;font-size:var(--fs);cursor:pointer;transition:background var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.wo-picker-item:hover{background:var(--accent-soft)}
.wo-picker-item.active{background:var(--accent-soft);color:var(--accent-text);font-weight:700}
.wo-picker-name{flex:1;overflow:hidden;text-overflow:ellipsis}
.wo-picker-count{flex-shrink:0;margin-left:var(--sp-2);padding:1px var(--sp-2);font-size:var(--fs-sm);line-height:18px;color:var(--text);background:var(--bg-sub);border-radius:var(--r-sm)}
.wo-picker-item.active .wo-picker-count{background:var(--accent);color:#1e2a3e}
.icon-btn{width:40px;height:40px;min-width:40px;min-height:40px;flex-shrink:0;border:0;border-radius:var(--r-sm);background:var(--bg-sub);padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background var(--t);font:inherit;color:var(--text)}
.icon-btn:hover,.icon-btn.active{background:var(--accent);color:#1e2a3e}
.wo-order-item{padding:var(--sp-2) var(--sp-3);margin-bottom:var(--sp-1);border-radius:var(--r-sm);font-family:monospace;font-size:var(--fs);cursor:pointer;transition:background var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.wo-order-item:hover{background:var(--accent-soft)}
.wo-order-item.active{background:var(--accent-soft);color:var(--accent-text);font-weight:700}
.wo-order-item-id{display:block;font-weight:700;word-break:break-all}
.wo-order-item-products{display:block;font-size:var(--fs-sm);color:var(--text-muted);margin-top:var(--sp-1);padding-left:var(--sp-1);line-height:1.5;word-break:break-all;font-family:"Microsoft YaHei",sans-serif}
.wo-order-item.active .wo-order-item-products{color:var(--accent-text)}
.wo-empty-hint{padding:var(--sp-3);text-align:center;color:var(--text-muted);font-size:var(--fs-sm)}
.wo-main-body{flex:1;overflow-y:auto;padding:var(--sp-5) var(--sp-6);position:relative}
.wo-order-card{padding-bottom:var(--sp-6);margin-bottom:var(--sp-6);border-bottom:1px dashed var(--border-soft);scroll-margin-top:var(--sp-2);border:1px solid transparent;border-radius:var(--r);transition:border-color var(--t),box-shadow var(--t);padding-left:var(--sp-3);padding-right:var(--sp-3);padding-top:var(--sp-3)}
.wo-order-card:last-child{border-bottom:1px dashed var(--border-soft);margin-bottom:0}
.wo-order-card.highlight{border-color:var(--accent);box-shadow:0 0 0 2px rgba(255,189,0,.22)}
.wo-order-header{display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap;margin-bottom:var(--sp-2);padding-bottom:var(--sp-2);border-bottom:1px solid var(--border-soft)}
a.wo-order-link{font-size:20px;font-weight:700;color:var(--accent-hover);text-decoration:none;font-family:monospace;word-break:break-all;border-bottom:2px solid transparent;transition:border-color var(--t)}
a.wo-order-link:hover{border-bottom-color:var(--accent-hover);text-decoration:none;color:var(--accent-hover)}
.wo-order-date{font-size:var(--fs-sm);color:var(--text-muted);font-family:monospace}
.wo-order-count{font-size:var(--fs-sm);color:var(--text-muted);background:var(--bg-sub);padding:var(--sp-1) var(--sp-3);border-radius:var(--r-pill)}
.wo-order-subheader{display:flex;gap:var(--sp-4);flex-wrap:wrap;font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:var(--sp-4);padding-bottom:var(--sp-3);border-bottom:1px solid var(--border-soft)}
.wo-order-subitem{display:inline-flex;gap:var(--sp-1);align-items:baseline}
.wo-workorder-block{margin-bottom:var(--sp-4);padding:var(--sp-3) var(--sp-4);border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:var(--r-sm)}
.wo-workorder-block:last-child{margin-bottom:0}
.wo-workorder-header{font-size:var(--fs-sm);font-weight:700;color:var(--accent-text);margin-bottom:var(--sp-3);padding-bottom:var(--sp-2);border-bottom:1px dashed var(--accent)}
.wo-workorder-header-row{display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-4);align-items:baseline;font-weight:400;font-size:var(--fs-sm);color:var(--text-muted)}
.wo-workorder-header-row .wo-wh-label{color:var(--text-muted)}
.wo-workorder-header-row .wo-wh-value{color:var(--text-strong);font-weight:600}
.wo-workorder-header-row .wo-wh-value.wo-station{color:var(--danger)}
.wo-workorder-header-row .wo-wh-value.wo-other{color:var(--success)}
.wo-product-row{border:1px solid var(--border-soft);border-radius:var(--r);padding:var(--sp-3) var(--sp-4);margin-bottom:var(--sp-2);background:var(--bg-panel)}
.wo-product-row:last-child{margin-bottom:0}
.wo-product-name{font-size:var(--fs);font-weight:700;color:var(--text-strong);margin-bottom:var(--sp-2);word-break:break-word}
.wo-section{margin-top:var(--sp-2)}
.wo-section-label{font-size:var(--fs-xs);color:var(--text-muted);font-weight:700;letter-spacing:.5px;margin-bottom:var(--sp-1)}
.wo-section-content{font-size:var(--fs-sm);color:var(--text);line-height:1.7;white-space:pre-wrap;word-break:break-word}
.wo-section-content.wo-empty{color:var(--text-muted);font-style:italic}
.wo-attachments{display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-top:var(--sp-2)}
.wo-attachment-img{max-width:140px;max-height:140px;border-radius:var(--r-sm);border:1px solid var(--border-soft);cursor:zoom-in;object-fit:cover;background:var(--bg-sub);transition:transform var(--t-fast)}
.wo-attachment-img:hover{transform:scale(1.03)}
a.wo-attachment-fallback{font-size:var(--fs-sm);color:var(--danger);text-decoration:underline}
.wo-stats-area{display:none;padding:var(--sp-5) var(--sp-1) 40px}
.wo-stats-grid{display:flex;flex-direction:column;gap:var(--sp-6)}
.wo-stat-card{border:1px solid var(--border-soft);border-radius:var(--r);background:var(--bg-panel);padding:var(--sp-5);box-shadow:var(--shadow-sm)}
.wo-stat-card h3{font-size:var(--fs-md);font-weight:700;color:var(--text-strong);margin-bottom:var(--sp-4);padding-bottom:var(--sp-3);border-bottom:1px solid var(--border-soft)}
.wo-stat-summary{display:flex;gap:40px;flex-wrap:wrap;padding:var(--sp-2) 0 var(--sp-1)}
.wo-stat-summary-item{flex:0 0 auto;min-width:120px}
.wo-stat-summary-label{font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:var(--sp-1)}
.wo-stat-summary-value{font-size:28px;font-weight:700;color:var(--text-strong);line-height:1.2}
.wo-stat-summary-value.wo-accent-f{color:var(--accent-hover)}
.wo-stat-summary-value.wo-accent-p{color:var(--info)}
.wo-stat-summary-pct{font-size:var(--fs-sm);color:var(--text);margin-left:var(--sp-1);font-weight:400}
.wo-chart-wrap{position:relative;width:100%}
.wo-chart-wrap.h-300{height:300px}
.wo-chart-wrap.h-400{height:400px}
.wo-stats-loading{padding:60px;text-align:center;color:var(--text-muted)}
.wo-stat-list{margin-top:var(--sp-4);border-top:1px solid var(--border-soft);padding-top:var(--sp-3)}
.wo-stat-list-title{font-size:var(--fs-sm);color:var(--text-muted);font-weight:700;letter-spacing:.5px;margin-bottom:var(--sp-3)}
.wo-stat-row{display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-1) var(--sp-1);border-bottom:1px solid var(--border-soft);font-size:var(--fs-sm);color:var(--text)}
.wo-stat-row:last-child{border-bottom:none}
.wo-stat-row-clickable{cursor:pointer;transition:background var(--t);border-radius:var(--r-sm)}
.wo-stat-row-clickable:hover{background:var(--accent-soft)}
.wo-stat-rank{flex:0 0 36px;text-align:right;color:var(--text-muted);font-family:monospace;font-size:var(--fs-sm)}
.wo-stat-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-strong)}
.wo-stat-bar{flex:0 0 160px;height:8px;background:var(--bg-sub);border-radius:var(--r-sm);overflow:hidden}
.wo-stat-bar-inner{height:100%;background:var(--info);border-radius:var(--r-sm)}
.wo-stat-count{flex:0 0 72px;text-align:right;font-family:monospace;font-size:var(--fs-sm);color:var(--text-strong)}
.wo-stat-pct{flex:0 0 60px;text-align:right;font-family:monospace;font-size:var(--fs-sm);color:var(--text-muted)}
@media (prefers-reduced-motion:reduce){.wo-pickers-col,.wo-orders-col,.wo-main,.wo-col-full,.wo-col-slim{transition:none!important}}
@media (max-width:900px){
.wo-columns{flex-direction:column;height:auto;min-height:0}
.wo-pickers-col,.wo-orders-col,.wo-main{flex:none!important;max-height:220px}
.wo-pickers-col .wo-col-slim,.wo-main .wo-col-slim{display:none!important}
.wo-pickers-col .wo-col-full,.wo-main .wo-col-full{opacity:1!important;pointer-events:auto!important}
.wo-stat-bar{flex:0 0 80px}
}`
};

window.WorkOrderParserModule = WorkOrderParserModule;