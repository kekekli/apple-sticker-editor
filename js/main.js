/**
 * 主入口文件
 * 初始化应用程序并绑定所有事件处理
 */

class StickerEditor {
    constructor() {
        // 核心组件
        this.imageEditor = null;
        this.eventHandler = null;
        this.gestureHandler = null;
        this.exportManager = null;

        // UI元素
        this.elements = {};

        // 应用状态
        this.currentExportScale = 1;

        this.initialize();
    }

    /**
     * 初始化应用程序
     */
    initialize() {
        // 获取DOM元素
        this.getElements();

        // 初始化核心组件
        this.initializeCore();

        // 绑定事件处理器
        this.bindEvents();

        // 设置初始状态
        this.setupInitialState();

        console.log('贴纸编辑器初始化完成');
    }

    /**
     * 获取DOM元素引用
     */
    getElements() {
        this.elements = {
            // Canvas相关
            canvas: document.getElementById('editCanvas'),
            canvasContainer: document.getElementById('canvasContainer'),
            canvasPlaceholder: document.getElementById('canvasPlaceholder'),

            // 上传相关
            uploadArea: document.getElementById('uploadArea'),
            imageUpload: document.getElementById('imageUpload'),
            customStickerBtn: document.getElementById('customStickerBtn'),
            customStickerUpload: document.getElementById('customStickerUpload'),

            // 贴纸相关
            stickerGrid: document.getElementById('stickerGrid'),

            // 导出相关
            exportBtns: document.querySelectorAll('.export-btn'),
            downloadBtn: document.getElementById('downloadBtn'),

            // 工具栏
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),
            clearBtn: document.getElementById('clearBtn'),
            resetBtn: document.getElementById('resetBtn')
        };
    }

    /**
     * 初始化核心组件
     */
    initializeCore() {
        // 创建图片编辑器
        this.imageEditor = new ImageEditor('editCanvas', {
            maxDisplayWidth: 800,
            maxDisplayHeight: 600
        });

        // 创建事件处理器
        this.eventHandler = new EventHandler(this.elements.canvas, this.imageEditor);

        // 创建手势处理器（移动端）
        this.gestureHandler = new GestureHandler(this.elements.canvas, this.imageEditor);

        // 创建导出管理器
        this.exportManager = new ExportManager(this.imageEditor);

        // 添加Canvas悬停事件监听
        this.eventHandler.addHoverListeners();
    }

    /**
     * 绑定事件处理器
     */
    bindEvents() {
        // 图片上传事件
        this.bindUploadEvents();

        // 贴纸选择事件
        this.bindStickerEvents();

        // 导出相关事件
        this.bindExportEvents();

        // 工具栏事件
        this.bindToolbarEvents();

        // 键盘快捷键
        this.bindKeyboardEvents();
    }

    /**
     * 绑定上传相关事件
     */
    bindUploadEvents() {
        const { uploadArea, imageUpload, customStickerBtn, customStickerUpload } = this.elements;

        // 点击上传区域
        uploadArea.addEventListener('click', () => {
            imageUpload.click();
        });

        // 文件选择
        imageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.loadImage(file);
                e.target.value = ''; // 清空文件选择
            }
        });

        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    await this.loadImage(file);
                } else {
                    Utils.showToast('请上传图片文件', 'error');
                }
            }
        });

        // 自定义贴纸上传
        customStickerBtn.addEventListener('click', () => {
            customStickerUpload.click();
        });

        customStickerUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.addCustomSticker(file);
                e.target.value = '';
            }
        });
    }

    /**
     * 绑定贴纸相关事件
     */
    bindStickerEvents() {
        const { stickerGrid } = this.elements;

        // 贴纸点击事件
        stickerGrid.addEventListener('click', (e) => {
            const stickerItem = e.target.closest('.sticker-item');
            if (stickerItem && stickerItem.dataset.sticker) {
                this.addEmojiSticker(stickerItem.dataset.sticker);
            }
        });
    }

    /**
     * 绑定导出相关事件
     */
    bindExportEvents() {
        const { exportBtns, downloadBtn } = this.elements;

        // 导出分辨率选择
        exportBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除其他按钮的active类
                exportBtns.forEach(b => b.classList.remove('active'));

                // 添加当前按钮的active类
                btn.classList.add('active');

                // 更新导出分辨率
                this.currentExportScale = parseInt(btn.dataset.scale);
                this.exportManager.setExportScale(this.currentExportScale);
            });
        });

        // 下载按钮
        downloadBtn.addEventListener('click', async () => {
            if (!this.imageEditor.originalImage) {
                Utils.showToast('请先上传图片', 'error');
                return;
            }

            await this.exportManager.downloadImage(this.currentExportScale);
        });

        // 右键下载按钮显示更多选项
        downloadBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showExportOptions();
        });
    }

    /**
     * 绑定工具栏事件
     */
    bindToolbarEvents() {
        const { undoBtn, redoBtn, clearBtn, resetBtn } = this.elements;

        undoBtn.addEventListener('click', () => {
            this.imageEditor.undo();
            this.updateToolbarState();
        });

        redoBtn.addEventListener('click', () => {
            this.imageEditor.redo();
            this.updateToolbarState();
        });

        clearBtn.addEventListener('click', () => {
            if (this.imageEditor.stickers.length > 0) {
                if (confirm('确定要清除所有贴纸吗？')) {
                    this.imageEditor.clearStickers();
                    this.updateToolbarState();
                }
            }
        });

        resetBtn.addEventListener('click', () => {
            if (this.imageEditor.originalImage || this.imageEditor.stickers.length > 0) {
                if (confirm('确定要重置编辑器吗？所有内容将被清除。')) {
                    this.imageEditor.reset();
                    this.updateToolbarState();
                }
            }
        });
    }

    /**
     * 绑定键盘快捷键
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Z: 撤销
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.imageEditor.undo();
                this.updateToolbarState();
            }

            // Ctrl/Cmd + Shift + Z: 重做
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.imageEditor.redo();
                this.updateToolbarState();
            }

            // Ctrl/Cmd + S: 导出
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.imageEditor.originalImage) {
                    this.exportManager.downloadImage(this.currentExportScale);
                }
            }
        });
    }

    /**
     * 加载图片
     * @param {File} file 图片文件
     */
    async loadImage(file) {
        try {
            await this.imageEditor.loadImage(file);
            this.updateToolbarState();
        } catch (error) {
            console.error('图片加载失败:', error);
        }
    }

    /**
     * 添加Emoji贴纸
     * @param {string} emoji Emoji字符
     */
    addEmojiSticker(emoji) {
        const sticker = this.imageEditor.addSticker('emoji', emoji);
        if (sticker) {
            this.updateToolbarState();
        }
    }

    /**
     * 添加自定义贴纸
     * @param {File} file 图片文件
     */
    async addCustomSticker(file) {
        try {
            const validation = Utils.validateImageFile(file);
            if (!validation.valid) {
                Utils.showToast(validation.error, 'error');
                return;
            }

            const image = await Utils.loadImageFile(file);
            const sticker = this.imageEditor.addSticker('image', image);

            if (sticker) {
                this.updateToolbarState();
                Utils.showToast('自定义贴纸添加成功', 'success');
            }

        } catch (error) {
            console.error('自定义贴纸添加失败:', error);
            Utils.showToast('自定义贴纸添加失败', 'error');
        }
    }

    /**
     * 显示导出选项
     */
    showExportOptions() {
        const options = [
            { label: '预览导出效果', action: () => this.exportManager.previewExport(this.currentExportScale) },
            { label: '批量导出所有分辨率', action: () => this.exportManager.exportAllResolutions() },
            { label: '导出为JPEG', action: () => this.exportManager.downloadImage(this.currentExportScale, 'jpg', 0.9) },
            { label: '导出为WebP', action: () => this.exportManager.downloadImage(this.currentExportScale, 'webp', 0.9) }
        ];

        // 创建简单的选项菜单
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            padding: 8px 0;
            z-index: 1000;
            min-width: 200px;
        `;

        options.forEach(option => {
            const item = document.createElement('div');
            item.textContent = option.label;
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.2s;
            `;

            item.addEventListener('mouseenter', () => {
                item.style.background = '#f0f0f0';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });

            item.addEventListener('click', () => {
                option.action();
                document.body.removeChild(menu);
            });

            menu.appendChild(item);
        });

        // 定位菜单
        const rect = this.elements.downloadBtn.getBoundingClientRect();
        menu.style.left = rect.left + 'px';
        menu.style.top = (rect.top - menu.offsetHeight - 10) + 'px';

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                document.body.removeChild(menu);
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    /**
     * 更新工具栏状态
     */
    updateToolbarState() {
        const state = this.imageEditor.getState();

        // 更新撤销/重做按钮状态
        this.elements.undoBtn.style.opacity = state.canUndo ? '1' : '0.5';
        this.elements.redoBtn.style.opacity = state.canRedo ? '1' : '0.5';
        this.elements.undoBtn.disabled = !state.canUndo;
        this.elements.redoBtn.disabled = !state.canRedo;

        // 更新清除按钮状态
        this.elements.clearBtn.style.opacity = state.stickerCount > 0 ? '1' : '0.5';
        this.elements.clearBtn.disabled = state.stickerCount === 0;

        // 更新重置按钮状态
        const hasContent = state.hasImage || state.stickerCount > 0;
        this.elements.resetBtn.style.opacity = hasContent ? '1' : '0.5';
        this.elements.resetBtn.disabled = !hasContent;

        // 更新下载按钮状态
        this.elements.downloadBtn.disabled = !state.hasImage;
    }

    /**
     * 设置初始状态
     */
    setupInitialState() {
        this.updateToolbarState();

        // 显示使用提示
        Utils.showToast('欢迎使用贴纸编辑器！上传图片开始创作吧 🎨', 'info', 4000);
    }

    /**
     * 获取应用状态信息
     */
    getAppInfo() {
        return {
            version: '1.0.0',
            editor: this.imageEditor?.getState(),
            export: this.exportManager?.getExportInfo(),
            currentScale: this.currentExportScale
        };
    }

    /**
     * 销毁应用程序
     */
    destroy() {
        if (this.eventHandler) {
            this.eventHandler.destroy();
        }

        if (this.gestureHandler) {
            this.gestureHandler.destroy();
        }

        if (this.exportManager) {
            this.exportManager.destroy();
        }

        if (this.imageEditor) {
            this.imageEditor.destroy();
        }
    }
}

// 全局变量
let stickerEditor = null;

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    try {
        stickerEditor = new StickerEditor();

        // 将实例添加到全局作用域以便调试
        window.stickerEditor = stickerEditor;

    } catch (error) {
        console.error('应用初始化失败:', error);
        Utils.showToast('应用初始化失败，请刷新页面重试', 'error');
    }
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (stickerEditor) {
        stickerEditor.destroy();
    }
});

// 错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    Utils.showToast('发生错误，请刷新页面', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
    Utils.showToast('操作失败，请重试', 'error');
});