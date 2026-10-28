
# 二维码及库位优化工具

内部工具，处理二维码生成、库位优化、分拣动线、标签打印、工单解析等任务。

## 快速开始

双击 `index.html` 即可使用。

## 目录结构
```

src/
├── index.html              正式入口
├── debug.html              调试入口（控制台有日志输出）
├── ping.txt                CDN 握手探测文件（空文件）
├── js/
│   ├── modules.js          模块清单
│   ├── module/             模块源码
│   │   ├── Core.js         核心引擎
│   │   ├── MultiQRCodeModule.js
│   │   ├── OptimizationModule.js
│   │   ├── QRCodeModule.js
│   │   ├── PickingRouteModule.js
│   │   ├── SortingModule.js
│   │   ├── BarcodeToMapModule.js
│   │   ├── LabelPrintModule.js
│   │   └── WorkOrderParserModule.js
│   ├── lib/                第三方库（可选，缺失走 CDN）
│   └── data/               数据文件
│       ├── productMap.js
│       └── commonLocations.js
├── docs/                   开发者文档
└── rules/                  模块规则（审计用）

```

## 文档

- [架构说明](docs/架构说明.md)
- [加载器说明](docs/加载器说明.md)
- [Core 接口](docs/Core接口.md)
- [加新模块](docs/加新模块.md)
- [压缩说明](docs/压缩说明.md)

## 数据安全

本工具不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。

## 致谢

- deepseek：参与了代码的审计与改进。

## 许可

本项目采用 Unlicense 协议，释放到公共领域。

> This is free and unencumbered software released into the public domain.
> See [LICENSE](LICENSE) for details.

简言之：你可以随意使用、修改、分发，作者不保留任何权利，也不承担任何义务。