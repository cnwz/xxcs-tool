/**
 * @description 二维码打印模块，支持粘贴文本或上传 Excel，导出 PDF 或图片
 * @author me@cnwz.me
 * @since 2026-09-21
 * @lastupdate 2026-10-19
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/QRPrintModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class QRPrintModule {

    constructor(app) {
        this.app = app;
        this.title = QRP_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2026-10-19';
        this.iconName = 'printer';
        this.introText = QRP_TEXT.introText;
        this.helpDescription = QRP_TEXT.helpDescription;

        this._size = 'a4';
        this._onlyPile = false;
        this._uploadedData = null;
        this._currentColumns = null;
        this._items = [];
        this._previewCache = [];

        // 页眉 / LOGO 状态
        this.currentHeader = null;
        this._logoImgCache = {};

        this._iconCache = {
            upload: this.app.getIcon('filetype-xlsx'),
            pdf: this.app.getIcon('filetype-pdf'),
            png: this.app.getIcon('filetype-png'),
            qr: this.app.getIcon('qr-code'),
            refresh: this.app.getIcon('arrow-counterclockwise'),
            x: this.app.getIcon('x'),
        };
    }

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, QRP_TEXT.styles);
    }

    // ==================== 页眉 / LOGO ====================

    /** 当前生效的页眉：上传图 > 默认 logo > 空白 */
    getCurrentHeader() {
        if (this.currentHeader) return this.currentHeader;
        const useDefault = document.getElementById('useDefaultHeader');
        if (useDefault && useDefault.checked) return this.app.logoImage;
        return null;
    }

    handleHeaderUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const fileNameEl = document.getElementById('fileName');
        if (fileNameEl) fileNameEl.textContent = file.name;

        if (!file.type.match('image.*')) {
            this.app.showMessage('请上传图片文件 (JPEG, PNG, GIF等)', 'error');
            event.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.app.showMessage('图片文件大小不能超过5MB', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentHeader = e.target.result;
            this._logoImgCache = {};
            const useDefault = document.getElementById('useDefaultHeader');
            if (useDefault) {
                useDefault.disabled = true;
                useDefault.checked = false;
            }
            this.updateHeaderPreview();
            this.app.showMessage('页眉图片上传成功', 'success');
        };
        reader.onerror = () => {
            this.app.showMessage('文件读取失败，请重试', 'error');
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }

    resetHeader() {
        this.currentHeader = null;
        this._logoImgCache = {};
        const upload = document.getElementById('headerImageUpload');
        if (upload) upload.value = '';
        const fileNameEl = document.getElementById('fileName');
        if (fileNameEl) fileNameEl.textContent = '未选择文件，将使用默认页眉';
        const useDefault = document.getElementById('useDefaultHeader');
        if (useDefault) {
            useDefault.disabled = false;
            useDefault.checked = true;
        }
        this.updateHeaderPreview();
        this.app.showMessage('页眉已恢复为默认', 'success');
    }

    updateHeaderPreview() {
        const preview = document.getElementById('headerPreview');
        if (!preview) return;
        preview.innerHTML = '';
        const header = this.getCurrentHeader();
        if (header) {
            const img = document.createElement('img');
            img.src = header;
            img.className = 'preview-image';
            img.alt = '页眉预览';
            preview.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'preview-placeholder';
            placeholder.textContent = '空白页眉';
            preview.appendChild(placeholder);
        }
    }

    // ==================== 数据源 ====================

    _parseTextLine(line) {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const parts = trimmed.split(';');
        const code = parts[0].trim();
        if (!code) return null;
        const display = parts.length > 1 ? parts.slice(1).join(';').trim() : code;
        return { code, display: display || code };
    }

    _isValidItem(item) {
        const code = item.code;
        if (/^\d{5}$/.test(code)) return true;
        const parts = code.split('-');
        if (parts.length !== 5) return false;
        const [, , , layer, position] = parts;
        if (layer.toUpperCase() !== 'DD' && !/^\d{2}$/.test(layer)) return false;
        if (!/^\d{2}$/.test(position)) return false;
        return true;
    }

    _isPile(item) {
        const parts = item.code.split('-');
        return parts.length === 5 && parts[3].toUpperCase() === 'DD';
    }

    _getItems() {
        let items = [];

        if (this._uploadedData && this._currentColumns) {
            const { codeCol, displayCol } = this._currentColumns;
            for (const row of this._uploadedData) {
                if (!row || row.length < codeCol + 1) continue;
                const code = String(row[codeCol] || '').trim();
                if (!code) continue;
                const display = displayCol >= 0 && row.length > displayCol
                    ? String(row[displayCol] || '').trim() : code;
                items.push({ code, display: display || code });
            }
        } else {
            const textarea = document.getElementById('qrpTextInput');
            const raw = textarea ? textarea.value : '';
            if (raw.trim()) {
                for (const line of raw.split(/\r?\n/)) {
                    const item = this._parseTextLine(line);
                    if (item) items.push(item);
                }
            }
        }

        items = items.filter(item => this._isValidItem(item));

        if (this._onlyPile && !this._uploadedData) {
            items = items.filter(item => this._isPile(item));
        }

        return items;
    }

    async _handleExcelFile(file) {
        const uploadStatus = document.getElementById('qrpUploadStatus');
        const columnSelector = document.getElementById('qrpExcelColumnSelector');
        const codeColSelect = document.getElementById('qrpCodeColSelect');
        const displayColSelect = document.getElementById('qrpDisplayColSelect');
        const textarea = document.getElementById('qrpTextInput');
        const filterGroup = document.getElementById('qrpFilterGroup');

        const table = await this.app.readExcelTable(file, {
            emptyMessage: QRP_TEXT.msg_emptyFile,
            parseErrorMessage: QRP_TEXT.msg_parseExcelFailed,
        });
        if (!table) return;

        const { headers, rows } = table;
        this._uploadedData = rows;

        codeColSelect.innerHTML = '';
        displayColSelect.innerHTML = `<option value="-1">${QRP_TEXT.opt_none}</option>`;
        headers.forEach((h, idx) => {
            const label = h || `${QRP_TEXT.opt_colPrefix}${idx + 1}`;
            const opt1 = document.createElement('option');
            opt1.value = idx;
            opt1.textContent = label;
            codeColSelect.appendChild(opt1);
            const opt2 = document.createElement('option');
            opt2.value = idx;
            opt2.textContent = label;
            displayColSelect.appendChild(opt2);
        });

        const guess = (keywords) => {
            for (const kw of keywords) {
                const lower = kw.toLowerCase();
                for (let i = 0; i < headers.length; i++) {
                    if (headers[i].toLowerCase().includes(lower)) return i;
                }
            }
            return -1;
        };
        const codeGuess = guess(['库位', '条码', '编码', 'code', '码']);
        if (codeGuess >= 0) codeColSelect.value = codeGuess;
        const displayGuess = guess(['显示', '名称', '文字', 'display', 'name']);
        if (displayGuess >= 0 && displayGuess !== codeGuess) displayColSelect.value = displayGuess;

        columnSelector.style.display = 'block';
        if (textarea) textarea.style.display = 'none';
        if (filterGroup) filterGroup.style.display = 'none';
        if (uploadStatus) uploadStatus.textContent = QRP_TEXT.msg_uploaded.replace('{file}', file.name).replace('{n}', rows.length);

        this._syncColumns();
        this.app.showMessage(QRP_TEXT.msg_parseOk.replace('{n}', rows.length), 'success');
    }

    _syncColumns() {
        const codeCol = parseInt(document.getElementById('qrpCodeColSelect').value);
        const displayCol = parseInt(document.getElementById('qrpDisplayColSelect').value);
        if (isNaN(codeCol)) return;
        this._currentColumns = {
            codeCol,
            displayCol: isNaN(displayCol) || displayCol < 0 ? -1 : displayCol
        };
    }

    _switchToText() {
        this._uploadedData = null;
        this._currentColumns = null;
        const columnSelector = document.getElementById('qrpExcelColumnSelector');
        const uploadStatus = document.getElementById('qrpUploadStatus');
        const textarea = document.getElementById('qrpTextInput');
        const filterGroup = document.getElementById('qrpFilterGroup');
        if (columnSelector) columnSelector.style.display = 'none';
        if (uploadStatus) uploadStatus.textContent = '';
        if (textarea) textarea.style.display = '';
        if (filterGroup) filterGroup.style.display = '';
        this.app.showMessage(QRP_TEXT.msg_switchedToText, 'info');
    }

    // ==================== 渲染 ====================

    /**
     * 加载图片，可选缓存
     * @param {string} src
     * @param {boolean} [cache=false]
     * @returns {Promise<HTMLImageElement>}
     */
    _loadImage(src, cache = false) {
        if (cache && this._logoImgCache[src]) {
            return Promise.resolve(this._logoImgCache[src]);
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (cache) this._logoImgCache[src] = img;
                resolve(img);
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = src;
        });
    }

    _drawText(ctx, text, cx, cy, maxWidth, maxFont, minFont) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let fontSize = maxFont;
        while (fontSize >= minFont) {
            ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
            if (ctx.measureText(text).width <= maxWidth) {
                ctx.fillText(text, cx, cy);
                return;
            }
            fontSize -= 2;
        }

        ctx.font = `bold ${minFont}px "Microsoft YaHei", sans-serif`;
        const lines = this._wrapText(ctx, text, maxWidth);
        const lineHeight = minFont * 1.2;
        const totalH = lines.length * lineHeight;
        let y = cy - totalH / 2 + lineHeight / 2;
        for (const line of lines) {
            ctx.fillText(line, cx, y);
            y += lineHeight;
        }
    }

    _wrapText(ctx, text, maxWidth) {
        const lines = [];
        let current = '';
        for (const ch of text) {
            const test = current + ch;
            if (ctx.measureText(test).width > maxWidth && current) {
                lines.push(current);
                current = ch;
            } else {
                current = test;
            }
        }
        if (current) lines.push(current);
        return lines;
    }

    _drawA4(ctx, item, qrImg, logoImg, cfg) {
        const W = cfg.canvasW;
        let headerHeight = 0;

        if (logoImg) {
            const maxW = W * 0.5;
            const calcH = (maxW / logoImg.naturalWidth) * logoImg.naturalHeight;
            const targetH = Math.min(calcH, 60);
            const targetW = (targetH / logoImg.naturalHeight) * logoImg.naturalWidth;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(logoImg, 10, 20, targetW, targetH);
            headerHeight = targetH;
        }

        const qrSize = 450;
        const qrX = (W - qrSize) / 2;
        const qrY = logoImg ? 100 + headerHeight : 150;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        const text = item.display || item.code;
        const textY = qrY + qrSize + 100;
        this._drawText(ctx, text, W / 2, textY, W - 80, 72, 20);
    }

    _drawLabel(ctx, item, qrImg, logoImg, cfg) {
        const W = cfg.canvasW;

        if (logoImg) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // 按比例适配到 265×87 的框内，左上角对齐 (28,2)，不变形
            const boxW = 265, boxH = 87, boxX = 28, boxY = 2;
            const ratio = Math.min(boxW / logoImg.naturalWidth, boxH / logoImg.naturalHeight);
            const drawW = logoImg.naturalWidth * ratio;
            const drawH = logoImg.naturalHeight * ratio;
            ctx.drawImage(logoImg, boxX, boxY, drawW, drawH);
        }

        const qrSize = 296;
        const qrX = (W - qrSize) / 2;
        const qrY = 96;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        const text = item.display || item.code;
        const textY = 410;
        this._drawText(ctx, text, W / 2, textY, W - 40, 44, 24);
    }

    /**
     * 渲染单个条目
     * @param {{code:string,display:string}} item
     * @param {number} [scale=1] 分辨率倍数（1=预览，2=导出，3=放大）
     * @returns {Promise<HTMLCanvasElement>}
     */
    async _renderOne(item, scale = 1) {
        const cfg = QRP_SIZE[this._size];
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(cfg.canvasW * scale);
        canvas.height = Math.round(cfg.canvasH * scale);
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cfg.canvasW, cfg.canvasH);

        // 页眉：统一走 getCurrentHeader()，支持上传/默认/空白三种状态
        let logoImg = null;
        const headerSrc = this.getCurrentHeader();
        if (headerSrc) {
            try {
                logoImg = await this._loadImage(headerSrc, true);
            } catch (e) {
                logoImg = null;
            }
        }

        // 二维码位图分辨率随 scale 反推，避免放大后噪点
        const qr = qrcode(0, cfg.ecc);
        qr.addData(item.code);
        qr.make();
        const moduleCount = qr.getModuleCount();
        const qrDisplaySize = this._size === 'a4' ? 450 : 296;
        const cellSize = Math.max(10, Math.ceil((qrDisplaySize * scale) / moduleCount));
        const qrDataUrl = qr.createDataURL(cellSize, 0);
        const qrImg = await this._loadImage(qrDataUrl, false);

        if (this._size === 'a4') {
            this._drawA4(ctx, item, qrImg, logoImg, cfg);
        } else {
            this._drawLabel(ctx, item, qrImg, logoImg, cfg);
        }

        return canvas;
    }

    /** 生成预览：1x 渲染，缩略图足够 */
    async renderPreviews() {
        const ok = await this.app.loadLibrary('qrcode');
        if (!ok) {
            this.app.showMessage(QRP_TEXT.msg_libNotReady, 'error');
            return;
        }

        const container = document.getElementById('qrpPreview');
        if (!container) return;

        const sizeRadio = document.querySelector('input[name="qrpSize"]:checked');
        if (sizeRadio) this._size = sizeRadio.value;

        const filterCheckbox = document.getElementById('qrpOnlyPile');
        if (filterCheckbox) this._onlyPile = filterCheckbox.checked;

        this._items = this._getItems();

        if (this._items.length === 0) {
            container.innerHTML = this.app.emptyState(QRP_TEXT.msg_noItems);
            this._previewCache = [];
            this.app.showMessage(QRP_TEXT.msg_noItems, 'error');
            return;
        }

        container.innerHTML = this.app.loadingState(QRP_TEXT.msg_generating);

        this._previewCache = [];
        const cells = [];
        for (let i = 0; i < this._items.length; i++) {
            try {
                const canvas = await this._renderOne(this._items[i], 1);
                const dataUrl = canvas.toDataURL('image/png');
                this._previewCache.push(dataUrl);
                cells.push(`<div class="qrp-preview-item" data-index="${i}"><img src="${dataUrl}" alt="二维码"></div>`);
            } catch (err) {
                console.error('生成失败:', this._items[i], err);
            }
        }

        const info = `<div class="qrp-info">${QRP_TEXT.msg_count.replace('{n}', this._previewCache.length)}</div>`;
        container.innerHTML = info + `<div class="qrp-grid">${cells.join('')}</div>`;

        container.querySelectorAll('.qrp-preview-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                this.showEnlarged(idx);
            });
        });
    }

    /** 点击放大：单张 3x 重渲染，清晰可打印 */
    async showEnlarged(index) {
        const item = this._items[index];
        if (!item) return;
        this.app.showLoading(this.id, '正在生成高清预览…');
        try {
            const canvas = await this._renderOne(item, 3);
            this.app.hideLoading(this.id);
            this.app.showImageViewer([canvas.toDataURL('image/png')], 0, { showPrint: true });
        } catch (e) {
            this.app.hideLoading(this.id);
            this.app.showMessage('高清预览生成失败', 'error');
        }
    }

    // ==================== 导出 ====================

    /** 导出 PDF：2x 重渲染，一页一张 */
    async exportPDF() {
        if (this._items.length === 0) {
            this.app.showMessage(QRP_TEXT.msg_generateFirst, 'error');
            return;
        }

        const ok = await this.app.loadLibrary('jspdf');
        if (!ok) {
            this.app.showMessage(QRP_TEXT.msg_pdfLibNotReady, 'error');
            return;
        }

        this.app.showLoading(this.id, '正在生成高清 PDF…');
        try {
            const { jsPDF } = window.jspdf;
            const cfg = QRP_SIZE[this._size];

            const pdf = new jsPDF({
                orientation: cfg.pdfOrientation,
                unit: 'mm',
                format: cfg.pdfFormat,
                compress: true
            });

            for (let i = 0; i < this._items.length; i++) {
                if (i > 0) pdf.addPage(cfg.pdfFormat, cfg.pdfOrientation);
                const canvas = await this._renderOne(this._items[i], 2);
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, cfg.pdfW, cfg.pdfH);
            }

            this.app.hideLoading(this.id);
            pdf.save(`二维码_${this.app.timestamp()}.pdf`);
            this.app.showMessage(QRP_TEXT.msg_pdfOk.replace('{n}', this._items.length), 'success');
        } catch (err) {
            this.app.hideLoading(this.id);
            console.error('PDF 导出失败:', err);
            this.app.showMessage(QRP_TEXT.msg_pdfFailed + err.message, 'error');
        }
    }

    /** 导出图片：2x 重渲染，单张 PNG，多张 ZIP */
    async exportImages() {
        if (this._items.length === 0) {
            this.app.showMessage(QRP_TEXT.msg_generateFirst, 'error');
            return;
        }

        this.app.showLoading(this.id, '正在生成高清图片…');
        const highRes = [];
        try {
            for (const item of this._items) {
                const canvas = await this._renderOne(item, 2);
                highRes.push(canvas.toDataURL('image/png'));
            }
        } catch (e) {
            this.app.hideLoading(this.id);
            this.app.showMessage('图片渲染失败: ' + e.message, 'error');
            return;
        }
        this.app.hideLoading(this.id);

        if (highRes.length === 1) {
            try {
                const res = await fetch(highRes[0]);
                const blob = await res.blob();
                const name = (this._items[0].display || this._items[0].code).replace(/[\\/:*?"<>|]/g, '_');
                this.app.download(blob, `二维码_${name}.png`, 'image/png');
                this.app.showMessage(QRP_TEXT.msg_imageOk, 'success');
            } catch (err) {
                console.error('图片导出失败:', err);
                this.app.showMessage(QRP_TEXT.msg_imageFailed + err.message, 'error');
            }
            return;
        }

        const ok = await this.app.loadLibrary('jszip');
        if (!ok) {
            this.app.showMessage(QRP_TEXT.msg_zipLibNotReady, 'error');
            return;
        }

        try {
            const zip = new JSZip();
            for (let i = 0; i < highRes.length; i++) {
                const item = this._items[i];
                const name = (item.display || item.code).replace(/[\\/:*?"<>|]/g, '_');
                zip.file(`二维码_${name}_${i + 1}.png`, highRes[i].split(',')[1], { base64: true });
            }
            const content = await zip.generateAsync({ type: 'blob' });
            this.app.download(content, `二维码_${this.app.timestamp()}.zip`, 'application/zip');
            this.app.showMessage(QRP_TEXT.msg_zipOk.replace('{n}', highRes.length), 'success');
        } catch (err) {
            console.error('ZIP 导出失败:', err);
            this.app.showMessage(QRP_TEXT.msg_zipFailed + err.message, 'error');
        }
    }

    // ==================== 事件 ====================

    bindEvents(panel) {
        panel.querySelector('#qrpUploadBtn')?.addEventListener('click', async () => {
            try {
                const file = await this.app.pickFile({ accept: '.xlsx,.xls,.csv' });
                if (!file) return;
                await this._handleExcelFile(file);
            } catch (e) {
                this.app.showMessage(e.message, 'error');
            }
        });

        panel.querySelector('#qrpSwitchToTextBtn')?.addEventListener('click', () => this._switchToText());

        panel.querySelector('#qrpCodeColSelect')?.addEventListener('change', () => this._syncColumns());
        panel.querySelector('#qrpDisplayColSelect')?.addEventListener('change', () => this._syncColumns());

        panel.querySelector('#qrpLoadExampleBtn')?.addEventListener('click', () => {
            const textarea = panel.querySelector('#qrpTextInput');
            if (textarea) textarea.value = QRP_TEXT.exampleData;
            this._uploadedData = null;
            this._currentColumns = null;
            const columnSelector = panel.querySelector('#qrpExcelColumnSelector');
            const uploadStatus = panel.querySelector('#qrpUploadStatus');
            const filterGroup = panel.querySelector('#qrpFilterGroup');
            if (columnSelector) columnSelector.style.display = 'none';
            if (uploadStatus) uploadStatus.textContent = '';
            if (filterGroup) filterGroup.style.display = '';
            if (textarea) textarea.style.display = '';
        });

        // 页眉 / LOGO 事件
        panel.querySelector('#headerImageUpload')?.addEventListener('change', (e) => this.handleHeaderUpload(e));
        panel.querySelector('#resetHeaderBtn')?.addEventListener('click', () => this.resetHeader());
        panel.querySelector('#useDefaultHeader')?.addEventListener('change', () => this.updateHeaderPreview());

        panel.querySelector('#qrpGenerateBtn')?.addEventListener('click', () => this.renderPreviews());
        panel.querySelector('#qrpExportPdfBtn')?.addEventListener('click', () => this.exportPDF());
        panel.querySelector('#qrpExportImagesBtn')?.addEventListener('click', () => this.exportImages());
    }

    destroy() {
        this._previewCache = [];
        this._items = [];
        this._logoImgCache = {};
        this.currentHeader = null;
    }

    // ==================== UI ====================

    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header">
                    <h2>${QRP_TEXT.heading}</h2>
                    ${this.app.getHelpButton(this.id)}
                </div>

                <!-- 页眉设置 -->
                <div class="header-options">
                    <div class="checkbox-group">
                        <input type="checkbox" id="useDefaultHeader" checked>
                        <label for="useDefaultHeader">默认页眉</label>
                    </div>
                    <p class="note">上传自定义图片后将优先使用上传的图片，此项自动禁用。</p>
                </div>
                <div class="header-upload-section">
                    <div class="upload-controls">
                        <label for="headerImageUpload">上传页眉图片</label>
                        <div class="file-input-wrapper">
                            <input type="file" id="headerImageUpload" accept="image/*">
                            <div class="file-input-button">选择图片文件</div>
                        </div>
                        <div class="file-name" id="fileName">未选择文件，将使用默认页眉</div>
                        <div class="qr-mt-10">
                            <button type="button" id="resetHeaderBtn" class="btn btn-secondary">${this._iconCache.refresh} 重置为默认页眉</button>
                        </div>
                    </div>
                    <div class="preview-container">
                        <h4>页眉预览</h4>
                        <div id="headerPreview"><div class="preview-placeholder">空白页眉</div></div>
                    </div>
                </div>

                <div class="form-group">
                    <label>${QRP_TEXT.label_dataSource}</label>
                    <div class="toolbar">
                        <button id="qrpUploadBtn" class="btn btn-secondary">${this._iconCache.upload} ${QRP_TEXT.btn_uploadExcel}</button>
                        <span id="qrpUploadStatus" class="status-text"></span>
                        <button id="qrpLoadExampleBtn" class="btn btn-secondary">${QRP_TEXT.btn_loadExample}</button>
                    </div>
                    <textarea id="qrpTextInput" placeholder="${QRP_TEXT.ph_input}"></textarea>
                    <div id="qrpExcelColumnSelector" class="panel-box" style="display:none;">
                        <div class="columns-row">
                            <div><strong>${QRP_TEXT.label_selectColumns}</strong></div>
                            <div class="qrp-column-selects">
                                <label>${QRP_TEXT.label_codeCol}<select id="qrpCodeColSelect"></select></label>
                                <label>${QRP_TEXT.label_displayCol}<select id="qrpDisplayColSelect"><option value="-1">${QRP_TEXT.opt_none}</option></select></label>
                            </div>
                            <button id="qrpSwitchToTextBtn" class="btn btn-secondary">${QRP_TEXT.btn_switchToText}</button>
                        </div>
                    </div>
                    <p class="note">${QRP_TEXT.note_inputHint}</p>
                    <div class="checkbox-group" id="qrpFilterGroup">
                        <input type="checkbox" id="qrpOnlyPile">
                        <label for="qrpOnlyPile">${QRP_TEXT.label_onlyPile}</label>
                    </div>
                </div>

                <div class="form-group">
                    <label>${QRP_TEXT.label_size}</label>
                    <div class="qrp-size-group">
                        <label class="qrp-size-option">
                            <input type="radio" name="qrpSize" value="a4" checked>
                            <span>${QRP_TEXT.size_a4}</span>
                        </label>
                        <label class="qrp-size-option">
                            <input type="radio" name="qrpSize" value="label">
                            <span>${QRP_TEXT.size_label}</span>
                        </label>
                    </div>
                </div>

                <div class="btn-row">
                    <button id="qrpGenerateBtn" class="btn">${this._iconCache.qr} ${QRP_TEXT.btn_generate}</button>
                    <button id="qrpExportPdfBtn" class="btn">${this._iconCache.pdf} ${QRP_TEXT.btn_exportPdf}</button>
                    <button id="qrpExportImagesBtn" class="btn">${this._iconCache.png} ${QRP_TEXT.btn_exportImages}</button>
                </div>

                <div class="qrp-preview-section">
                    <h3>${QRP_TEXT.heading_preview}</h3>
                    <div id="qrpPreview"></div>
                </div>
            </div>
        `;
        this.bindEvents(panel);
        this.updateHeaderPreview();
        this.app._log(this.title + '加载成功');
    }
}
// ==================== 尺寸 ====================
const QRP_SIZE = {
    a4: {
        canvasW: 595, canvasH: 842,
        pdfFormat: 'a4', pdfOrientation: 'portrait',
        pdfW: 210, pdfH: 297,
        ecc: 'M',
        logoMode: 'header'
    },
    label: {
        canvasW: 709, canvasH: 472,
        pdfFormat: [60, 40], pdfOrientation: 'landscape',
        pdfW: 60, pdfH: 40,
        ecc: 'H',
        logoMode: 'corner'
    }
};

// ==================== 文案 ====================
const QRP_TEXT = {
    title: '二维码打印',
    introText: '生成二维码，支持粘贴文本或上传 Excel，导出 PDF 或图片。',
    helpDescription: '<p><strong>页眉设置</strong>：可勾选默认 LOGO，或上传自定义图片（优先使用），或取消勾选且不上传即为空白页眉。</p><p><strong>数据源</strong>：可粘贴文本（每行一条）或上传 Excel（选列）。上传后文本区隐藏，点击「切换回文本输入」可返回。</p><p><strong>输入格式</strong>：每行 <code>库位号</code> 或 <code>库位号;下方文字</code>，也可输入 5 位纯数字。</p><p><strong>输出尺寸</strong>：A4 大图（595×842，适合张贴）或 60×40mm 标签（适合标签机）。</p><p><strong>预览与导出</strong>：预览为快速缩略图，点击任一缩略图可查看高清放大（支持打印）；导出 PDF / 图片均使用 2 倍分辨率重渲染，清晰度有保障。</p>',

    heading: '二维码打印',
    label_dataSource: '数据源',
    label_selectColumns: '选择列：',
    label_codeCol: '二维码内容列：',
    label_displayCol: '下方文字列：',
    label_size: '输出尺寸',
    label_onlyPile: '仅地堆（DD）',
    opt_none: '无',
    opt_colPrefix: '列',
    btn_uploadExcel: '上传 Excel',
    btn_loadExample: '加载示例',
    btn_switchToText: '切换回文本输入',
    btn_generate: '生成预览',
    btn_exportPdf: '导出 PDF',
    btn_exportImages: '导出图片',
    heading_preview: '预览',
    modal_enlarge: '二维码放大',
    btn_prev: '上一张',
    btn_next: '下一张',

    size_a4: 'A4 大图',
    size_label: '60×40mm 标签',

    ph_input: '每行一条：\nLC-01-01-DD-01\nLC-01-01-03-05;库位说明\n12345',
    note_inputHint: '格式：库位号 或 库位号;下方文字，也可输入 5 位纯数字。分号后为二维码下方显示的文字。',

    exampleData: `LC-01-01-DD-01\nLC-01-01-03-05;A3货架\nYC-CW-CZ-00-00\n12345`,

    msg_emptyFile: '文件为空或只有表头',
    msg_parseOk: '文件解析成功，共 {n} 行数据，请选择列',
    msg_parseExcelFailed: '解析Excel失败: ',
    msg_uploaded: '已上传: {file} ({n}行数据)',
    msg_switchedToText: '已切换回文本输入模式',
    msg_noItems: '没有有效的二维码内容',
    msg_generating: '正在生成预览…',
    msg_count: '共生成 {n} 个二维码',
    msg_libNotReady: '二维码库加载失败，请检查网络',
    msg_pdfLibNotReady: 'PDF 库加载失败，请检查网络',
    msg_zipLibNotReady: 'ZIP 库加载失败，请检查网络',
    msg_generateFirst: '请先生成预览',
    msg_pdfOk: 'PDF 导出成功（{n} 页）',
    msg_pdfFailed: 'PDF 导出失败: ',
    msg_imageOk: '图片已保存',
    msg_imageFailed: '图片导出失败: ',
    msg_zipOk: '已导出 {n} 张图片并打包下载',
    msg_zipFailed: 'ZIP 导出失败: ',

    styles: `.qrp-column-selects{display:flex;gap:var(--sp-3);flex-wrap:wrap}
.qrp-size-group{display:flex;gap:var(--sp-5);flex-wrap:wrap}
.qrp-size-option{display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-3) var(--sp-4);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;transition:all var(--t);background:var(--bg-panel);color:var(--text-strong)}
.qrp-size-option:hover{border-color:var(--accent)}
.qrp-size-option input[type="radio"]{width:18px;height:18px;margin:0;accent-color:var(--accent);flex-shrink:0}
.qrp-size-option input[type="radio"]:checked + span{color:var(--accent-text);font-weight:700}
.qrp-preview-section{margin-top:var(--sp-6)}
.qrp-preview-section h3{margin-bottom:var(--sp-4);color:var(--text-strong)}
.qrp-info{margin-bottom:var(--sp-3);padding:var(--sp-2) var(--sp-3);background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:var(--r-sm);font-size:var(--fs-sm);color:var(--accent-text)}
.qrp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--sp-5);max-height:600px;overflow-y:auto;padding:var(--sp-1)}
.qrp-preview-item{text-align:center;padding:var(--sp-3);border:1px solid var(--border-soft);border-radius:var(--r);background:var(--bg-panel);box-shadow:var(--shadow-sm);cursor:zoom-in;transition:all var(--t)}
.qrp-preview-item:hover{box-shadow:var(--shadow);transform:translateY(-2px)}
.qrp-preview-item img{width:100%;height:auto;border-radius:var(--r-sm);display:block}

/* 页眉 / LOGO */
.header-options{margin:var(--sp-4) 0;padding:var(--sp-3) var(--sp-4);background:var(--bg-sub);border-radius:var(--r);border-left:4px solid var(--accent)}
.header-options .checkbox-group{margin:0}
.header-upload-section{display:flex;flex-wrap:wrap;gap:var(--sp-6);margin-bottom:var(--sp-5);align-items:flex-start}
.upload-controls{flex:1;min-width:250px}
.file-input-wrapper{position:relative;overflow:hidden;display:inline-block;width:100%}
.file-input-wrapper input[type=file]{position:absolute;left:0;top:0;opacity:0;width:100%;height:100%;cursor:pointer}
.file-input-button{display:block;padding:var(--sp-4);background:var(--bg-sub);border:2px dashed var(--accent);border-radius:var(--r);text-align:center;color:var(--accent-text);cursor:pointer;transition:all var(--t);font-weight:600}
.file-input-button:hover{background:var(--accent-soft);border-color:var(--accent-hover)}
.file-name{margin-top:var(--sp-2);font-size:var(--fs-sm);color:var(--text-muted);text-align:center;padding:var(--sp-2);background:var(--bg-sub);border-radius:var(--r-sm)}
.preview-container{flex:1;min-width:250px;border:2px dashed var(--border);border-radius:var(--r);padding:var(--sp-4);background:var(--bg-sub);text-align:center}
.preview-container h4{margin-bottom:var(--sp-3);color:var(--text-strong);font-size:var(--fs-md)}
.preview-image{max-width:100%;max-height:120px;margin:var(--sp-3) auto;display:block;border-radius:var(--r-sm);box-shadow:var(--shadow-sm)}
.preview-placeholder{color:var(--text-muted);font-style:italic;padding:var(--sp-5);font-size:var(--fs)}
.qr-mt-10{margin-top:var(--sp-3)}`
};

window.QRPrintModule = QRPrintModule;