/**
 * 工具函数库
 * 提供项目中需要的通用工具函数
 */

class Utils {
    /**
     * 生成唯一ID
     * @returns {string} 唯一标识符
     */
    static generateUniqueId() {
        return 'sticker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取Canvas相对坐标
     * @param {Event} event 事件对象
     * @param {HTMLCanvasElement} canvas Canvas元素
     * @returns {Object} {x, y} 坐标
     */
    static getCanvasCoordinates(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;

        // 处理触摸事件
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    /**
     * 计算两点间距离
     * @param {Object} point1 第一个点
     * @param {Object} point2 第二个点
     * @returns {number} 距离
     */
    static getDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) +
            Math.pow(point2.y - point1.y, 2)
        );
    }

    /**
     * 计算两点间角度
     * @param {Object} point1 第一个点
     * @param {Object} point2 第二个点
     * @returns {number} 角度（弧度）
     */
    static getAngle(point1, point2) {
        return Math.atan2(point2.y - point1.y, point2.x - point1.x);
    }

    /**
     * 检测点是否在矩形内
     * @param {number} x 点的x坐标
     * @param {number} y 点的y坐标
     * @param {Object} rect 矩形对象 {x, y, width, height}
     * @returns {boolean} 是否在矩形内
     */
    static isPointInRect(x, y, rect) {
        return x >= rect.x &&
               x <= rect.x + rect.width &&
               y >= rect.y &&
               y <= rect.y + rect.height;
    }

    /**
     * 限制数值在指定范围内
     * @param {number} value 值
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @returns {number} 限制后的值
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 角度转弧度
     * @param {number} degrees 角度
     * @returns {number} 弧度
     */
    static degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * 弧度转角度
     * @param {number} radians 弧度
     * @returns {number} 角度
     */
    static radiansToDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * 验证图片文件
     * @param {File} file 文件对象
     * @returns {Object} {valid: boolean, error?: string}
     */
    static validateImageFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (!file) {
            return { valid: false, error: '请选择文件' };
        }

        if (file.size > maxSize) {
            return { valid: false, error: '文件大小不能超过10MB' };
        }

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: '仅支持 JPG、PNG、WebP 格式' };
        }

        return { valid: true };
    }

    /**
     * 加载图片文件
     * @param {File} file 图片文件
     * @returns {Promise<HTMLImageElement>} 图片元素
     */
    static loadImageFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('图片加载失败'));
            };

            img.src = url;
        });
    }

    /**
     * 设置高DPI支持的Canvas
     * @param {HTMLCanvasElement} canvas Canvas元素
     * @param {number} width 宽度
     * @param {number} height 高度
     */
    static setupHighDPICanvas(canvas, width, height) {
        const ctx = canvas.getContext('2d');
        const devicePixelRatio = window.devicePixelRatio || 1;

        // 设置实际大小
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;

        // 设置显示大小
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        // 缩放绘图上下文以匹配设备像素比
        ctx.scale(devicePixelRatio, devicePixelRatio);

        // 设置高质量渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }

    /**
     * 计算适应容器的图片尺寸
     * @param {number} imageWidth 图片宽度
     * @param {number} imageHeight 图片高度
     * @param {number} containerWidth 容器宽度
     * @param {number} containerHeight 容器高度
     * @returns {Object} {width, height, scale}
     */
    static calculateFitSize(imageWidth, imageHeight, containerWidth, containerHeight) {
        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY, 1); // 不放大

        return {
            width: imageWidth * scale,
            height: imageHeight * scale,
            scale: scale
        };
    }

    /**
     * 显示Toast消息
     * @param {string} message 消息内容
     * @param {string} type 消息类型 'success'|'error'|'info'
     * @param {number} duration 显示持续时间（毫秒）
     */
    static showToast(message, type = 'info', duration = 3000) {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // 触发显示动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * 下载Blob为文件
     * @param {Blob} blob Blob对象
     * @param {string} filename 文件名
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 防抖函数
     * @param {Function} func 要防抖的函数
     * @param {number} wait 等待时间
     * @returns {Function} 防抖后的函数
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func 要节流的函数
     * @param {number} limit 限制时间
     * @returns {Function} 节流后的函数
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 深拷贝对象
     * @param {any} obj 要拷贝的对象
     * @returns {any} 拷贝后的对象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    /**
     * 格式化文件大小
     * @param {number} bytes 字节数
     * @returns {string} 格式化后的大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}