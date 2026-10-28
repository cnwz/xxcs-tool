/**
 * @description 货架库位增减模块
 * @author mr@cnwz.me
 * @since 2025-07-20
 * @lastupdate 2025-07-20
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/OptimizationModule.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class OptimizationModule {
    constructor(app) {
        this.app = app;
        this.title = OP_TEXT.title;
        this.ver = '2.0.0';
        this.lastupdate = '2025-07-20';
        this.iconName = 'boxes';
        this.introText = OP_TEXT.introText;
        this.helpDescription = OP_TEXT.helpDescription;

        this.heightTargetMin = 22;
        this.heightTargetMax = 24;
        this.maxLayerIndex = 99;

        this.LAYER_SIZE_MAP = {
            80: 3,
            120: 5,
            150: 7,
            172: 7,
            200: 9,
            255: 12
        };

        this.specialInnerLength = {
            172: 160,
            255: 240
        };

        this.locationSpecs = {
            standard: [
                [10,40,2],[10,40,3],[10,40,4],[10,40,5],[10,40,6],[10,40,7],[10,40,8],[10,40,11],
                [10,50,3],[10,50,4],[10,50,5],[10,50,6],[10,50,7],[10,50,8],[10,50,9],[10,50,10],[10,50,11],[10,50,12],[10,50,14],[10,50,15],[10,50,17],[10,50,18],
                [10,60,2],[10,60,3],[10,60,4],[10,60,5],[10,60,6],[10,60,7],[10,60,8],[10,60,9],[10,60,10],[10,60,11],[10,60,12],[10,60,13],[10,60,14],[10,60,15],[10,60,16],[10,60,18],
                [10,80,3],[10,80,4],[10,80,5],[10,80,6],[10,80,7],[10,80,8],[10,80,9],[10,80,11],[10,80,15],[10,80,17],[10,80,18],
                [20,40,2],[20,40,3],[20,40,4],[20,40,5],[20,40,6],[20,40,7],[20,40,8],[20,40,9],[20,40,10],[20,40,11],[20,40,12],[20,40,13],[20,40,14],[20,40,15],
                [20,50,3],[20,50,4],[20,50,5],[20,50,6],[20,50,7],[20,50,8],[20,50,9],[20,50,10],[20,50,11],[20,50,12],[20,50,13],[20,50,14],[20,50,15],[20,50,17],[20,50,18],
                [20,60,2],[20,60,3],[20,60,4],[20,60,5],[20,60,6],[20,60,7],[20,60,8],[20,60,9],[20,60,10],[20,60,11],[20,60,12],[20,60,13],[20,60,14],[20,60,15],[20,60,18],[20,60,19],
                [20,80,3],[20,80,4],[20,80,5],[20,80,6],[20,80,7],[20,80,8],[20,80,9],[20,80,11],[20,80,15],[20,80,18],
                [20,100,3],[20,100,4],[20,100,5],[20,100,6],[20,100,7],
                [40,40,3],[40,40,4],[40,40,5],[40,40,6],[40,40,7],[40,40,8],[40,40,9],[40,40,11],[40,40,15],
                [40,50,3],[40,50,4],[40,50,5],[40,50,6],[40,50,7],[40,50,8],[40,50,10],[40,50,11],[40,50,12],[40,50,13],[40,50,14],[40,50,15],[40,50,16],[40,50,17],
                [40,60,3],[40,60,4],[40,60,5],[40,60,6],[40,60,7],[40,60,8],[40,60,9],[40,60,10],[40,60,11],[40,60,15],
                [40,80,3],[40,80,4],[40,80,5],[40,80,6],[40,80,7],[40,80,8],[40,80,11],[40,80,15],[40,80,17],[40,80,18],
                [40,100,3],[40,100,4],[40,100,5],[40,100,6],[40,100,7],[40,100,11],[40,100,15]
            ].map(([l, d, h]) => ({ l, d, h })),
            top: [
                [80,40,0],[120,40,0],[120,50,0],[120,60,0],[120,80,0],[120,100,0],
                [150,40,0],[150,50,0],[150,60,0],[150,80,0],[150,100,0],
                [172,60,0],
                [200,40,0],[200,50,0],[200,60,0],[200,80,0],[200,100,0],
                [255,60,0]
            ].map(([l, d, h]) => ({ l, d, h }))
        };
        this.validShelfSpecs = [
            [80,40],[120,40],[120,50],[120,60],[120,80],[120,100],
            [150,40],[150,50],[150,60],[150,80],[150,100],
            [172,60],
            [200,40],[200,50],[200,60],[200,80],[200,100],
            [255,60]
        ].map(([l, d]) => ({ l, d }));
        this._iconCache = {
            // upload: this.app.getIcon('filetype-xlsx'),
            xlsx: this.app.getIcon('filetype-xlsx'),
            zip: this.app.getIcon('file-zip'),
            refresh: this.app.getIcon('arrow-counterclockwise'),
            x: this.app.getIcon('x'),
        };

        if (!Array.isArray(this.app.data.shelfData)) this.app.data.shelfData = [];
        if (!Array.isArray(this.app.data.selectedShelves)) this.app.data.selectedShelves = [];
        if (!this.app.data.shelfSpecMap) this.app.data.shelfSpecMap = new Map();
        if (this.app.data.optimizationResult === undefined) this.app.data.optimizationResult = null;
    }

    /** 注入模块样式 */
    injectStyles() {
        this.app.injectStyle(this.id, OP_TEXT.styles);
    }

    /** 读取当前选中的重排方式，未选返回 null */
    _getMode() {
        const selected = document.querySelector('input[name="optimizationMode"]:checked');
        return selected ? selected.value : null;
    }

    // ==================== 区块显示控制 ====================

    /**
     * 根据前置条件刷新 4 个 section 的显隐
     */
    _updateSectionsState() {
        const hasUpload = this.app.data.shelfData.length > 0;
        const hasMode = !!this._getMode();
        const hasShelf = this.app.data.selectedShelves.length > 0;
        const hasResult = this._hasAccumulatedResult();

        const modeShelfSec = document.getElementById('modeShelfSection');
        const paramsSec = document.getElementById('paramsSection');
        const resultsSec = document.getElementById('resultsSection');

        if (modeShelfSec) modeShelfSec.classList.toggle('hidden', !hasUpload);
        if (paramsSec) paramsSec.classList.toggle('hidden', !(hasUpload && hasMode && hasShelf));
        if (resultsSec) resultsSec.classList.toggle('hidden', !hasResult);
    }

    // ==================== 规格解析 ====================

    getAvailableInnerLength(shelfLength) {
        if (Object.prototype.hasOwnProperty.call(this.specialInnerLength, shelfLength)) {
            return this.specialInnerLength[shelfLength];
        }
        return shelfLength - 20;
    }

    getLocationSpecName(spec) {
        if (spec.h === 0) {
            const lengthMeters = (spec.l / 100).toFixed(1);
            const depthMeters = (spec.d / 100).toFixed(1);
            return OP_TEXT.spec_topLocation.replace('{l}', lengthMeters).replace('{d}', depthMeters);
        }
        return OP_TEXT.spec_standardLocation.replace('{l}', spec.l).replace('{d}', spec.d).replace('{h}', spec.h);
    }

    getShelfSpecDescription(length, depth) {
        const spec = this.validShelfSpecs.find(s => s.l === length && s.d === depth);
        if (spec) {
            const lengthMeters = (spec.l / 100).toFixed(2).replace(/\.?0+$/, '');
            const depthMeters = (spec.d / 100).toFixed(2).replace(/\.?0+$/, '');
            return `W${lengthMeters}M*D${depthMeters}M`;
        }
        return OP_TEXT.spec_fallbackDescription.replace('{l}', length).replace('{d}', depth);
    }

    validateShelfSpecCombination(length, depth) {
        const intLength = parseInt(length);
        const intDepth = parseInt(depth);
        if (isNaN(intLength) || isNaN(intDepth)) return false;
        return this.validShelfSpecs.some(spec => spec.l === intLength && spec.d === intDepth);
    }

    getValidShelfSpecs() {
        return this.validShelfSpecs.map(spec => {
            const lengthMeters = (spec.l / 100).toFixed(2).replace(/\.?0+$/, '');
            const depthMeters = (spec.d / 100).toFixed(2).replace(/\.?0+$/, '');
            return {
                length: spec.l,
                depth: spec.d,
                description: `W${lengthMeters}M*D${depthMeters}M`,
                format: OP_TEXT.spec_formatLabel.replace('{l}', spec.l).replace('{d}', spec.d)
            };
        });
    }

    parseLocationSpec(specName) {
        if (!specName) return { l: 0, d: 0, h: 0, type: "unknown", name: specName };
        if (specName.includes('顶层')) {
            const match = specName.match(/W([\d.]+)M\*D([\d.]+)M/);
            if (match) {
                const length = parseFloat(match[1]) * 100;
                const depth = parseFloat(match[2]) * 100;
                return { l: length, d: depth, h: 0, type: "top", name: specName };
            }
        }
        const match = specName.match(/长(\d+)cm深(\d+)cm高(\d+)圆孔/);
        if (match) {
            return {
                l: parseInt(match[1]),
                d: parseInt(match[2]),
                h: parseInt(match[3]),
                type: "standard",
                name: specName
            };
        }
        return { l: 0, d: 0, h: 0, type: "special", name: specName };
    }

    // ==================== 算法 ====================

    findExactLengthCombination(targetLength, count, availableLengths) {
        const sorted = [...availableLengths].sort((a, b) => b - a);
        const minL = Math.min(...sorted);
        const maxL = Math.max(...sorted);

        const backtrack = (remainingLength, remainingCount, current, startIndex) => {
            if (remainingCount === 0 && remainingLength === 0) return current;
            if (remainingCount === 0 || remainingLength < 0) return null;
            const minPossible = remainingCount * minL;
            const maxPossible = remainingCount * maxL;
            if (remainingLength < minPossible || remainingLength > maxPossible) return null;
            for (let i = startIndex; i < sorted.length; i++) {
                const length = sorted[i];
                if (length <= remainingLength) {
                    const result = backtrack(remainingLength - length, remainingCount - 1, [...current, length], i);
                    if (result) return result;
                }
            }
            return null;
        };

        return backtrack(targetLength, count, [], 0);
    }

    generateLayerSpecCombination(availableLength, locationCount, availableSpecs, layerHeight) {
        const layerAvailable = availableSpecs.filter(spec => spec.h === layerHeight);
        if (layerAvailable.length === 0) {
            throw new Error(OP_TEXT.err_noSpecForHeight.replace('{h}', layerHeight));
        }
        const availableLengths = [...new Set(layerAvailable.map(spec => spec.l))].sort((a, b) => a - b);
        const lengthCombo = this.findExactLengthCombination(availableLength, locationCount, availableLengths);
        if (!lengthCombo) {
            throw new Error(OP_TEXT.err_noExactLength
                .replace('{n}', locationCount)
                .replace('{len}', availableLength)
                .replace('{list}', availableLengths.join(',')));
        }
        const specCombo = [];
        for (const length of lengthCombo) {
            const spec = layerAvailable.find(s => s.l === length);
            if (spec) specCombo.push(spec);
        }
        return specCombo;
    }

    findShelfCombination(layerCount, availableLength, layerLocationSettings, availableSpecs) {
        const heights = [...new Set(availableSpecs.map(s => s.h))];
        if (heights.length === 0) return null;

        const minH = Math.min(...heights);
        const maxH = Math.max(...heights);
        const avg = (this.heightTargetMin + this.heightTargetMax) / 2 / layerCount;
        heights.sort((a, b) => Math.abs(a - avg) - Math.abs(b - avg));

        const search = (layer, totalHeight, layerSpecs) => {
            if (layer > layerCount) {
                if (totalHeight >= this.heightTargetMin && totalHeight <= this.heightTargetMax) {
                    return layerSpecs;
                }
                return null;
            }
            const remaining = layerCount - layer;
            for (const h of heights) {
                const newTotal = totalHeight + h;
                if (newTotal + remaining * minH > this.heightTargetMax) continue;
                if (newTotal + remaining * maxH < this.heightTargetMin) continue;
                let specCombo;
                try {
                    specCombo = this.generateLayerSpecCombination(
                        availableLength,
                        layerLocationSettings[layer],
                        availableSpecs,
                        h
                    );
                } catch (err) {
                    continue;
                }
                const result = search(layer + 1, newTotal, [...layerSpecs, specCombo]);
                if (result) return result;
            }
            return null;
        };

        return search(1, 0, []);
    }

    findTopLocationSpec(shelfLength, shelfDepth) {
        const topSpecs = (this.locationSpecs.top || []).filter(
            spec => spec.l === shelfLength && spec.d === shelfDepth
        );
        if (topSpecs.length === 0) {
            throw new Error(OP_TEXT.err_noTopSpec
                .replace('{l}', shelfLength)
                .replace('{d}', shelfDepth));
        }
        return topSpecs[0];
    }

    generateShelfLocations(shelfCode, department, area, priority, layerCount, layerLocationSettings,
                           shelfLength, shelfDepth, generateTop, startLayerOffset) {
        const availableLengthPerLayer = this.getAvailableInnerLength(shelfLength);
        const availableLocations = this.locationSpecs.standard || [];
        const filtered = availableLocations.filter(spec => spec.d === shelfDepth);
        if (filtered.length === 0) {
            throw new Error(OP_TEXT.err_noSpecForDepth.replace('{d}', shelfDepth));
        }

        const layerSpecs = this.findShelfCombination(
            layerCount, availableLengthPerLayer, layerLocationSettings, filtered
        );
        if (!layerSpecs) {
            throw new Error(OP_TEXT.err_noSuitableCombo);
        }

        const newLocations = [];
        for (let layer = 1; layer <= layerCount; layer++) {
            const actualLayer = layer + startLayerOffset - 1;
            const layerStr = actualLayer.toString().padStart(2, '0');
            const specCombo = layerSpecs[layer - 1];
            const locationsPerLayer = layerLocationSettings[layer];
            for (let position = 1; position <= locationsPerLayer; position++) {
                const positionStr = position.toString().padStart(2, '0');
                const locationCode = `${shelfCode}-${layerStr}-${positionStr}`;
                const specIndex = (position - 1) % specCombo.length;
                const spec = specCombo[specIndex];
                newLocations.push({
                    locationCode: locationCode,
                    name: locationCode,
                    area: area,
                    department: department,
                    type: "分拣位",
                    logicalArea: "",
                    separatePacking: "",
                    marketAttribute: "常规",
                    canOut: "否",
                    canIn: "否",
                    sortingPriority: priority,
                    putawayPriority: "",
                    replenishPriority: "",
                    mixBatch: "是",
                    mixSupplier: "是",
                    storageType: "拆零",
                    backgroundCategory: "",
                    locationSpecName: this.getLocationSpecName(spec),
                    locationBand: "",
                    batchCode: "",
                    normShort: ""
                });
            }
        }

        if (generateTop) {
            const actualTopLayer = (layerCount + 1) + startLayerOffset - 1;
            const topLayerStr = actualTopLayer.toString().padStart(2, '0');
            const topLocationCode = `${shelfCode}-${topLayerStr}-01`;
            const topSpec = this.findTopLocationSpec(shelfLength, shelfDepth);
            newLocations.push({
                locationCode: topLocationCode,
                name: topLocationCode,
                area: area,
                department: department,
                type: "分拣位",
                logicalArea: "",
                separatePacking: "",
                marketAttribute: "常规",
                canOut: "否",
                canIn: "否",
                sortingPriority: priority,
                putawayPriority: "",
                replenishPriority: "",
                mixBatch: "是",
                mixSupplier: "是",
                storageType: "拆零",
                backgroundCategory: "",
                locationSpecName: this.getLocationSpecName(topSpec),
                locationBand: "",
                batchCode: "",
                normShort: ""
            });
        }

        return newLocations;
    }

    analyzeExistingLocations(existingLocations, newLocations, shelfCode, layerCount, layerLocationSettings,
                              shelfLength, shelfDepth, generateTop, startLayerOffset) {
        const existingChanges = [];
        const newSet = new Set(newLocations.map(l => l.locationCode));
        const deletedLocations = [];

        existingLocations.forEach(existing => {
            const locationCode = existing['库位编码'];
            if (newSet.has(locationCode)) {
                const newLocation = newLocations.find(l => l.locationCode === locationCode);
                const existingSpec = this.parseLocationSpec(existing['库位规格名称']);
                const newSpec = this.parseLocationSpec(newLocation.locationSpecName);
                if (existingSpec.name !== newSpec.name) {
                    existingChanges.push({
                        '仓库名称': existing['所属部门'],
                        '库位号': existing['库位编码'],
                        '名称': existing['库位编码'],
                        '分拣排序': existing['分拣优先级'] || '',
                        '上架排序': '',
                        '逻辑区名称': '',
                        '单独打包分区编号': '',
                        '库位规格名称': newLocation.locationSpecName,
                        '库位BAND': '',
                        '批次码库位': '',
                        '常温短保品库位': ''
                    });
                }
            } else {
                const parts = locationCode.split('-');
                if (parts.length === 5) {
                    const [zone, area, shelf, layer, position] = parts;
                    if (!/^\d{2}$/.test(area) || !/^\d{2}$/.test(shelf) || layer === "DD" || !/^\d{2}$/.test(layer) || !/^\d{2}$/.test(position)) return;
                    const layerNum = parseInt(layer);
                    const positionNum = parseInt(position);
                    let shouldDelete = false;
                    const minLayer = startLayerOffset;
                    const maxLayer = startLayerOffset + layerCount - 1;
                    const topExpectedLayer = generateTop ? startLayerOffset + layerCount : null;

                    if (layerNum === topExpectedLayer) {
                        if (positionNum !== 1 || !generateTop) shouldDelete = true;
                    } else if (layerNum > (generateTop ? topExpectedLayer : maxLayer)) {
                        shouldDelete = true;
                    } else if (layerNum >= minLayer && layerNum <= maxLayer) {
                        const internalLayer = layerNum - startLayerOffset + 1;
                        if (positionNum > layerLocationSettings[internalLayer]) shouldDelete = true;
                    } else {
                        shouldDelete = true;
                    }

                    if (shouldDelete) {
                        deletedLocations.push({
                            locationCode: locationCode,
                            reason: OP_TEXT.deleteReason.replace('{layer}', layer).replace('{pos}', position)
                        });
                    }
                }
            }
        });

        if (generateTop) {
            const topExpectedLayer = startLayerOffset + layerCount;
            const topLayerStr = topExpectedLayer.toString().padStart(2, '0');
            const topLocationCode = `${shelfCode}-${topLayerStr}-01`;
            const existingTop = existingLocations.find(l => l['库位编码'] === topLocationCode);
            const newTop = newLocations.find(l => l.locationCode === topLocationCode);
            if (existingTop && newTop) {
                const existingSpec = this.parseLocationSpec(existingTop['库位规格名称']);
                const newSpec = this.parseLocationSpec(newTop.locationSpecName);
                if (existingSpec.name !== newSpec.name) {
                    const alreadyExists = existingChanges.some(c => c['库位号'] === topLocationCode);
                    if (!alreadyExists) {
                        existingChanges.push({
                            '仓库名称': existingTop['所属部门'],
                            '库位号': existingTop['库位编码'],
                            '名称': existingTop['库位编码'],
                            '分拣排序': existingTop['分拣优先级'] || '',
                            '上架排序': '',
                            '逻辑区名称': '',
                            '单独打包分区编号': '',
                            '库位规格名称': newTop.locationSpecName,
                            '库位BAND': '',
                            '批次码库位': '',
                            '常温短保品库位': ''
                        });
                    }
                }
            }
        }

        return {
            existingChanges: existingChanges,
            newLocations: newLocations.filter(l => !existingLocations.some(ex => ex['库位编码'] === l.locationCode)),
            deletedLocations: deletedLocations
        };
    }

    calculateShelfSpec(locations) {
        let shelfLength = 0, shelfDepth = 0, shelfHeight = 0, hasTop = false;

        const topLocations = locations.filter(l => {
            const spec = this.parseLocationSpec(l['库位规格名称']);
            return spec.type === 'top';
        });

        if (topLocations.length > 0) {
            const topSpec = this.parseLocationSpec(topLocations[0]['库位规格名称']);
            shelfLength = topSpec.l;
            shelfDepth = topSpec.d;
            hasTop = true;
        } else {
            let firstLayerKey = null;
            let firstLayerNum = Infinity;
            locations.forEach(l => {
                const parts = l['库位编码'].split('-');
                if (parts.length >= 4) {
                    const n = parseInt(parts[3]);
                    if (!isNaN(n) && n < firstLayerNum) {
                        firstLayerNum = n;
                        firstLayerKey = parts[3];
                    }
                }
            });

            if (firstLayerKey !== null) {
                const firstLayerLocs = locations.filter(l => l['库位编码'].split('-')[3] === firstLayerKey);
                let layerLength = 0;
                firstLayerLocs.forEach(l => {
                    const spec = this.parseLocationSpec(l['库位规格名称']);
                    if (spec.l > 0) layerLength += spec.l;
                    if (shelfDepth === 0 && spec.d > 0) shelfDepth = spec.d;
                });
                shelfLength = layerLength + 20;
            }
        }

        const layerMap = {};
        locations.forEach(l => {
            const spec = this.parseLocationSpec(l['库位规格名称']);
            if (spec.type === 'top') return;
            if (spec.h <= 0) return;
            const parts = l['库位编码'].split('-');
            if (parts.length >= 4) {
                const layer = parts[3];
                if (!layerMap[layer]) layerMap[layer] = [];
                layerMap[layer].push(l);
            }
        });
        Object.keys(layerMap).forEach(layer => {
            if (layerMap[layer].length > 0) {
                const spec = this.parseLocationSpec(layerMap[layer][0]['库位规格名称']);
                if (spec.h > 0) shelfHeight += spec.h;
            }
        });

        return {
            length: shelfLength,
            depth: shelfDepth,
            height: shelfHeight,
            hasTop: hasTop,
            availableLength: this.getAvailableInnerLength(shelfLength)
        };
    }

    calculateShelfSpecs() {
        this.app.data.shelfSpecMap = new Map();
        const shelfGroups = {};
        this.app.data.shelfData.forEach(item => {
            const locationCode = item['库位编码'];
            if (!locationCode) return;
            const parts = locationCode.split('-');
            if (parts.length < 3) return;
            const shelfCode = `${parts[0]}-${parts[1]}-${parts[2]}`;
            if (!shelfGroups[shelfCode]) shelfGroups[shelfCode] = [];
            shelfGroups[shelfCode].push(item);
        });

        Object.keys(shelfGroups).forEach(shelfCode => {
            const locations = shelfGroups[shelfCode];
            try {
                const spec = this.calculateShelfSpec(locations);
                const firstLoc = locations.find(l => l['库位编码'].endsWith('-01-01'));
                if (firstLoc && firstLoc['分拣优先级']) {
                    spec.priority = firstLoc['分拣优先级'];
                } else {
                    const withPriority = locations.find(l => l['分拣优先级']);
                    spec.priority = withPriority ? withPriority['分拣优先级'] : '';
                }
                this.app.data.shelfSpecMap.set(shelfCode, spec);
            } catch (error) {
                console.error(`计算货架${shelfCode}规格时出错:`, error);
                this.app.data.shelfSpecMap.set(shelfCode, {
                    length: 0, depth: 0, height: 0, hasTop: false, priority: ''
                });
            }
        });
    }

    /**
     * 提取货架的标准层集合与顶层信息
     * @param {Array<Object>} locations
     * @returns {{layers:Set<number>, minLayer:number|null, maxLayer:number|null, topLayer:number|null}}
     */
    _extractShelfLayerInfo(locations) {
        const layers = new Set();
        let topLayer = null;
        locations.forEach(loc => {
            const parts = loc['库位编码'].split('-');
            if (parts.length < 4) return;
            const layerNum = parseInt(parts[3], 10);
            if (isNaN(layerNum)) return;
            const spec = this.parseLocationSpec(loc['库位规格名称']);
            if (spec.type === 'top') {
                if (topLayer === null || layerNum < topLayer) topLayer = layerNum;
            } else {
                layers.add(layerNum);
            }
        });
        const arr = [...layers].sort((a, b) => a - b);
        return {
            layers: layers,
            minLayer: arr.length ? arr[0] : null,
            maxLayer: arr.length ? arr[arr.length - 1] : null,
            topLayer: topLayer
        };
    }

    // ==================== 调层参数组装 ====================

    /**
     * 查每层格子数映射（按货架长度）
     * @param {number} shelfLength
     * @returns {number|null}
     */
    _getMappedLayerSize(shelfLength) {
        const map = this.LAYER_SIZE_MAP;
        if (map[shelfLength] !== undefined) return map[shelfLength];
        const keys = Object.keys(map).map(Number).filter(k => k <= shelfLength).sort((a, b) => b - a);
        if (keys.length > 0) return map[keys[0]];
        return null;
    }

    /**
     * 取已选货架的默认每层格数
     * @returns {number|null}
     */
    _getDefaultLayerSizeForShelves() {
        if (this.app.data.selectedShelves.length === 0) return null;
        const firstShelf = this.app.data.selectedShelves[0];
        const spec = this.app.data.shelfSpecMap.get(firstShelf.code);
        if (!spec || !spec.length) return null;
        return this._getMappedLayerSize(spec.length);
    }

    /**
     * 计算某货架某层的现有标准库位数（排除顶层）
     * @param {Array<Object>} locations
     * @param {number} actualLayer
     * @returns {number}
     */
    _countLayerLocations(locations, actualLayer) {
        const layerStr = actualLayer.toString().padStart(2, '0');
        return locations.filter(loc => {
            const parts = loc['库位编码'].split('-');
            if (parts.length < 4 || parts[3] !== layerStr) return false;
            const spec = this.parseLocationSpec(loc['库位规格名称']);
            return spec.type !== 'top';
        }).length;
    }

    /**
     * 调层模式：根据现有数据和目标层数组装 layerLocationSettings
     * @param {Object} shelf
     * @param {number} targetCount
     * @param {boolean} copyFirstLayerSize
     * @returns {{settings:Object, minLayer:number, targetMax:number}|null}
     */
    _buildAdjustLayerSettings(shelf, targetCount, copyFirstLayerSize = false) {
        const locations = shelf.locations;
        const info = this._extractShelfLayerInfo(locations);
        const existingLayers = info.layers;
        if (existingLayers.size === 0) return null;

        if (targetCount < existingLayers.size) {
            throw new Error(OP_TEXT.err_targetLessThanExisting
                .replace('{target}', targetCount)
                .replace('{existing}', existingLayers.size));
        }

        const minLayer = info.minLayer;
        const targetMax = minLayer + targetCount - 1;

        const spec = this.app.data.shelfSpecMap.get(shelf.code);
        if (!spec) return null;

        let defaultSize;
        if (copyFirstLayerSize) {
            const firstLayerSize = this._countLayerLocations(locations, minLayer);
            defaultSize = firstLayerSize > 0 ? firstLayerSize : 1;
        } else {
            const mappedCount = this._getMappedLayerSize(spec.length);
            if (!mappedCount) {
                throw new Error(OP_TEXT.err_noLayerSizeMap.replace('{len}', spec.length));
            }
            defaultSize = mappedCount;
        }

        const settings = {};
        for (let i = 1; i <= targetCount; i++) {
            const actualLayer = minLayer + i - 1;
            if (existingLayers.has(actualLayer)) {
                const count = this._countLayerLocations(locations, actualLayer);
                settings[i] = count > 0 ? count : defaultSize;
            } else {
                settings[i] = defaultSize;
            }
        }

        return { settings, minLayer, targetMax };
    }

    // ==================== Excel 处理 ====================

    processExcelData(data) {
        if (data.length < 2) {
            this.app.showMessage(OP_TEXT.msg_dataFormatError, 'error');
            return false;
        }
        const headers = data[0].map(h => String(h).trim());
        const requiredHeaders = ['库位号', '所属部门', '库位类型', '库位规格名称', '分拣排序'];
        const headerIndex = {};
        headers.forEach((h, i) => { headerIndex[h] = i; });

        const missing = requiredHeaders.filter(rh => !(rh in headerIndex));
        if (missing.length > 0) {
            this.app.showMessage(OP_TEXT.msg_missingColumns.replace('{cols}', missing.join('、')), 'error');
            return false;
        }

        const deptPattern = (this.app.validations && this.app.validations.departmentPattern)
            || /^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/;

        const idxCode = headerIndex['库位号'];
        const idxDept = headerIndex['所属部门'];
        const idxType = headerIndex['库位类型'];
        const idxSpec = headerIndex['库位规格名称'];
        const idxPriority = headerIndex['分拣排序'];
        const idxArea = headerIndex['库区'];

        this.app.data.shelfData = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const department = row[idxDept] || '';
            if (!deptPattern.test(department)) continue;

            const locationType = String(row[idxType] || '').trim();
            if (locationType !== '分拣位') continue;

            const locationCode = row[idxCode] || '';
            if (!this.app.validateLocationCode(locationCode)) continue;

            const parts = String(locationCode).split('-');
            if (parts[3] === 'DD') continue;

            this.app.data.shelfData.push({
                '库位编码': locationCode,
                '所属部门': department,
                '所属库区': idxArea !== undefined ? (row[idxArea] || '') : '',
                '库位规格名称': row[idxSpec] || '',
                '分拣优先级': row[idxPriority] || ''
            });
        }

        if (this.app.data.shelfData.length === 0) {
            this.app.showMessage(OP_TEXT.msg_noValidLocations, 'error');
            return false;
        }

        this.app.data.currentWarehouse = this.app.data.shelfData[0]['所属部门'] || '';
        const warehouseEl = document.getElementById('uploadedWarehouse');
        if (warehouseEl) warehouseEl.textContent = this.app.data.currentWarehouse || OP_TEXT.msg_noWarehouse;

        this.calculateShelfSpecs();
        this.populateShelfSelection();
        return true;
    }

    // ==================== 导出 ====================

    generateExistingChangesWorkbook() {
        const workbook = XLSX.utils.book_new();
        const data = [
            CORE_HEADERS.locationChange
        ];
        this.app.data.optimizationResult.existingChanges.forEach(change => {
            data.push([
                change['仓库名称'] || '',
                change['库位号'],
                change['名称'] || change['库位号'],
                OP_TEXT.export_yesNo,
                OP_TEXT.export_yesNo,
                change['分拣排序'] || '',
                change['上架排序'] || '',
                change['逻辑区名称'] || '',
                change['单独打包分区编号'] || '',
                change['库位规格名称'] || '',
                change['库位BAND'] || '',
                change['批次码库位'] || '',
                change['常温短保品库位'] || ''
            ]);
        });
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, '批量更改');
        return workbook;
    }

    generateNewLocationsWorkbook() {
        const workbook = XLSX.utils.book_new();
        const data = [CORE_HEADERS.locationNew];
        this.app.data.optimizationResult.newLocations.forEach(location => {
            data.push([
                location.locationCode, location.name, location.area, location.department, location.type,
                location.logicalArea, location.separatePacking, location.marketAttribute, location.canOut,
                location.canIn, location.sortingPriority, location.putawayPriority, location.replenishPriority,
                location.mixBatch, location.mixSupplier, location.storageType, location.backgroundCategory,
                location.locationSpecName, location.locationBand, location.batchCode, location.normShort,
                OP_TEXT.export_emptyField
            ]);
        });
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, '新增库位');
        return workbook;
    }

    generateDeletedLocationsWorkbook() {
        const workbook = XLSX.utils.book_new();
        const data = [
            CORE_HEADERS.locationDeleted
        ];
        this.app.data.optimizationResult.deletedLocations.forEach(d => {
            data.push([d.locationCode, d.reason || '']);
        });
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, '删除库位');
        return workbook;
    }

    getExportFilePrefix() {
        const shelfCodes = this.app.data.selectedShelves.map(s => s.code).join('_');
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const mode = this._getMode();
        const modePrefix = mode === 'adjust' ? '调层'
                         : mode === 'copyFirstLayer' ? '复制加层'
                         : '货架优化';
        return { shelfCodes, dateStr, timeStr, modePrefix };
    }

    // ==================== 累积 / 冲突 ====================

    _extractShelfSet(result) {
        const set = new Set();
        const addFromCode = (code) => {
            if (!code) return;
            const parts = String(code).split('-');
            if (parts.length >= 3) set.add(parts.slice(0, 3).join('-'));
        };
        (result.existingChanges || []).forEach(c => addFromCode(c['库位号']));
        (result.newLocations || []).forEach(l => addFromCode(l.locationCode));
        (result.deletedLocations || []).forEach(l => addFromCode(l.locationCode));
        return set;
    }

    _filterByShelfSet(result, shelfSet, keep) {
        const check = (code) => {
            if (!code) return !keep;
            const parts = String(code).split('-');
            if (parts.length < 3) return !keep;
            const shelf = parts.slice(0, 3).join('-');
            return keep ? shelfSet.has(shelf) : !shelfSet.has(shelf);
        };
        return {
            existingChanges: (result.existingChanges || []).filter(c => check(c['库位号'])),
            newLocations: (result.newLocations || []).filter(l => check(l.locationCode)),
            deletedLocations: (result.deletedLocations || []).filter(l => check(l.locationCode))
        };
    }

    _mergeIntoAccumulated(target, source) {
        target.existingChanges.push(...source.existingChanges);
        target.newLocations.push(...source.newLocations);
        target.deletedLocations.push(...source.deletedLocations);
    }

    _hasAccumulatedResult() {
        const r = this.app.data.optimizationResult;
        if (!r) return false;
        return r.existingChanges.length > 0 || r.newLocations.length > 0 || r.deletedLocations.length > 0;
    }

    _accumulateResult(newResult) {
        if (!this.app.data.optimizationResult) {
            this.app.data.optimizationResult = { existingChanges: [], newLocations: [], deletedLocations: [] };
        }
        const acc = this.app.data.optimizationResult;

        const newShelves = this._extractShelfSet(newResult);
        const oldShelves = this._extractShelfSet(acc);
        const conflicts = [...newShelves].filter(s => oldShelves.has(s));

        if (conflicts.length === 0) {
            this._mergeIntoAccumulated(acc, newResult);
            this._afterAccumulate(0, 'merge');
            return { ok: true };
        }

        this._showConflictDialog(conflicts, newResult, acc);
        return { ok: false, pending: true };
    }

    async _showConflictDialog(conflicts, newResult, acc) {
        const shown = conflicts.slice(0, 20);
        const more = conflicts.length > 20 ? `<li style="color:var(--text-muted);">...（共 ${conflicts.length} 个，仅显示前 20）</li>` : '';
        const listHtml = shown.map(s => `<li style="font-family:monospace;">${this.app.escapeHtml(s)}</li>`).join('') + more;

        const content = `
            <p>以下货架本次要优化，但已经存在于累积方案中：</p>
            <ul style="max-height:200px;overflow-y:auto;margin:12px 0;padding-left:20px;line-height:1.8;">
                ${listHtml}
            </ul>
            <div style="margin-top:16px;font-size:14px;color:var(--text-muted);line-height:1.9;">
                <div><strong>覆盖冲突货架</strong>：用本次结果替换累积里这些货架的记录</div>
                <div><strong>放弃冲突货架</strong>：忽略本次这些货架，其余货架照常追加</div>
                <div><strong>取消</strong>：放弃本次全部结果，返回编辑</div>
            </div>
        `;

        const action = await this.app.choose(OP_TEXT.modal_conflictTitle, content, [
            { label: '覆盖冲突货架', class: 'btn-warning', value: 'override' },
            { label: '放弃冲突货架', class: 'btn-secondary', value: 'skip' },
            { label: '取消', class: 'btn-secondary', value: 'cancel' },
        ]);

        if (action === 'cancel') {
            this.app.showMessage(OP_TEXT.msg_generateCanceled, 'info');
            return;
        }

        const conflictSet = new Set(conflicts);

        if (action === 'override') {
            const cleanedAcc = this._filterByShelfSet(acc, conflictSet, false);
            this.app.data.optimizationResult = cleanedAcc;
            this._mergeIntoAccumulated(this.app.data.optimizationResult, newResult);
            this._afterAccumulate(conflicts.length, 'override');
        } else if (action === 'skip') {
            const filtered = this._filterByShelfSet(newResult, conflictSet, false);
            this._mergeIntoAccumulated(this.app.data.optimizationResult, filtered);
            this._afterAccumulate(conflicts.length, 'skip');
        }
    }

    _afterAccumulate(conflictCount, action) {
        this.displayOptimizationResults();
        this._updateSectionsState();
        const resultsSec = document.getElementById('resultsSection');
        if (resultsSec) resultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (action === 'override') {
            this.app.showMessage(OP_TEXT.msg_overrideDone.replace('{n}', conflictCount), 'success');
        } else if (action === 'skip') {
            this.app.showMessage(OP_TEXT.msg_skipDone.replace('{n}', conflictCount), 'success');
        } else if (action === 'merge') {
            const r = this.app.data.optimizationResult;
            const shelfCount = this._extractShelfSet(r).size;
            this.app.showMessage(`已累积 ${shelfCount} 个货架`, 'success');
        }
    }

    // ==================== 方案管理 ====================

    openSchemeManager() {
        if (!this._hasAccumulatedResult()) {
            this.app.showMessage(OP_TEXT.msg_noAccumulated, 'info');
            return;
        }
        this._renderSchemeManager();
    }

    _renderSchemeManager() {
        const acc = this.app.data.optimizationResult;
        const shelfStats = new Map();

        const bump = (code, field) => {
            if (!code) return;
            const parts = String(code).split('-');
            if (parts.length < 3) return;
            const shelf = parts.slice(0, 3).join('-');
            if (!shelfStats.has(shelf)) shelfStats.set(shelf, { add: 0, change: 0, del: 0 });
            shelfStats.get(shelf)[field]++;
        };

        acc.existingChanges.forEach(c => bump(c['库位号'], 'change'));
        acc.newLocations.forEach(l => bump(l.locationCode, 'add'));
        acc.deletedLocations.forEach(l => bump(l.locationCode, 'del'));

        const sortedShelves = [...shelfStats.entries()].sort((a, b) => a[0].localeCompare(b[0]));

        const rowsHtml = sortedShelves.map(([shelf, s]) =>
            `<tr>
                <td style="font-family:monospace;">${this.app.escapeHtml(shelf)}</td>
                <td>${s.add}</td>
                <td>${s.change}</td>
                <td>${s.del}</td>
                <td><button class="btn btn-secondary sm-btn" data-del="${this.app.escapeHtml(shelf)}">删除</button></td>
            </tr>`
        ).join('');

        const content = `
            <div style="max-height:60vh;overflow:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #e0e0e0;">货架号</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #e0e0e0;">新增</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #e0e0e0;">更改</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #e0e0e0;">删除</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #e0e0e0;">操作</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

        const controls = document.createElement('div');
        controls.className = 'btn-row';
        controls.style.marginBottom = '0';

        const btnClearAll = document.createElement('button');
        btnClearAll.className = 'btn btn-danger';
        btnClearAll.textContent = '全部清空';

        const btnClose = document.createElement('button');
        btnClose.className = 'btn btn-secondary';
        btnClose.textContent = '关闭';

        const closeModal = () => {
            document.getElementById('commonModal').style.display = 'none';
        };

        btnClose.addEventListener('click', closeModal);
        btnClearAll.addEventListener('click', () => this._confirmClearAll());

        controls.appendChild(btnClearAll);
        controls.appendChild(btnClose);

        this.app.showModal(OP_TEXT.modal_schemeManager, content, controls);

        document.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', () => {
                const shelf = btn.dataset.del;
                const set = new Set([shelf]);
                const cleaned = this._filterByShelfSet(acc, set, false);
                this.app.data.optimizationResult = cleaned;
                if (!this._hasAccumulatedResult()) {
                    closeModal();
                    this._clearResultUI();
                    this.app.showMessage(OP_TEXT.msg_schemeCleared, 'success');
                    return;
                }
                this.displayOptimizationResults();
                this._renderSchemeManager();
            });
        });
    }

    async _confirmClearAll() {
        const ok = await this.app.confirm(
            OP_TEXT.modal_clearConfirm,
            '<p>确定清空全部累积方案？</p><p style="color:var(--danger);margin-top:8px;">此操作不可撤销。</p>',
            { okText: '确认清空', okClass: 'btn-danger', cancelText: '取消' }
        );
        if (!ok) return;
        this.app.data.optimizationResult = null;
        this._clearResultUI();
        this.app.showMessage(OP_TEXT.msg_allCleared, 'success');
    }

    /** 清空结果表格 + 状态 + 刷新区块显隐 */
    _clearResultUI() {
        this.clearOptimizationResults();
        this._updateResultStatus();
        this._updateSectionsState();
    }

    _updateResultStatus() {
        const statusEl = document.getElementById('optResultStatus');
        if (!statusEl) return;
        const r = this.app.data.optimizationResult;
        if (!r) {
            statusEl.textContent = '';
            return;
        }
        statusEl.textContent = OP_TEXT.status_accumulated
            .replace('{add}', r.newLocations.length)
            .replace('{change}', r.existingChanges.length)
            .replace('{del}', r.deletedLocations.length);
    }

    // ==================== 启用/禁用控制 ====================

    _setShelfSelectionEnabled(enabled) {
        document.querySelectorAll('#shelfCheckboxContainer input[type="checkbox"]').forEach(cb => {
            cb.disabled = !enabled;
        });
        document.querySelectorAll('#shelfCheckboxContainer .shelf-checkbox').forEach(div => {
            if (!enabled) div.classList.add('disabled');
        });
        ['optSelectAllBtn', 'optDeselectAllBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
        const areaSelect = document.getElementById('optAreaSelect');
        if (areaSelect && !areaSelect.classList.contains('hidden')) {
            areaSelect.disabled = !enabled;
        }
    }

    _setParamsEnabled(enabled) {
        ['layerCount', 'locationsPerLayer', 'startLayerOffset',
         'shelfLengthInput', 'shelfDepthInput', 'generateBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
    }

    _syncLayerSizeDefaults() {
        const mode = this._getMode();
        if (mode === 'batch') {
            const el = document.getElementById('locationsPerLayer');
            if (el) {
                const defaultSize = this._getDefaultLayerSizeForShelves();
                el.value = defaultSize !== null ? String(defaultSize) : '';
            }
        } else if (mode === 'individual') {
            const layerCount = parseInt(document.getElementById('layerCount').value);
            if (!isNaN(layerCount) && layerCount >= 1) {
                this._createLayerInputs(layerCount);
            }
        }
    }

    // ==================== 参数准备 / 单货架处理 ====================

    _getParamsForShelf(shelf) {
        const mode = this._getMode();
        const shelfSpec = this.app.data.shelfSpecMap.get(shelf.code);
        const department = shelf.locations[0]['所属部门'] || '';
        const areaParts = shelf.code.split('-');
        const area = `${areaParts[0]}-${areaParts[1]}`;
        const priority = shelfSpec ? (shelfSpec.priority || '') : '';

        if (mode === 'adjust' || mode === 'copyFirstLayer') {
            if (!shelfSpec || !shelfSpec.length || !shelfSpec.depth) {
                throw new Error(OP_TEXT.err_cannotCalcSpec.replace('{code}', shelf.code));
            }
            const targetCount = parseInt(document.getElementById('layerCount').value);
            const copyFirst = mode === 'copyFirstLayer';
            const layerInfo = this._buildAdjustLayerSettings(shelf, targetCount, copyFirst);
            if (!layerInfo) {
                throw new Error(OP_TEXT.err_noStandardLayer.replace('{code}', shelf.code));
            }
            const generateTop = shelf.locations.some(loc =>
                this.parseLocationSpec(loc['库位规格名称']).type === 'top'
            );
            return {
                department, area, priority,
                layerCount: targetCount,
                layerLocationSettings: layerInfo.settings,
                shelfLength: shelfSpec.length,
                shelfDepth: shelfSpec.depth,
                generateTop,
                startLayerOffset: layerInfo.minLayer
            };
        }

        const generateTop = document.getElementById('generateTopCheckbox').checked;
        const lengthInput = document.getElementById('shelfLengthInput');
        const depthInput = document.getElementById('shelfDepthInput');
        const shelfLength = parseInt(lengthInput.value);
        const shelfDepth = parseInt(depthInput.value);
        let startLayerOffset = parseInt(document.getElementById('startLayerOffset')?.value || '1');
        if (isNaN(startLayerOffset)) startLayerOffset = 1;
        const layerCount = parseInt(document.getElementById('layerCount').value);
        const layerLocationSettings = this.app.getLayerLocationSettings();
        return {
            department, area, priority,
            layerCount, layerLocationSettings,
            shelfLength, shelfDepth,
            generateTop, startLayerOffset
        };
    }

    _processOneShelf(shelf, p) {
        const newLocations = this.generateShelfLocations(
            shelf.code, p.department, p.area, p.priority,
            p.layerCount, p.layerLocationSettings,
            p.shelfLength, p.shelfDepth,
            p.generateTop, p.startLayerOffset
        );
        return this.analyzeExistingLocations(
            shelf.locations, newLocations, shelf.code,
            p.layerCount, p.layerLocationSettings,
            p.shelfLength, p.shelfDepth,
            p.generateTop, p.startLayerOffset
        );
    }

    _runOverShelves() {
        const allResults = { existingChanges: [], newLocations: [], deletedLocations: [] };
        const failures = [];
        for (const shelf of this.app.data.selectedShelves) {
            try {
                const p = this._getParamsForShelf(shelf);
                if (!p) continue;
                const analysis = this._processOneShelf(shelf, p);
                allResults.existingChanges.push(...analysis.existingChanges);
                allResults.newLocations.push(...analysis.newLocations);
                allResults.deletedLocations.push(...analysis.deletedLocations);
            } catch (err) {
                failures.push({ code: shelf.code, message: err.message });
            }
        }
        return { allResults, failures };
    }

    _showFailuresIfAny(failures, allResults) {
        if (failures.length === 0) return;
        const lines = failures.slice(0, 30).map(f =>
            `<li><b>${this.app.escapeHtml(f.code)}</b>：${this.app.escapeHtml(f.message)}</li>`
        ).join('');
        const more = failures.length > 30 ? `<li>...（共 ${failures.length} 个失败）</li>` : '';
        const tail = (allResults.newLocations.length + allResults.existingChanges.length + allResults.deletedLocations.length > 0)
            ? '<p style="margin-top:12px">其余货架的处理结果已累积。</p>' : '';
        this.app.showModal('部分货架处理失败', `<ul style="line-height:1.9">${lines}${more}</ul>${tail}`);
    }

    // ==================== 事件绑定 ====================

    bindEvents() {
        document.getElementById('generateBtn')?.addEventListener('click', () => this.generateOptimization());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportResults());
        document.getElementById('exportZipBtn')?.addEventListener('click', () => this.exportZip());
        document.getElementById('optResetBtn')?.addEventListener('click', () => this.resetAll());
        document.getElementById('optSelectAllBtn')?.addEventListener('click', () => this.selectAll());
        document.getElementById('optDeselectAllBtn')?.addEventListener('click', () => this.deselectAll());
        document.getElementById('layoutPreviewBtn')?.addEventListener('click', () => this.showLayoutPreview());
        document.getElementById('schemeManagerBtn')?.addEventListener('click', () => this.openSchemeManager());

        const batchOption = document.getElementById('batchModeOption');
        const individualOption = document.getElementById('individualModeOption');
        const adjustOption = document.getElementById('adjustModeOption');
        const copyFirstOption = document.getElementById('copyFirstLayerModeOption');
        const options = [batchOption, individualOption, adjustOption, copyFirstOption].filter(Boolean);

        const modeHandler = (e) => {
            const label = e.currentTarget;
            options.forEach(opt => opt.classList.remove('selected'));
            label.classList.add('selected');
            label.querySelector('input').checked = true;

            this._applyModeUI();
            if (this.app.data.selectedShelves.length > 0) {
                this.updateSelectedShelves();
            }
            this._syncLayerSizeDefaults();
            this._updateSectionsState();
        };

        options.forEach(opt => opt.addEventListener('click', modeHandler));

        document.getElementById('layerCount')?.addEventListener('input', () => {
            if (this._getMode() === 'individual') {
                this._createLayerInputs(parseInt(document.getElementById('layerCount').value));
            }
        });
        document.getElementById('startLayerOffset')?.addEventListener('change', () => {
            if (this._getMode() === 'individual') {
                this._createLayerInputs(parseInt(document.getElementById('layerCount').value));
            }
        });

        ['layerCount', 'locationsPerLayer', 'startLayerOffset'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this._validateNumberInput(el));
        });
    }

    _applyModeUI() {
        const mode = this._getMode();
        const layerCount = document.getElementById('layerCount');
        const layerCountLabel = document.querySelector('label[for="layerCount"]');
        const locationsPerLayerGroup = document.getElementById('locationsPerLayerGroup');
        const individualLayer = document.getElementById('individualLayerLocations');
        const startOffsetInput = document.getElementById('startLayerOffset');
        const lengthInput = document.getElementById('shelfLengthInput');
        const depthInput = document.getElementById('shelfDepthInput');
        const areaSelect = document.getElementById('optAreaSelect');
        const topRow = document.getElementById('generateTopRow');
        const topHint = document.getElementById('generateTopHint');

        if (mode === null) {
            this._setShelfSelectionEnabled(false);
            if (locationsPerLayerGroup) locationsPerLayerGroup.classList.add('hidden');
            if (individualLayer) individualLayer.classList.add('hidden');
            if (areaSelect) areaSelect.classList.add('hidden');
            this._setParamsEnabled(false);
            return;
        }

        this._setShelfSelectionEnabled(true);
        this._setParamsEnabled(true);

        if (mode === 'adjust' || mode === 'copyFirstLayer') {
            if (layerCountLabel) layerCountLabel.textContent = OP_TEXT.label_targetLayerCount;
            if (layerCount) { layerCount.min = '2'; layerCount.max = '12'; }
            if (locationsPerLayerGroup) locationsPerLayerGroup.classList.add('hidden');
            if (individualLayer) individualLayer.classList.add('hidden');
            if (areaSelect) areaSelect.classList.remove('hidden');
            if (startOffsetInput) {
                startOffsetInput.readOnly = true;
                startOffsetInput.value = '';
                startOffsetInput.placeholder = OP_TEXT.ph_startLayerPerShelf;
            }
            if (lengthInput) {
                lengthInput.readOnly = true;
                lengthInput.value = '';
                lengthInput.placeholder = OP_TEXT.ph_shelfLengthAdjust;
            }
            if (depthInput) {
                depthInput.readOnly = true;
                depthInput.value = '';
                depthInput.placeholder = OP_TEXT.ph_shelfDepthAdjust;
            }
            if (topRow) topRow.classList.add('hidden');
            if (topHint) topHint.classList.remove('hidden');
            this._clearShelfSpecValidation();
        } else {
            const isBatch = mode === 'batch';
            if (layerCountLabel) layerCountLabel.textContent = OP_TEXT.label_layerCount;
            if (layerCount) { layerCount.min = '2'; layerCount.max = '12'; }
            if (locationsPerLayerGroup) locationsPerLayerGroup.classList.toggle('hidden', !isBatch);
            if (individualLayer) individualLayer.classList.toggle('hidden', isBatch);
            if (areaSelect) areaSelect.classList.add('hidden');
            if (startOffsetInput) {
                startOffsetInput.readOnly = false;
                if (!startOffsetInput.value) startOffsetInput.value = '1';
                startOffsetInput.placeholder = '';
            }
            if (lengthInput) {
                lengthInput.readOnly = false;
                if (!lengthInput.value) lengthInput.value = '120';
                lengthInput.placeholder = '';
            }
            if (depthInput) {
                depthInput.readOnly = false;
                if (!depthInput.value) depthInput.value = '40';
                depthInput.placeholder = '';
            }
            if (topRow) topRow.classList.remove('hidden');
            if (topHint) topHint.classList.add('hidden');
            this._validateShelfSpecInputs();
        }
    }

    _clearShelfSpecValidation() {
        const lengthInput = document.getElementById('shelfLengthInput');
        const depthInput = document.getElementById('shelfDepthInput');
        const lengthMsg = document.getElementById('shelfLengthValidation');
        const depthMsg = document.getElementById('shelfDepthValidation');
        const generateBtn = document.getElementById('generateBtn');
        if (lengthInput) lengthInput.classList.remove('validation-invalid', 'validation-valid');
        if (depthInput) depthInput.classList.remove('validation-invalid', 'validation-valid');
        if (lengthMsg) { lengthMsg.textContent = ''; lengthMsg.className = 'validation-message'; }
        if (depthMsg) { depthMsg.textContent = ''; depthMsg.className = 'validation-message'; }
        if (generateBtn) generateBtn.disabled = false;
    }

    _createLayerInputs(layerCount) {
        const container = document.getElementById('layerLocationInputs');
        if (!container) return;
        container.innerHTML = '';
        const startOffset = parseInt(document.getElementById('startLayerOffset')?.value || '1');
        const defaultSize = this._getDefaultLayerSizeForShelves();
        const inputValue = defaultSize !== null ? String(defaultSize) : '9';
        for (let i = 1; i <= layerCount; i++) {
            const actualLayer = i + startOffset - 1;
            const div = document.createElement('div');
            div.className = 'layer-location-input';
            const label = document.createElement('label');
            label.textContent = OP_TEXT.label_layerLocation.replace('{n}', actualLayer);
            label.setAttribute('for', `layerLocation_${i}`);
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `layerLocation_${i}`;
            input.value = inputValue;
            input.className = 'layer-location-input-field';
            input.addEventListener('input', () => this._validateNumberInput(input));
            div.appendChild(label);
            div.appendChild(input);
            container.appendChild(div);
        }
    }

    _validateNumberInput(input) {
        const v = String(input.value).trim();
        if (v === '') {
            input.classList.remove('validation-invalid');
            return;
        }
        if (!/^\d{1,2}$/.test(v)) {
            input.classList.add('validation-invalid');
        } else {
            input.classList.remove('validation-invalid');
        }
    }

    _showLoading() {
        const panel = document.getElementById(`panel-${this.id}`);
        if (!panel) return;
        if (document.getElementById('optLoadingOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'optLoadingOverlay';
        overlay.className = 'opt-loading-overlay';
        overlay.innerHTML = `<div class="opt-loading-text">${OP_TEXT.loading}</div>`;
        panel.appendChild(overlay);
    }

    _hideLoading() {
        const overlay = document.getElementById('optLoadingOverlay');
        if (overlay) overlay.remove();
    }

    async handleFileUpload(file) {
        if (this._hasAccumulatedResult()) {
            const shelfCount = this._extractShelfSet(this.app.data.optimizationResult).size;
            await this._confirmUploadWithAccumulated(file, shelfCount);
            return;
        }
        await this._doUpload(file);
    }

    async _confirmUploadWithAccumulated(file, shelfCount) {
        const ok = await this.app.confirm(
            '确认上传',
            `<p>当前有未导出的方案累积（涉及 <strong>${shelfCount}</strong> 个货架）。</p>
             <p style="margin-top:12px;">上传新文件将清空累积记录，是否继续？</p>`,
            { okText: '上传并清空', okClass: 'btn-warning', cancelText: '取消' }
        );
        if (!ok) return;
        this._doUpload(file);
    }

    async _doUpload(file) {
        this._showLoading();
        try {
            const table = await this.app.readExcelTable(file, {
                parseErrorMessage: OP_TEXT.msg_parseFailed,
                tooManyMessage: OP_TEXT.msg_tooManyRows,
            });
            if (!table) return;

            const jsonData = [table.headers, ...table.rows];
            const success = this.processExcelData(jsonData);

            if (success) {
                this.app.data.optimizationResult = null;
                this.app.data.selectedShelves = [];
                this.clearOptimizationResults();
                this._updateResultStatus();
                this._applyModeUI();
                this._updateSectionsState();
                this.app.showMessage(OP_TEXT.msg_parseSuccess, 'success');
            }
        } finally {
            this._hideLoading();
        }
    }
    
    populateShelfSelection() {
        const container = document.getElementById('shelfCheckboxContainer');
        container.innerHTML = '';

        const shelves = [...new Set(this.app.data.shelfData.map(item => {
            const locationCode = item['库位编码'];
            if (locationCode) {
                const parts = locationCode.split('-');
                if (parts.length >= 3) return `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
            return null;
        }).filter(Boolean))].filter(shelfCode => {
            return this.app.data.shelfData.some(item => {
                const code = item['库位编码'];
                if (!code || !code.startsWith(shelfCode)) return false;
                const parts = code.split('-');
                return parts.length >= 4 && parts[3] !== "DD";
            });
        });

        shelves.sort((a, b) => {
            const aParts = a.split('-'), bParts = b.split('-');
            for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
                const aVal = aParts[i], bVal = bParts[i];
                const aNum = parseInt(aVal), bNum = parseInt(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    if (aNum !== bNum) return aNum - bNum;
                } else {
                    if (aVal !== bVal) return aVal.localeCompare(bVal);
                }
            }
            return aParts.length - bParts.length;
        });

        shelves.forEach(shelf => {
            const div = document.createElement('div');
            div.className = 'shelf-checkbox';
            div.dataset.shelf = shelf;
            div.dataset.area = shelf.split('-').slice(0, 2).join('-');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `shelf-${shelf}`;
            checkbox.value = shelf;

            const label = document.createElement('label');
            label.htmlFor = `shelf-${shelf}`;

            const spec = this.app.data.shelfSpecMap.get(shelf);
            const shelfLocations = this.app.data.shelfData.filter(item => {
                const c = item['库位编码'];
                return c && c.startsWith(shelf);
            });

            if (spec && spec.length && spec.depth) {
                const info = this._extractShelfLayerInfo(shelfLocations);
                const layerCount = info.layers.size;
                const holes = spec.height;
                const isAbnormal = holes < 22 || holes > 24;
                const specDesc = this.getShelfSpecDescription(spec.length, spec.depth);

                let firstInfo = '—';
                if (info.minLayer !== null) {
                    const firstCount = this._countLayerLocations(shelfLocations, info.minLayer);
                    firstInfo = `首层${info.minLayer.toString().padStart(2, '0')}层${firstCount}格`;
                }

                let layerInfo = `${layerCount}层`;
                if (layerCount > 0) {
                    const arr = [...info.layers].sort((a, b) => a - b);
                    const isContinuous = arr.every((n, i) => i === 0 || n === arr[i - 1] + 1);
                    if (isContinuous) {
                        layerInfo = `${layerCount}层连续`;
                    } else {
                        const missing = [];
                        for (let i = arr[0]; i < arr[arr.length - 1]; i++) {
                            if (!info.layers.has(i)) missing.push(i.toString().padStart(2, '0'));
                        }
                        layerInfo = `${layerCount}层缺${missing.join(',')}`;
                    }
                }

                const topInfo = info.topLayer !== null
                    ? `顶层${info.topLayer.toString().padStart(2, '0')}层`
                    : '无顶层';

                label.innerHTML = `
                    <span class="shelf-code">${this.app.escapeHtml(shelf)}</span>
                    <span class="shelf-spec-size">${this.app.escapeHtml(specDesc)}</span>
                    <span class="shelf-first-layer">${this.app.escapeHtml(firstInfo)}</span>
                    <span class="shelf-layer-info">${this.app.escapeHtml(layerInfo)}</span>
                    <span class="shelf-top-info">${this.app.escapeHtml(topInfo)}</span>
                    <span class="shelf-spec-holes ${isAbnormal ? 'anomaly' : ''}">${holes}孔${isAbnormal ? ' ⚠' : ''}</span>
                    <span class="shelf-spec-prio">优先级 ${this.app.escapeHtml(spec.priority || '—')}</span>
                `;
            } else {
                label.textContent = shelf;
            }

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
            checkbox.addEventListener('change', () => this.updateSelectedShelves());
        });

        this._bindShelfSearch();
        this._populateAreaSelect(shelves);
        this.app.data.selectedShelves = [];
        document.getElementById('optSelectedCount').textContent = OP_TEXT.msg_selectedCount.replace('{n}', 0);
        this._applyModeUI();
    }

    _bindShelfSearch() {
        const searchInput = document.getElementById('shelfSearchInput');
        if (!searchInput) return;

        const parent = searchInput.parentNode;
        const oldClear = parent.querySelector('.clear-svg');
        if (oldClear) oldClear.remove();

        const clearBtn = document.createElement('span');
        clearBtn.className = 'clear-svg';
        clearBtn.innerHTML = this._iconCache.x;
        clearBtn.style.display = 'none';
        parent.appendChild(clearBtn);

        const filterShelves = (val) => {
            const searchTerm = val.replace(/-/g, '').toLowerCase();
            document.querySelectorAll('#shelfCheckboxContainer .shelf-checkbox').forEach(div => {
                const shelf = (div.dataset.shelf || '').replace(/-/g, '').toLowerCase();
                const area = (div.dataset.area || '').replace(/-/g, '').toLowerCase();
                const match = !searchTerm || shelf.includes(searchTerm) || area.includes(searchTerm);
                div.style.display = match ? 'flex' : 'none';
            });
        };

        searchInput._filterFn = filterShelves;

        if (!searchInput._bound) {
            searchInput._bound = true;
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value;
                const cb = searchInput.parentNode.querySelector('.clear-svg');
                if (cb) cb.style.display = val ? 'block' : 'none';
                searchInput._filterFn(val);
            });
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    const cb = searchInput.parentNode.querySelector('.clear-svg');
                    if (cb) cb.style.display = 'none';
                    searchInput._filterFn('');
                }
            });
        }

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            filterShelves('');
            searchInput.focus();
        });
    }

    _populateAreaSelect(shelves) {
        const select = document.getElementById('optAreaSelect');
        if (!select) return;

        const areas = [...new Set(shelves.map(s => s.split('-').slice(0, 2).join('-')))]
            .sort((a, b) => a.localeCompare(b));

        select.innerHTML = `<option value="">${OP_TEXT.btn_selectAreaPlaceholder}</option>` +
            areas.map(a => `<option value="${this.app.escapeHtml(a)}">${this.app.escapeHtml(a)}</option>`).join('');

        if (!select._bound) {
            select._bound = true;
            select.addEventListener('change', () => {
                const area = select.value;
                if (!area) return;
                document.querySelectorAll('#shelfCheckboxContainer .shelf-checkbox').forEach(div => {
                    if (div.dataset.area === area) {
                        const cb = div.querySelector('input[type="checkbox"]');
                        if (cb && !cb.disabled) cb.checked = true;
                    }
                });
                select.value = '';
                this.updateSelectedShelves();
            });
        }
    }

    selectAll() {
        const mode = this._getMode();
        if (!mode) return;

        if (mode === 'adjust' || mode === 'copyFirstLayer') {
            document.querySelectorAll('#shelfCheckboxContainer input[type="checkbox"]:not(:disabled)').forEach(cb => {
                cb.checked = true;
            });
            this.updateSelectedShelves();
            return;
        }

        let baseSpec = null;
        if (this.app.data.selectedShelves.length > 0) {
            baseSpec = this.app.data.shelfSpecMap.get(this.app.data.selectedShelves[0].code);
        } else {
            this.app.showMessage(OP_TEXT.msg_selectBaseShelf, 'info');
            return;
        }
        document.querySelectorAll('#shelfCheckboxContainer input[type="checkbox"]:not(:disabled)').forEach(cb => {
            const spec = this.app.data.shelfSpecMap.get(cb.value);
            if (spec && spec.length === baseSpec.length && spec.depth === baseSpec.depth) {
                cb.checked = true;
            }
        });
        this.updateSelectedShelves();
    }

    deselectAll() {
        document.querySelectorAll('#shelfCheckboxContainer input[type="checkbox"]').forEach(cb => cb.checked = false);
        this.updateSelectedShelves();
    }

    updateSelectedShelves() {
        this.app.data.selectedShelves = [];
        let baseSpec = null;
        document.querySelectorAll('#shelfCheckboxContainer input[type="checkbox"]:checked').forEach(cb => {
            const shelfCode = cb.value;
            const shelfLocations = this.app.data.shelfData.filter(item => {
                const locationCode = item['库位编码'];
                return locationCode && locationCode.startsWith(shelfCode);
            });
            if (shelfLocations.length > 0) {
                this.app.data.selectedShelves.push({ code: shelfCode, locations: shelfLocations });
            }
        });

        const mode = this._getMode();
        const isAdjustLike = mode === 'adjust' || mode === 'copyFirstLayer';
        if (mode && !isAdjustLike && this.app.data.selectedShelves.length > 0) {
            baseSpec = this.app.data.shelfSpecMap.get(this.app.data.selectedShelves[0].code);
        }

        document.querySelectorAll('#shelfCheckboxContainer .shelf-checkbox').forEach(div => {
            const checkbox = div.querySelector('input[type="checkbox"]');
            if (!checkbox) return;
            if (!mode || isAdjustLike) {
                checkbox.disabled = !mode;
                div.classList.toggle('disabled', !mode);
                return;
            }
            const spec = this.app.data.shelfSpecMap.get(checkbox.value);
            if (baseSpec && spec && (spec.length !== baseSpec.length || spec.depth !== baseSpec.depth)) {
                checkbox.disabled = true;
                div.classList.add('disabled');
            } else {
                checkbox.disabled = false;
                div.classList.remove('disabled');
            }
        });

        document.getElementById('optSelectedCount').textContent = OP_TEXT.msg_selectedCount.replace('{n}', this.app.data.selectedShelves.length);
        if (this.app.data.selectedShelves.length > 0) {
            this.updateShelfSpecInfo();
        } else {
            this.app.data.currentShelfSpec = null;
            document.getElementById('shelfSpecInfo').innerHTML = '';
        }

        this._syncLayerSizeDefaults();
        this._updateSectionsState();
    }

    updateShelfSpecInfo() {
        const infoDiv = document.getElementById('shelfSpecInfo');
        if (!infoDiv) return;
        if (this.app.data.selectedShelves.length === 0) {
            infoDiv.innerHTML = '';
            return;
        }
        const mode = this._getMode();

        if (mode === 'adjust' || mode === 'copyFirstLayer') {
            const specMap = new Map();
            this.app.data.selectedShelves.forEach(shelf => {
                const spec = this.app.data.shelfSpecMap.get(shelf.code);
                if (!spec || !spec.length || !spec.depth) return;
                const key = `${spec.length}-${spec.depth}`;
                if (!specMap.has(key)) specMap.set(key, spec);
            });

            if (specMap.size === 0) {
                infoDiv.innerHTML = '';
                return;
            }

            const specs = [...specMap.values()];
            if (specs.length === 1) {
                const spec = specs[0];
                const specDesc = this.getShelfSpecDescription(spec.length, spec.depth);
                infoDiv.innerHTML = `<div class="panel-box shelf-info"><h3>${OP_TEXT.info_selectedShelfSpec}</h3><p>${OP_TEXT.info_specLine.replace('{l}', spec.length).replace('{d}', spec.depth).replace('{desc}', specDesc)}</p><p class="note">${OP_TEXT.info_adjustModeNote}</p></div>`;
            } else {
                const lines = specs.map(spec => {
                    const specDesc = this.getShelfSpecDescription(spec.length, spec.depth);
                    return `<li>长 ${spec.length}cm × 深 ${spec.depth}cm (${specDesc})</li>`;
                }).join('');
                infoDiv.innerHTML = `<div class="panel-box shelf-info"><h3>${OP_TEXT.info_selectedShelfSpec}（共 ${specs.length} 种）</h3><ul style="margin:8px 0;padding-left:20px;line-height:1.9">${lines}</ul><p class="note">${OP_TEXT.info_adjustModeNote}</p></div>`;
            }
            return;
        }

        const firstSpec = this.app.data.shelfSpecMap.get(this.app.data.selectedShelves[0].code);
        if (!firstSpec) { infoDiv.innerHTML = ''; return; }
        const allSame = this.app.data.selectedShelves.every(s => {
            const sp = this.app.data.shelfSpecMap.get(s.code);
            return sp && sp.length === firstSpec.length && sp.depth === firstSpec.depth;
        });
        if (allSame) {
            const specDesc = this.getShelfSpecDescription(firstSpec.length, firstSpec.depth);
            infoDiv.innerHTML = `<div class="panel-box shelf-info"><h3>${OP_TEXT.info_selectedShelfSpec}</h3><p>${OP_TEXT.info_specLine.replace('{l}', firstSpec.length).replace('{d}', firstSpec.depth).replace('{desc}', specDesc)}</p><p class="note">${OP_TEXT.info_specEditHint}</p></div>`;
            const lengthInput = document.getElementById('shelfLengthInput');
            const depthInput = document.getElementById('shelfDepthInput');
            if (lengthInput && depthInput) {
                lengthInput.value = firstSpec.length;
                depthInput.value = firstSpec.depth;
                this._validateShelfSpecInputs();
            }
        } else {
            infoDiv.innerHTML = `<div class="panel-box shelf-info"><h3>${OP_TEXT.info_selectedShelfSpec}</h3><p>${OP_TEXT.info_specMismatch}</p><p class="note">${OP_TEXT.info_specUnifyHint}</p></div>`;
        }
    }

    _validateShelfSpecInputs() {
        const mode = this._getMode();
        if (mode === 'adjust' || mode === 'copyFirstLayer') {
            this._clearShelfSpecValidation();
            const topCheckbox = document.getElementById('generateTopCheckbox');
            if (topCheckbox) topCheckbox.disabled = false;
            return;
        }

        const lengthInput = document.getElementById('shelfLengthInput');
        const depthInput = document.getElementById('shelfDepthInput');
        const lengthMsg = document.getElementById('shelfLengthValidation');
        const depthMsg = document.getElementById('shelfDepthValidation');
        const generateBtn = document.getElementById('generateBtn');
        if (!lengthInput || !depthInput) return;

        const lengthVal = parseInt(lengthInput.value);
        const depthVal = parseInt(depthInput.value);

        if (isNaN(lengthVal) || isNaN(depthVal)) {
            lengthMsg.textContent = OP_TEXT.validation_enterValidNumber;
            lengthMsg.className = 'validation-message validation-invalid';
            lengthInput.classList.add('validation-invalid');
            lengthInput.classList.remove('validation-valid');
            depthMsg.textContent = OP_TEXT.validation_enterValidNumber;
            depthMsg.className = 'validation-message validation-invalid';
            depthInput.classList.add('validation-invalid');
            depthInput.classList.remove('validation-valid');
            if (generateBtn) generateBtn.disabled = true;
            this._updateTopCheckboxState(null, null);
            return;
        }

        const isValid = this.validateShelfSpecCombination(lengthVal, depthVal);
        if (isValid) {
            const specDesc = this.getShelfSpecDescription(lengthVal, depthVal);
            const okMsg = OP_TEXT.validation_specOk.replace('{desc}', specDesc);
            lengthMsg.textContent = okMsg;
            lengthMsg.className = 'validation-message validation-valid';
            lengthInput.classList.remove('validation-invalid');
            lengthInput.classList.add('validation-valid');
            depthMsg.textContent = okMsg;
            depthMsg.className = 'validation-message validation-valid';
            depthInput.classList.remove('validation-invalid');
            depthInput.classList.add('validation-valid');
            if (generateBtn) generateBtn.disabled = false;
            this._updateTopCheckboxState(lengthVal, depthVal);
        } else {
            const validSpecs = this.getValidShelfSpecs();
            const specText = validSpecs.map(spec => spec.format).join('、');
            const errMsg = OP_TEXT.validation_specInvalid.replace('{list}', specText);
            lengthMsg.textContent = errMsg;
            lengthMsg.className = 'validation-message validation-invalid';
            lengthInput.classList.remove('validation-valid');
            lengthInput.classList.add('validation-invalid');
            depthMsg.textContent = errMsg;
            depthMsg.className = 'validation-message validation-invalid';
            depthInput.classList.remove('validation-valid');
            depthInput.classList.add('validation-invalid');
            if (generateBtn) generateBtn.disabled = true;
            this._updateTopCheckboxState(null, null);
        }
    }

    _updateTopCheckboxState(shelfLength, shelfDepth) {
        const checkbox = document.getElementById('generateTopCheckbox');
        if (!checkbox) return;
        if (shelfLength === null || shelfDepth === null) {
            checkbox.disabled = true;
            checkbox.checked = false;
            return;
        }
        const hasTop = (this.locationSpecs.top || []).some(s => s.l === shelfLength && s.d === shelfDepth);
        checkbox.disabled = !hasTop;
        if (!hasTop) checkbox.checked = false;
    }

    // ==================== 生成流程 ====================

    _validateBatchParams() {
        const lengthInput = document.getElementById('shelfLengthInput');
        const depthInput = document.getElementById('shelfDepthInput');
        if (!lengthInput || !depthInput) return [OP_TEXT.msg_cannotGetSpec];

        const shelfLength = parseInt(lengthInput.value);
        const shelfDepth = parseInt(depthInput.value);
        if (!this.validateShelfSpecCombination(shelfLength, shelfDepth)) {
            const specDesc = this.getShelfSpecDescription(shelfLength, shelfDepth);
            return [OP_TEXT.msg_specNotStandard.replace('{desc}', specDesc)];
        }

        const generateTop = document.getElementById('generateTopCheckbox').checked;
        let startLayerOffset = parseInt(document.getElementById('startLayerOffset')?.value || '1');
        if (isNaN(startLayerOffset)) startLayerOffset = 1;
        const layerCount = parseInt(document.getElementById('layerCount').value);
        const layerLocationSettings = this.app.getLayerLocationSettings();

        return this._validateBeforeGenerate(
            shelfLength, shelfDepth, layerCount, layerLocationSettings, generateTop, startLayerOffset
        );
    }

    _validateBeforeGenerate(shelfLength, shelfDepth, layerCount, layerLocationSettings, generateTop, startLayerOffset) {
        const errors = [];
        const availableLength = this.getAvailableInnerLength(shelfLength);
        const specs = (this.locationSpecs.standard || []).filter(s => s.d === shelfDepth);
        if (specs.length === 0) {
            errors.push(OP_TEXT.err_noSpecForDepth.replace('{d}', shelfDepth));
            return errors;
        }

        const heights = [...new Set(specs.map(s => s.h))];
        const lengths = [...new Set(specs.map(s => s.l))];
        const minH = Math.min(...heights);
        const maxH = Math.max(...heights);
        const minL = Math.min(...lengths);
        const maxL = Math.max(...lengths);

        if (isNaN(layerCount) || layerCount < 1) {
            errors.push(OP_TEXT.msg_invalidLayerCount);
        } else {
            const maxLayers = Math.floor(this.heightTargetMax / minH);
            const minLayers = Math.ceil(this.heightTargetMin / maxH);
            if (layerCount > maxLayers || layerCount < minLayers) {
                errors.push(OP_TEXT.msg_layerCountOutOfRange
                    .replace('{v}', layerCount)
                    .replace('{min}', minLayers)
                    .replace('{max}', maxLayers));
            }
        }

        if (isNaN(startLayerOffset)) {
            errors.push(OP_TEXT.msg_invalidStartLayer);
        } else if (!isNaN(layerCount) && layerCount >= 1) {
            const topExtra = generateTop ? 1 : 0;
            const maxLayer = startLayerOffset + layerCount + topExtra - 1;
            if (maxLayer > this.maxLayerIndex) {
                errors.push(OP_TEXT.msg_layerLimitExceeded.replace('{max}', this.maxLayerIndex));
            }
        }

        const maxCols = Math.floor(availableLength / minL);
        const minCols = Math.ceil(availableLength / maxL);
        const mode = this._getMode();

        if (mode === 'batch') {
            const n = layerLocationSettings[1];
            if (isNaN(n) || n < minCols || n > maxCols) {
                errors.push(OP_TEXT.msg_colsOutOfRange
                    .replace('{v}', isNaN(n) ? '空' : n)
                    .replace('{min}', minCols)
                    .replace('{max}', maxCols));
            }
        } else {
            for (let i = 1; i <= layerCount; i++) {
                const n = layerLocationSettings[i];
                if (isNaN(n) || n < minCols || n > maxCols) {
                    const actualLayer = i + startLayerOffset - 1;
                    errors.push(OP_TEXT.msg_colsOutOfRangePerLayer
                        .replace('{layer}', actualLayer)
                        .replace('{v}', isNaN(n) ? '空' : n)
                        .replace('{min}', minCols)
                        .replace('{max}', maxCols));
                }
            }
        }

        return errors;
    }

    generateOptimization() {
        if (this.app.data.selectedShelves.length === 0) {
            this.app.showMessage(OP_TEXT.msg_pleaseSelectAtLeastOne, 'error');
            return;
        }

        const mode = this._getMode();
        if (!mode) {
            this.app.showMessage(OP_TEXT.msg_pleaseSelectMode, 'error');
            return;
        }

        if (mode === 'batch' || mode === 'individual') {
            const errors = this._validateBatchParams();
            if (errors.length > 0) {
                const body = errors.map(e => `<p>${this.app.escapeHtml(e)}</p>`).join('');
                this.app.showModal(OP_TEXT.modal_validationFailed, body);
                return;
            }
        } else {
            const targetCount = parseInt(document.getElementById('layerCount').value);
            if (isNaN(targetCount) || targetCount < 2 || targetCount > 12) {
                this.app.showMessage(OP_TEXT.msg_invalidTargetLayerCount, 'error');
                return;
            }
        }

        this._showLoading();
        try {
            const { allResults, failures } = this._runOverShelves();
            this._showFailuresIfAny(failures, allResults);

            if (allResults.newLocations.length + allResults.existingChanges.length + allResults.deletedLocations.length > 0) {
                this._accumulateResult(allResults);
            } else if (failures.length === 0) {
                this.app.showMessage('没有产生任何变更', 'info');
            }
        } finally {
            this._hideLoading();
        }
    }

    clearOptimizationResults() {
        document.getElementById('existingChanges').querySelector('tbody').innerHTML = '';
        document.getElementById('newLocations').querySelector('tbody').innerHTML = '';
        document.getElementById('deletedLocations').querySelector('tbody').innerHTML = '';
    }

    displayOptimizationResults() {
        if (!this.app.data.optimizationResult) return;
        const esc = (s) => this.app.escapeHtml(s);

        const existingTable = document.getElementById('existingChanges').querySelector('tbody');
        existingTable.innerHTML = '';
        this.app.data.optimizationResult.existingChanges.forEach(change => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${esc(change['仓库名称'] || '')}</td>
                <td>${esc(change['库位号'])}</td>
                <td>${esc(change['名称'] || change['库位号'])}</td>
                <td>${esc(OP_TEXT.export_yesNo)}</td>
                <td>${esc(OP_TEXT.export_yesNo)}</td>
                <td>${esc(change['分拣排序'] || '')}</td>
                <td>${esc(change['上架排序'] || '')}</td>
                <td>${esc(change['逻辑区名称'] || '')}</td>
                <td>${esc(change['单独打包分区编号'] || '')}</td>
                <td>${esc(change['库位规格名称'] || '')}</td>
                <td>${esc(change['库位BAND'] || '')}</td>
                <td>${esc(change['批次码库位'] || '')}</td>
                <td>${esc(change['常温短保品库位'] || '')}</td>
            `;
            existingTable.appendChild(row);
        });

        const newTable = document.getElementById('newLocations').querySelector('tbody');
        newTable.innerHTML = '';
        this.app.data.optimizationResult.newLocations.forEach(location => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${esc(location.locationCode)}</td>
                <td>${esc(location.name)}</td>
                <td>${esc(location.area)}</td>
                <td>${esc(location.department)}</td>
                <td>${esc(location.type)}</td>
                <td>${esc(location.logicalArea)}</td>
                <td>${esc(location.separatePacking)}</td>
                <td>${esc(location.marketAttribute)}</td>
                <td>${esc(location.canOut)}</td>
                <td>${esc(location.canIn)}</td>
                <td>${esc(location.sortingPriority)}</td>
                <td>${esc(location.putawayPriority)}</td>
                <td>${esc(location.replenishPriority)}</td>
                <td>${esc(location.mixBatch)}</td>
                <td>${esc(location.mixSupplier)}</td>
                <td>${esc(location.storageType)}</td>
                <td>${esc(location.backgroundCategory)}</td>
                <td>${esc(location.locationSpecName)}</td>
                <td>${esc(location.locationBand)}</td>
                <td>${esc(location.batchCode)}</td>
                <td>${esc(location.normShort)}</td>
                <td>${esc(OP_TEXT.export_emptyField)}</td>
            `;
            newTable.appendChild(row);
        });

        const deletedTable = document.getElementById('deletedLocations').querySelector('tbody');
        deletedTable.innerHTML = '';
        this.app.data.optimizationResult.deletedLocations.forEach(deleted => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${esc(deleted.locationCode)}</td>
                <td>${esc(deleted.reason || OP_TEXT.deleteReason_default)}</td>
            `;
            deletedTable.appendChild(row);
        });

        this._updateResultStatus();
    }

    async exportResults() {
        if (!this._hasAccumulatedResult()) {
            this.app.showMessage(OP_TEXT.msg_nothingToExport, 'error');
            return;
        }
        const ok = await this.app.loadLibrary('xlsx');
        if (!ok) {
            this.app.showMessage(OP_TEXT.msg_xlsxLoadFailed, 'error');
            return;
        }
        const { dateStr, timeStr, modePrefix } = this.getExportFilePrefix();
        const baseName = `${modePrefix}_${dateStr}_${timeStr}`;
        let count = 0;
        try {
            if (this.app.data.optimizationResult.existingChanges.length > 0) {
                const wb1 = this.generateExistingChangesWorkbook();
                const arr1 = XLSX.write(wb1, { bookType: 'xlsx', type: 'array' });
                this.app.download(arr1, `${baseName}_更改.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                count++;
            }
            if (this.app.data.optimizationResult.newLocations.length > 0) {
                const wb2 = this.generateNewLocationsWorkbook();
                const arr2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
                this.app.download(arr2, `${baseName}_新增.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                count++;
            }
            if (this.app.data.optimizationResult.deletedLocations.length > 0) {
                const wb3 = this.generateDeletedLocationsWorkbook();
                const arr3 = XLSX.write(wb3, { bookType: 'xlsx', type: 'array' });
                this.app.download(arr3, `${baseName}_删除.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                count++;
            }
            if (count > 0) {
                this.app.showMessage(OP_TEXT.msg_exportOk.replace('{n}', count), 'success');
                this._showExportDoneDialog();
            } else {
                this.app.showMessage(OP_TEXT.msg_nothingToExport, 'warning');
            }
        } catch (error) {
            console.error('导出结果时出错:', error);
            this.app.showMessage(OP_TEXT.msg_exportFailed + error.message, 'error');
        }
    }

    async exportZip() {
        if (!this._hasAccumulatedResult()) {
            this.app.showMessage(OP_TEXT.msg_nothingToExport, 'error');
            return;
        }
        const okXlsx = await this.app.loadLibrary('xlsx');
        const okZip = await this.app.loadLibrary('jszip');
        if (!okXlsx || !okZip) {
            this.app.showMessage(OP_TEXT.msg_libsLoadFailed, 'error');
            return;
        }
        const { dateStr, timeStr, modePrefix } = this.getExportFilePrefix();
        const baseName = `${modePrefix}_${dateStr}_${timeStr}`;
        const zip = new JSZip();
        let count = 0;
        try {
            if (this.app.data.optimizationResult.existingChanges.length > 0) {
                const wb1 = this.generateExistingChangesWorkbook();
                const arr1 = XLSX.write(wb1, { bookType: 'xlsx', type: 'array' });
                zip.file(`${baseName}_更改.xlsx`, arr1);
                count++;
            }
            if (this.app.data.optimizationResult.newLocations.length > 0) {
                const wb2 = this.generateNewLocationsWorkbook();
                const arr2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
                zip.file(`${baseName}_新增.xlsx`, arr2);
                count++;
            }
            if (this.app.data.optimizationResult.deletedLocations.length > 0) {
                const wb3 = this.generateDeletedLocationsWorkbook();
                const arr3 = XLSX.write(wb3, { bookType: 'xlsx', type: 'array' });
                zip.file(`${baseName}_删除.xlsx`, arr3);
                count++;
            }
            if (count === 0) {
                this.app.showMessage(OP_TEXT.msg_nothingToExport, 'warning');
                return;
            }
            const content = await zip.generateAsync({ type: 'blob' });
            this.app.download(content, `${baseName}.zip`, 'application/zip');
            this.app.showMessage(OP_TEXT.msg_zipExportOk, 'success');
            this._showExportDoneDialog();
        } catch (error) {
            console.error('导出压缩文件时出错:', error);
            this.app.showMessage(OP_TEXT.msg_zipExportFailed + error.message, 'error');
        }
    }

    async _showExportDoneDialog() {
        const acc = this.app.data.optimizationResult;
        if (!acc) return;
        const shelfCount = this._extractShelfSet(acc).size;
        const add = acc.newLocations.length;
        const change = acc.existingChanges.length;
        const del = acc.deletedLocations.length;

        const content = `
            <p>导出完成。</p>
            <p style="margin-top:12px;">累积方案含 <strong>${shelfCount}</strong> 个货架：${add} 新增 · ${change} 更改 · ${del} 删除。</p>
            <p style="margin-top:12px;">是否清空累积记录？</p>
        `;

        const action = await this.app.choose('导出完成', content, [
            { label: '保留累积', class: 'btn-secondary', value: 'keep' },
            { label: '清空累积', class: 'btn-warning', value: 'clear' },
        ]);

        if (action === 'clear') {
            this.resetAll();
            this.app.showMessage('已清空累积记录', 'success');
        }
    }

    resetAll() {
        document.querySelectorAll('input[name="optimizationMode"]').forEach(r => r.checked = false);
        document.querySelectorAll('.optimization-mode-option').forEach(o => o.classList.remove('selected'));
        document.querySelectorAll('#shelfCheckboxContainer input[type="checkbox"]').forEach(cb => cb.checked = false);

        document.getElementById('layerCount').value = '6';
        document.getElementById('locationsPerLayer').value = '9';
        document.getElementById('startLayerOffset').value = '1';

        this.app.data.optimizationResult = null;
        this.app.data.selectedShelves = [];
        this.clearOptimizationResults();
        this._updateResultStatus();
        document.getElementById('optSelectedCount').textContent = OP_TEXT.msg_selectedCount.replace('{n}', 0);
        document.getElementById('shelfSpecInfo').innerHTML = '';

        this._applyModeUI();
        this._updateSectionsState();
        this.app.showMessage(OP_TEXT.msg_resetOk, 'success');
    }

    showLayoutPreview() {
        if (!this._hasAccumulatedResult()) {
            this.app.showMessage(OP_TEXT.msg_generateFirst, 'error');
            return;
        }

        const selectedShelves = this.app.data.selectedShelves;
        if (!selectedShelves || selectedShelves.length === 0) {
            this.app.showMessage(OP_TEXT.msg_noSelectedShelf, 'error');
            return;
        }
        const targetShelf = selectedShelves[0];
        const targetShelfCode = targetShelf.code;

        const allLocations = [];

        if (this.app.data.optimizationResult.existingChanges) {
            this.app.data.optimizationResult.existingChanges.forEach(location => {
                const code = location['库位号'];
                if (code && code.startsWith(targetShelfCode)) {
                    const spec = this.parseLocationSpec(location['库位规格名称']);
                    allLocations.push({
                        code: code, spec: spec, status: 'mod',
                        layer: code.split('-')[3], position: code.split('-')[4]
                    });
                }
            });
        }

        if (this.app.data.optimizationResult.newLocations) {
            this.app.data.optimizationResult.newLocations.forEach(location => {
                const code = location.locationCode;
                if (code && code.startsWith(targetShelfCode)) {
                    const spec = this.parseLocationSpec(location.locationSpecName);
                    allLocations.push({
                        code: code, spec: spec, status: 'new',
                        layer: code.split('-')[3], position: code.split('-')[4]
                    });
                }
            });
        }

        const changedOrNew = new Set();
        if (this.app.data.optimizationResult.existingChanges) {
            this.app.data.optimizationResult.existingChanges.forEach(l => changedOrNew.add(l['库位号']));
        }
        if (this.app.data.optimizationResult.newLocations) {
            this.app.data.optimizationResult.newLocations.forEach(l => changedOrNew.add(l.locationCode));
        }
        const deletedCodes = new Set();
        if (this.app.data.optimizationResult.deletedLocations) {
            this.app.data.optimizationResult.deletedLocations.forEach(l => deletedCodes.add(l.locationCode));
        }

        if (this.app.data.shelfData && this.app.data.selectedShelves.length > 0) {
            this.app.data.shelfData.forEach(original => {
                const locationCode = original['库位编码'];
                if (locationCode && locationCode.startsWith(targetShelfCode) &&
                    !changedOrNew.has(locationCode) && !deletedCodes.has(locationCode)) {
                    const spec = this.parseLocationSpec(original['库位规格名称']);
                    allLocations.push({
                        code: locationCode, spec: spec, status: 'unch',
                        layer: locationCode.split('-')[3], position: locationCode.split('-')[4]
                    });
                }
            });
        }

        if (allLocations.length === 0) {
            this.app.showModal(OP_TEXT.heading_layoutPreview,
                `<p>${OP_TEXT.layoutNotFound.replace('{code}', targetShelfCode)}</p>`);
            return;
        }

        const byLayer = {};
        allLocations.forEach(location => {
            const layer = location.layer;
            if (!byLayer[layer]) byLayer[layer] = [];
            byLayer[layer].push(location);
        });

        const layers = Object.keys(byLayer);
        layers.sort((a, b) => {
            const aNum = parseInt(a), bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
            if (!isNaN(aNum)) return -1;
            if (!isNaN(bNum)) return 1;
            return String(b).localeCompare(String(a));
        });

        if (layers.length === 0) {
            this.app.showModal(OP_TEXT.heading_layoutPreview, `<p>${OP_TEXT.layoutNoLayerInfo}</p>`);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'layout-preview-grid';

        layers.forEach(layer => {
            const row = document.createElement('div');
            row.className = 'layout-row';

            const locations = byLayer[layer];
            locations.sort((a, b) => parseInt(a.position) - parseInt(b.position));
            const totalLength = locations.reduce((sum, l) => sum + l.spec.l, 0);
            const firstSpec = locations[0].spec;
            const layerHeight = firstSpec.h > 0 ? firstSpec.h * 20 : 30;
            const isTop = locations.some(l => l.spec.type === 'top');

            const label = document.createElement('div');
            label.className = 'layout-layer-label';
            label.style.minHeight = layerHeight + 'px';
            label.style.padding = '0';
            if (isTop) {
                label.classList.add('top');
                label.textContent = OP_TEXT.topLayerLabel;
            } else {
                const heightText = firstSpec.h > 0 ? OP_TEXT.layerHeightUnit.replace('{h}', firstSpec.h) : '';
                label.textContent = OP_TEXT.layoutLayerLabel.replace('{layer}', layer).replace('{height}', heightText);
            }
            row.appendChild(label);

            const locationsContainer = document.createElement('div');
            locationsContainer.className = 'layout-locations';

            locations.forEach(location => {
                const div = document.createElement('div');
                div.className = `layout-location layout-location-${location.status}`;
                const widthPercent = totalLength > 0 ? (location.spec.l / totalLength) * 100 : 100 / locations.length;
                div.style.width = `${widthPercent}%`;
                const parts = location.code.split('-');
                const labelText = `${parts[3]}-${parts[4]}`;
                div.innerHTML = `<div class="location-code">${this.app.escapeHtml(labelText)}</div><div class="location-spec">${location.spec.l}cm</div>`;
                locationsContainer.appendChild(div);
            });

            row.appendChild(locationsContainer);
            grid.appendChild(row);
        });

        const html = `<div class="layout-preview-container"><h4 style="margin-bottom:12px">${OP_TEXT.layoutShelfTitle.replace('{code}', targetShelfCode)}</h4>${grid.outerHTML}</div>`;
        this.app.showModal(OP_TEXT.heading_layoutPreview, html);
    }

    // ==================== 渲染面板 ====================

    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section" id="uploadSection">
                ${this.app.uploadSection({
                    title: OP_TEXT.heading_upload,
                    moduleId: this.id,
                    btnId: 'uploadBtn',
                    btnLabel: OP_TEXT.btn_uploadAndParse,
                })}
            </div>

            <div class="section hidden" id="modeShelfSection">
                <div class="table-header">
                    <h2>${OP_TEXT.heading_selectModeShelf}<span id="uploadedWarehouse"></span></h2>
                </div>

                <h3 class="section-subtitle">${OP_TEXT.heading_selectMode}</h3>
                <div class="optimization-mode-selection">
                    <label class="optimization-mode-option" id="batchModeOption">
                        <input type="radio" name="optimizationMode" value="batch">
                        <h3>${OP_TEXT.mode_batch}</h3><p>${OP_TEXT.mode_batchDesc}</p>
                    </label>
                    <label class="optimization-mode-option" id="individualModeOption">
                        <input type="radio" name="optimizationMode" value="individual">
                        <h3>${OP_TEXT.mode_individual}</h3><p>${OP_TEXT.mode_individualDesc}</p>
                    </label>
                    <label class="optimization-mode-option" id="adjustModeOption">
                        <input type="radio" name="optimizationMode" value="adjust">
                        <h3>${OP_TEXT.mode_adjust}</h3><p>${OP_TEXT.mode_adjustDesc}</p>
                    </label>
                    <label class="optimization-mode-option" id="copyFirstLayerModeOption">
                        <input type="radio" name="optimizationMode" value="copyFirstLayer">
                        <h3>${OP_TEXT.mode_copyFirstLayer}</h3><p>${OP_TEXT.mode_copyFirstLayerDesc}</p>
                    </label>
                </div>

                <h3 class="section-subtitle" style="margin-top:24px;">${OP_TEXT.heading_selectShelf}</h3>
                <div class="shelf-search"><input type="text" id="shelfSearchInput" placeholder="${OP_TEXT.ph_shelfSearch}"></div>
                <div class="toolbar" id="shelfToolbar">
                    <button id="optSelectAllBtn" class="btn" disabled>${OP_TEXT.btn_selectAll}</button>
                    <select id="optAreaSelect" class="area-select hidden">
                        <option value="">${OP_TEXT.btn_selectAreaPlaceholder}</option>
                    </select>
                    <button id="optDeselectAllBtn" class="btn btn-secondary" disabled>${OP_TEXT.btn_deselectAll}</button>
                </div>
                <div class="spec-info" id="shelfSpecInfo"></div>
                <div class="list-container" id="shelfCheckboxContainer"></div>
                <div class="status-text" id="optSelectedCount" style="margin-top:15px;font-weight:700;"></div>
            </div>

            <div class="section hidden" id="paramsSection">
                <div class="table-header">
                    <h2>${OP_TEXT.heading_params}</h2>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="layerCount">${OP_TEXT.label_layerCount}</label><input type="text" id="layerCount" value="6"></div>
                    <div class="form-group" id="locationsPerLayerGroup"><label for="locationsPerLayer">${OP_TEXT.label_locationsPerLayer}</label><input type="text" id="locationsPerLayer" value="9"></div>
                    <div class="form-group"><label for="startLayerOffset">${OP_TEXT.label_startLayerOffset}</label><input type="text" id="startLayerOffset" value="1"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="shelfLengthInput">${OP_TEXT.label_shelfLength}</label><input type="text" id="shelfLengthInput" value="120"><span class="validation-message" id="shelfLengthValidation"></span></div>
                    <div class="form-group"><label for="shelfDepthInput">${OP_TEXT.label_shelfDepth}</label><input type="text" id="shelfDepthInput" value="40"><span class="validation-message" id="shelfDepthValidation"></span></div>
                </div>
                <div id="individualLayerLocations" class="hidden">
                    <h4>${OP_TEXT.heading_layerLocationSetup}</h4>
                    <div class="layer-location-inputs" id="layerLocationInputs"></div>
                </div>
                <div class="form-row" id="generateTopRow">
                    <div class="checkbox-group">
                        <input type="checkbox" id="generateTopCheckbox" checked>
                        <label for="generateTopCheckbox">${OP_TEXT.label_generateTop}</label>
                    </div>
                </div>
                <div class="form-row hidden" id="generateTopHint">
                    <p class="note">顶层：按各货架现状处理（有则保留，无则不新增）</p>
                </div>
                <div class="form-row">
                    <button id="generateBtn" class="btn">${OP_TEXT.btn_generate}</button>
                </div>
            </div>

            <div class="section hidden" id="resultsSection">
                <div class="table-header">
                    <h2>${OP_TEXT.heading_results}</h2>
                    <span id="optResultStatus" class="status-text"></span>
                </div>
                <div class="result-scheme-row">
                    <button id="schemeManagerBtn" class="btn btn-secondary sm-btn">${OP_TEXT.btn_schemeManager}</button>
                </div>
                <div class="btn-row">
                    <button id="layoutPreviewBtn" class="btn btn-warning">${this.app.getIcon('diagram-3')} ${OP_TEXT.btn_layoutPreview}</button>
                    <button id="exportBtn" class="btn">${this._iconCache.xlsx} ${OP_TEXT.btn_export}</button>
                    <button id="exportZipBtn" class="btn">${this._iconCache.zip} ${OP_TEXT.btn_exportZip}</button>
                    <button id="optResetBtn" class="btn btn-secondary">${this._iconCache.refresh} ${OP_TEXT.btn_restart}</button>
                </div>
                <div class="results-container">
                    <div class="tables-section">
                        <div class="table-section" id="existingChangesSection">
                            <div class="table-header" id="existingChangesHeader">
                                <div class="table-title"><h3>${OP_TEXT.table_existingChanges}</h3><button type="button" class="btn copy-btn" data-table="existingChanges">复制表格</button></div>
                            </div>
                            <div class="table-container">
                                <table id="existingChanges">
                                    <thead>
                                        <tr>${OP_TEXT.th_existingChanges.map(h => `<th>${h}</th>`).join('')}</tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="table-section" id="newLocationsSection">
                            <div class="table-header" id="newLocationsHeader">
                                <div class="table-title"><h3>${OP_TEXT.table_newLocations}</h3><button type="button" class="btn copy-btn" data-table="newLocations">复制表格</button></div>
                            </div>
                            <div class="table-container">
                                <table id="newLocations">
                                    <thead>
                                        <tr>${OP_TEXT.th_newLocations.map(h => `<th>${h}</th>`).join('')}</tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="table-section" id="deletedLocationsSection">
                            <div class="table-header" id="deletedLocationsHeader">
                                <div class="table-title"><h3>${OP_TEXT.table_deletedLocations}</h3><button type="button" class="btn copy-btn" data-table="deletedLocations">复制表格</button></div>
                            </div>
                            <div class="table-container deleted-table-container">
                                <table id="deletedLocations">
                                    <thead><tr>${OP_TEXT.th_deletedLocations.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.bindEvents();
        this.app.bindUploadSection({btnId: 'uploadBtn',onFile: (file) => this.handleFileUpload(file),});
        const lengthInput = document.getElementById('shelfLengthInput');
        const depthInput = document.getElementById('shelfDepthInput');
        if (lengthInput && depthInput) {
            lengthInput.addEventListener('input', () => this._validateShelfSpecInputs());
            depthInput.addEventListener('input', () => this._validateShelfSpecInputs());
            this._validateShelfSpecInputs();
        }

        this._updateSectionsState();
        this.app._log(this.title + '模块加载成功');
    }
}

