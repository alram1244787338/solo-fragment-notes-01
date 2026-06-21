const Storage = (function () {
    const NOTES_KEY = 'fragment_notes';
    const CATEGORIES_KEY = 'fragment_categories';

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function read(key, defaultValue) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            console.error('Storage read error:', e);
            return defaultValue;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage write error:', e);
            return false;
        }
    }

    function getNotes() {
        return read(NOTES_KEY, []);
    }

    function saveNotes(notes) {
        return write(NOTES_KEY, notes);
    }

    function getNoteById(id) {
        const notes = getNotes();
        return notes.find(n => n.id === id) || null;
    }

    function createNote(data) {
        const notes = getNotes();
        const now = Date.now();
        const note = {
            id: generateId(),
            title: data.title,
            content: data.content,
            categoryId: data.categoryId,
            tags: Array.isArray(data.tags) ? data.tags : [],
            createdAt: now,
            updatedAt: now
        };
        notes.unshift(note);
        saveNotes(notes);
        return note;
    }

    function updateNote(id, data) {
        const notes = getNotes();
        const index = notes.findIndex(n => n.id === id);
        if (index === -1) return null;

        notes[index] = {
            ...notes[index],
            title: data.title !== undefined ? data.title : notes[index].title,
            content: data.content !== undefined ? data.content : notes[index].content,
            categoryId: data.categoryId !== undefined ? data.categoryId : notes[index].categoryId,
            tags: data.tags !== undefined ? data.tags : notes[index].tags,
            updatedAt: Date.now()
        };
        saveNotes(notes);
        return notes[index];
    }

    function deleteNote(id) {
        const notes = getNotes();
        const filtered = notes.filter(n => n.id !== id);
        if (filtered.length === notes.length) return false;
        saveNotes(filtered);
        return true;
    }

    function getCategories() {
        return read(CATEGORIES_KEY, []);
    }

    function saveCategories(categories) {
        return write(CATEGORIES_KEY, categories);
    }

    function getCategoryById(id) {
        const categories = getCategories();
        return categories.find(c => c.id === id) || null;
    }

    function createCategory(data) {
        const categories = getCategories();
        const category = {
            id: generateId(),
            name: data.name,
            color: data.color || '#6366f1',
            createdAt: Date.now()
        };
        categories.push(category);
        saveCategories(categories);
        return category;
    }

    function updateCategory(id, data) {
        const categories = getCategories();
        const index = categories.findIndex(c => c.id === id);
        if (index === -1) return null;

        categories[index] = {
            ...categories[index],
            name: data.name !== undefined ? data.name : categories[index].name,
            color: data.color !== undefined ? data.color : categories[index].color
        };
        saveCategories(categories);
        return categories[index];
    }

    function deleteCategory(id) {
        const categories = getCategories();
        const filtered = categories.filter(c => c.id !== id);
        if (filtered.length === categories.length) return false;
        saveCategories(filtered);

        const notes = getNotes();
        const updatedNotes = notes.map(n => {
            if (n.categoryId === id) {
                return { ...n, categoryId: null, updatedAt: Date.now() };
            }
            return n;
        });
        saveNotes(updatedNotes);
        return true;
    }

    function getNotesByCategory(categoryId) {
        const notes = getNotes();
        if (categoryId === null || categoryId === undefined) {
            return notes;
        }
        return notes.filter(n => n.categoryId === categoryId);
    }

    function getNoteCountByCategory(categoryId) {
        return getNotesByCategory(categoryId).length;
    }

    function initDefaultCategories() {
        const categories = getCategories();
        if (categories.length > 0) return;

        const defaults = [
            { name: '工作项目', color: '#6366f1' },
            { name: '待办事项', color: '#ef4444' },
            { name: '灵感记录', color: '#22c55e' },
            { name: '学习笔记', color: '#3b82f6' },
            { name: '生活备忘', color: '#f97316' }
        ];

        const created = defaults.map(d => createCategory(d));
        return created;
    }

    function exportData() {
        const data = {
            notes: getNotes(),
            categories: getCategories(),
            exportedAt: Date.now(),
            version: '1.0'
        };
        return data;
    }

    function isValidNote(note) {
        if (!note || typeof note !== 'object') return false;
        if (typeof note.id !== 'string' || !note.id) return false;
        if (typeof note.title !== 'string') return false;
        if (typeof note.content !== 'string') return false;
        if (note.categoryId !== null && typeof note.categoryId !== 'string') return false;
        if (!Array.isArray(note.tags)) return false;
        if (typeof note.createdAt !== 'number' || typeof note.updatedAt !== 'number') return false;
        return true;
    }

    function isValidCategory(cat) {
        if (!cat || typeof cat !== 'object') return false;
        if (typeof cat.id !== 'string' || !cat.id) return false;
        if (typeof cat.name !== 'string' || !cat.name) return false;
        if (typeof cat.color !== 'string' || !cat.color) return false;
        if (typeof cat.createdAt !== 'number') return false;
        return true;
    }

    function importData(data) {
        if (!data || typeof data !== 'object') return false;

        let imported = false;

        if (Array.isArray(data.notes)) {
            const validNotes = data.notes.filter(isValidNote);
            if (validNotes.length > 0 || data.notes.length === 0) {
                saveNotes(data.notes);
                imported = true;
            }
        }

        if (Array.isArray(data.categories)) {
            const validCats = data.categories.filter(isValidCategory);
            if (validCats.length > 0 || data.categories.length === 0) {
                saveCategories(data.categories);
                imported = true;
            }
        }

        return imported;
    }

    return {
        generateId,
        getNotes,
        saveNotes,
        getNoteById,
        createNote,
        updateNote,
        deleteNote,
        getCategories,
        saveCategories,
        getCategoryById,
        createCategory,
        updateCategory,
        deleteCategory,
        getNotesByCategory,
        getNoteCountByCategory,
        initDefaultCategories,
        exportData,
        importData
    };
})();
