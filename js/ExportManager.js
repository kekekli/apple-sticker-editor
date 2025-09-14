/**
 * 导出管理器类
 * 处理图片的多分辨率导出功能
 */

class ExportManager {
    /**
     * 构造函数
     * @param {ImageEditor} editor 编辑器实例
     */
    constructor(editor) {
        this.editor = editor;
        this.exportScales = [1, 2, 4]; // 支持的导出分辨率
        this.currentExportScale = 1;
        this.isExporting = false;
    }

    /**
     * 设置导出分辨率
     * @param {number} scale 分辨率倍数
     */
    setExportScale(scale) {
        if (this.exportScales.includes(scale)) {
            this.currentExportScale = scale;
        } else {
            console.warn('不支持的导出分辨率:', scale);
        }
    }

    /**
     * 导出图片
     * @param {number} scale 分辨率倍数（可选）
     * @param {string} format 图片格式（可选，默认PNG）
     * @param {number} quality 图片质量（可选，0-1）
     * @returns {Promise<Blob>} 导出的图片Blob
     */
    async exportImage(scale = this.currentExportScale, format = 'png', quality = 1.0) {
        if (!this.editor.originalImage) {
            throw new Error('没有可导出的图片');
        }

        if (this.isExporting) {
            throw new Error('正在导出中，请稍候');
        }

        try {
            this.isExporting = true;

            // 显示导出状态
            Utils.showToast(`正在导出 ${scale}x 分辨率图片...`, 'info', 5000);

            // 创建导出用的临时Canvas
            const exportCanvas = document.createElement('canvas');
            const exportCtx = exportCanvas.getContext('2d');

            // 设置导出尺寸
            const originalWidth = this.editor.originalImage.naturalWidth;
            const originalHeight = this.editor.originalImage.naturalHeight;

            exportCanvas.width = originalWidth * scale;
            exportCanvas.height = originalHeight * scale;

            // 设置高质量渲染
            exportCtx.imageSmoothingEnabled = true;
            exportCtx.imageSmoothingQuality = 'high';

            // 应用缩放变换
            exportCtx.scale(scale, scale);

            // 绘制背景图片
            exportCtx.drawImage(
                this.editor.originalImage,
                0, 0,
                originalWidth,
                originalHeight
            );

            // 绘制所有贴纸
            for (const sticker of this.editor.stickers) {
                await this.drawStickerForExport(exportCtx, sticker, scale);
            }

            // 转换为Blob
            const mimeType = this.getMimeType(format);
            const blob = await this.canvasToBlob(exportCanvas, mimeType, quality);

            // 清理临时Canvas
            exportCanvas.width = 1;
            exportCanvas.height = 1;

            Utils.showToast('图片导出成功！', 'success');

            return blob;

        } catch (error) {
            console.error('图片导出失败:', error);
            Utils.showToast('图片导出失败: ' + error.message, 'error');
            throw error;

        } finally {
            this.isExporting = false;
        }
    }

    /**
     * 为导出绘制贴纸
     * @param {CanvasRenderingContext2D} ctx 绘图上下文
     * @param {Sticker} sticker 贴纸对象
     * @param {number} scale 缩放倍数
     */
    async drawStickerForExport(ctx, sticker, scale) {
        ctx.save();

        // 设置透明度
        ctx.globalAlpha = sticker.opacity;

        // 计算变换
        const center = sticker.getCenter();

        // 移动到贴纸中心
        ctx.translate(center.x, center.y);

        // 应用旋转
        if (sticker.rotation !== 0) {
            ctx.rotate(sticker.rotation);
        }

        // 应用缩放
        ctx.scale(sticker.scale, sticker.scale);

        if (sticker.type === 'emoji') {
            this.drawEmojiStickerForExport(ctx, sticker, scale);
        } else if (sticker.type === 'image') {
            await this.drawImageStickerForExport(ctx, sticker, scale);
        }

        ctx.restore();
    }

    /**
     * 为导出绘制Emoji贴纸
     * @param {CanvasRenderingContext2D} ctx 绘图上下文
     * @param {Sticker} sticker 贴纸对象
     * @param {number} scale 缩放倍数
     */
    drawEmojiStickerForExport(ctx, sticker, scale) {
        // 高分辨率下需要调整字体大小
        const fontSize = sticker.width * Math.min(scale, 2); // 限制字体缩放避免过大

        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 对于高分辨率导出，可能需要多次绘制以确保清晰度
        if (scale > 2) {
            // 使用路径描边提高清晰度
            ctx.strokeStyle = 'transparent';
            ctx.lineWidth = 0;
            ctx.strokeText(sticker.data, 0, 0);
        }

        ctx.fillText(sticker.data, 0, 0);
    }

    /**
     * 为导出绘制图片贴纸
     * @param {CanvasRenderingContext2D} ctx 绘图上下文
     * @param {Sticker} sticker 贴纸对象
     * @param {number} scale 缩放倍数
     */
    async drawImageStickerForExport(ctx, sticker, scale) {
        if (sticker.data instanceof HTMLImageElement) {
            // 对于高分辨率导出，可能需要重新加载更高质量的图片
            let imageToUse = sticker.data;

            if (scale > 2 && sticker.data.src) {
                try {
                    // 尝试加载原始分辨率图片
                    imageToUse = await this.loadHighResImage(sticker.data.src);
                } catch (error) {
                    console.warn('无法加载高分辨率图片，使用原图:', error);
                    imageToUse = sticker.data;
                }
            }

            ctx.drawImage(
                imageToUse,
                -sticker.width / 2,
                -sticker.height / 2,
                sticker.width,
                sticker.height
            );
        }
    }

