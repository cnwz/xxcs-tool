/**
 * @description 地堆二维码生成模块
 * @author me@cnwz.me
 * @since 2026-09-11
 * @lastupdate 2026-09-16
 * @version 1.0.0
 * @wiki https://gitee.com/{repo}/wikis/模块示例/地堆二维码生成
 * @rules ./rules/QRCodeModule.md
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class QRCodeModule {
    constructor(app) {
        this.app = app;
        this.title = QC_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-16';
        this.iconName = 'qr-code-scan';
        this.introText = QC_TEXT.introText;
        this.helpDescription = QC_TEXT.helpDescription;

        this.currentHeader = null;
        this.chineseFontLoaded = false;
        this.fontLoading = false;
        this.systemFonts = [
            { name: 'Microsoft YaHei', family: 'Microsoft YaHei', style: 'normal' },
            { name: 'SimHei', family: 'SimHei', style: 'normal' },
            { name: 'SimSun', family: 'SimSun', style: 'normal' },
            { name: 'NSimSun', family: 'NSimSun', style: 'normal' },
            { name: 'FangSong', family: 'FangSong', style: 'normal' },
            { name: 'KaiTi', family: 'KaiTi', style: 'normal' },
            { name: 'LiSu', family: 'LiSu', style: 'normal' },
            { name: 'YouYuan', family: 'YouYuan', style: 'normal' },
            { name: 'PingFang SC', family: 'PingFang SC', style: 'normal' },
            { name: 'Hiragino Sans GB', family: 'Hiragino Sans GB', style: 'normal' },
            { name: 'STHeiti', family: 'STHeiti', style: 'normal' },
            { name: 'STXihei', family: 'STXihei', style: 'normal' },
            { name: 'STKaiti', family: 'STKaiti', style: 'normal' },
            { name: 'WenQuanYi Micro Hei', family: 'WenQuanYi Micro Hei', style: 'normal' },
            { name: 'WenQuanYi Zen Hei', family: 'WenQuanYi Zen Hei', style: 'normal' },
            { name: 'AR PL UMing CN', family: 'AR PL UMing CN', style: 'normal' },
            { name: 'Arial Unicode MS', family: 'Arial Unicode MS', style: 'normal' },
            { name: 'sans-serif', family: 'sans-serif', style: 'normal' }
        ];
        this.currentFont = null;
        this.qrItems = [];
        this.qrImageSrcs = [];
        this._fontTimer = null;

        // 发布前回填：原 base64 docx 模板
        this.templateDocxBase64 = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,__TEMPLATE_BASE64__";

        this._iconCache = {
            docx: this.app.getIcon('filetype-docx'),
            qr: this.app.getIcon('qr-code'),
            png: this.app.getIcon('filetype-png'),
            pdf: this.app.getIcon('filetype-pdf'),
            refresh: this.app.getIcon('arrow-repeat'),
        };
    }

    injectStyles() {
        this.app.injectStyle(this.id, QC_TEXT.styles);
    }

    // ==================== 字体检测 ====================
    getOperatingSystem() {
        let ua = window.navigator.userAgent;
        if (ua.indexOf('Windows') !== -1) return 'Windows';
        else if (ua.indexOf('Mac') !== -1) return 'macOS';
        else if (ua.indexOf('Linux') !== -1) return 'Linux';
        else if (ua.indexOf('Android') !== -1) return 'Android';
        else if (ua.indexOf('iOS') !== -1) return 'iOS';
        return 'Unknown';
    }

    detectOperatingSystem() {
        let os = this.getOperatingSystem();
        this.app._log(`检测到操作系统: ${os}`);
        let osFonts = {
            'Windows': ['Microsoft YaHei', 'SimHei', 'NSimSun', 'FangSong', 'KaiTi'],
            'macOS': ['PingFang SC', 'Hiragino Sans GB', 'STHeiti', 'Arial Unicode MS'],
            'Linux': ['WenQuanYi Micro Hei', 'WenQuanYi Zen Hei', 'AR PL UMing CN', 'sans-serif'],
            'Android': ['sans-serif', 'Droid Sans Fallback'],
            'iOS': ['PingFang SC', 'Heiti SC', 'Arial Unicode MS']
        };
        if (osFonts[os]) {
            let osPreferred = osFonts[os];
            let otherFonts = this.systemFonts.filter(f => !osPreferred.includes(f.name));
            let preferred = osPreferred.map(name => this.systemFonts.find(f => f.name === name)).filter(f => f);
            this.systemFonts = [...preferred, ...otherFonts];
        }
    }

    detectSystemFonts() {
        this.app._log('检测系统可用字体...');
        this.currentFont = { name: 'sans-serif', family: 'sans-serif', style: 'normal' };
        if (typeof window.document.fonts !== 'undefined') {
            let testText = '字体测试';
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            let defaultWidth = ctx.measureText(testText).width;
            for (let font of this.systemFonts) {
                try {
                    ctx.font = `12px "${font.family}"`;
                    let width = ctx.measureText(testText).width;
                    if (Math.abs(width - defaultWidth) > 1) {
                        this.currentFont = font;
                        this.app._log(`检测到可用字体: ${font.name} (${font.family})`);
                        this.chineseFontLoaded = true;
                        break;
                    }
                } catch (e) { }
            }
        }
        this.detectOperatingSystem();
        if (!this.chineseFontLoaded) {
            let os = this.getOperatingSystem();
            if (os === 'Windows') {
                this.currentFont = { name: 'Microsoft YaHei', family: 'Microsoft YaHei', style: 'normal' };
            } else if (os === 'macOS') {
                this.currentFont = { name: 'PingFang SC', family: 'PingFang SC', style: 'normal' };
            } else if (os === 'Linux') {
                this.currentFont = { name: 'WenQuanYi Micro Hei', family: 'WenQuanYi Micro Hei', style: 'normal' };
            }
            this.app._log(`根据操作系统${os}选择字体: ${this.currentFont.name}`);
        }
    }

    containsChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    generateFileName() {
        let now = new Date();
        let year = now.getFullYear().toString().slice(2);
        let month = (now.getMonth() + 1).toString().padStart(2, '0');
        let day = now.getDate().toString().padStart(2, '0');
        let hour = now.getHours().toString().padStart(2, '0');
        let minute = now.getMinutes().toString().padStart(2, '0');
        return `二维码${year}${month}${day}${hour}${minute}`;
    }

    getCurrentHeader() {
        if (this.currentHeader) return this.currentHeader;
        let useDefault = document.getElementById('qcUseDefaultHeader');
        if (useDefault && useDefault.checked) return this.app.logoImage;
        return null;
    }

    wrapText(ctx, text, maxWidth, fontSize) {
        let words = text.split('');
        let lines = [];
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            let word = words[i];
            let testLine = currentLine + word;
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine !== '') lines.push(currentLine);
        return lines;
    }

    async getImageDimensions(arrayBuffer) {
        const bitmap = await createImageBitmap(new Blob([arrayBuffer]));
        const dims = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return dims;
    }

    getLines() {
        let text = document.getElementById('qcInput').value.trim();
        if (!text) return [];
        return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    }

    filterItems(lines) {
        let onlyDD = document.getElementById('qcFilterDD').checked;
        let valid = [];
        lines.forEach(line => {
            let parts = line.split(';');
            let code = parts[0].trim();
            let display = parts.length > 1 ? parts[1].trim() : code;
            if (/^\d{5}$/.test(code)) {
                valid.push({ code, display });
                return;
            }
            let codeParts = code.split('-');
            if (codeParts.length !== 5) return;
            let [zone, area, shelf, layer, position] = codeParts;
            if (!/^\d{2}$/.test(area) || !/^\d{2}$/.test(shelf) || !/^\d{2}$/.test(position)) return;
            if (layer !== 'DD' && !/^\d+$/.test(layer)) return;
            if (onlyDD && layer !== 'DD') return;
            valid.push({ code, display });
        });
        return valid;
    }

    // ==================== 模板下载 ====================
    async downloadTemplate() {
        if (!this.templateDocxBase64 || this.templateDocxBase64.includes('__TEMPLATE_BASE64__')) {
            this.app.showMessage(QC_TEXT.msg_templateMissing, 'error');
            return;
        }
        try {
            let base64Data = this.templateDocxBase64;
            if (base64Data.startsWith('data:')) base64Data = base64Data.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            this.app.download(byteArray, QC_TEXT.templateFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            this.app.showMessage(QC_TEXT.msg_templateDownloaded, 'success');
        } catch (e) {
            console.error('下载模板文件失败', e);
            this.app.showMessage(QC_TEXT.msg_templateDownloadFailed, 'error');
        }
    }

    // ==================== 页眉上传 ====================
    handleHeaderUpload(event) {
        let file = event.target.files[0];
        if (!file) return;
        document.getElementById('qcFileName').textContent = file.name;
        if (!this.app.validateFile(file, { accept: 'image/*', maxSize: 5 * 1024 * 1024 })) {
            if (file.size > 5 * 1024 * 1024) {
                this.app.showMessage(QC_TEXT.msg_imageTooLarge, 'error');
            } else {
                this.app.showMessage(QC_TEXT.msg_imageOnly, 'error');
            }
            event.target.value = '';
            return;
        }
        let reader = new FileReader();
        reader.onload = (e) => {
            this.currentHeader = e.target.result;
            let useDefault = document.getElementById('qcUseDefaultHeader');
            useDefault.disabled = true;
            useDefault.checked = false;
            this.updateHeaderPreview();
            this.app.showMessage(QC_TEXT.msg_headerUploaded, 'success');
        };
        reader.onerror = (error) => {
            console.error('文件读取错误:', error);
            this.app.showMessage(QC_TEXT.msg_readFailed, 'error');
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }

    resetHeader() {
        this.currentHeader = null;
        document.getElementById('qcHeaderImageUpload').value = '';
        document.getElementById('qcFileName').textContent = QC_TEXT.fileNameDefault;
        let useDefault = document.getElementById('qcUseDefaultHeader');
        useDefault.disabled = false;
        useDefault.checked = true;
        this.updateHeaderPreview();
        this.app.showMessage(QC_TEXT.msg_headerReset, 'success');
    }

    updateHeaderPreview() {
        let preview = document.getElementById('qcHeaderPreview');
        if (!preview) return;
        preview.innerHTML = '';
        let header = this.getCurrentHeader();
        if (header) {
            let img = document.createElement('img');
            img.src = header;
            img.className = 'preview-image';
            img.alt = QC_TEXT.headerPreview;
            img.onerror = () => {
                let placeholder = document.createElement('div');
                placeholder.className = 'preview-placeholder';
                placeholder.textContent = QC_TEXT.msg_imageLoadFallback;
                preview.appendChild(placeholder);
            };
            preview.appendChild(img);
        } else {
            let placeholder = document.createElement('div');
            placeholder.className = 'preview-placeholder';
            placeholder.textContent = QC_TEXT.headerEmpty;
            preview.appendChild(placeholder);
        }
    }

    // ==================== 生成二维码 ====================
    async generateQRCodes() {
        const ok = await this.app.loadLibrary('qrcode');
        if (!ok) {
            this.app.showMessage(QC_TEXT.msg_libNotReady, 'error');
            return;
        }
        let lines = this.getLines();
        this.qrItems = this.filterItems(lines);
        let hasChinese = this.qrItems.some(item => {
            let text = item.display || item.code;
            return this.containsChinese(text);
        });
        if (hasChinese) {
            if (!this.chineseFontLoaded) {
                this.app.showMessage(QC_TEXT.msg_hasChineseSystem, 'info');
            } else {
                this.app.showMessage(QC_TEXT.msg_hasChineseWithFont.replace('{font}', this.currentFont.name), 'info');
            }
        }
        document.getElementById('qcResult').textContent = QC_TEXT.resultCount.replace('{n}', this.qrItems.length);
        await this.renderQRCodes(this.qrItems);
        document.querySelector('.result-section').classList.add('active');
    }

    async renderQRCodes(items) {
        let container = document.getElementById('qcContainer');
        container.innerHTML = '';
        this.qrImageSrcs = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || !item.code || typeof item.code !== 'string' || item.code.length === 0) {
                console.warn('跳过无效的二维码数据:', item);
                continue;
            }
            try {
                const canvas = await this.createImageCanvas(item);
                const dataUrl = canvas.toDataURL('image/png');
                this.qrImageSrcs.push(dataUrl);
                const img = document.createElement('img');
                img.src = dataUrl;
                img.alt = item.display || item.code;
                img.dataset.index = i;
                const qrItem = document.createElement('div');
                qrItem.className = 'qrcode-item';
                qrItem.appendChild(img);
                container.appendChild(qrItem);
            } catch (error) {
                console.error('生成二维码预览失败:', item, error);
            }
        }
    }

    async saveImages() {
        if (!this.qrItems || this.qrItems.length === 0) {
            this.app.showMessage(QC_TEXT.msg_generateFirst, 'error');
            return;
        }
        let hasChinese = this.qrItems.some(item => {
            let text = item.display || item.code;
            return this.containsChinese(text);
        });
        if (hasChinese) this.app.showMessage(QC_TEXT.msg_generatingWithSystemFont, 'info');
        else this.app.showMessage(QC_TEXT.msg_generating, 'info');
        try {
            if (this.qrItems.length === 1) {
                await this.generateSingleImage(this.qrItems[0]);
                return;
            }
            this.app.showMessage(QC_TEXT.msg_generatingMultiple, 'info');
            await this.generateMultipleImages(this.qrItems);
        } catch (error) {
            console.error('保存图片失败:', error);
            this.app.showMessage(QC_TEXT.msg_generateFailed + error.message, 'error');
        }
    }

    async generateSingleImage(item) {
        try {
            let canvas = await this.createImageCanvas(item);
            let blob = await new Promise((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error(QC_TEXT.err_canvasToBlobFailed));
                }, 'image/png');
            });
            this.app.download(blob, `二维码_${item.display || item.code}.png`, 'image/png');
            let message = QC_TEXT.msg_imageSaved;
            if (this.containsChinese(item.display || item.code)) {
                message = QC_TEXT.msg_imageSavedWithFont.replace('{font}', this.currentFont ? this.currentFont.name : '系统');
            }
            this.app.showMessage(message, 'success');
        } catch (error) {
            console.error('生成单张图片失败:', error);
            this.app.showMessage(QC_TEXT.msg_generateFailed + error.message, 'error');
            throw error;
        }
    }

    async generateMultipleImages(items) {
        const ok = await this.app.loadLibrary('jszip');
        if (!ok) {
            this.app.showMessage(QC_TEXT.msg_libNotReady, 'error');
            return;
        }
        try {
            let zip = new JSZip();
            let promises = items.map(async (item, index) => {
                try {
                    let canvas = await this.createImageCanvas(item);
                    let blob = await new Promise((resolve, reject) => {
                        canvas.toBlob((b) => {
                            if (b) resolve(b);
                            else reject(new Error(QC_TEXT.err_canvasToBlobFailed));
                        }, 'image/png');
                    });
                    let fileName = `二维码_${item.display || item.code}_${index + 1}.png`;
                    zip.file(fileName, blob);
                    return true;
                } catch (error) {
                    console.error(`生成第${index + 1}张图片失败:`, error);
                    return false;
                }
            });
            let results = await Promise.allSettled(promises);
            let successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
            if (successCount === 0) throw new Error(QC_TEXT.err_allImagesFailed);
            let content = await zip.generateAsync({ type: 'blob' });
            this.app.download(content, `二维码_${this.generateFileName()}.zip`, 'application/zip');
            let message;
            if (items.some(item => this.containsChinese(item.display || item.code))) {
                message = QC_TEXT.msg_multiSavedWithFont.replace('{n}', successCount).replace('{font}', this.currentFont ? this.currentFont.name : '系统');
            } else {
                message = QC_TEXT.msg_multiSaved.replace('{n}', successCount);
            }
            this.app.showMessage(message, 'success');
        } catch (error) {
            console.error('生成多张图片失败:', error);
            this.app.showMessage(QC_TEXT.msg_generateFailed + error.message, 'error');
            throw error;
        }
    }

    async createImageCanvas(item) {
        return new Promise((resolve, reject) => {
            try {
                const canvasWidth = 595, canvasHeight = 842;
                let canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                let ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                let images = [];
                let headerSrc = this.getCurrentHeader();
                let headerLoaded = false, headerImg = null;
                if (headerSrc) {
                    headerImg = new Image();
                    headerImg.crossOrigin = 'anonymous';
                    headerImg.onload = () => {
                        let originalWidth = headerImg.naturalWidth;
                        let originalHeight = headerImg.naturalHeight;
                        let maxWidth = canvasWidth * 0.5;
                        let calculatedHeight = (maxWidth / originalWidth) * originalHeight;
                        let targetHeight = Math.min(calculatedHeight, 60);
                        let targetWidth = (targetHeight / originalHeight) * originalWidth;
                        let headerX = 10, headerY = 20;
                        ctx.save();
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(headerImg, headerX, headerY, targetWidth, targetHeight);
                        ctx.restore();
                        headerLoaded = true;
                        checkAll();
                    };
                    headerImg.onerror = () => {
                        console.warn('页眉图片加载失败，继续生成二维码');
                        headerLoaded = true;
                        checkAll();
                    };
                    headerImg.src = headerSrc;
                    images.push(headerImg);
                } else {
                    headerLoaded = true;
                }
                let qr = qrcode(0, 'M');
                qr.addData(item.code);
                qr.make();
                let qrData = qr.createDataURL(10, 0);
                let qrImg = new Image();
                let qrLoaded = false;
                qrImg.onload = () => {
                    let qrSize = 450;
                    let qrX = (canvasWidth - qrSize) / 2;
                    let headerHeight = headerImg ? Math.min((canvasWidth * 0.9 / headerImg.naturalWidth) * headerImg.naturalHeight, 60) : 0;
                    let qrY = headerImg ? 50 + headerHeight + 50 : 150;
                    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                    qrLoaded = true;
                    checkAll();
                };
                qrImg.onerror = (e) => {
                    console.error('二维码图片加载失败，src:', qrData, e);
                    reject(new Error(QC_TEXT.err_qrGenerateFailed));
                };
                qrImg.src = qrData;
                images.push(qrImg);
                let checkAll = () => {
                    if (headerLoaded && qrLoaded) drawText();
                };
                let drawText = () => {
                    try {
                        let text = item.display || item.code;
                        let maxWidth = canvasWidth - 80;
                        let minFontSize = 20;
                        let maxFontSize = 72;
                        let fontSize = maxFontSize;
                        let fontFamily = this.currentFont ? this.currentFont.family : 'sans-serif';
                        let singleLineFits = false;
                        while (fontSize >= minFontSize) {
                            ctx.font = `${fontSize}px ${fontFamily}`;
                            let metrics = ctx.measureText(text);
                            if (metrics.width <= maxWidth) {
                                singleLineFits = true;
                                break;
                            }
                            fontSize -= 2;
                        }
                        ctx.fillStyle = '#000000';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        let qrSize = 450;
                        let headerHeight = headerImg ? Math.min((canvasWidth * 0.9 / headerImg.naturalWidth) * headerImg.naturalHeight, 60) : 0;
                        let qrY = headerImg ? 50 + headerHeight + 50 : 150;
                        let textY = qrY + qrSize + 150;
                        if (singleLineFits) {
                            ctx.font = `${fontSize}px ${fontFamily}`;
                            ctx.fillText(text, canvasWidth / 2, textY);
                        } else {
                            fontSize = minFontSize;
                            ctx.font = `${fontSize}px ${fontFamily}`;
                            let lines = this.wrapText(ctx, text, maxWidth, fontSize);
                            let lineHeight = fontSize * 1.2;
                            let currentY = textY - (lineHeight * (lines.length - 1) / 2);
                            lines.forEach((line, idx) => {
                                ctx.fillText(line, canvasWidth / 2, currentY + (idx * lineHeight));
                            });
                        }
                        resolve(canvas);
                    } catch (error) {
                        console.error('绘制文字失败:', error);
                        reject(new Error(QC_TEXT.err_drawTextFailed));
                    }
                };
                if (!headerSrc) headerLoaded = true;
            } catch (error) {
                console.error('创建图片画布失败:', error);
                reject(new Error(QC_TEXT.err_canvasFailed));
            }
        });
    }

    // ==================== 导出 ====================
    async exportPdf() {
        if (!this.qrItems || this.qrItems.length === 0) {
            this.app.showMessage(QC_TEXT.msg_generateFirst, 'error');
            return;
        }
        const ok = await this.app.loadLibrary('jspdf');
        if (!ok) {
            this.app.showMessage(QC_TEXT.msg_libNotReady, 'error');
            return;
        }
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [595, 842] });
            for (let i = 0; i < this.qrImageSrcs.length; i++) {
                if (i > 0) pdf.addPage();
                const imgData = this.qrImageSrcs[i];
                pdf.addImage(imgData, 'PNG', 0, 0, 595, 842);
            }
            pdf.save(`二维码_${this.generateFileName()}.pdf`);
            this.app.showMessage(QC_TEXT.msg_pdfOk, 'success');
        } catch (error) {
            console.error('导出 PDF 失败:', error);
            this.app.showMessage(QC_TEXT.msg_pdfFailed + error.message, 'error');
        }
    }

    async exportDocx() {
        if (!this.qrItems || this.qrItems.length === 0) {
            this.app.showMessage(QC_TEXT.msg_generateFirst, 'error');
            return;
        }
        const ok = await this.app.loadLibrary('docx');
        if (!ok) {
            this.app.showMessage(QC_TEXT.msg_docxLibNotReady, 'error');
            return;
        }
        try {
            const { Document, Packer, Paragraph, ImageRun, Header, AlignmentType, TextRun } = window.docx;

            const headerSrc = this.getCurrentHeader();
            let headerArrayBuffer = null;
            let headerNaturalDimensions = null;
            if (headerSrc) {
                const headerResponse = await fetch(headerSrc);
                const headerBlob = await headerResponse.blob();
                headerArrayBuffer = await headerBlob.arrayBuffer();
                headerNaturalDimensions = await this.getImageDimensions(headerArrayBuffer);
            }

            const sections = [];

            for (let i = 0; i < this.qrItems.length; i++) {
                const item = this.qrItems[i];

                const qr = qrcode(0, 'M');
                qr.addData(item.code);
                qr.make();
                const qrDataUrl = qr.createDataURL(20, 0);
                const qrResponse = await fetch(qrDataUrl);
                const qrBlob = await qrResponse.blob();
                const qrArrayBuffer = await qrBlob.arrayBuffer();

                const qrImgWidth = 605;
                const qrImgHeight = 605;

                const qrParagraph = new Paragraph({
                    children: [
                        new ImageRun({
                            data: qrArrayBuffer,
                            transformation: { width: qrImgWidth, height: qrImgHeight }
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 0, before: 0 }
                });

                const emptyParagraph = new Paragraph({
                    children: [
                        new TextRun({
                            text: '',
                            size: 120,
                            font: 'Calibri'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        line: 1200,
                        lineRule: 'exact',
                        before: 0,
                        after: 0
                    }
                });

                const displayText = item.display || item.code;
                const textParagraph = new Paragraph({
                    children: [
                        new TextRun({
                            text: displayText,
                            size: 120,
                            font: 'Calibri'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        line: 1200,
                        lineRule: 'exact',
                        before: 0,
                        after: 0
                    }
                });

                const cmToTwips = (cm) => Math.round((cm / 2.54) * 1440);

                const sectionProps = {
                    page: {
                        margin: {
                            top: cmToTwips(5),
                            bottom: cmToTwips(1.27),
                            left: cmToTwips(1.27),
                            right: cmToTwips(1.27),
                            header: cmToTwips(1)
                        }
                    }
                };

                let headers = undefined;
                if (headerArrayBuffer && headerNaturalDimensions) {
                    const targetHeightPx = 105;
                    const scale = targetHeightPx / headerNaturalDimensions.height;
                    const targetWidthPx = Math.round(headerNaturalDimensions.width * scale);

                    const header = new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: headerArrayBuffer,
                                        transformation: { width: targetWidthPx, height: targetHeightPx }
                                    })
                                ],
                                alignment: AlignmentType.START,
                                spacing: { before: 0, after: 0 },
                                indent: { left: 0, right: 0 }
                            })
                        ]
                    });
                    headers = { default: header };
                }

                sections.push({
                    properties: sectionProps,
                    headers: headers,
                    children: [qrParagraph, emptyParagraph, textParagraph]
                });
            }

            const doc = new Document({ sections });
            const blob = await Packer.toBlob(doc);
            this.app.download(blob, `二维码_${this.generateFileName()}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            this.app.showMessage(QC_TEXT.msg_docxOk, 'success');
        } catch (error) {
            console.error('导出 DOCX 失败:', error);
            this.app.showMessage(QC_TEXT.msg_docxFailed + error.message, 'error');
        }
    }

    // ==================== 查看器 ====================
    showEnlarged(index) {
        if (!this.qrImageSrcs || this.qrImageSrcs.length === 0) return;
        const total = this.qrImageSrcs.length;
        index = Math.max(0, Math.min(index, total - 1));
        const currentSrc = this.qrImageSrcs[index];
        const content = `<div style="text-align: center;"><img id="enlargedImage" src="${currentSrc}" alt="${QC_TEXT.alt_qr}" style="max-width:100%; max-height:70vh; display: inline-block;"></div>`;
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '10px';
        controls.style.alignItems = 'center';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary';
        prevBtn.textContent = QC_TEXT.btn_prev;
        prevBtn.disabled = index === 0;
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary';
        nextBtn.textContent = QC_TEXT.btn_next;
        nextBtn.disabled = index === total - 1;
        const pageSpan = document.createElement('span');
        pageSpan.textContent = `${index + 1} / ${total}`;
        const printBtn = document.createElement('button');
        printBtn.className = 'btn btn-secondary';
        printBtn.textContent = QC_TEXT.btn_print;
        printBtn.onclick = () => this.printSingle(currentSrc);
        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        controls.appendChild(pageSpan);
        controls.appendChild(printBtn);
        const updateEnlarged = (newIndex) => {
            if (newIndex < 0 || newIndex >= total) return;
            const img = document.getElementById('enlargedImage');
            if (img) img.src = this.qrImageSrcs[newIndex];
            pageSpan.textContent = `${newIndex + 1} / ${total}`;
            prevBtn.disabled = newIndex === 0;
            nextBtn.disabled = newIndex === total - 1;
            printBtn.onclick = () => this.printSingle(this.qrImageSrcs[newIndex]);
        };
        prevBtn.onclick = () => {
            const currentImg = document.getElementById('enlargedImage');
            const currentSrc2 = currentImg ? currentImg.src : '';
            const currentIndex = this.qrImageSrcs.findIndex(s => s === currentSrc2);
            if (currentIndex > 0) updateEnlarged(currentIndex - 1);
        };
        nextBtn.onclick = () => {
            const currentImg = document.getElementById('enlargedImage');
            const currentSrc2 = currentImg ? currentImg.src : '';
            const currentIndex = this.qrImageSrcs.findIndex(s => s === currentSrc2);
            if (currentIndex < total - 1) updateEnlarged(currentIndex + 1);
        };
        this.app.showModal(QC_TEXT.modal_enlarge, content, controls);
    }

    printSingle(src) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`<html><head><style>@page{size:A4;margin:0;}body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background:white;}img{max-width:100%;max-height:100%;object-fit:contain;display:block;}</style></head><body><img src="${src}" /></body></html>`);
        iframeDoc.close();
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }

    // ==================== 事件绑定 ====================
    bindEvents(panel) {
        panel.querySelector('#qcGenQrBtn')?.addEventListener('click', () => this.generateQRCodes());
        panel.querySelector('#qcSaveImgBtn')?.addEventListener('click', () => this.saveImages());
        panel.querySelector('#qcExportPdfBtn')?.addEventListener('click', () => this.exportPdf());
        panel.querySelector('#qcExportDocxBtn')?.addEventListener('click', () => this.exportDocx());
        panel.querySelector('#qcDownloadTemplateBtn')?.addEventListener('click', () => this.downloadTemplate());
        panel.querySelector('#qcHeaderImageUpload')?.addEventListener('change', (event) => this.handleHeaderUpload(event));
        panel.querySelector('#qcResetHeaderBtn')?.addEventListener('click', () => this.resetHeader());
        panel.querySelector('#qcUseDefaultHeader')?.addEventListener('change', () => this.updateHeaderPreview());
        panel.querySelector('#qcContainer')?.addEventListener('click', (e) => {
            const img = e.target.closest('.qrcode-item img');
            if (img) {
                const index = parseInt(img.dataset.index, 10);
                if (!isNaN(index)) {
                    this.showEnlarged(index);
                }
            }
        });
        this._fontTimer = setTimeout(() => this.detectSystemFonts(), 1000);
    }

    destroy() {
        if (this._fontTimer) {
            clearTimeout(this._fontTimer);
            this._fontTimer = null;
        }
    }

    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header">
                    <h2>${QC_TEXT.heading}</h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-secondary" id="qcDownloadTemplateBtn">${this._iconCache.docx} ${QC_TEXT.btn_template}</button>
                        ${this.app.getHelpButton(this.id)}
                    </div>
                </div>
                <div class="panel-box">
                    <div class="checkbox-group">
                        <input type="checkbox" id="qcUseDefaultHeader" checked>
                        <label for="qcUseDefaultHeader">${QC_TEXT.label_useDefaultHeader}</label>
                    </div>
                    <p class="note">${QC_TEXT.note_headerHint}</p>
                </div>
                <div class="header-upload-section">
                    <div class="upload-controls">
                        <label for="qcHeaderImageUpload">${QC_TEXT.label_uploadHeader}</label>
                        <div class="file-input-wrapper">
                            <input type="file" id="qcHeaderImageUpload" accept="image/*">
                            <div class="file-input-button">${QC_TEXT.fileBtn_pick}</div>
                        </div>
                        <div class="file-name" id="qcFileName">${QC_TEXT.fileNameDefault}</div>
                        <div class="qr-mt-10">
                            <button type="button" id="qcResetHeaderBtn" class="btn btn-secondary">${this._iconCache.refresh} ${QC_TEXT.btn_resetHeader}</button>
                        </div>
                    </div>
                    <div class="preview-container">
                        <h4>${QC_TEXT.headerPreview}</h4>
                        <div id="qcHeaderPreview"><div class="preview-placeholder">${QC_TEXT.headerEmpty}</div></div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="qcInput">${QC_TEXT.label_input}</label>
                    <textarea id="qcInput" placeholder="${QC_TEXT.ph_input}"></textarea>
                    <p class="note">${QC_TEXT.note_inputHint}</p>
                </div>
                <div class="actions">
                    <div class="checkbox-group">
                        <input type="checkbox" id="qcFilterDD">
                        <label for="qcFilterDD">${QC_TEXT.label_onlyDD}</label>
                    </div>
                    <div class="btn-row">
                        <button type="button" id="qcGenQrBtn" class="btn">${this._iconCache.qr} ${QC_TEXT.btn_generate}</button>
                        <button type="button" id="qcSaveImgBtn" class="btn">${this._iconCache.png} ${QC_TEXT.btn_saveImg}</button>
                        <button type="button" id="qcExportPdfBtn" class="btn">${this._iconCache.pdf} ${QC_TEXT.btn_exportPdf}</button>
                        <button type="button" id="qcExportDocxBtn" class="btn">${this._iconCache.docx} ${QC_TEXT.btn_exportDocx}</button>
                    </div>
                </div>
                <div class="result-section">
                    <h3>${QC_TEXT.heading_result}</h3>
                    <div class="result-content">
                        <div id="qcResult">${QC_TEXT.resultWaiting}</div>
                        <div class="qrcode-container" id="qcContainer"></div>
                    </div>
                </div>
            </div>
        `;
        this.bindEvents(panel);
        this.updateHeaderPreview();
        this.app._log(this.title + '加载成功');
    }
}

const QC_TEXT = {
    title: '地堆二维码生成',
    introText: '生成地堆库位二维码，支持自定义 LOGO 和文字。',
    helpDescription: '<p>页眉设置：可勾选默认 LOGO，或上传自定义图片（优先使用），或留空空白页眉。</p><p>输入库位列表：每行一个，支持库位号（XX-XX-XX-XX-XX）或5位纯数字。可用分号分隔显示文字（分号后为二维码下方显示的文字）。</p><p>勾选"只保留地堆"可筛选第四段为 DD 的库位。点击"生成二维码"预览，每个二维码包含页眉、二维码码图和下方文字。点击任一二维码可放大查看、翻页、打印。</p><p>保存为图片：单个二维码直接下载 PNG，多个自动打包 ZIP。建议单次不超过10个。</p><p>新增PDF/DOCX导出功能，可将所有二维码合并为一个文档。</p>',

    heading: '地堆二维码生成',
    btn_template: '模板文件',
    label_useDefaultHeader: '默认页眉',
    note_headerHint: '如果使用下方上传的图片，将优先使用上传的图片，此项将被禁用。',
    label_uploadHeader: '上传页眉图片',
    fileBtn_pick: '选择图片文件',
    fileNameDefault: '未选择文件，将使用默认页眉',
    btn_resetHeader: '重置为默认页眉',
    headerPreview: '页眉预览',
    headerEmpty: '空白页眉',
    label_input: '输入库位列表（支持5位纯数字或库位号，使用分号分隔文字）',
    ph_input: '请输入文本，每行一条内容\n例如：\nCW-12-34-DD-56;库位名称\nLC-23-45-67-89\nZW-34-56-DD-78\n12345;自定义文字\n67890',
    note_inputHint: '格式：每行为一个二维码，支持库位号或5位纯数字。使用分号";"分隔，分号后为二维码下方文字（可选）',
    label_onlyDD: '只保留地堆（第四段为"DD"）',
    btn_generate: '生成二维码',
    btn_saveImg: '保存为图片',
    btn_exportPdf: '导出PDF',
    btn_exportDocx: '导出DOCX',
    heading_result: '生成结果',
    resultWaiting: '等待生成...',
    resultCount: '共生成 {n} 个二维码',

    alt_qr: '二维码',
    modal_enlarge: '二维码放大',
    btn_prev: '上一张',
    btn_next: '下一张',
    btn_print: '打印',
    templateFileName: '模板文件.docx',

    msg_imageOnly: '请上传图片文件 (JPEG, PNG, GIF等)',
    msg_imageTooLarge: '图片文件大小不能超过5MB',
    msg_headerUploaded: '页眉图片上传成功',
    msg_readFailed: '文件读取失败，请重试',
    msg_headerReset: '页眉已恢复为默认',
    msg_imageLoadFallback: '图片加载失败，使用空白页眉',
    msg_hasChineseSystem: '检测到中文内容，将尝试使用系统字体生成图片',
    msg_hasChineseWithFont: '检测到中文内容，将使用 {font} 字体生成图片',
    msg_generateFirst: '请先生成二维码预览',
    msg_generating: '正在生成图片...',
    msg_generatingWithSystemFont: '正在生成图片（使用系统字体）...',
    msg_generatingMultiple: '正在生成多张图片并打包...',
    msg_generateFailed: '生成图片失败: ',
    msg_imageSaved: '图片已保存',
    msg_imageSavedWithFont: '图片已保存 (使用{font}字体)',
    msg_multiSaved: '已生成 {n} 张图片并打包下载',
    msg_multiSavedWithFont: '已生成 {n} 张图片并打包下载 (使用{font}字体)',
    msg_pdfOk: 'PDF 导出成功',
    msg_pdfFailed: '导出 PDF 失败: ',
    msg_docxOk: 'DOCX 导出成功',
    msg_docxFailed: '导出 DOCX 失败: ',
    msg_templateMissing: '模板文件不存在，请先设置 templateDocxBase64',
    msg_templateDownloaded: '模板文件下载成功',
    msg_templateDownloadFailed: '下载失败：无效的 base64 数据',
    msg_libNotReady: '依赖库尚未加载完成，请检查网络后重试',
    msg_docxLibNotReady: 'docx 库未加载，请检查网络后重试',
    err_canvasToBlobFailed: 'Canvas转换为Blob失败',
    err_allImagesFailed: '所有图片生成失败',
    err_qrGenerateFailed: '二维码生成失败',
    err_canvasFailed: '创建图片失败',
    err_drawTextFailed: '绘制文字失败',

    styles: `.header-upload-section{display:flex;flex-wrap:wrap;gap:30px;margin-bottom:25px;align-items:flex-start}
.upload-controls{flex:1;min-width:250px}
.file-name{margin-top:10px;font-size:14px;color:#666;text-align:center;padding:8px;background:#f5f5f5;border-radius:4px}
.preview-container{flex:1;min-width:250px;border:2px dashed #e0e0e0;border-radius:8px;padding:20px;background:#fafafa;text-align:center}
.preview-container h4{margin-bottom:15px;color:#333;font-size:16px}
.preview-image{max-width:100%;max-height:120px;margin:15px auto;display:block;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.preview-placeholder{color:#999;font-style:italic;padding:30px;font-size:15px}
.qrcode-container{display:flex;flex-wrap:wrap;gap:25px;margin-top:25px;justify-content:center}
.qrcode-item{text-align:center;padding:20px;border:1px solid #eee;border-radius:10px;background:#fff;box-shadow:0 6px 16px rgba(0,0,0,0.06);transition:all .3s;width:200px}
.qrcode-item:hover{box-shadow:0 12px 24px rgba(0,0,0,0.1)}
.qrcode-item img{margin-bottom:15px;width:150px;border-radius:4px;cursor:pointer;transition:transform 0.2s}
.qrcode-item img:hover{transform:scale(1.02)}
.qrcode-item div{font-weight:600;margin-top:10px;word-break:break-all;font-size:15px;color:#333;line-height:1.4}
.result-section{display:none;animation:fadeIn .5s ease}
.result-section.active{display:block}
.qr-mt-10{margin-top:10px}
body.dark-mode .file-name{background:#2a2a36;color:#ccc}
body.dark-mode .preview-container{background:#fafafa;border-color:#e0e0e0}
body.dark-mode .preview-container h4{color:#333}
body.dark-mode .qrcode-item{background:#fff;border-color:#eee}
body.dark-mode .qrcode-item div{color:#333}`
};
window.QRCodeModule = QRCodeModule;