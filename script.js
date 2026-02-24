document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const editor = document.getElementById('editor');
    const lineNumbers = document.getElementById('lineNumbers');
    const lineNumbersContainer = document.querySelector('.line-numbers-container');
    const wordCountEl = document.getElementById('wordCount');
    const charCountEl = document.getElementById('charCount');
    const lineCountEl = document.getElementById('lineCount');
    const saveStatusEl = document.getElementById('saveStatus');

    // Toolbar Buttons
    const newBtn = document.getElementById('newBtn');
    const openBtn = document.getElementById('openBtn');
    const saveBtn = document.getElementById('saveBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    const fileInput = document.getElementById('file-input');

    // Tabs
    const tabsContainer = document.getElementById('tabsContainer');
    const newTabBtn = document.getElementById('newTabBtn');
    const tabsScrollWrapper = document.querySelector('.tabs-scroll-wrapper');

    // Search Bar
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    const replaceInput = document.getElementById('replaceInput');
    const findNextBtn = document.getElementById('findNextBtn');
    const replaceBtn = document.getElementById('replaceBtn');
    const replaceAllBtn = document.getElementById('replaceAllBtn');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const searchStats = document.getElementById('searchStats');

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const wordWrapToggle = document.getElementById('wordWrapToggle');
    let spellCheckToggle = document.getElementById('spellCheckToggle');
    let powerSavingToggle = document.getElementById('powerSavingToggle');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // About Modal
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutBtn = document.getElementById('closeAboutBtn');

    // Language Modal
    const langBtn = document.getElementById('langBtn');
    const langModal = document.getElementById('langModal');
    const closeLangBtn = document.getElementById('closeLangBtn');

    // --- State Variables ---
    let saveTimeout;
    const AUTOSAVE_DELAY = 1000;
    const STORAGE_PREFIX = 'notepad_v2_';
    const TABS_KEY = 'notepad_v2_tabs';
    const TAB_TITLE_MAX_LENGTH = 20;
    const WRAP_MEASURE_LINE_LIMIT = 2000;
    let tabs = [];
    let activeTabId = null;
    let refreshFrameId = null;
    let lastRenderedLineCount = -1;
    let lastRenderWrapMode = null;
    let lastActiveLineIndex = -1;
    let lineMeasureMirror = null;

    // Settings State
    let settings = {
        theme: 'system', // system, light, dark
        fontSize: 16,
        wordWrap: true,
        spellCheck: false,
        powerSaving: false
    };

    // --- Initialization ---
    // Keep the "+" button fixed at the end of the tab bar (outside horizontal scrolling content).
    if (tabsScrollWrapper && newTabBtn && newTabBtn.parentElement === tabsContainer) {
        tabsScrollWrapper.appendChild(newTabBtn);
    }
    ensureSpellCheckToggle();
    localizeSpellCheckToggleLabel();
    ensurePowerSavingToggle();
    localizePowerSavingToggleLabel();
    loadSettings();
    applySettings();
    initTabs();

    // --- Event Listeners ---

    // Editor Interaction
    editor.addEventListener('input', () => {
        requestUiRefresh();
        scheduleAutosave();
        updateSaveStatus(window.i18n ? window.i18n.unsaved : 'Unsaved');
    });

    editor.addEventListener('scroll', () => {
        if (lineNumbersContainer) {
            lineNumbersContainer.scrollTop = editor.scrollTop;
        }
    });

    editor.addEventListener('keydown', (e) => {
        // Tab support
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + '\t' + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 1;
            requestUiRefresh();
        }

        // Shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') {
                e.preventDefault();
                saveToFile();
            } else if (e.key === 'f') {
                e.preventDefault();
                toggleSearchBar();
            } else if (e.key === 'p') {
                e.preventDefault();
                exportToPDF();
            }
        }
    });

    // Toolbar Actions
    newBtn.addEventListener('click', () => {
        if (confirm('Clear current document?')) {
            editor.value = '';
            requestUiRefresh();
            scheduleAutosave();
        }
    });

    openBtn.addEventListener('click', () => fileInput.click());
    saveBtn.addEventListener('click', saveToFile);
    downloadPdfBtn.addEventListener('click', exportToPDF);
    searchToggleBtn.addEventListener('click', toggleSearchBar);

    fileInput.addEventListener('change', handleFileOpen);

    // Search Actions
    closeSearchBtn.addEventListener('click', () => searchBar.classList.remove('active'));
    findNextBtn.addEventListener('click', findNext);
    replaceBtn.addEventListener('click', replaceCurrent);
    replaceAllBtn.addEventListener('click', replaceAll);

    // Settings Actions
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('active');
    });

    // About Actions
    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => aboutModal.classList.add('active'));
    }
    if (closeAboutBtn) {
        closeAboutBtn.addEventListener('click', () => aboutModal.classList.remove('active'));
    }
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) aboutModal.classList.remove('active');
        });
    }

    // Language Actions
    if (langBtn) {
        langBtn.addEventListener('click', () => langModal.classList.add('active'));
    }
    if (closeLangBtn) {
        closeLangBtn.addEventListener('click', () => langModal.classList.remove('active'));
    }
    if (langModal) {
        langModal.addEventListener('click', (e) => {
            if (e.target === langModal) langModal.classList.remove('active');
        });
    }

    fontSizeSlider.addEventListener('input', (e) => {
        settings.fontSize = parseInt(e.target.value);
        fontSizeDisplay.textContent = settings.fontSize + 'px';
        saveSettings();
        applySettings();
    });

    wordWrapToggle.addEventListener('change', (e) => {
        settings.wordWrap = e.target.checked;
        saveSettings();
        applySettings();
    });

    if (spellCheckToggle) {
        spellCheckToggle.addEventListener('change', (e) => {
            settings.spellCheck = e.target.checked;
            saveSettings();
            applySettings();
        });
    }
    if (powerSavingToggle) {
        powerSavingToggle.addEventListener('change', (e) => {
            settings.powerSaving = e.target.checked;
            saveSettings();
            applySettings();
        });
    }

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            settings.theme = btn.dataset.theme;

            // Update UI classes
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            saveSettings();
            applySettings();
        });
    });

    // Tab Actions
    newTabBtn.addEventListener('click', () => createNewTab());
    tabsContainer.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            tabsContainer.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    }, { passive: false });

    // Selection Change for Line Numbers
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === editor) {
            updateActiveLine();
        }
    });

    // Window Resize
    window.addEventListener('resize', () => {
        if (settings.wordWrap) {
            resetLineNumberRenderCache();
            requestUiRefresh();
        }
    });

    // --- Functions: Core Logic ---

    function updateSaveStatus(status) {
        saveStatusEl.textContent = status;
        const savedText = window.i18n ? window.i18n.saved : 'Saved';
        if (status === savedText) {
            saveStatusEl.style.opacity = '0.7';
        } else {
            saveStatusEl.style.opacity = '1';
        }
    }

    function scheduleAutosave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveTabContent();
            updateSaveStatus(window.i18n ? window.i18n.saved : 'Saved');
        }, AUTOSAVE_DELAY);
    }

    function requestUiRefresh() {
        if (refreshFrameId !== null) return;
        refreshFrameId = window.requestAnimationFrame(() => {
            refreshFrameId = null;
            updateStats();
            updateLineNumbers();
        });
    }

    function resetLineNumberRenderCache() {
        lastRenderedLineCount = -1;
        lastRenderWrapMode = null;
        lastActiveLineIndex = -1;
    }

    function countLines(text) {
        let lines = 1;
        for (let i = 0; i < text.length; i++) {
            if (text.charCodeAt(i) === 10) lines++;
        }
        return lines;
    }

    // --- Functions: Search & Replace ---
    let lastSearchIndex = -1;

    function toggleSearchBar() {
        searchBar.classList.toggle('active');
        if (searchBar.classList.contains('active')) {
            searchInput.focus();
        }
    }

    function findNext() {
        const query = searchInput.value;
        if (!query) return;

        const content = editor.value;
        let searchIndex = content.indexOf(query, lastSearchIndex + 1);

        if (searchIndex === -1) {
            searchIndex = content.indexOf(query, 0);
        }

        if (searchIndex !== -1) {
            editor.focus();
            editor.setSelectionRange(searchIndex, searchIndex + query.length);
            lastSearchIndex = searchIndex;
            searchStats.textContent = 'Found';
        } else {
            searchStats.textContent = 'Not found';
        }
    }

    function replaceCurrent() {
        const query = searchInput.value;
        const replacement = replaceInput.value;

        if (!query) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);

        if (selectedText === query) {
            editor.setRangeText(replacement, start, end, 'select');
            requestUiRefresh();
            findNext();
        } else {
            findNext();
        }
    }

    function replaceAll() {
        const query = searchInput.value;
        const replacement = replaceInput.value;
        if (!query) return;

        const regex = new RegExp(escapeRegExp(query), 'g');
        const matchCount = (editor.value.match(regex) || []).length;

        editor.value = editor.value.replace(regex, replacement);
        requestUiRefresh();
        searchStats.textContent = `Replaced ${matchCount} occurrence(s)`;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // --- Functions: Settings ---

    function loadSettings() {
        const saved = localStorage.getItem(STORAGE_PREFIX + 'settings');
        if (saved) {
            settings = { ...settings, ...JSON.parse(saved) };
        }

        // Update UI
        fontSizeSlider.value = settings.fontSize;
        fontSizeDisplay.textContent = settings.fontSize + 'px';
        wordWrapToggle.checked = settings.wordWrap;
        if (spellCheckToggle) {
            spellCheckToggle.checked = settings.spellCheck;
        }
        if (powerSavingToggle) {
            powerSavingToggle.checked = !!settings.powerSaving;
        }

        themeBtns.forEach(btn => {
            if (btn.dataset.theme === settings.theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function saveSettings() {
        localStorage.setItem(STORAGE_PREFIX + 'settings', JSON.stringify(settings));
    }

    function applySettings() {
        // Font Size
        document.documentElement.style.setProperty('--font-editor-size', settings.fontSize + 'px');
        editor.style.fontSize = settings.fontSize + 'px';

        // Word Wrap
        editor.style.whiteSpace = settings.wordWrap ? 'pre-wrap' : 'pre';
        editor.style.overflowX = settings.wordWrap ? 'hidden' : 'auto';

        // Spell Check
        editor.spellcheck = !!settings.spellCheck;
        // Keep spellchecker dictionary aligned with current localized route.
        editor.setAttribute('lang', getEditorLanguage());

        // Theme
        const body = document.body;
        body.classList.remove('light-mode', 'dark-mode');
        body.classList.toggle('power-saving', !!settings.powerSaving);

        if (settings.theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                body.classList.add('dark-mode');
            } else {
                body.classList.add('light-mode');
            }
        } else {
            body.classList.add(settings.theme + '-mode');
        }

        resetLineNumberRenderCache();
        requestUiRefresh();
    }

    function getEditorLanguage() {
        const routeLang = (document.documentElement.getAttribute('lang') || '').trim();
        if (routeLang) return routeLang;

        const htmlLang = (navigator.language || '').trim();
        return htmlLang || 'en';
    }

    function ensureSpellCheckToggle() {
        if (spellCheckToggle || !settingsModal) return;

        const modalBody = settingsModal.querySelector('.modal-body');
        if (!modalBody) return;

        const row = document.createElement('div');
        row.className = 'setting-group row';

        const label = document.createElement('label');
        label.setAttribute('for', 'spellCheckToggle');
        label.textContent = getSpellCheckLabel();

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'spellCheckToggle';

        row.appendChild(label);
        row.appendChild(input);

        const wordWrapRow = wordWrapToggle ? wordWrapToggle.closest('.setting-group.row') : null;
        if (wordWrapRow) {
            wordWrapRow.insertAdjacentElement('afterend', row);
        } else {
            modalBody.appendChild(row);
        }

        spellCheckToggle = input;
    }

    function localizeSpellCheckToggleLabel() {
        const label = document.querySelector('label[for="spellCheckToggle"]');
        if (label) {
            label.textContent = getSpellCheckLabel();
        }
    }

    function ensurePowerSavingToggle() {
        if (powerSavingToggle || !settingsModal) return;

        const modalBody = settingsModal.querySelector('.modal-body');
        if (!modalBody) return;

        const row = document.createElement('div');
        row.className = 'setting-group row';

        const label = document.createElement('label');
        label.setAttribute('for', 'powerSavingToggle');
        label.textContent = getPowerSavingLabel();

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'powerSavingToggle';

        row.appendChild(label);
        row.appendChild(input);

        const spellCheckRow = spellCheckToggle ? spellCheckToggle.closest('.setting-group.row') : null;
        if (spellCheckRow) {
            spellCheckRow.insertAdjacentElement('afterend', row);
        } else {
            modalBody.appendChild(row);
        }

        powerSavingToggle = input;
    }

    function localizePowerSavingToggleLabel() {
        const label = document.querySelector('label[for="powerSavingToggle"]');
        if (label) {
            label.textContent = getPowerSavingLabel();
        }
    }

    function getSpellCheckLabel() {
        if (window.i18n && window.i18n.spellCheck) return window.i18n.spellCheck;

        const lang = getEditorLanguage().toLowerCase();
        const base = lang.split('-')[0];
        const labels = {
            ar: 'التدقيق الإملائي',
            bn: 'বানান পরীক্ষা',
            cs: 'Kontrola pravopisu',
            da: 'Stavekontrol',
            de: 'Rechtschreibprüfung',
            el: 'Ορθογραφικός έλεγχος',
            en: 'Spell Check',
            es: 'Corrector ortográfico',
            fi: 'Oikoluku',
            fr: 'Correcteur orthographique',
            gu: 'જોડણી તપાસ',
            he: 'בדיקת איות',
            hi: 'वर्तनी जांच',
            id: 'Pemeriksa ejaan',
            it: 'Controllo ortografico',
            ja: 'スペルチェック',
            kn: 'ಅಕ್ಷರದೋಷ ಪರಿಶೀಲನೆ',
            ko: '맞춤법 검사',
            ml: 'അക്ഷരപ്പിശക് പരിശോധന',
            mr: 'शब्दलेखन तपासणी',
            ms: 'Semakan ejaan',
            nl: 'Spellingscontrole',
            no: 'Stavekontroll',
            pa: 'ਸ਼ਬਦ-ਜੋੜ ਜਾਂਚ',
            pl: 'Sprawdzanie pisowni',
            pt: 'Corretor ortográfico',
            ro: 'Verificare ortografică',
            ru: 'Проверка орфографии',
            sv: 'Stavningskontroll',
            ta: 'எழுத்துப்பிழை சரிபார்ப்பு',
            te: 'స్పెల్లింగ్ తనిఖీ',
            th: 'ตรวจตัวสะกด',
            tr: 'Yazım denetimi',
            uk: 'Перевірка орфографії',
            ur: 'املا کی جانچ',
            vi: 'Kiểm tra chính tả',
            zh: '拼写检查'
        };

        return labels[base] || 'Spell Check';
    }

    function getPowerSavingLabel() {
        return (window.i18n && window.i18n.powerSaving) ? window.i18n.powerSaving : 'Power Saving Mode';
    }

    // --- Functions: Tabs ---

    function initTabs() {
        const savedTabs = localStorage.getItem(TABS_KEY);
        if (savedTabs) {
            try {
                tabs = JSON.parse(savedTabs);
            } catch (e) { tabs = []; }
        }

        if (tabs.length === 0) {
            createNewTab('Untitled', true);
        } else {
            tabs.forEach(tab => renderTab(tab));
            setActiveTab(tabs[0].id);
        }
    }

    function createNewTab(title = 'Untitled', isFirst = false) {
        const id = 'tab_' + Date.now();
        const tab = { id, title, content: '' };
        tabs.push(tab);
        renderTab(tab);
        setActiveTab(id);
        saveTabs();

        if (!isFirst) {
            editor.value = '';
            editor.focus();
        }
    }

    function renderTab(tab) {
        const el = document.createElement('div');
        el.className = 'tab';
        el.dataset.id = tab.id;
        el.innerHTML = `
            <span class="tab-title tab-label">${tab.title}</span>
            <span class="tab-close tab-icon-wrapper" aria-label="Close tab" title="Close tab">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>
            </span>
        `;

        el.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close') && !e.target.classList.contains('tab-title-input')) {
                setActiveTab(tab.id);
            }
        });

        // Double click to rename - FIX APPLIED HERE
        const titleEl = el.querySelector('.tab-title');
        titleEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startTabRename(tab.id);
        });

        el.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        });

        tabsContainer.appendChild(el);
    }

    function startTabRename(id) {
        const tabEl = document.querySelector(`.tab[data-id="${id}"]`);
        if (!tabEl) return;

        const titleEl = tabEl.querySelector('.tab-title');
        const currentTitle = titleEl.textContent;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tab-title-input';
        input.value = currentTitle;
        input.maxLength = TAB_TITLE_MAX_LENGTH;

        tabEl.replaceChild(input, titleEl);

        input.focus();
        input.select();

        const finish = () => {
            let newTitle = input.value.trim();
            if (newTitle === '') newTitle = 'Untitled';

            tabEl.replaceChild(titleEl, input);
            updateTabTitle(id, newTitle);
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.value = currentTitle; // Revert
                input.blur();
            }
        });

        input.addEventListener('click', (e) => e.stopPropagation());
    }

    function setActiveTab(id) {
        if (activeTabId) saveTabContent();

        activeTabId = id;

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const currentTabEl = document.querySelector(`.tab[data-id="${id}"]`);
        if (currentTabEl) currentTabEl.classList.add('active');

        const tab = tabs.find(t => t.id === id);
        if (tab) {
            const saved = localStorage.getItem(STORAGE_PREFIX + id);
            editor.value = saved !== null ? saved : (tab.content || '');
            resetLineNumberRenderCache();
            updateStats();
            updateLineNumbers();
        }
        if (currentTabEl) currentTabEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }

    function closeTab(id) {
        if (tabs.length <= 1) return;

        const idx = tabs.findIndex(t => t.id === id);

        const el = document.querySelector(`.tab[data-id="${id}"]`);
        if (el) el.remove();

        tabs.splice(idx, 1);
        localStorage.removeItem(STORAGE_PREFIX + id);
        saveTabs();

        if (activeTabId === id) {
            const nextIdx = Math.max(0, idx - 1);
            setActiveTab(tabs[nextIdx].id);
        }
    }

    function saveTabs() {
        localStorage.setItem(TABS_KEY, JSON.stringify(tabs.map(t => ({ id: t.id, title: t.title }))));
    }

    function saveTabContent() {
        if (!activeTabId) return;
        localStorage.setItem(STORAGE_PREFIX + activeTabId, editor.value);
    }

    function updateTabTitle(id, newTitle) {
        const tab = tabs.find(t => t.id === id);
        if (tab) {
            tab.title = normalizeTabTitle(newTitle);
            saveTabs();
            const el = document.querySelector(`.tab[data-id="${id}"] .tab-title`);
            if (el) el.textContent = tab.title;
        }
    }

    function normalizeTabTitle(title) {
        const clean = (title || '').trim();
        const base = clean === '' ? 'Untitled' : clean;
        return base.slice(0, TAB_TITLE_MAX_LENGTH);
    }

    // --- Functions: File Operations ---

    function handleFileOpen(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const currentTab = tabs.find(t => t.id === activeTabId);
            if (editor.value.trim() === '') {
                updateTabTitle(activeTabId, file.name);
            } else {
                createNewTab(file.name);
            }

            editor.value = e.target.result;
            saveTabContent();
            resetLineNumberRenderCache();
            updateStats();
            updateLineNumbers();
        };
        reader.readAsText(file);
    }

    function saveToFile() {
        const content = editor.value;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const currentTab = tabs.find(t => t.id === activeTabId);
        a.download = currentTab ? (currentTab.title.endsWith('.txt') ? currentTab.title : currentTab.title + '.txt') : 'document.txt';

        a.click();
        URL.revokeObjectURL(url);
    }

    function exportToPDF() {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print</title>');
        printWindow.document.write('<style>body{font-family:monospace;white-space:pre-wrap;padding:20px;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(editor.value.replace(/\n/g, '<br>'));
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }

    // --- Functions: UI Updates ---

    function updateStats() {
        const text = editor.value;
        const trimmed = text.trim();
        const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
        const lines = countLines(text);
        const wLabel = window.i18n ? window.i18n.words : 'words';
        const cLabel = window.i18n ? window.i18n.chars : 'chars';
        const lLabel = window.i18n ? window.i18n.lines : 'lines';

        wordCountEl.textContent = `${words} ${wLabel}`;
        charCountEl.textContent = `${text.length} ${cLabel}`;
        lineCountEl.textContent = `${lines} ${lLabel}`;
    }

    function updateLineNumbers() {
        const value = editor.value;
        const lines = value.split('\n');
        const lineCount = lines.length;

        const isWrapped = settings.wordWrap;
        if (!isWrapped && lastRenderWrapMode === false && lastRenderedLineCount === lineCount) {
            updateActiveLine();
            return;
        }

        lineNumbers.innerHTML = '';
        const fragment = document.createDocumentFragment();

        if (!isWrapped) {
            for (let index = 0; index < lineCount; index++) {
                const el = document.createElement('div');
                el.className = 'line-number';
                el.textContent = index + 1;
                fragment.appendChild(el);
            }
        } else {
            if (!lineMeasureMirror) {
                lineMeasureMirror = document.createElement('div');
                lineMeasureMirror.style.position = 'absolute';
                lineMeasureMirror.style.visibility = 'hidden';
                lineMeasureMirror.style.height = 'auto';
                lineMeasureMirror.style.whiteSpace = 'pre-wrap';
                lineMeasureMirror.style.wordWrap = 'break-word';
                lineMeasureMirror.style.padding = '0';
                document.body.appendChild(lineMeasureMirror);
            }

            const editorStyle = window.getComputedStyle(editor);
            lineMeasureMirror.style.width = (editor.clientWidth - parseFloat(editorStyle.paddingLeft) - parseFloat(editorStyle.paddingRight)) + 'px';
            lineMeasureMirror.style.font = editorStyle.font;
            lineMeasureMirror.style.fontSize = settings.fontSize + 'px';
            lineMeasureMirror.style.lineHeight = editorStyle.lineHeight;

            const shouldMeasureLineHeights = lineCount <= WRAP_MEASURE_LINE_LIMIT;

            for (let index = 0; index < lineCount; index++) {
                const line = lines[index];
                const el = document.createElement('div');
                el.className = 'line-number';
                el.textContent = index + 1;

                if (shouldMeasureLineHeights) {
                    lineMeasureMirror.textContent = line + '\u200b';
                    const height = lineMeasureMirror.offsetHeight;
                    el.style.height = height + 'px';
                }

                fragment.appendChild(el);
            }
        }

        lineNumbers.appendChild(fragment);
        lastRenderedLineCount = lineCount;
        lastRenderWrapMode = isWrapped;
        updateActiveLine();
    }

    function updateActiveLine() {
        if (document.activeElement !== editor) return;

        const textBeforeCaret = editor.value.slice(0, editor.selectionStart);
        const currentLineIndex = countLines(textBeforeCaret) - 1;
        const nums = lineNumbers.children;

        if (lastActiveLineIndex >= 0 && lastActiveLineIndex < nums.length && lastActiveLineIndex !== currentLineIndex) {
            nums[lastActiveLineIndex].classList.remove('active');
        }
        if (currentLineIndex >= 0 && currentLineIndex < nums.length) {
            nums[currentLineIndex].classList.add('active');
        }
        lastActiveLineIndex = currentLineIndex;
    }
});
