/**
 * @description 核心引擎：加载器 + 框架
 * @author ls_wuzhen20
 * @since 2026-06-30
 * @lastupdate 2026-09-16
 * @version 1.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/架构说明
 * @rules ./rules/Core.md
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */

/**
 * @description 全局样式常量
 * @security 纯样式，不涉及任何数据操作。
 */
const CORE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:linear-gradient(135deg,#f5f5f5 0%,#e6e6e6 100%);color:#333;line-height:1.6;padding:20px;min-height:100vh;font-family:"Microsoft YaHei","Segoe UI",Arial,sans-serif}
input,button,select,textarea,.btn,.tab,.tab-btn,.modal-content,th,td,label,.note,.notice,.message{font-family:inherit}
.container{max-width:1400px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);padding:30px;display:flex;flex-direction:column;gap:25px}
h1,h2,h3,h4{color:#333;margin-bottom:20px}
h1{border-bottom:3px solid #FFBD00;padding-bottom:15px;font-size:28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.title-group{display:inline-flex;align-items:baseline;flex-wrap:wrap;gap:6px}
.subtitle{font-size:0.65em;color:#666;font-weight:400}
.note,.notice{color:#666;margin-top:8px;font-size:14px;line-height:1.5}
.notice{background:#FFF8E1;padding:12px 16px;border-radius:6px;border-left:4px solid #FFBD00}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes modalSlideIn{from{opacity:0;transform:translate(-50%,-45%)}to{opacity:1;transform:translate(-50%,-50%)}}
.hidden{display:none!important}
.section{padding:25px;border:1px solid #eee;border-radius:12px;background-color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.04);margin-bottom:25px;transition:box-shadow .3s}
.section:hover{box-shadow:0 6px 18px rgba(0,0,0,0.06)}
.table-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding-bottom:15px;border-bottom:2px solid #f0f0f0;flex-wrap:wrap;gap:12px}
.table-title{display:flex;align-items:center;gap:15px;flex-wrap:wrap}
.tabs{display:flex;border-bottom:2px solid #e0e0e0;margin-bottom:25px;border-radius:8px 8px 0 0;padding:5px 5px 0 5px;flex-wrap:wrap;gap:5px}
.tab,.tab-btn{padding:14px 18px;cursor:pointer;border:1px solid transparent;border-bottom:0;border-radius:8px 8px 0 0;background-color:#f0f0f0;font-weight:600;color:#666;font-size:15px;transition:all .3s;display:inline-flex;align-items:center}
.tab:hover,.tab-btn:hover{background-color:#e8e8e8;color:#333}
.tab.active,.tab-btn.active{background-color:#fff;border-color:#eee;border-bottom:1px solid #fff;margin-bottom:-1px;font-weight:700;color:#FFBD00;box-shadow:0 -3px 10px rgba(255,189,0,0.1)}
.tab .icon-img{width:32px;height:32px;margin-right:8px}
.tab-icon{display:inline-flex;align-items:center;margin-right:6px}
.tab-title{white-space:nowrap}
.tab-close{margin-left:8px;cursor:pointer;font-weight:bold;font-size:18px;line-height:1;opacity:.6;transition:opacity .2s}
.tab-close:hover{opacity:1}
.tab-add{opacity:.7}
.tab.not-loaded{opacity:.85}
.tab-content,.tab-content-inner{display:none;animation:fadeIn .3s ease}
.tab-content.active,.tab-content-inner.active{display:block}
.module-list{display:flex;flex-direction:column;gap:10px}
.module-item{padding:12px;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;transition:background .2s;display:flex;align-items:center;gap:8px}
.module-item:hover{background:#fff8e1}
.btn{display:inline-block;color:#fff;border:0;padding:14px 18px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:700;width:auto;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.25);text-decoration:none;transition:all .3s;background:linear-gradient(135deg,#FFBD00 0%,#FFA000 100%)}
.btn:disabled{background:#ccc;cursor:not-allowed;box-shadow:none}
.btn:hover{background:linear-gradient(135deg,#FFA000 0%,#FF8F00 100%);box-shadow:0 8px 20px rgba(255,189,0,0.35)}
.btn:active{box-shadow:0 4px 12px rgba(255,189,0,0.25)}
.btn-secondary{background:linear-gradient(135deg,#9e9e9e 0%,#757575 100%);box-shadow:0 4px 12px rgba(158,158,158,0.2);color:#fff}
.btn-secondary:hover{background:linear-gradient(135deg,#757575 0%,#616161 100%);box-shadow:0 8px 20px rgba(158,158,158,0.3)}
.btn-success,.copy-btn{background:linear-gradient(135deg,#4caf50 0%,#388e3c 100%);box-shadow:0 4px 12px rgba(76,175,80,0.25);color:#fff}
.btn-success:hover,.copy-btn:hover{background:linear-gradient(135deg,#388e3c 0%,#2e7d32 100%);box-shadow:0 8px 20px rgba(76,175,80,0.35)}
.btn-warning,.help-btn{background:linear-gradient(135deg,#ff9800 0%,#f57c00 100%);box-shadow:0 4px 12px rgba(255,152,0,0.25);color:#fff}
.btn-warning:hover,.help-btn:hover{background:linear-gradient(135deg,#f57c00 0%,#ef6c00 100%);box-shadow:0 8px 20px rgba(255,152,0,0.35)}
.copy-btn,.help-btn{padding:10px 20px;font-size:14px}
input,select,button,textarea{width:100%;padding:14px 16px;border:2px solid #e0e0e0;border-radius:8px;font-size:16px;transition:all .3s;background:#fff;color:#333}
input:focus,select:focus,textarea:focus{outline:0;border-color:#FFBD00;box-shadow:0 0 0 3px rgba(255,189,0,0.1)}
input[readonly]{background-color:#fafafa;color:#666;cursor:not-allowed}
label{display:block;margin-bottom:8px;font-weight:600;color:#333;font-size:15px}
textarea{height:180px;resize:vertical;line-height:1.5}
.form-group{margin-bottom:20px}
.form-row{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
.form-row .form-group{flex:1;min-width:200px}
.validation-message{font-size:13px;margin-top:6px;display:block;padding-left:5px}
.validation-valid{color:#4caf50}
.validation-invalid{color:#f44336}
input.validation-invalid{border-color:#f44336;background-color:#fff5f5}
input.validation-valid{border-color:#4caf50;background-color:#f5fff5}
.checkbox-group{display:flex;align-items:center;margin:12px 0}
.checkbox-group input{width:20px;height:20px;margin-right:12px;accent-color:#FFBD00;flex-shrink:0}
.checkbox-group label{margin-bottom:0;cursor:pointer;font-weight:400}
.table-container{max-height:450px;overflow-y:auto;border:1px solid #eee;border-radius:8px;margin-bottom:25px;box-shadow:0 2px 8px rgba(0,0,0,0.02)}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{border:1px solid #f0f0f0;padding:12px 15px;text-align:left;white-space:nowrap}
th{background:linear-gradient(to bottom,#f8f8f8,#f0f0f0);color:#333;font-weight:700;font-size:14px;position:sticky;top:0;z-index:10;border-bottom:2px solid #e0e0e0}
td{color:#444;font-size:14px}
tr:nth-child(even){background-color:#fafafa}
tr:hover{background-color:#fff8e1}
#messageArea{position:fixed;top:25px;left:50%;transform:translateX(-50%);z-index:10000;width:auto;max-width:85%}
.message{padding:16px 24px;margin:12px 0;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,0.12);font-weight:700;text-align:center;min-width:320px;font-size:15px}
.success{background-color:#e8f5e9;color:#2e7d32;border-left:5px solid #4caf50}
.error{background-color:#ffebee;color:#c62828;border-left:5px solid #f44336}
.info{background-color:#e3f2fd;color:#1565c0;border-left:5px solid #2196f3}
.warning{background-color:#fff8e1;color:#ef6c00;border-left:5px solid #ff9800}
.modal{display:none;position:fixed;z-index:10000;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:fadeIn .3s ease}
.modal-content{background-color:#fff;padding:0;border-radius:16px;width:80vw;height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);border:1px solid #e0e0e0;animation:modalSlideIn .4s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:25px 30px;border-bottom:2px solid #f0f0f0;background:#fff;flex-shrink:0;border-radius:16px 16px 0 0}
.modal-header h2{margin:0;color:#333;font-size:24px;font-weight:700}
.close-btn{background:0 0;border:0;font-size:32px;cursor:pointer;color:#757575;padding:5px 10px;line-height:1;transition:all .3s;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;min-width:auto}
.close-btn:hover{color:#333;background:#f5f5f5}
.modal-body{padding:30px;overflow-y:auto;flex:1;min-height:0}
@media (max-width:1200px){.modal-content{width:90vw;height:85vh}}
@media (max-width:992px){.container{padding:20px}}
@media (max-width:768px){body{padding:15px}.container{padding:15px;border-radius:10px}h1{font-size:24px}.form-row{flex-direction:column;gap:15px}.btn{min-width:100%;width:100%;margin-right:0}.message{min-width:auto;padding:14px 18px;font-size:14px;width:95%}.modal-content{width:95%;height:90vh}.tabs{flex-direction:column;gap:5px}.tab,.tab-btn{border-radius:6px;width:100%;text-align:center;justify-content:center}.table-header{flex-direction:column;align-items:flex-start;gap:15px}.section{padding:20px}th,td{padding:10px 12px;font-size:13px}}
@media (max-width:480px){.container{padding:12px}h1{font-size:22px}h2{font-size:18px}h3{font-size:16px}.btn{padding:12px 20px;font-size:15px}.section{padding:15px}.modal-header{padding:20px;flex-direction:column;align-items:flex-start;gap:15px}.modal-header h2{font-size:20px}.modal-body{padding:20px}}
@media print{body{background:#fff;padding:0}.container{box-shadow:none;border-radius:0;padding:10px}.btn,.tabs,.tab,.modal,.message{display:none!important}.section{break-inside:avoid;box-shadow:none;border:1px solid #ccc}table{break-inside:avoid}}
a,a:link,a:visited{text-decoration:none;color:#06c}
a:hover{text-decoration:underline;color:#049}
#globalHelpBtn{width:auto;margin:0}
#headerActions{display:inline-flex;align-items:center;gap:8px}
#themeToggleIcon{display:inline-flex;align-items:center;cursor:pointer;border-radius:50%;width:32px;height:32px;justify-content:center;background:transparent}
.icon-img{filter:var(--icon-filter,none);vertical-align:middle;margin-right:4px;display:inline-block}
.btn .icon-img,.help-btn .icon-img,.copy-btn .icon-img{filter:invert(1)}
.quick-btn .icon-img{margin-right:0;vertical-align:middle;filter:none}
.help-version-line{margin-top:16px;padding-top:12px;border-top:1px solid #f0f0f0;color:#888;font-size:13px}
.btn-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:20px}
.btn-row .btn{margin-bottom:0}
.toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
.toolbar .btn{margin-bottom:0}
.panel-box{border:1px solid #e0e0e0;border-radius:8px;background:#f9f9f9;padding:12px;margin-top:12px}
.panel-box .form-group:last-child{margin-bottom:0}
.columns-row{display:flex;gap:20px;flex-wrap:wrap}
.list-container{max-height:400px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:8px;background:#fff}
.list-item{display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid #f0f0f0}
.list-item-even{background:#f9f9f9}
.list-item-odd{background:#fff}
.search-input{flex:1;min-width:150px;padding:6px 10px;border:1px solid #ccc;border-radius:4px;font-size:14px}
.status-text{font-size:14px;color:#666}
.loading{padding:30px;text-align:center;color:#999;font-size:15px}
.error-message{padding:20px;color:#f44336;text-align:center}
.file-input-wrapper{position:relative;overflow:hidden;display:inline-block;width:100%}
.file-input-wrapper input[type=file]{position:absolute;left:0;top:0;opacity:0;width:100%;height:100%;cursor:pointer}
.file-input-button{display:block;padding:16px;background:#fafafa;border:2px dashed #FFBD00;border-radius:8px;text-align:center;color:#FFBD00;cursor:pointer;transition:all .3s;font-weight:600}
.file-input-button:hover{background:#fff8e1;border-color:#FFA000;color:#FFA000}
body.dark-mode{background:#0a0a0a!important;color:#eaeef2!important}
body.dark-mode .container{background:#14141c!important;box-shadow:0 4px 20px rgba(0,0,0,0.5)!important}
body.dark-mode .section{background:#1e1e2a!important;border-color:#2d2d38!important;box-shadow:0 4px 12px rgba(0,0,0,0.3)!important}
body.dark-mode .modal-content{background-color:#1e1e2a!important;border-color:#3a3a48!important}
body.dark-mode .modal-header{background-color:#252530!important;border-bottom-color:#3a3a48!important}
body.dark-mode .modal-body{background-color:#1e1e2a!important;color:#eef2f5!important}
body.dark-mode .close-btn{color:#bbb!important}
body.dark-mode .close-btn:hover{background-color:#3a3a48!important;color:#fff!important}
body.dark-mode .tab{background-color:#2a2a36!important;color:#ccc!important;border-color:#3a3a48!important}
body.dark-mode .tab.active{background-color:#1e1e2a!important;color:#FFBD00!important;border-bottom-color:#1e1e2a!important}
body.dark-mode .tab:hover{background-color:#353542!important;color:#fff!important}
body.dark-mode .tab-btn{background-color:#2a2a36!important;color:#ccc!important;border-color:#3a3a48!important}
body.dark-mode .tab-btn.active{background-color:#1e1e2a!important;color:#FFBD00!important;border-bottom-color:#1e1e2a!important}
body.dark-mode .tab-btn:hover{background-color:#353542!important;color:#fff!important}
body.dark-mode input,body.dark-mode select,body.dark-mode textarea{background-color:#2c2c38!important;border-color:#4a4a58!important;color:#f0f0f0!important}
body.dark-mode input:focus,body.dark-mode select:focus,body.dark-mode textarea:focus{border-color:#FFBD00!important;box-shadow:0 0 0 3px rgba(255,189,0,0.2)!important}
body.dark-mode input[readonly]{background-color:#23232e!important;color:#bbbbbb!important}
body.dark-mode th{background:#2a2a36!important;color:#FFBD00!important;border-color:#3e3e4c!important}
body.dark-mode td{border-color:#3a3a44!important;color:#e0e4e8!important}
body.dark-mode tr:nth-child(even){background-color:#252530!important}
body.dark-mode tr:hover{background-color:#32323e!important}
body.dark-mode .table-container{background-color:#1e1e2a!important;border-color:#3a3a44!important}
body.dark-mode .btn{box-shadow:0 4px 12px rgba(0,0,0,0.4)!important}
body.dark-mode .btn-secondary{background:linear-gradient(135deg,#5a5a6a 0%,#3a3a4a 100%)!important}
body.dark-mode .copy-btn,body.dark-mode .btn-success{background:linear-gradient(135deg,#2e7d32 0%,#1b5e20 100%)!important}
body.dark-mode .btn-warning{background:linear-gradient(135deg,#ff8c00 0%,#e67e00 100%)!important}
body.dark-mode .message{background-color:#2c2c38!important;border-left-color:#FFBD00!important;color:#f0f0f0!important}
body.dark-mode .success{background-color:#1e3a2a!important;border-left-color:#4caf50!important;color:#c8e6c9!important}
body.dark-mode .error{background-color:#4a2a2a!important;border-left-color:#f44336!important;color:#ffcdcd!important}
body.dark-mode .info{background-color:#1a2a3a!important;border-left-color:#2196f3!important;color:#bbdefb!important}
body.dark-mode .warning{background-color:#3a2a1a!important;border-left-color:#ff9800!important;color:#ffe0b2!important}
body.dark-mode a,body.dark-mode a:link,body.dark-mode a:visited{color:#FFBD00!important}
body.dark-mode .notice{background-color:#2a2a1a!important;border-left-color:#FFBD00!important;color:#f0e6c0!important}
body.dark-mode .checkbox-group input{accent-color:#FFBD00}
body.dark-mode h1,body.dark-mode h2,body.dark-mode h3,body.dark-mode h4{color:#ffffff!important}
body.dark-mode svg{fill:#ffffff!important;color:#ffffff!important}
body.dark-mode label,body.dark-mode .note{color:#cccccc!important}
body.dark-mode .module-item{background-color:#1e1e2a!important;border-color:#3a3a44!important;color:#eef2f5!important}
body.dark-mode .module-item:hover{background-color:#2a2a36!important;border-color:#FFBD00!important}
body.dark-mode .icon-img{--icon-filter:invert(1)}
body.dark-mode .btn .icon-img,body.dark-mode .help-btn .icon-img,body.dark-mode .copy-btn .icon-img{filter:invert(1)}
body.dark-mode .quick-btn .icon-img{filter:invert(1)}
body.dark-mode .panel-box{background-color:#252530!important;border-color:#3a3a44!important}
body.dark-mode .list-container{background:#2a2a36;border-color:#4a4a58}
body.dark-mode .list-item{border-bottom-color:#3a3a48;color:#e0e4e8}
body.dark-mode .list-item-even{background:#2a2a36}
body.dark-mode .list-item-odd{background:#252530}
body.dark-mode .status-text{color:#ccc}
body.dark-mode .search-input{background:#2c2c38;border-color:#4a4a58;color:#f0f0f0}
body.dark-mode .file-input-button{background:#2a2a36;border-color:#FFBD00;color:#FFBD00}
body.dark-mode .file-input-button:hover{background:#3a3a48;border-color:#FFA000;color:#FFA000}
body.dark-mode .help-version-line{border-top-color:#3a3a48;color:#aaa!important}
body.dark-mode .loading{color:#888}
`;

class Core {
    constructor() {
        // ==================== 版本（从 meta 读） ====================
        const _verMeta = document.querySelector('meta[name="app-version"]');
        this.version = _verMeta ? (_verMeta.getAttribute('content') || '1.0.0') : '1.0.0';
        this.lastupdate = '2026-09-16';

        // ==================== 配置（占位，等仓库建好后填） ====================
        this.repo = 'cnwz/xxcs-tool';
        this.cdnBase = `https://cdn.jsdelivr.net/gh/${this.repo}@`;
        this.cdnPingUrl = `https://cdn.jsdelivr.net/gh/${this.repo}@main/ping.txt`;
        this.wikiBase = `https://gitee.com/${this.repo}/wikis/`;
        this.releaseBase = `https://gitee.com/${this.repo}/releases/`;
        this.domain = 'http://a.com';// 占位，后续可改为实际域名
        this.handshakeTimeout = 1000;
        this.scriptTimeout = 5000;

        // ==================== 加载器状态 ====================
        this.cdnAlive = false;
        this.handshakeDone = false;
        this.backgroundInitDone = false;
        this._pendingAddModal = false;
        this.manifest = null;
        this.modules = {};
        this.moduleClasses = {};
        this._moduleClassPromises = {};
        this._libPromises = {};
        this.loadedIds = [];
        this.currentModuleId = null;
        this.defaultModuleId = 'multiqrcode';
        this.inlineModules = [];

        // ==================== 共享命名空间 ====================
        // 供模块间传递只读数据（如安装教程链接）。Core 不主动读写。
        this.shared = {};

        // ==================== 通用数据容器 ====================
        // 模块通过此容器存放跨模块共享的业务数据。Core 不主动读写。
        this.data = {};

        // ==================== 深色模式（不持久化） ====================
        this.darkModeEnabled = false;

        // ==================== 校验规则 ====================
        this.validations = {
            departmentPattern: /^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/,
            warehousePattern: /^$|^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/,
        };

        // ==================== 内置 LOGO（base64 SVG） ====================
        this.logoImage = '';

        // ==================== 第三方库映射（按需加载） ====================
        this.libraries = {
            xlsx:   { local: 'js/lib/xlsx.full.min.js',  cdn: 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',                 global: 'XLSX' },
            jszip:  { local: 'js/lib/jszip.min.js',      cdn: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',                    global: 'JSZip' },
            qrcode: { local: 'js/lib/qrcode.min.js',     cdn: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',        global: 'qrcode' },
            jspdf:  { local: 'js/lib/jspdf.umd.min.js',  cdn: 'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js',                               global: 'jspdf' },
            docx:   { local: 'js/lib/docx.min.js',       cdn: 'https://unpkg.com/docx@7.1.0/build/index.js',                                        global: 'docx' }
        };

        // ==================== 全局样式 ====================
        this.globalCss = CORE_CSS;

        // ==================== 挂载 ====================
        window.app = this;
    }

    // ==================================================================
    // 日志（debug.html 覆盖）
    // ==================================================================
    _log() {}

    // ==================================================================
    // 启动
    // ==================================================================
    async init() {
        this._log('Core 启动', this.version);

        // 同步部分：内联模块先出
        this.injectGlobalStyles();
        this._registerInlineModules();
        this._renderTabs();

        document.body.classList.remove('dark-mode');

        this.bindCommonEvents();

        if (this._hasModule(this.defaultModuleId)) {
            await this.openModule(this.defaultModuleId);
        } else {
            this._log('默认模块不存在：', this.defaultModuleId);
        }

        const globalHelpBtn = document.getElementById('globalHelpBtn');
        if (globalHelpBtn) {
            globalHelpBtn.innerHTML = `${this.getIcon('info-circle')} ${CORE_TEXT.info}`;
        }
        this.addThemeToggleIcon();

        const subtitle = document.querySelector('.subtitle');
        if (subtitle) {
            subtitle.innerHTML = `（<a href="${this.wikiUrl('更新/')}" target="_blank">${this.version}</a>）`;
        }

        // 异步部分
        this._backgroundInit();
    }

    async _backgroundInit() {
        this._log('后台初始化开始');

        await this._handshake();
        await this._loadManifest();

        this._renderTabs();

        this.backgroundInitDone = true;
        this._log('后台初始化完成');

        // A11：如果用户已点过 + 弹窗，自动重渲染
        if (this._pendingAddModal) {
            this._pendingAddModal = false;
            this.showAddModuleModal();
        }
    }

    // ==================================================================
    // 握手
    // ==================================================================
    async _handshake() {
        if (this.handshakeDone) return this.cdnAlive;
        this.handshakeDone = true;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.handshakeTimeout);

        try {
            const res = await fetch(this.cdnPingUrl, { signal: ctrl.signal, cache: 'no-store' });
            clearTimeout(timer);
            this.cdnAlive = res.ok;
            this._log('握手：', this.cdnAlive ? 'CDN 可用' : 'CDN 返回 ' + res.status);
        } catch (e) {
            clearTimeout(timer);
            this.cdnAlive = false;
            this._log('握手失败：', e.message);
        }
        return this.cdnAlive;
    }

    // ==================================================================
    // 清单加载
    // ==================================================================
    async _loadManifest() {
        window.__MODULES__ = null;

        await this._loadScript('js/modules.js');
        if (window.__MODULES__ && window.__MODULES__.list) {
            this.manifest = window.__MODULES__;
            window.__MODULES__ = null;
            this._log('清单：本地加载成功，共', this.manifest.list.length, '项');
            return;
        }
        this._log('清单：本地失败');

        if (this.cdnAlive) {
            const cdnManifestUrl = `${this.cdnBase}main/js/modules.js`;
            await this._loadScript(cdnManifestUrl);
            if (window.__MODULES__ && window.__MODULES__.list) {
                this.manifest = window.__MODULES__;
                window.__MODULES__ = null;
                this._log('清单：CDN 加载成功，共', this.manifest.list.length, '项');
                return;
            }
            this._log('清单：CDN 失败');
        }

        this.manifest = null;
        this._log('清单：全部失败，仅显示内联模块');
    }

    // ==================================================================
    // 模块类加载
    // ==================================================================
    _registerInlineModules() {
        for (const Cls of this.inlineModules) {
            if (typeof Cls !== 'function') continue;
            const id = this._idFromClassName(Cls.name);
            this.moduleClasses[id] = Cls;
            this._log('注册内联模块：', id);
        }
    }

    async _loadModuleClass(id) {
        if (this.moduleClasses[id]) return this.moduleClasses[id];
        if (this._moduleClassPromises[id]) return this._moduleClassPromises[id];
        if (!this.manifest || !this.manifest.list) return null;

        const item = this.manifest.list.find(m => this._idFromFile(m.file) === id);
        if (!item) {
            this._log('清单中找不到模块：', id);
            return null;
        }

        const className = item.file.replace(/\.js$/, '');
        const basePath = this.manifest.basePath || 'js/module/';

        const promise = (async () => {
            await this._loadScript(`${basePath}${item.file}`);
            if (typeof window[className] === 'function') {
                this.moduleClasses[id] = window[className];
                this._log('模块：本地加载成功', id);
                return this.moduleClasses[id];
            }
            this._log('模块：本地失败', id);

            if (this.cdnAlive) {
                const cdnUrl = `${this.cdnBase}${this.version}/${basePath}${item.file}`;
                await this._loadScript(cdnUrl);
                if (typeof window[className] === 'function') {
                    this.moduleClasses[id] = window[className];
                    this._log('模块：CDN 加载成功', id);
                    return this.moduleClasses[id];
                }
                this._log('模块：CDN 失败', id);
            }

            return null;
        })();

        this._moduleClassPromises[id] = promise;
        const result = await promise;
        delete this._moduleClassPromises[id];
        return result;
    }

    // ==================================================================
    // 第三方库按需加载
    // ==================================================================
    async loadLibrary(name) {
        const lib = this.libraries[name];
        if (!lib) {
            console.error('未定义的库：', name);
            return false;
        }
        if (window[lib.global]) return true;
        if (this._libPromises[name]) return this._libPromises[name];

        const promise = (async () => {
            await this._loadScript(lib.local);
            if (window[lib.global]) {
                this._log('库：本地加载成功', name);
                return true;
            }
            if (this.cdnAlive) {
                await this._loadScript(lib.cdn);
                if (window[lib.global]) {
                    this._log('库：CDN 加载成功', name);
                    return true;
                }
            }
            this._log('库：加载失败', name);
            return false;
        })();

        this._libPromises[name] = promise;
        const ok = await promise;
        if (!ok) delete this._libPromises[name];
        return ok;
    }

    // ==================================================================
    // 打开 / 关闭模块
    // ==================================================================
    async openModule(id) {
        if (this.currentModuleId === id) return;

        if (this.modules[id]) {
            this._switchTo(id);
            return;
        }

        if (!this.moduleClasses[id] && !this.manifest && !this.backgroundInitDone) {
            this.showMessage('功能列表加载中，请稍候…', 'info');
            return;
        }

        const panel = this._ensurePanel(id);

        if (!this.moduleClasses[id]) {
            panel.innerHTML = `<div class="loading">加载中…</div>`;
            const Cls = await this._loadModuleClass(id);
            if (this.modules[id]) {
                this._switchTo(id);
                return;
            }
            if (!Cls) {
                panel.innerHTML = `<div class="error">模块加载失败</div>`;
                this.showMessage(`模块「${id}」加载失败`, 'error');
                return;
            }
        }

        const Cls = this.moduleClasses[id];
        const instance = new Cls(this);
        instance.id = id;
        this.modules[id] = instance;

        panel.innerHTML = '';
        try {
            if (typeof instance.renderPanel === 'function') {
                instance.renderPanel(panel);
            }
        } catch (e) {
            console.error('renderPanel 失败：', id, e);
            panel.innerHTML = `<div class="error">模块渲染失败：${e.message}</div>`;
            delete this.modules[id];
            return;
        }

        this._switchTo(id);
    }

async closeModule(id) {
    if (this.loadedIds.length <= 1) {
        this.showMessage('至少保留一个功能页', 'info');
        return;
    }
    if (!this.loadedIds.includes(id)) return;

    // 1. 清理模块实例
    const instance = this.modules[id];
    if (instance && typeof instance.destroy === 'function') {
        try { instance.destroy(); } catch (e) { console.error(e); }
    }
    delete this.modules[id];

    // 2. 清空 panel 内容（不删元素）
    const panel = document.getElementById(`panel-${id}`);
    if (panel) {
        panel.innerHTML = '';
        panel.classList.remove('active');
    }

    // 3. 从 loadedIds 移除
    this.loadedIds = this.loadedIds.filter(x => x !== id);

    // 4. 重渲染 tab 栏（无条件，移除被关闭的 tab）
    this._renderTabs();

    // 5. 如果关的是当前模块，切到剩下的第一个
    if (this.currentModuleId === id) {
        this.currentModuleId = null;
        await this.openModule(this.loadedIds[0]);
    }
}

    _switchTo(id) {
        const wasLoaded = this.loadedIds.includes(id);
        this.currentModuleId = id;
        if (!wasLoaded) this.loadedIds.push(id);

        document.querySelectorAll('.tab-content').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${id}`);
        });

        if (wasLoaded) {
            this._updateTabStates();
        } else {
            this._renderTabs();
        }
    }

    // ==================================================================
    // 面板
    // ==================================================================
    _ensurePanel(id) {
        let panel = document.getElementById(`panel-${id}`);
        if (!panel) {
            panel = document.createElement('div');
            panel.id = `panel-${id}`;
            panel.className = 'tab-content';
            const container = document.querySelector('.container');
            if (container) container.appendChild(panel);
        }
        return panel;
    }

    // ==================================================================
    // 标签页
    // ==================================================================
    _renderTabs() {
        const bar = document.getElementById('moduleTabs');
        if (!bar) return;
        bar.innerHTML = '';

        const items = this._collectModuleItems();
        const showClose = this.loadedIds.length > 1;

        for (const id of this.loadedIds) {
            const item = items.find(m => this._idFromFile(m.file) === id);
            if (!item) continue;

            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.dataset.module = id;
            if (id === this.currentModuleId) tab.classList.add('active');

            const iconSpan = document.createElement('span');
            iconSpan.className = 'tab-icon';
            iconSpan.innerHTML = this.getIcon(item.icon || 'circle', 20);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title';
            titleSpan.textContent = item.title || id;

            tab.appendChild(iconSpan);
            tab.appendChild(titleSpan);

            if (showClose) {
                const close = document.createElement('span');
                close.className = 'tab-close';
                close.textContent = '×';
                close.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closeModule(id);
                });
                tab.appendChild(close);
            }

            tab.addEventListener('click', () => this.openModule(id));
            bar.appendChild(tab);
        }

        const add = document.createElement('div');
        add.className = 'tab tab-add';
        const addIcon = document.createElement('span');
        addIcon.className = 'tab-icon';
        addIcon.innerHTML = this.getIcon('plus', 16);
        add.appendChild(addIcon);
        add.appendChild(document.createTextNode('其他功能'));
        add.addEventListener('click', () => this.showAddModuleModal());
        bar.appendChild(add);

        for (const id of this.loadedIds) {
            this._ensurePanel(id);
        }
    }

    _updateTabStates() {
        const bar = document.getElementById('moduleTabs');
        if (!bar) return;
        const showClose = this.loadedIds.length > 1;
        bar.querySelectorAll('.tab').forEach(t => {
            const id = t.dataset.module;
            if (!id) return;
            t.classList.toggle('active', id === this.currentModuleId);
            const closeEl = t.querySelector('.tab-close');
            if (closeEl) {
                closeEl.style.display = showClose ? '' : 'none';
            }
        });
    }

    _collectModuleItems() {
        const items = [];
        const seen = new Set();

        for (const id of Object.keys(this.moduleClasses)) {
            if (seen.has(id)) continue;
            seen.add(id);

            const fromManifest = this.manifest?.list?.find(m => this._idFromFile(m.file) === id);
            if (fromManifest) {
                items.push(fromManifest);
            } else {
                const Cls = this.moduleClasses[id];
                items.push({
                    file: `${Cls.name}.js`,
                    title: id,
                    icon: 'circle',
                    intro: '',
                });
            }
        }

        if (this.manifest?.list) {
            for (const m of this.manifest.list) {
                const id = this._idFromFile(m.file);
                if (seen.has(id)) continue;
                seen.add(id);
                items.push(m);
            }
        }

        return items;
    }

    showAddModuleModal() {
        if (!this.backgroundInitDone && !this.manifest) {
            this._pendingAddModal = true;
            this.showModal(CORE_TEXT.modal_addModuleTitle, '<div class="notice">功能列表加载中，请稍候…</div>');
            return;
        }
        this._pendingAddModal = false;

        const available = this._collectModuleItems().filter(m => {
            const id = this._idFromFile(m.file);
            return !this.loadedIds.includes(id);
        });

        let content;
        if (!this.manifest && Object.keys(this.moduleClasses).length === 0) {
            content = `<div class="notice">功能列表加载失败。本地清单缺失，网络不可用。<br>请重新下载完整包，或检查网络后刷新页面。</div>`;
        } else if (available.length === 0) {
            content = `<div class="notice">所有功能都已打开。</div>`;
        } else {
            content = '<div class="module-list">';
            for (const m of available) {
                const id = this._idFromFile(m.file);
                const icon = this.getIcon(m.icon || 'circle', 20);
                content += `<div class="module-item" data-id="${id}">${icon}<strong>${m.title || id}</strong> — ${m.intro || ''}</div>`;
            }
            content += '</div>';
        }

        this.showModal(CORE_TEXT.modal_addModuleTitle, content);

        document.querySelectorAll('.module-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                document.getElementById('commonModal').style.display = 'none';
                this.openModule(id);
            });
        });
    }

    // ==================================================================
    // 工具方法
    // ==================================================================
    _idFromFile(file) {
        return String(file).replace(/\.js$/i, '').replace(/Module$/i, '').toLowerCase();
    }
    _idFromClassName(name) {
        return String(name).replace(/Module$/i, '').toLowerCase();
    }
    _hasModule(id) {
        if (this.moduleClasses[id]) return true;
        if (this.manifest?.list?.some(m => this._idFromFile(m.file) === id)) return true;
        return false;
    }

    _loadScript(src) {
        return new Promise(resolve => {
            const s = document.createElement('script');
            let done = false;

            const finish = (ok) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                if (!ok && s.parentNode) s.parentNode.removeChild(s);
                resolve(ok);
            };

            const timer = setTimeout(() => {
                this._log('脚本超时：', src);
                finish(false);
            }, this.scriptTimeout);

            s.onload = () => finish(true);
            s.onerror = () => {
                this._log('脚本加载失败：', src);
                finish(false);
            };
            s.src = src;
            document.head.appendChild(s);
        });
    }

    // ==================================================================
    // URL 方法
    // ==================================================================
    buildUrl(path) {
        return this.domain + path;
    }
    cdnUrl(path) {
        return `${this.cdnBase}${this.version}/${path}`;
    }
    wikiUrl(page, version) {
        const base = `${this.wikiBase}${page}`;
        return version ? `${base}#v${version}` : base;
    }
    releaseUrl(tag) {
        return `${this.releaseBase}tag/${tag}`;
    }

    // ==================================================================
    // 样式注入
    // ==================================================================
    injectGlobalStyles() {
        if (document.getElementById('shelfToolGlobalStyles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'shelfToolGlobalStyles';
        styleEl.textContent = this.globalCss;
        document.head.appendChild(styleEl);
    }

    injectStyle(id, css) {
        const styleId = `${id}-styles`;
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ==================================================================
    // 图标
    // ==================================================================
    getIcon(name, size = 16, extraClass = '') {
        const url = `https://icons.getbootstrap.com/assets/icons/${name}.svg`;
        return `<img src="${url}" width="${size}" height="${size}" alt="" class="icon-img ${extraClass}">`;
    }

    getHelpButton(moduleId, iconName = 'question-circle', label = CORE_TEXT.help) {
        return `<button class="btn help-btn" data-module="${moduleId}">${this.getIcon(iconName)} ${label}</button>`;
    }

    // ==================================================================
    // 消息 / 弹窗
    // ==================================================================
    showModal(title, content, extraControls = null) {
        let modal = document.getElementById('commonModal');
        document.getElementById('modalTitle').textContent = title;
        const body = document.getElementById('modalBody');
        body.innerHTML = '';
        if (content instanceof Node) {
            body.appendChild(content);
        } else {
            body.innerHTML = content == null ? '' : String(content);
        }
        let extraDiv = document.getElementById('modalExtraControls');
        if (extraDiv) {
            extraDiv.innerHTML = '';
            if (extraControls) extraDiv.appendChild(extraControls);
        }
        modal.style.display = 'block';
    }

    showMessage(message, type) {
        let messageArea = document.getElementById('messageArea');
        if (!messageArea) return;
        let div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = message;
        messageArea.appendChild(div);
        setTimeout(() => {
            if (div.parentNode === messageArea) div.remove();
        }, 3000);
    }

    // ==================================================================
    // 通用工具
    // ==================================================================
    async readExcel(file) {
        const ok = await this.loadLibrary('xlsx');
        if (!ok) throw new Error('XLSX 库未加载');
        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
    }

    download(data, filename, mimeType = 'application/octet-stream') {
        let blob;
        if (data instanceof Blob) blob = data;
        else if (data instanceof ArrayBuffer || data instanceof Uint8Array) blob = new Blob([data], { type: mimeType });
        else if (typeof data === 'string') blob = new Blob([data], { type: mimeType });
        else throw new Error('不支持的数据类型');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    copyText(text) {
        return navigator.clipboard.writeText(text);
    }

    escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    pickFile(opts = {}) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            if (opts.accept) input.accept = opts.accept;
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(null); return; }
                if (opts.maxSize && file.size > opts.maxSize) {
                    reject(new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB > ${(opts.maxSize / 1024 / 1024).toFixed(1)}MB）`));
                    return;
                }
                resolve(file);
            };
            input.click();
        });
    }

    validateFile(file, opts = {}) {
        if (!file) return false;
        if (opts.maxSize && file.size > opts.maxSize) return false;
        if (opts.accept) {
            const accepts = opts.accept.split(',').map(s => s.trim());
            const mime = file.type || '';
            const name = file.name || '';
            const matched = accepts.some(a => {
                if (a.startsWith('.')) return name.toLowerCase().endsWith(a.toLowerCase());
                if (a.endsWith('/*')) return mime.startsWith(a.slice(0, -1));
                return mime === a;
            });
            if (!matched) return false;
        }
        return true;
    }

    // ==================================================================
    // 表格复制
    // ==================================================================
    copyTable(tableId) {
        let table = document.getElementById(tableId);
        if (!table) return;
        const lines = [];
        const headerCells = table.querySelectorAll('thead tr:first-child th, thead tr:first-child td');
        if (headerCells.length > 0) {
            lines.push(Array.from(headerCells).map(c => c.textContent).join('\t'));
        }
        let bodyRows = table.querySelectorAll('tbody tr');
        if (bodyRows.length === 0) {
            bodyRows = Array.from(table.querySelectorAll('tr')).filter(tr => !tr.closest('thead'));
        }
        bodyRows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length > 0) {
                lines.push(Array.from(cells).map(c => c.textContent).join('\t'));
            }
        });
        const text = lines.join('\n') + '\n';
        this.copyText(text).then(() => {
            this.showMessage(CORE_TEXT.msg_copyTableSuccess, 'success');
        }).catch(err => {
            console.error('复制失败: ', err);
            this.showMessage(CORE_TEXT.msg_copyTableFailed, 'error');
        });
    }

    // ==================================================================
    // 表单 / 校验
    // ==================================================================
    getRadioValue(name, defaultValue = '') {
        const selected = document.querySelector(`input[name="${name}"]:checked`);
        return selected ? selected.value : defaultValue;
    }

    validateShelfCode(code) {
        if (!code || typeof code !== 'string') return false;
        let parts = code.split('-');
        if (parts.length !== 3) return false;
        let [zone, area, shelf] = parts;
        if (!/^[A-Z0-9]{2}$/i.test(area)) return false;
        if (!/^\d{2}$/.test(shelf)) return false;
        return true;
    }

    validateLocationCode(code) {
        if (!code || typeof code !== 'string') return false;
        let parts = code.split('-');
        if (parts.length !== 5) return false;
        let shelfCode = `${parts[0]}-${parts[1]}-${parts[2]}`;
        if (!this.validateShelfCode(shelfCode)) return false;
        if (parts[3] !== "DD" && !/^\d{2}$/.test(parts[3])) return false;
        if (!/^\d{2}$/.test(parts[4])) return false;
        return true;
    }

    // ==================================================================
    // Optimization 专用（历史遗留，待下沉到模块）
    // ==================================================================
    getOptimizationMode() {
        return this.getRadioValue('optimizationMode', 'batch');
    }

    updateUIfOptimizationMode() {
        let mode = this.getOptimizationMode();
        let batchActions = document.getElementById('batchModeActions');
        let locationsPerLayerGroup = document.getElementById('locationsPerLayerGroup');
        let individualLayer = document.getElementById('individualLayerLocations');
        if (mode === 'batch') {
            if (batchActions) batchActions.classList.remove('hidden');
            if (locationsPerLayerGroup) locationsPerLayerGroup.classList.remove('hidden');
            if (individualLayer) individualLayer.classList.add('hidden');
        } else {
            if (batchActions) batchActions.classList.add('hidden');
            if (locationsPerLayerGroup) locationsPerLayerGroup.classList.add('hidden');
            if (individualLayer) individualLayer.classList.remove('hidden');
        }
    }

    getLayerLocationSettings() {
        let mode = this.getOptimizationMode();
        if (mode === 'batch') {
            let locationsPerLayerInput = document.getElementById('locationsPerLayer');
            let layerCountInput = document.getElementById('layerCount');
            let locationsPerLayer = locationsPerLayerInput ? parseInt(locationsPerLayerInput.value) : 9;
            let layerCount = layerCountInput ? parseInt(layerCountInput.value) : 6;
            let settings = {};
            for (let i = 1; i <= layerCount; i++) settings[i] = locationsPerLayer;
            return settings;
        } else {
            let layerCountInput = document.getElementById('layerCount');
            let layerCount = layerCountInput ? parseInt(layerCountInput.value) : 6;
            let settings = {};
            for (let i = 1; i <= layerCount; i++) {
                let input = document.getElementById(`layerLocation_${i}`);
                settings[i] = input ? parseInt(input.value) : 9;
            }
            return settings;
        }
    }

    // ==================================================================
    // 全局事件
    // ==================================================================
    bindCommonEvents() {
        const globalHelpBtn = document.getElementById('globalHelpBtn');
        if (globalHelpBtn) {
            globalHelpBtn.addEventListener('click', () => {
                let intro = '<ul>';
                const items = this._collectModuleItems();
                for (const m of items) {
                    const id = this._idFromFile(m.file);
                    intro += `<li><b>${m.title || id}</b>：${m.intro || ''}</li>`;
                }
                intro += '</ul>';
                intro += `<p><strong>核心引擎版本：</strong>${this.version}（${this.lastupdate}）</p>`;
                intro += CORE_TEXT.globalHelpBody;
                this.showModal(CORE_TEXT.modal_globalHelpTitle, intro);
            });
        }

        document.addEventListener('click', (event) => {
            const t = event.target;
            if (!t || typeof t.closest !== 'function') return;
            const helpBtn = t.closest('.help-btn');
            if (!helpBtn) return;
            const moduleId = helpBtn.dataset.module;
            if (!moduleId) return;
            const module = this.modules[moduleId];
            if (module && module.helpDescription) {
                const content = `${module.helpDescription}<p class="help-version-line">${CORE_TEXT.helpVersion}${module.ver || ''}（${module.lastupdate || ''}）</p>`;
                this.showModal((module.title || moduleId) + ' - ' + CORE_TEXT.help, content);
            }
        });

        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                document.getElementById('commonModal').style.display = 'none';
            });
        }
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('commonModal');
            if (event.target === modal) modal.style.display = 'none';
        });

        document.addEventListener('click', (event) => {
            const t = event.target;
            if (!t || typeof t.closest !== 'function') return;
            const copyBtn = t.closest('.copy-btn');
            if (!copyBtn) return;
            const tableId = copyBtn.getAttribute('data-table');
            if (tableId) this.copyTable(tableId);
        });
    }

    // ==================================================================
    // 主题切换（不持久化）
    // ==================================================================
    addThemeToggleIcon() {
        const helpBtn = document.getElementById('globalHelpBtn');
        if (!helpBtn) return;
        if (document.getElementById('themeToggleIcon')) return;
        const iconSpan = document.createElement('span');
        iconSpan.id = 'themeToggleIcon';
        iconSpan.setAttribute('title', CORE_TEXT.themeToggleTitle);
        const wrapper = document.createElement('div');
        helpBtn.parentNode.insertBefore(wrapper, helpBtn);
        wrapper.appendChild(iconSpan);
        wrapper.appendChild(helpBtn);
        this.updateThemeIcon(this.darkModeEnabled);
        iconSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDarkMode();
        });
    }

    updateThemeIcon(isDark) {
        const iconSpan = document.getElementById('themeToggleIcon');
        if (!iconSpan) return;
        iconSpan.innerHTML = isDark ? this.getIcon('moon-fill', 20) : this.getIcon('sun', 20);
    }

    toggleDarkMode() {
        this.darkModeEnabled = !this.darkModeEnabled;
        if (this.darkModeEnabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.updateThemeIcon(this.darkModeEnabled);
    }
}

// ==================================================================
// Core 文案
// ==================================================================
const CORE_TEXT = {
    help: '帮助',
    info: '说明',
    otherModules: '其他功能',
    themeToggleTitle: '切换深色/浅色模式',
    notDefined: '未定义',
    helpVersion: '版本：',
    modal_addModuleTitle: '选择要加载的模块',
    modal_globalHelpTitle: '工具说明',
    msg_copyTableSuccess: '表格内容已复制到剪贴板',
    msg_copyTableFailed: '复制失败，请手动选择并复制表格内容',
    globalHelpBody: '<p>计算为本地运行，不会向互联网传输任何数据。</p><p>下载地址：<a href="https://gitee.com/{repo}/releases" target="_blank">https://gitee.com/{repo}/releases</a></p>'
};

window.Core = Core;