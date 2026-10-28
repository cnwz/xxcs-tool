/**
 * @description 分拣动线计算模块
 * @author ls_wuzhen20
 * @since 2026-04-26
 * @lastupdate 2026-09-21
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/PickingRouteModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class PickingRouteModule {
    constructor(app) {
        this.app = app;
        this.title = PR_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2026-09-21';
        this.iconName = 'arrow-right-circle';
        this.introText = PR_TEXT.introText;
        this.helpDescription = PR_TEXT.helpDescription;
    }

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, PR_TEXT.styles);
    }

    /**
     * 校验仓库名称输入
     * @returns {boolean}
     */
    validateWarehouse() {
        let warehouse = document.getElementById('prWarehouseName').value;
        const pattern = (this.app.validations && this.app.validations.warehousePattern)
            || /^$|^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/;
        if (!pattern.test(warehouse)) {
            document.getElementById('prWarehouseName').className = 'validation-invalid';
            return false;
        } else {
            document.getElementById('prWarehouseName').className = 'validation-valid';
            return true;
        }
    }

    /**
     * 解析货架设置文本，计算优先级
     * @param {string[]} lines
     * @returns {{shelfData:Array<Object>,duplicatesRemoved:string[]}}
     */
    processShelfData(lines) {
        let shelfData = [];
        let shelfMap = new Map();
        let duplicatesRemoved = [];
        let lastPriority = 0;
        let initialPriorityInput = document.getElementById('prInitialPriority');
        let initialPriority = initialPriorityInput ? parseInt(initialPriorityInput.value) || 11 : 11;
        lines.forEach((line, index) => {
            let parts = line.split(/\t/).map(it => it.trim());
            if (parts.length < 3) parts = line.split(/,/, 3).map(it => it.trim());
            if (parts.length !== 3) {
                throw new Error(PR_TEXT.err_shelfLineFormat.replace('{n}', index + 1));
            }
            let [shelfName, attribute, flag] = parts;
            if (shelfMap.has(shelfName)) {
                let existingAttr = shelfMap.get(shelfName);
                if (existingAttr !== attribute) {
                    throw new Error(PR_TEXT.err_shelfDupConflict.replace('{n}', index + 1).replace('{name}', shelfName).replace('{a}', existingAttr).replace('{b}', attribute));
                } else {
                    duplicatesRemoved.push(shelfName);
                    return;
                }
            }
            shelfMap.set(shelfName, attribute);
            let priority = 0;
            let shelfRegex = /^([A-Z0-9]{2})-(\d{2})-(\d{2})$/;
            if (!shelfRegex.test(shelfName)) {
                throw new Error(PR_TEXT.err_shelfFormat.replace('{n}', index + 1).replace('{name}', shelfName));
            }
            if (!["H", "D"].includes(attribute)) {
                throw new Error(PR_TEXT.err_shelfAttr.replace('{n}', index + 1).replace('{attr}', attribute));
            }
            let lowerFlag;
            if (flag === "") {
                lowerFlag = "=";
            } else {
                lowerFlag = flag.toLowerCase();
                if (!["=", "x"].includes(lowerFlag)) {
                    throw new Error(PR_TEXT.err_shelfFlag.replace('{n}', index + 1).replace('{flag}', flag));
                }
            }
            if (shelfData.length === 0) {
                priority = initialPriority;
            } else {
                let prevAttribute = shelfData[shelfData.length - 1].attribute;
                if (lowerFlag === "x") {
                    priority = Math.ceil((lastPriority + 10) / 100) * 100;
                } else {
                    priority = attribute === "H" || (attribute === "D" && prevAttribute === "H") ? lastPriority + 10 : lastPriority + 1;
                }
            }
            lastPriority = priority;
            shelfData.push({ shelfName, priority, attribute });
        });
        return { shelfData, duplicatesRemoved };
    }

    /**
     * 解析库位列表，匹配货架优先级
     * @param {string[]} lines
     * @returns {{locationData:Array<Object>,duplicatesRemoved:string[]}}
     */
    processLocationData(lines) {
        // 库位码规则：段 4 是 DD 或 2 位数字，段 5 是 2 位数字。
        // 与 Core.validateLocationCode / QRPrintModule 保持一致。
        let locationData = [];
        let locationSet = new Set();
        let duplicatesRemoved = [];
        lines.forEach((line, index) => {
            let location = line.trim();
            if (locationSet.has(location)) {
                duplicatesRemoved.push(location);
                return;
            }
            locationSet.add(location);
            let locationRegex = /^([A-Z0-9]{2})-(\d{2})-(\d{2})-([0-9]{2}|DD)-(\d{2})$/;
            let match = location.match(locationRegex);
            if (!match) {
                throw new Error(PR_TEXT.err_locationFormat.replace('{n}', index + 1).replace('{loc}', location));
            }
            let [, part1, part2, part3, part4, part5] = match;
            let shelfKey = `${part1}-${part2}-${part3}`;
            let part4Lower = part4.toLowerCase();
            if (part4Lower !== "dd" && (part4.length !== 2 || isNaN(Number(part4)))) {
                throw new Error(PR_TEXT.err_locationPart4.replace('{n}', index + 1).replace('{loc}', location));
            }
            if (isNaN(Number(part5))) {
                throw new Error(PR_TEXT.err_locationPart5.replace('{n}', index + 1).replace('{loc}', location));
            }
            if (part4Lower === "dd" && part5 !== "01") {
                throw new Error(PR_TEXT.err_locationDD.replace('{n}', index + 1).replace('{loc}', location));
            }
            if (!this.app.data.priorityMap || !this.app.data.priorityMap.has(shelfKey)) {
                throw new Error(PR_TEXT.err_locationNoShelf.replace('{n}', index + 1).replace('{loc}', location).replace('{shelf}', shelfKey));
            }
            let priority = this.app.data.priorityMap.get(shelfKey);
            locationData.push({
                locationCode: location,
                priority: priority,
                warehouse: document.getElementById('prWarehouseName').value || ''
            });
        });
        return { locationData, duplicatesRemoved };
    }

    /**
     * 渲染货架优先级表格
     * @param {Array<Object>} data
     * @param {HTMLElement} container
     * @param {string} label
     */
    createPriorityTable(data, container, label) {
        let table = document.createElement("table");
        let thead = document.createElement("thead");
        let headerRow = document.createElement("tr");
        let th1 = document.createElement("th");
        th1.textContent = label;
        let th2 = document.createElement("th");
        th2.textContent = PR_TEXT.th_priority;
        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        thead.appendChild(headerRow);
        table.appendChild(thead);
        let tbody = document.createElement("tbody");
        data.forEach(item => {
            let tr = document.createElement("tr");
            let td1 = document.createElement("td");
            td1.textContent = item.shelfName;
            let td2 = document.createElement("td");
            td2.textContent = item.priority;
            tr.appendChild(td1);
            tr.appendChild(td2);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    /**
     * 渲染库位优先级表格
     * @param {Array<Object>} data
     * @param {HTMLElement} container
     */
    createLocationPriorityTable(data, container) {
        let table = document.createElement("table");
        let thead = document.createElement("thead");
        let headerRow = document.createElement("tr");
        CORE_HEADERS.locationChange.forEach(h => {
            let th = document.createElement("th");
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        let tbody = document.createElement("tbody");
        data.forEach(item => {
            let tr = document.createElement("tr");
            let td1 = document.createElement("td");
            td1.textContent = item.warehouse || '';
            tr.appendChild(td1);
            let td2 = document.createElement("td");
            td2.textContent = item.locationCode;
            tr.appendChild(td2);
            for (let i = 0; i < 3; i++) tr.appendChild(document.createElement("td"));
            let td6 = document.createElement("td");
            td6.textContent = item.priority;
            tr.appendChild(td6);
            for (let i = 0; i < 7; i++) tr.appendChild(document.createElement("td"));
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    /** 提交货架设置，生成优先级映射 */
    submitShelf() {
        let text = document.getElementById("prText1").value;
        let container = document.getElementById("table1-container");
        container.innerHTML = "";
        if (!text.trim()) {
            this.app.showMessage(PR_TEXT.msg_enterShelfData, "error");
            return;
        }
        let lines = text.trim().split("\n").filter(l => l.trim());
        if (lines.length === 0) {
            this.app.showMessage(PR_TEXT.msg_noValidShelf, "error");
            return;
        }
        try {
            let { shelfData, duplicatesRemoved } = this.processShelfData(lines);
            this.createPriorityTable(shelfData, container, PR_TEXT.th_shelfName);
            if (duplicatesRemoved.length > 0) {
                let note = document.createElement("p");
                note.className = "notice";
                note.textContent = PR_TEXT.msg_dupShelfRemoved.replace('{n}', duplicatesRemoved.length).replace('{list}', duplicatesRemoved.join(", "));
                container.appendChild(note);
            }
            this.app.data.priorityMap = new Map();
            shelfData.forEach(item => this.app.data.priorityMap.set(item.shelfName, item.priority));
            this.switchPriorityTab(1);
            this.app.showMessage(PR_TEXT.msg_shelfCalcOk, "success");
        } catch (error) {
            this.app.showMessage(PR_TEXT.msg_shelfError.replace('{msg}', error.message), "error");
            container.innerHTML = "";
        }
    }

    /** 提交库位列表，匹配优先级 */
    submitLocation() {
        let locationText = document.getElementById("prText2").value;
        let shelfText = document.getElementById("prText1").value;
        let container = document.getElementById("table2-container");
        container.innerHTML = "";
        if (!shelfText.trim()) {
            this.app.showMessage(PR_TEXT.msg_enterShelfFirst, "error");
            return;
        }
        if (!locationText.trim()) {
            this.app.showMessage(PR_TEXT.msg_enterLocationData, "error");
            return;
        }
        let locationLines = locationText.trim().split("\n").filter(l => l.trim());
        if (locationLines.length === 0) {
            this.app.showMessage(PR_TEXT.msg_noValidLocation, "error");
            return;
        }
        try {
            let shelfLines = shelfText.trim().split("\n").filter(l => l.trim());
            let { shelfData } = this.processShelfData(shelfLines);
            this.app.data.priorityMap = new Map();
            shelfData.forEach(item => this.app.data.priorityMap.set(item.shelfName, item.priority));
            let { locationData, duplicatesRemoved } = this.processLocationData(locationLines);
            this.createLocationPriorityTable(locationData, container);
            if (duplicatesRemoved.length > 0) {
                let note = document.createElement("p");
                note.className = "notice";
                note.textContent = PR_TEXT.msg_dupLocationRemoved.replace('{n}', duplicatesRemoved.length).replace('{list}', duplicatesRemoved.join(", "));
                container.appendChild(note);
            }
            this.switchPriorityTab(2);
            this.app.showMessage(PR_TEXT.msg_locationMatchOk, "success");
        } catch (error) {
            this.app.showMessage(PR_TEXT.msg_locationError.replace('{msg}', error.message), "error");
            container.innerHTML = "";
        }
    }

    /**
     * 切换内层 tab
     * @param {number} index
     */
    switchPriorityTab(index) {
        const panel = document.getElementById(`panel-${this.id}`);
        if (!panel) return;
        panel.querySelectorAll(".tab-btn").forEach((btn, i) => btn.classList.toggle("active", i + 1 === index));
        panel.querySelectorAll(".tab-content-inner").forEach((content, i) => {
            content.style.display = i + 1 === index ? 'block' : 'none';
        });
    }

    /**
     * 绑定面板事件
     * @param {HTMLElement} panel
     */
    bindEvents(panel) {
        panel.querySelector('#prSubmitShelfBtn')?.addEventListener('click', () => this.submitShelf());
        panel.querySelector('#prSubmitLocationBtn')?.addEventListener('click', () => this.submitLocation());
        panel.querySelector('#prWarehouseName')?.addEventListener('input', () => this.validateWarehouse());
        panel.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                let index = parseInt(btn.getAttribute('data-priority-tab'));
                this.switchPriorityTab(index);
            });
        });
    }

    // ==================== UI ====================

    /** 渲染模块面板 */
    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header"><h2>${PR_TEXT.heading}</h2>${this.app.getHelpButton(this.id)}</div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="prInitialPriority">${PR_TEXT.label_initialPriority}</label>
                        <input type="number" id="prInitialPriority" min="1" max="9999" value="11">
                        <p class="note">${PR_TEXT.note_initialPriority}</p>
                    </div>
                    <div class="form-group">
                        <label for="prWarehouseName">${PR_TEXT.label_warehouse}</label>
                        <input type="text" id="prWarehouseName" placeholder="${PR_TEXT.ph_warehouse}">
                    </div>
                </div>
                <div class="columns-row" style="margin-bottom:25px;">
                    <div class="input-group">
                        <label for="prText1">${PR_TEXT.label_shelfConfig}</label>
                        <textarea id="prText1" placeholder="${PR_TEXT.ph_shelfConfig}"></textarea>
                        <p class="note">${PR_TEXT.note_shelfConfig}</p>
                        <button id="prSubmitShelfBtn" class="btn">${PR_TEXT.btn_submitShelf}</button>
                    </div>
                    <div class="input-group">
                        <label for="prText2">${PR_TEXT.label_allLocations}</label>
                        <textarea id="prText2"></textarea>
                        <p class="note">${PR_TEXT.note_allLocations}</p>
                        <button id="prSubmitLocationBtn" class="btn">${PR_TEXT.btn_submitLocation}</button>
                    </div>
                </div>
                <div class="tabs-inner">
                    <div class="tabs">
                        <div class="tab-btn active" data-priority-tab="1">${PR_TEXT.tab_shelfPriority}</div>
                        <div class="tab-btn" data-priority-tab="2">${PR_TEXT.tab_locationPriority}</div>
                    </div>
                    <div id="priorityTab1" class="tab-content-inner active">
                        <p>${PR_TEXT.tab1Desc}</p>
                        <div id="table1-container"></div>
                    </div>
                    <div id="priorityTab2" class="tab-content-inner">
                        <p>${PR_TEXT.tab2Desc}</p>
                        <div id="table2-container"></div>
                    </div>
                </div>
            </div>
        `;
        this.bindEvents(panel);
        this.validateWarehouse();
        this.app._log(this.title + '加载成功');
    }
}

// ==================== 文案 ====================

const PR_TEXT = {
    title: '分拣动线计算',
    introText: '根据货架属性自动计算分拣优先级，生成库位动线。',
    helpDescription: '<p>设置货架和库位的优先级。</p><p>在左侧输入货架设置，格式为"货架名称,属性,分割标志"，使用逗号或制表符分隔。</p><p>在右侧输入全部库位，每行一个库位。</p><p>点击"提交货架设置"或"提交全部库位"生成优先级表格。</p>',

    heading: '动线计算',
    label_initialPriority: '初始优先级值',
    note_initialPriority: '提示：纯数字，建议不要设置为1',
    label_warehouse: '仓库名称',
    ph_warehouse: '小象超市-新华东街站-BJ0176',
    label_shelfConfig: '货架设置：',
    ph_shelfConfig: '示例： LC-01-01,D, LC-01-02,H,x',
    note_shelfConfig: '提示：（格式：货架名称,属性,分割标志）分隔符仅为半角的逗号。',
    btn_submitShelf: '提交货架设置',
    label_allLocations: '全部库位：',
    note_allLocations: '格式：XX-XX-XX-XX-XX，一行一条。',
    btn_submitLocation: '提交全部库位',
    tab_shelfPriority: '货架优先级表格',
    tab_locationPriority: '库位优先级表格',
    tab1Desc: '货架优先级计算结果：',
    tab2Desc: '库位优先级匹配结果（优先级取自对应货架）：',

    th_shelfName: '货架名称',
    th_priority: '优先级',

    msg_enterShelfData: '请输入货架设置数据',
    msg_noValidShelf: '无有效货架数据',
    msg_enterShelfFirst: '请先输入货架设置数据，再提交库位',
    msg_enterLocationData: '请输入全部库位数据',
    msg_noValidLocation: '无有效库位数据',
    msg_dupShelfRemoved: '提示：已自动移除{n}个重复货架（属性一致）: {list}',
    msg_dupLocationRemoved: '提示：已自动移除{n}个重复库位: {list}',
    msg_shelfCalcOk: '货架优先级计算成功',
    msg_locationMatchOk: '库位优先级匹配成功',
    msg_shelfError: '货架处理错误：{msg}',
    msg_locationError: '库位处理错误：{msg}',

    err_shelfLineFormat: '第{n}行：需为"货架名称,属性,分割标志"三列（支持逗号或制表符分割，分割标志可空）',
    err_shelfDupConflict: '第{n}行：货架"{name}"重复且属性不一致（已存在: {a}, 当前: {b}）',
    err_shelfFormat: '第{n}行：货架名称"{name}"格式错误（需XX-XX-XX）',
    err_shelfAttr: '第{n}行：属性"{attr}"无效（仅支持H/D）',
    err_shelfFlag: '第{n}行：分割标志"{flag}"无效（仅支持=、x或空）',
    err_locationFormat: '第{n}行：库位"{loc}"格式错误（需XX-XX-XX-XX-XX）',
    err_locationPart4: '第{n}行：库位"{loc}"第4段无效（仅支持2位数字或DD）',
    err_locationPart5: '第{n}行：库位"{loc}"第5段需为两位数字',
    err_locationDD: '第{n}行：库位"{loc}"第4段为DD时，第5段需为01',
    err_locationNoShelf: '第{n}行：库位"{loc}"对应货架"{shelf}"未在货架设置中找到',

        styles: `.tabs-inner{margin-top:var(--sp-6)}
.input-group{flex:1;min-width:320px}`
};

window.PickingRouteModule = PickingRouteModule;