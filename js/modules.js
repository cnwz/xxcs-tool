/**
 * @description 模块清单（本地 / CDN 共用）
 * @author ls_wuzhen20
 * @since 2026-09-16
 * @lastupdate 2026-09-16
 * @version 1.0.0
 * @security 本文件不收集、不存储、不传输任何用户数据。
 */
window.__MODULES__ = {
    basePath: 'js/module/',
    list: [
        {
            file: 'MultiQRCodeModule.js',
            title: '多二维码生成',
            icon: 'qr-code',
            version: '1.0.0',
            intro: '批量生成多个二维码，支持自动格式化和大写，支持商品信息查询。',
            missingJump: '模块示例/多二维码生成'
        },
        {
            file: 'OptimizationModule.js',
            title: '货架库位增减',
            icon: 'boxes',
            version: '1.0.0',
            intro: '上传芥末导出的货架数据，批量优化库位规格与数量。',
            missingJump: '模块示例/货架库位增减'
        },
        {
            file: 'QRCodeModule.js',
            title: '地堆二维码生成',
            icon: 'qr-code-scan',
            version: '1.0.0',
            intro: '生成地堆库位二维码，支持自定义 LOGO 和文字。',
            missingJump: '模块示例/地堆二维码生成'
        },
        {
            file: 'PickingRouteModule.js',
            title: '分拣动线计算',
            icon: 'arrow-right-circle',
            version: '1.0.0',
            intro: '根据货架属性自动计算分拣优先级，生成库位动线。',
            missingJump: '模块示例/分拣动线计算'
        },
        {
            file: 'SortingModule.js',
            title: '整理动线',
            icon: 'list-ul',
            version: '1.0.0',
            intro: '上传包含分拣位的货架数据，按货架整理分拣顺序，支持拖拽排序。',
            missingJump: '模块示例/整理动线'
        },
        {
            file: 'BarcodeToMapModule.js',
            title: '条码转键值',
            icon: 'upc-scan',
            version: '1.0.0',
            intro: '将条码/商品对应表转为 JS Map 或数组，支持 Excel 上传。',
            missingJump: '模块示例/条码转键值'
        },
        {
            file: 'LabelPrintModule.js',
            title: '标签打印(测试)',
            icon: 'printer',
            version: '1.0.0',
            intro: '上传 Excel 生成二维码标签和打印。',
            missingJump: '模块示例/标签打印'
        },
        {
            file: 'WorkOrderParserModule.js',
            title: '工单解析',
            icon: 'journal-text',
            version: '1.0.0',
            intro: '按分拣员分组，以阅读器形式浏览工单详情。',
            missingJump: '模块示例/工单解析'
        }
    ]
};