// ==================== 文案 ====================

const OP_TEXT = {
    title: '货架库位增减',
    introText: '上传芥末导出的货架数据，批量优化库位规格与数量。',
    helpDescription: `
<p>上传芥末导出的货架数据，批量优化库位规格与数量。</p>
<p><strong>四种重排方式</strong></p>
<ul>
<li><a href="{wiki:每层格子数一致}" target="_blank">每层格子数一致</a>：所有层使用相同的库位数量</li>
<li><a href="{wiki:每层单独设置}" target="_blank">每层单独设置</a>：为每一层指定库位数量</li>
<li><a href="{wiki:20规格加层}" target="_blank">20规格加层</a>：现有层保留格数，新层按货架长度设置</li>
<li><a href="{wiki:复制首层加层}" target="_blank">复制首层加层</a>：现有层保留格数，新层复制首层格数</li>
</ul>
<p><a href="{wiki}" target="_blank">完整说明</a></p>
`,

    spec_topLocation: '顶层货架位（W{l}M*D{d}M）',
    spec_standardLocation: '长{l}cm深{d}cm高{h}圆孔',
    spec_fallbackDescription: '长{l}cm×深{d}cm',
    spec_formatLabel: '长{l}cm×深{d}cm',

    heading_upload: '货架库位增减',
    heading_selectModeShelf: '选择重排方式与货架 —— ',
    heading_selectMode: '重排方式',
    heading_selectShelf: '货架',
    heading_params: '设置参数',
    heading_results: '优化结果',
    heading_layoutPreview: '货架布局预览',
    heading_layerLocationSetup: '每层库位数量设置',

    label_layerLocation: '第{n}层库位数量',
    label_layerCount: '层数',
    label_targetLayerCount: '目标层数',
    label_locationsPerLayer: '每层库位数量',
    label_startLayerOffset: '起始层号',
    label_shelfLength: '货架长度 (cm)',
    label_shelfDepth: '货架深度 (cm)',
    label_generateTop: '生成顶层库位',

    btn_uploadAndParse: '上传并解析',
    btn_selectAll: '全选同规格',
    btn_selectAreaPlaceholder: '按库区全选…',
    btn_deselectAll: '取消全选',
    btn_generate: '生成优化方案',
    btn_layoutPreview: '货架布局预览',
    btn_export: '导出结果',
    btn_exportZip: '导出为压缩文件',
    btn_restart: '重新开始',
    btn_schemeManager: '方案管理',

    mode_batch: '每层格子数一致',
    mode_batchDesc: '所有层使用相同的库位数量',
    mode_individual: '每层单独设置',
    mode_individualDesc: '为每一层单独指定库位数量',
    mode_adjust: '20规格加层',
    mode_adjustDesc: '现有层保留格数，新层按货架长度设置',
    mode_copyFirstLayer: '复制首层加层',
    mode_copyFirstLayerDesc: '现有层保留格数，新层复制首层格数',

    ph_shelfSearch: '搜索货架号或库区 (自动筛选)',
    ph_shelfLengthAdjust: '由货架自动决定',
    ph_shelfDepthAdjust: '由货架自动决定',
    ph_startLayerPerShelf: '按货架各自的第一层',

    info_selectedShelfSpec: '已选货架规格',
    info_specLine: '长 {l}cm × 深 {d}cm ({desc})',
    info_specEditHint: '您可以在下方"参数"中修改货架规格。',
    info_specMismatch: '所选货架规格不一致，请检查。',
    info_specUnifyHint: '建议取消勾选，只选同规格货架。',
    info_adjustModeNote: '调层模式下，货架规格从导入数据自动读取，不可修改。',

    validation_enterValidNumber: '请输入有效的数值',
    validation_specOk: '规格正确: {desc}',
    validation_specInvalid: '请输入标准规格组合，有效组合：{list}',

    th_existingChanges: CORE_HEADERS.locationChange,
    th_newLocations: CORE_HEADERS.locationNew,
    th_deletedLocations: CORE_HEADERS.locationDeleted,

    table_existingChanges: '批量更改',
    table_newLocations: '批量新增',
    table_deletedLocations: '删除库位',

    topLayerLabel: '顶层',
    layerHeightUnit: '{h}圆孔',
    layoutLayerLabel: '{layer}层\n{height}',
    layoutShelfTitle: '货架: {code}',
    layoutNotFound: '货架 {code} 没有可预览的库位数据',
    layoutNoLayerInfo: '无法提取层信息',

    msg_parseSuccess: '文件解析成功',
    msg_parseFailed: '文件解析失败: ',
    msg_dataFormatError: '文件数据格式不正确',
    msg_missingColumns: '上传文件错误: 缺少以下列 - {cols}',
    msg_noValidLocations: '文件没有有效的库位数据',
    msg_noWarehouse: '未获取',
    msg_selectBaseShelf: '请先选择一个货架作为基准',
    msg_generateFirst: '请先生成优化方案',
    msg_noSelectedShelf: '没有选中的货架，无法预览',
    msg_pleaseSelectAtLeastOne: '请至少选择一个货架',
    msg_pleaseSelectMode: '请先选择重排方式',
    msg_cannotGetSpec: '无法获取货架规格参数',
    msg_specNotStandard: '货架规格"{desc}"不符合标准规格要求，请修改为有效的规格组合',
    msg_invalidLayerCount: '请输入有效的层数',
    msg_invalidStartLayer: '请输入有效的起始层号',
    msg_invalidTargetLayerCount: '目标层数需在 2-12 之间',
    msg_layerCountOutOfRange: '层数 {v} 不可行，当前深度下应在 {min}–{max} 之间。',
    msg_colsOutOfRange: '每层库位数量 {v} 不可行，当前货架可用内径下应在 {min}–{max} 之间。',
    msg_colsOutOfRangePerLayer: '第 {layer} 层库位数量 {v} 不可行，应在 {min}–{max} 之间。',
    msg_layerLimitExceeded: '起始层号 + 层数 + 顶层 - 1 超过 {max}，请调整。',
    msg_exportOk: '结果导出成功，生成了{n}个Excel文件',
    msg_nothingToExport: '没有可导出的数据',
    msg_exportFailed: '结果导出失败: ',
    msg_xlsxLoadFailed: 'XLSX 库加载失败，请检查网络',
    msg_libsLoadFailed: '依赖库加载失败，请检查网络',
    msg_zipExportOk: '压缩文件导出成功',
    msg_zipExportFailed: '导出压缩文件失败: ',
    msg_resetOk: '已重新开始，请重新选择重排方式与货架',
    msg_selectedCount: '已选择 {n} 个货架',
    msg_tooManyRows: '数据超过 {n} 行，请拆分后上传',

    msg_generateCanceled: '已取消本次生成',
    msg_overrideDone: '已覆盖 {n} 个冲突货架的累积记录',
    msg_skipDone: '已忽略 {n} 个冲突货架',
    msg_noAccumulated: '当前没有累积方案',
    msg_schemeCleared: '已删除该货架的所有累积记录',
    msg_allCleared: '已清空全部累积方案',

    status_accumulated: '已累积 {add} 新增 · {change} 更改 · {del} 删除',

    err_noSpecForDepth: '没有找到深度为{d}cm的库位规格',
    err_noSuitableCombo: '无法找到符合要求的库位规格组合',
    err_noSpecForHeight: '没有找到高度为{h}圆孔的库位规格',
    err_noExactLength: '无法找到精确匹配的长度组合：需要{n}个库位，总长度{len}cm，可用长度规格：{list}cm',
    err_noTopSpec: '货架 {l}×{d} 没有匹配的顶层库位规格',
    err_noLayerSizeMap: '货架长度 {len}cm 没有对应的格数映射',
    err_cannotCalcSpec: '货架 {code} 规格无法计算，请检查导入数据',
    err_noStandardLayer: '货架 {code} 无标准层数据',
    err_targetLessThanExisting: '目标层数 {target} 小于货架现有标准层数 {existing}。若想减少层数，请改用「每层格子数一致」或「每层单独设置」。',

    deleteReason: '层{layer}格{pos}超出新方案范围',
    deleteReason_default: '新方案不需要',

    modal_validationFailed: '参数校验失败',
    modal_conflictTitle: '检测到货架重复',
    modal_schemeManager: '方案管理',
    modal_clearConfirm: '确认清空',

    loading: '生成中…',
    export_yesNo: '否',
    export_emptyField: '',

    styles: `
.section-subtitle{font-size:var(--fs);color:var(--text-strong);margin:var(--sp-4) 0 var(--sp-3);padding-left:var(--sp-2);border-left:3px solid var(--accent)}
.result-scheme-row{margin-bottom:var(--sp-4)}
.area-select{width:auto;min-width:160px;padding:var(--sp-3) var(--sp-4);border-radius:var(--r);border:2px solid var(--border);background:var(--bg-input);color:var(--text-strong);font-size:var(--fs-md);font-family:inherit}
.area-select.hidden{display:none!important}
.optimization-mode-selection{display:flex;gap:var(--sp-4);margin:var(--sp-2) 0 0;flex-wrap:wrap}
.optimization-mode-option{flex:1;min-width:200px;padding:var(--sp-5);border:2px solid var(--border-soft);border-radius:var(--r);cursor:pointer;transition:all var(--t) cubic-bezier(.4,0,.2,1);background:var(--bg-panel)}
.optimization-mode-option:hover{border-color:var(--accent);box-shadow:0 8px 20px rgba(255,189,0,.1)}
.optimization-mode-option.selected{border-color:var(--accent);background-color:var(--accent-soft);box-shadow:0 8px 20px rgba(255,189,0,.15)}
.optimization-mode-option h3{color:var(--text-strong);margin-bottom:var(--sp-1);font-size:var(--fs-md)}
.optimization-mode-option p{color:var(--text-muted);font-size:var(--fs-sm);line-height:1.5}
.optimization-mode-option input{display:none}
.shelf-search{margin-bottom:var(--sp-4);padding:0 var(--sp-1);position:relative}
.shelf-search input{width:100%;padding:var(--sp-3) 40px var(--sp-3) 42px;border:2px solid var(--border);border-radius:var(--r-pill);font-size:var(--fs);background:var(--bg-input) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="%23999" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>') no-repeat 12px center;background-size:16px;color:var(--text-strong)}
.shelf-search input:focus{border-color:var(--accent);outline:none}
.shelf-search .clear-svg{position:absolute;right:var(--sp-3);top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-muted);transition:color var(--t)}
.shelf-search .clear-svg:hover{color:var(--text)}
#shelfCheckboxContainer{max-height:420px;padding:var(--sp-3);background:var(--bg-sub)}
.shelf-checkbox{display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-1);padding:var(--sp-3) var(--sp-4);border-radius:var(--r-sm);background:var(--bg-panel);border:1px solid transparent}
.shelf-checkbox:hover{background-color:var(--accent-soft);border-color:var(--accent)}
.shelf-checkbox input{width:18px;height:18px;margin:0;accent-color:var(--accent);flex-shrink:0}
.shelf-checkbox label{margin:0;cursor:pointer;color:var(--text-strong);flex:1;display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap;font-weight:400;font-size:var(--fs-sm)}
.shelf-code{font-family:Consolas,Menlo,monospace;font-weight:700;color:var(--text-strong)}
.shelf-spec-size{color:var(--text-muted);font-size:var(--fs-xs)}
.shelf-first-layer{color:var(--text)}
.shelf-layer-info{color:var(--text)}
.shelf-top-info{color:var(--text)}
.shelf-spec-holes{color:var(--text)}
.shelf-spec-holes.anomaly{color:var(--danger);font-weight:700}
.shelf-spec-prio{color:var(--text-muted);font-size:var(--fs-xs);margin-left:auto}
.shelf-checkbox.disabled{background:var(--bg-sub);opacity:.55}
.shelf-checkbox.disabled label{cursor:not-allowed}
.panel-box.shelf-info{background:var(--accent-soft);border:0;border-left:5px solid var(--accent);padding:var(--sp-4) var(--sp-5);margin-top:var(--sp-3)}
.shelf-info h3{color:var(--text-strong);margin-bottom:var(--sp-2);font-size:var(--fs)}
.shelf-info p{margin:0;font-size:var(--fs-sm);color:var(--text)}
#optSelectedCount{color:var(--accent-text);padding:var(--sp-2) var(--sp-4);background:var(--accent-soft);border-radius:var(--r-sm);display:inline-block;font-size:var(--fs-sm)}
.layer-location-inputs{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--sp-4);margin-top:var(--sp-5);padding:var(--sp-4);background:var(--bg-sub);border-radius:var(--r)}
.layer-location-input{display:flex;flex-direction:column}
.layer-location-input label{font-size:var(--fs-sm);margin-bottom:var(--sp-2);color:var(--text);font-weight:600}
.layer-location-input input{padding:var(--sp-2) var(--sp-3);font-size:var(--fs)}
.deleted-table-container{max-width:400px}
.layout-preview-container{padding:var(--sp-6)}
.layout-preview-grid{display:flex;flex-direction:column;gap:0;margin-top:var(--sp-6);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.layout-row{display:flex;align-items:stretch;min-height:70px;background:var(--bg-sub);border:none;border-bottom:1px solid var(--border)}
.layout-row:last-child{border-bottom:none}
.layout-layer-label{width:120px;background:var(--bg-sub);font-weight:700;display:flex;align-items:center;justify-content:center;padding:var(--sp-4);border-right:1px solid var(--border);font-size:var(--fs);min-height:70px;box-sizing:border-box;color:var(--text-strong);border-top:1px solid var(--border);border-bottom:1px solid var(--border);white-space:pre-line;text-align:center}
.layout-layer-label.top{background:var(--accent-soft);color:var(--text-strong)}
.layout-locations{flex:1;display:flex;border:none;box-sizing:border-box;background:var(--bg-panel)}
.layout-location{display:flex;flex-direction:column;justify-content:center;align-items:center;border-right:1px solid var(--border);border-top:1px solid var(--border);border-bottom:1px solid var(--border);position:relative;padding:var(--sp-2);box-sizing:border-box;cursor:default;height:100%}
.layout-location:first-child{border-left:1px solid var(--border)}
.layout-location:last-child{border-right:1px solid var(--border)}
.location-code{font-size:var(--fs-sm);font-weight:700;margin-bottom:var(--sp-1);color:var(--text-strong);display:flex;align-items:center;justify-content:center;height:50%}
.location-spec{font-size:var(--fs-xs);color:var(--text-muted);display:flex;align-items:center;justify-content:center;height:50%}
.tab-content{position:relative}
.opt-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;z-index:999;border-radius:var(--r)}
.opt-loading-text{padding:var(--sp-4) var(--sp-6);background:var(--accent);color:#1e2a3e;border-radius:var(--r);font-weight:700;font-size:var(--fs-md)}
.sm-btn{padding:var(--sp-2) var(--sp-4);font-size:var(--fs-sm)}
body.dark-mode .opt-loading-overlay{background:rgba(20,20,28,.85)}
`
};

window.OptimizationModule = OptimizationModule;