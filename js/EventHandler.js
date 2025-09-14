/**
 * 事件处理器类
 * 统一处理鼠标和触摸事件，实现贴纸的选择、拖拽、缩放、旋转等操作
 */

class EventHandler {
    /**
     * 构造函数
     * @param {HTMLCanvasElement} canvas Canvas元素
     * @param {ImageEditor} editor 编辑器实例
     */
    constructor(canvas, editor) {
        this.canvas = canvas;
        this.editor = editor;

        // 交互状态
        this.isPointerDown = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.lastPointerPos = { x: 0, y: 0 };
        this.currentControlPoint = null;
        this.dragStartPos = { x: 0, y: 0 };

        // 双击检测
        this.lastClickTime = 0;
        this.doubleClickThreshold = 300;

        // 绑定方法上下文
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);

        this.initialize();
    }

    /**
     * 初始化事件监听器
     */
    initialize() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', this.handlePointerDown);
        document.addEventListener('mousemove', this.handlePointerMove);
        document.addEventListener('mouseup', this.handlePointerUp);

        // 触摸事件
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // 阻止上下文菜单
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // 键盘事件（删除键）
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * 统一指针按下处理
     * @param {Event} event 事件对象
     */
    handlePointerDown(event) {
        if (!this.editor.originalImage) return;

        event.preventDefault();

        const pos = Utils.getCanvasCoordinates(event, this.canvas);
        this.lastPointerPos = pos;
        this.dragStartPos = pos;
        this.isPointerDown = true;

        // 检查是否点击了控制点
        if (this.editor.selectedSticker) {
            const controlPoint = this.editor.selectedSticker.getControlPointAt(pos.x, pos.y);

            if (controlPoint) {
                this.currentControlPoint = controlPoint;

                if (controlPoint === 'delete') {
                    this.editor.deleteSticker(this.editor.selectedSticker);
                    this.resetInteractionState();
                    return;
                }

                this.isResizing = (controlPoint.includes('Left') || controlPoint.includes('Right'));
                this.isRotating = (controlPoint === 'rotation');

                this.updateCursor(controlPoint);
                return;
            }
        }

        // 检查是否点击了贴纸
        const clickedSticker = this.editor.getStickerAt(pos.x, pos.y);

        if (clickedSticker) {
            // 检测双击
            const currentTime = Date.now();
            if (currentTime - this.lastClickTime < this.doubleClickThreshold &&
                clickedSticker === this.editor.selectedSticker) {
                this.handleDoubleClick(clickedSticker, pos);
                return;
            }
            this.lastClickTime = currentTime;

            this.editor.selectSticker(clickedSticker);
            this.isDragging = true;
            this.canvas.style.cursor = 'move';
        } else {
            // 点击空白区域，取消选择
            this.editor.selectSticker(null);
            this.canvas.style.cursor = 'default';
        }
    }

    /**
     * 统一指针移动处理
     * @param {Event} event 事件对象
     */
    handlePointerMove(event) {
        if (!this.isPointerDown || !this.editor.originalImage) return;

        event.preventDefault();

        const pos = Utils.getCanvasCoordinates(event, this.canvas);
        const deltaX = pos.x - this.lastPointerPos.x;
        const deltaY = pos.y - this.lastPointerPos.y;

        if (this.editor.selectedSticker) {
            if (this.isDragging) {
                // 拖拽贴纸
                this.editor.selectedSticker.move(deltaX, deltaY);
                this.editor.renderCanvas();

            } else if (this.isResizing && this.currentControlPoint) {
                // 缩放贴纸
                this.handleResize(pos, deltaX, deltaY);

            } else if (this.isRotating) {
                // 旋转贴纸
                this.handleRotation(pos);
            }
        }

        this.lastPointerPos = pos;
    }

    /**
     * 统一指针抬起处理
     * @param {Event} event 事件对象
     */
    handlePointerUp(event) {
        if (!this.isPointerDown) return;

        // 如果有显著移动，保存状态
        const totalDistance = Utils.getDistance(this.dragStartPos, this.lastPointerPos);
        if (totalDistance > 5) {
            this.editor.saveState();
        }

        this.resetInteractionState();
    }

    /**
     * 处理缩放操作
     * @param {Object} pos 当前位置
     * @param {number} deltaX X轴移动距离
     * @param {number} deltaY Y轴移动距离
     */
    handleResize(pos, deltaX, deltaY) {
        const sticker = this.editor.selectedSticker;
        const controlPoint = this.currentControlPoint;
        const center = sticker.getCenter();

        // 计算缩放比例
        let scaleChange = 1;

        if (controlPoint.includes('Right')) {
            scaleChange += deltaX / 100;
        } else if (controlPoint.includes('Left')) {
            scaleChange -= deltaX / 100;
        }

        if (controlPoint.includes('bottom')) {
            scaleChange += deltaY / 100;
        } else if (controlPoint.includes('top')) {
            scaleChange -= deltaY / 100;
        }

        // 限制缩放范围
        scaleChange = Utils.clamp(scaleChange, 0.9, 1.1);

        // 应用缩放
        sticker.resize(scaleChange, center);
        this.editor.renderCanvas();
    }

    /**
     * 处理旋转操作
     * @param {Object} pos 当前位置
     */
    handleRotation(pos) {
        const sticker = this.editor.selectedSticker;
        const center = sticker.getCenter();

        // 计算当前角度和上一个角度
        const currentAngle = Utils.getAngle(center, pos);
        const lastAngle = Utils.getAngle(center, this.lastPointerPos);

        // 计算角度差
        const deltaAngle = currentAngle - lastAngle;

        // 应用旋转
        sticker.rotate(deltaAngle);
        this.editor.renderCanvas();
    }

    /**
     * 处理双击事件
     * @param {Sticker} sticker 被双击的贴纸
     * @param {Object} pos 点击位置
     */
    handleDoubleClick(sticker, pos) {
        // 双击可以实现复制贴纸或其他操作
        const clonedSticker = sticker.clone();
        this.editor.stickers.push(clonedSticker);
        this.editor.selectSticker(clonedSticker);
        this.editor.renderCanvas();
        this.editor.saveState();

        Utils.showToast('贴纸已复制', 'success', 1500);
    }

    /**
     * 触摸开始事件处理
     * @param {TouchEvent} event 触摸事件
     */
    handleTouchStart(event) {
        event.preventDefault();

        if (event.touches.length === 1) {
            // 单指触摸，模拟鼠标事件
            const touch = event.touches[0];
            const mouseEvent = this.createMouseEvent('mousedown', touch);
            this.handlePointerDown(mouseEvent);
        }
    }

    /**
     * 触摸移动事件处理
     * @param {TouchEvent} event 触摸事件
     */
    handleTouchMove(event) {
        event.preventDefault();

        if (event.touches.length === 1) {
            // 单指触摸，模拟鼠标事件
            const touch = event.touches[0];
            const mouseEvent = this.createMouseEvent('mousemove', touch);
            this.handlePointerMove(mouseEvent);
        }
    }

    /**
     * 触摸结束事件处理
     * @param {TouchEvent} event 触摸事件
     */
    handleTouchEnd(event) {
        event.preventDefault();

        if (event.changedTouches.length === 1) {
            // 单指触摸结束，模拟鼠标事件
            const touch = event.changedTouches[0];
            const mouseEvent = this.createMouseEvent('mouseup', touch);
            this.handlePointerUp(mouseEvent);
        }
    }

    /**
     * 键盘事件处理
     * @param {KeyboardEvent} event 键盘事件
     */
    handleKeyDown(event) {
        if (!this.editor.selectedSticker) return;

        switch (event.key) {
            case 'Delete':
            case 'Backspace':
                event.preventDefault();
                this.editor.deleteSticker(this.editor.selectedSticker);
                break;

            case 'Escape':
                event.preventDefault();
                this.editor.selectSticker(null);
                break;

            case 'c':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    const cloned = this.editor.selectedSticker.clone();
                    this.editor.stickers.push(cloned);
                    this.editor.selectSticker(cloned);
                    this.editor.renderCanvas();
                    this.editor.saveState();
                }
                break;

            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                event.preventDefault();
                this.handleArrowKeyMove(event.key, event.shiftKey);
                break;
        }
    }

    /**
     * 处理方向键移动
     * @param {string} key 按键
     * @param {boolean} shiftKey 是否按住Shift键
     */
    handleArrowKeyMove(key, shiftKey) {
        const moveDistance = shiftKey ? 10 : 1;
        let deltaX = 0, deltaY = 0;

        switch (key) {
            case 'ArrowUp': deltaY = -moveDistance; break;
            case 'ArrowDown': deltaY = moveDistance; break;
            case 'ArrowLeft': deltaX = -moveDistance; break;
            case 'ArrowRight': deltaX = moveDistance; break;
        }

        this.editor.selectedSticker.move(deltaX, deltaY);
        this.editor.renderCanvas();
        this.editor.saveState();
    }

    /**
     * 创建模拟鼠标事件
     * @param {string} type 事件类型
     * @param {Touch} touch 触摸对象
     * @returns {Object} 模拟鼠标事件
     */
    createMouseEvent(type, touch) {
        return {
            type: type,
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            target: this.canvas
        };
    }

    /**
     * 更新鼠标指针样式
     * @param {string} controlPoint 控制点类型
     */
    updateCursor(controlPoint) {
        const cursors = {
            'topLeft': 'nw-resize',
            'topRight': 'ne-resize',
            'bottomLeft': 'sw-resize',
            'bottomRight': 'se-resize',
            'rotation': 'crosshair',
            'delete': 'pointer'
        };

        this.canvas.style.cursor = cursors[controlPoint] || 'default';
    }

    /**
     * 重置交互状态
     */
    resetInteractionState() {
        this.isPointerDown = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.currentControlPoint = null;
        this.canvas.style.cursor = 'default';
    }

    /**
     * 处理Canvas鼠标移动（用于更新指针样式）
     * @param {Event} event 鼠标事件
     */
    handleCanvasMouseMove(event) {
        if (this.isPointerDown || !this.editor.selectedSticker) {
            return;
        }

        const pos = Utils.getCanvasCoordinates(event, this.canvas);

        // 检查是否悬停在控制点上
        const controlPoint = this.editor.selectedSticker.getControlPointAt(pos.x, pos.y);

        if (controlPoint) {
            this.updateCursor(controlPoint);
        } else if (this.editor.selectedSticker.containsPoint(pos.x, pos.y)) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    /**
     * 添加Canvas悬停事件监听
     */
    addHoverListeners() {
        this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
        this.canvas.addEventListener('mouseleave', () => {
            this.canvas.style.cursor = 'default';
        });
    }

    /**
     * 销毁事件处理器
     */
    destroy() {
        // 移除所有事件监听器
        this.canvas.removeEventListener('mousedown', this.handlePointerDown);
        document.removeEventListener('mousemove', this.handlePointerMove);
        document.removeEventListener('mouseup', this.handlePointerUp);

        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);

        document.removeEventListener('keydown', this.handleKeyDown);
    }
}