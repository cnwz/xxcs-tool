/**
 * @description 工单解析模块，按分拣员分组，以MD阅读器形式浏览工单详情。
 * @author me@cnwz.me
 * @since 2026-09-10
 * @lastupdate 2026-09-17
 * @version 1.0.0
 * @wiki https://gitee.com/{repo}/wikis/模块示例/工单解析
 * @rules ./rules/WorkOrderParserModule.md
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class WorkOrderParserModule {
    constructor(app) {
        this.app = app;
        this.title = WO_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-17';
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
        this._iconCache = {
            upload: this.app.getIcon('upload'),
            peopleHeader: this.app.getIcon('people-fill', 14),
            personBtn: this.app.getIcon('person-fill', 18),
            fileTextSlim: this.app.getIcon('file-text', 22),
        };
    }

    injectStyles() {
        this.app.injectStyle(this.id, WO_TEXT.styles);
    }

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

        // 责任方数据源判定
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
            const workOrderId = get(col.workOrderId);
            const woCreatedDate = get(col.woCreatedDate);
            const woCreatedTime = get(col.woCreatedTime);
            const woCreatedAt = [woCreatedDate, woCreatedTime].filter(Boolean).join(' ');
            const orderDateRaw = get(col.orderDate) || get(col.packCompleteTime) || woCreatedDate;
            const categoryRaw = get(col.category1);
            const faqRaw = get(col.faqName);
            const finalVal = get(col.finalResponsible);
            const initialVal = get(col.initialResponsible);
            const originalVal = get(col.originalResponsible);

            // 责任方显示文本 + 是否门店
            let responsibleText = '';
            let isStation = false;
            if (hasInitialFinal) {
                const parts = [];
                if (initialVal) parts.push(`初判：${initialVal}`);
                if (finalVal) parts.push(`终判：${finalVal}`);
                responsibleText = parts.join('　');
                isStation = (finalVal === WO_TEXT.stationResponsible) || (initialVal === WO_TEXT.stationResponsible);
            } else if (hasOriginal) {
                responsibleText = originalVal ? `责任方：${originalVal}` : '';
                isStation = (originalVal === WO_TEXT.stationResponsible);
            }

            const record = {
                workOrderId: workOrderId,
                orderId: orderId,
                picker: pickerName,
                courier: get(col.courier),
                productName: get(col.productName),
                feedback: get(col.feedback),
                attachments: this._parseAttachments(get(col.attachments)),
                result: get(col.result),
                workOrderCreatedAt: woCreatedAt,
                responsibleText: responsibleText,
                faqName: faqRaw,
                isStation: isStation,
            };
            if (!pickers.has(pickerName)) pickers.set(pickerName, new Map());
            const orderMap = pickers.get(pickerName);
            if (!orderMap.has(orderId)) {
                orderMap.set(orderId, {
                    orderId: orderId,
                    workOrders: new Map(),
                    orderDate: this._formatDate(orderDateRaw),
                    categoryValue: categoryRaw || '',
                    faqValue: faqRaw || '',
                });
            }
            const order = orderMap.get(orderId);
            if (!order.orderDate && orderDateRaw) order.orderDate = this._formatDate(orderDateRaw);
            if (!order.categoryValue && categoryRaw) order.categoryValue = categoryRaw;
            if (!order.faqValue && faqRaw) order.faqValue = faqRaw;

            const woKey = workOrderId || '__none__';
            if (!order.workOrders.has(woKey)) {
                order.workOrders.set(woKey, { workOrderId: workOrderId, rows: [] });
            }
            order.workOrders.get(woKey).rows.push(record);
            totalRows++;
        }
        let totalOrders = 0;
        for (const orderMap of pickers.values()) totalOrders += orderMap.size;
        this._pickers = pickers;
        this._sortedPickers = Array.from(pickers.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        this._currentPickerKey = this._sortedPickers.length ? this._sortedPickers[0] : null;
        this._stats = { totalRows: totalRows, orderCount: totalOrders, pickerCount: pickers.size };
    }

    _formatDate(val) {
        if (!val) return '';
        const s = String(val).trim();
        const m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        return s;
    }

    _parseAttachments(str) {
        if (!str) return [];
        return str.split(/[;；]/)
            .map(s => s.trim())
            .filter(s => s && (/^https?:\/\//i.test(s) || s.startsWith('data:image')));
    }

    _getCategorySuffix(order) {
        const cat = order.categoryValue || '';
        if (cat) {
            if (cat.includes('履约')) return WO_TEXT.category_fulfillment;
            if (cat.includes('商品')) return WO_TEXT.category_product;
        }
        const faq = order.faqValue || '';
        if (faq.includes('少送') || faq.includes('错送')) return WO_TEXT.category_fulfillment;
        return WO_TEXT.category_product;
    }

    _getFilteredOrders(pickerKey) {
        const orderMap = this._pickers.get(pickerKey);
        if (!orderMap) return [];
        const wantStation = this._currentTab === 'station';
        const result = [];
        orderMap.forEach(order => {
            const filteredWorkOrders = new Map();
            order.workOrders.forEach((wo, key) => {
                const filteredRows = wo.rows.filter(r => r.isStation === wantStation);
                if (filteredRows.length > 0) {
                    filteredWorkOrders.set(key, { workOrderId: wo.workOrderId, rows: filteredRows });
                }
            });
            if (filteredWorkOrders.size > 0) {
                result.push({
                    orderId: order.orderId,
                    orderDate: order.orderDate,
                    categoryValue: order.categoryValue,
                    faqValue: order.faqValue,
                    workOrders: filteredWorkOrders,
                });
            }
        });
        // 订单号倒序
        result.sort((a, b) => b.orderId.localeCompare(a.orderId));
        return result;
    }

    _getFilteredPickers() {
        const wantStation = this._currentTab === 'station';
        return this._sortedPickers.filter(pickerKey => {
            const orderMap = this._pickers.get(pickerKey);
            if (!orderMap) return false;
            let has = false;
            orderMap.forEach(order => {
                if (has) return;
                order.workOrders.forEach(wo => {
                    if (!has && wo.rows.some(r => r.isStation === wantStation)) has = true;
                });
            });
            return has;
        });
    }

    _countByTab(isStation) {
        let count = 0;
        this._pickers.forEach(orderMap => {
            orderMap.forEach(order => {
                let has = false;
                order.workOrders.forEach(wo => {
                    if (!has && wo.rows.some(r => r.isStation === isStation)) has = true;
                });
                if (has) count++;
            });
        });
        return count;
    }

    _bindEvents(panel) {
        const fileInput = panel.querySelector('#woFileInput');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this._handleFile(e.target.files[0]);
            }
        });
        panel.querySelector('#woUploadBtn').addEventListener('click', () => {
            if (fileInput.files && fileInput.files[0]) {
                this._handleFile(fileInput.files[0]);
            } else {
                fileInput.click();
            }
        });
        panel.querySelector('#woResetBtn').addEventListener('click', () => this._reset(panel));

        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }
        this._documentClickHandler = (e) => {
            if (this._viewMode === 'C') return;
            if (e.target.closest && e.target.closest('.wo-columns')) return;
            if (e.target.closest && e.target.closest('.wo-img-viewer')) return;
            const cols = document.getElementById('woColumns');
            if (!cols || cols.offsetParent === null) return;
            this._viewMode = 'C';
            this._applyViewMode();
        };
        document.addEventListener('click', this._documentClickHandler);
    }

    async _handleFile(file) {
        if (file.size > 20 * 1024 * 1024) {
            this.app.showMessage(WO_TEXT.msg_fileTooLarge, 'error');
            return;
        }
        const status = document.getElementById('woStatus');
        if (status) status.textContent = WO_TEXT.status_parsing;
        try {
            const rows = await this.app.readExcel(file);
            if (!rows || rows.length < 2) {
                this.app.showMessage(WO_TEXT.msg_emptyFile, 'error');
                if (status) status.textContent = '';
                return;
            }
            if (rows.length > 50000) {
                this.app.showMessage('数据超过 5 万行，请拆分后上传', 'error');
                if (status) status.textContent = '';
                return;
            }
            this._parseRows(rows);
            this._renderAll();
            if (status) status.textContent = WO_TEXT.status_summary.replace('{rows}', this._stats.totalRows).replace('{orders}', this._stats.orderCount).replace('{pickers}', this._stats.pickerCount);
            this.app.showMessage(WO_TEXT.msg_parseOk.replace('{n}', this._stats.totalRows), 'success');
        } catch (err) {
            console.error(err);
            if (status) status.textContent = '';
            this.app.showMessage(WO_TEXT.msg_parseFailed + err.message, 'error');
        }
    }

    _renderAll() {
        const contentArea = document.getElementById('woContentArea');
        const emptyState = document.getElementById('woEmptyState');
        if (!this._pickers.size) {
            contentArea.style.display = 'none';
            emptyState.style.display = '';
            emptyState.textContent = WO_TEXT.emptyAfterParse;
            return;
        }
        emptyState.style.display = 'none';
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
        if (this._flat.length > 0) {
            this._setActive(this._flat[0].orderId);
        }
    }

    _renderTabBar() {
        const bar = document.getElementById('woTabBar');
        if (!bar) return;
        const stationCount = this._countByTab(true);
        const nonStationCount = this._countByTab(false);
        bar.innerHTML = `
            <button class="wo-tab-btn${this._currentTab === 'station' ? ' active' : ''}" data-tab="station">${WO_TEXT.tab_station.replace('{n}', stationCount)}</button>
            <button class="wo-tab-btn${this._currentTab === 'nonStation' ? ' active' : ''}" data-tab="nonStation">${WO_TEXT.tab_nonStation.replace('{n}', nonStationCount)}</button>
        `;
        bar.querySelectorAll('.wo-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab === this._currentTab) return;
                this._currentTab = tab;
                this._currentOrderId = null;
                this._viewMode = 'C';
                this._renderTabBar();
                this._renderPickerList();
                this._renderPickerContent();
                this._applyViewMode();
                if (this._flat.length > 0) {
                    this._setActive(this._flat[0].orderId);
                }
            });
        });
    }

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
        list.forEach(pickerKey => {
            const orders = this._getFilteredOrders(pickerKey);
            const li = document.createElement('li');
            li.innerHTML = `<div class="wo-picker-item${pickerKey === this._currentPickerKey ? ' active' : ''}" data-picker="${this.app.escapeHtml(pickerKey)}"><span class="wo-picker-name">${this.app.escapeHtml(pickerKey)}</span><span class="wo-picker-count">${orders.length}</span></div>`;
            listEl.appendChild(li);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-btn' + (pickerKey === this._currentPickerKey ? ' active' : '');
            btn.dataset.picker = pickerKey;
            btn.title = pickerKey;
            btn.innerHTML = this._iconCache.personBtn;
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

    _applyViewMode() {
        const cols = document.getElementById('woColumns');
        if (!cols) return;
        cols.classList.remove('state-a', 'state-b');
        if (this._viewMode === 'A') cols.classList.add('state-a');
        else if (this._viewMode === 'B') cols.classList.add('state-b');
    }

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
            const suffix = this._getCategorySuffix(order);

            const names = [];
            const seen = new Set();
            order.workOrders.forEach(wo => {
                wo.rows.forEach(r => {
                    const n = r.productName;
                    if (n && !seen.has(n)) { seen.add(n); names.push(n); }
                });
            });
            const productsText = names.slice(0, 2).join(' / ') + (names.length > 2 ? ` +${names.length - 2}` : '');
            orderListHtml += `<li><div class="wo-order-item" data-order="${esc(order.orderId)}" data-target="${targetId}"><span class="wo-order-item-id">${esc(order.orderId)}</span>${suffix ? `<span class="wo-order-item-suffix">${esc(suffix)}</span>` : ''}<span class="wo-order-item-products">${esc(productsText)}</span></div></li>`;

            // 订单级 分拣员/配送员 聚合
            let orderPicker = '', orderCourier = '';
            order.workOrders.forEach(wo => {
                wo.rows.forEach(r => {
                    if (!orderPicker && r.picker) orderPicker = r.picker;
                    if (!orderCourier && r.courier) orderCourier = r.courier;
                });
            });

            let totalRows = 0;
            order.workOrders.forEach(wo => { totalRows += wo.rows.length; });
            const multiWorkOrder = order.workOrders.size > 1;
            let blocksHtml = '';
            order.workOrders.forEach(wo => {
                let blockHtml = '<div class="wo-workorder-block">';
                if (multiWorkOrder) {
                    const woLabel = wo.workOrderId
                        ? WO_TEXT.workOrderLabel.replace('{id}', esc(wo.workOrderId))
                        : WO_TEXT.workOrderLabelEmpty;
                    blockHtml += `<div class="wo-workorder-header">${woLabel}${WO_TEXT.workOrderRowCount.replace('{n}', wo.rows.length)}</div>`;
                }
                wo.rows.forEach(rec => { blockHtml += this._buildRowHtml(rec); });
                blockHtml += '</div>';
                blocksHtml += blockHtml;
            });

            // 订单头部第二行
            let subheaderHtml = '';
            if (orderPicker) subheaderHtml += `<span class="wo-order-subitem"><span class="wo-meta-label">${esc(WO_TEXT.meta_picker)}：</span><span class="wo-meta-value">${esc(orderPicker)}</span></span>`;
            if (orderCourier) subheaderHtml += `<span class="wo-order-subitem"><span class="wo-meta-label">${esc(WO_TEXT.meta_courier)}：</span><span class="wo-meta-value">${esc(orderCourier)}</span></span>`;

            const orderHref = this.app.buildUrl('?order=id' + encodeURIComponent(order.orderId));// 订单详情页拼接
            mainHtml += `<div class="wo-order-card" id="${targetId}" data-order="${esc(order.orderId)}" data-picker="${esc(this._currentPickerKey)}"><div class="wo-order-header"><a class="wo-order-link" href="${esc(orderHref)}" target="_blank" rel="noopener noreferrer">${esc(order.orderId)}</a>${order.orderDate ? `<span class="wo-order-date">${esc(order.orderDate)}</span>` : ''}<span class="wo-order-count">${WO_TEXT.orderRowCount.replace('{n}', totalRows)}</span></div>${subheaderHtml ? `<div class="wo-order-subheader">${subheaderHtml}</div>` : ''}${blocksHtml}</div>`;
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
                wo.rows.forEach(rec => {
                    rec.attachments.forEach(url => orderAttachments.push(url));
                });
            });

            let urlIdx = 0;
            order.workOrders.forEach(wo => {
                wo.rows.forEach(rec => {
                    if (rec.attachments.length === 0) return;
                    const sections = record.cardEl.querySelectorAll('.wo-section');
                    let targetSec = null;
                    sections.forEach(sec => {
                        const label = sec.querySelector('.wo-section-label');
                        if (!targetSec && label && label.textContent === WO_TEXT.section_attachments) {
                            targetSec = sec;
                        }
                    });
                    if (targetSec) {
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
                    }
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

    _onMainScroll() {
        if (this._scrollRaf) return;
        this._scrollRaf = requestAnimationFrame(() => {
            this._scrollRaf = null;
            this._updateActiveOutline();
        });
    }

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

    _buildRowHtml(rec) {
        const esc = (s) => this.app.escapeHtml(s);
        let metaHtml = '';

        // 工单号 + 时间
        metaHtml += '<span class="wo-meta-item">';
        if (rec.workOrderId) {
            metaHtml += `<span class="wo-meta-label">${esc(WO_TEXT.meta_workOrderId)}：</span><span class="wo-meta-value">${esc(rec.workOrderId)}</span>`;
        }
        if (rec.workOrderCreatedAt) {
            metaHtml += `<span class="wo-meta-value wo-meta-value-secondary">${esc(rec.workOrderCreatedAt)}</span>`;
        }
        metaHtml += '</span>';

        // 责任方
        if (rec.responsibleText) {
            const cls = rec.isStation
                ? 'wo-meta-value wo-meta-responsible wo-meta-responsible-station'
                : 'wo-meta-value wo-meta-responsible wo-meta-responsible-other';
            metaHtml += '<span class="wo-meta-item">';
            metaHtml += `<span class="${cls}">${esc(rec.responsibleText)}</span>`;
            metaHtml += '</span>';
        }

        // FAQ
        if (rec.faqName) {
            metaHtml += '<span class="wo-meta-item">';
            metaHtml += `<span class="wo-meta-label">${esc(WO_TEXT.meta_faq)}：</span><span class="wo-meta-value">${esc(rec.faqName)}</span>`;
            metaHtml += '</span>';
        }

        let html = `<div class="wo-row"><div class="wo-row-meta">${metaHtml}</div>`;
        if (rec.productName) {
            html += `<div class="wo-product-name">${esc(rec.productName)}</div>`;
        }
        html += this._sectionHtml(WO_TEXT.section_feedback, rec.feedback);
        if (rec.attachments.length > 0) {
            html += `<div class="wo-section"><div class="wo-section-label">${esc(WO_TEXT.section_attachments)}</div><div class="wo-attachments"></div></div>`;
        }
        html += this._sectionHtml(WO_TEXT.section_result, rec.result);
        html += '</div>';
        return html;
    }

    _sectionHtml(labelText, content) {
        const hasContent = content && content.trim();
        const cls = hasContent ? 'wo-section-content' : 'wo-section-content wo-empty';
        const text = hasContent ? this.app.escapeHtml(content) : WO_TEXT.sectionEmpty;
        return `<div class="wo-section"><div class="wo-section-label">${this.app.escapeHtml(labelText)}</div><div class="${cls}">${text}</div></div>`;
    }

    _showImageViewer(images, startIndex) {
        if (!images || images.length === 0) return;
        this._closeImageViewer();

        let current = Math.max(0, Math.min(startIndex, images.length - 1));
        const total = images.length;

        const viewer = document.createElement('div');
        viewer.className = 'wo-img-viewer';
        viewer.innerHTML = `
            <button type="button" class="wo-img-viewer-close" title="${WO_TEXT.viewerClose}">×</button>
            ${total > 1 ? `<div class="wo-img-viewer-counter"><span class="wo-img-viewer-current">${current + 1}</span> / ${total}</div>` : ''}
            ${total > 1 ? `<button type="button" class="wo-img-viewer-prev" title="${WO_TEXT.viewerPrev}">‹</button>` : ''}
            <div class="wo-img-viewer-stage"><img src="${this.app.escapeHtml(images[current])}" alt="${WO_TEXT.alt_attachment}" /></div>
            ${total > 1 ? `<button type="button" class="wo-img-viewer-next" title="${WO_TEXT.viewerNext}">›</button>` : ''}
            <a class="wo-img-viewer-open" href="${this.app.escapeHtml(images[current])}" target="_blank" rel="noopener noreferrer">${WO_TEXT.btn_openOriginal}</a>
        `;
        document.body.appendChild(viewer);

        const imgEl = viewer.querySelector('.wo-img-viewer-stage img');
        const counterEl = viewer.querySelector('.wo-img-viewer-current');
        const openEl = viewer.querySelector('.wo-img-viewer-open');

        const update = (idx) => {
            current = ((idx % total) + total) % total;
            imgEl.src = images[current];
            openEl.href = images[current];
            if (counterEl) counterEl.textContent = current + 1;
        };

        viewer.querySelector('.wo-img-viewer-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this._closeImageViewer();
        });
        const prevBtn = viewer.querySelector('.wo-img-viewer-prev');
        const nextBtn = viewer.querySelector('.wo-img-viewer-next');
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                update(current - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                update(current + 1);
            });
        }
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer) this._closeImageViewer();
        });
        openEl.addEventListener('click', (e) => e.stopPropagation());

        this._viewerKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this._closeImageViewer();
            } else if (e.key === 'ArrowLeft' && total > 1) {
                update(current - 1);
            } else if (e.key === 'ArrowRight' && total > 1) {
                update(current + 1);
            }
        };
        document.addEventListener('keydown', this._viewerKeyHandler);
    }

    _closeImageViewer() {
        const viewers = document.querySelectorAll('.wo-img-viewer');
        viewers.forEach(v => v.remove());
        if (this._viewerKeyHandler) {
            document.removeEventListener('keydown', this._viewerKeyHandler);
            this._viewerKeyHandler = null;
        }
    }

    destroy() {
        this._closeImageViewer();
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

    _reset(panel) {
        this._closeImageViewer();
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
        const input = panel.querySelector('#woFileInput');
        if (input) input.value = '';
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
        const emptyState = document.getElementById('woEmptyState');
        if (emptyState) {
            emptyState.style.display = '';
            emptyState.textContent = WO_TEXT.emptyHint;
        }
        const status = document.getElementById('woStatus');
        if (status) status.textContent = '';
        this.app.showMessage(WO_TEXT.msg_reset, 'success');
    }

    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header">
                    <h2>${WO_TEXT.title}</h2>
                    ${this.app.getHelpButton(this.id)}
                </div>
                <div class="wo-toolbar">
                    <input type="file" id="woFileInput" accept=".xlsx,.xls" class="wo-file-input">
                    <button id="woUploadBtn" class="btn">${this._iconCache.upload} ${WO_TEXT.btn_upload}</button>
                    <button id="woResetBtn" class="btn btn-secondary">${WO_TEXT.btn_reset}</button>
                    <span class="wo-status" id="woStatus"></span>
                </div>
                <div id="woContentArea" class="wo-content-area">
                    <div class="wo-tabs-bar" id="woTabBar"></div>
                    <div class="wo-columns" id="woColumns">
                        <aside class="wo-pickers-col">
                            <div class="wo-col-full">
                                <div class="wo-col-title">${WO_TEXT.pickersTitle}</div>
                                <ul class="wo-list" id="woPickerList"></ul>
                            </div>
                            <div class="wo-col-slim">
                                <div class="wo-col-title wo-col-title-slim">${this._iconCache.peopleHeader}</div>
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
                                <div class="wo-col-title wo-col-title-slim wo-col-title-slim-fill">${this._iconCache.fileTextSlim}</div>
                            </div>
                        </main>
                    </div>
                </div>
                <div id="woEmptyState" class="wo-empty-state">${WO_TEXT.emptyHint}</div>
            </div>
        `;
        this._bindEvents(panel);
    }
}

window.WorkOrderParserModule = WorkOrderParserModule;

const WO_TEXT = {
    title: '工单解析',
    introText: '（简介待补充）',
    helpDescription: '（说明待补充）',

    btn_upload: '上传并解析',
    btn_reset: '重置',
    pickersTitle: '分拣员',
    ordersTitle: '订单号',
    mainTitle: '正文',
    tab_station: '站责 ({n})',
    tab_nonStation: '非站责 ({n})',
    stationResponsible: '门店',
    emptyHint: '请上传工单 Excel 文件开始解析',
    emptyAfterParse: '没有解析到有效数据',
    emptyTabHint: '该分类下无数据',
    orderRowCount: '{n} 条',
    workOrderLabel: '工单号：{id}',
    workOrderLabelEmpty: '工单号：未提供',
    workOrderRowCount: '（{n} 条）',
    category_fulfillment: '履约',
    category_product: '商品',
    alt_attachment: '附件图片',
    attachmentLoadFailed: '图片加载失败，点击打开',
    section_feedback: '问题反馈',
    section_attachments: '附件',
    section_result: '处理结果',
    sectionEmpty: '（无）',
    meta_workOrderId: '工单号',
    meta_picker: '分拣员',
    meta_responsible: '责任方',
    meta_faq: '判责FAQ',
    meta_courier: '配送员',
    defaultPicker: '未指定分拣员',
    btn_openOriginal: '在新标签页打开原图',
    viewerClose: '关闭',
    viewerPrev: '上一张',
    viewerNext: '下一张',

    status_parsing: '正在解析...',
    status_summary: '共 {rows} 条工单 · {orders} 个订单 · {pickers} 个分拣员',
    msg_fileTooLarge: '文件过大（超过20MB），请拆分后上传',
    msg_emptyFile: '文件内容为空或只有表头',
    msg_parseOk: '解析成功，共 {n} 条工单',
    msg_parseFailed: '解析失败: ',
    msg_readFailed: '文件读取失败',
    msg_reset: '已重置',

    styles: `
.wo-toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:18px}
.wo-file-input{max-width:320px}
.wo-toolbar .wo-status{font-size:14px;color:#666}
.wo-content-area{display:none}
.wo-tabs-bar{display:flex;gap:8px;margin-bottom:12px;border-bottom:2px solid #f0f0f0}
.wo-tab-btn{padding:8px 18px;border:1px solid #e0e0e0;border-bottom:none;border-radius:8px 8px 0 0;background:#f5f5f5;color:#555;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .2s;font-family:inherit;margin-bottom:-2px}
.wo-tab-btn:hover{background:#fff8e1;color:#333}
.wo-tab-btn.active{background:#fff;color:#FFA000;border-color:#e0e0e0;box-shadow:0 -2px 6px rgba(255,189,0,0.15)}
.wo-columns{display:flex;gap:12px;height:calc(100vh - 380px);min-height:480px;--wo-slim:56px;--wo-order:240px;--wo-ease:cubic-bezier(.65,0,.35,1);--wo-slow:.5s}
.wo-pickers-col,.wo-orders-col,.wo-main{position:relative;border:1px solid #eee;border-radius:10px;overflow:hidden;min-width:0;background:#fafafa;transition:flex-grow var(--wo-slow) var(--wo-ease),flex-basis var(--wo-slow) var(--wo-ease)}
.wo-pickers-col{flex:1 1 0;background:#fff}
.wo-orders-col{flex:1 1 0}
.wo-main{flex:1.5 1 0;background:#fff}
.wo-columns.state-a .wo-main{flex:0 0 var(--wo-slim)}
.wo-columns.state-b .wo-pickers-col{flex:0 0 var(--wo-slim)}
.wo-columns.state-b .wo-orders-col{flex:0 0 var(--wo-order)}
.wo-columns.state-b .wo-main{flex:1 1 0}
.wo-col-title{height:38px;padding:10px 12px;font-size:14px;font-weight:700;letter-spacing:.5px;color:#999;border-bottom:1px solid #eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-col-title-slim{display:flex;align-items:center;justify-content:center;padding:0;color:#bbb}
.wo-col-title-slim .icon-img{margin-right:0}
.wo-col-title-slim-fill{flex:1;border-bottom:none}
.wo-col-full,.wo-col-slim{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;transition:opacity .12s ease 0s;overflow:hidden}
.wo-col-slim{opacity:0;pointer-events:none}
.wo-columns.state-a .wo-main .wo-col-full,
.wo-columns.state-b .wo-pickers-col .wo-col-full{opacity:0;pointer-events:none;transition-delay:.42s}
.wo-columns.state-a .wo-main .wo-col-slim,
.wo-columns.state-b .wo-pickers-col .wo-col-slim{opacity:1;pointer-events:auto;transition-delay:.42s}
.wo-list{list-style:none;margin:0;padding:8px;flex:1;overflow-y:auto;overflow-x:hidden}
.wo-list-slim{padding:8px 0;flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;overflow-y:auto;overflow-x:hidden}
.wo-picker-item{height:42px;padding:10px 12px;margin-bottom:4px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;font-size:15px;cursor:pointer;transition:background .2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-picker-item:hover{background:#fff8e1}
.wo-picker-item.active{background:#fff8e1;color:#b08800;font-weight:700}
.wo-picker-name{flex:1;overflow:hidden;text-overflow:ellipsis}
.wo-picker-count{flex-shrink:0;margin-left:8px;padding:1px 8px;font-size:13px;line-height:18px;color:#666;background:#eee;border-radius:10px}
.wo-picker-item.active .wo-picker-count{background:#FFBD00;color:#1e2a3e}
.icon-btn{width:40px;height:40px;min-width:40px;min-height:40px;flex-shrink:0;border:0;border-radius:6px;background:#f0f0f0;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s;font:inherit;color:inherit}
.icon-btn:hover,.icon-btn.active{background:#FFBD00}
.icon-btn .icon-img{margin-right:0;opacity:.65;transition:opacity .2s}
.icon-btn:hover .icon-img,.icon-btn.active .icon-img{opacity:1}
.wo-order-item{padding:10px 12px;margin-bottom:4px;border-radius:6px;font-family:monospace;font-size:15px;cursor:pointer;transition:background .2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-order-item:hover{background:#fff8e1}
.wo-order-item.active{background:#fff8e1;color:#b08800;font-weight:700}
.wo-order-item-id{display:block;font-weight:700;word-break:break-all}
.wo-order-item-suffix{display:inline-block;font-size:13px;color:#999;background:#eee;border-radius:8px;padding:0 6px;margin-top:2px;font-family:"Microsoft YaHei",sans-serif}
.wo-order-item-products{display:block;font-size:13px;color:#999;margin-top:3px;padding-left:6px;line-height:1.5;word-break:break-all;font-family:"Microsoft YaHei",sans-serif}
.wo-order-item.active .wo-order-item-products{color:#b08800}
.wo-empty-hint{padding:12px;text-align:center;color:#999;font-size:14px}
.wo-main-body{flex:1;overflow-y:auto;padding:20px 24px;position:relative}
.wo-order-card{padding-bottom:24px;margin-bottom:24px;border-bottom:1px dashed #eee;scroll-margin-top:8px;border:1px solid transparent;border-radius:8px;transition:border-color .2s,box-shadow .2s;padding-left:12px;padding-right:12px;padding-top:12px}
.wo-order-card:last-child{border-bottom:1px dashed #eee;margin-bottom:0}
.wo-order-card.highlight{border-color:#FFBD00;box-shadow:0 0 0 2px rgba(255,189,0,.22)}
.wo-order-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f5f5f5}
a.wo-order-link{font-size:20px;font-weight:700;color:#FFA000;text-decoration:none;font-family:monospace;word-break:break-all;border-bottom:2px solid transparent;transition:border-color .2s}
a.wo-order-link:hover{border-bottom-color:#FFA000;text-decoration:none;color:#FFA000}
.wo-order-date{font-size:14px;color:#999;font-family:monospace}
.wo-order-count{font-size:13px;color:#999;background:#f5f5f5;padding:3px 10px;border-radius:20px}
.wo-order-subheader{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:#666;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f5f5f5}
.wo-order-subitem{display:inline-flex;gap:4px;align-items:baseline}
.wo-workorder-block{margin-bottom:16px;padding:12px 14px;border-left:3px solid #FFBD00;background:#fffdf5;border-radius:6px}
.wo-workorder-block:last-child{margin-bottom:0}
.wo-workorder-header{font-size:14px;font-weight:700;color:#b08800;margin-bottom:10px;padding-bottom:6px;border-bottom:1px dashed #ffe082;font-family:monospace;word-break:break-all}
.wo-row{border:1px solid #f0f0f0;border-radius:8px;padding:14px 16px;margin-bottom:10px;background:#fafafa}
.wo-row:last-child{margin-bottom:0}
.wo-row-meta{display:flex;flex-wrap:wrap;gap:10px 24px;font-size:14px;color:#666;margin-bottom:12px}
.wo-meta-item{display:inline-flex;gap:6px;align-items:baseline}
.wo-meta-label{color:#999}
.wo-meta-value{color:#333;font-weight:600}
.wo-meta-value-secondary{color:#999;font-weight:400}
.wo-meta-responsible{font-weight:700}
.wo-meta-responsible-station{color:#f44336}
.wo-meta-responsible-other{color:#4caf50}
.wo-product-name{font-size:16px;font-weight:700;color:#333;margin-bottom:12px;word-break:break-word}
.wo-section{margin-top:10px}
.wo-section-label{font-size:13px;color:#999;font-weight:700;letter-spacing:.5px;margin-bottom:4px}
.wo-section-content{font-size:15px;color:#444;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.wo-section-content.wo-empty{color:#bbb;font-style:italic}
.wo-attachments{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.wo-attachment-img{max-width:140px;max-height:140px;border-radius:6px;border:1px solid #eee;cursor:zoom-in;object-fit:cover;background:#f5f5f5;transition:transform .15s}
.wo-attachment-img:hover{transform:scale(1.03)}
a.wo-attachment-fallback{font-size:13px;color:#f44336;text-decoration:underline}
.wo-empty-state{text-align:center;padding:80px 20px;color:#999;font-size:16px}
.wo-img-viewer{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:20000;display:flex;align-items:center;justify-content:center;animation:woFadeIn .2s ease}
@keyframes woFadeIn{from{opacity:0}to{opacity:1}}
.wo-img-viewer-stage{max-width:92vw;max-height:88vh;display:flex;align-items:center;justify-content:center}
.wo-img-viewer-stage img{max-width:92vw;max-height:88vh;object-fit:contain;display:block;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,.6)}
.wo-img-viewer-close{position:absolute;top:16px;right:20px;width:42px;height:42px;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:28px;line-height:1;border-radius:50%;cursor:pointer;transition:background .2s;display:flex;align-items:center;justify-content:center;padding:0}
.wo-img-viewer-close:hover{background:rgba(255,255,255,.3)}
.wo-img-viewer-prev,.wo-img-viewer-next{position:absolute;top:50%;transform:translateY(-50%);width:56px;height:56px;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:38px;line-height:1;border-radius:50%;cursor:pointer;transition:background .2s;display:flex;align-items:center;justify-content:center;padding:0 0 6px 0;font-family:inherit}
.wo-img-viewer-prev:hover,.wo-img-viewer-next:hover{background:rgba(255,255,255,.3)}
.wo-img-viewer-prev{left:24px}
.wo-img-viewer-next{right:24px}
.wo-img-viewer-counter{position:absolute;top:22px;left:50%;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,.55);padding:6px 16px;border-radius:20px;font-size:15px;font-family:monospace;letter-spacing:1px}
.wo-img-viewer-current{font-weight:700;color:#FFBD00}
a.wo-img-viewer-open{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);color:#fff;background:rgba(255,255,255,.15);padding:8px 20px;border-radius:20px;font-size:14px;text-decoration:none;transition:background .2s}
a.wo-img-viewer-open:hover{background:rgba(255,255,255,.3);text-decoration:none;color:#fff}
body.dark-mode .wo-tabs-bar,
body.dark-mode .wo-col-title{border-bottom-color:#3a3a48}
body.dark-mode .wo-pickers-col,
body.dark-mode .wo-orders-col{background:#1a1a24;border-color:#2d2d38}
body.dark-mode .wo-main{background:#1e1e2a;border-color:#2d2d38}
body.dark-mode .wo-tab-btn{background:#2a2a36;border-color:#3a3a48;color:#bbb}
body.dark-mode .wo-tab-btn:hover{background:#3a3a48;color:#fff}
body.dark-mode .wo-tab-btn.active{background:#1e1e2a;color:#FFBD00;border-color:#3a3a48}
body.dark-mode .wo-col-title,
body.dark-mode .wo-picker-count,
body.dark-mode .wo-order-item-suffix,
body.dark-mode .wo-empty-hint,
body.dark-mode .wo-order-date,
body.dark-mode .wo-order-count,
body.dark-mode .wo-meta-label,
body.dark-mode .wo-meta-value-secondary,
body.dark-mode .wo-section-label,
body.dark-mode .wo-order-item-products,
body.dark-mode .wo-empty-state,
body.dark-mode .wo-order-subheader{color:#888}
body.dark-mode .wo-picker-item,
body.dark-mode .wo-order-item{color:#ddd}
body.dark-mode .wo-picker-item:hover,
body.dark-mode .wo-order-item:hover{background:#2a2a36}
body.dark-mode .wo-picker-item.active,
body.dark-mode .wo-order-item.active{background:#2a2a36;color:#FFBD00}
body.dark-mode .wo-picker-item.active .wo-picker-count{background:#FFBD00;color:#1e2a3e}
body.dark-mode .wo-order-item.active .wo-order-item-products{color:#FFBD00}
body.dark-mode .icon-btn{background:#2a2a36}
body.dark-mode .icon-btn .icon-img{--icon-filter:invert(1);opacity:.75}
body.dark-mode .icon-btn:hover,body.dark-mode .icon-btn.active{background:#FFBD00}
body.dark-mode .icon-btn:hover .icon-img,body.dark-mode .icon-btn.active .icon-img{--icon-filter:invert(0);opacity:1}
body.dark-mode .wo-col-title-slim .icon-img{--icon-filter:invert(1);opacity:.6}
body.dark-mode .wo-order-header{border-bottom-color:#2d2d38}
body.dark-mode .wo-order-subheader{border-bottom-color:#2d2d38}
body.dark-mode .wo-order-card{border-bottom-color:#2d2d38}
body.dark-mode .wo-order-card.highlight{border-color:#FFBD00;box-shadow:0 0 0 2px rgba(255,189,0,.35)}
body.dark-mode .wo-workorder-block{background:#252530;border-left-color:#FFBD00}
body.dark-mode .wo-workorder-header{color:#FFBD00;border-bottom-color:#4a4a58}
body.dark-mode .wo-row{background:#2a2a36;border-color:#3a3a44}
body.dark-mode .wo-meta-value{color:#eee}
body.dark-mode .wo-meta-responsible-station{color:#ff6b6b}
body.dark-mode .wo-meta-responsible-other{color:#66bb6a}
body.dark-mode .wo-product-name{color:#fff}
body.dark-mode .wo-section-content{color:#ccc}
body.dark-mode .wo-section-content.wo-empty{color:#666}
@media (prefers-reduced-motion:reduce){.wo-pickers-col,.wo-orders-col,.wo-main,.wo-col-full,.wo-col-slim{transition:none!important}}
@media (max-width:900px){
    .wo-columns{flex-direction:column;height:auto;min-height:0}
    .wo-pickers-col,.wo-orders-col,.wo-main{flex:none!important;max-height:220px}
    .wo-pickers-col .wo-col-slim,.wo-main .wo-col-slim{display:none!important}
    .wo-pickers-col .wo-col-full,.wo-main .wo-col-full{opacity:1!important;pointer-events:auto!important}
    .wo-img-viewer-prev,.wo-img-viewer-next{width:44px;height:44px;font-size:30px}
    .wo-img-viewer-prev{left:10px}
    .wo-img-viewer-next{right:10px}
}`
};