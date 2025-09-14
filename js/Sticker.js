/**
 * 贴纸类
 * 定义贴纸的数据结构和基本操作
 */

class Sticker {
    /**
     * 构造函数
     * @param {string} type 贴纸类型：'emoji' 或 'image'
     * @param {string|HTMLImageElement} data 贴纸数据：emoji字符串或图片对象
     * @param {number} x X坐标
     * @param {number} y Y坐标
     * @param {Object} options 可选参数
     */
    constructor(type, data, x, y, options = {}) {
        this.id = Utils.generateUniqueId();
        this.type = type;
        this.data = data;
        this.x = x;
        this.y = y;

        // 默认属性
        this.width = options.width || 80;
        this.height = options.height || 80;
        this.rotation = options.rotation || 0;
        this.scale = options.scale || 1;
        this.opacity = options.opacity || 1;
        this.selected = false;

        // 控制点大小
        this.controlPointSize = 12;
        this.controlPointPadding = 8;

        // 最小最大尺寸限制
        this.minSize = 20;
        this.maxSize = 300;
    }

    /**
     * 获取贴纸的边界矩形
     * @returns {Object} {x, y, width, height}
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width * this.scale,
            height: this.height * this.scale
        };
    }

    /**
     * 获取贴纸中心点
     * @returns {Object} {x, y}
     */
    getCenter() {
        const bounds = this.getBounds();
        return {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
        };
    }

    /**
     * 检测点是否在贴纸内
     * @param {number} x X坐标
     * @param {number} y Y坐标
     * @returns {boolean}
     */
    containsPoint(x, y) {
        if (this.rotation === 0) {
            // 无旋转的简单检测
            const bounds = this.getBounds();
            return Utils.isPointInRect(x, y, bounds);
        } else {
            // 有旋转的检测，将点转换到贴纸的本地坐标系
            const center = this.getCenter();
            const cos = Math.cos(-this.rotation);
            const sin = Math.sin(-this.rotation);

            // 将点相对于贴纸中心进行反向旋转
            const localX = cos * (x - center.x) - sin * (y - center.y) + center.x;
            const localY = sin * (x - center.x) + cos * (y - center.y) + center.y;

            const bounds = this.getBounds();
            return Utils.isPointInRect(localX, localY, bounds);
        }
    }

    /**
     * 获取控制点位置
     * @returns {Object} 控制点位置映射
     */
    getControlPoints() {
        const bounds = this.getBounds();
        const padding = this.controlPointPadding;

        return {
            topLeft: {
                x: bounds.x - padding,
                y: bounds.y - padding,
                cursor: 'nw-resize'
            },
            topRight: {
                x: bounds.x + bounds.width + padding,
                y: bounds.y - padding,
                cursor: 'ne-resize'
            },
            bottomLeft: {
                x: bounds.x - padding,
                y: bounds.y + bounds.height + padding,
                cursor: 'sw-resize'
            },
            bottomRight: {
                x: bounds.x + bounds.width + padding,
                y: bounds.y + bounds.height + padding,
                cursor: 'se-resize'
            },
            rotation: {
                x: bounds.x + bounds.width / 2,
                y: bounds.y - padding - 20,
                cursor: 'crosshair'
            },
            delete: {
                x: bounds.x - padding - 5,
                y: bounds.y - padding - 5,
                cursor: 'pointer'
            }
        };
    }

    /**
     * 检测点是否在控制点上
     * @param {number} x X坐标
     * @param {number} y Y坐标
     * @returns {string|null} 控制点类型或null
     */
    getControlPointAt(x, y) {
        if (!this.selected) return null;

        const controlPoints = this.getControlPoints();
        const threshold = this.controlPointSize;

        for (const [type, point] of Object.entries(controlPoints)) {
            if (Utils.getDistance({x, y}, point) <= threshold) {
                return type;
            }
        }

        return null;
    }

    /**
     * 移动贴纸
     * @param {number} deltaX X偏移量
     * @param {number} deltaY Y偏移量
     */
    move(deltaX, deltaY) {
        this.x += deltaX;
        this.y += deltaY;
    }

