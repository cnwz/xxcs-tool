
# 项目文档索引

> 汇总所有模块的开发文档，提供文件地图、依赖关系、常见任务速查。
> 阅读顺序建议：先 Core.js → modules.js → DemoModule.js，再按需查具体模块。

---

## 一、文件地图

### 进 git 的文件（使用者可拿到）

```
src/
├── index.html                       # 本地版入口（内联占位符）
├── js/
│   ├── modules.js                   # 模块清单
│   ├── module/
│   │   ├── Core.js                  # 核心引擎
│   │   ├── MultiQRCodeModule.js     # 多二维码生成（默认模块，内联）
│   │   ├── OptimizationModule.js    # 货架库位增减
│   │   ├── PickingRouteModule.js    # 分拣动线计算
│   │   ├── QRCodeModule.js          # 地堆二维码生成
│   │   ├── QRPrintModule.js         # 二维码打印
│   │   ├── SortingModule.js         # 整理动线
│   │   ├── WorkOrderParserModule.js # 工单解析
│   │   ├── BarcodeToMapModule.js    # 条码转键值
│   │   ├── LabelPrintModule.js      # 标签打印
│   │   └── DemoModule.js            # 开发模板（教学用）
│   ├── lib/                         # 第三方库（xlsx / jszip / qrcode / jspdf / docx / chart）
│   └── data/                        # 数据文件（productMap.js / commonLocations.js）
├── docs/                            # 开发文档
├── ping.txt                         # CDN 探活
└── version.js                       # 版本信息
```

### 不进 git 的文件（维护者本地）

```
cloud.html            # CDN 版入口
debug.html            # 调试版入口
发布.js               # 发布脚本
发布配置.js           # 发布配置
dist/                 # 构建产物
build/                # 发布状态
git/                  # git 克隆目录
```

**判断依据**：看 `发布配置.js` 的 `INLINE_MODULES` 和 `GIT_KEEP`，以及 `发布.js` 是否被排除。

---

## 二、文档索引

按**推荐阅读顺序**排列：

| #  | 文档                                 | 对应文件                     | 说明                                      |
| -- | ------------------------------------ | ---------------------------- | ----------------------------------------- |
| 1  | **Core.js 二次开发文档**       | `Core.js`                  | 引擎全貌，**必读**                  |
| 2  | **modules.js 二次开发文档**    | `modules.js`               | 清单格式 + 模块加载机制                   |
| 3  | **DemoModule.js 模板文档**     | `DemoModule.js`            | **新模块开发模板**，含完整 API 演示 |
| 4  | **index.html 二次开发文档**    | `index.html`               | 入口模板 + 构建产物的区别                 |
| 5  | **MultiQRCodeModule 文档**     | `MultiQRCodeModule.js`     | 默认模块，最复杂                          |
| 6  | **OptimizationModule 文档**    | `OptimizationModule.js`    | 算法密集                                  |
| 7  | **WorkOrderParserModule 文档** | `WorkOrderParserModule.js` | 三栏布局 + 图表                           |
| 8  | **QRCodeModule 文档**          | `QRCodeModule.js`          | 字体检测 + canvas 渲染                    |
| 9  | **QRPrintModule 文档**         | `QRPrintModule.js`         | 多尺寸 + PDF/DOCX                         |
| 10 | **PickingRouteModule 文档**    | `PickingRouteModule.js`    | 优先级算法                                |
| 11 | **SortingModule 文档**         | `SortingModule.js`         | 拖拽排序                                  |
| 12 | **BarcodeToMapModule 文档**    | `BarcodeToMapModule.js`    | 数据生成器                                |
| 13 | **LabelPrintModule 文档**      | `LabelPrintModule.js`      | `@page` 打印 CSS                        |

---

## 三、模块依赖图

```
Core.js（引擎）
  ├─ 提供：模块系统、加载器、UI 工具、公共数据
  ├─ 依赖：无（启动时自己拉 modules.js）
  │
  ├── modules.js（清单，Core 拉取）
  │     └─ 列出所有按需加载的模块
  │
  ├── DemoModule.js（模板）     依赖：Core
  │
  ├── MultiQRCodeModule.js      依赖：Core + qrcode + productMap.js + commonLocations.js
  │
  ├── OptimizationModule.js     依赖：Core + xlsx + jszip
  │
  ├── WorkOrderParserModule.js  依赖：Core + xlsx + chart
  │
  ├── QRCodeModule.js           依赖：Core + qrcode + jszip + jspdf + docx
  │
  ├── QRPrintModule.js          依赖：Core + qrcode + jspdf + jszip
  │
  ├── PickingRouteModule.js     依赖：Core（无第三方库）
  │
  ├── SortingModule.js          依赖：Core + xlsx
  │
  ├── BarcodeToMapModule.js     依赖：Core（xlsx 由 readExcelTable 内部加载）
  │
  └── LabelPrintModule.js       依赖：Core + qrcode

数据流：
  productMap.js ──→ MultiQRCodeModule
  commonLocations.js ──→ MultiQRCodeModule
  BarcodeToMapModule ──→ productMap.js（生成产物）
```

