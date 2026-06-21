const Categories = (function () {
    let onCategoryChange = null;

    function setChangeHandler(handler) {
        onCategoryChange = handler;
    }

    function renderCategoryList(container, selectedCategoryId, onSelect) {
        const categories = Storage.getCategories();
        container.innerHTML = '';

        categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'nav-item' + (selectedCategoryId === category.id ? ' active' : '');
            li.dataset.categoryId = category.id;

            const count = Storage.getNoteCountByCategory(category.id);

            li.innerHTML = `
                <span class="nav-icon" style="background:${category.color}20; width:22px; height:22px; border-radius:5px; display:inline-flex; align-items:center; justify-content:center; font-size:0;">
                    <span style="width:10px; height:10px; background:${category.color}; border-radius:3px; display:block;"></span>
                </span>
                <span class="nav-text">${escapeHtml(category.name)}</span>
                <span class="nav-count">${count}</span>
            `;

            li.addEventListener('click', () => {
                if (onSelect) onSelect(category.id);
            });

            li.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showCategoryContextMenu(e, category, onSelect);
            });

            container.appendChild(li);
        });
    }

    function renderCategorySelect(selectElement, selectedId) {
        const categories = Storage.getCategories();
        selectElement.innerHTML = '<option value="">请选择分类</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (selectedId === category.id) option.selected = true;
            selectElement.appendChild(option);
        });
    }

    function getCategoryColor(categoryId) {
        if (!categoryId) return '#94a3b8';
        const category = Storage.getCategoryById(categoryId);
        return category ? category.color : '#94a3b8';
    }

    function getCategoryName(categoryId) {
        if (!categoryId) return '未分类';
        const category = Storage.getCategoryById(categoryId);
        return category ? category.name : '未分类';
    }

    function showCategoryModal(onCreated) {
        const modal = document.getElementById('categoryModal');
        const nameInput = document.getElementById('categoryName');
        const colorPicker = document.getElementById('colorPicker');
        const saveBtn = document.getElementById('saveCategoryBtn');

        let selectedColor = '#6366f1';

        const options = colorPicker.querySelectorAll('.color-option');
        options.forEach(opt => {
            opt.classList.remove('active');
            if (opt.dataset.color === selectedColor) opt.classList.add('active');

            opt.onclick = () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                selectedColor = opt.dataset.color;
            };
        });

        nameInput.value = '';
        modal.classList.add('active');
        setTimeout(() => nameInput.focus(), 100);

        const close = () => modal.classList.remove('active');

        const saveHandler = () => {
            const name = nameInput.value.trim();
            if (!name) {
                Toast.show('请输入分类名称', 'error');
                nameInput.focus();
                return;
            }

            const categories = Storage.getCategories();
            if (categories.some(c => c.name === name)) {
                Toast.show('分类名称已存在', 'error');
                nameInput.focus();
                return;
            }

            const category = Storage.createCategory({ name, color: selectedColor });
            Toast.show('分类创建成功', 'success');
            close();
            if (onCreated) onCreated(category);
            if (onCategoryChange) onCategoryChange();

            saveBtn.removeEventListener('click', saveHandler);
        };

        saveBtn.addEventListener('click', saveHandler);
    }

    function showEditCategoryModal(category, onUpdated) {
        const modal = document.getElementById('categoryModal');
        const nameInput = document.getElementById('categoryName');
        const colorPicker = document.getElementById('colorPicker');
        const saveBtn = document.getElementById('saveCategoryBtn');

        modal.querySelector('.modal-header h3').textContent = '编辑分类';

        let selectedColor = category.color;

        const options = colorPicker.querySelectorAll('.color-option');
        options.forEach(opt => {
            opt.classList.remove('active');
            if (opt.dataset.color === selectedColor) opt.classList.add('active');

            opt.onclick = () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                selectedColor = opt.dataset.color;
            };
        });

        nameInput.value = category.name;
        modal.classList.add('active');
        setTimeout(() => nameInput.focus(), 100);

        const close = () => {
            modal.classList.remove('active');
            modal.querySelector('.modal-header h3').textContent = '新建分类';
        };

        const saveHandler = () => {
            const name = nameInput.value.trim();
            if (!name) {
                Toast.show('请输入分类名称', 'error');
                nameInput.focus();
                return;
            }

            const updated = Storage.updateCategory(category.id, { name, color: selectedColor });
            Toast.show('分类已更新', 'success');
            close();
            if (onUpdated) onUpdated(updated);
            if (onCategoryChange) onCategoryChange();

            saveBtn.removeEventListener('click', saveHandler);
        };

        saveBtn.addEventListener('click', saveHandler);
    }

    function showCategoryContextMenu(event, category, onSelect) {
        const existing = document.querySelector('.context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            z-index: 3000;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow-lg);
            padding: 4px;
            min-width: 140px;
            left: ${event.pageX}px;
            top: ${event.pageY}px;
        `;

        const items = [
            { label: '✏️  编辑分类', action: () => showEditCategoryModal(category) },
            { label: '🗑️  删除分类', danger: true, action: () => {
                if (confirm(`确定要删除分类「${category.name}」吗？该分类下的笔记将变为未分类。`)) {
                    Storage.deleteCategory(category.id);
                    Toast.show('分类已删除', 'success');
                    if (onSelect) onSelect(null);
                    if (onCategoryChange) onCategoryChange();
                }
            }}
        ];

        items.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = `
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                color: ${item.danger ? '#ef4444' : 'var(--text-secondary)'};
                transition: background 0.15s;
            `;
            div.textContent = item.label;
            div.addEventListener('mouseenter', () => {
                div.style.background = item.danger ? '#fef2f2' : 'var(--bg)';
            });
            div.addEventListener('mouseleave', () => {
                div.style.background = 'transparent';
            });
            div.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(div);
        });

        document.body.appendChild(menu);

        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (event.pageX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (event.pageY - rect.height) + 'px';
        }

        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return {
        setChangeHandler,
        renderCategoryList,
        renderCategorySelect,
        getCategoryColor,
        getCategoryName,
        showCategoryModal,
        showEditCategoryModal
    };
})();

const Toast = (function () {
    let timer = null;

    function show(message, type = 'info', duration = 2500) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        if (timer) {
            clearTimeout(timer);
            toast.classList.remove('show');
        }

        toast.textContent = message;
        toast.className = 'toast ' + type;

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        timer = setTimeout(() => {
            toast.classList.remove('show');
            timer = null;
        }, duration);
    }

    return { show };
})();
