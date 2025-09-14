/**
 * 手势处理器类
 * 专门处理移动端的双指缩放、旋转手势
 */

class GestureHandler {
    /**
     * 构造函数
     * @param {HTMLCanvasElement} canvas Canvas元素
     * @param {ImageEditor} editor 编辑器实例
     */
    constructor(canvas, editor) {
        this.canvas = canvas;
        this.editor = editor;

        // 触摸状态
        this.touches = [];
        this.isGesturing = false;

        // 初始手势数据
        this.initialDistance = 0;
        this.initialAngle = 0;
        this.initialScale = 1;
        this.initialRotation = 0;
        this.gestureCenter = { x: 0, y: 0 };

        // 手势阈值
        this.minGestureDistance = 50; // 最小手势距离
        this.gestureThreshold = 10;   // 手势识别阈值

        this.initialize();
    }

    /**
     * 初始化手势处理
     */
    initialize() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
    }

    /**
     * 触摸开始处理
     * @param {TouchEvent} event 触摸事件
     */
    handleTouchStart(event) {
        this.touches = Array.from(event.touches);

        if (this.touches.length === 2) {
            event.preventDefault();

            // 检查是否有选中的贴纸
            if (!this.editor.selectedSticker) {
                // 尝试选中两指中心附近的贴纸
                const center = this.getTouchCenter(this.touches);
                const canvasPos = Utils.getCanvasCoordinates({
                    clientX: center.x,
                    clientY: center.y
                }, this.canvas);

                const sticker = this.editor.getStickerAt(canvasPos.x, canvasPos.y);
                if (sticker) {
                    this.editor.selectSticker(sticker);
                }
            }

            if (this.editor.selectedSticker) {
                this.startGesture();
            }
        }
    }

    /**
     * 触摸移动处理
     * @param {TouchEvent} event 触摸事件
     */
    handleTouchMove(event) {
        if (event.touches.length === 2 && this.isGesturing) {
            event.preventDefault();

            const newTouches = Array.from(event.touches);
            this.processGesture(newTouches);
        }
    }

    /**
     * 触摸结束处理
     * @param {TouchEvent} event 触摸事件
     */
    handleTouchEnd(event) {
        if (this.isGesturing) {
            this.endGesture();
        }

        this.touches = Array.from(event.touches);

        if (this.touches.length < 2) {
            this.isGesturing = false;
        }
    }

    /**
     * 开始手势识别
     */
    startGesture() {
        const sticker = this.editor.selectedSticker;
        if (!sticker) return;

        this.isGesturing = true;

        // 记录初始状态
        this.initialDistance = this.getDistance(this.touches[0], this.touches[1]);
        this.initialAngle = this.getAngle(this.touches[0], this.touches[1]);
        this.initialScale = sticker.scale;
        this.initialRotation = sticker.rotation;
        this.gestureCenter = this.getTouchCenter(this.touches);

        // 提供触觉反馈（如果支持）
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        Utils.showToast('双指手势调整中...', 'info', 1000);
    }

    /**
     * 处理手势变化
     * @param {Touch[]} newTouches 新的触摸点数组
     */
    processGesture(newTouches) {
        const sticker = this.editor.selectedSticker;
        if (!sticker) return;

        const currentDistance = this.getDistance(newTouches[0], newTouches[1]);
        const currentAngle = this.getAngle(newTouches[0], newTouches[1]);

        // 计算缩放比例
        const scaleRatio = currentDistance / this.initialDistance;
        const newScale = Utils.clamp(this.initialScale * scaleRatio, 0.2, 3.0);

        // 计算旋转角度变化
        const angleDelta = currentAngle - this.initialAngle;
        const newRotation = this.initialRotation + angleDelta;

        // 应用变换
        sticker.scale = newScale;
        sticker.rotation = newRotation;

        // 调整位置以保持手势中心不变
        this.adjustStickerPosition(newTouches);

        // 重新渲染
        this.editor.renderCanvas();
    }

    /**
     * 调整贴纸位置以保持手势中心
     * @param {Touch[]} touches 当前触摸点
     */
    adjustStickerPosition(touches) {
        const sticker = this.editor.selectedSticker;
        const currentCenter = this.getTouchCenter(touches);
        const canvasCurrentCenter = Utils.getCanvasCoordinates({
            clientX: currentCenter.x,
            clientY: currentCenter.y
        }, this.canvas);

        const canvasInitialCenter = Utils.getCanvasCoordinates({
            clientX: this.gestureCenter.x,
            clientY: this.gestureCenter.y
        }, this.canvas);

        // 计算中心点偏移
        const deltaX = canvasCurrentCenter.x - canvasInitialCenter.x;
        const deltaY = canvasCurrentCenter.y - canvasInitialCenter.y;

        // 应用偏移到贴纸位置
        const stickerCenter = sticker.getCenter();
        sticker.x = canvasCurrentCenter.x - (sticker.width * sticker.scale) / 2 + deltaX;
        sticker.y = canvasCurrentCenter.y - (sticker.height * sticker.scale) / 2 + deltaY;
    }

    /**
     * 结束手势
     */
    endGesture() {
        if (this.isGesturing) {
            this.isGesturing = false;

            // 保存状态到历史记录
            this.editor.saveState();

            // 提供触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
        }
    }

    /**
     * 计算两个触摸点之间的距离
     * @param {Touch} touch1 第一个触摸点
     * @param {Touch} touch2 第二个触摸点
     * @returns {number} 距离
     */
    getDistance(touch1, touch2) {
        return Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
    }

    /**
     * 计算两个触摸点之间的角度
     * @param {Touch} touch1 第一个触摸点
     * @param {Touch} touch2 第二个触摸点
     * @returns {number} 角度（弧度）
     */
    getAngle(touch1, touch2) {
        return Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );
    }

    /**
     * 获取多个触摸点的中心位置
     * @param {Touch[]} touches 触摸点数组
     * @returns {Object} {x, y} 中心位置
     */
    getTouchCenter(touches) {
        if (touches.length === 0) return { x: 0, y: 0 };

        let totalX = 0;
        let totalY = 0;

        touches.forEach(touch => {
            totalX += touch.clientX;
            totalY += touch.clientY;
        });

        return {
            x: totalX / touches.length,
            y: totalY / touches.length
        };
    }

    /**
     * 检测是否是有效手势
     * @param {Touch[]} touches 触摸点数组
     * @returns {boolean} 是否是有效手势
     */
    isValidGesture(touches) {
        if (touches.length !== 2) return false;

        const distance = this.getDistance(touches[0], touches[1]);
        return distance >= this.minGestureDistance;
    }

    /**
     * 获取手势信息（用于调试）
     * @returns {Object} 手势信息
     */
    getGestureInfo() {
        return {
            isGesturing: this.isGesturing,
            touchCount: this.touches.length,
            initialDistance: this.initialDistance,
            initialAngle: Utils.radiansToDegrees(this.initialAngle),
            gestureCenter: this.gestureCenter
        };
    }

    /**
     * 销毁手势处理器
     */
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}

