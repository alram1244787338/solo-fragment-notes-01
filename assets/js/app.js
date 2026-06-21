(function () {
    const state = {
        currentView: 'list',
        selectedCategoryId: null,
        selectedNoteId: null,
        searchKeyword: '',
        sortType: 'updated_desc'
    };

    const THEME_KEY = 'fragment_theme';

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark', isDark);
        const iconLight = document.querySelector('.theme-icon-light');
        const iconDark = document.querySelector('.theme-icon-dark');
        const textEl = document.getElementById('themeToggleText');
        if (iconLight) iconLight.style.display = isDark ? 'none' : '';
        if (iconDark) iconDark.style.display = isDark ? '' : 'none';
        if (textEl) textEl.textContent = isDark ? '亮色模式' : '暗色模式';
    }

    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        applyTheme(theme);
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    }

    function exportData() {
        const data = Storage.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date();
        const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        a.href = url;
        a.download = `fragment-notes-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.show('数据已导出', 'success');
    }

    function importData(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                Confirm.show({
                    title: '导入数据',
                    message: '导入将覆盖当前所有笔记和分类，确定继续吗？',
                    okText: '覆盖导入',
                    icon: '📥',
                    danger: true,
                    onOk: () => {
                        const ok = Storage.importData(data);
                        if (ok) {
                            Toast.show('数据已导入', 'success');
                            state.selectedNoteId = null;
                            state.selectedCategoryId = null;
                            refreshAll();
                        } else {
                            Toast.show('导入失败，文件格式不正确', 'error');
                        }
                    }
                });
            } catch (err) {
                Toast.show('导入失败，无法解析文件', 'error');
            }
        };
        reader.onerror = () => {
            Toast.show('读取文件失败', 'error');
        };
        reader.readAsText(file);
    }

    function init() {
        initTheme();
        Storage.initDefaultCategories();
        setupEventListeners();
        Categories.setChangeHandler(refreshAll);
        refreshAll();
    }

    function setupEventListeners() {
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            Notes.showNoteModal((saved) => {
                state.selectedNoteId = saved.id;
                refreshAll();
            });
        });

        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            Categories.showCategoryModal(() => {
                refreshCategories();
            });
        });

        const viewNav = document.getElementById('viewNav');
        viewNav.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (state.currentView === view && state.selectedCategoryId === null) return;
                state.currentView = view;
                state.selectedCategoryId = null;
                viewNav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                refreshAll();
            });
        });

        Search.setupSearch(
            document.getElementById('searchInput'),
            (value) => {
                state.searchKeyword = value;
                refreshNotes();
                updateHeader();
            }
        );

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            state.sortType = e.target.value;
            refreshNotes();
        });

        document.getElementById('editNoteBtn').addEventListener('click', () => {
            if (state.selectedNoteId) {
                Notes.showNoteModal(() => {
                    refreshAll();
                }, state.selectedNoteId);
            }
        });

        document.getElementById('deleteNoteBtn').addEventListener('click', () => {
            if (state.selectedNoteId) {
                Notes.deleteNoteWithConfirm(state.selectedNoteId, () => {
                    state.selectedNoteId = null;
                    refreshAll();
                });
            }
        });

        document.querySelectorAll('[data-close="modal"]').forEach(el => {
            el.addEventListener('click', () => {
                const modal = el.closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        });

        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', toggleTheme);
        }

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportData);
        }

        const importBtn = document.getElementById('importBtn');
        const importInput = document.getElementById('importFileInput');
        if (importBtn && importInput) {
            importBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) importData(file);
                importInput.value = '';
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => {
                    m.classList.remove('active');
                });
                const ctx = document.querySelector('.context-menu');
                if (ctx) ctx.remove();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('newNoteBtn').click();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
        });
    }

    function refreshAll() {
        refreshCategories();
        refreshNotes();
        refreshDetail();
        updateCounts();
        updateHeader();
    }

    function refreshCategories() {
        const container = document.getElementById('categoryList');
        Categories.renderCategoryList(container, state.selectedCategoryId, (categoryId) => {
            state.selectedCategoryId = categoryId;
            state.selectedNoteId = null;
            refreshAll();
        });

        document.querySelectorAll('#viewNav .nav-item').forEach(item => {
            item.classList.remove('active');
        });
        if (!state.selectedCategoryId) {
            const activeItem = state.currentView === 'list'
                ? document.querySelector('#viewNav [data-view="list"]')
                : document.querySelector('#viewNav [data-view="timeline"]');
            if (activeItem) activeItem.classList.add('active');
        }
    }

    function getFilteredNotes() {
        let notes;
        if (state.selectedCategoryId) {
            notes = Storage.getNotesByCategory(state.selectedCategoryId);
        } else {
            notes = Storage.getNotes();
        }

        if (state.searchKeyword) {
            notes = Search.fuzzySearch(notes, state.searchKeyword);
        } else {
            notes = Notes.sortNotes(notes, state.sortType);
        }

        return notes;
    }

    function refreshNotes() {
        const notes = getFilteredNotes();
        const listView = document.getElementById('listView');
        const timelineView = document.getElementById('timelineView');
        const emptyState = document.getElementById('emptyState');

        listView.style.display = 'none';
        timelineView.style.display = 'none';
        emptyState.style.display = 'none';

        if (notes.length === 0) {
            emptyState.style.display = 'flex';
            if (state.searchKeyword) {
                emptyState.querySelector('h3').textContent = '没有找到匹配的笔记';
                emptyState.querySelector('p').textContent = `没有找到包含「${state.searchKeyword}」的笔记，换个关键词试试`;
            } else if (state.selectedCategoryId) {
                const catName = Categories.getCategoryName(state.selectedCategoryId);
                emptyState.querySelector('h3').textContent = '这个分类还没有笔记';
                emptyState.querySelector('p').textContent = `「${catName}」分类下还没有内容，点击新建笔记开始记录`;
            } else {
                emptyState.querySelector('h3').textContent = '还没有笔记';
                emptyState.querySelector('p').textContent = '点击左侧「新建笔记」按钮，开始记录你的碎片想法';
            }
            return;
        }

        const onClick = (noteId) => {
            state.selectedNoteId = noteId;
            refreshNotes();
            refreshDetail();
        };

        if (state.currentView === 'timeline' && !state.selectedCategoryId) {
            timelineView.style.display = 'block';
            Timeline.render(timelineView, notes, state.selectedNoteId, state.searchKeyword, onClick);
        } else {
            listView.style.display = 'flex';
            Notes.renderListView(listView, notes, state.selectedNoteId, state.searchKeyword, onClick);
        }

        if (!state.selectedNoteId && notes.length > 0) {
            state.selectedNoteId = notes[0].id;
            refreshNotes();
            refreshDetail();
        }
    }

    function refreshView() {
        refreshNotes();
    }

    function refreshDetail() {
        const panel = document.getElementById('detailPanel');
        Notes.renderDetail(panel, state.selectedNoteId);
    }

    function updateCounts() {
        const total = Storage.getNotes().length;
        const totalCountEl = document.getElementById('totalCount');
        if (totalCountEl) totalCountEl.textContent = total;
    }

    function updateHeader() {
        const titleEl = document.getElementById('viewTitle');
        const subtitleEl = document.getElementById('viewSubtitle');
        const notes = getFilteredNotes();

        let title = '全部笔记';
        if (state.selectedCategoryId) {
            title = Categories.getCategoryName(state.selectedCategoryId);
        } else if (state.currentView === 'timeline') {
            title = '时间线视图';
        }

        if (state.searchKeyword) {
            title = `搜索「${state.searchKeyword}」`;
        }

        titleEl.textContent = title;

        let subtitle = `共 ${notes.length} 条笔记`;
        if (state.searchKeyword) {
            const allCount = Storage.getNotes().length;
            subtitle = `找到 ${notes.length} 条匹配结果 / 共 ${allCount} 条`;
        } else if (state.selectedCategoryId) {
            const totalCount = Storage.getNotes().length;
            subtitle = `${notes.length} 条 / 全部 ${totalCount} 条`;
        } else if (state.currentView === 'timeline') {
            const uniqueDays = new Set(notes.map(n => Notes.formatDateKey(n.createdAt))).size;
            subtitle = `${notes.length} 条笔记，跨 ${uniqueDays} 天`;
        }

        subtitleEl.textContent = subtitle;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
