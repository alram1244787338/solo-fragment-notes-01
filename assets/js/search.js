const Search = (function () {
    let debounceTimer = null;

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function search(notes, keyword) {
        if (!keyword || !keyword.trim()) {
            return notes;
        }

        const kw = keyword.trim().toLowerCase();
        const keywords = kw.split(/\s+/).filter(k => k.length > 0);

        return notes.filter(note => {
            const searchFields = [
                note.title || '',
                note.content || '',
                (note.tags || []).join(' ')
            ].join(' ').toLowerCase();

            return keywords.every(k => searchFields.includes(k));
        });
    }

    function highlightText(text, keyword) {
        if (!text || !keyword || !keyword.trim()) {
            return escapeHtml(text || '');
        }

        const kw = keyword.trim();
        if (!kw) return escapeHtml(text || '');

        const escapedText = escapeHtml(text);
        const keywords = kw.split(/\s+/).filter(k => k.length > 0);
        let result = escapedText;

        keywords.forEach(k => {
            const escapedKeyword = escapeHtml(k);
            const safePattern = escapeRegExp(escapedKeyword);
            if (!safePattern) return;
            try {
                const regex = new RegExp(safePattern, 'gi');
                result = result.replace(regex, match => `<span class="highlight">${match}</span>`);
            } catch (e) {
                console.warn('Regex error in highlightText:', e);
            }
        });

        return result;
    }

    function setupSearch(input, onChange, debounceMs = 250) {
        const handler = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (onChange) onChange(input.value);
            }, debounceMs);
        };

        input.addEventListener('input', handler);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                input.value = '';
                handler();
                input.blur();
            }
        });

        return () => {
            input.removeEventListener('input', handler);
            clearTimeout(debounceTimer);
        };
    }

    function fuzzySearch(notes, keyword) {
        if (!keyword || !keyword.trim()) {
            return notes.map(n => ({ note: n, score: 0 }));
        }

        const kw = keyword.trim().toLowerCase();
        const results = [];

        notes.forEach(note => {
            let score = 0;
            const title = (note.title || '').toLowerCase();
            const content = (note.content || '').toLowerCase();
            const tags = (note.tags || []).join(' ').toLowerCase();

            if (title.includes(kw)) {
                score += 50;
                score += (kw.length / Math.max(title.length, 1)) * 30;
            }

            if (tags.includes(kw)) {
                score += 30;
            }

            if (content.includes(kw)) {
                score += 10;
                const occurrences = (content.match(new RegExp(escapeRegExp(kw), 'g')) || []).length;
                score += Math.min(occurrences, 5) * 5;
            }

            const titleWords = title.split(/\s+/);
            const kwWords = kw.split(/\s+/);
            kwWords.forEach(kwWord => {
                titleWords.forEach(tWord => {
                    if (tWord.startsWith(kwWord)) {
                        score += 15;
                    }
                });
            });

            if (score > 0) {
                results.push({ note, score });
            }
        });

        results.sort((a, b) => b.score - a.score);
        return results.map(r => r.note);
    }

    function getSearchSnippet(content, keyword, maxLength = 100) {
        if (!content || !keyword || !keyword.trim()) {
            return content ? content.substring(0, maxLength) : '';
        }

        const kw = keyword.trim().toLowerCase();
        const lowerContent = content.toLowerCase();
        const index = lowerContent.indexOf(kw);

        if (index === -1) {
            return content.substring(0, maxLength);
        }

        const halfLen = Math.floor(maxLength / 2);
        let start = Math.max(0, index - halfLen);
        let end = Math.min(content.length, index + kw.length + halfLen);

        if (start > 0 && start < 10) start = 0;
        if (end < content.length && content.length - end < 10) end = content.length;

        let snippet = content.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';

        return snippet;
    }

    return {
        search,
        fuzzySearch,
        highlightText,
        setupSearch,
        getSearchSnippet,
        escapeRegExp,
        escapeHtml
    };
})();
