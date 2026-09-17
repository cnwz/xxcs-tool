/**
 * @description: 货架库位增减模块
 * @author: mr@cnwz.me
 * @since: 2025-07-20
 * @lastupdate: 2026-09-16
 * @version: 1.0.0
 * @wiki https://gitee.com/{repo}/wikis/模块示例/货架库位增减
 * @rules ./rules/OptimizationModule.md
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 **/
class OptimizationModule {
    constructor(app) {
        this.app = app;
        this.title = OP_TEXT.title;
        this.ver = '1.0.0';
        this.lastupdate = '2026-09-16';
        this.iconName = 'boxes';
        this.introText = OP_TEXT.introText;
        this.helpDescription = OP_TEXT.helpDescription;

        this.locationSpecs = {
            "standard": [
                { l: 10, d: 40, h: 2 }, { l: 10, d: 40, h: 3 }, { l: 10, d: 40, h: 4 }, { l: 10, d: 40, h: 5 }, { l: 10, d: 40, h: 6 }, { l: 10, d: 40, h: 7 }, { l: 10, d: 40, h: 8 }, { l: 10, d: 40, h: 11 },
                { l: 10, d: 50, h: 3 }, { l: 10, d: 50, h: 4 }, { l: 10, d: 50, h: 5 }, { l: 10, d: 50, h: 6 }, { l: 10, d: 50, h: 7 }, { l: 10, d: 50, h: 8 }, { l: 10, d: 50, h: 9 }, { l: 10, d: 50, h: 10 }, { l: 10, d: 50, h: 11 }, { l: 10, d: 50, h: 12 }, { l: 10, d: 50, h: 14 }, { l: 10, d: 50, h: 15 }, { l: 10, d: 50, h: 17 }, { l: 10, d: 50, h: 18 },
                { l: 10, d: 60, h: 2 }, { l: 10, d: 60, h: 3 }, { l: 10, d: 60, h: 4 }, { l: 10, d: 60, h: 5 }, { l: 10, d: 60, h: 6 }, { l: 10, d: 60, h: 7 }, { l: 10, d: 60, h: 8 }, { l: 10, d: 60, h: 9 }, { l: 10, d: 60, h: 10 }, { l: 10, d: 60, h: 11 }, { l: 10, d: 60, h: 12 }, { l: 10, d: 60, h: 13 }, { l: 10, d: 60, h: 14 }, { l: 10, d: 60, h: 15 }, { l: 10, d: 60, h: 16 }, { l: 10, d: 60, h: 18 },
                { l: 10, d: 80, h: 3 }, { l: 10, d: 80, h: 4 }, { l: 10, d: 80, h: 5 }, { l: 10, d: 80, h: 6 }, { l: 10, d: 80, h: 7 }, { l: 10, d: 80, h: 8 }, { l: 10, d: 80, h: 9 }, { l: 10, d: 80, h: 11 }, { l: 10, d: 80, h: 15 }, { l: 10, d: 80, h: 17 }, { l: 10, d: 80, h: 18 },
                { l: 20, d: 40, h: 2 }, { l: 20, d: 40, h: 3 }, { l: 20, d: 40, h: 4 }, { l: 20, d: 40, h: 5 }, { l: 20, d: 40, h: 6 }, { l: 20, d: 40, h: 7 }, { l: 20, d: 40, h: 8 }, { l: 20, d: 40, h: 9 }, { l: 20, d: 40, h: 10 }, { l: 20, d: 40, h: 11 }, { l: 20, d: 40, h: 12 }, { l: 20, d: 40, h: 13 }, { l: 20, d: 40, h: 14 }, { l: 20, d: 40, h: 15 },
                { l: 20, d: 50, h: 3 }, { l: 20, d: 50, h: 4 }, { l: 20, d: 50, h: 5 }, { l: 20, d: 50, h: 6 }, { l: 20, d: 50, h: 7 }, { l: 20, d: 50, h: 8 }, { l: 20, d: 50, h: 9 }, { l: 20, d: 50, h: 10 }, { l: 20, d: 50, h: 11 }, { l: 20, d: 50, h: 12 }, { l: 20, d: 50, h: 13 }, { l: 20, d: 50, h: 14 }, { l: 20, d: 50, h: 15 }, { l: 20, d: 50, h: 17 }, { l: 20, d: 50, h: 18 },
                { l: 20, d: 60, h: 2 }, { l: 20, d: 60, h: 3 }, { l: 20, d: 60, h: 4 }, { l: 20, d: 60, h: 5 }, { l: 20, d: 60, h: 6 }, { l: 20, d: 60, h: 7 }, { l: 20, d: 60, h: 8 }, { l: 20, d: 60, h: 9 }, { l: 20, d: 60, h: 10 }, { l: 20, d: 60, h: 11 }, { l: 20, d: 60, h: 12 }, { l: 20, d: 60, h: 13 }, { l: 20, d: 60, h: 14 }, { l: 20, d: 60, h: 15 }, { l: 20, d: 60, h: 18 }, { l: 20, d: 60, h: 19 },
                { l: 20, d: 80, h: 3 }, { l: 20, d: 80, h: 4 }, { l: 20, d: 80, h: 5 }, { l: 20, d: 80, h: 6 }, { l: 20, d: 80, h: 7 }, { l: 20, d: 80, h: 8 }, { l: 20, d: 80, h: 9 }, { l: 20, d: 80, h: 11 }, { l: 20, d: 80, h: 15 }, { l: 20, d: 80, h: 18 },
                { l: 20, d: 100, h: 3 }, { l: 20, d: 100, h: 4 }, { l: 20, d: 100, h: 5 }, { l: 20, d: 100, h: 6 }, { l: 20, d: 100, h: 7 },
                { l: 40, d: 40, h: 3 }, { l: 40, d: 40, h: 4 }, { l: 40, d: 40, h: 5 }, { l: 40, d: 40, h: 6 }, { l: 40, d: 40, h: 7 }, { l: 40, d: 40, h: 8 }, { l: 40, d: 40, h: 9 }, { l: 40, d: 40, h: 11 }, { l: 40, d: 40, h: 15 },
                { l: 40, d: 50, h: 3 }, { l: 40, d: 50, h: 4 }, { l: 40, d: 50, h: 5 }, { l: 40, d: 50, h: 6 }, { l: 40, d: 50, h: 7 }, { l: 40, d: 50, h: 8 }, { l: 40, d: 50, h: 10 }, { l: 40, d: 50, h: 11 }, { l: 40, d: 50, h: 12 }, { l: 40, d: 50, h: 13 }, { l: 40, d: 50, h: 14 }, { l: 40, d: 50, h: 15 }, { l: 40, d: 50, h: 16 }, { l: 40, d: 50, h: 17 },
                { l: 40, d: 60, h: 3 }, { l: 40, d: 60, h: 4 }, { l: 40, d: 60, h: 5 }, { l: 40, d: 60, h: 6 }, { l: 40, d: 60, h: 7 }, { l: 40, d: 60, h: 8 }, { l: 40, d: 60, h: 9 }, { l: 40, d: 60, h: 10 }, { l: 40, d: 60, h: 11 }, { l: 40, d: 60, h: 15 },
                { l: 40, d: 80, h: 3 }, { l: 40, d: 80, h: 4 }, { l: 40, d: 80, h: 5 }, { l: 40, d: 80, h: 6 }, { l: 40, d: 80, h: 7 }, { l: 40, d: 80, h: 8 }, { l: 40, d: 80, h: 11 }, { l: 40, d: 80, h: 15 }, { l: 40, d: 80, h: 17 }, { l: 40, d: 80, h: 18 },
                { l: 40, d: 100, h: 3 }, { l: 40, d: 100, h: 4 }, { l: 40, d: 100, h: 5 }, { l: 40, d: 100, h: 6 }, { l: 40, d: 100, h: 7 }, { l: 40, d: 100, h: 11 }, { l: 40, d: 100, h: 15 }
            ],
            "top": [
                { l: 80, d: 40, h: 0 }, { l: 120, d: 40, h: 0 }, { l: 120, d: 50, h: 0 }, { l: 120, d: 60, h: 0 }, { l: 120, d: 80, h: 0 }, { l: 120, d: 100, h: 0 },
                { l: 150, d: 40, h: 0 }, { l: 150, d: 50, h: 0 }, { l: 150, d: 60, h: 0 }, { l: 150, d: 80, h: 0 }, { l: 150, d: 100, h: 0 },
                { l: 172, d: 60, h: 0 },
                { l: 200, d: 40, h: 0 }, { l: 200, d: 50, h: 0 }, { l: 200, d: 60, h: 0 }, { l: 200, d: 80, h: 0 }, { l: 200, d: 100, h: 0 },
                { l: 255, d: 60, h: 0 }
            ]
        };
        this.validShelfSpecs = [
            { l: 80, d: 40 }, { l: 120, d: 40 }, { l: 120, d: 50 }, { l: 120, d: 60 }, { l: 120, d: 80 }, { l: 120, d: 100 },
            { l: 150, d: 40 }, { l: 150, d: 50 }, { l: 150, d: 60 }, { l: 150, d: 80 }, { l: 150, d: 100 },
            { l: 172, d: 60 },
            { l: 200, d: 40 }, { l: 200, d: 50 }, { l: 200, d: 60 }, { l: 200, d: 80 }, { l: 200, d: 100 },
            { l: 255, d: 60 }
        ];

        this._iconCache = {
            upload: this.app.getIcon('upload'),
            xlsx: this.app.getIcon('filetype-xlsx'),
            zip: this.app.getIcon('file-zip'),
            refresh: this.app.getIcon('arrow-repeat'),
            copy: this.app.getIcon('copy'),
            x: this.app.getIcon('x'),
        };
    }

    injectStyles() {
        this.app.injectStyle(this.id, OP_TEXT.styles);
    }

    // ==================== 规格解析 ====================
    getLocationSpecName(spec) {
        if (spec.h === 0) {
            let lengthMeters = (spec.l / 100).toFixed(1);
            let depthMeters = (spec.d / 100).toFixed(1);
            return OP_TEXT.spec_topLocation.replace('{l}', lengthMeters).replace('{d}', depthMeters);
        } else {
            return OP_TEXT.spec_standardLocation.replace('{l}', spec.l).replace('{d}', spec.d).replace('{h}', spec.h);
        }
    }

