/**
 * @description 在职统计模块
 * @author ls_wuzhen20
 * @since 2026-10-29
 * @lastupdate 2026-10-29
 * @version 2.0.0
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class StaffStatsModule {
    /**
     * @param {Core} app
     */
    constructor(app) {
        this.app = app;
        this.title = SS_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2026-10-29';
        this.iconName = 'bar-chart';
        this.introText = SS_TEXT.introText;
        this.helpDescription = SS_TEXT.helpDescription;

        this.headers = [];
        this.rows = [];
        this.stats = null;
        this._summary = '';
        this._colIdx = null;

        this._iconCache = {
            refresh: this.app.getIcon('arrow-counterclockwise'),
            copy: this.app.getIcon('clipboard'),
        };
    }

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, SS_TEXT.styles);
    }

    // ==================== 日期工具 ====================

    /** 加天数，返回当天 0 点 */
    addDays(d, n) {
        const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        r.setDate(r.getDate() + n);
        return r;
    }

    /** 归到当天 0 点的时间戳 */
    toDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }

    /**
     * 解析日期：支持 Date、Excel 序列号、yyyy-mm-dd / yyyy/mm/dd 文本；空值、NULL、- 返回 null
     * @param {*} val
     * @returns {Date|null}
     */
    parseDate(val) {
        if (val === null || val === undefined || val === '') return null;
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

        if (typeof val === 'number') {
            if (val < 1 || val > 100000) return null;
            const ms = Math.round((val - 25569) * 86400 * 1000);
            const d = new Date(ms);
            return isNaN(d.getTime()) ? null : d;
        }

        const s = String(val).trim();
        if (!s) return null;
        const lower = s.toLowerCase();
        if (lower === 'null' || lower === '-' || lower === '--') return null;

        const m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
        if (m) {
            const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
            return isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    /** 输出 yyyy-mm-dd，用于 input[type=date] */
    formatDateForInput(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    /** 输出 mmdd */
    mmdd(d) {
        return String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    }

    /** 百分比格式 */
    fmtPct(v) {
        return (Number(v) * 100).toFixed(2) + '%';
    }

    // ==================== 数据解析 ====================

    /**
     * 按别名列表找列索引
     * @param {string[]} aliases
     * @returns {number}
     */
    findColumn(aliases) {
        for (const alias of aliases) {
            const idx = this.headers.indexOf(alias);
            if (idx !== -1) return idx;
        }
        return -1;
    }

    /**
     * 解析数据并校验必要列
     * @param {Array<Array>} rows
     * @param {string[]} headers
     */
    parseData(rows, headers) {
        this.headers = headers;
        this.rows = rows;

        const idxSite = this.findColumn(['简称', '站点', '站点名称']);
        const idxLeaveDate = this.findColumn(['离职日期修复', '离职日期']);
        const idxLastAttend = this.findColumn(['最近一次出勤日期', '最近出勤日期', '最后出勤日期']);
        const idxStatus = this.findColumn(['onjob_status', '在职状态', '员工状态']);

        if (idxSite === -1) throw new Error(SS_TEXT.err_missingSite);
        if (idxLeaveDate === -1) throw new Error(SS_TEXT.err_missingLeaveDate);
        if (idxLastAttend === -1) throw new Error(SS_TEXT.err_missingLastAttend);
        if (idxStatus === -1) throw new Error(SS_TEXT.err_missingStatus);

        this._colIdx = {
            site: idxSite,
            leaveDate: idxLeaveDate,
            lastAttend: idxLastAttend,
            status: idxStatus,
        };
    }

    // ==================== 参数 ====================

    /** 读取考核目标（小数，如 0.198） */
    getTargetRate() {
        const el = document.getElementById('ssTargetRate');
        const v = el ? parseFloat(el.value) : 19.8;
        return isNaN(v) ? 0.198 : v / 100;
    }

    /** 读取截止日，默认昨天 */
    getBaseDate() {
        const el = document.getElementById('ssBaseDate');
        const v = el ? el.value : '';
        if (v) {
            const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
        }
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    }

    // ==================== 统计 ====================

    /**
     * 计算唤醒达标
     * @returns {{wakeup:number, cannotReach:boolean}}
     */
    computeWakeup(monthLeave, silent8, denom, targetRate) {
        if (denom <= 0) return { wakeup: 0, cannotReach: false };
        const rate = (monthLeave + silent8) / denom;
        if (rate <= targetRate) return { wakeup: 0, cannotReach: false };
        const leaveOnlyRate = monthLeave / denom;
        if (leaveOnlyRate > targetRate) return { wakeup: 0, cannotReach: true };
        const need = (monthLeave + silent8) - targetRate * denom;
        return { wakeup: Math.max(0, Math.ceil(need)), cannotReach: false };
    }

    /**
     * 计算全区域 + 各站点统计
     * @returns {Object}
     */
    computeStats() {
        const baseDate = this.getBaseDate();
        const targetRate = this.getTargetRate();
        const baseDay = this.toDay(baseDate);
        const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).getTime();
        const silentThreshold = this.toDay(this.addDays(baseDate, -8));
        const futureStart = this.toDay(this.addDays(baseDate, -7));
        const futureEnd = this.toDay(this.addDays(baseDate, -5));

        const { site, leaveDate, lastAttend, status } = this._colIdx;

        const siteMap = new Map();
        let totalRows = 0;
        let otherStatus = 0;

        for (const row of this.rows) {
            if (!row || row.length === 0) continue;
            totalRows++;

            const siteName = String(row[site] == null ? '' : row[site]).trim() || '(未知站点)';
            const s = String(row[status] == null ? '' : row[status]).trim();

            if (!siteMap.has(siteName)) {
                siteMap.set(siteName, {
                    site: siteName,
                    onJob: 0,
                    monthLeave: 0,
                    silent8: 0,
                    futureSilent: 0,
                });
            }
            const stat = siteMap.get(siteName);

            if (s === '在职') {
                stat.onJob++;
                const ad = this.parseDate(row[lastAttend]);
                if (ad) {
                    const t = this.toDay(ad);
                    if (t <= silentThreshold) stat.silent8++;
                    else if (t >= futureStart && t <= futureEnd) stat.futureSilent++;
                }
            } else if (s === '离职') {
                const r = this.parseDate(row[leaveDate]);
                if (r) {
                    const t = this.toDay(r);
                    if (t >= monthStart && t <= baseDay) stat.monthLeave++;
                }
            } else {
                otherStatus++;
            }
        }

        const sites = [];
        for (const stat of siteMap.values()) {
            const denom = stat.onJob + stat.monthLeave;
            stat.rate = denom > 0 ? (stat.monthLeave + stat.silent8) / denom : 0;
            stat.futureRate = denom > 0 ? (stat.monthLeave + stat.silent8 + stat.futureSilent) / denom : 0;
            const w = this.computeWakeup(stat.monthLeave, stat.silent8, denom, targetRate);
            stat.wakeup = w.wakeup;
            stat.cannotReach = w.cannotReach;
            sites.push(stat);
        }

        const total = {
            site: '合计',
            onJob: 0,
            monthLeave: 0,
            silent8: 0,
            futureSilent: 0,
        };
        for (const s of sites) {
            total.onJob += s.onJob;
            total.monthLeave += s.monthLeave;
            total.silent8 += s.silent8;
            total.futureSilent += s.futureSilent;
        }
        const denom = total.onJob + total.monthLeave;
        total.rate = denom > 0 ? (total.monthLeave + total.silent8) / denom : 0;
        total.futureRate = denom > 0 ? (total.monthLeave + total.silent8 + total.futureSilent) / denom : 0;
        const tw = this.computeWakeup(total.monthLeave, total.silent8, denom, targetRate);
        total.wakeup = tw.wakeup;
        total.cannotReach = tw.cannotReach;

        return {
            baseDate,
            targetRate,
            total,
            sites,
            totalRows,
            otherStatus,
        };
    }

    /** 重新计算并渲染 */
    recalc() {
        if (!this.rows.length) return;
        this.stats = this.computeStats();
        this.renderStats(this.stats);
        this.renderSiteTable(this.stats);
        this.renderSummary(this.stats);
        this.renderMeta(this.stats);
    }

    // ==================== 渲染 ====================

    /** 渲染全区域汇总卡片 */
    renderStats(stats) {
        const grid = document.getElementById('ssStatsGrid');
        if (!grid) return;

        const t = stats.total;
        const cards = [
            { label: '在职人数', value: t.onJob },
            { label: '本月离职', value: t.monthLeave },
            { label: '8天未出勤', value: t.silent8 },
            { label: '现离职率', value: this.fmtPct(t.rate), warn: t.rate > stats.targetRate },
            { label: '未来三天沉默', value: t.futureSilent },
            { label: '未来三天离职率', value: this.fmtPct(t.futureRate), warn: t.futureRate > stats.targetRate },
            { label: '唤醒达标人数', value: t.cannotReach ? '无法达标' : t.wakeup },
        ];

        grid.innerHTML = cards.map(c =>
            `<div class="ss-stat-card${c.warn ? ' ss-stat-warn' : ''}">
                <div class="ss-stat-label">${c.label}</div>
                <div class="ss-stat-value">${c.value}</div>
            </div>`
        ).join('');
    }

    /** 渲染站点明细表格 */
    renderSiteTable(stats) {
        const wrapper = document.getElementById('ssSiteTableWrapper');
        if (!wrapper) return;

        if (!stats.sites.length) {
            wrapper.innerHTML = this.app.emptyState('暂无站点数据');
            return;
        }

        const bodyRows = stats.sites.map(s => this.siteTableRow(s, false, stats.targetRate)).join('');
        const totalRow = this.siteTableRow(stats.total, true, stats.targetRate);

        wrapper.innerHTML = `
            <table class="ss-site-table">
                <thead>
                    <tr>
                        <th class="ss-th-site">站点</th>
                        <th>在职</th>
                        <th>本月离职</th>
                        <th>8天未出勤</th>
                        <th>现离职率</th>
                        <th>未来三天沉默</th>
                        <th>未来三天离职率</th>
                        <th>唤醒达标人数</th>
                    </tr>
                </thead>
                <tbody>
                    ${bodyRows}
                    ${totalRow}
                </tbody>
            </table>
        `;
    }

    /**
     * 生成站点表格一行
     * @param {Object} s
     * @param {boolean} isTotal
     * @param {number} targetRate
     * @returns {string}
     */
    siteTableRow(s, isTotal, targetRate) {
        const rateCls = s.rate > targetRate ? 'ss-warn-text' : '';
        const futureRateCls = s.futureRate > targetRate ? 'ss-warn-text' : '';

        let wakeupHtml;
        if (s.cannotReach) wakeupHtml = '<span class="ss-cannot-text">无法达标</span>';
        else if (s.wakeup === 0) wakeupHtml = '<span class="ss-ok-text">已达标</span>';
        else wakeupHtml = String(s.wakeup);

        const cls = isTotal ? 'ss-site-total' : '';
        const siteCls = isTotal ? 'ss-td-site ss-td-strong' : 'ss-td-site';

        return `<tr class="${cls}">
            <td class="${siteCls}">${this.app.escapeHtml(s.site)}</td>
            <td>${s.onJob}</td>
            <td>${s.monthLeave}</td>
            <td>${s.silent8}</td>
            <td class="${rateCls}">${this.fmtPct(s.rate)}</td>
            <td>${s.futureSilent}</td>
            <td class="${futureRateCls}">${this.fmtPct(s.futureRate)}</td>
            <td>${wakeupHtml}</td>
        </tr>`;
    }

    /** 渲染一句话总结（按全区域合计口径） */
    renderSummary(stats) {
        const el = document.getElementById('ssSummaryText');
        if (!el) return;
        this._summary = this.formatSummary(stats);
        el.textContent = this._summary;
    }

    /** 渲染数据行数信息 */
    renderMeta(stats) {
        const el = document.getElementById('ssMetaText');
        if (!el) return;
        el.textContent = `共解析 ${stats.totalRows} 行数据，其中状态为"在职/离职"以外的行 ${stats.otherStatus} 行（已跳过）。`;
    }

    /**
     * 生成一句话总结
     * @param {Object} stats
     * @returns {string}
     */
    formatSummary(stats) {
        const t = stats.total;
        const baseDate = stats.baseDate;
        const futureStart = this.addDays(baseDate, -7);
        const futureEnd = this.addDays(baseDate, -5);
        const futureRange = this.mmdd(futureStart) + '-' + this.mmdd(futureEnd);

        let wakeupText;
        if (t.rate <= stats.targetRate) wakeupText = '已达标无需唤醒';
        else if (t.cannotReach) wakeupText = '无法达标';
        else wakeupText = '要达标需唤醒' + t.wakeup + '人';

        return `截止${this.mmdd(baseDate)}区域在职${t.onJob}人，离职人数${t.monthLeave}人，`
            + `8天未出勤人数共${t.silent8}人，预计未来三天沉默人数（最后一次出勤日期${futureRange}）${t.futureSilent}人；`
            + `现离职率达成${this.fmtPct(t.rate)}，考核目标${this.fmtPct(stats.targetRate)}，${wakeupText}；`
            + `未来三天${t.futureSilent}人都沉默数据会恶化到${this.fmtPct(t.futureRate)}`;
    }

    // ==================== 交互 ====================

    /** 复制一句话总结 */
    async copySummary() {
        if (!this._summary) {
            this.app.showMessage(SS_TEXT.msg_nothingToCopy, 'warning');
            return;
        }
        try {
            await this.app.copyText(this._summary);
            this.app.showMessage(SS_TEXT.msg_copyOk, 'success');
        } catch (e) {
            this.app.showMessage(SS_TEXT.msg_copyFailed, 'error');
        }
    }

    /** 重置模块 */
    resetModule() {
        this.headers = [];
        this.rows = [];
        this.stats = null;
        this._summary = '';
        this._colIdx = null;

        const uploadSection = document.getElementById('ssUploadSection');
        if (uploadSection) uploadSection.classList.remove('hidden');

        const resultArea = document.getElementById('ssResultArea');
        if (resultArea) resultArea.classList.add('hidden');

        const grid = document.getElementById('ssStatsGrid');
        if (grid) grid.innerHTML = '';

        const table = document.getElementById('ssSiteTableWrapper');
        if (table) table.innerHTML = '';

        const summary = document.getElementById('ssSummaryText');
        if (summary) summary.textContent = '';

        const meta = document.getElementById('ssMetaText');
        if (meta) meta.textContent = '';

        this.app.showMessage(SS_TEXT.msg_reset, 'info');
    }

    /** 处理文件上传 */
    async handleFileUpload(file) {
        const table = await this.app.readExcelTable(file, {
            emptyMessage: SS_TEXT.err_fileEmpty,
            parseErrorMessage: SS_TEXT.msg_parseFailed,
        });
        if (!table) return;

        try {
            this.parseData(table.rows, table.headers);
            this.app.showMessage(SS_TEXT.msg_parseSuccess, 'success');

            const uploadSection = document.getElementById('ssUploadSection');
            if (uploadSection) uploadSection.classList.add('hidden');

            const resultArea = document.getElementById('ssResultArea');
            if (resultArea) resultArea.classList.remove('hidden');

            this.recalc();
        } catch (err) {
            console.error(err);
            this.app.showMessage(SS_TEXT.msg_parseFailed + err.message, 'error');
        }
    }

    // ==================== 事件绑定 ====================

    /** 绑定面板事件 */
    bindEvents(panel) {
        panel.querySelector('#ssTargetRate')?.addEventListener('input', () => this.recalc());
        panel.querySelector('#ssBaseDate')?.addEventListener('change', () => this.recalc());
        panel.querySelector('#ssCopySummaryBtn')?.addEventListener('click', () => this.copySummary());
        panel.querySelector('#ssResetBtn')?.addEventListener('click', () => this.resetModule());
    }

    // ==================== 面板 ====================

    /** 渲染模块面板 */
    renderPanel(panel) {
        this.injectStyles();
        const defaultBaseDate = this.formatDateForInput(this.addDays(new Date(), -1));

        panel.innerHTML = `
            <div class="section" id="ssUploadSection">
                ${this.app.uploadSection({
                    title: SS_TEXT.title,
                    moduleId: this.id,
                    btnId: 'ssUploadBtn',
                    btnLabel: SS_TEXT.btn_upload,
                })}
            </div>
            <div id="ssResultArea" class="section hidden">
                <div class="table-header"><h2>${SS_TEXT.heading_stats}</h2></div>
                <div class="notice">${SS_TEXT.tip_stats}</div>

                <div class="ss-param-box">
                    <div class="ss-param-title">参数设置</div>
                    <div class="ss-param-row">
                        <div class="ss-param-item">
                            <label for="ssTargetRate">${SS_TEXT.label_targetRate}</label>
                            <input type="number" id="ssTargetRate" value="19.8" step="0.1" min="0" max="100">
                        </div>
                        <div class="ss-param-item">
                            <label for="ssBaseDate">${SS_TEXT.label_baseDate}</label>
                            <input type="date" id="ssBaseDate" value="${defaultBaseDate}">
                        </div>
                    </div>
                </div>

                <div class="ss-subheading">全区域汇总</div>
                <div class="ss-stats-grid" id="ssStatsGrid"></div>

                <div class="ss-subheading">站点明细</div>
                <div class="ss-site-table-wrapper" id="ssSiteTableWrapper"></div>

                <div class="ss-summary-box">
                    <div class="ss-summary-header">
                        <span>${SS_TEXT.heading_summary}</span>
                        <button id="ssCopySummaryBtn" class="btn btn-secondary ss-btn-sm">${this._iconCache.copy} ${SS_TEXT.btn_copy}</button>
                    </div>
                    <div id="ssSummaryText" class="ss-summary-text"></div>
                </div>

                <div class="btn-row">
                    <button id="ssResetBtn" class="btn btn-secondary">${this._iconCache.refresh} ${SS_TEXT.btn_reset}</button>
                    <span id="ssMetaText" class="status-text" style="margin-left:auto"></span>
                </div>
            </div>
        `;

        this.bindEvents(panel);
        this.app.bindUploadSection({
            btnId: 'ssUploadBtn',
            onFile: (file) => this.handleFileUpload(file),
        });
        this.app._log(`${this.title} 模块加载成功`);
    }
}

// ==================== 文案 ====================

const SS_TEXT = {
    title: '站点离职率统计',
    introText: '上传员工数据，按截止日统计全区域及分站点的在职、本月离职、8天未出勤、离职率、未来三天沉默人数、唤醒达标等指标，并自动生成一句话总结。',
    helpDescription: `<p>上传包含「简称」「离职日期修复」「最近一次出勤日期」「onjob_status」等字段的 Excel 文件。</p>
        <p>统计口径：</p>
        <ul>
            <li><b>在职</b>：onjob_status = "在职"</li>
            <li><b>本月离职</b>：onjob_status = "离职"，且离职日期修复落在 本月1日 ～ 截止日</li>
            <li><b>8天未出勤</b>：在职人员中，最近一次出勤日期 ≤ 截止日-8天</li>
            <li><b>未来三天沉默</b>：在职人员中，最近出勤日期在 截止日-7 ～ 截止日-5（未来三天将满8天未出勤）</li>
            <li><b>现离职率</b>：(本月离职 + 8天未出勤) / (在职 + 本月离职)</li>
            <li><b>未来三天离职率</b>：(本月离职 + 8天未出勤 + 未来三天沉默) / (在职 + 本月离职)</li>
            <li><b>唤醒达标人数</b>：使现离职率降到目标值以下需要唤醒的8天未出勤人数；已达标显示0，无法达标显示"无法达标"</li>
        </ul>
        <p>日期列支持真正的日期、Excel 序列号、<code>yyyy-mm-dd</code> / <code>yyyy/mm/dd</code> 文本；<code>NULL</code>、<code>-</code>、空值自动忽略，不计入任何统计。</p>
        <p>截止日期默认昨天，修改目标值或截止日期会自动重算。站点明细按"简称"列分组，最后一行是合计。</p>`,

    heading_stats: '统计结果',
    heading_summary: '一句话总结',
    tip_stats: '提示：截止日期默认为昨天；修改目标值或截止日期后会自动重算。',
    label_targetRate: '考核目标 (%)',
    label_baseDate: '截止日期',

    btn_upload: '上传并解析',
    btn_reset: '重置',
    btn_copy: '复制',

    msg_parseSuccess: '文件解析成功',
    msg_parseFailed: '解析失败: ',
    msg_nothingToCopy: '暂无可复制内容',
    msg_copyOk: '已复制到剪贴板',
    msg_copyFailed: '复制失败，请手动复制',
    msg_reset: '已重置',

    err_fileEmpty: '文件为空或只有表头',
    err_missingSite: '缺少必要列：简称 / 站点',
    err_missingLeaveDate: '缺少必要列：离职日期修复',
    err_missingLastAttend: '缺少必要列：最近一次出勤日期',
    err_missingStatus: '缺少必要列：onjob_status',

    styles: `.ss-param-box{background:var(--bg-sub);border:1px solid var(--border-soft);border-radius:var(--r);padding:var(--sp-4);margin-bottom:var(--sp-4)}
.ss-param-title{font-weight:700;color:var(--text-strong);margin-bottom:var(--sp-3);font-size:var(--fs-md)}
.ss-param-row{display:flex;gap:var(--sp-5);flex-wrap:wrap}
.ss-param-item{flex:1;min-width:160px}
.ss-param-item label{font-weight:600}
.ss-param-item input{width:100%}
.ss-subheading{font-weight:700;color:var(--text-strong);margin:var(--sp-4) 0 var(--sp-3);font-size:var(--fs-md)}
.ss-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-4)}
.ss-stat-card{background:var(--bg-sub);border:1px solid var(--border-soft);border-radius:var(--r);padding:var(--sp-3) var(--sp-4);text-align:center;transition:all var(--t)}
.ss-stat-card.ss-stat-warn{border-color:var(--danger);background:rgba(244,67,54,.06)}
.ss-stat-label{font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:var(--sp-1)}
.ss-stat-value{font-size:var(--fs-xl);font-weight:700;color:var(--text-strong)}
.ss-stat-warn .ss-stat-value{color:var(--danger)}
.ss-site-table-wrapper{overflow-x:auto;border:1px solid var(--border-soft);border-radius:var(--r);margin-bottom:var(--sp-4);background:var(--bg-panel)}
.ss-site-table{width:100%;border-collapse:collapse;font-size:var(--fs-sm)}
.ss-site-table th,.ss-site-table td{padding:var(--sp-2) var(--sp-3);text-align:center;border-bottom:1px solid var(--border-soft);white-space:nowrap}
.ss-site-table th{background:var(--bg-sub);color:var(--text-strong);font-weight:700;position:sticky;top:0;z-index:1}
.ss-site-table tbody tr:hover{background:var(--bg-hover)}
.ss-site-table tbody tr:last-child td{border-bottom:none}
.ss-td-site{text-align:left!important;font-weight:400}
.ss-td-strong{font-weight:700}
.ss-site-table .ss-site-total{background:var(--accent-soft)}
.ss-site-table .ss-site-total td{font-weight:700;color:var(--text-strong)}
.ss-site-table .ss-warn-text{color:var(--danger);font-weight:600}
.ss-site-table .ss-ok-text{color:var(--success);font-weight:600}
.ss-site-table .ss-cannot-text{color:var(--danger);font-weight:600}
.ss-summary-box{background:var(--accent-soft);border:1px solid var(--accent);border-left:4px solid var(--accent);border-radius:var(--r);padding:var(--sp-4);margin-bottom:var(--sp-4)}
.ss-summary-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2);font-weight:700;color:var(--text-strong)}
.ss-summary-text{font-size:var(--fs);line-height:1.8;color:var(--text);word-break:break-word;white-space:normal}
.ss-btn-sm{padding:var(--sp-2) var(--sp-4)}`,
};

window.StaffStatsModule = StaffStatsModule;