**关键点**：

- **所有模块依赖 Core**，没有例外
- **Core 不依赖任何模块**（单向依赖）
- **模块之间不互相依赖**（通过 `app.data` 共享状态，如 `priorityMap`）
- **只有 MultiQRCodeModule 是内联的**（在 `index.html` 里 push 到 `inlineModules`）

---

## 四、常见任务速查

### 我要新增一个模块

**步骤**：

1. 复制 `DemoModule.js` 为模板
2. 改类名（如 `XxxModule`）、文件名（如 `XxxModule.js`）、文案常量（如 `XX_TEXT`）
3. 在 `modules.js` 的 `list` 里加一行
4. **本地验证**：用自己的启动 HTML（`<script src="js/module/Core.js">` + `new Core().init()`），点"其他功能"选模块

**必读**：DemoModule.js 文档

### 我要改一个模块的行为

**步骤**：

1. 定位模块文件
2. 读该模块的开发文档（了解契约和坑位）
3. 改代码
4. **本地验证**：用启动 HTML 打开，走一遍改动路径

**注意**：

- 模块的 `renderPanel(panel)` 里所有 DOM 查询用 `panel.querySelector`
- 用户可见文案抽到 `XX_TEXT`
- 样式只用 Core 变量（`var(--xxx)`）
- 有全局监听/定时器/Chart 时，`destroy()` 必须清理

### 我要改 Core 的行为

**步骤**：

1. 读 Core.js 文档（全部方法说明）
2. 改代码
3. **同步检查**：
   - 清单加载逻辑是否还兼容
   - 模块契约是否还兼容
   - UI 工具方法是否还兼容
4. **本地验证**：打开 `debug.html`，走一遍核心流程

**必读**：Core.js 文档的"坑位清单"

### 我要加第三方库

**步骤**：

1. 把 `.js` 放进 `src/js/lib/`
2. 在 `Core.libraries` 加一行：`{ local: 'js/lib/X.js', cdn: '...', global: 'X' }`
3. 模块里 `await this.app.loadLibrary('x')`
4. **不要忘记 `global` 字段**，Core 靠它判断是否加载成功

**注意**：`local` 路径是相对于 `src/` 的。

### 我要加数据文件

**步骤**：

1. 把 `.js` 放进 `src/js/data/`
2. 文件里定义全局变量，如 `window.xxxData = [...]`
3. 模块里用 `app._loadScript('js/data/xxxData.js', app.localTimeout)` 加载
4. **加载后立刻读全局变量**，因为 Core 不管理数据文件

**参考**：MultiQRCodeModule 的 `_loadProductMap`

### 我要改主题色

**步骤**：

1. 改 `Core.js` 里 `CORE_CSS` 的 `:root` 的 `--accent*` 四个变量
2. 深色模式的覆盖在 `body.dark-mode` 里
3. **不需要改模块**——所有模块用 CSS 变量

### 我要改默认打开的模块

**步骤**：

1. 改 `Core.js` 构造函数的 `this.defaultModuleId`
2. **确保该模块是内联的**（在 `index.html` 里 push 到 `inlineModules`）
3. 如果模块是清单里的，**不会被默认打开**（因为 `_hasModule` 在 `_backgroundInit` 前调用）

### 我要改上传行数上限

**步骤**：

1. 改 `Core.js` 构造函数的 `this.limits.maxUploadRows`
2. 或模块里 `readExcelTable(file, { maxRows: 100000 })`

### 我要改部门/仓库校验规则

**步骤**：

1. 改 `Core.js` 构造函数的 `this.validations`
2. 模块里用 `this.app.validations.departmentPattern` 读，自动跟随

---

## 五、坑位总表

按严重程度排列，**标 ⚠ 的是会影响功能的**。

