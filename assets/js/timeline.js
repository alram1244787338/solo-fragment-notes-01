const Timeline = (function () {
    function render(container, notes, selectedId, keyword, onClick) {
        if (!notes || notes.length === 0) {
            return false;
        }

        const groups = {};
        notes.forEach(note => {
            const dateKey = Notes.formatDateKey(note.createdAt);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(note);
        });

        const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

        container.innerHTML = '';

        dateKeys.forEach(dateKey => {
            const group = document.createElement('div');
            group.className = 'timeline-group';

            const label = Notes.getDateLabel(dateKey);
            const dayNotes = groups[dateKey];
            const count = dayNotes.length;

            const header = document.createElement('div');
            header.className = 'timeline-date-header';
            header.innerHTML = `
                <span class="timeline-dot"></span>
                <div>
                    <span class="timeline-date">${label.main}</span>
                    <span class="timeline-date-sub"> · ${label.sub} · ${count} 条</span>
                </div>
            `;
            group.appendChild(header);

            const items = document.createElement('div');
            items.className = 'timeline-items';

            const sortedDayNotes = [...dayNotes].sort((a, b) => b.createdAt - a.createdAt);

            sortedDayNotes.forEach(note => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.dataset.noteId = note.id;
                if (selectedId === note.id) {
                    item.style.borderColor = 'var(--primary)';
                    item.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.08)';
                }

                const categoryColor = Categories.getCategoryColor(note.categoryId);
                const categoryName = Categories.getCategoryName(note.categoryId);
                const timeOfDay = Notes.formatTimeOfDay(note.createdAt);

                const title = keyword
                    ? Search.highlightText(note.title || '(无标题)', keyword)
                    : escapeHtml(note.title || '(无标题)');

                const previewContent = keyword
                    ? Search.getSearchSnippet(note.content, keyword, 100)
                    : (note.content || '').substring(0, 100);

                const preview = keyword
                    ? Search.highlightText(previewContent, keyword)
                    : escapeHtml(previewContent);

                item.innerHTML = `
                    <div class="timeline-item-time">
                        ${timeOfDay}
                        <span class="timeline-item-cat" style="background:${categoryColor}">${escapeHtml(categoryName)}</span>
                    </div>
                    <div class="timeline-item-title">${title}</div>
                    <div class="timeline-item-preview">${preview}${note.content && note.content.length > 100 ? '...' : ''}</div>
                `;

                item.addEventListener('click', () => {
                    if (onClick) onClick(note.id);
                });

                items.appendChild(item);
            });

            group.appendChild(items);
            container.appendChild(group);
        });

        return true;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return {
        render
    };
})();