    /**
     * 缩放贴纸
     * @param {number} scaleChange 缩放变化量
     * @param {Object} fixedPoint 固定点（可选）
     */
    resize(scaleChange, fixedPoint) {
        const oldScale = this.scale;
        this.scale = Utils.clamp(this.scale * scaleChange, 0.2, 3.0);

        // 如果提供了固定点，调整位置以保持固定点不动
        if (fixedPoint) {
            const scaleRatio = this.scale / oldScale;
            const center = this.getCenter();

            const newCenterX = fixedPoint.x + (center.x - fixedPoint.x) * scaleRatio;
            const newCenterY = fixedPoint.y + (center.y - fixedPoint.y) * scaleRatio;

            this.x = newCenterX - (this.width * this.scale) / 2;
            this.y = newCenterY - (this.height * this.scale) / 2;
        }
    }

    /**
     * 旋转贴纸
     * @param {number} deltaAngle 角度变化量（弧度）
     * @param {Object} pivot 旋转中心点（可选）
     */
    rotate(deltaAngle, pivot) {
        this.rotation += deltaAngle;

        // 将旋转角度保持在 -π 到 π 范围内
        while (this.rotation > Math.PI) this.rotation -= 2 * Math.PI;
        while (this.rotation < -Math.PI) this.rotation += 2 * Math.PI;

        // 如果提供了旋转中心点且不是贴纸中心，需要调整位置
        if (pivot) {
            const center = this.getCenter();
            if (Utils.getDistance(center, pivot) > 5) {
                const cos = Math.cos(deltaAngle);
                const sin = Math.sin(deltaAngle);

                const dx = center.x - pivot.x;
                const dy = center.y - pivot.y;

                const newCenterX = pivot.x + dx * cos - dy * sin;
                const newCenterY = pivot.y + dx * sin + dy * cos;

                this.x = newCenterX - (this.width * this.scale) / 2;
                this.y = newCenterY - (this.height * this.scale) / 2;
            }
        }
    }

    /**
     * 设置透明度
     * @param {number} opacity 透明度 (0-1)
     */
    setOpacity(opacity) {
        this.opacity = Utils.clamp(opacity, 0, 1);
    }

    /**
     * 选中贴纸
     */
    select() {
        this.selected = true;
    }

    /**
     * 取消选中贴纸
     */
    deselect() {
        this.selected = false;
    }

    /**
     * 克隆贴纸
     * @returns {Sticker} 新的贴纸实例
     */
    clone() {
        const cloned = new Sticker(this.type, this.data, this.x + 20, this.y + 20, {
            width: this.width,
            height: this.height,
            rotation: this.rotation,
            scale: this.scale,
            opacity: this.opacity
        });
        return cloned;
    }

    /**
     * 序列化贴纸数据
     * @returns {Object} 序列化后的数据
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            data: this.type === 'emoji' ? this.data : null, // 图片数据不序列化
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation,
            scale: this.scale,
            opacity: this.opacity
        };
    }

    /**
     * 从序列化数据创建贴纸
     * @param {Object} data 序列化数据
     * @param {HTMLImageElement} imageData 图片数据（如果是图片贴纸）
     * @returns {Sticker} 贴纸实例
     */
    static deserialize(data, imageData = null) {
        const stickerData = data.type === 'image' ? imageData : data.data;

        const sticker = new Sticker(data.type, stickerData, data.x, data.y, {
            width: data.width,
            height: data.height,
            rotation: data.rotation,
            scale: data.scale,
            opacity: data.opacity
        });

        sticker.id = data.id;
        return sticker;
    }

    /**
     * 检查两个贴纸是否重叠
     * @param {Sticker} other 另一个贴纸
     * @returns {boolean}
     */
    overlaps(other) {
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds();

        return !(bounds1.x + bounds1.width < bounds2.x ||
                bounds2.x + bounds2.width < bounds1.x ||
                bounds1.y + bounds1.height < bounds2.y ||
                bounds2.y + bounds2.height < bounds1.y);
    }

    /**
     * 获取贴纸的可视化信息（用于调试）
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            id: this.id,
            type: this.type,
            position: { x: this.x, y: this.y },
            size: { width: this.width, height: this.height },
            scale: this.scale,
            rotation: Utils.radiansToDegrees(this.rotation),
            opacity: this.opacity,
            selected: this.selected,
            bounds: this.getBounds(),
            center: this.getCenter()
        };
    }
}