| 严重度 | 位置                                                     | 问题                                      | 修复方向                                  |
| ------ | -------------------------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| ⚠     | Core`_parseOrigin`                                     | 只取 origin，业务 path 由模块拼           | **设计如此**，改提示文案            |
| ⚠     | Core`init`                                             | `defaultModuleId` 必须是内联模块        | 加注释，或改 Core 等`_backgroundInit`   |
| ⚠     | MultiQRCode`_showConflictDialog`                       | 不 await，调用方不检查返回值              | 检查返回值                                |
| ⚠     | Optimization`resetAll`                                 | 漏重置规格/顶层/搜索框                    | 补上                                      |
| ⚠     | SortingModule 拖拽                                       | `dragIndex < dropIndex` 时插入位置偏移  | 减 1                                      |
| ⚠     | SortingModule`#smStartValue`                           | 改值时丢失勾选                            | input handler 里`captureSelectedCodes`  |
| ⚠     | SortingModule 折叠面板                                   | 首次点击无效果                            | `style.display === 'block'`             |
| ⚠     | SortingModule`applySortOrder`                          | start=0 被当无效                          | `isNaN` 判断                            |
| ⚠     | QRCodeModule`createImageCanvas`                        | 页眉高度 0.5 vs 0.9 不一致                | 抽函数共用                                |
| ⚠     | QRCodeModule`downloadTemplate`                         | `__TEMPLATE_BASE64__` 占位符不替换      | 删按钮或数据文件方式                      |
| ⚠     | QRCodeModule`data-index`                               | 与`qrImageSrcs` 下标可能错位            | push 后记录下标                           |
| ⚠     | LabelPrint`destroy`                                    | 空实现，打印资源可能泄漏                  | 清理`_printContainer` / `_printStyle` |
| ⚠     | LabelPrint 文件上传                                      | 不清 value，无法重选同一文件              | `e.target.value = ''`                   |
| ⚠     | PickingRoute`processLocationData`                      | 两处死代码                                | 删掉                                      |
| ⚠     | PickingRoute`table1/2-container`                       | 无`.table-container`，无滚动            | 加 class                                  |
| 中     | WorkOrderParser`_rowKey`                               | 同工单同名商品会撞 key                    | 加行内序号                                |
| 中     | WorkOrderParser`WO_TEXT.stationResponsible`            | 硬编码`'门店'`                          | 全局替换时小心                            |
| 中     | BarcodeToMap 全角逗号                                    | 不识别`，`                              | 加分隔符                                  |
| 中     | BarcodeToMap`_switchToText`                            | 不清 textarea                             | 主动清或提示                              |
| 中     | QRPrintModule`_isPile`                                 | `toUpperCase` 是死代码                  | 统一大小写策略                            |
| 中     | QRPrintModule`_drawLabel`                              | LOGO 尺寸硬编码会拉伸                     | 按比例缩放                                |
| 中     | QRPrintModule`_drawText`                               | 字体硬编码微软雅黑                        | 用系统检测                                |
| 中     | QRPrintModule`exportPDF`                               | 不校验`_previewCache` 与 `_size` 匹配 | 记录`_previewCacheSize`                 |
| 低     | Core`readExcelTable`                                   | 行数上限含表头                            | 文档说明                                  |
| 低     | Core`getLayerLocationSettings`                         | 与 Optimization 强耦合                    | 下沉到模块                                |
| 低     | Core`_log`                                             | 默认空                                    | debug.html 覆写                           |
| 低     | Optimization`_getMode` vs Core `getOptimizationMode` | 语义不同                                  | 不要混用                                  |
| 低     | Sorting`rawData`                                       | 死字段                                    | 删                                        |
| 低     | Sorting`msg_readFileFailed`                            | 死文案                                    | 删                                        |
| 低     | BarcodeToMap`outputPlaceholder`                        | 自动加载示例后看不到                      | 去掉自动加载                              |

---

## 六、跨模块约定

### 命名约定

| 对象           | 约定                                            | 示例                            |
| -------------- | ----------------------------------------------- | ------------------------------- |
| 类名           | `XxxModule`                                   | `SortingModule`               |
| 文件名         | `XxxModule.js`                                | `SortingModule.js`            |
| 模块 id        | `xxx`（小写，去 Module 后缀）                 | `sorting`                     |
| 文案常量       | `XX_TEXT`                                     | `SM_TEXT`                     |
| DOM id 前缀    | `xx`                                          | `sm`、`op`、`qr`          |
| CSS class 前缀 | `xx-`                                         | `sm-`、`op-`                |
| 方法名         | `_methodName`（私有）/ `methodName`（公开） | `_classify` / `renderPanel` |

### 数据共享

| 字段                            | 提供方             | 使用方                                        |
| ------------------------------- | ------------------ | --------------------------------------------- |
| `app.data.optimizationResult` | OptimizationModule | OptimizationModule                            |
| `app.data.priorityMap`        | PickingRouteModule | PickingRouteModule                            |
| `app.data.currentWarehouse`   | OptimizationModule | OptimizationModule                            |
| `app.validations.*`           | Core               | 所有模块                                      |
| `app.limits.*`                | Core               | 所有模块                                      |
| `app.logoImage`               | Core（配置）       | QRCodeModule、QRPrintModule、LabelPrintModule |

