/**
 * @file MultiQRCodeModule.js
 * @description 多二维码生成模块
 * @author ls_wuzhen20
 * @since 2025-06-30
 * @lastupdate 2026-09-16
 * @version 1.0.0
 * @wiki https://gitee.com/{repo}/wikis/模块示例/多二维码生成
 * @rules ./rules/MultiQRCodeModule.md
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class MultiQRCodeModule {
    constructor(app) {
        this.app = app;
        this.title = MQ_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-16';
        this.iconName = 'qr-code';
        this.introText = MQ_TEXT.introText;
        this.helpDescription = MQ_TEXT.helpDescription;
        this._isComposing = false;
        this.productMap = new Map();
        this._loadingPromise = null;
        this._productMapLoadFailed = false;
        this._isOldMap = false;
        this.defaultCommonLocations = ['YC-CW-CZ-00-00', 'YC-CW-FJ-00-00', 'YC-CW-RK-00-00', 'YC-CW-T0-00-00', 'YC-CW-XJ-00-00', 'YC-LC-BS-FC-00', 'YC-LC-BS-SP-00', 'YC-LC-CZ-00-00', 'YC-LC-FJ-00-00', 'YC-LC-RK-00-00', 'YC-LC-T0-00-00', 'YC-LC-XJ-00-00', 'YC-LD-BS-SP-00', 'YC-LD-BS-SP-00', 'YC-LD-CZ-00-00', 'YC-LD-FJ-00-00', 'YC-LD-RK-00-00', 'YC-LD-T0-00-00', 'YC-LD-XJ-00-00'];
        this.commonLocations = [...this.defaultCommonLocations];
        this._commonLocationsLoading = null;
        this._commonLocationsLoadFailed = false;
        this._searchMode = 'product';
        this._searchResults = [];
        this._selectedIndex = -1;
        this._searchTimer = null;
        this._loadProductMap().catch(err => this.app._log('productMap 加载失败：', err.message));
        this._loadCommonLocations().catch(err => this.app._log('commonLocations 加载失败：', err.message));
        this.app.loadLibrary('qrcode').catch(err => this.app._log('qrcode 库加载失败：', err.message));
    }

    injectStyles() {
        this.app.injectStyle(this.id, MQ_TEXT.styles);
    }

    // ==================== 数据加载 ====================
    async _loadProductMap() {
        if (this._loadingPromise) return this._loadingPromise;
        this._loadingPromise = (async () => {
            const localUrl = 'js/data/productMap.js';
            const cdnUrl = `${this.app.cdnBase}main/js/data/productMap.js`;

            if (window.productMapData === undefined) {
                await this.app._loadScript(localUrl);
            }
            if (window.productMapData !== undefined) {
                return this._applyProductMapData();
            }

            if (this.app.cdnAlive) {
                await this.app._loadScript(cdnUrl);
                if (window.productMapData !== undefined) {
                    return this._applyProductMapData();
                }
            }

            this._productMapLoadFailed = true;
            this._updateProductMapUI();
            throw new Error(MQ_TEXT.err_productMapLoadFailed.replace('{url}', localUrl));
        })();
        return this._loadingPromise;
    }

    _applyProductMapData() {
        const data = window.productMapData;
        if (Array.isArray(data)) {
            this._parseArrayProductMap(data);
            this._isOldMap = false;
            this._productMapLoadFailed = false;
            this._updateProductMapUI();
            this._onInput();
            return;
        }
        if (data instanceof Map) {
            const firstValue = data.values().next().value;
            if (typeof firstValue === 'string') {
                this._isOldMap = true;
                this.productMap = data;
                this._productMapLoadFailed = false;
                this._updateProductMapUI();
                return;
            }
            this._productMapLoadFailed = true;
            this._updateProductMapUI();
            throw new Error(MQ_TEXT.err_unknownMapFormat);
        }
        this._productMapLoadFailed = true;
        this._updateProductMapUI();
        throw new Error(MQ_TEXT.err_unknownMapFormat);
    }

    _parseArrayProductMap(arr) {
        const map = new Map();
        for (const item of arr) {
            if (!Array.isArray(item) || item.length < 2) continue;
            const code = String(item[0]).trim();
            const name = String(item[1]).trim();
            if (!code || !name) continue;
            const flag = item.length > 2 ? String(item[2]).trim().toLowerCase() : '';
            const needFresh = (flag === '是' || flag === 'true');
            map.set(code, { name, needFresh });
        }
        this.productMap = map;
    }

    async _loadCommonLocations() {
        if (this._commonLocationsLoading) return this._commonLocationsLoading;
        this._commonLocationsLoading = (async () => {
            const localUrl = 'js/data/commonLocations.js';
            const cdnUrl = `${this.app.cdnBase}main/js/data/commonLocations.js`;

            if (window.commonLocationsData === undefined) {
                await this.app._loadScript(localUrl);
            }
            if (Array.isArray(window.commonLocationsData)) {
                this.commonLocations = window.commonLocationsData;
                this._commonLocationsLoadFailed = false;
                return;
            }

            if (this.app.cdnAlive) {
                await this.app._loadScript(cdnUrl);
                if (Array.isArray(window.commonLocationsData)) {
                    this.commonLocations = window.commonLocationsData;
                    this._commonLocationsLoadFailed = false;
                    return;
                }
            }

            this.commonLocations = [...this.defaultCommonLocations];
            this._commonLocationsLoadFailed = true;
            console.warn(MQ_TEXT.warn_commonLocationsLoadFailed.replace('{url}', localUrl));
        })();
        return this._commonLocationsLoading;
    }

    _updateProductMapUI() {
        const tag = document.getElementById('basicVersionTag');
        if (tag) tag.style.display = this._productMapLoadFailed ? '' : 'none';
        const statusSpan = document.getElementById('productMapStatus');
        if (statusSpan) {
            if (this._productMapLoadFailed) {
                statusSpan.textContent = MQ_TEXT.status_mapLoadFailed;
                statusSpan.style.color = '#f44336';
            } else if (this._isOldMap) {
                statusSpan.textContent = MQ_TEXT.status_oldMap;
                statusSpan.style.color = '#999';
            } else {
                statusSpan.textContent = MQ_TEXT.status_newMap;
                statusSpan.style.color = '#4caf50';
            }
        }
        const checkboxGroup = document.getElementById('showProductInfoGroup');
        if (!checkboxGroup) return;
        if (this._productMapLoadFailed) {
            checkboxGroup.style.display = 'none';
        } else {
            checkboxGroup.style.display = '';
            const checkbox = document.getElementById('showProductInfo');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                this._onInput();
            }
        }
    }

    setProductMap(data) {
        if (Array.isArray(data)) {
            this._parseArrayProductMap(data);
            this._isOldMap = false;
        } else if (data instanceof Map) {
            const firstValue = data.values().next().value;
            this._isOldMap = typeof firstValue === 'string';
            this.productMap = data;
        }
        this._productMapLoadFailed = false;
        this._updateProductMapUI();
        this._onInput();
    }

    addProductMapping(key, productName, needFresh = false) {
        if (this._isOldMap) {
            this.productMap.set(String(key), productName);
        } else {
            this.productMap.set(String(key), { name: productName, needFresh });
        }
        if (this._productMapLoadFailed) {
            this._productMapLoadFailed = false;
            this._updateProductMapUI();
        }
        this._onInput();
    }

    // ==================== 输入处理 ====================
    _insertAtCursor(textarea, textToInsert) {
        if (!textarea) return;
        if (textarea.selectionStart !== undefined && textarea.selectionStart !== null) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            const newValue = value.substring(0, start) + textToInsert + value.substring(end);
            textarea.value = newValue;
            textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
        } else {
            textarea.value += textToInsert;
        }
        textarea.focus();
        this._onInput();
    }

    _onInput() {
        if (this._isComposing) return;
        if (typeof qrcode === 'undefined') {
            this.app.loadLibrary('qrcode').then(ok => {
                if (ok && !this._isComposing) this._renderPreviews();
            });
            return;
        }
        this._renderPreviews();
    }

    _formatLocationCode(code) {
        if (!code) return code;
        const withoutHyphens = code.replace(/-/g, '');
        if (!/^[a-zA-Z0-9]+$/.test(withoutHyphens)) return code;
        const len = withoutHyphens.length;
        if (len === 10) {
            const parts = withoutHyphens.match(/.{1,2}/g);
            return parts.join('-');
        } else if (len === 9) {
            const parts = withoutHyphens.match(/^(.{1})(.{2})(.{2})(.{2})(.{2})$/);
            return parts ? parts.slice(1).join("-") : withoutHyphens;
        } else {
            return code;
        }
    }

    _processLine(line, autoUppercase, formatLocation) {
        const trimmed = line.trim();
        if (trimmed === '') return [];
        let content = trimmed;
        if (autoUppercase) content = content.toUpperCase();
        const isPureNumber = /^\d+$/.test(content);
        const inProductMap = isPureNumber && this.productMap.has(content);
        if (formatLocation && (!isPureNumber || !inProductMap)) {
            content = this._formatLocationCode(content);
        }
        if (formatLocation) {
            const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
            if (tokens.length > 1) {
                return tokens.map(token => {
                    let c = token;
                    if (autoUppercase) c = c.toUpperCase();
                    const isNum = /^\d+$/.test(c);
                    const inMap = isNum && this.productMap.has(c);
                    if (formatLocation && (!isNum || !inMap)) c = this._formatLocationCode(c);
                    return { content: c, display: c };
                });
            }
        }
        return [{ content, display: content }];
    }

    _renderPreviews() {
        const textarea = document.getElementById('multiQrTextInput');
        if (!textarea) return;
        const rawText = textarea.value;
        const previewContainer = document.getElementById('multiQrPreview');
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        if (!rawText.trim()) return;

        const MAX_ITEMS = 10;
        const MAX_LEN = 50;
        const autoUppercase = document.getElementById('autoUppercase')?.checked || false;
        const formatLocation = document.getElementById('generateLocationCode')?.checked || false;
        const lines = rawText.split(/\r?\n/);
        const allItems = [];
        for (const line of lines) {
            const items = this._processLine(line, autoUppercase, formatLocation);
            for (const item of items) {
                if (!item.content) continue;
                if (item.content.length > MAX_LEN) continue;
                allItems.push(item);
            }
        }
        const shown = allItems.slice(0, MAX_ITEMS);
        if (allItems.length > MAX_ITEMS) {
            const hint = document.createElement('div');
            hint.className = 'multi-qr-limit-hint';
            hint.textContent = `仅显示前 ${MAX_ITEMS} 个（共 ${allItems.length} 个有效二维码）`;
            previewContainer.appendChild(hint);
        }
        for (const item of shown) {
            this._generateQRItem(item.content, item.display, previewContainer);
        }
    }

    // ==================== 商品识别 ====================
    _parseNumberSegments(numericStr) {
        if (!/^\d+$/.test(numericStr)) return null;
        const len = numericStr.length;
        if (len < 20) return null;
        const prefix = numericStr.substring(0, 2);
        const baseLengthMap = { '26': 20, '28': 23, '29': 23, '31': 27 };
        const baseLen = baseLengthMap[prefix];
        if (baseLen === undefined) return null;
        const codeLen = len - baseLen;
        if (codeLen !== 5 && codeLen !== 7) return null;
        const productCode = numericStr.substring(2, 2 + codeLen);
        const dateStart = 2 + codeLen;
        const dateStr = numericStr.substring(dateStart, dateStart + 6);
        let formattedDate = null;
        if (/^\d{6}$/.test(dateStr)) {
            const yy = dateStr.substring(0, 2);
            const mm = dateStr.substring(2, 4);
            const dd = dateStr.substring(4, 6);
            formattedDate = `${yy}年${mm}月${dd}日`;
        }
        let time = null;
        const timeStart = dateStart + 6;
        if (timeStart + 2 <= len) {
            const timeStr = numericStr.substring(timeStart, timeStart + 2);
            if (/^\d{2}$/.test(timeStr) && (timeStr === '00' || timeStr === '12')) {
                time = timeStr;
            }
        }
        let weightGrams = null;
        if (!numericStr.startsWith('26')) {
            const weightStr = numericStr.substring(len - 5, len - 1);
            if (/^\d{4}$/.test(weightStr)) weightGrams = parseInt(weightStr, 10);
        }
        return { productCode, formattedDate, weightGrams, usedLen: codeLen, dateStr, time };
    }

    _isFresh(dateStr, time, now = new Date()) {
        if (!dateStr || !time || !/^\d{6}$/.test(dateStr)) return false;
        const year = 2000 + parseInt(dateStr.substring(0, 2), 10);
        const month = parseInt(dateStr.substring(2, 4), 10) - 1;
        const day = parseInt(dateStr.substring(4, 6), 10);
        const hour = parseInt(time, 10);
        const prodDate = new Date(year, month, day, hour, 0, 0);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const prodMonthDay = prodDate.getMonth() * 100 + prodDate.getDate();
        const todayMonthDay = today.getMonth() * 100 + today.getDate();
        const yesterdayMonthDay = yesterday.getMonth() * 100 + yesterday.getDate();
        if (prodMonthDay === todayMonthDay) return true;
        if (prodMonthDay === yesterdayMonthDay && hour >= 12) return true;
        return false;
    }

    _getProductInfo(code) {
        const entry = this.productMap.get(code);
        if (entry === undefined) return { name: null, needFresh: false, isOldMap: false };
        if (typeof entry === 'string') {
            return { name: entry, needFresh: false, isOldMap: true };
        }
        if (typeof entry === 'object' && entry !== null && typeof entry.name === 'string') {
            return { name: entry.name, needFresh: entry.needFresh === true, isOldMap: false };
        }
        return { name: null, needFresh: false, isOldMap: false };
    }

    _buildExtraInfoHTML(segments) {
        if (!segments) return '';
        const parts = [];
        const info = this._getProductInfo(segments.productCode);
        const productName = info.name;
        const needFresh = info.needFresh;
        const isOldMap = info.isOldMap;

        let nameDisplay = productName || MQ_TEXT.info_productCodeUnregistered.replace('{code}', segments.productCode);
        let extraNote = '';
        if (productName) {
            if (isOldMap) {
                extraNote = MQ_TEXT.info_oldMapNote;
            } else if (needFresh && segments.time) {
                if (this._isFresh(segments.dateStr, segments.time)) {
                    nameDisplay = productName + MQ_TEXT.info_freshTag;
                }
            }
        }
        parts.push(MQ_TEXT.info_product.replace('{name}', nameDisplay) + extraNote);
        if (segments.formattedDate) {
            parts.push(MQ_TEXT.info_date.replace('{date}', segments.formattedDate).replace('{time}', segments.time ? ' ' + segments.time + ':00' : ''));
        }
        if (segments.weightGrams !== null && !isNaN(segments.weightGrams) && segments.weightGrams !== 0) {
            parts.push(MQ_TEXT.info_weight.replace('{w}', segments.weightGrams));
        }
        if (parts.length === 0) return '';
        return `<div class="multi-qr-extra-info">${parts.join(' ')}</div>`;
    }

    _colorizeDisplayText(display, rawContent, usedLen) {
        if (!/^\d{20,}$/.test(rawContent)) return display;
        const digits = display.match(/\d/g);
        if (!digits || digits.length < 14) return display;
        const totalDigits = digits.length;
        const weightStart = totalDigits - 5;
        const weightEnd = totalDigits - 2;
        const rawNumeric = rawContent.replace(/\D/g, '');
        const shouldHighlightWeight = rawNumeric.length >= 20 && !rawNumeric.startsWith('26');
        let skipWeightHighlight = false;
        if (shouldHighlightWeight && weightStart >= 0 && weightEnd < totalDigits) {
            const rangeDigits = digits.slice(weightStart, weightEnd + 1);
            if (rangeDigits.length === 4 && rangeDigits.every(d => d === '0')) {
                skipWeightHighlight = true;
            }
        }
        const prodStart = 2;
        const prodEnd = 2 + usedLen;
        const dateStart = 2 + usedLen;
        const dateEnd = dateStart + 6;
        let idx = 0;
        const frag = document.createDocumentFragment();
        for (const ch of display) {
            if (/\d/.test(ch)) {
                let color = null;
                if (idx >= prodStart && idx < prodEnd) color = '#FFBD00';
                else if (idx >= dateStart && idx < dateEnd) color = '#00c63d';
                else if (shouldHighlightWeight && !skipWeightHighlight && idx >= weightStart && idx <= weightEnd) color = '#2b5799';
                if (color) {
                    const span = document.createElement('span');
                    span.textContent = ch;
                    span.style.color = color;
                    frag.appendChild(span);
                } else {
                    frag.appendChild(document.createTextNode(ch));
                }
                idx++;
            } else {
                frag.appendChild(document.createTextNode(ch));
            }
        }
        return frag;
    }

    _generateQRItem(content, display, container) {
        const item = document.createElement('div');
        item.className = 'multi-qr-preview-item';
        try {
            const qr = qrcode(0, 'L');
            qr.addData(content);
            qr.make();
            const moduleCount = qr.getModuleCount();
            const qrSize = 200;
            const border = 10;
            const totalSize = qrSize + border * 2;
            const cellSize = Math.floor(qrSize / moduleCount);
            const actualQrSize = cellSize * moduleCount;
            const offsetX = border + (qrSize - actualQrSize) / 2;
            const offsetY = border + (qrSize - actualQrSize) / 2;
            const canvas = document.createElement('canvas');
            canvas.width = totalSize;
            canvas.height = totalSize;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, totalSize, totalSize);
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(offsetX + col * cellSize, offsetY + row * cellSize, cellSize, cellSize);
                    }
                }
            }
            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.alt = MQ_TEXT.alt_qr;
            img.title = content;
            img.style.width = `${totalSize}px`;
            img.style.height = `${totalSize}px`;
            const textDiv = document.createElement('div');

            const showProductInfo = document.getElementById('showProductInfo')?.checked !== false;
            let coloredContent;
            if (showProductInfo) {
                const rawNumeric = content.replace(/\D/g, '');
                let usedLen = 7;
                let segments = null;
                if (rawNumeric.length >= 20) {
                    segments = this._parseNumberSegments(rawNumeric);
                    if (segments) usedLen = segments.usedLen;
                }
                if (segments) coloredContent = this._colorizeDisplayText(display, rawNumeric, usedLen);
                else coloredContent = display;
            } else {
                coloredContent = display;
            }

            if (typeof coloredContent === 'string') textDiv.textContent = coloredContent;
            else textDiv.appendChild(coloredContent);
            item.appendChild(img);
            item.appendChild(textDiv);

            if (showProductInfo) {
                const rawNumeric = content.replace(/\D/g, '');
                if (rawNumeric.length >= 20) {
                    const segments = this._parseNumberSegments(rawNumeric);
                    if (segments) {
                        const extraDiv = document.createElement('div');
                        extraDiv.innerHTML = this._buildExtraInfoHTML(segments);
                        item.appendChild(extraDiv);
                    }
                } else if (rawNumeric.length === 13 && this.productMap.has(rawNumeric)) {
                    const extraDiv = document.createElement('div');
                    const info = this._getProductInfo(rawNumeric);
                    const name = this.app.escapeHtml(info.name || rawNumeric);
                    const note = info.isOldMap ? MQ_TEXT.info_oldMapNoteShort : '';
                    extraDiv.innerHTML = `<div class="multi-qr-extra-info">${MQ_TEXT.info_product.replace('{name}', name)}${note}</div>`;
                    item.appendChild(extraDiv);
                } else if (/^\d+$/.test(rawNumeric) && this.productMap.has(rawNumeric)) {
                    const extraDiv = document.createElement('div');
                    const info = this._getProductInfo(rawNumeric);
                    const name = this.app.escapeHtml(info.name || rawNumeric);
                    const note = info.isOldMap ? MQ_TEXT.info_oldMapNoteShort : '';
                    extraDiv.innerHTML = `<div class="multi-qr-extra-info">${MQ_TEXT.info_product.replace('{name}', name)}${note}</div>`;
                    item.appendChild(extraDiv);
                }
            }
            container.appendChild(item);
        } catch (error) {
            console.error('生成二维码失败:', error, content);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'multi-qr-preview-item error';
            errorDiv.innerHTML = `<div style="color:#f44336; padding:20px; text-align:center;"><p>${MQ_TEXT.err_qrGenerateFailed}</p><p style="font-size:14px;">${this.app.escapeHtml(content)}</p></div>`;
            container.appendChild(errorDiv);
        }
    }

    // ==================== 搜索 ====================
    _toggleSearchMode() {
        const btn = document.getElementById('multiQrSearchModeBtn');
        if (!btn) return;
        const input = document.getElementById('multiQrSearchInput');
        if (this._searchMode === 'product') {
            this._searchMode = 'location';
            btn.textContent = MQ_TEXT.search_commonLocation;
            if (input) input.placeholder = MQ_TEXT.search_commonLocation;
        } else {
            this._searchMode = 'product';
            btn.textContent = MQ_TEXT.search_productCode;
            if (input) input.placeholder = MQ_TEXT.ph_searchProduct;
        }
        if (input) {
            input.value = '';
            this._hideResults();
        }
    }

    _performSearch(query) {
        if (this._searchTimer) {
            clearTimeout(this._searchTimer);
            this._searchTimer = null;
        }
        if (!query || query.trim().length < 2) {
            this._hideResults();
            return;
        }
        this._searchTimer = setTimeout(() => {
            this._searchTimer = null;
            const lowerQuery = query.toLowerCase().trim();
            let results = [];
            if (this._searchMode === 'product') {
                if (this._productMapLoadFailed || this.productMap.size === 0) {
                    this._hideResults();
                    return;
                }
                for (const [code, value] of this.productMap) {
                    if (results.length >= 50) break;
                    let name = typeof value === 'string' ? value : value.name;
                    if (name.toLowerCase().includes(lowerQuery) || code.toLowerCase().includes(lowerQuery)) {
                        results.push({ display: `${name} (${code})`, value: code });
                    }
                }
                results.sort((a, b) => a.display.localeCompare(b.display));
            } else {
                for (const loc of this.commonLocations) {
                    if (results.length >= 50) break;
                    if (loc.toLowerCase().includes(lowerQuery)) {
                        results.push({ display: loc, value: loc });
                    }
                }
            }
            this._searchResults = results;
            this._selectedIndex = results.length > 0 ? 0 : -1;
            this._showResults(results);
        }, 200);
    }

    _showResults(results) {
        const container = document.getElementById('multiQrSearchResults');
        if (!container) return;
        if (results.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.innerHTML = '';
        results.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'result-item' + (index === this._selectedIndex ? ' selected' : '');
            const span = document.createElement('span');
            span.textContent = item.display;
            div.appendChild(span);
            div.dataset.value = item.value;
            div.addEventListener('click', () => {
                this._insertResult(item.value);
            });
            container.appendChild(div);
        });
        container.style.display = 'block';
        const selected = container.querySelector('.result-item.selected');
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    }

    _hideResults() {
        const container = document.getElementById('multiQrSearchResults');
        if (container) container.style.display = 'none';
        this._searchResults = [];
        this._selectedIndex = -1;
    }

    _insertResult(value) {
        const textarea = document.getElementById('multiQrTextInput');
        if (!textarea) return;
        this._insertAtCursor(textarea, value + '\n');
        const input = document.getElementById('multiQrSearchInput');
        if (input) input.value = '';
        this._hideResults();
        textarea.focus();
    }

    _onSearchKeydown(e) {
        const results = this._searchResults;
        if (results.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this._selectedIndex = (this._selectedIndex + 1) % results.length;
            this._showResults(results);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this._selectedIndex = (this._selectedIndex - 1 + results.length) % results.length;
            this._showResults(results);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this._selectedIndex >= 0 && this._selectedIndex < results.length) {
                this._insertResult(results[this._selectedIndex].value);
            }
        } else if (e.key === 'Escape') {
            this._hideResults();
            document.getElementById('multiQrSearchInput')?.blur();
        }
    }

    // ==================== 渲染 ====================
    bindEvents(panel) {
        const textarea = panel.querySelector('#multiQrTextInput');
        if (!textarea) return;
        textarea.addEventListener('input', () => this._onInput());
        textarea.addEventListener('compositionstart', () => { this._isComposing = true; });
        textarea.addEventListener('compositionend', () => {
            this._isComposing = false;
            this._onInput();
        });
        textarea.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                textarea.value = '';
                this._onInput();
                event.preventDefault();
            }
        });

        const autoUppercaseCheck = panel.querySelector('#autoUppercase');
        const generateLocationCheck = panel.querySelector('#generateLocationCode');
        const showProductInfoCheck = panel.querySelector('#showProductInfo');

        if (autoUppercaseCheck) {
            autoUppercaseCheck.addEventListener('change', () => {
                if (!autoUppercaseCheck.checked && generateLocationCheck) generateLocationCheck.checked = false;
                this._onInput();
            });
        }
        if (generateLocationCheck) {
            generateLocationCheck.addEventListener('change', () => {
                if (generateLocationCheck.checked && autoUppercaseCheck) autoUppercaseCheck.checked = true;
                this._onInput();
            });
        }
        if (showProductInfoCheck) {
            showProductInfoCheck.addEventListener('change', () => this._onInput());
        }

        panel.querySelector('#clearMultiQrText').addEventListener('click', () => {
            textarea.value = '';
            this._onInput();
        });

        panel.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-quick');
                if (text) this._insertAtCursor(textarea, text);
            });
        });

        const toggleLink = panel.querySelector('#multiQrSearchToggle');
        const searchArea = panel.querySelector('#multiQrSearchArea');
        if (toggleLink && searchArea) {
            toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                const isHidden = searchArea.style.display === 'none';
                searchArea.style.display = isHidden ? 'block' : 'none';
                toggleLink.textContent = isHidden ? MQ_TEXT.search_toggleExpanded : MQ_TEXT.search_toggleCollapsed;
                if (isHidden) {
                    const input = panel.querySelector('#multiQrSearchInput');
                    if (input) setTimeout(() => input.focus(), 100);
                }
            });
        }

        const searchInput = panel.querySelector('#multiQrSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this._performSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => this._onSearchKeydown(e));
            searchInput.addEventListener('blur', () => setTimeout(() => this._hideResults(), 200));
            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim()) this._performSearch(searchInput.value);
            });
        }

        const modeBtn = panel.querySelector('#multiQrSearchModeBtn');
        if (modeBtn) modeBtn.addEventListener('click', () => this._toggleSearchMode());

        setTimeout(() => this._onInput(), 0);
    }

    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header"><h2>${MQ_TEXT.title} <span id="basicVersionTag" class="mq-basic-tag">${MQ_TEXT.tag_basicVersion}</span></h2>${this.app.getHelpButton(this.id)}</div>
                <div class="multi-qr-container">
                    <div class="multi-qr-left">
                        <div class="table-header multi-qr-header">
                            <div class="multi-qr-header-actions">
                                <div class="multi-qr-checkbox-group">
                                    <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                                        <div class="checkbox-group">
                                            <input type="checkbox" id="autoUppercase" checked>
                                            <label for="autoUppercase">${MQ_TEXT.label_autoUppercase}</label>
                                        </div>
                                        <div class="checkbox-group">
                                            <input type="checkbox" id="generateLocationCode" checked>
                                            <label for="generateLocationCode">${MQ_TEXT.label_formatLocation}</label>
                                        </div>
                                    </div>
                                    <div class="checkbox-group" id="showProductInfoGroup">
                                        <input type="checkbox" id="showProductInfo" checked>
                                        <label for="showProductInfo">${MQ_TEXT.label_showProductInfo}</label>
                                        <span id="productMapStatus" class="status-text" style="margin-left:12px;"></span>
                                    </div>
                                </div>
                                <button type="button" id="clearMultiQrText" class="btn btn-secondary multi-qr-clear-btn">${this.app.getIcon('arrow-repeat')}<br>${MQ_TEXT.btn_clear}<br>${MQ_TEXT.btn_clearHint}</button>
                            </div>
                        </div>

                        <div class="multi-qr-search-container">
                            <a id="multiQrSearchToggle" class="multi-qr-search-toggle" href="javascript:void(0)">${MQ_TEXT.search_toggleCollapsed}</a>
                            <div id="multiQrSearchArea" style="display:none;">
                                <div class="toolbar multi-qr-search-toolbar">
                                    <button id="multiQrSearchModeBtn" class="multi-qr-search-mode-btn">${MQ_TEXT.search_productCode}</button>
                                    <div class="multi-qr-search-wrapper">
                                        <input type="text" id="multiQrSearchInput" placeholder="${MQ_TEXT.ph_searchProductShort}" />
                                        <div id="multiQrSearchResults" class="multi-qr-search-results"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="multi-qr-input-area">
                            <div class="quick-input-buttons">
                                <button type="button" class="quick-btn" data-quick="CW">CW</button>
                                <button type="button" class="quick-btn" data-quick="LC">LC</button>
                                <button type="button" class="quick-btn" data-quick="LD">LD</button>
                                <button type="button" class="quick-btn" data-quick="SC-01-01-01-01">SC</button>
                                <button type="button" class="quick-btn" data-quick="DW">DW</button>
                                <button type="button" class="quick-btn" data-quick="ZW">ZW</button>
                                <button type="button" class="quick-btn" data-quick="DD">DD</button>
                                <button type="button" class="quick-btn" data-quick="\n">${this.app.getIcon('arrow-return-left')}</button>
                            </div>
                            <textarea id="multiQrTextInput" placeholder="${MQ_TEXT.ph_input}"></textarea>
                        </div>
                    </div>
                    <div class="multi-qr-right">
                        <h4>${MQ_TEXT.heading_preview}</h4>
                        <div id="multiQrPreview"></div>
                    </div>
                </div>
            </div>
        `;
        this.bindEvents(panel);
        this._updateProductMapUI();
        this.app._log(this.title + '加载成功');
    }
}

const MQ_TEXT = {
    title: '多二维码生成',
    introText: '批量生成多个二维码，支持自动格式化和大写，支持商品信息查询。',
    helpDescription: `
<p><strong>功能说明</strong><br>批量生成多个二维码，每行一个输入项。支持从扫码记录中复制库位和条码混合输入（空格分隔）自动生成多个二维码。</p>
<p><strong>使用建议</strong><br>单次最多生成 10 个二维码，单个内容不超过 50 字符。</p>
<p><strong>输入格式</strong><br>
• 每行一个或多个二维码内容（若启用库位格式化，可用空格分隔多个码）。<br>
• 启用「自动大写」会将所有字母转为大写。<br>
• 启用「自动格式化库位码」会将9位或10位无连字符的字母数字自动格式化为 <code>A-BB-CC-DD-EE</code> 或 <code>AA-BB-CC-DD-EE</code> 形式；其他情况会移除已有连字符。<br>
• <strong>复选框联动规则</strong>：勾选「自动格式化库位码」会自动勾选并启用「自动大写」；取消「自动大写」会自动取消「自动格式化库位码」。</p>
<p><strong>商品信息识别</strong><br>
当二维码内容为纯数字时，自动解析：<br>
• 件码（≥20位）：提取商品码（支持5/7位，由前缀和总长度唯一确定）、生产日期（6位YYMMDD）、时间（2位HH，仅00或12）、重量（最后5位中前4位，单位克）。若数字以"26"开头，则不显示重量及对应染色。<br>
• 标品13位码或其他存在于商品库中的数字：显示商品名称。<br>
商品映射支持两种格式：<br>
1. 旧版Map：<code>new Map([["code","name"]])</code>（不支持当日鲜）<br>
2. 新版数组：<code>[["code","name","是"], ...]</code>（第三列为"是"时参与当日鲜判定）</p>
<p><strong>快速检索</strong><br>
在搜索框中输入文字，自动匹配商品名称或条码或常用库位。库位检索数据来自 <a href="./js/data/commonLocations.js" target="_blank">js/data/commonLocations.js</a>，数据请自行维护。</p>
<p><strong>其他</strong><br>
• 浏览器插件版（测试版）：<a href="https://gitee.com/cnwz/text2qr-extension/releases" target="_blank">https://gitee.com/cnwz/text2qr-extension/releases</a><br>
• 按 <kbd>ESC</kbd> 键可快速清空输入框。</p>
<p><strong>当日鲜判定</strong><br>
部分件码包含生产日期和时间（格式 YYMMDDHH，HH 仅为 00 或 12）。满足以下条件之一即为「当日鲜」：<br>
• 生产日期为今日（任意时间）<br>
• 生产日期为昨日且时间 ≥ 12:00<br>
符合条件时，商品名后以粗体粉色 (#ee6aa7) 显示"当日鲜"。<br>
旧版Map（纯字符串值）不支持当日鲜判定。</p>
`,

    tag_basicVersion: '基础版',
    label_autoUppercase: '自动大写',
    label_formatLocation: '自动格式化库位码',
    label_showProductInfo: '显示商品信息',
    btn_clear: '清空内容',
    btn_clearHint: '[ ESC ]',
    heading_preview: '二维码预览',

    search_toggleCollapsed: '搜索 ▼',
    search_toggleExpanded: '搜索 ▲',
    search_productCode: '商品条码',
    search_commonLocation: '常用库位',
    ph_searchProduct: '搜索商品名称/条码...',
    ph_searchProductShort: '商品名称/条码...',
    ph_input: '一行一个，需要输入小写时去掉⬆️的☑️ \n上方"自动格式化库位码"勾选时，够9-10位自动格式化 \n左侧快速键入常用字母',

    alt_qr: '二维码',

    status_mapLoadFailed: '（基础版）',
    status_oldMap: '（旧版productMap，不支持当日鲜）',
    status_newMap: '正常',

    info_product: '[商品] {name}',
    info_productCodeUnregistered: '[商品码] {code} (未录入)',
    info_date: '<br>[日期] 20{date}{time}',
    info_weight: '[重量] {w} g',
    info_freshTag: ' <span style="font-weight:bold;color:#ee6aa7;">当日鲜</span>',
    info_oldMapNote: ' <span style="color:#999;font-weight:normal;font-size:13px;">(旧版productMap，不支持当日鲜)</span>',
    info_oldMapNoteShort: ' <span style="color:#999;font-weight:normal;font-size:13px;">(旧版productMap)</span>',

    err_unknownMapFormat: '无法识别的productMap格式',
    err_noProductMapData: '未找到有效商品映射数据',
    err_productMapLoadFailed: '无法加载商品映射文件: {url}',
    err_qrGenerateFailed: '生成失败:',
    warn_commonLocationsNotExported: '[MultiQR] 常用库位文件 {url} 未导出 window.commonLocationsData，使用内置默认列表',
    warn_commonLocationsLoadFailed: '[MultiQR] 加载常用库位文件失败: {url}，使用内置默认列表',

    styles: `.mq-basic-tag{color:red}
.multi-qr-container{display:flex;gap:40px;margin-top:25px}
.multi-qr-left,.multi-qr-right{flex:1;min-width:350px}
.multi-qr-left h4,.multi-qr-right h4{margin-bottom:15px;color:#333;font-size:18px}
.multi-qr-left textarea{width:100%;height:350px;padding:16px;border:2px solid #e0e0e0;border-radius:8px;resize:vertical;margin-bottom:20px;font-size:18px;line-height:1.6}
.multi-qr-left textarea:focus{border-color:#FFBD00;box-shadow:0 0 0 3px rgba(255,189,0,0.1);outline:0}
#multiQrPreview{display:flex;flex-direction:column;gap:25px}
.multi-qr-preview-item{text-align:center;padding:20px}
.multi-qr-preview-item img{width:auto;height:auto;max-width:220px;margin:0 auto 20px;display:block}
.multi-qr-preview-item div{font-weight:700;word-break:break-all;font-size:17px;color:#333;line-height:1.5;padding:0;background:0 0;border-radius:0;text-align:center}
.multi-qr-header-actions{display:flex;flex-wrap:wrap;align-items:stretch;gap:10px;width:100%}
.multi-qr-checkbox-group{flex:1;display:flex;flex-direction:column;justify-content:space-around;min-width:200px}
.multi-qr-clear-btn{height:auto;align-self:center;white-space:nowrap;flex-shrink:0}
.multi-qr-extra-info{font-size:14px;font-weight:400;margin-top:8px;color:#555;padding:8px 12px;border-radius:6px;display:inline-block;max-width:90%;margin-left:auto;margin-right:auto}
.multi-qr-limit-hint{margin-bottom:12px;padding:8px 12px;background:#fff8e1;border-left:3px solid #FFBD00;color:#b08800;font-size:13px;border-radius:4px}
.quick-input-buttons{display:flex;flex-direction:column;gap:8px;width:40px;flex-shrink:0}
.quick-input-buttons .quick-btn{background:#f0f0f0;border:1px solid #ccc;border-radius:4px;padding:8px 0;font-size:20px;cursor:pointer;text-align:center;transition:background .2s}
.quick-input-buttons .quick-btn:hover{background:#e0e0e0}
.multi-qr-input-area{display:flex;gap:12px;align-items:flex-start}
.multi-qr-left textarea{flex:1;margin-bottom:0}
.multi-qr-search-container{margin:12px 0 8px}
a.multi-qr-search-toggle{color:#333;cursor:pointer;text-decoration:none;font-size:14px;display:inline-block}
a.multi-qr-search-toggle:hover{color:#333;text-decoration:none}
.multi-qr-search-toolbar{margin-top:6px;margin-bottom:0}
.multi-qr-search-mode-btn{padding:4px 12px;border:1px solid #ccc;border-radius:4px;background:#f0f0f0;cursor:pointer;font-size:13px;white-space:nowrap;height:32px;line-height:1.4;width:auto!important;min-width:60px}
.multi-qr-search-mode-btn:hover{background:#e0e0e0}
.multi-qr-search-wrapper{flex:1;min-width:0;position:relative}
#multiQrSearchInput{width:100%!important;padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;height:32px;display:block}
.multi-qr-search-results{position:absolute;top:calc(100% + 2px);left:0;right:0;max-height:200px;overflow-y:auto;background:#fff;border:1px solid #ccc;border-radius:4px;z-index:1000;box-shadow:0 4px 12px rgba(0,0,0,.15);display:none}
.multi-qr-search-results .result-item{padding:8px 12px;cursor:pointer;font-size:14px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between}
.multi-qr-search-results .result-item:hover{background:#f5f5f5}
.multi-qr-search-results .result-item.selected{background:#e3f2fd}
body.dark-mode .mq-basic-tag{color:#ff6b6b!important}
body.dark-mode .quick-input-buttons .quick-btn{background:#3a3a44;border-color:#555;color:#fff}
body.dark-mode .quick-input-buttons .quick-btn:hover{background:#4a4a58}
body.dark-mode .multi-qr-left textarea{background:#2c2c38!important;color:#f0f0f0!important}
body.dark-mode .multi-qr-preview-item{background:#1e1e2a!important;border-color:#3a3a44!important}
body.dark-mode .multi-qr-preview-item div{color:#fff!important}
body.dark-mode .multi-qr-checkbox-group label{color:#fff!important}
body.dark-mode .multi-qr-extra-info{color:#e0e0e0!important}
body.dark-mode a.multi-qr-search-toggle{color:#fff!important}
body.dark-mode a.multi-qr-search-toggle:hover{color:#fff!important;text-decoration:none}
body.dark-mode .multi-qr-search-mode-btn{background:#3a3a44;border-color:#555;color:#fff}
body.dark-mode .multi-qr-search-mode-btn:hover{background:#4a4a58}
body.dark-mode #multiQrSearchInput{background:#2c2c38;border-color:#4a4a58;color:#f0f0f0}
body.dark-mode .multi-qr-search-results{background:#2c2c38;border-color:#4a4a58}
body.dark-mode .multi-qr-search-results .result-item{color:#e0e0e0;border-color:#3a3a48}
body.dark-mode .multi-qr-search-results .result-item:hover{background:#3a3a48}
body.dark-mode .multi-qr-search-results .result-item.selected{background:#3a4a5a}
@media (max-width:600px){.multi-qr-input-area{flex-direction:column}.quick-input-buttons{flex-direction:row;flex-wrap:wrap;width:100%}.quick-input-buttons .quick-btn{flex:1}}`
};
window.MultiQRCodeModule = MultiQRCodeModule;