# 苹果风格图片贴纸编辑器开发文档

## 项目概述

基于已完成的苹果风格UI界面，开发一个完整的图片贴纸编辑器，支持图片上传、贴纸添加、交互编辑和多分辨率导出功能。

## 技术栈

- **前端**: HTML5 + CSS3 + 原生JavaScript
- **核心API**: Canvas 2D、FileReader、Touch Events
- **设计风格**: Apple Design System
- **兼容性**: 现代浏览器 + 移动端

## 现有UI资源

项目已包含完整的苹果风格UI界面文件：
- `index.html` - 完整的UI界面和基础交互代码
- 苹果官方设计语言实现
- 响应式布局支持桌面和移动端
- 基础事件绑定和状态管理

## 核心功能开发需求

### 1. Canvas图片编辑器核心类

创建 `ImageEditor` 类作为核心引擎：

```javascript
class ImageEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.originalImage = null;
        this.stickers = [];
        this.selectedSticker = null;
        this.scale = 1;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
    }

    // 核心方法需要实现
    loadImage(file) { } // 加载并显示主图
    addSticker(type, data, x, y) { } // 添加贴纸
    selectSticker(sticker) { } // 选中贴纸
    deleteSticker(sticker) { } // 删除贴纸
    renderCanvas() { } // 重绘整个画布
    exportImage(scale) { } // 导出指定分辨率图片
}
```

### 2. 图片上传和处理

#### 2.1 文件处理
- 支持 JPG、PNG、WebP 格式
- 文件大小限制：最大 10MB
- 自动调整Canvas尺寸匹配图片原始尺寸
- 保持图片宽高比

#### 2.2 Canvas初始化
```javascript
function initializeCanvas(image) {
    // 设置Canvas尺寸为图片原始尺寸
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    
    // 计算显示缩放比例
    const displayScale = Math.min(
        maxDisplayWidth / image.naturalWidth,
        maxDisplayHeight / image.naturalHeight,
        1
    );
    
    canvas.style.width = (image.naturalWidth * displayScale) + 'px';
    canvas.style.height = (image.naturalHeight * displayScale) + 'px';
}
```

### 3. 贴纸系统实现

#### 3.1 贴纸数据结构
```javascript
class Sticker {
    constructor(type, data, x, y) {
        this.id = generateUniqueId();
        this.type = type; // 'emoji' 或 'image'
        this.data = data; // emoji字符或图片对象
        this.x = x;
        this.y = y;
        this.width = 80; // 默认尺寸
        this.height = 80;
        this.rotation = 0;
        this.scale = 1;
        this.selected = false;
    }
}
```

#### 3.2 Emoji贴纸渲染
```javascript
function drawEmojiSticker(sticker) {
    ctx.save();
    ctx.translate(sticker.x + sticker.width/2, sticker.y + sticker.height/2);
    ctx.rotate(sticker.rotation);
    ctx.scale(sticker.scale, sticker.scale);
    
    ctx.font = `${sticker.width}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.data, 0, 0);
    
    ctx.restore();
}
```

### 4. 交互系统

#### 4.1 鼠标/触摸事件处理
实现统一的事件处理系统支持桌面和移动端：

```javascript
class EventHandler {
    constructor(canvas, editor) {
        this.canvas = canvas;
        this.editor = editor;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onPointerMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onPointerUp.bind(this));
        
        // 触摸事件
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    }
}
```

#### 4.2 坐标转换系统
```javascript
function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}
```

### 5. 贴纸选中和控制点

#### 5.1 选中状态显示
选中贴纸时显示：
- 边框高亮
- 四个角的缩放控制点
- 旋转控制点（右上角延伸）
- 删除按钮（左上角）

```javascript
function drawStickerControls(sticker) {
    if (!sticker.selected) return;
    
    const padding = 5;
    ctx.strokeStyle = '#007aff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        sticker.x - padding, 
        sticker.y - padding, 
        sticker.width + padding * 2, 
        sticker.height + padding * 2
    );
    
    // 绘制控制点
    drawControlPoints(sticker);
    drawRotationHandle(sticker);
    drawDeleteButton(sticker);
}
```

### 6. 移动端手势支持

#### 6.1 双指缩放检测
```javascript
class GestureHandler {
    constructor() {
        this.touches = [];
        this.initialDistance = 0;
        this.initialAngle = 0;
    }
    
    handleTouchStart(event) {
        this.touches = Array.from(event.touches);
        if (this.touches.length === 2) {
            this.initialDistance = this.getDistance(this.touches[0], this.touches[1]);
            this.initialAngle = this.getAngle(this.touches[0], this.touches[1]);
        }
    }
    
    getDistance(touch1, touch2) {
        return Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
    }
}
```

### 7. 多分辨率导出系统

#### 7.1 导出核心函数
```javascript
function exportImage(qualityScale) {
    // 创建导出用的临时Canvas
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    
    // 设置导出尺寸
    exportCanvas.width = originalImage.width * qualityScale;
    exportCanvas.height = originalImage.height * qualityScale;
    
    // 设置高质量绘制
    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';
    
    // 应用缩放变换
    exportCtx.scale(qualityScale, qualityScale);
    
    // 重绘主图
    exportCtx.drawImage(originalImage, 0, 0);
    
    // 重绘所有贴纸
    stickers.forEach(sticker => {
        drawStickerForExport(exportCtx, sticker);
    });
    
    // 导出为Blob
    exportCanvas.toBlob(blob => {
        downloadImage(blob, `edited_${Date.now()}.png`);
    }, 'image/png');
}
```

### 8. 性能优化

#### 8.1 渲染优化
- 使用 `requestAnimationFrame` 优化重绘
- 实现脏区域检测，只重绘必要区域
- 大图片的分层渲染

#### 8.2 内存管理
```javascript
class MemoryManager {
    static cleanupTempCanvas() {
        // 清理临时Canvas
        if (tempCanvas) {
            tempCanvas.width = 1;
            tempCanvas.height = 1;
        }
    }
    