### UI 复用

| Core 方法                                 | 推荐用法                    |
| ----------------------------------------- | --------------------------- |
| `uploadSection` + `bindUploadSection` | **首选**，统一上传 UI |
| `showMessage`                           | 所有用户提示                |
| `showModal` / `confirm` / `choose`  | 弹窗交互                    |
| `showLoading` / `hideLoading`         | 模块级遮罩                  |
| `injectStyle`                           | 模块样式注入                |
| `getIcon`                               | Bootstrap Icons             |
| `getHelpButton`                         | 帮助按钮                    |
| `escapeHtml`                            | 拼 HTML 时必用              |
| `copyTable` / `copyText`              | 复制功能                    |
| `download`                              | 文件下载                    |
| `showImageViewer`                       | 图片查看                    |

### 不推荐

| 做法                                          | 原因               | 替代                                |
| --------------------------------------------- | ------------------ | ----------------------------------- |
| 用`document.getElementById` 查 panel 内元素 | 跨模块 id 可能冲突 | `panel.querySelector`             |
| 用`document.body.innerHTML = ...`           | 会毁掉 Core 骨架   | 改`panel.innerHTML`               |
| 硬编码颜色                                    | 深色模式失效       | CSS 变量                            |
| 硬编码模块路径                                | 改目录时全崩       | `app.cdnBase` / `app.buildUrl`  |
| 拼 HTML 时不`escapeHtml`                    | XSS                | `app.escapeHtml`                  |
| 忘记`destroy` 清理全局资源                  | 内存泄漏           | 有则清                              |
| `window.confirm` / `window.alert`         | 风格不一致         | `app.confirm` / `app.showModal` |
| 自己写库加载                                  | 重复代码           | `app.loadLibrary`                 |
| 自己写 Excel 解析                             | 重复代码           | `app.readExcelTable`              |

---

## 七、本地验证清单

改完模块后，按顺序过一遍：

### 基础验证

1. 打开启动 HTML（`<script src="js/module/Core.js">` + `new Core().init()`）
2. F12 看控制台有无报错
3. 默认模块（`multiqrcode`）能打开
4. 顶部 tab 栏正常
5. 点"其他功能"能弹出模块列表

### 改动的模块

1. 点"其他功能"选改动的模块
2. tab 出现，内容渲染正常
3. 走一遍改动路径
4. 边界测试（空输入、超长输入、非法输入）
5. 关闭 tab 再打开，状态正确

### 全局

1. 切换深浅色，样式跟随
2. 打开模块帮助，`{wiki}` 被替换
3. 上传一个 Excel，`readExcelTable` 正常
4. 触发 `showMessage`，消息条出现
5. 弹窗（modal / confirm / choose）正常

### 特殊模块

- **QRCodeModule / QRPrintModule / LabelPrintModule**：需要 `qrcode` 库，检查生成是否正常
- **OptimizationModule / SortingModule / BarcodeToMapModule**：需要 `xlsx` 库
- **WorkOrderParserModule**：需要 `chart` 库，统计 tab 能出图
- **MultiQRCodeModule**：需要 `productMap.js`，商品信息能识别

---

## 八、模块概览表

| 模块                  | id                  | 输入         | 输出             | 依赖                          | 复杂度     |
| --------------------- | ------------------- | ------------ | ---------------- | ----------------------------- | ---------- |
| Core                  | —                  | —           | 引擎             | 无                            | ★★★★★ |
| MultiQRCodeModule     | `multiqrcode`     | 文本         | 二维码预览       | qrcode + data                 | ★★★★   |
| OptimizationModule    | `optimization`    | Excel        | 3 个 xlsx        | xlsx + jszip                  | ★★★★★ |
| WorkOrderParserModule | `workorderparser` | Excel        | 三栏浏览 + 图表  | xlsx + chart                  | ★★★★★ |
| QRCodeModule          | `qrcode`          | 文本         | PNG / PDF / DOCX | qrcode + jszip + jspdf + docx | ★★★★   |
| QRPrintModule         | `qrprint`         | 文本 / Excel | PDF / PNG / ZIP  | qrcode + jspdf + jszip        | ★★★★   |
| PickingRouteModule    | `pickingroute`    | 文本 × 2    | 优先级表         | 无                            | ★★       |
| SortingModule         | `sorting`         | Excel        | 分拣排序 xlsx    | xlsx                          | ★★★     |
| BarcodeToMapModule    | `barcodetomap`    | 文本 / Excel | productMap.js    | 无                            | ★★       |
| LabelPrintModule      | `labelprint`      | Excel        | 打印             | qrcode                        | ★★       |
| DemoModule            | `demo`            | 文本 / Excel | 分析表           | xlsx                          | ★         |