/**
 * 增强的手势识别器
 * 提供更精确的手势识别和处理
 */
class AdvancedGestureHandler extends GestureHandler {
    constructor(canvas, editor) {
        super(canvas, editor);

        // 手势历史记录
        this.gestureHistory = [];
        this.maxHistorySize = 10;

        // 手势速度计算
        this.lastGestureTime = 0;
        this.gestureVelocity = { scale: 0, rotation: 0 };
    }

    /**
     * 增强的手势处理
     * @param {Touch[]} newTouches 新的触摸点
     */
    processGesture(newTouches) {
        super.processGesture(newTouches);

        // 记录手势历史
        this.recordGestureHistory(newTouches);

        // 计算手势速度
        this.calculateGestureVelocity();

        // 应用惯性效果（可选）
        this.applyInertia();
    }

    /**
     * 记录手势历史
     * @param {Touch[]} touches 触摸点
     */
    recordGestureHistory(touches) {
        const timestamp = Date.now();
        const distance = this.getDistance(touches[0], touches[1]);
        const angle = this.getAngle(touches[0], touches[1]);

        this.gestureHistory.push({
            timestamp,
            distance,
            angle,
            touches: touches.map(touch => ({
                x: touch.clientX,
                y: touch.clientY
            }))
        });

        // 限制历史记录大小
        if (this.gestureHistory.length > this.maxHistorySize) {
            this.gestureHistory.shift();
        }
    }

    /**
     * 计算手势速度
     */
    calculateGestureVelocity() {
        if (this.gestureHistory.length < 2) return;

        const latest = this.gestureHistory[this.gestureHistory.length - 1];
        const previous = this.gestureHistory[this.gestureHistory.length - 2];

        const timeDelta = latest.timestamp - previous.timestamp;
        if (timeDelta === 0) return;

        // 计算缩放速度
        const scaleVelocity = (latest.distance - previous.distance) / timeDelta;

        // 计算旋转速度
        let angleDelta = latest.angle - previous.angle;
        // 处理角度跨越边界的情况
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

        const rotationVelocity = angleDelta / timeDelta;

        this.gestureVelocity = {
            scale: scaleVelocity,
            rotation: rotationVelocity
        };
    }

    /**
     * 应用惯性效果
     */
    applyInertia() {
        // 这里可以实现手势结束后的惯性效果
        // 让贴纸继续按照手势速度运动一小段时间

        const velocityThreshold = 0.001;

        if (Math.abs(this.gestureVelocity.scale) > velocityThreshold ||
            Math.abs(this.gestureVelocity.rotation) > velocityThreshold) {

            // 可以在这里实现惯性动画
            // 例如使用 requestAnimationFrame 创建平滑的惯性效果
        }
    }

    /**
     * 平滑手势应用
     * @param {number} targetScale 目标缩放
     * @param {number} targetRotation 目标旋转
     */
    smoothApplyGesture(targetScale, targetRotation) {
        const sticker = this.editor.selectedSticker;
        if (!sticker) return;

        // 使用缓动函数平滑应用变换
        const easingFactor = 0.1;

        const currentScale = sticker.scale;
        const currentRotation = sticker.rotation;

        const newScale = currentScale + (targetScale - currentScale) * easingFactor;
        const newRotation = currentRotation + (targetRotation - currentRotation) * easingFactor;

        sticker.scale = newScale;
        sticker.rotation = newRotation;

        this.editor.renderCanvas();
    }
}