    /**
     * 加载高分辨率图片
     * @param {string} src 图片源
     * @returns {Promise<HTMLImageElement>}
     */
    loadHighResImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => resolve(img);
            img.onerror = reject;

            img.src = src;
        });
    }

    /**
     * Canvas转Blob
     * @param {HTMLCanvasElement} canvas Canvas元素
     * @param {string} mimeType MIME类型
     * @param {number} quality 质量
     * @returns {Promise<Blob>}
     */
    canvasToBlob(canvas, mimeType, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas转换为Blob失败'));
                }
            }, mimeType, quality);
        });
    }

    /**
     * 获取MIME类型
     * @param {string} format 图片格式
     * @returns {string} MIME类型
     */
    getMimeType(format) {
        const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp'
        };

        return mimeTypes[format.toLowerCase()] || 'image/png';
    }

    /**
     * 下载图片
     * @param {number} scale 分辨率倍数
     * @param {string} format 图片格式
     * @param {number} quality 图片质量
     */
    async downloadImage(scale = this.currentExportScale, format = 'png', quality = 1.0) {
        try {
            const blob = await this.exportImage(scale, format, quality);

            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `edited-image-${scale}x-${timestamp}.${format}`;

            // 下载文件
            Utils.downloadBlob(blob, filename);

            Utils.showToast(`图片已保存: ${filename}`, 'success', 3000);

        } catch (error) {
            console.error('下载失败:', error);
            Utils.showToast('下载失败: ' + error.message, 'error');
        }
    }

    /**
     * 批量导出所有分辨率
     * @param {string} format 图片格式
     * @param {number} quality 图片质量
     */
    async exportAllResolutions(format = 'png', quality = 1.0) {
        if (!this.editor.originalImage) {
            Utils.showToast('没有可导出的图片', 'error');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

        for (const scale of this.exportScales) {
            try {
                Utils.showToast(`导出 ${scale}x 分辨率...`, 'info', 2000);

                const blob = await this.exportImage(scale, format, quality);
                const filename = `edited-image-${scale}x-${timestamp}.${format}`;

                Utils.downloadBlob(blob, filename);

                // 稍作延迟以避免浏览器阻止多文件下载
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`${scale}x分辨率导出失败:`, error);
                Utils.showToast(`${scale}x分辨率导出失败`, 'error');
            }
        }

        Utils.showToast('批量导出完成！', 'success');
    }

    /**
     * 预览导出效果
     * @param {number} scale 分辨率倍数
     * @returns {Promise<string>} 预览图片的DataURL
     */
    async previewExport(scale = 1) {
        try {
            const blob = await this.exportImage(scale, 'png', 1.0);
            const url = URL.createObjectURL(blob);

            // 创建预览窗口
            this.showPreviewWindow(url, scale);

            return url;

        } catch (error) {
            console.error('预览生成失败:', error);
            Utils.showToast('预览生成失败', 'error');
            throw error;
        }
    }

    /**
     * 显示预览窗口
     * @param {string} imageUrl 图片URL
     * @param {number} scale 缩放倍数
     */
    showPreviewWindow(imageUrl, scale) {
        // 创建模态窗口
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
        `;

        const title = document.createElement('h3');
        title.textContent = `预览 (${scale}x 分辨率)`;
        title.style.cssText = `
            margin: 0 0 15px 0;
            text-align: center;
            color: #333;
        `;

        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.cssText = `
            max-width: 100%;
            max-height: 70vh;
            display: block;
            margin: 0 auto;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            margin-top: 15px;
            padding: 8px 16px;
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            display: block;
            margin-left: auto;
            margin-right: auto;
        `;

        closeBtn.onclick = () => {
            document.body.removeChild(modal);
            URL.revokeObjectURL(imageUrl);
        };

        container.appendChild(title);
        container.appendChild(img);
        container.appendChild(closeBtn);
        modal.appendChild(container);

        modal.onclick = (e) => {
            if (e.target === modal) {
                closeBtn.click();
            }
        };

        document.body.appendChild(modal);
    }

    /**
     * 获取导出信息
     * @returns {Object} 导出信息
     */
    getExportInfo() {
        if (!this.editor.originalImage) {
            return null;
        }

        const originalWidth = this.editor.originalImage.naturalWidth;
        const originalHeight = this.editor.originalImage.naturalHeight;

        return {
            originalSize: {
                width: originalWidth,
                height: originalHeight,
                megapixels: ((originalWidth * originalHeight) / 1000000).toFixed(1)
            },
            availableScales: this.exportScales.map(scale => ({
                scale: scale,
                width: originalWidth * scale,
                height: originalHeight * scale,
                megapixels: ((originalWidth * originalHeight * scale * scale) / 1000000).toFixed(1),
                estimatedSize: this.estimateFileSize(originalWidth * scale, originalHeight * scale)
            })),
            currentScale: this.currentExportScale,
            stickerCount: this.editor.stickers.length,
            isExporting: this.isExporting
        };
    }

    /**
     * 估算文件大小
     * @param {number} width 宽度
     * @param {number} height 高度
     * @returns {string} 估算的文件大小
     */
    estimateFileSize(width, height) {
        // 简单的文件大小估算 (PNG格式)
        const pixels = width * height;
        const bytesPerPixel = 4; // RGBA
        const compressionRatio = 0.5; // PNG压缩比估算

        const bytes = pixels * bytesPerPixel * compressionRatio;
        return Utils.formatFileSize(bytes);
    }

    /**
     * 销毁导出管理器
     */
    destroy() {
        this.editor = null;
    }
}