**复杂度评级**：

- ★★★★★：核心引擎或多算法交织
- ★★★★：多库依赖或复杂渲染
- ★★★：单一算法 + UI
- ★★：简单数据处理
- ★：教学用

---

## 九、关键设计模式

### 1. 模块契约

所有模块实现：

```js
class XxxModule {
    constructor(app) {
        this.app = app;
        this.title = ...;          // tab 名
        this.ver = ...;
        this.lastupdate = ...;
        this.iconName = ...;
        this.introText = ...;
        this.helpDescription = ...;
    }
    renderPanel(panel) { ... }     // 必需
    destroy() { ... }              // 可选
}
```

### 2. 状态管理

- **模块私有状态**：放 `this.xxx`
- **跨模块共享状态**：放 `this.app.data.xxx`
- **全局配置**：放 `this.app.validations` / `this.app.limits`

### 3. 数据源统一

两种模式常见：

- **文本 + Excel**：`_getItems()` 统一入口，两个分支
- **只 Excel**：`readExcelTable` + 列选择

### 4. 渲染分离

- **`renderPanel`**：首次渲染，注入 HTML
- **`_renderXxx`**：局部刷新（结果区、列表）
- **`bindEvents`**：事件绑定

### 5. 错误处理

- **用户错误**：`showMessage` + `return`
- **业务异常**：`throw` + 调用方 catch
- **资源加载失败**：`loadLibrary` 返回值检查
- **DOM 元素不存在**：optional chaining `?.`

### 6. 资源清理

`destroy` 里清理：

- `clearTimeout` / `clearInterval`
- `document.removeEventListener`
- `Chart.destroy()`
- 临时 DOM（如打印容器）

---

## 十、待办清单

按优先级：

### 高优先

- [ ] 修复 SortingModule 拖拽插入位置偏移
- [ ] 修复 SortingModule 改 start/step 丢失勾选
- [ ] 修复 OptimizationModule `resetAll` 漏重置
- [ ] 修复 QRCodeModule 页眉高度不一致
- [ ] 决定 QRCodeModule 模板功能（删按钮 / 数据文件）
- [ ] 修复 LabelPrintModule 文件上传无法重选
- [ ] 补全 LabelPrintModule `destroy()`

### 中优先

- [ ] 统一 `DD` 大小写处理策略
- [ ] 修复 WorkOrderParser `_rowKey` 撞 key
- [ ] 修复 BarcodeToMap 全角逗号
- [ ] 抽 `_drawLabel` 的 LOGO 缩放函数
- [ ] 修复 QRCodeModule `data-index` 错位

### 低优先

- [ ] 删死代码（PickingRoute 两处、Sorting 的 `rawData`）
- [ ] 统一 `msg_readFileFailed` 等死文案
- [ ] 优化 `_renderPickerContent` 性能（虚拟滚动）
- [ ] 给预览加"打印预览"（对齐真实效果）

### 文档维护

- [ ] 每次改模块后更新对应文档的"坑位清单"
- [ ] 每次加模块后更新本文档的"文档索引"和"模块概览表"

---

## 十一、一页速查

```
文档体系：
  Core.js 文档          —— 引擎
  modules.js 文档       —— 清单
  DemoModule 文档       —— 模板（新模块从这里开始）
  index.html 文档       —— 入口
  各模块文档 × 10       —— 具体模块

新模块两步：
  1. 复制 DemoModule.js → 改类名/文件名/文案
  2. modules.js 加一行

Core 提供的核心工具：
  上传：uploadSection / bindUploadSection / readExcelTable
  弹窗：showMessage / showModal / confirm / choose
  样式：injectStyle / CSS 变量
  资源：loadLibrary / download / copyText / copyTable
  图标：getIcon / getHelpButton

不要做：
  改 document.body.innerHTML
  用 document.getElementById 查 panel 内元素
  硬编码颜色 / 路径
  拼 HTML 不 escapeHtml
  忘记 destroy 清理

坑位最多的模块：
  OptimizationModule（算法 + 累积 + 冲突）
  WorkOrderParserModule（三栏 + 图表 + 反向钻取）
  MultiQRCodeModule（商品识别 + 搜索 + 双重格式化）
```

---

@license Unlicense
