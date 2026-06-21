const Notes = (function () {
    function sortNotes(notes, sortType) {
        const sorted = [...notes];
        switch (sortType) {
            case 'updated_asc':
                sorted.sort((a, b) => a.updatedAt - b.updatedAt);
                break;
            case 'updated_desc':
                sorted.sort((a, b) => b.updatedAt - a.updatedAt);
                break;
            case 'created_asc':
                sorted.sort((a, b) => a.createdAt - b.createdAt);
                break;
            case 'created_desc':
                sorted.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'title_asc':
                sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'));
                break;
            default:
                sorted.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return sorted;
    }

    function renderListView(container, notes, selectedId, keyword, onClick) {
        if (!notes || notes.length === 0) {
            return false;
        }

        container.innerHTML = '';

        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card' + (selectedId === note.id ? ' active' : '');
            card.dataset.noteId = note.id;

            const categoryColor = Categories.getCategoryColor(note.categoryId);
            const categoryName = Categories.getCategoryName(note.categoryId);

            const preview = keyword
                ? Search.getSearchSnippet(note.content, keyword, 120)
                : (note.content || '').substring(0, 120);

            const displayTitle = keyword
                ? Search.highlightText(note.title || '(无标题)', keyword)
                : escapeHtml(note.title || '(无标题)');

            const displayPreview = keyword
                ? Search.highlightText(preview, keyword)
                : escapeHtml(preview);

            const tagsHtml = (note.tags && note.tags.length > 0)
                ? note.tags.slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
                : '';

            card.innerHTML = `
                <div class="note-card-header">
                    <div class="note-card-title">${displayTitle}</div>
                    <span class="note-card-category" style="background:${categoryColor}">${escapeHtml(categoryName)}</span>
                </div>
                <div class="note-card-preview">${displayPreview}${note.content && note.content.length > 120 ? '...' : ''}</div>
                <div class="note-card-footer">
                    <span class="note-card-time">${formatRelativeTime(note.updatedAt)}</span>
                    <div class="note-card-tags">${tagsHtml}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                if (onClick) onClick(note.id);
            });

            container.appendChild(card);
        });

        return true;
    }

    function renderDetail(panel, noteId) {
        const emptyEl = panel.querySelector('#detailEmpty');
        const contentEl = panel.querySelector('#detailContent');

        if (!noteId) {
            emptyEl.style.display = 'flex';
            contentEl.style.display = 'none';
            return;
        }

        const note = Storage.getNoteById(noteId);
        if (!note) {
            emptyEl.style.display = 'flex';
            contentEl.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        contentEl.style.display = 'block';

        const categoryColor = Categories.getCategoryColor(note.categoryId);
        const categoryName = Categories.getCategoryName(note.categoryId);

        panel.querySelector('#detailCategory').textContent = categoryName;
        panel.querySelector('#detailCategory').style.background = categoryColor;
        panel.querySelector('#detailTitle').textContent = note.title || '(无标题)';
        panel.querySelector('#detailBody').textContent = note.content || '';

        const timeEl = panel.querySelector('#detailTime');
        const createdStr = formatFullTime(note.createdAt);
        const updatedStr = formatFullTime(note.updatedAt);
        if (note.createdAt === note.updatedAt) {
            timeEl.textContent = `创建于 ${createdStr}`;
        } else {
            timeEl.textContent = `创建于 ${createdStr} · 更新于 ${formatRelativeTime(note.updatedAt)}`;
            timeEl.title = `创建于 ${createdStr}\n更新于 ${updatedStr}`;
        }

        const tagsContainer = panel.querySelector('#detailTags');
        tagsContainer.innerHTML = '';
        if (note.tags && note.tags.length > 0) {
            note.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = tag;
                tagsContainer.appendChild(span);
            });
        }
    }

    function showNoteModal(onSaved, noteId) {
        const modal = document.getElementById('noteModal');
        const form = document.getElementById('noteForm');
        const idInput = document.getElementById('noteId');
        const titleInput = document.getElementById('noteTitle');
        const contentInput = document.getElementById('noteContent');
        const categorySelect = document.getElementById('noteCategory');
        const tagsInput = document.getElementById('noteTags');
        const saveBtn = document.getElementById('saveNoteBtn');
        const modalTitle = document.getElementById('modalTitle');

        const isEdit = !!noteId;
        modalTitle.textContent = isEdit ? '编辑笔记' : '新建笔记';

        Categories.renderCategorySelect(categorySelect);

        if (isEdit) {
            const note = Storage.getNoteById(noteId);
            if (note) {
                idInput.value = note.id;
                titleInput.value = note.title || '';
                contentInput.value = note.content || '';
                categorySelect.value = note.categoryId || '';
                tagsInput.value = (note.tags || []).join(', ');
            }
        } else {
            form.reset();
            idInput.value = '';
        }

        modal.classList.add('active');
        setTimeout(() => titleInput.focus(), 100);

        const close = () => {
            modal.classList.remove('active');
        };

        const saveHandler = () => {
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();
            const categoryId = categorySelect.value || null;
            const tagsRaw = tagsInput.value;
            const tags = tagsRaw
                ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(t => t.length > 0)
                : [];

            if (!title && !content) {
                Toast.show('标题和内容不能都为空', 'error');
                return;
            }

            const finalTitle = title || content.substring(0, 20) || '未命名笔记';

            let saved;
            if (isEdit) {
                saved = Storage.updateNote(noteId, {
                    title: finalTitle,
                    content,
                    categoryId,
                    tags
                });
                Toast.show('笔记已更新', 'success');
            } else {
                saved = Storage.createNote({
                    title: finalTitle,
                    content,
                    categoryId,
                    tags
                });
                Toast.show('笔记已创建', 'success');
            }

            close();
            if (onSaved) onSaved(saved);
        };

        saveBtn.onclick = saveHandler;

        form.onsubmit = (e) => {
            e.preventDefault();
            saveHandler();
        };
    }

    function deleteNoteWithConfirm(noteId, onDeleted) {
        const note = Storage.getNoteById(noteId);
        if (!note) return;

        const title = note.title || '(无标题)';
        Confirm.show({
            title: '删除笔记',
            message: `确定要删除笔记「${title}」吗？此操作不可撤销。`,
            okText: '删除',
            icon: '🗑️',
            danger: true,
            onOk: () => {
                Storage.deleteNote(noteId);
                Toast.show('笔记已删除', 'success');
                if (onDeleted) onDeleted(noteId);
            }
        });
    }

    function formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        const now = Date.now();
        const diff = now - timestamp;
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;

        if (diff < minute) return '刚刚';
        if (diff < hour) return Math.floor(diff / minute) + ' 分钟前';
        if (diff < day) return Math.floor(diff / hour) + ' 小时前';
        if (diff < week) return Math.floor(diff / day) + ' 天前';

        const date = new Date(timestamp);
        const thisYear = new Date().getFullYear();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayNum = String(date.getDate()).padStart(2, '0');

        if (year === thisYear) {
            return `${month}-${dayNum}`;
        }
        return `${year}-${month}-${dayNum}`;
    }

    function formatFullTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    function formatDateKey(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatTimeOfDay(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function getDateLabel(dateKey) {
        if (!dateKey) return '';
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const target = new Date(year, month - 1, day);

        const diffDays = Math.floor((today - target) / (24 * 60 * 60 * 1000));

        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];

        if (diffDays === 0) {
            return { main: '今天', sub: `${month}月${day}日 · ${weekday}` };
        } else if (diffDays === 1) {
            return { main: '昨天', sub: `${month}月${day}日 · ${weekday}` };
        } else if (diffDays < 7) {
            return { main: `${diffDays} 天前`, sub: `${month}月${day}日 · ${weekday}` };
        } else {
            const isThisYear = year === today.getFullYear();
            if (isThisYear) {
                return { main: `${month}月${day}日`, sub: `${weekday}` };
            } else {
                return { main: `${year}年${month}月${day}日`, sub: `${weekday}` };
            }
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return {
        sortNotes,
        renderListView,
        renderDetail,
        showNoteModal,
        deleteNoteWithConfirm,
        formatRelativeTime,
        formatFullTime,
        formatDateKey,
        formatTimeOfDay,
        getDateLabel
    };
})();
