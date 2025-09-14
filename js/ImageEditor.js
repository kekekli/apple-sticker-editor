/**
 * 图片编辑器核心类
 * 管理图片加载、贴纸操作、Canvas渲染等核心功能
 */

class ImageEditor {
    /**
     * 构造函数
     * @param {string} canvasId Canvas元素ID
     * @param {Object} options 配置选项
     */
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // 配置选项
        this.options = {
            maxDisplayWidth: 800,
            maxDisplayHeight: 600,
            backgroundColor: '#f0f0f0',
            ...options
        };

        // 核心数据
        this.originalImage = null;
        this.displayScale = 1;
        this.stickers = [];
        this.selectedSticker = null;

        // 操作状态
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.currentControlPoint = null;
        this.lastMousePos = { x: 0, y: 0 };

        // 历史记录（用于撤销/重做）
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 20;

        // 初始化
        this.initialize();
    }

    /**
     * 初始化编辑器
     */
    initialize() {
        // 设置Canvas初始状态
        this.canvas.style.cursor = 'default';

        // 保存初始状态
        this.saveState();
    }

    /**
     * 加载图片
     * @param {File|HTMLImageElement} source 图片源
     * @returns {Promise}
     */
    async loadImage(source) {
        try {
            let image;

            if (source instanceof File) {
                const validation = Utils.validateImageFile(source);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }
                image = await Utils.loadImageFile(source);
            } else if (source instanceof HTMLImageElement) {
                image = source;
            } else {
                throw new Error('不支持的图片源类型');
            }

            this.originalImage = image;

            // 计算显示尺寸
            const fitSize = Utils.calculateFitSize(
                image.naturalWidth,
                image.naturalHeight,
                this.options.maxDisplayWidth,
                this.options.maxDisplayHeight
            );

            this.displayScale = fitSize.scale;

            // 设置Canvas尺寸
            this.setupCanvas(image.naturalWidth, image.naturalHeight, fitSize);

            // 清除现有贴纸
            this.clearStickers();

            // 渲染图片
            this.renderCanvas();

            // 显示Canvas
            this.showCanvas();

            // 保存状态
            this.saveState();

            Utils.showToast('图片加载成功', 'success');

        } catch (error) {
            console.error('图片加载失败:', error);
            Utils.showToast(error.message, 'error');
            throw error;
        }
    }

    /**
     * 设置Canvas尺寸和样式
     * @param {number} imageWidth 图片宽度
     * @param {number} imageHeight 图片高度
     * @param {Object} fitSize 适应尺寸信息
     */
    setupCanvas(imageWidth, imageHeight, fitSize) {
        // 设置Canvas实际尺寸为图片原始尺寸
        this.canvas.width = imageWidth;
        this.canvas.height = imageHeight;

        // 设置Canvas显示尺寸
        this.canvas.style.width = fitSize.width + 'px';
        this.canvas.style.height = fitSize.height + 'px';

        // 设置高质量渲染
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    /**
     * 显示Canvas
     */
    showCanvas() {
        const placeholder = document.getElementById('canvasPlaceholder');
        const canvas = document.getElementById('editCanvas');

        if (placeholder) placeholder.classList.add('hidden');
        if (canvas) canvas.classList.remove('hidden');

        // 启用工具按钮
        document.getElementById('downloadBtn').disabled = false;
    }

    /**
     * 添加贴纸
     * @param {string} type 贴纸类型：'emoji' 或 'image'
     * @param {string|HTMLImageElement} data 贴纸数据
     * @param {number} x X坐标（可选，默认居中）
     * @param {number} y Y坐标（可选，默认居中）
     * @returns {Sticker} 添加的贴纸
     */
    addSticker(type, data, x, y) {
        if (!this.originalImage) {
            Utils.showToast('请先加载图片', 'error');
            return null;
        }

        // 默认位置为画布中心
        if (x === undefined) {
            x = this.canvas.width / 2 - 40;
        }
        if (y === undefined) {
            y = this.canvas.height / 2 - 40;
        }

        // 创建贴纸
        const sticker = new Sticker(type, data, x, y);

        // 如果是图片贴纸，调整尺寸
        if (type === 'image' && data instanceof HTMLImageElement) {
            const maxSize = 120;
            const scale = Math.min(maxSize / data.naturalWidth, maxSize / data.naturalHeight, 1);
            sticker.width = data.naturalWidth * scale;
            sticker.height = data.naturalHeight * scale;
        }

        // 添加到列表
        this.stickers.push(sticker);

        // 选中新贴纸
        this.selectSticker(sticker);

        // 重新渲染
        this.renderCanvas();

        // 保存状态
        this.saveState();

        return sticker;
    }

    /**
     * 选中贴纸
     * @param {Sticker} sticker 要选中的贴纸
     */
    selectSticker(sticker) {
        // 取消其他贴纸的选中状态
        this.stickers.forEach(s => s.deselect());

        // 选中指定贴纸
        if (sticker) {
            sticker.select();
            this.selectedSticker = sticker;
        } else {
            this.selectedSticker = null;
        }

        // 重新渲染
        this.renderCanvas();
    }

    /**
     * 删除贴纸
     * @param {Sticker} sticker 要删除的贴纸
     */
    deleteSticker(sticker) {
        const index = this.stickers.indexOf(sticker);
        if (index > -1) {
            this.stickers.splice(index, 1);

            if (this.selectedSticker === sticker) {
                this.selectedSticker = null;
            }

            this.renderCanvas();
            this.saveState();
        }
    }

    /**
     * 清除所有贴纸
     */
    clearStickers() {
        this.stickers = [];
        this.selectedSticker = null;
        this.renderCanvas();
        this.saveState();
    }

    /**
     * 根据坐标获取贴纸
     * @param {number} x X坐标
     * @param {number} y Y坐标
     * @returns {Sticker|null} 贴纸对象或null
     */
    getStickerAt(x, y) {
        // 从后往前遍历（后添加的在上层）
        for (let i = this.stickers.length - 1; i >= 0; i--) {
            const sticker = this.stickers[i];
            if (sticker.containsPoint(x, y)) {
                return sticker;
            }
        }
        return null;
    }

    /**
     * 渲染整个画布
     */
    renderCanvas() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景图片
        if (this.originalImage) {
            this.ctx.drawImage(
                this.originalImage,
                0, 0,
                this.canvas.width,
                this.canvas.height
            );
        }

        // 绘制所有贴纸
        this.stickers.forEach(sticker => {
            this.drawSticker(sticker);
        });

        // 绘制选中贴纸的控制点
        if (this.selectedSticker) {
            this.drawStickerControls(this.selectedSticker);
        }
    }

    /**
     * 绘制贴纸
     * @param {Sticker} sticker 贴纸对象
     */
    drawSticker(sticker) {
        this.ctx.save();

        // 设置透明度
        this.ctx.globalAlpha = sticker.opacity;

        // 计算变换
        const center = sticker.getCenter();

        // 移动到贴纸中心
        this.ctx.translate(center.x, center.y);

        // 应用旋转
        if (sticker.rotation !== 0) {
            this.ctx.rotate(sticker.rotation);
        }

        // 应用缩放
        this.ctx.scale(sticker.scale, sticker.scale);

        if (sticker.type === 'emoji') {
            this.drawEmojiSticker(sticker);
        } else if (sticker.type === 'image') {
            this.drawImageSticker(sticker);
        }

        this.ctx.restore();
    }

    /**
     * 绘制Emoji贴纸
     * @param {Sticker} sticker 贴纸对象
     */
    drawEmojiSticker(sticker) {
        this.ctx.font = `${sticker.width}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(sticker.data, 0, 0);
    }

    /**
     * 绘制图片贴纸
     * @param {Sticker} sticker 贴纸对象
     */
    drawImageSticker(sticker) {
        this.ctx.drawImage(
            sticker.data,
            -sticker.width / 2,
            -sticker.height / 2,
            sticker.width,
            sticker.height
        );
    }

    /**
     * 绘制贴纸控制点
     * @param {Sticker} sticker 贴纸对象
     */
    drawStickerControls(sticker) {
        const controlPoints = sticker.getControlPoints();

        // 绘制边框
        this.drawStickerBorder(sticker);

        // 绘制控制点
        this.ctx.save();
        this.ctx.fillStyle = '#007AFF';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;

        Object.entries(controlPoints).forEach(([type, point]) => {
            this.ctx.beginPath();

            if (type === 'delete') {
                // 删除按钮 - 红色圆圈带X
                this.ctx.fillStyle = '#FF3B30';
                this.ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // 绘制X
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(point.x - 4, point.y - 4);
                this.ctx.lineTo(point.x + 4, point.y + 4);
                this.ctx.moveTo(point.x + 4, point.y - 4);
                this.ctx.lineTo(point.x - 4, point.y + 4);
                this.ctx.stroke();

            } else if (type === 'rotation') {
                // 旋转控制点 - 圆形
                this.ctx.fillStyle = '#5AC8FA';
                this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

            } else {
                // 缩放控制点 - 正方形
                this.ctx.fillStyle = '#007AFF';
                this.ctx.fillRect(point.x - 6, point.y - 6, 12, 12);
                this.ctx.strokeRect(point.x - 6, point.y - 6, 12, 12);
            }

            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.fillStyle = '#007AFF';
        });

        this.ctx.restore();
    }

    /**
     * 绘制贴纸边框
     * @param {Sticker} sticker 贴纸对象
     */
    drawStickerBorder(sticker) {
        const bounds = sticker.getBounds();
        const padding = sticker.controlPointPadding;

        this.ctx.save();
        this.ctx.strokeStyle = '#007AFF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.strokeRect(
            bounds.x - padding,
            bounds.y - padding,
            bounds.width + padding * 2,
            bounds.height + padding * 2
        );

        this.ctx.restore();
    }

    /**
     * 保存当前状态到历史记录
     */
    saveState() {
        const state = {
            stickers: this.stickers.map(sticker => sticker.serialize()),
            selectedStickerId: this.selectedSticker ? this.selectedSticker.id : null
        };

        // 清除当前位置之后的历史记录
        this.history = this.history.slice(0, this.historyIndex + 1);

        // 添加新状态
        this.history.push(state);

        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    /**
     * 撤销操作
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    /**
     * 重做操作
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    /**
     * 恢复状态
     * @param {Object} state 状态对象
     */
    restoreState(state) {
        // 重建贴纸数组
        this.stickers = state.stickers.map(stickerData => {
            // 对于图片贴纸，需要从现有贴纸中找到对应的图片数据
            let imageData = null;
            if (stickerData.type === 'image') {
                const existingSticker = this.stickers.find(s => s.id === stickerData.id);
                if (existingSticker) {
                    imageData = existingSticker.data;
                }
            }
            return Sticker.deserialize(stickerData, imageData);
        });

        // 恢复选中状态
        this.selectedSticker = null;
        if (state.selectedStickerId) {
            this.selectedSticker = this.stickers.find(s => s.id === state.selectedStickerId) || null;
            if (this.selectedSticker) {
                this.selectedSticker.select();
            }
        }

        // 重新渲染
        this.renderCanvas();
    }

    /**
     * 重置编辑器
     */
    reset() {
        this.originalImage = null;
        this.stickers = [];
        this.selectedSticker = null;
        this.history = [];
        this.historyIndex = -1;

        // 隐藏Canvas
        const placeholder = document.getElementById('canvasPlaceholder');
        const canvas = document.getElementById('editCanvas');

        if (placeholder) placeholder.classList.remove('hidden');
        if (canvas) canvas.classList.add('hidden');

        // 禁用工具按钮
        document.getElementById('downloadBtn').disabled = true;

        this.saveState();
    }

    /**
     * 获取编辑器状态信息
     * @returns {Object}
     */
    getState() {
        return {
            hasImage: !!this.originalImage,
            stickerCount: this.stickers.length,
            selectedSticker: this.selectedSticker ? this.selectedSticker.id : null,
            canUndo: this.historyIndex > 0,
            canRedo: this.historyIndex < this.history.length - 1
        };
    }

    /**
     * 销毁编辑器
     */
    destroy() {
        this.reset();
        this.canvas = null;
        this.ctx = null;
    }
}