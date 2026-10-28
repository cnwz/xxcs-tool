/**
 * @description 模块清单。Core 通过 window.__MODULES__ 读取。
 * @security 本文件不收集、不存储、不传输任何用户数据。
 */
window.__MODULES__ = {
    basePath: 'js/module/',
    list: [
        {
            file: 'MultiQRCodeModule.js',
            title: '多二维码生成',
            icon: 'qr-code',
            intro: '批量生成多个二维码，支持自动格式化和大写，支持商品信息查询。',
        },
        {
            file: 'QRPrintModule.js',
            title: '二维码打印',
            icon: 'printer',
            intro: '生成二维码，支持粘贴文本或上传 Excel，导出 PDF 或图片。',
        },
        {
            file: 'OptimizationModule.js',
            title: '货架库位增减',
            icon: 'boxes',
            intro: '上传芥末导出的货架数据，批量优化库位规格与数量。',
        },
        {
            file: 'PickingRouteModule.js',
            title: '分拣动线计算',
            icon: 'arrow-right-circle',
            intro: '根据货架属性自动计算分拣优先级，生成库位动线。',
        },
        {
            file: 'SortingModule.js',
            title: '整理动线',
            icon: 'list-ul',
            intro: '上传包含分拣位的货架数据，按货架整理分拣顺序，支持拖拽排序和批量移动，自动生成间隔10的分拣排序值。',
        },
        {
            file: 'BarcodeToMapModule.js',
            title: '条码转键值',
            icon: 'upc-scan',
            intro: '将条码/商品对应表转为支持的库格式，支持Excel上传。',
        },
        {
            file: 'WorkOrderParserModule.js',
            title: '工单解析',
            icon: 'journal-text',
            intro: '按分拣员分组浏览工单详情，支持站责筛选、统计图表与反向钻取。',
        },
        {
            file: 'StaffStatsModule.js',
            title: '站点离职率统计',
            icon: 'people',
            intro: '统计站点内所有分拣员的离职率。',
        }
    ],
};