    getShelfSpecDescription(length, depth) {
        let spec = this.validShelfSpecs.find(s => s.l === length && s.d === depth);
        if (spec) {
            let lengthMeters = (spec.l / 100).toFixed(2).replace(/\.?0+$/, '');
            let depthMeters = (spec.d / 100).toFixed(2).replace(/\.?0+$/, '');
            return `W${lengthMeters}M*D${depthMeters}M`;
        }
        return OP_TEXT.spec_fallbackDescription.replace('{l}', length).replace('{d}', depth);
    }

    validateShelfSpecCombination(length, depth) {
        let intLength = parseInt(length);
        let intDepth = parseInt(depth);
        if (isNaN(intLength) || isNaN(intDepth)) return false;
        return this.validShelfSpecs.some(spec => spec.l === intLength && spec.d === intDepth);
    }

    getValidShelfSpecs() {
        return this.validShelfSpecs.map(spec => {
            let lengthMeters = (spec.l / 100).toFixed(2).replace(/\.?0+$/, '');
            let depthMeters = (spec.d / 100).toFixed(2).replace(/\.?0+$/, '');
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
            let match = specName.match(/W([\d.]+)M\*D([\d.]+)M/);
            if (match) {
                let length = parseFloat(match[1]) * 100;
                let depth = parseFloat(match[2]) * 100;
                return { l: length, d: depth, h: 0, type: "top", name: specName };
            }
        }
        let match = specName.match(/长(\d+)cm深(\d+)cm高(\d+)圆孔/);
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
        let sorted = [...availableLengths].sort((a, b) => b - a);
        function backtrack(remainingLength, remainingCount, current, startIndex) {
            if (remainingCount === 0 && remainingLength === 0) return current;
            if (remainingCount === 0 || remainingLength < 0) return null;
            let minPossible = remainingCount * Math.min(...sorted);
            let maxPossible = remainingCount * Math.max(...sorted);
            if (remainingLength < minPossible || remainingLength > maxPossible) return null;
            for (let i = startIndex; i < sorted.length; i++) {
                let length = sorted[i];
                if (length <= remainingLength) {
                    let result = backtrack(remainingLength - length, remainingCount - 1, [...current, length], i);
                    if (result) return result;
                }
            }
            return null;
        }
        return backtrack(targetLength, count, [], 0);
    }

    findHeightCombinations(layerCount, availableSpecs) {
        let targetMin = 22, targetMax = 24;
        let availableHeights = [...new Set(availableSpecs.map(spec => spec.h))].sort((a, b) => a - b);
        const MAX_NODES = 10000;
        let visited = 0;
        function findCombinations(current, total) {
            visited++;
            if (visited > MAX_NODES) return null;
            if (current.length === layerCount) {
                if (total >= targetMin && total <= targetMax) return [current];
                return [];
            }
            let combinations = [];
            for (let height of availableHeights) {
                let newTotal = total + height;
                let remaining = layerCount - current.length - 1;
                let minPossible = newTotal + remaining * Math.min(...availableHeights);
                let maxPossible = newTotal + remaining * Math.max(...availableHeights);
                if (minPossible <= targetMax && maxPossible >= targetMin) {
                    let results = findCombinations([...current, height], newTotal);
                    if (results === null) return null;
                    combinations = combinations.concat(results);
                }
            }
            return combinations;
        }
        const result = findCombinations([], 0);
        return result === null ? [] : result;
    }

    generateLayerSpecCombination(availableLength, locationCount, availableSpecs, layerHeight) {
        let layerAvailable = availableSpecs.filter(spec => spec.h === layerHeight);
        if (layerAvailable.length === 0) {
            throw new Error(OP_TEXT.err_noSpecForHeight.replace('{h}', layerHeight));
        }
        let availableLengths = [...new Set(layerAvailable.map(spec => spec.l))].sort((a, b) => a - b);
        let lengthCombo = this.findExactLengthCombination(availableLength, locationCount, availableLengths);
        if (!lengthCombo) {
            throw new Error(OP_TEXT.err_noExactLength.replace('{n}', locationCount).replace('{len}', availableLength).replace('{list}', availableLengths.join(',')));
        }
        let specCombo = [];
        for (let length of lengthCombo) {
            let spec = layerAvailable.find(s => s.l === length);
            if (spec) specCombo.push(spec);
        }
        return specCombo;
    }

    findTopLocationSpec(shelfLength, shelfDepth) {
        let topSpecs = (this.locationSpecs.top || []).filter(spec => spec.l === shelfLength && spec.d === shelfDepth);
        if (topSpecs.length > 0) return topSpecs[0];
        return { l: shelfLength, d: shelfDepth, h: 0 };
    }

    generateShelfLocations(shelfCode, department, area, priority, layerCount, layerLocationSettings,
                           shelfLength, shelfDepth, generateTop, startLayerOffset) {
        let availableLengthPerLayer = shelfLength - 20;
        let availableLocations = this.locationSpecs.standard || [];
        let filtered = availableLocations.filter(spec => spec.d === shelfDepth);
        if (filtered.length === 0) {
            throw new Error(OP_TEXT.err_noSpecForDepth.replace('{d}', shelfDepth));
        }
        let heightCombinations = this.findHeightCombinations(layerCount, filtered);
        if (heightCombinations.length === 0) {
            throw new Error(OP_TEXT.err_noHeightCombo.replace('{n}', layerCount));
        }
        let successfulCombo = null;
        for (let heightCombo of heightCombinations) {
            let layerSpecs = {};
            let allOk = true;
            for (let layer = 1; layer <= layerCount; layer++) {
                let layerHeight = heightCombo[layer - 1];
                let locationsPerLayer = layerLocationSettings[layer];
                try {
                    let specCombo = this.generateLayerSpecCombination(availableLengthPerLayer, locationsPerLayer, filtered, layerHeight);
                    layerSpecs[layer] = specCombo;
                } catch (error) {
                    allOk = false;
                    break;
                }
            }
            if (allOk) {
                successfulCombo = { heightCombo, layerSpecs };
                break;
            }
        }
        if (!successfulCombo) {
            throw new Error(OP_TEXT.err_noSuitableCombo);
        }
        let { heightCombo, layerSpecs } = successfulCombo;
        let newLocations = [];
        for (let layer = 1; layer <= layerCount; layer++) {
            let actualLayer = layer + startLayerOffset - 1;
            let layerStr = actualLayer.toString().padStart(2, '0');
            let specCombo = layerSpecs[layer];
            let locationsPerLayer = layerLocationSettings[layer];
            for (let position = 1; position <= locationsPerLayer; position++) {
                let positionStr = position.toString().padStart(2, '0');
                let locationCode = `${shelfCode}-${layerStr}-${positionStr}`;
                let specIndex = (position - 1) % specCombo.length;
                let spec = specCombo[specIndex];
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
            let actualTopLayer = (layerCount + 1) + startLayerOffset - 1;
            let topLayerStr = actualTopLayer.toString().padStart(2, '0');
            let topLocationCode = `${shelfCode}-${topLayerStr}-01`;
            let topSpec = this.findTopLocationSpec(shelfLength, shelfDepth);
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
        let existingChanges = [];
        let newSet = new Set(newLocations.map(l => l.locationCode));
        let deletedLocations = [];
        existingLocations.forEach(existing => {
            let locationCode = existing['库位编码'];
            if (newSet.has(locationCode)) {
                let newLocation = newLocations.find(l => l.locationCode === locationCode);
                let existingSpec = this.parseLocationSpec(existing['库位规格名称']);
                let newSpec = this.parseLocationSpec(newLocation.locationSpecName);
                if (existingSpec.name !== newSpec.name) {
                    let deptParts = existing['所属部门'].split('-');
                    let shortDept = deptParts.slice(0, 2).join('-');
                    let record = {
                        '仓库名称': shortDept,
                        '库位号': existing['库位编码'],
                        '名称': '',
                        '分拣排序': existing['分拣优先级'] || '',
                        '上架排序': '',
                        '逻辑区名称': '',
                        '单独打包分区编号': '',
                        '库位规格名称': newLocation.locationSpecName,
                        '库位BAND': '',
                        '批次码库位': '',
                        '常温短保品库位': ''
                    };
                    existingChanges.push(record);
                }
            } else {
                let parts = locationCode.split('-');
                if (parts.length === 5) {
                    let [zone, area, shelf, layer, position] = parts;
                    if (!/^\d{2}$/.test(area) || !/^\d{2}$/.test(shelf) || layer === "DD" || !/^\d{2}$/.test(layer) || !/^\d{2}$/.test(position)) return;
                    let layerNum = parseInt(layer);
                    let positionNum = parseInt(position);
                    let shouldDelete = false;
                    let minLayer = startLayerOffset;
                    let maxLayer = startLayerOffset + layerCount - 1;
                    let topExpectedLayer = generateTop ? startLayerOffset + layerCount : null;

                    if (layerNum === topExpectedLayer) {
                        if (positionNum !== 1 || !generateTop) shouldDelete = true;
                    } else if (layerNum > (generateTop ? topExpectedLayer : maxLayer)) {
                        shouldDelete = true;
                    } else if (layerNum >= minLayer && layerNum <= maxLayer) {
                        let internalLayer = layerNum - startLayerOffset + 1;
                        if (positionNum > layerLocationSettings[internalLayer]) shouldDelete = true;
                    } else {
                        shouldDelete = true;
                    }
                    if (shouldDelete) {
                        deletedLocations.push({ locationCode: locationCode, reason: OP_TEXT.deleteReason.replace('{layer}', layer).replace('{pos}', position) });
                    }
                }
            }
        });
        if (generateTop) {
            let topExpectedLayer = startLayerOffset + layerCount;
            let topLayerStr = topExpectedLayer.toString().padStart(2, '0');
            let topLocationCode = `${shelfCode}-${topLayerStr}-01`;
            let existingTop = existingLocations.find(l => l['库位编码'] === topLocationCode);
            let newTop = newLocations.find(l => l.locationCode === topLocationCode);
            if (existingTop && newTop) {
                let existingSpec = this.parseLocationSpec(existingTop['库位规格名称']);
                let newSpec = this.parseLocationSpec(newTop.locationSpecName);
                if (existingSpec.name !== newSpec.name) {
                    let alreadyExists = existingChanges.some(c => c['库位号'] === topLocationCode);
                    if (!alreadyExists) {
                        let deptParts = existingTop['所属部门'].split('-');
                        let shortDept = deptParts.slice(0, 2).join('-');
                        let record = {
                            '仓库名称': shortDept,
                            '库位号': existingTop['库位编码'],
                            '名称': '',
                            '分拣排序': existingTop['分拣优先级'] || '',
                            '上架排序': '',
                            '逻辑区名称': '',
                            '单独打包分区编号': '',
                            '库位规格名称': newTop.locationSpecName,
                            '库位BAND': '',
                            '批次码库位': '',
                            '常温短保品库位': ''
                        };
                        existingChanges.push(record);
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
        let topLocations = locations.filter(l => {
            let spec = this.parseLocationSpec(l['库位规格名称']);
            return spec.type === 'top';
        });
        if (topLocations.length > 0) {
            let topSpec = this.parseLocationSpec(topLocations[0]['库位规格名称']);
            shelfLength = topSpec.l;
            shelfDepth = topSpec.d;
            hasTop = true;
        } else {
            let layers = {};
            locations.forEach(l => {
                let locationCode = l['库位编码'];
                let parts = locationCode.split('-');
                if (parts.length >= 4) {
                    let layer = parts[3];
                    if (!layers[layer]) layers[layer] = [];
                    layers[layer].push(l);
                }
            });
            Object.keys(layers).forEach(layer => {
                let layerLength = 0;
                layers[layer].forEach(l => {
                    let spec = this.parseLocationSpec(l['库位规格名称']);
                    if (spec.l > 0 && spec.type !== 'top') {
                        layerLength += spec.l;
                    }
                    if (spec.d > 0 && shelfDepth === 0) {
                        shelfDepth = spec.d;
                    }
                });
                layerLength += 20;
                if (layerLength > shelfLength) shelfLength = layerLength;
            });
        }
        let nonTopLocations = locations.filter(l => {
            let spec = this.parseLocationSpec(l['库位规格名称']);
            return spec.type !== 'top' && spec.h > 0;
        });
        let layers = {};
        nonTopLocations.forEach(l => {
            let locationCode = l['库位编码'];
            let parts = locationCode.split('-');
            if (parts.length >= 4) {
                let layer = parts[3];
                if (!layers[layer]) layers[layer] = [];
                layers[layer].push(l);
            }
        });
        Object.keys(layers).forEach(layer => {
            if (layers[layer].length > 0) {
                let spec = this.parseLocationSpec(layers[layer][0]['库位规格名称']);
                if (spec.h > 0) shelfHeight += spec.h;
            }
        });
        return {
            length: shelfLength,
            depth: shelfDepth,
            height: shelfHeight,
            hasTop: hasTop,
            availableLength: shelfLength - 20
        };
    }

    calculateShelfSpecs() {
        this.app.data.shelfSpecMap = new Map();
        let shelfGroups = {};
        this.app.data.shelfData.forEach(item => {
            let locationCode = item['库位编码'];
            if (locationCode) {
                let parts = locationCode.split('-');
                if (parts.length >= 3) {
                    let shelfCode = `${parts[0]}-${parts[1]}-${parts[2]}`;
                    if (!shelfGroups[shelfCode]) shelfGroups[shelfCode] = [];
                    shelfGroups[shelfCode].push(item);
                }
            }
        });
        Object.keys(shelfGroups).forEach(shelfCode => {
            let locations = shelfGroups[shelfCode];
            try {
                let spec = this.calculateShelfSpec(locations);
                let baseLocation = locations.find(l => {
                    let parts = l['库位编码'].split('-');
                    return parts.length === 5 && parts[3] === '01' && parts[4] === '01';
                });
                if (!baseLocation) {
                    baseLocation = locations.find(l => {
                        let parts = l['库位编码'].split('-');
                        return parts.length === 5 && parts[3] === '02' && parts[4] === '01';
                    });
                }
                if (baseLocation) {
                    spec.priority = baseLocation['分拣优先级'] || '';
                } else {
                    spec.priority = '';
                }
                this.app.data.shelfSpecMap.set(shelfCode, spec);
            } catch (error) {
                console.error(`计算货架${shelfCode}规格时出错:`, error);
                this.app.data.shelfSpecMap.set(shelfCode, { length: 0, depth: 0, height: 0, hasTop: false, priority: '' });
            }
        });
    }

    // ==================== Excel 处理 ====================
    processExcelData(data) {
        if (data.length < 2) {
            this.app.showMessage(OP_TEXT.msg_dataFormatError, 'error');
            return false;
        }
        let headers = data[0];
        this.app.data.shelfData = [];

        let requiredHeaders = [
            '库位号', '库位名称', '库区', '所属部门', '库位类型', '逻辑区名称', '单独打包分区编号',
            '营销属性', '是否可做补出库位', '是否可做补入库位', '分拣排序', '上架排序', '补货排序',
            '是否混放批次', '是否混放供应商', '存储类型', '后台类目', '库位规格名称', '库位BAND',
            '批次码库位', '常温短保品库位', '空存转态', '商品数', '风机辐射状态'
        ];

        let headerIndex = {};
        let missing = [];
        headers.forEach((header, idx) => {
            headerIndex[String(header).trim()] = idx;
        });
        requiredHeaders.forEach(rh => {
            if (!headerIndex.hasOwnProperty(rh)) missing.push(rh);
        });
        if (missing.length > 0) {
            this.app.showMessage(OP_TEXT.msg_missingColumns.replace('{cols}', missing.join(', ')), 'error');
            return false;
        }

        const deptPattern = (this.app.validations && this.app.validations.departmentPattern)
            || /^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/;

        for (let i = 1; i < data.length; i++) {
            let row = data[i];
            if (row.length === 0) continue;

            let department = row[headerIndex['所属部门']] || '';
            if (!deptPattern.test(department)) continue;

            let locationType = row[headerIndex['库位类型']] || '';
            if (String(locationType).trim() !== '分拣位') continue;

            let locationCode = row[headerIndex['库位号']] || '';
            if (!this.app.validateLocationCode(locationCode)) continue;

            let shelf = {
                '库位编码': locationCode,
                '所属库区': row[headerIndex['库区']] || '',
                '所属部门': department,
                '库位规格名称': row[headerIndex['库位规格名称']] || '',
                '分拣优先级': row[headerIndex['分拣排序']] || ''
            };
            this.app.data.shelfData.push(shelf);
        }

        if (this.app.data.shelfData.length > 0) {
            this.app.data.currentWarehouse = this.app.data.shelfData[0]['所属部门'] || '';
            document.getElementById('uploadedWarehouse').textContent = this.app.data.currentWarehouse || OP_TEXT.msg_noWarehouse;
        } else {
            this.app.showMessage(OP_TEXT.msg_noValidLocations, 'error');
            return false;
        }
        this.calculateShelfSpecs();
        this.populateShelfSelection();
        return true;
    }

    // ==================== 排序 / 导出 ====================
    sortShelves(shelves, sortType) {
        return shelves.sort((a, b) => {
            switch (sortType) {
                case 'shelfCode':
                    let aParts = a.code.split('-'), bParts = b.code.split('-');
                    for (let i = 1; i < Math.min(aParts.length, bParts.length); i++) {
                        let aNum = parseInt(aParts[i]), bNum = parseInt(bParts[i]);
                        if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
                        if (aParts[i] !== bParts[i]) return aParts[i].localeCompare(bParts[i]);
                    }
                    return aParts.length - bParts.length;
                case 'shelfSize':
                    if (a.spec.length !== b.spec.length) return b.spec.length - a.spec.length;
                    return b.spec.depth - a.spec.depth;
                case 'priority':
                    let aPri = parseInt(a.spec.priority) || 9999;
                    let bPri = parseInt(b.spec.priority) || 9999;
                    return aPri - bPri;
                case 'layerCount':
                    return b.layerCount - a.layerCount;
                default:
                    return 0;
            }
        });
    }

    generateExistingChangesWorkbook() {
        let workbook = XLSX.utils.book_new();
        let data = [
            ['仓库名称', '库位号', '名称', '分拣排序', '上架排序',
             '逻辑区名称', '单独打包分区编号', '库位规格名称', '库位BAND', '批次码库位', '常温短保品库位']
        ];
        this.app.data.optimizationResult.existingChanges.forEach(change => {
            data.push([
                change["仓库名称"] || "",
                change["库位号"],
                "",
                change["分拣排序"] || "",
                change["上架排序"] || "",
                change["逻辑区名称"] || "",
                change["单独打包分区编号"] || "",
                change["库位规格名称"] || "",
                "",
                "",
                ""
            ]);
        });
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, '批量更改');
        return workbook;
    }

    generateNewLocationsWorkbook() {
        let workbook = XLSX.utils.book_new();
        let data = [
            ['库位号', '库位名称', '库区', '所属部门', '库位类型', '逻辑区名称', '单独打包分区编号',
             '营销属性', '是否可做补出库位', '是否可做补入库位', '分拣排序', '上架排序', '补货排序',
             '是否混放批次', '是否混放供应商', '存储类型', '后台类目', '库位规格名称', '库位BAND',
             '批次码库位', '常温短保品库位']
        ];
        this.app.data.optimizationResult.newLocations.forEach(location => {
            data.push([
                location.locationCode, location.name, location.area, location.department, location.type,
                location.logicalArea, location.separatePacking, location.marketAttribute, location.canOut,
                location.canIn, location.sortingPriority, location.putawayPriority, location.replenishPriority,
                location.mixBatch, location.mixSupplier, location.storageType, location.backgroundCategory,
                location.locationSpecName, location.locationBand, location.batchCode, location.normShort
            ]);
        });
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, '新增库位');
        return workbook;
    }

    getExportFilePrefix() {
        let shelfCodes = this.app.data.selectedShelves.map(s => s.code).join('_');
        let dateStr = new Date().toISOString().slice(0, 10);
        return { shelfCodes, dateStr };
    }

    // ==================== 事件绑定 ====================
    bindEvents() {
        document.getElementById('uploadBtn')?.addEventListener('click', () => this.handleFileUpload());
        document.getElementById('generateBtn')?.addEventListener('click', () => this.generateOptimization());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportResults());
        document.getElementById('exportZipBtn')?.addEventListener('click', () => this.exportZip());
        document.getElementById('optResetBtn')?.addEventListener('click', () => this.resetTool());
        document.getElementById('resetOptimizationBtn')?.addEventListener('click', () => this.resetOptimization());
        document.getElementById('optSelectAllBtn')?.addEventListener('click', () => this.selectAll());
        document.getElementById('optDeselectAllBtn')?.addEventListener('click', () => this.deselectAll());
        document.getElementById('viewAllShelfSpecsBtn')?.addEventListener('click', () => this.showShelfSpecsModal());
        document.getElementById('layoutPreviewBtn')?.addEventListener('click', () => this.showLayoutPreview());

        const batchOption = document.getElementById('batchModeOption');
        const individualOption = document.getElementById('individualModeOption');
        if (batchOption && individualOption) {
            const handler = (e) => {
                [batchOption, individualOption].forEach(opt => opt.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                e.currentTarget.querySelector('input').checked = true;
                this.confirmOptimizationMode();
            };
            batchOption.addEventListener('click', handler);
            individualOption.addEventListener('click', handler);
        }

        document.getElementById('layerCount')?.addEventListener('input', () => {
            if (this.app.getOptimizationMode() === 'individual') {
                this._createLayerInputs(parseInt(document.getElementById('layerCount').value));
            }
        });
        document.getElementById('startLayerOffset')?.addEventListener('change', () => {
            if (this.app.getOptimizationMode() === 'individual') {
                this._createLayerInputs(parseInt(document.getElementById('layerCount').value));
            }
        });
    }

    _createLayerInputs(layerCount) {
        let container = document.getElementById('layerLocationInputs');
        if (!container) return;
        container.innerHTML = '';
        let startOffset = parseInt(document.getElementById('startLayerOffset')?.value || '1');
        for (let i = 1; i <= layerCount; i++) {
            let actualLayer = i + startOffset - 1;
            let div = document.createElement('div');
            div.className = 'layer-location-input';
            let label = document.createElement('label');
            label.textContent = OP_TEXT.label_layerLocation.replace('{n}', actualLayer);
            label.setAttribute('for', `layerLocation_${i}`);
            let input = document.createElement('input');
            input.type = 'number';
            input.id = `layerLocation_${i}`;
            input.min = '2';
            input.max = '20';
            input.value = '9';
            input.className = 'layer-location-input-field';
            div.appendChild(label);
            div.appendChild(input);
            container.appendChild(div);
        }
    }

    async handleFileUpload() {
        let fileInput = document.getElementById('fileInput');
        let file = fileInput.files[0];
        if (!file) {
            this.app.showMessage(OP_TEXT.msg_pleaseSelectFile, 'error');
            return;
        }
        try {
            let jsonData = await this.app.readExcel(file);
            if (jsonData.length > 50000) {
                this.app.showMessage('数据超过 5 万行，请拆分后上传', 'error');
                return;
            }
            let success = this.processExcelData(jsonData);
            if (success) {
                this.app.showMessage(OP_TEXT.msg_parseSuccess, 'success');
                document.getElementById('optimizationMode').classList.remove('hidden');
                document.getElementById('shelfSelection').classList.add('hidden');
                document.getElementById('optimizationParams').classList.add('hidden');
                document.getElementById('optimizationResults').classList.add('hidden');
            }
        } catch (error) {
            console.error('解析文件时出错:', error);
            this.app.showMessage(OP_TEXT.msg_parseFailed + error.message, 'error');
        }
    }

    populateShelfSelection() {
        let container = document.getElementById('shelfCheckboxContainer');
        container.innerHTML = '';

        let shelves = [...new Set(this.app.data.shelfData.map(item => {
            let locationCode = item['库位编码'];
            if (locationCode) {
                let parts = locationCode.split('-');
                if (parts.length >= 3) {
                    return `${parts[0]}-${parts[1]}-${parts[2]}`;
                }
            }
            return null;
        }).filter(Boolean))].filter(shelfCode => {
            return this.app.data.shelfData.some(item => {
                let code = item['库位编码'];
                if (!code || !code.startsWith(shelfCode)) return false;
                let parts = code.split('-');
                return parts.length >= 4 && parts[3] !== "DD";
            });
        });

        shelves.sort((a, b) => {
            let aParts = a.split('-'), bParts = b.split('-');
            for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
                let aVal = aParts[i], bVal = bParts[i];
                let aNum = parseInt(aVal), bNum = parseInt(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    if (aNum !== bNum) return aNum - bNum;
                } else {
                    if (aVal !== bVal) return aVal.localeCompare(bVal);
                }
            }
            return aParts.length - bParts.length;
        });

        shelves.forEach(shelf => {
            let div = document.createElement('div');
            div.className = 'shelf-checkbox';
            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `shelf-${shelf}`;
            checkbox.value = shelf;
            let label = document.createElement('label');
            label.htmlFor = `shelf-${shelf}`;
            let spec = this.app.data.shelfSpecMap.get(shelf);
            if (spec) {
                let currentLayers = [...new Set(this.app.data.shelfData.filter(item => {
                    let locationCode = item['库位编码'];
                    return locationCode && locationCode.startsWith(shelf) &&
                        this.parseLocationSpec(item['库位规格名称']).type !== 'top';
                }).map(item => {
                    let parts = item['库位编码'].split('-');
                    return parts.length >= 4 ? parts[3] : null;
                }))].filter(Boolean);
                label.textContent = OP_TEXT.shelfLabel
                    .replace('{code}', shelf)
                    .replace('{length}', spec.length)
                    .replace('{layers}', currentLayers.length)
                    .replace('{prio}', spec.priority || OP_TEXT.priority_notFound);
            } else {
                label.textContent = shelf;
            }
            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
            checkbox.addEventListener('change', () => this.updateSelectedShelves());
        });

        let searchContainer = document.querySelector('.shelf-search');
        if (searchContainer) {
            let oldInput = document.getElementById('shelfSearchInput');
            if (oldInput) {
                let newInput = oldInput.cloneNode(true);
                oldInput.parentNode.replaceChild(newInput, oldInput);
            }
            let oldClear = document.querySelector('.clear-svg');
            if (oldClear) oldClear.remove();
        }

        let searchInput = document.getElementById('shelfSearchInput');
        if (searchInput) {
            let clearBtn = document.createElement('span');
            clearBtn.className = 'clear-svg';
            clearBtn.innerHTML = this._iconCache.x;
            clearBtn.style.display = 'none';
            searchInput.parentNode.appendChild(clearBtn);

            const filterShelves = (val) => {
                let searchTerm = val.replace(/-/g, '').toLowerCase();
                document.querySelectorAll('#shelfCheckboxContainer .shelf-checkbox').forEach(div => {
                    let checkbox = div.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        let shelfCode = checkbox.value;
                        let codeNoDash = shelfCode.replace(/-/g, '').toLowerCase();
                        div.style.display = codeNoDash.includes(searchTerm) ? 'flex' : 'none';
                    } else {
                        div.style.display = 'none';
                    }
                });
            };

            searchInput.addEventListener('input', (e) => {
                let val = e.target.value;
                clearBtn.style.display = val ? 'block' : 'none';
                filterShelves(val);
            });
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                filterShelves('');
                searchInput.focus();
            });
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    clearBtn.style.display = 'none';
                    filterShelves('');
                }
            });
        }

        this.app.data.selectedShelves = [];
        this.app.data.currentShelfSpec = null;
        document.getElementById('optSelectedCount').textContent = OP_TEXT.msg_selectedCount.replace('{n}', 0);
        this.updateShelfSpecInfo();
    }

    selectAll() {
        let baseSpec = null;
        if (this.app.data.selectedShelves.length > 0) {
            baseSpec = this.app.data.shelfSpecMap.get(this.app.data.selectedShelves[0].code);
        } else {
            this.app.showMessage(OP_TEXT.msg_selectBaseShelf, 'info');
            return;
        }
        document.querySelectorAll('#shelfCheckboxContainer input[type="checkbox"]:not(:disabled)').forEach(cb => {
            let shelfCode = cb.value;
            let spec = this.app.data.shelfSpecMap.get(shelfCode);
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
            let shelfCode = cb.value;
            let shelfLocations = this.app.data.shelfData.filter(item => {
                let locationCode = item['库位编码'];
                return locationCode && locationCode.startsWith(shelfCode);
            });
            if (shelfLocations.length > 0) {
                this.app.data.selectedShelves.push({ code: shelfCode, locations: shelfLocations });
            }
        });

        if (this.app.data.selectedShelves.length > 0) {
            baseSpec = this.app.data.shelfSpecMap.get(this.app.data.selectedShelves[0].code);
        }

        document.querySelectorAll('#shelfCheckboxContainer .shelf-checkbox').forEach(div => {
            let checkbox = div.querySelector('input[type="checkbox"]');
            if (!checkbox) return;
            let shelfCode = checkbox.value;
            let spec = this.app.data.shelfSpecMap.get(shelfCode);
            if (baseSpec && spec && (spec.length !== baseSpec.length || spec.depth !== baseSpec.depth)) {
                checkbox.disabled = true;
                div.classList.add('disabled');
            } else {
                checkbox.disabled = false;
                div.classList.remove('disabled');
            }
        });

        document.getElementById('optSelectedCount').textContent = OP_TEXT.msg_selectedCount.replace('{n}', this.app.data.selectedShelves.length);
        document.getElementById('shelfSelection').classList.remove('hidden');
        document.getElementById('optimizationParams').classList.remove('hidden');
        if (this.app.data.selectedShelves.length > 0) {
            this.updateShelfSpecInfo();
            document.getElementById('resetOptimizationBtn').disabled = false;
        } else {
            this.app.data.currentShelfSpec = null;
            document.getElementById('shelfSpecInfo').innerHTML = '';
            document.getElementById('resetOptimizationBtn').disabled = true;
        }
    }

    updateShelfSpecInfo() {
        let infoDiv = document.getElementById('shelfSpecInfo');
        if (this.app.data.selectedShelves.length === 0) {
            infoDiv.innerHTML = '';
            return;
        }
        let firstSpec = this.app.data.shelfSpecMap.get(this.app.data.selectedShelves[0].code);
        let allSame = this.app.data.selectedShelves.every(s => {
            let sp = this.app.data.shelfSpecMap.get(s.code);
            return sp && sp.length === firstSpec.length && sp.depth === firstSpec.depth;
        });
        if (allSame && firstSpec) {
            let specDesc = this.getShelfSpecDescription(firstSpec.length, firstSpec.depth);
            infoDiv.innerHTML = `<div class="panel-box shelf-info"><h3>${OP_TEXT.info_selectedShelfSpec}</h3><p>${OP_TEXT.info_specLine.replace('{l}', firstSpec.length).replace('{d}', firstSpec.depth).replace('{desc}', specDesc)}</p><p class="note">${OP_TEXT.info_specEditHint}</p></div>`;
            let lengthInput = document.getElementById('shelfLengthInput');
            let depthInput = document.getElementById('shelfDepthInput');
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
        let lengthInput = document.getElementById('shelfLengthInput');
        let depthInput = document.getElementById('shelfDepthInput');
        let lengthMsg = document.getElementById('shelfLengthValidation');
        let depthMsg = document.getElementById('shelfDepthValidation');
        if (!lengthInput || !depthInput) return;
        let lengthVal = parseInt(lengthInput.value);
        let depthVal = parseInt(depthInput.value);
        if (isNaN(lengthVal) || isNaN(depthVal)) {
            lengthMsg.textContent = OP_TEXT.validation_enterValidNumber;
            lengthMsg.className = 'validation-message validation-invalid';
            lengthInput.className = 'validation-invalid';
            depthMsg.textContent = OP_TEXT.validation_enterValidNumber;
            depthMsg.className = 'validation-message validation-invalid';
            depthInput.className = 'validation-invalid';
            return;
        }
        let isValid = this.validateShelfSpecCombination(lengthVal, depthVal);
        if (isValid) {
            let specDesc = this.getShelfSpecDescription(lengthVal, depthVal);
            const okMsg = OP_TEXT.validation_specOk.replace('{desc}', specDesc);
            lengthMsg.textContent = okMsg;
            lengthMsg.className = 'validation-message validation-valid';
            lengthInput.className = 'validation-valid';
            depthMsg.textContent = okMsg;
            depthMsg.className = 'validation-message validation-valid';
            depthInput.className = 'validation-valid';
        } else {
            let validSpecs = this.getValidShelfSpecs();
            let specText = validSpecs.map(spec => spec.format).join('、');
            const errMsg = OP_TEXT.validation_specInvalid.replace('{list}', specText);
            lengthMsg.textContent = errMsg;
            lengthMsg.className = 'validation-message validation-invalid';
            lengthInput.className = 'validation-invalid';
            depthMsg.textContent = errMsg;
            depthMsg.className = 'validation-message validation-invalid';
            depthInput.className = 'validation-invalid';
        }
    }

    showShelfSpecsModal() {
        if (this.app.data.shelfData.length === 0) {
            this.app.showMessage(OP_TEXT.msg_uploadFirst, 'error');
            return;
        }
        this.refreshShelfSpecsDisplay();
        let extraControls = document.createElement('div');
        extraControls.innerHTML = `
            <div class="sort-options">
                <label for="shelfSortSelect">${OP_TEXT.sort_label}</label>
                <select id="shelfSortSelect">
                    <option value="shelfCode">${OP_TEXT.th_sortShelfCode}</option>
                    <option value="shelfSize">${OP_TEXT.th_sortShelfSize}</option>
                    <option value="priority">${OP_TEXT.th_sortPriority}</option>
                    <option value="layerCount">${OP_TEXT.th_sortLayerCount}</option>
                </select>
            </div>
        `;
        this.app.showModal(OP_TEXT.heading_shelfSpecList, '', extraControls);
        this.refreshShelfSpecsDisplay();
        let select = document.getElementById('shelfSortSelect');
        if (select) select.addEventListener('change', () => this.refreshShelfSpecsDisplay());
    }

    refreshShelfSpecsDisplay() {
        let shelvesByArea = {};
        this.app.data.shelfSpecMap.forEach((spec, shelfCode) => {
            let area = shelfCode.split('-').slice(0, 2).join('-');
            if (!shelvesByArea[area]) shelvesByArea[area] = [];
            let currentLayers = [...new Set(this.app.data.shelfData.filter(item => {
                let locationCode = item['库位编码'];
                return locationCode && locationCode.startsWith(shelfCode) &&
                    this.parseLocationSpec(item['库位规格名称']).type !== 'top';
            }).map(item => {
                let parts = item['库位编码'].split('-');
                return parts.length >= 4 ? parts[3] : null;
            }))].filter(Boolean);
            let hasFirstLayer = this.app.data.shelfData.some(item => {
                let locationCode = item['库位编码'];
                return locationCode && locationCode.startsWith(shelfCode) && locationCode.split('-')[3] === '01';
            });
            shelvesByArea[area].push({
                code: shelfCode,
                spec: spec,
                layerCount: currentLayers.length,
                hasFirstLayer: hasFirstLayer,
                area: area
            });
        });
        this.renderShelfSpecs(shelvesByArea);
    }

    renderShelfSpecs(shelvesByArea) {
        let modalBody = document.getElementById('modalBody');
        let sortType = document.getElementById('shelfSortSelect')?.value || 'shelfCode';
        let html = '';
        if (sortType === 'priority') {
            let all = [];
            Object.keys(shelvesByArea).forEach(area => {
                all.push(...shelvesByArea[area]);
            });
            let sorted = this.sortShelves(all, sortType);
            html += `<div class="area-header">${OP_TEXT.allShelvesByPriority}</div>`;
            sorted.forEach(shelf => {
                let hasTop = shelf.spec.hasTop ? `<span class="shelf-spec-has-top">${OP_TEXT.hasTop_yes}</span>` : `<span class="shelf-spec-no-top">${OP_TEXT.hasTop_no}</span>`;
                let hasFirstText = shelf.hasFirstLayer ? `<span class="shelf-spec-has-top">${OP_TEXT.hasFirst_yes}</span>` : `<span class="shelf-spec-no-top">${OP_TEXT.hasFirst_no}</span>`;
                let specDesc = this.getShelfSpecDescription(shelf.spec.length, shelf.spec.depth);
                html += `<div class="shelf-spec-item">${OP_TEXT.shelfSpecItem.replace('{code}', shelf.code).replace('{desc}', specDesc).replace('{layers}', shelf.layerCount).replace('{hasTop}', hasTop).replace('{hasFirst}', hasFirstText).replace('{prio}', shelf.spec.priority || OP_TEXT.priority_notFound)}</div>`;
            });
        } else {
            let sortedAreas = Object.keys(shelvesByArea).sort();
            sortedAreas.forEach(area => {
                let sorted = this.sortShelves(shelvesByArea[area], sortType);
                html += `<div class="area-header">${OP_TEXT.areaHeader.replace('{area}', area)}</div>`;
                sorted.forEach(shelf => {
                    let hasTop = shelf.spec.hasTop ? `<span class="shelf-spec-has-top">${OP_TEXT.hasTop_yes}</span>` : `<span class="shelf-spec-no-top">${OP_TEXT.hasTop_no}</span>`;
                    let hasFirstText = shelf.hasFirstLayer ? `<span class="shelf-spec-has-top">${OP_TEXT.hasFirst_yes}</span>` : `<span class="shelf-spec-no-top">${OP_TEXT.hasFirst_no}</span>`;
                    let specDesc = this.getShelfSpecDescription(shelf.spec.length, shelf.spec.depth);
                    html += `<div class="shelf-spec-item">${OP_TEXT.shelfSpecItem.replace('{code}', shelf.code).replace('{desc}', specDesc).replace('{layers}', shelf.layerCount).replace('{hasTop}', hasTop).replace('{hasFirst}', hasFirstText).replace('{prio}', shelf.spec.priority || OP_TEXT.priority_notFound)}</div>`;
                });
                html += '<div style="margin: 10px 0;"></div>';
            });
        }
        modalBody.innerHTML = html;
    }

    confirmOptimizationMode() {
        this.app.updateUIfOptimizationMode();
        let layerCount = parseInt(document.getElementById('layerCount').value);
        if (this.app.getOptimizationMode() === 'individual') {
            this._createLayerInputs(layerCount);
        }
        this.app.data.selectedShelves = [];
        document.getElementById('optSelectedCount').textContent = OP_TEXT.msg_selectedCount.replace('{n}', 0);
        document.getElementById('shelfCheckboxContainer').innerHTML = '';
        this.populateShelfSelection();
        document.getElementById('shelfSelection').classList.remove('hidden');
    }

    generateOptimization() {
        if (this.app.data.selectedShelves.length === 0) {
            this.app.showMessage(OP_TEXT.msg_pleaseSelectAtLeastOne, 'error');
            return;
        }
        let lengthInput = document.getElementById('shelfLengthInput');
        let depthInput = document.getElementById('shelfDepthInput');
        if (!lengthInput || !depthInput) {
            this.app.showMessage(OP_TEXT.msg_cannotGetSpec, 'error');
            return;
        }
        let shelfLength = parseInt(lengthInput.value);
        let shelfDepth = parseInt(depthInput.value);
        if (!this.validateShelfSpecCombination(shelfLength, shelfDepth)) {
            let specDesc = this.getShelfSpecDescription(shelfLength, shelfDepth);
            this.app.showMessage(OP_TEXT.msg_specNotStandard.replace('{desc}', specDesc), 'error');
            return;
        }
        let generateTop = document.getElementById('generateTopCheckbox').checked;
        let startLayerOffset = parseInt(document.getElementById('startLayerOffset')?.value || '1');
        if (isNaN(startLayerOffset)) startLayerOffset = 1;

        this.clearOptimizationResults();
        let layerCount = parseInt(document.getElementById('layerCount').value);
        let layerLocationSettings = this.app.getLayerLocationSettings();
        if (!layerCount || layerCount < 2) {
            this.app.showMessage(OP_TEXT.msg_invalidLayerCount, 'error');
            return;
        }
        for (let layer = 1; layer <= layerCount; layer++) {
            let locations = layerLocationSettings[layer];
            if (!locations || locations < 1) {
                this.app.showMessage(OP_TEXT.msg_invalidLayerLocations.replace('{layer}', layer), 'error');
                return;
            }
        }
        try {
            let allResults = { existingChanges: [], newLocations: [], deletedLocations: [] };
            this.app.data.selectedShelves.forEach(shelf => {
                let shelfSpec = this.app.data.shelfSpecMap.get(shelf.code);
                let department = shelf.locations[0]['所属部门'] || '';
                let area = shelf.locations[0]['所属库区'] || "";
                let priority = shelfSpec.priority || "";
                let newLocations = this.generateShelfLocations(
                    shelf.code, department, area, priority, layerCount, layerLocationSettings,
                    shelfLength, shelfDepth, generateTop, startLayerOffset
                );
                let analysis = this.analyzeExistingLocations(
                    shelf.locations, newLocations, shelf.code, layerCount, layerLocationSettings,
                    shelfLength, shelfDepth, generateTop, startLayerOffset
                );
                allResults.existingChanges.push(...analysis.existingChanges);
                allResults.newLocations.push(...analysis.newLocations);
                allResults.deletedLocations.push(...analysis.deletedLocations);
            });
            this.app.data.optimizationResult = allResults;
            this.displayOptimizationResults();
            document.getElementById('optimizationResults').classList.remove('hidden');
            document.getElementById('resetOptimizationBtn').disabled = false;
            this.app.showMessage(OP_TEXT.msg_generateOk.replace('{n}', this.app.data.selectedShelves.length), 'success');
        } catch (error) {
            this.app.showMessage(error.message, 'error');
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
        let existingTable = document.getElementById('existingChanges').querySelector('tbody');
        existingTable.innerHTML = '';
        this.app.data.optimizationResult.existingChanges.forEach(change => {
            let row = document.createElement('tr');
            row.innerHTML = `
                <td>${esc(change['仓库名称'] || '')}</td>
                <td>${esc(change['库位号'])}</td>
                <td>${esc(change['名称'] || '')}</td>
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
        let newTable = document.getElementById('newLocations').querySelector('tbody');
        newTable.innerHTML = '';
        this.app.data.optimizationResult.newLocations.forEach(location => {
            let row = document.createElement('tr');
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
            `;
            newTable.appendChild(row);
        });
        let deletedTable = document.getElementById('deletedLocations').querySelector('tbody');
        deletedTable.innerHTML = '';
        this.app.data.optimizationResult.deletedLocations.forEach(deleted => {
            let row = document.createElement('tr');
            row.innerHTML = `
                <td>${esc(deleted.locationCode)}</td>
                <td>${esc(deleted.reason || OP_TEXT.deleteReason_default)}</td>
            `;
            deletedTable.appendChild(row);
        });
    }

    async exportResults() {
        if (!this.app.data.optimizationResult) {
            this.app.showMessage(OP_TEXT.msg_nothingToExport, 'error');
            return;
        }
        const ok = await this.app.loadLibrary('xlsx');
        if (!ok) {
            this.app.showMessage('XLSX 库加载失败，请检查网络', 'error');
            return;
        }
        let { shelfCodes, dateStr } = this.getExportFilePrefix();
        let count = 0;
        try {
            if (this.app.data.optimizationResult.existingChanges.length > 0) {
                let wb1 = this.generateExistingChangesWorkbook();
                let arr1 = XLSX.write(wb1, { bookType: 'xlsx', type: 'array' });
                this.app.download(arr1, OP_TEXT.fileName_existingChanges.replace('{shelves}', shelfCodes).replace('{date}', dateStr), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                count++;
            }
            if (this.app.data.optimizationResult.newLocations.length > 0) {
                let wb2 = this.generateNewLocationsWorkbook();
                let arr2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
                this.app.download(arr2, OP_TEXT.fileName_newLocations.replace('{shelves}', shelfCodes).replace('{date}', dateStr), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                count++;
            }
            if (count > 0) {
                this.app.showMessage(OP_TEXT.msg_exportOk.replace('{n}', count), 'success');
            } else {
                this.app.showMessage(OP_TEXT.msg_nothingToExport, 'warning');
            }
        } catch (error) {
            console.error('导出结果时出错:', error);
            this.app.showMessage(OP_TEXT.msg_exportFailed + error.message, 'error');
        }
    }

    async exportZip() {
        if (!this.app.data.optimizationResult) {
            this.app.showMessage(OP_TEXT.msg_nothingToExport, 'error');
            return;
        }
        const okXlsx = await this.app.loadLibrary('xlsx');
        const okZip = await this.app.loadLibrary('jszip');
        if (!okXlsx || !okZip) {
            this.app.showMessage('依赖库加载失败，请检查网络', 'error');
            return;
        }
        let { shelfCodes, dateStr } = this.getExportFilePrefix();
        let zip = new JSZip();
        let count = 0;
        try {
            if (this.app.data.optimizationResult.existingChanges.length > 0) {
                let wb1 = this.generateExistingChangesWorkbook();
                let arr1 = XLSX.write(wb1, { bookType: 'xlsx', type: 'array' });
                zip.file(OP_TEXT.fileName_existingChanges.replace('{shelves}', shelfCodes).replace('{date}', dateStr), arr1);
                count++;
            }
            if (this.app.data.optimizationResult.newLocations.length > 0) {
                let wb2 = this.generateNewLocationsWorkbook();
                let arr2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
                zip.file(OP_TEXT.fileName_newLocations.replace('{shelves}', shelfCodes).replace('{date}', dateStr), arr2);
                count++;
            }
            if (count === 0) {
                this.app.showMessage(OP_TEXT.msg_nothingToExport, 'warning');
                return;
            }
            const content = await zip.generateAsync({ type: 'blob' });
            this.app.download(content, OP_TEXT.fileName_zipPackage.replace('{shelves}', shelfCodes).replace('{date}', dateStr), 'application/zip');
            this.app.showMessage(OP_TEXT.msg_zipExportOk, 'success');
        } catch (error) {
            console.error('导出压缩文件时出错:', error);
            this.app.showMessage(OP_TEXT.msg_zipExportFailed + error.message, 'error');
        }
    }

    resetTool() {
        document.getElementById('fileInput').value = '';
        document.getElementById('shelfCheckboxContainer').innerHTML = '';
        document.getElementById('layerCount').value = '6';
        document.getElementById('locationsPerLayer').value = '9';
        document.getElementById('optimizationMode').classList.add('hidden');
        document.getElementById('shelfSelection').classList.add('hidden');
        document.getElementById('optimizationParams').classList.add('hidden');
        document.getElementById('optimizationResults').classList.add('hidden');
        this.app.data.shelfData = [];
        this.app.data.selectedShelves = [];
        this.app.data.currentShelf = null;
        this.app.data.optimizationResult = null;
        this.app.data.currentDepartment = '';
        this.app.data.currentWarehouse = '';
        this.app.data.currentStatus = '';
        this.app.data.shelfSpecMap = new Map();
        this.app.data.currentShelfSpec = null;
        this.app.data.shelfOptions = new Map();
        document.getElementById('messageArea').innerHTML = '';
        this.app.showMessage(OP_TEXT.msg_resetOk, 'success');
    }

    resetOptimization() {
        document.getElementById('optimizationParams').classList.add('hidden');
        document.getElementById('optimizationResults').classList.add('hidden');
        this.deselectAll();
        this.clearOptimizationResults();
        this.app.data.optimizationResult = null;
        document.getElementById('resetOptimizationBtn').disabled = true;
        this.app.showMessage(OP_TEXT.msg_optimizationReset, 'success');
    }

    showLayoutPreview() {
        if (!this.app.data.optimizationResult ||
            (this.app.data.optimizationResult.newLocations.length === 0 &&
                this.app.data.optimizationResult.existingChanges.length === 0)) {
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
                        code: code,
                        spec: spec,
                        status: 'mod',
                        layer: code.split('-')[3],
                        position: code.split('-')[4]
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
                        code: code,
                        spec: spec,
                        status: 'new',
                        layer: code.split('-')[3],
                        position: code.split('-')[4]
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
                        code: locationCode,
                        spec: spec,
                        status: 'unch',
                        layer: locationCode.split('-')[3],
                        position: locationCode.split('-')[4]
                    });
                }
            });
        }

        if (allLocations.length === 0) {
            this.app.showModal(OP_TEXT.heading_layoutPreview, `<p>${OP_TEXT.layoutNotFound.replace('{code}', targetShelfCode)}</p>`);
            return;
        }

        const byLayer = {};
        allLocations.forEach(location => {
            const layer = location.layer;
            if (!byLayer[layer]) byLayer[layer] = [];
            byLayer[layer].push(location);
        });

        let layers = Object.keys(byLayer);
        layers.sort((a, b) => {
            const aIsTop = a === 'DD' || parseInt(a) > 99;
            const bIsTop = b === 'DD' || parseInt(b) > 99;
            if (aIsTop && !bIsTop) return -1;
            if (!aIsTop && bIsTop) return 1;
            const aNum = parseInt(a), bNum = parseInt(b);
            return bNum - aNum;
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

            let locations = byLayer[layer];
            locations.sort((a, b) => parseInt(a.position) - parseInt(b.position));
            const totalLength = locations.reduce((sum, l) => sum + l.spec.l, 0);
            const firstSpec = locations[0].spec;
            const layerHeight = firstSpec.h > 0 ? firstSpec.h * 20 : 30;

            const label = document.createElement('div');
            label.className = 'layout-layer-label';
            label.style.minHeight = layerHeight + 'px';
            label.style.padding = '0';
            if (layer === 'DD' || parseInt(layer) > 99) {
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

    renderPanel(panel) {
        this.injectStyles();
        panel.innerHTML = `
            <div class="section">
                <div class="table-header"><h2>${OP_TEXT.heading_upload}</h2>${this.app.getHelpButton(this.id)}</div>
                <div class="form-group"><label for="fileInput">${OP_TEXT.label_fileInput}</label><input type="file" id="fileInput" accept=".xls,.xlsx"></div>
                <button id="uploadBtn" class="btn">${this._iconCache.upload} ${OP_TEXT.btn_uploadAndParse}</button>
            </div>
            <div id="optimizationMode" class="section hidden">
                <div class="table-header"><h2>${OP_TEXT.heading_selectMode}</h2></div>
                <div class="optimization-mode-selection">
                    <label class="optimization-mode-option selected" id="batchModeOption">
                        <input type="radio" name="optimizationMode" value="batch" checked>
                        <h3>${OP_TEXT.mode_batch}</h3><p>${OP_TEXT.mode_batchDesc}</p>
                    </label>
                    <label class="optimization-mode-option" id="individualModeOption">
                        <input type="radio" name="optimizationMode" value="individual">
                        <h3>${OP_TEXT.mode_individual}</h3><p>${OP_TEXT.mode_individualDesc}</p>
                    </label>
                </div>
            </div>
            <div id="shelfSelection" class="section hidden">
                <div class="table-header"><h2>${OP_TEXT.heading_selectShelf}<span id="uploadedWarehouse"></span></h2></div>
                <div class="shelf-search"><input type="text" id="shelfSearchInput" placeholder="${OP_TEXT.ph_shelfSearch}"></div>
                <div><button class="btn" id="viewAllShelfSpecsBtn">${OP_TEXT.btn_viewAllSpecs}</button></div>
                <div class="spec-info" id="shelfSpecInfo"></div>
                <div class="list-container" id="shelfCheckboxContainer"></div>
                <div class="shelf-selection-actions" id="batchModeActions">
                    <button id="optSelectAllBtn" class="btn">${OP_TEXT.btn_selectAll}</button>
                    <button id="optDeselectAllBtn" class="btn btn-secondary">${OP_TEXT.btn_deselectAll}</button>
                </div>
                <div class="status-text" id="optSelectedCount" style="margin-top:15px;font-weight:700;"></div>
            </div>
            <div id="optimizationParams" class="section hidden">
                <div class="table-header"><h2>${OP_TEXT.heading_params}</h2></div>
                <div class="form-row">
                    <div class="form-group"><label for="layerCount">${OP_TEXT.label_layerCount}</label><input type="number" id="layerCount" min="2" max="12" value="6"></div>
                    <div class="form-group" id="locationsPerLayerGroup"><label for="locationsPerLayer">${OP_TEXT.label_locationsPerLayer}</label><input type="number" id="locationsPerLayer" min="5" max="18" value="9"></div>
                    <div class="form-group"><label for="startLayerOffset">${OP_TEXT.label_startLayerOffset}</label><input type="number" id="startLayerOffset" min="0" max="20" value="1"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="shelfLengthInput">${OP_TEXT.label_shelfLength}</label><input type="number" id="shelfLengthInput" min="80" max="255" value="120"><span class="validation-message" id="shelfLengthValidation"></span></div>
                    <div class="form-group"><label for="shelfDepthInput">${OP_TEXT.label_shelfDepth}</label><input type="number" id="shelfDepthInput" min="40" max="100" step="10" value="40"><span class="validation-message" id="shelfDepthValidation"></span></div>
                </div>
                <div id="individualLayerLocations" class="hidden">
                    <h4>${OP_TEXT.heading_layerLocationSetup}</h4>
                    <div class="layer-location-inputs" id="layerLocationInputs"></div>
                </div>
                <div class="form-row">
                    <div class="checkbox-group">
                        <input type="checkbox" id="generateTopCheckbox" checked>
                        <label for="generateTopCheckbox">${OP_TEXT.label_generateTop}</label>
                    </div>
                </div>
                <div class="form-row">
                    <button id="generateBtn" class="btn">${OP_TEXT.btn_generate}</button>
                    <button id="resetOptimizationBtn" class="btn btn-secondary" disabled>${OP_TEXT.btn_reset}</button>
                </div>
            </div>
            <div id="optimizationResults" class="section hidden">
                <div class="table-header"><h2>${OP_TEXT.heading_results}</h2></div>
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
                                <div class="table-title"><h3>${OP_TEXT.table_existingChanges}</h3><button class="btn copy-btn" data-table="existingChanges">${this._iconCache.copy} ${OP_TEXT.btn_copyTable}</button></div>
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
                                <div class="table-title"><h3>${OP_TEXT.table_newLocations}</h3><button class="btn copy-btn" data-table="newLocations">${this._iconCache.copy} ${OP_TEXT.btn_copyTable}</button></div>
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
                                <div class="table-title"><h3>${OP_TEXT.table_deletedLocations}</h3><button class="btn copy-btn" data-table="deletedLocations">${this._iconCache.copy} ${OP_TEXT.btn_copyTable}</button></div>
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
        let lengthInput = document.getElementById('shelfLengthInput');
        let depthInput = document.getElementById('shelfDepthInput');
        if (lengthInput && depthInput) {
            lengthInput.addEventListener('input', () => this._validateShelfSpecInputs());
            depthInput.addEventListener('input', () => this._validateShelfSpecInputs());
            this._validateShelfSpecInputs();
        }
        this.app._log(this.title + '模块加载成功');
        const defaultChecked = document.querySelector('input[name="optimizationMode"]:checked');
        if (defaultChecked) {
            const parentLabel = defaultChecked.closest('.optimization-mode-option');
            if (parentLabel) parentLabel.classList.add('selected');
        }
    }
}
const OP_TEXT = {
    title: '货架库位增减',
    introText: '上传芥末导出的货架数据，批量优化库位规格与数量。',
    helpDescription: '<p>*长度=172cm货架以180cm进行运算。</p><p>通过<a href="{domain}" target="_blank">芥末</a>的"<a href="{domain}/fdcbusiness/warehouse/stocklocation/list.html" target="_blank">库位管理</a>"功能，导出需要优化的货架数据。</p><p>通过<a href="https://x.sankuai.com/" target="_blank">大象</a>下载excel文件。</p><p>1.1 点击"浏览"选择文件后点击"上传并解析"</p><p>1.2 选定需要修改的货架</p><p>1.3 输入需要调整的规格</p><p>1.4 生成结果以后可以一键复制或导出excel表，表头已经根据芥末修改，可以直接上传。</p>',

    spec_topLocation: '顶层货架位（W{l}M*D{d}M）',
    spec_standardLocation: '长{l}cm深{d}cm高{h}圆孔',
    spec_fallbackDescription: '长{l}cm×深{d}cm',
    spec_formatLabel: '长{l}cm×深{d}cm',

    heading_upload: '上传优化',
    heading_selectMode: '选择优化模式',
    heading_selectShelf: '选择货架 —— ',
    heading_params: '设置优化参数',
    heading_results: '优化结果',
    heading_layoutPreview: '货架布局预览',
    heading_shelfSpecList: '货架规格列表',
    heading_layerLocationSetup: '每层库位数量设置',

    label_fileInput: '选择Excel文件 (.xls 或 .xlsx)',
    label_layerLocation: '第{n}层库位数量',
    label_layerCount: '层数',
    label_locationsPerLayer: '每层库位数量',
    label_startLayerOffset: '起始层号',
    label_shelfLength: '货架长度 (cm)',
    label_shelfDepth: '货架深度 (cm)',
    label_generateTop: '生成顶层库位',

    btn_uploadAndParse: '上传并解析',
    btn_viewAllSpecs: '查看所有货架规格',
    btn_selectAll: '全选同规格',
    btn_deselectAll: '取消全选',
    btn_generate: '生成优化方案',
    btn_reset: '重置',
    btn_layoutPreview: '货架布局预览',
    btn_export: '导出结果',
    btn_exportZip: '导出为压缩文件',
    btn_restart: '重新开始',
    btn_copyTable: '复制表格',

    mode_batch: '批量优化',
    mode_batchDesc: '每层库位数量一致',
    mode_individual: '单独优化',
    mode_individualDesc: '为每层单独设置库位数量',

    ph_shelfSearch: '搜索货架号 (自动筛选)',

    info_selectedShelfSpec: '已选货架规格',
    info_specLine: '长 {l}cm × 深 {d}cm ({desc})',
    info_specEditHint: '您可以在下方"优化参数"中修改货架规格。',
    info_specMismatch: '所选货架规格不一致，请检查。',
    info_specUnifyHint: '您可以在下方"优化参数"中统一设置目标规格。',

    validation_enterValidNumber: '请输入有效的数值',
    validation_specOk: '规格正确: {desc}',
    validation_specInvalid: '请输入标准规格组合，有效组合：{list}',

    sort_label: '排序方式:',
    th_sortShelfCode: '货架号',
    th_sortShelfSize: '货架规格（长×深）',
    th_sortPriority: '优先级',
    th_sortLayerCount: '层数',

    allShelvesByPriority: '所有货架（按优先级排序）',
    areaHeader: '库区: {area}',
    shelfSpecItem: '{code} 规格:{desc} 层数:{layers} 顶层库位:{hasTop} 第一层:{hasFirst} 优先级:{prio}',
    hasTop_yes: '有',
    hasTop_no: '无',
    hasFirst_yes: '是',
    hasFirst_no: '否',
    priority_notFound: '未找到',
    shelfLabel: '{code} (长度:{length}cm, 层数:{layers}, 优先级:{prio})',

    th_existingChanges: ['仓库名称', '库位号', '名称', '分拣排序', '上架排序', '逻辑区名称', '单独打包分区编号', '库位规格名称', '库位BAND', '批次码库位', '常温短保品库位'],
    th_newLocations: ['库位号', '库位名称', '库区', '所属部门', '库位类型', '逻辑区名称', '单独打包分区编号', '营销属性', '是否可做补出库位', '是否可做补入库位', '分拣排序', '上架排序', '补货排序', '是否混放批次', '是否混放供应商', '存储类型', '后台类目', '库位规格名称', '库位BAND', '批次码库位', '常温短保品库位'],
    th_deletedLocations: ['库位号', '删除原因'],

    table_existingChanges: '批量更改',
    table_newLocations: '批量新增',
    table_deletedLocations: '删除库位',

    topLayerLabel: '顶层',
    layerHeightUnit: '{h}圆孔',
    layoutLayerLabel: '{layer}层\n{height}',
    layoutShelfTitle: '货架: {code}',
    layoutNotFound: '货架 {code} 没有可预览的库位数据',
    layoutNoLayerInfo: '无法提取层信息',

    msg_pleaseSelectFile: '请选择文件',
    msg_parseSuccess: '文件解析成功',
    msg_parseFailed: '文件解析失败: ',
    msg_readError: '读取文件时出错',
    msg_dataFormatError: '文件数据格式不正确',
    msg_missingColumns: '上传文件错误: 缺少以下列 - {cols}',
    msg_noValidLocations: '文件没有有效的库位数据',
    msg_noWarehouse: '未获取',
    msg_selectBaseShelf: '请先选择一个货架作为基准',
    msg_generateFirst: '请先生成优化方案',
    msg_noSelectedShelf: '没有选中的货架，无法预览',
    msg_pleaseSelectAtLeastOne: '请至少选择一个货架',
    msg_cannotGetSpec: '无法获取货架规格参数',
    msg_specNotStandard: '货架规格"{desc}"不符合标准规格要求，请修改为有效的规格组合',
    msg_invalidLayerCount: '请输入有效的层数',
    msg_invalidLayerLocations: '第{layer}层库位数量无效',
    msg_generateOk: '成功为 {n} 个货架生成优化方案',
    msg_exportOk: '结果导出成功，生成了{n}个Excel文件',
    msg_nothingToExport: '没有可导出的数据',
    msg_exportFailed: '结果导出失败: ',
    msg_zipExportOk: '压缩文件导出成功',
    msg_zipExportFailed: '导出压缩文件失败: ',
    msg_resetOk: '工具已重置，可以重新开始',
    msg_optimizationReset: '优化已重置',
    msg_uploadFirst: '请先上传文件并解析数据',
    msg_selectedCount: '已选择 {n} 个货架',

    err_noSpecForDepth: '没有找到深度为{d}cm的库位规格',
    err_noHeightCombo: '无法找到符合高度要求（总高度22-24圆孔）的库位规格组合。层数: {n}',
    err_noSuitableCombo: '无法找到符合要求的库位规格组合',
    err_noSpecForHeight: '没有找到高度为{h}圆孔的库位规格',
    err_noExactLength: '无法找到精确匹配的长度组合：需要{n}个库位，总长度{len}cm，可用长度规格：{list}cm',

    deleteReason: '层{layer}格{pos}超出新方案范围',
    deleteReason_default: '新方案不需要',

    fileName_existingChanges: '批量更改_{shelves}_{date}.xlsx',
    fileName_newLocations: '批量导入_{shelves}_{date}.xlsx',
    fileName_zipPackage: '货架优化方案_{shelves}_{date}.zip',

    styles: `.optimization-mode-selection{display:flex;gap:25px;margin:20px 0}
.optimization-mode-option{flex:1;padding:20px;border:2px solid #eee;border-radius:10px;cursor:pointer;transition:all .3s cubic-bezier(0.4,0,0.2,1);background:#fff}
.optimization-mode-option:hover{border-color:#FFBD00;box-shadow:0 8px 20px rgba(255,189,0,0.1)}
.optimization-mode-option.selected{border-color:#FFBD00;background-color:#fff8e1;box-shadow:0 8px 20px rgba(255,189,0,0.15)}
.optimization-mode-option h3{color:#333;margin-bottom:8px;font-size:18px}
.optimization-mode-option p{color:#666;font-size:14px;line-height:1.5}
.optimization-mode-option input{display:none}

.shelf-search{margin-bottom:20px;padding:0 5px;position:relative}
.shelf-search input{width:100%;padding:12px 16px 12px 42px;border:2px solid #e0e0e0;border-radius:30px;font-size:15px;background:#fff url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="%23999" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>') no-repeat 12px center;background-size:16px}
.shelf-search input:focus{border-color:#FFBD00;outline:none}
.shelf-search .clear-svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;color:#999;transition:color 0.2s;display:none}
.shelf-search .clear-svg:hover{color:#666}
.shelf-search .clear-svg svg{width:16px;height:16px}

#shelfCheckboxContainer{max-height:350px;padding:15px;background:#fafafa}
.shelf-checkbox{display:flex;align-items:center;margin-bottom:10px;padding:10px 15px;border-radius:6px;background:#fff;border:1px solid transparent}
.shelf-checkbox:hover{background-color:#fff8e1;border-color:#ffe082}
.shelf-checkbox input{width:20px;height:20px;margin-right:15px;accent-color:#FFBD00;flex-shrink:0}
.shelf-checkbox label{margin-bottom:0;cursor:pointer;font-weight:400;color:#333;flex:1}
.shelf-checkbox.disabled{background:#f5f5f5;opacity:0.6}
.shelf-checkbox.disabled label{cursor:not-allowed}

.panel-box.shelf-info{background:linear-gradient(135deg,#fff8e1 0%,#ffecb3 100%);border:0;border-left:5px solid #FFBD00;padding:20px;margin-top:15px}
.shelf-info h3{color:#333;margin-bottom:10px;font-size:18px}

#optSelectedCount{color:#FFBD00;padding:10px 15px;background:#fff8e1;border-radius:6px;display:inline-block}

.layer-location-inputs{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:15px;margin-top:20px;padding:15px;background:#fafafa;border-radius:8px}
.layer-location-input{display:flex;flex-direction:column}
.layer-location-input label{font-size:14px;margin-bottom:8px;color:#666;font-weight:600}
.layer-location-input input{padding:10px 12px;font-size:15px}

.sort-options{display:flex;align-items:center;gap:15px}
.sort-options label{margin-bottom:0;font-weight:400;color:#666;font-size:14px}
.sort-options select{width:auto;min-width:180px;padding:10px 15px;border-radius:6px;border:2px solid #e0e0e0;background:#fff;color:#333;font-size:14px}

.area-header{margin:20px 0 15px;font-weight:700;font-size:17px;border-bottom:2px solid #FFBD00;padding-bottom:10px;color:#333}
.shelf-spec-item{margin:10px 0 10px 25px;font-size:15px;line-height:1.6;color:#444;padding:8px 12px;background:#fafafa;border-radius:6px;border-left:4px solid #e0e0e0}
.shelf-spec-item:hover{background:#fff8e1;border-left-color:#FFBD00}
.shelf-spec-has-top{color:#4caf50;font-weight:700}
.shelf-spec-no-top{color:#f44336;font-weight:700}

.deleted-table-container{max-width:400px}

.layout-preview-container{padding:25px}
.layout-preview-grid{display:flex;flex-direction:column;gap:0;margin-top:25px;border:1px solid #ccc;border-radius:8px;overflow:hidden}
.layout-row{display:flex;align-items:stretch;min-height:70px;background:#fafafa;border:none;border-bottom:1px solid #ccc}
.layout-row:last-child{border-bottom:none}
.layout-layer-label{width:120px;background:linear-gradient(135deg,#f8f8f8 0%,#f0f0f0 100%);font-weight:700;display:flex;align-items:center;justify-content:center;padding:15px;border-right:1px solid #ccc;font-size:15px;min-height:70px;box-sizing:border-box;color:#333;border-top:1px solid #ccc;border-bottom:1px solid #ccc;white-space:pre-line;text-align:center}
.layout-layer-label.top{background:linear-gradient(135deg,#fff8e1 0%,#ffecb3 100%);color:#333}
.layout-locations{flex:1;display:flex;border:none;box-sizing:border-box;background:#fff}
.layout-location{display:flex;flex-direction:column;justify-content:center;align-items:center;border-right:1px solid #ccc;border-top:1px solid #ccc;border-bottom:1px solid #ccc;position:relative;padding:8px;box-sizing:border-box;cursor:default;height:100%}
.layout-location:first-child{border-left:1px solid #ccc}
.layout-location:last-child{border-right:1px solid #ccc}
.location-code{font-size:13px;font-weight:700;margin-bottom:4px;color:#333;display:flex;align-items:center;justify-content:center;height:50%}
.location-spec{font-size:11px;color:#666;display:flex;align-items:center;justify-content:center;height:50%}

body.dark-mode .optimization-mode-option{background-color:#2a2a36!important;border-color:#4a4a58!important;color:#eef2f5!important}
body.dark-mode .optimization-mode-option.selected{background-color:#3a3a48!important;border-color:#FFBD00!important;box-shadow:0 8px 20px rgba(0,0,0,0.3)!important}
body.dark-mode .optimization-mode-option h3,
body.dark-mode .optimization-mode-option p{color:#eef2f5!important}
body.dark-mode .optimization-mode-option.selected h3,
body.dark-mode .optimization-mode-option.selected p{color:#ffffff!important}
body.dark-mode .shelf-search input{background-color:#2c2c38!important;border-color:#4a4a58!important;color:#f0f0f0!important}
body.dark-mode .shelf-search input:focus{border-color:#FFBD00!important}
body.dark-mode .shelf-search .clear-svg{color:#ccc!important}
body.dark-mode .shelf-search .clear-svg:hover{color:#fff!important}
body.dark-mode #shelfCheckboxContainer{background:#252530!important}
body.dark-mode .shelf-checkbox{background-color:#2a2a36!important;border-color:#4a4a58!important}
body.dark-mode .shelf-checkbox:hover{background-color:#3a3a48!important;border-color:#FFBD00!important}
body.dark-mode .shelf-checkbox.disabled{background-color:#2a2a36!important;opacity:0.6}
body.dark-mode .shelf-checkbox label{color:#ffffff!important}
body.dark-mode .panel-box.shelf-info{background:linear-gradient(135deg,#2a2a36 0%,#32323e 100%)!important;border-left-color:#FFBD00!important}
body.dark-mode .shelf-info h3,
body.dark-mode .shelf-info p{color:#eef2f5!important}
body.dark-mode #optSelectedCount{background-color:#2a2a36!important;color:#FFBD00!important}
body.dark-mode .layer-location-inputs{background-color:#252530!important}
body.dark-mode .layer-location-input label{color:#ffffff!important}
body.dark-mode .sort-options label{color:#ffffff!important}
body.dark-mode .area-header,
body.dark-mode .shelf-spec-item{background-color:#1e1e2a!important;border-color:#3a3a44!important;color:#ffffff!important}
body.dark-mode .layout-preview-grid{border-color:#4a4a58}
body.dark-mode .layout-layer-label{background:#2a2a36!important;border-color:#4a4a58!important;color:#ffffff!important}
body.dark-mode .layout-location{background-color:#1e1e2a!important;border-color:#4a4a58!important}
body.dark-mode .layout-location .location-code,
body.dark-mode .layout-location .location-spec{color:#dddddd!important}
body.dark-mode .layout-row{border-color:#4a4a58}`
};
window.OptimizationModule = OptimizationModule;