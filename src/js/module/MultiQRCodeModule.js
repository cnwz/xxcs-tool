/**
 * @description 多二维码生成模块
 * @author ls_wuzhen20
 * @since 2025-06-30
 * @lastupdate 2026-09-23
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/MultiQRCodeModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class MultiQRCodeModule {
    constructor(app) {
        this.app = app;
        this.title = MQ_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2026-09-23';
        this.iconName = 'qr-code';
        this.introText = MQ_TEXT.introText;
        this.helpDescription = MQ_TEXT.helpDescription;

        this._isComposing = false;
        this.productMap = new Map();
        this._productMapMeta = null;
        this._loadingPromise = null;
        this._productMapLoadFailed = false;

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

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, MQ_TEXT.styles);
    }

    // ==================== 数据加载 ====================

    /**
     * 加载商品库数据
     * @returns {Promise<void>}
     */
    async _loadProductMap() {
        if (this._loadingPromise) return this._loadingPromise;
        this._loadingPromise = (async () => {
            const localUrl = 'js/data/productMap.js';

            if (this.app.fromCDN) {
                const cdnUrl = `${this.app.cdnBase}main/js/data/productMap.js`;
                await this.app._loadScript(cdnUrl, this.app.cdnTimeout);
                if (window.productMapData !== undefined) {
                    return this._applyProductMapData();
                }
            } else {
                if (window.productMapData === undefined) {
                    await this.app._loadScript(localUrl, this.app.localTimeout);
                }
                if (window.productMapData !== undefined) {
                    return this._applyProductMapData();
                }

                await this.app._handshake();

                if (this.app.cdnAlive && this.app.releaseBatch !== 'dev') {
                    const cdnUrl = `${this.app.cdnBase}${this.app.releaseBatch}/js/data/productMap.js`;
                    await this.app._loadScript(cdnUrl, this.app.cdnTimeout);
                    if (window.productMapData !== undefined) {
                        return this._applyProductMapData();
                    }
                }
            }

            this._productMapLoadFailed = true;
            this._updateProductMapUI();
            throw new Error(MQ_TEXT.err_productMapLoadFailed.replace('{url}', localUrl));
        })();
        return this._loadingPromise;
    }

    /** 应用 window.productMapData 到内部 productMap */
    _applyProductMapData() {
        const data = window.productMapData;
        if (!Array.isArray(data)) {
            this._productMapLoadFailed = true;
            this._updateProductMapUI();
            throw new Error(MQ_TEXT.err_unknownMapFormat);
        }

        if (window.productMapMeta && typeof window.productMapMeta === 'object') {
            this._productMapMeta = {
                snapshot: String(window.productMapMeta.snapshot || ''),
                count: parseInt(window.productMapMeta.count, 10) || data.length,
            };
        } else {
            this._productMapMeta = { snapshot: '', count: data.length };
        }

        try {
            this._parseArrayProductMap(data);
        } catch (e) {
            this._productMapLoadFailed = true;
            this._updateProductMapUI();
            throw e;
        }
        this._productMapLoadFailed = false;
        this._updateProductMapUI();
        this._onInput();
    }

    /**
     * 解析三列数组为商品 Map
     * @param {Array} arr
     */
    _parseArrayProductMap(arr) {
        const map = new Map();
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            if (!Array.isArray(item) || item.length < 3) {
                throw new Error(MQ_TEXT.err_arrayNeedThreeCols.replace('{n}', i + 1));
            }
            const code = String(item[0]).trim();
            const name = String(item[1]).trim();
            if (!code || !name) continue;
            const flag = String(item[2]).trim().toLowerCase();
            const needFresh = (flag === '是' || flag === 'true');
            map.set(code, { name, needFresh });
        }
        this.productMap = map;
    }

    /** 加载常用库位数据 */
    async _loadCommonLocations() {
        if (this._commonLocationsLoading) return this._commonLocationsLoading;
        this._commonLocationsLoading = (async () => {
            const localUrl = 'js/data/commonLocations.js';

            if (this.app.fromCDN) {
                const cdnUrl = `${this.app.cdnBase}main/js/data/commonLocations.js`;
                await this.app._loadScript(cdnUrl, this.app.cdnTimeout);
                if (Array.isArray(window.commonLocationsData)) {
                    this.commonLocations = window.commonLocationsData;
                    this._commonLocationsLoadFailed = false;
                    return;
                }
            } else {
                if (window.commonLocationsData === undefined) {
                    await this.app._loadScript(localUrl, this.app.localTimeout);
                }
                if (Array.isArray(window.commonLocationsData)) {
                    this.commonLocations = window.commonLocationsData;
                    this._commonLocationsLoadFailed = false;
                    return;
                }

                await this.app._handshake();

                if (this.app.cdnAlive && this.app.releaseBatch !== 'dev') {
                    const cdnUrl = `${this.app.cdnBase}${this.app.releaseBatch}/js/data/commonLocations.js`;
                    await this.app._loadScript(cdnUrl, this.app.cdnTimeout);
                    if (Array.isArray(window.commonLocationsData)) {
                        this.commonLocations = window.commonLocationsData;
                        this._commonLocationsLoadFailed = false;
                        return;
                    }
                }
            }

            this.commonLocations = [...this.defaultCommonLocations];
            this._commonLocationsLoadFailed = true;
            console.warn(MQ_TEXT.warn_commonLocationsLoadFailed.replace('{url}', localUrl));
        })();
        return this._commonLocationsLoading;
    }

    /** 更新商品库状态 UI */
    _updateProductMapUI() {
        const tag = document.getElementById('basicVersionTag');
        if (tag) tag.style.display = this._productMapLoadFailed ? '' : 'none';

        const statusSpan = document.getElementById('productMapStatus');
        if (statusSpan) {
            if (this._productMapLoadFailed) {
                statusSpan.textContent = MQ_TEXT.status_mapLoadFailed;
                statusSpan.style.color = 'var(--danger)';
            } else {
                const snapshot = (this._productMapMeta && this._productMapMeta.snapshot) || '';
                statusSpan.textContent = snapshot
                    ? `${MQ_TEXT.status_newMap}（${snapshot}）`
                    : MQ_TEXT.status_newMap;
                statusSpan.style.color = 'var(--success)';
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

    /**
     * 外部设置商品库数据
     * @param {Array} data
     */
    setProductMap(data) {
        if (!Array.isArray(data)) {
            throw new Error(MQ_TEXT.err_unknownMapFormat);
        }
        this._parseArrayProductMap(data);
        this._productMapLoadFailed = false;
        this._updateProductMapUI();
        this._onInput();
    }

    /**
     * 追加单条商品映射
     * @param {string} key
     * @param {string} productName
     * @param {boolean} [needFresh=false]
     */
    addProductMapping(key, productName, needFresh = false) {
        this.productMap.set(String(key), { name: productName, needFresh: needFresh === true });
        if (this._productMapLoadFailed) {
            this._productMapLoadFailed = false;
            this._updateProductMapUI();
        }
        this._onInput();
    }

    // ==================== 输入处理 ====================

    /**
     * 在光标位置插入文本
     * @param {HTMLTextAreaElement} textarea
     * @param {string} textToInsert
     */
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

    /** 输入变化处理，触发预览更新 */
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

    /**
     * 9/10 位无连字符字符串按位置插入连字符
     * @param {string} code
     * @returns {string}
     */
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
            return parts ? parts.slice(1).join('-') : withoutHyphens;
        } else {
            return code;
        }
    }

    /**
     * 处理单行输入为多个二维码条目
     * @param {string} line
     * @param {boolean} autoUppercase
     * @param {boolean} formatLocation
     * @returns {Array<{content:string,display:string}>}
     */
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

    /** 渲染二维码预览（最多前 10 个） */
    _renderPreviews() {
        const textarea = document.getElementById('multiQrTextInput');
        if (!textarea) return;
        const rawText = textarea.value;
        const previewContainer = document.getElementById('multiQrPreview');
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        if (!rawText.trim()) return;

        const now = new Date();
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
            this._generateQRItem(item.content, item.display, previewContainer, now);
        }
    }

    // ==================== 商品识别 ====================

    /**
     * 解析数字串为商品码、日期、时间、重量
     * @param {string} numericStr
     * @returns {Object|null}
     */
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

    /**
     * 判断是否当日鲜
     * @param {string} dateStr
     * @param {string} time
     * @param {Date} [now]
     * @returns {boolean}
     */
    _isFresh(dateStr, time, now = new Date()) {
        if (!dateStr || !time || !/^\d{6}$/.test(dateStr)) return false;
        const year = 2000 + parseInt(dateStr.substring(0, 2), 10);
        const month = parseInt(dateStr.substring(2, 4), 10) - 1;
        const day = parseInt(dateStr.substring(4, 6), 10);
        const hour = parseInt(time, 10);
        const prodDay = new Date(year, month, day);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((today - prodDay) / 86400000);
        if (diffDays === 0) return true;
        if (diffDays === 1 && hour === 12) return true;
        return false;
    }

    /**
     * 从商品 Map 读取商品名与当日鲜标记
     * @param {string} code
     * @returns {{name:string|null,needFresh:boolean}}
     */
    _getProductInfo(code) {
        const entry = this.productMap.get(code);
        if (entry === undefined) return { name: null, needFresh: false };
        if (typeof entry === 'object' && entry !== null && typeof entry.name === 'string') {
            return { name: entry.name, needFresh: entry.needFresh === true };
        }
        return { name: null, needFresh: false };
    }

    /**
     * 构建商品信息 HTML（名称、日期、重量、当日鲜标记）
     * @param {Object} segments
     * @param {Date} now
     * @returns {string}
     */
    _buildExtraInfoHTML(segments, now) {
        if (!segments) return '';
        const parts = [];
        const info = this._getProductInfo(segments.productCode);
        const productName = info.name;
        const needFresh = info.needFresh;

        let nameDisplay = productName || MQ_TEXT.info_productCodeUnregistered.replace('{code}', segments.productCode);
        if (productName && needFresh && segments.time) {
            if (this._isFresh(segments.dateStr, segments.time, now)) {
                nameDisplay = productName + MQ_TEXT.info_freshTag;
            }
        }
        parts.push(MQ_TEXT.info_product.replace('{name}', nameDisplay));

        if (segments.formattedDate) {
            parts.push(MQ_TEXT.info_date.replace('{date}', segments.formattedDate).replace('{time}', segments.time ? ' ' + segments.time + ':00' : ''));
        }
        if (segments.weightGrams !== null && !isNaN(segments.weightGrams) && segments.weightGrams !== 0) {
            parts.push(MQ_TEXT.info_weight.replace('{w}', segments.weightGrams));
        }
        if (parts.length === 0) return '';
        return `<div class="multi-qr-extra-info">${parts.join(' ')}</div>`;
    }

    /**
     * 对二维码下方文字按段染色（商品码、日期、重量）
     * @param {string} display
     * @param {string} rawContent
     * @param {number} usedLen
     * @returns {string|DocumentFragment}
     */
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

    /**
     * 生成单个二维码预览项
     * @param {string} content
     * @param {string} display
     * @param {HTMLElement} container
     * @param {Date} now
     */
    _generateQRItem(content, display, container, now) {
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
                        extraDiv.innerHTML = this._buildExtraInfoHTML(segments, now);
                        item.appendChild(extraDiv);
                    }
                } else if (rawNumeric.length === 13 && this.productMap.has(rawNumeric)) {
                    const extraDiv = document.createElement('div');
                    const info = this._getProductInfo(rawNumeric);
                    const name = this.app.escapeHtml(info.name || rawNumeric);
                    extraDiv.innerHTML = `<div class="multi-qr-extra-info">${MQ_TEXT.info_product.replace('{name}', name)}</div>`;
                    item.appendChild(extraDiv);
                } else if (/^\d+$/.test(rawNumeric) && this.productMap.has(rawNumeric)) {
                    const extraDiv = document.createElement('div');
                    const info = this._getProductInfo(rawNumeric);
                    const name = this.app.escapeHtml(info.name || rawNumeric);
                    extraDiv.innerHTML = `<div class="multi-qr-extra-info">${MQ_TEXT.info_product.replace('{name}', name)}</div>`;
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

    /** 切换搜索模式（商品 / 常用库位） */
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

    /**
     * 规范化库位码或查询串为可比较形式
     * - 含分隔符 '-'：按段切分
     * - 不含分隔符：每 2 字符切分（末段不足 2 位保留）
     * - 每段：'00' 保留；纯数字去前导 0；其他原样保留
     * @param {string} str
     * @returns {string}
     */
    _normalizeLocationString(str) {
        if (!str) return '';
        const s = String(str).trim();
        if (!s) return '';
        let segments;
        if (s.includes('-')) {
            segments = s.split('-');
        } else {
            segments = [];
            for (let i = 0; i < s.length; i += 2) {
                segments.push(s.slice(i, i + 2));
            }
        }
        return segments.map(seg => {
            if (seg === '00') return '00';
            if (/^\d+$/.test(seg)) {
                const stripped = seg.replace(/^0+/, '');
                return stripped || '0';
            }
            return seg;
        }).join('');
    }

    /**
     * 执行搜索：商品多 token AND，库位规范化子串匹配
     * @param {string} query
     */
    _performSearch(query) {
        if (this._searchTimer) {
            clearTimeout(this._searchTimer);
            this._searchTimer = null;
        }
        const isLocation = this._searchMode === 'location';
        const minLen = isLocation ? 3 : 2;
        const trimmed = (query || '').trim();
        if (trimmed.length < minLen) {
            this._hideResults();
            return;
        }
        this._searchTimer = setTimeout(() => {
            this._searchTimer = null;
            let results = [];
            if (this._searchMode === 'product') {
                if (this._productMapLoadFailed || this.productMap.size === 0) {
                    this._hideResults();
                    return;
                }
                const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
                if (tokens.length === 0) {
                    this._hideResults();
                    return;
                }
                for (const [code, value] of this.productMap) {
                    if (results.length >= 50) break;
                    const name = typeof value === 'string' ? value : value.name;
                    const lowerName = name.toLowerCase();
                    const lowerCode = code.toLowerCase();
                    const hit = tokens.every(t => lowerName.includes(t) || lowerCode.includes(t));
                    if (hit) {
                        results.push({ display: `${name} (${code})`, value: code });
                    }
                }
                results.sort((a, b) => a.display.localeCompare(b.display));
            } else {
                const normalizedQuery = this._normalizeLocationString(trimmed).toLowerCase();
                if (!normalizedQuery) {
                    this._hideResults();
                    return;
                }
                for (const loc of this.commonLocations) {
                    if (results.length >= 50) break;
                    const normalizedLoc = this._normalizeLocationString(loc).toLowerCase();
                    if (normalizedLoc.includes(normalizedQuery)) {
                        results.push({ display: loc, value: loc });
                    }
                }
            }
            this._searchResults = results;
            this._selectedIndex = results.length > 0 ? 0 : -1;
            this._showResults(results);
        }, 200);
    }

    /**
     * 渲染搜索结果列表
     * @param {Array} results
     */
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

    /** 隐藏搜索结果列表 */
    _hideResults() {
        const container = document.getElementById('multiQrSearchResults');
        if (container) container.style.display = 'none';
        this._searchResults = [];
        this._selectedIndex = -1;
    }

    /**
     * 插入搜索结果到输入框
     * @param {string} value
     */
    _insertResult(value) {
        const textarea = document.getElementById('multiQrTextInput');
        if (!textarea) return;
        this._insertAtCursor(textarea, value + '\n');
        const input = document.getElementById('multiQrSearchInput');
        if (input) input.value = '';
        this._hideResults();
        textarea.focus();
    }

    /**
     * 搜索框键盘导航
     * @param {KeyboardEvent} e
     */
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

    // ==================== UI ====================

    /**
     * 绑定面板事件
     * @param {HTMLElement} panel
     */
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

    /** 渲染模块面板 */
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
                                    <div class="toolbar" style="margin-bottom:0">
                                        <div class="checkbox-group" style="margin:0">
                                            <input type="checkbox" id="autoUppercase" checked>
                                            <label for="autoUppercase">${MQ_TEXT.label_autoUppercase}</label>
                                        </div>
                                        <div class="checkbox-group" style="margin:0">
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
                                <button type="button" id="clearMultiQrText" class="btn btn-secondary multi-qr-clear-btn">${this.app.getIcon('arrow-counterclockwise')}<br>${MQ_TEXT.btn_clear}<br>${MQ_TEXT.btn_clearHint}</button>
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

// ==================== 文案 ====================

const MQ_TEXT = {
    title: '多二维码生成',
    introText: '批量生成多个二维码，支持自动格式化和大写，支持商品信息查询。',
    helpDescription: `
<p><strong>怎么用</strong><br>把内容粘贴到左侧输入框，右侧实时生成二维码。每行一个，也可用空格分隔多个码一次生成多个。</p>
<p><strong>常用开关</strong><br>「自动大写」把字母转大写；「自动格式化库位码」把无连字符的库位码自动加 <code>-</code>，勾它会连带勾上自动大写。</p>
<p><strong>商品信息</strong><br>输入纯数字时会自动查商品名、日期、重量，符合当日鲜的会标出来。需要 <code>productMap.js</code> 支持。</p>
<p><strong>搜索</strong><br>点上方"搜索"展开。商品模式支持空格分隔多关键词（如「统一 1L」）。库位模式输 3 位以上即可。</p>
<p><strong>其他</strong><br>单次最多 10 个，按 <kbd>ESC</kbd> 清空。</p>
<p>插件版：<a href="https://gitee.com/cnwz/xxcs-extension/releases" target="_blank">https://gitee.com/cnwz/xxcs-extension/releases</a></p>
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
    status_newMap: '正常，数据版本',

    info_product: '[商品] {name}',
    info_productCodeUnregistered: '[商品码] {code} (未录入)',
    info_date: '<br>[日期] 20{date}{time}',
    info_weight: '[重量] {w} g',
    info_freshTag: ' <span style="font-weight:bold;color:#ee6aa7;">当日鲜</span>',

    err_unknownMapFormat: '商品库格式错误：仅支持三列数组 [条码, 商品名, 当日鲜]',
    err_arrayNeedThreeCols: '商品库第 {n} 行格式错误：需要三列 [条码, 商品名, 当日鲜]',
    err_noProductMapData: '未找到有效商品映射数据',
    err_productMapLoadFailed: '无法加载商品映射文件: {url}',
    err_qrGenerateFailed: '生成失败:',
    warn_commonLocationsLoadFailed: '[MultiQR] 加载常用库位文件失败: {url}，使用内置默认列表',

    styles: `.mq-basic-tag{color:var(--danger)}
.multi-qr-container{display:flex;gap:var(--sp-6);margin-top:var(--sp-5)}
.multi-qr-left,.multi-qr-right{flex:1;min-width:350px}
.multi-qr-left h4,.multi-qr-right h4{margin-bottom:var(--sp-4);color:var(--text-strong);font-size:var(--fs-lg)}
.multi-qr-left textarea{width:100%;height:350px;padding:var(--sp-4);border:2px solid var(--border);border-radius:var(--r);resize:vertical;margin-bottom:var(--sp-5);font-size:var(--fs-lg);line-height:1.6;background:var(--bg-input);color:var(--text-strong)}
.multi-qr-left textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,189,0,.15);outline:0}
#multiQrPreview{display:flex;flex-direction:column;gap:var(--sp-5)}
.multi-qr-preview-item{text-align:center;padding:var(--sp-5)}
.multi-qr-preview-item img{width:auto;height:auto;max-width:220px;margin:0 auto var(--sp-5);display:block}
.multi-qr-preview-item div{font-weight:700;word-break:break-all;font-size:var(--fs-lg);color:var(--text-strong);line-height:1.5;padding:0;background:0 0;border-radius:0;text-align:center}
.multi-qr-header-actions{display:flex;flex-wrap:wrap;align-items:stretch;gap:var(--sp-2);width:100%}
.multi-qr-checkbox-group{flex:1;display:flex;flex-direction:column;justify-content:space-around;min-width:200px}
.multi-qr-clear-btn{height:auto;align-self:center;white-space:nowrap;flex-shrink:0}
.multi-qr-extra-info{font-size:var(--fs-sm);font-weight:400;margin-top:var(--sp-2);color:var(--text);padding:var(--sp-2) var(--sp-3);border-radius:var(--r-sm);display:inline-block;max-width:90%;margin-left:auto;margin-right:auto}
.multi-qr-limit-hint{margin-bottom:var(--sp-3);padding:var(--sp-2) var(--sp-3);background:var(--accent-soft);border-left:3px solid var(--accent);color:var(--accent-text);font-size:var(--fs-sm);border-radius:var(--r-sm)}
.quick-input-buttons{display:flex;flex-direction:column;gap:var(--sp-2);width:40px;flex-shrink:0}
.quick-input-buttons .quick-btn{background:var(--bg-sub);border:1px solid var(--border);border-radius:var(--r-sm);padding:var(--sp-2) 0;font-size:20px;cursor:pointer;text-align:center;transition:background var(--t);color:var(--text-strong)}
.quick-input-buttons .quick-btn:hover{background:var(--bg-hover)}
.multi-qr-input-area{display:flex;gap:var(--sp-3);align-items:flex-start}
.multi-qr-left textarea{flex:1;margin-bottom:0}
.multi-qr-search-container{margin:var(--sp-3) 0 var(--sp-2)}
a.multi-qr-search-toggle{color:var(--text-strong);cursor:pointer;text-decoration:none;font-size:var(--fs-sm);display:inline-block}
a.multi-qr-search-toggle:hover{color:var(--accent-text);text-decoration:none}
.multi-qr-search-toolbar{margin-top:var(--sp-2);margin-bottom:0}
.multi-qr-search-mode-btn{padding:var(--sp-1) var(--sp-3);border:1px solid var(--border);border-radius:var(--r-sm);background:var(--bg-sub);cursor:pointer;font-size:var(--fs-sm);white-space:nowrap;height:32px;line-height:1.4;min-width:60px;color:var(--text-strong)}
.multi-qr-search-mode-btn:hover{background:var(--bg-hover)}
.multi-qr-search-wrapper{flex:1;min-width:0;position:relative}
#multiQrSearchInput{width:100%;padding:var(--sp-2) var(--sp-3);border:1px solid var(--border);border-radius:var(--r-sm);font-size:var(--fs-sm);box-sizing:border-box;height:32px;display:block;background:var(--bg-input);color:var(--text-strong)}
.multi-qr-search-results{position:absolute;top:calc(100% + 2px);left:0;right:0;max-height:200px;overflow-y:auto;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--r-sm);z-index:1000;box-shadow:0 4px 12px rgba(0,0,0,.15);display:none}
.multi-qr-search-results .result-item{padding:var(--sp-2) var(--sp-3);cursor:pointer;font-size:var(--fs-sm);border-bottom:1px solid var(--border-soft);display:flex;justify-content:space-between;color:var(--text)}
.multi-qr-search-results .result-item:hover{background:var(--bg-hover)}
.multi-qr-search-results .result-item.selected{background:var(--accent-soft)}
@media (max-width:600px){.multi-qr-input-area{flex-direction:column}.quick-input-buttons{flex-direction:row;flex-wrap:wrap;width:100%}.quick-input-buttons .quick-btn{flex:1}}`
};

window.MultiQRCodeModule = MultiQRCodeModule;