    static limitImageSize(image, maxSize = 4096) {
        if (image.width > maxSize || image.height > maxSize) {
            // 创建缩放后的图片
            return this.resizeImage(image, maxSize);
        }
        return image;
    }
}
```

## 文件结构规划

```
914promaskface/
├── index.html                    # 已完成的UI界面
├── js/
│   ├── main.js                  # 主入口文件，初始化应用
│   ├── ImageEditor.js           # 核心编辑器类
│   ├── Sticker.js               # 贴纸类定义
│   ├── EventHandler.js          # 事件处理系统
│   ├── GestureHandler.js        # 移动端手势处理
│   ├── ExportManager.js         # 导出功能管理
│   └── Utils.js                 # 工具函数
├── css/
│   └── style.css               # (可选) 额外样式，UI已在HTML中完成
└── README.md                   # 项目说明
```

## 开发优先级和里程碑

### Phase 1: 核心功能 (40%)
- [ ] 图片上传和Canvas初始化
- [ ] ImageEditor核心类实现
- [ ] 基础的贴纸添加和显示
- [ ] Canvas渲染系统

### Phase 2: 交互系统 (35%)  
- [ ] 鼠标/触摸事件处理
- [ ] 贴纸选中和拖拽
- [ ] 坐标转换和碰撞检测
- [ ] 选中状态的视觉反馈

### Phase 3: 高级功能 (20%)
- [ ] 缩放和旋转控制点
- [ ] 移动端双指手势支持
- [ ] 删除功能
- [ ] 自定义贴图上传

### Phase 4: 导出和优化 (5%)
- [ ] 多分辨率导出功能
- [ ] 性能优化和内存管理
- [ ] 错误处理和用户体验优化

## 关键技术实现点

### 1. Canvas高DPI支持
```javascript
function setupHighDPICanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = ctx.webkitBackingStorePixelRatio || 1;
    const ratio = devicePixelRatio / backingStoreRatio;
    
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    ctx.scale(ratio, ratio);
}
```

### 2. 贴纸碰撞检测
```javascript
function isPointInSticker(x, y, sticker) {
    return x >= sticker.x && 
           x <= sticker.x + sticker.width &&
           y >= sticker.y && 
           y <= sticker.y + sticker.height;
}
```

### 3. 控制点检测
```javascript
function getControlPointAt(x, y, sticker) {
    const points = {
        'top-left': { x: sticker.x, y: sticker.y },
        'top-right': { x: sticker.x + sticker.width, y: sticker.y },
        'bottom-left': { x: sticker.x, y: sticker.y + sticker.height },
        'bottom-right': { x: sticker.x + sticker.width, y: sticker.y + sticker.height },
        'rotate': { x: sticker.x + sticker.width + 20, y: sticker.y - 10 }
    };
    
    for (let [type, point] of Object.entries(points)) {
        if (Math.abs(x - point.x) < 10 && Math.abs(y - point.y) < 10) {
            return type;
        }
    }
    return null;
}
```

## 测试和验证

### 1. 功能测试清单
- [ ] 各种格式图片上传测试
- [ ] 20个emoji贴纸正确显示
- [ ] 自定义贴图上传和显示
- [ ] 拖拽、缩放、旋转操作
- [ ] 删除功能
- [ ] 三种分辨率导出测试

### 2. 兼容性测试
- [ ] Chrome/Safari/Firefox桌面版
- [ ] iOS Safari (iPhone/iPad)
- [ ] Android Chrome
- [ ] 不同屏幕尺寸响应式测试

### 3. 性能测试
- [ ] 大图片(>2MB)处理性能
- [ ] 多贴纸(>10个)渲染性能
- [ ] 内存使用监控
- [ ] 移动端触摸响应延迟

## 部署和使用

### 1. 本地开发
```bash
# 进入项目目录
cd 914promaskface

# 启动本地服务器（可选）
python -m http.server 8000
# 或使用 Live Server 扩展
```

### 2. 生产部署
- 静态文件托管即可
- 确保HTTPS环境（移动端文件上传需要）
- 建议启用gzip压缩

## 扩展功能(后期)

- [ ] 撤销/重做功能
- [ ] 贴纸图层管理
- [ ] 文字贴纸功能
- [ ] 滤镜效果
- [ ] 模板系统
- [ ] 云端保存功能

---

**开发提示**: 
1. 现有的UI界面已经完全实现，重点关注JavaScript功能开发
2. 保持苹果设计风格的交互体验
3. 优先实现核心功能，再完善高级特性
4. 确保移动端体验流畅自然
5. 注意Canvas性能优化和内存管理

**文档版本**: v2.0  
**UI完成度**: 100%  
**预计开发周期**: 2-3周