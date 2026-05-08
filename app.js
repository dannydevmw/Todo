(function() {
    const STORAGE_KEY = 'todo_tasks';
    const ARCHIVE_KEY = 'todo_archive';
    const THEME_KEY = 'todo_theme';
    const TAGS_KEY = 'todo_tags';
    const COMPLETION_KEY = 'todo_completion_history';
    const LISTS_KEY = 'todo_lists';

    let tasks = [];
    let archivedTasks = [];
    let customTags = [];
    let customLists = [];
    let completionHistory = {};
    let draggedTask = null;
    let deletedTask = null;
    let deleteTimeout = null;
    let currentSubtasks = [];
    let selectedTasks = new Set();
    let currentList = 'inbox';
    let focusMode = 'all'; // 'all', 'active', 'completed'
    let pomodoroInterval = null;
    let pomodoroTimeLeft = 25 * 60;
    let pomodoroSessions = 0;
    let pomodoroIsBreak = false;

    const elements = {
        taskList: document.getElementById('taskList'),
        emptyState: document.getElementById('emptyState'),
        searchInput: document.getElementById('searchInput'),
        statusFilter: document.getElementById('statusFilter'),
        categoryFilter: document.getElementById('categoryFilter'),
        tagFilter: document.getElementById('tagFilter'),
        sortFilter: document.getElementById('sortFilter'),
        dateFrom: document.getElementById('dateFrom'),
        dateTo: document.getElementById('dateTo'),
        addTaskBtn: document.getElementById('addTaskBtn'),
        taskModal: document.getElementById('taskModal'),
        modalTitle: document.getElementById('modalTitle'),
        taskForm: document.getElementById('taskForm'),
        taskId: document.getElementById('taskId'),
        taskTitle: document.getElementById('taskTitle'),
        taskDescription: document.getElementById('taskDescription'),
        taskListSelect: document.getElementById('taskListSelect'),
        taskCategory: document.getElementById('taskCategory'),
        taskPriority: document.getElementById('taskPriority'),
        taskDueDate: document.getElementById('taskDueDate'),
        taskWeekdays: document.getElementById('taskWeekdays'),
        taskRecurring: document.getElementById('taskRecurring'),
        taskReminder: document.getElementById('taskReminder'),
        taskTags: document.getElementById('taskTags'),
        selectedTags: document.getElementById('selectedTags'),
        taskNotes: document.getElementById('taskNotes'),
        subtasksContainer: document.getElementById('subtasksContainer'),
        subtasksList: document.getElementById('subtasksList'),
        modalClose: document.getElementById('modalClose'),
        cancelBtn: document.getElementById('cancelBtn'),
        themeToggle: document.getElementById('themeToggle'),
        toast: document.getElementById('toast'),
        toastUndo: document.getElementById('toastUndo'),
        statsBtn: document.getElementById('statsBtn'),
        statsModal: document.getElementById('statsModal'),
        statsClose: document.getElementById('statsClose'),
        archiveBtn: document.getElementById('archiveBtn'),
        archiveModal: document.getElementById('archiveModal'),
        archiveClose: document.getElementById('archiveClose'),
        archiveList: document.getElementById('archiveList'),
        archiveEmpty: document.getElementById('archiveEmpty'),
        exportBtn: document.getElementById('exportBtn'),
        exportModal: document.getElementById('exportModal'),
        exportClose: document.getElementById('exportClose'),
        exportJsonBtn: document.getElementById('exportJsonBtn'),
        importJsonBtn: document.getElementById('importJsonBtn'),
        importFile: document.getElementById('importFile'),
        shareLinkBtn: document.getElementById('shareLinkBtn'),
        listsModal: document.getElementById('listsModal'),
        listsClose: document.getElementById('listsClose'),
        newListName: document.getElementById('newListName'),
        addListBtn: document.getElementById('addListBtn'),
        listsManagement: document.getElementById('listsManagement'),
        boardsNav: document.getElementById('boardsNav'),
        activeCount: document.getElementById('activeCount'),
        completedCount: document.getElementById('completedCount'),
        focusModeBtn: document.getElementById('focusModeBtn'),
        pomodoroBtn: document.getElementById('pomodoroBtn'),
        pomodoroOverlay: document.getElementById('pomodoroOverlay'),
        pomodoroClose: document.getElementById('pomodoroClose'),
        pomodoroTime: document.getElementById('pomodoroTime'),
        pomodoroStatus: document.getElementById('pomodoroStatus'),
        pomodoroStart: document.getElementById('pomodoroStart'),
        pomodoroReset: document.getElementById('pomodoroReset'),
        pomodoroWork: document.getElementById('pomodoroWork'),
        pomodoroBreak: document.getElementById('pomodoroBreak'),
        pomodoroSessions: document.getElementById('pomodoroSessions'),
        pomodoroAscending: document.getElementById('pomodoroAscending'),
        batchActionsBtn: document.getElementById('batchActionsBtn'),
        selectedCount: document.getElementById('selectedCount'),
        batchComplete: document.getElementById('batchComplete'),
        batchDelete: document.getElementById('batchDelete'),
        batchArchive: document.getElementById('batchArchive'),
        clearFocusMode: document.getElementById('clearFocusMode'),
        shareModal: document.getElementById('shareModal'),
        shareClose: document.getElementById('shareClose'),
        shareLinkInput: document.getElementById('shareLinkInput'),
        copyShareLink: document.getElementById('copyShareLink')
    };

    function init() {
        loadData();
        renderBoards();
        renderTasks();
        updateStats();
        updateFocusIndicator();
        setupEventListeners();
        setupKeyboardShortcuts();
        checkReminders();
        setInterval(checkReminders, 60000);
    }

    function loadData() {
        const storedTasks = localStorage.getItem(STORAGE_KEY);
        if (storedTasks) tasks = JSON.parse(storedTasks);

        const storedArchive = localStorage.getItem(ARCHIVE_KEY);
        if (storedArchive) archivedTasks = JSON.parse(storedArchive);

        const storedTags = localStorage.getItem(TAGS_KEY);
        if (storedTags) customTags = JSON.parse(storedTags);
        else { customTags = ['Home', 'Fitness', 'Shopping', 'Learning', 'Finance']; saveTags(); }

        const storedLists = localStorage.getItem(LISTS_KEY);
        if (storedLists) customLists = JSON.parse(storedLists);
        else { customLists = [{ id: 'inbox', name: 'Inbox' }, { id: 'work', name: 'Work' }, { id: 'personal', name: 'Personal' }]; saveLists(); }

        const storedHistory = localStorage.getItem(COMPLETION_KEY);
        if (storedHistory) completionHistory = JSON.parse(storedHistory);

        populateFilters();
    }

    function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
    function saveArchive() { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archivedTasks)); }
    function saveTags() { localStorage.setItem(TAGS_KEY, JSON.stringify(customTags)); }
    function saveLists() { localStorage.setItem(LISTS_KEY, JSON.stringify(customLists)); }
    function saveCompletionHistory() { localStorage.setItem(COMPLETION_KEY, JSON.stringify(completionHistory)); }

    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
    }

    function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

    function createTask(data) {
        const weekdays = [];
        elements.taskWeekdays.querySelectorAll('input:checked').forEach(cb => weekdays.push(parseInt(cb.value)));
        return {
            id: generateId(),
            title: data.title,
            description: data.description || '',
            list: data.list || 'inbox',
            category: data.category || 'other',
            priority: data.priority || 'medium',
            dueDate: data.dueDate || null,
            weekdays: weekdays,
            recurring: data.recurring || '',
            reminder: data.reminder || false,
            tags: data.tags || [],
            subtasks: data.subtasks || [],
            notes: data.notes || '',
            completed: false,
            createdAt: Date.now(),
            order: tasks.length
        };
    }

    function getFilteredTasks() {
        const search = elements.searchInput.value.toLowerCase();
        const status = elements.statusFilter.value;
        const category = elements.categoryFilter.value;
        const tag = elements.tagFilter.value;
        const sort = elements.sortFilter.value;
        const fromDate = elements.dateFrom.value;
        const toDate = elements.dateTo.value;

        let filtered = tasks.filter(task => {
            if (focusMode === 'active' && task.completed) return false;
            if (focusMode === 'completed' && !task.completed) return false;
            if (currentList !== 'all' && task.list !== currentList) return false;
            if (search && !task.title.toLowerCase().includes(search) && !task.description.toLowerCase().includes(search)) return false;
            if (status === 'active' && task.completed) return false;
            if (status === 'completed' && !task.completed) return false;
            if (category !== 'all' && task.category !== category) return false;
            if (tag !== 'all' && (!task.tags || !task.tags.includes(tag))) return false;
            if (fromDate && task.dueDate && task.dueDate < fromDate + 'T00:00:00') return false;
            if (toDate && task.dueDate && task.dueDate > toDate + 'T23:59:59') return false;
            return true;
        });

        if (sort === 'dueDate') {
            filtered.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        } else if (sort === 'priority') {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        } else if (sort === 'created') {
            filtered.sort((a, b) => b.createdAt - a.createdAt);
        } else {
            filtered.sort((a, b) => a.order - b.order);
        }

        return filtered;
    }

    function getCompletedSubtasks(task) {
        if (!task.subtasks || task.subtasks.length === 0) return 0;
        return task.subtasks.filter(s => s.completed).length;
    }

    function renderTasks() {
        const filtered = getFilteredTasks();
        elements.taskList.innerHTML = '';

        if (filtered.length === 0) {
            elements.emptyState.classList.add('visible');
            elements.batchActionsBtn.style.display = 'none';
            return;
        }

        elements.emptyState.classList.remove('visible');
        updateBatchActions();

        filtered.forEach(task => {
            const taskEl = createTaskElement(task);
            elements.taskList.appendChild(taskEl);
        });
    }

    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item${task.completed ? ' completed' : ''}${selectedTasks.has(task.id) ? ' selected' : ''}`;
        div.draggable = true;
        div.dataset.id = task.id;

        const dueDateFormatted = task.dueDate ? formatDate(task.dueDate) : '';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
        const completedSubtasks = getCompletedSubtasks(task);
        const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
        const listName = customLists.find(l => l.id === task.list)?.name || 'Inbox';

        let tagsHtml = '';
        if (task.tags && task.tags.length > 0) {
            tagsHtml = `<div class="task-tags">${task.tags.map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
        }

        let notesHtml = '';
        if (task.notes) {
            notesHtml = `<div class="task-notes">${escapeHtml(task.notes)}</div>`;
        }

        let subtasksHtml = '';
        if (totalSubtasks > 0) {
            subtasksHtml = `<div class="task-subtasks-preview"><span>${completedSubtasks}/${totalSubtasks}</span> subtasks</div>`;
        }

        let recurringHtml = '';
        if (task.recurring) {
            const icons = { daily: '🔄', weekly: '📅', monthly: '🗓️' };
            recurringHtml = `<span class="task-recurring">${icons[task.recurring] || ''} ${task.recurring}</span>`;
        }

        div.innerHTML = `
            <input type="checkbox" class="task-select" ${selectedTasks.has(task.id) ? 'checked' : ''}>
            <div class="task-main">
                <div class="task-checkbox${task.completed ? ' checked' : ''}" data-id="${task.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div class="task-content">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                    ${notesHtml}
                    ${tagsHtml}
                    <div class="task-meta">
                        <span class="task-list-badge">${listName}</span>
                        <span class="task-category ${task.category}">${task.category}</span>
                        <span class="task-priority ${task.priority}">${task.priority}</span>
                        ${recurringHtml}
                        ${task.weekdays?.length ? `<span class="task-recurring">📅 ${task.weekdays.map(d => ['S','M','T','W','T','F','S'][d]).join('')}</span>` : ''}
                        ${dueDateFormatted ? `<span class="task-due-date${isOverdue ? ' overdue' : ''}${task.reminder && !task.completed ? ' reminder' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${dueDateFormatted}</span>` : ''}
                    </div>
                    ${subtasksHtml}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn edit" data-id="${task.id}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="task-action-btn archive" data-id="${task.id}" title="Archive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg></button>
                <button class="task-action-btn delete" data-id="${task.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
        `;

        setupDragEvents(div);
        return div;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function renderBoards() {
        const lists = [{ id: 'all', name: 'All' }, ...customLists];
        const activeCounts = {};
        customLists.forEach(list => {
            activeCounts[list.id] = tasks.filter(t => t.list === list.id && !t.completed).length;
        });

        elements.boardsNav.innerHTML = lists.map(list => `
            <button class="board-tab${currentList === list.id ? ' active' : ''}" data-list="${list.id}">
                ${list.name}
                ${list.id !== 'all' ? `<span class="board-count">${activeCounts[list.id] || 0}</span>` : ''}
            </button>
        `).join('') + '<button class="board-add-btn" id="manageListsBtn">+ Lists</button>';

        document.getElementById('manageListsBtn').addEventListener('click', () => {
            renderListsManagement();
            elements.listsModal.classList.add('active');
        });

        elements.boardsNav.querySelectorAll('.board-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                currentList = tab.dataset.list;
                renderBoards();
                renderTasks();
            });
        });
    }

    function renderListsManagement() {
        elements.listsManagement.innerHTML = customLists.filter(l => l.id !== 'inbox').map(list => `
            <li>
                <span>${escapeHtml(list.name)}</span>
                <button onclick="window.app.deleteList('${list.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </li>
        `).join('');
    }

    function addList(name) {
        if (!name.trim()) return;
        const id = name.toLowerCase().replace(/\s+/g, '-');
        if (customLists.find(l => l.id === id)) { showToast('List already exists'); return; }
        customLists.push({ id, name: name.trim() });
        saveLists();
        renderListsManagement();
        populateFilters();
        renderBoards();
    }

    function deleteList(id) {
        const tasksInList = tasks.filter(t => t.list === id);
        tasksInList.forEach(t => t.list = 'inbox');
        customLists = customLists.filter(l => l.id !== id);
        saveLists();
        saveTasks();
        if (currentList === id) currentList = 'inbox';
        renderListsManagement();
        populateFilters();
        renderBoards();
        renderTasks();
    }

    function populateFilters() {
        elements.tagFilter.innerHTML = '<option value="all">All Tags</option>' + customTags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
        elements.taskTags.innerHTML = '<option value="">Add tag...</option>' + customTags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
        elements.taskListSelect.innerHTML = customLists.map(list => `<option value="${list.id}">${list.name}</option>`).join('');
    }

    function openModal(task = null) {
        elements.taskModal.classList.add('active');
        currentSubtasks = [];
        elements.taskWeekdays.querySelectorAll('input').forEach(cb => cb.checked = false);

        if (task) {
            elements.modalTitle.textContent = 'Edit Task';
            elements.taskId.value = task.id;
            elements.taskTitle.value = task.title;
            elements.taskDescription.value = task.description;
            elements.taskListSelect.value = task.list || 'inbox';
            elements.taskCategory.value = task.category;
            elements.taskPriority.value = task.priority;
            elements.taskDueDate.value = task.dueDate || '';
            elements.taskRecurring.value = task.recurring || '';
            elements.taskReminder.checked = task.reminder;
            elements.taskNotes.value = task.notes || '';
            currentSubtasks = task.subtasks ? [...task.subtasks] : [];
            renderSelectedTags(task.tags || []);
            if (task.weekdays) {
                task.weekdays.forEach(d => {
                    const cb = elements.taskWeekdays.querySelector(`input[value="${d}"]`);
                    if (cb) cb.checked = true;
                });
            }
        } else {
            elements.modalTitle.textContent = 'Add Task';
            elements.taskForm.reset();
            elements.taskId.value = '';
            elements.taskPriority.value = 'medium';
            elements.taskRecurring.value = '';
            elements.taskListSelect.value = currentList !== 'all' ? currentList : 'inbox';
            renderSelectedTags([]);
        }
        renderSubtasks();
        elements.taskTitle.focus();
    }

    function closeModal() {
        elements.taskModal.classList.remove('active');
        elements.taskForm.reset();
        currentSubtasks = [];
        renderSelectedTags([]);
    }

    function getSelectedTags() {
        const tags = [];
        document.querySelectorAll('.selected-tag').forEach(el => tags.push(el.dataset.tag));
        return tags;
    }

    function renderSelectedTags(tags) {
        elements.selectedTags.innerHTML = tags.map(tag => `
            <span class="selected-tag" data-tag="${tag}">${tag}
                <button type="button" onclick="window.app.removeTag('${tag}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </span>
        `).join('');
    }

    function addTag(tag) {
        if (!tag) return;
        const current = getSelectedTags();
        if (!current.includes(tag)) { current.push(tag); renderSelectedTags(current); }
        elements.taskTags.value = '';
    }

    function removeTag(tag) {
        const current = getSelectedTags();
        const index = current.indexOf(tag);
        if (index > -1) { current.splice(index, 1); renderSelectedTags(current); }
    }

    function addSubtask(text) {
        if (!text.trim()) return;
        currentSubtasks.push({ id: generateId(), text: text.trim(), completed: false });
        renderSubtasks();
        elements.subtasksContainer.querySelector('.subtask-input').value = '';
    }

    function toggleSubtask(id) {
        const subtask = currentSubtasks.find(s => s.id === id);
        if (subtask) { subtask.completed = !subtask.completed; renderSubtasks(); }
    }

    function deleteSubtask(id) {
        currentSubtasks = currentSubtasks.filter(s => s.id !== id);
        renderSubtasks();
    }

    function renderSubtasks() {
        elements.subtasksList.innerHTML = currentSubtasks.map(subtask => `
            <li class="subtask-item${subtask.completed ? ' completed' : ''}">
                <input type="checkbox" ${subtask.completed ? 'checked' : ''} onchange="window.app.toggleSubtask('${subtask.id}')">
                <span>${escapeHtml(subtask.text)}</span>
                <button class="subtask-delete" onclick="window.app.deleteSubtask('${subtask.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </li>
        `).join('');
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const taskData = {
            title: elements.taskTitle.value.trim(),
            description: elements.taskDescription.value.trim(),
            list: elements.taskListSelect.value,
            category: elements.taskCategory.value,
            priority: elements.taskPriority.value,
            dueDate: elements.taskDueDate.value || null,
            recurring: elements.taskRecurring.value || '',
            reminder: elements.taskReminder.checked,
            tags: getSelectedTags(),
            subtasks: [...currentSubtasks],
            notes: elements.taskNotes.value.trim()
        };

        if (!taskData.title) { showToast('Please enter a task title'); return; }

        const existingId = elements.taskId.value;
        if (existingId) {
            const index = tasks.findIndex(t => t.id === existingId);
            if (index !== -1) {
                tasks[index] = { ...tasks[index], ...taskData };
                showToast('Task updated');
            }
        } else {
            const newTask = createTask(taskData);
            tasks.push(newTask);
            showToast('Task added');
        }

        saveTasks();
        renderBoards();
        renderTasks();
        closeModal();
    }

    function toggleComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const wasCompleted = task.completed;
            task.completed = !task.completed;

            if (task.completed && task.recurring) createNextRecurringTask(task);

            if (task.completed) {
                const today = new Date().toISOString().split('T')[0];
                completionHistory[today] = (completionHistory[today] || 0) + 1;
                saveCompletionHistory();
            }

            saveTasks();
            renderBoards();
            renderTasks();
            showToast(task.completed ? 'Task completed' : 'Task marked active');
        }
    }

    function createNextRecurringTask(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
        let nextDate;

        switch (task.recurring) {
            case 'daily': nextDate = new Date(dueDate); nextDate.setDate(nextDate.getDate() + 1); break;
            case 'weekly': nextDate = new Date(dueDate); nextDate.setDate(nextDate.getDate() + 7); break;
            case 'monthly': nextDate = new Date(dueDate); nextDate.setMonth(nextDate.getMonth() + 1); break;
            default: return;
        }

        const newTask = createTask({
            title: task.title, description: task.description, list: task.list,
            category: task.category, priority: task.priority,
            dueDate: nextDate.toISOString().slice(0, 16), recurring: task.recurring,
            reminder: task.reminder, tags: task.tags,
            subtasks: task.subtasks.map(s => ({ ...s, completed: false }))
        });
        tasks.push(newTask);
        saveTasks();
    }

    function archiveTask(id) {
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            const [task] = tasks.splice(index, 1);
            task.archivedAt = Date.now();
            archivedTasks.unshift(task);
            saveTasks();
            saveArchive();
            renderBoards();
            renderTasks();
            showToast('Task archived');
        }
    }

    function restoreTask(id) {
        const index = archivedTasks.findIndex(t => t.id === id);
        if (index !== -1) {
            const [task] = archivedTasks.splice(index, 1);
            delete task.archivedAt;
            tasks.push(task);
            saveTasks();
            saveArchive();
            renderArchive();
            renderTasks();
            showToast('Task restored');
        }
    }

    function deleteTask(id, fromArchive = false) {
        if (fromArchive) {
            archivedTasks = archivedTasks.filter(t => t.id !== id);
            saveArchive();
            renderArchive();
            showToast('Task permanently deleted');
            return;
        }

        const task = tasks.find(t => t.id === id);
        if (task) {
            const taskCopy = { ...task };
            const taskIndex = tasks.indexOf(task);
            tasks.splice(taskIndex, 1);
            saveTasks();
            renderBoards();
            renderTasks();

            deletedTask = { task: taskCopy, index: taskIndex };
            showToast('Task deleted', true);

            if (deleteTimeout) clearTimeout(deleteTimeout);
            deleteTimeout = setTimeout(() => { if (deletedTask) deletedTask = null; }, 5000);
        }
    }

    function undoDelete() {
        if (deletedTask) {
            tasks.splice(deletedTask.index, 0, deletedTask.task);
            saveTasks();
            renderBoards();
            renderTasks();
            showToast('Task restored');
            deletedTask = null;
        }
    }

    function editTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) openModal(task);
    }

    function toggleTaskSelection(id) {
        if (selectedTasks.has(id)) selectedTasks.delete(id);
        else selectedTasks.add(id);
        renderTasks();
        updateBatchActions();
    }

    function selectAllVisible() {
        const filtered = getFilteredTasks();
        if (selectedTasks.size === filtered.length) selectedTasks.clear();
        else filtered.forEach(t => selectedTasks.add(t.id));
        renderTasks();
        updateBatchActions();
    }

    function updateBatchActions() {
        if (selectedTasks.size > 0) {
            elements.batchActionsBtn.style.display = 'flex';
            elements.selectedCount.textContent = `${selectedTasks.size} selected`;
        } else {
            elements.batchActionsBtn.style.display = 'none';
        }
    }

    function batchComplete() {
        selectedTasks.forEach(id => {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = true;
                const today = new Date().toISOString().split('T')[0];
                completionHistory[today] = (completionHistory[today] || 0) + 1;
            }
        });
        saveCompletionHistory();
        saveTasks();
        selectedTasks.clear();
        renderBoards();
        renderTasks();
        showToast(`${selectedTasks.size} tasks completed`);
    }

    function batchDelete() {
        const count = selectedTasks.size;
        tasks = tasks.filter(t => !selectedTasks.has(t.id));
        saveTasks();
        selectedTasks.clear();
        renderBoards();
        renderTasks();
        showToast(`${count} tasks deleted`, true);
        if (deleteTimeout) clearTimeout(deleteTimeout);
        deleteTimeout = setTimeout(() => { deletedTask = null; }, 5000);
    }

    function batchArchive() {
        const count = selectedTasks.size;
        const toArchive = tasks.filter(t => selectedTasks.has(t.id));
        tasks = tasks.filter(t => !selectedTasks.has(t.id));
        toArchive.forEach(t => { t.archivedAt = Date.now(); archivedTasks.unshift(t); });
        saveTasks();
        saveArchive();
        selectedTasks.clear();
        renderBoards();
        renderTasks();
        showToast(`${count} tasks archived`);
    }

    function toggleFocusMode() {
        if (focusMode === 'all') {
            focusMode = 'active';
            elements.focusModeBtn.classList.add('active');
        } else if (focusMode === 'active') {
            focusMode = 'completed';
            elements.focusModeBtn.classList.add('active');
        } else {
            focusMode = 'all';
            elements.focusModeBtn.classList.remove('active');
        }
        elements.statusFilter.value = 'all';
        updateFocusIndicator();
        renderTasks();
        
        let modeText = focusMode === 'all' ? 'Showing all tasks' : focusMode === 'active' ? 'Focus mode: Active tasks only' : 'Showing completed tasks only';
        showToast(modeText);
    }

    function updateFocusIndicator() {
        const indicator = document.getElementById('focusIndicator');
        const text = document.getElementById('focusModeText');
        
        if (focusMode === 'all') {
            indicator.style.display = 'none';
        } else {
            indicator.style.display = 'flex';
            text.textContent = focusMode === 'active' ? '🔍 Focus Mode: Active Tasks' : '✅ Showing Completed Only';
        }
    }

    function clearFocusMode() {
        focusMode = 'all';
        elements.focusModeBtn.classList.remove('active');
        elements.statusFilter.value = 'all';
        updateFocusIndicator();
        renderTasks();
    }

    function showToast(message, showUndo = false) {
        const toastEl = elements.toast;
        toastEl.querySelector('.toast-message').textContent = message;
        elements.toastUndo.style.display = showUndo ? 'inline' : 'none';
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), showUndo ? 5000 : 3000);
    }

    function updateStats() {
        const active = tasks.filter(t => !t.completed).length;
        const completed = tasks.filter(t => t.completed).length;
        elements.activeCount.textContent = active;
        elements.completedCount.textContent = completed;
    }

    function showStats() {
        const total = tasks.length;
        const active = tasks.filter(t => !t.completed).length;
        const completed = tasks.filter(t => t.completed).length;
        const archived = archivedTasks.length;
        const today = new Date().toISOString().split('T')[0];
        const todayCompleted = completionHistory[today] || 0;

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        let weekCompleted = 0;
        Object.keys(completionHistory).forEach(date => {
            if (date >= weekStart.toISOString().split('T')[0]) weekCompleted += completionHistory[date];
        });

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statActive').textContent = active;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statArchived').textContent = archived;
        document.getElementById('statToday').textContent = todayCompleted;
        document.getElementById('statWeek').textContent = weekCompleted;

        const chartBars = document.getElementById('chartBars');
        chartBars.innerHTML = '';
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const count = completionHistory[dateStr] || 0;
            const maxCount = Math.max(...Object.values(completionHistory), 1);
            const height = (count / maxCount) * 80;
            chartBars.innerHTML += `<div class="chart-bar"><div class="chart-bar-fill" style="height: ${height}px"></div><span class="chart-bar-label">${dayName}</span></div>`;
        }

        elements.statsModal.classList.add('active');
    }

    function showArchive() {
        renderArchive();
        elements.archiveModal.classList.add('active');
    }

    function renderArchive() {
        elements.archiveList.innerHTML = '';
        if (archivedTasks.length === 0) { elements.archiveEmpty.classList.add('visible'); return; }
        elements.archiveEmpty.classList.remove('visible');

        archivedTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item completed';
            taskEl.innerHTML = `
                <div class="task-main" style="width:100%">
                    <div class="task-checkbox checked"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                    <div class="task-content">
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        <div class="task-meta"><span class="task-category ${task.category}">${task.category}</span></div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn restore" data-id="${task.id}" title="Restore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                        <button class="task-action-btn delete" data-id="${task.id}" title="Delete permanently"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                </div>`;
            elements.archiveList.appendChild(taskEl);
        });
    }

    function showExportModal() { elements.exportModal.classList.add('active'); }

    function exportData() {
        const data = { tasks, archivedTasks, customTags, customLists, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported');
        elements.exportModal.classList.remove('active');
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks && Array.isArray(data.tasks)) { tasks = data.tasks; saveTasks(); }
                if (data.archivedTasks && Array.isArray(data.archivedTasks)) { archivedTasks = data.archivedTasks; saveArchive(); }
                if (data.customTags && Array.isArray(data.customTags)) { customTags = data.customTags; saveTags(); }
                if (data.customLists && Array.isArray(data.customLists)) { customLists = data.customLists; saveLists(); }
                renderBoards();
                populateFilters();
                renderTasks();
                showToast('Data imported successfully');
            } catch (err) { showToast('Invalid file format'); }
        };
        reader.readAsText(file);
    }

    function generateShareLink() {
        const data = { tasks: tasks.map(t => ({ title: t.title, description: t.description, category: t.category, completed: t.completed, dueDate: t.dueDate })), exportedAt: new Date().toISOString() };
        const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
        const link = `${window.location.origin}${window.location.pathname}?shared=${encoded}`;
        elements.shareLinkInput.value = link;
        elements.shareModal.classList.add('active');
    }

    function checkForSharedLink() {
        const params = new URLSearchParams(window.location.search);
        const shared = params.get('shared');
        if (shared && shared.length > 10) {
            try {
                const data = JSON.parse(decodeURIComponent(atob(shared)));
                if (data.tasks && confirm('Load shared tasks? This will merge with your existing tasks.')) {
                    data.tasks.forEach(t => tasks.push(createTask({ ...t, id: undefined })));
                    saveTasks();
                    renderTasks();
                    showToast(`${data.tasks.length} shared tasks loaded`);
                }
                window.history.replaceState({}, '', window.location.pathname);
            } catch (e) { 
                window.history.replaceState({}, '', window.location.pathname);
                console.error('Failed to parse shared link'); 
            }
        }
    }

    function startPomodoro() {
        if (pomodoroInterval) {
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            elements.pomodoroStart.textContent = 'Start';
            elements.pomodoroStatus.textContent = 'Paused';
            return;
        }

        const isAscending = elements.pomodoroAscending.checked;
        const workTime = parseInt(elements.pomodoroWork.value) * 60;
        
        if (!pomodoroIsBreak) {
            pomodoroTimeLeft = isAscending ? 0 : workTime;
        }
        
        const targetTime = pomodoroIsBreak ? parseInt(elements.pomodoroBreak.value) * 60 : workTime;
        
        elements.pomodoroStart.textContent = 'Pause';
        elements.pomodoroStatus.textContent = pomodoroIsBreak ? 'Break' : 'Working';

        pomodoroInterval = setInterval(() => {
            if (isAscending) {
                pomodoroTimeLeft++;
            } else {
                pomodoroTimeLeft--;
            }
            updatePomodoroDisplay();

            const shouldStop = isAscending ? pomodoroTimeLeft >= targetTime : pomodoroTimeLeft <= 0;
            
            if (shouldStop) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;

                if (!pomodoroIsBreak) {
                    pomodoroSessions++;
                    elements.pomodoroSessions.textContent = pomodoroSessions;
                    pomodoroIsBreak = true;
                    pomodoroTimeLeft = isAscending ? 0 : parseInt(elements.pomodoroBreak.value) * 60;
                    new Notification('Pomodoro Complete!', { body: 'Time for a break.' });
                } else {
                    pomodoroIsBreak = false;
                    pomodoroTimeLeft = isAscending ? 0 : parseInt(elements.pomodoroWork.value) * 60;
                    new Notification('Break Over!', { body: 'Ready to work?' });
                }

                elements.pomodoroStart.textContent = 'Start';
                elements.pomodoroStatus.textContent = 'Ready';
            }
        }, 1000);
    }

    function resetPomodoro() {
        if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null; }
        pomodoroIsBreak = false;
        const isAscending = elements.pomodoroAscending.checked;
        pomodoroTimeLeft = isAscending ? 0 : parseInt(elements.pomodoroWork.value) * 60;
        elements.pomodoroStart.textContent = 'Start';
        elements.pomodoroStatus.textContent = 'Ready';
        updatePomodoroDisplay();
    }

    function updatePomodoroDisplay() {
        const mins = Math.floor(pomodoroTimeLeft / 60);
        const secs = pomodoroTimeLeft % 60;
        elements.pomodoroTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function setupDragEvents(element) {
        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragend', handleDragEnd);
        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('drop', handleDrop);
    }

    function handleDragStart(e) {
        draggedTask = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
        draggedTask = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (this !== draggedTask) this.classList.add('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        if (draggedTask && this !== draggedTask) {
            const fromId = draggedTask.dataset.id;
            const toId = this.dataset.id;
            const fromIndex = tasks.findIndex(t => t.id === fromId);
            const toIndex = tasks.findIndex(t => t.id === toId);

            if (fromIndex !== -1 && toIndex !== -1) {
                const [movedTask] = tasks.splice(fromIndex, 1);
                tasks.splice(toIndex, 0, movedTask);
                tasks.forEach((task, index) => task.order = index);
                saveTasks();
                renderTasks();
            }
        }
    }

    function checkReminders() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') Notification.requestPermission();
        if (Notification.permission !== 'granted') return;

        const now = new Date();
        tasks.forEach(task => {
            if (!task.completed && task.dueDate && task.reminder) {
                const dueDate = new Date(task.dueDate);
                const minutesDiff = Math.floor((dueDate.getTime() - now.getTime()) / 60000);
                if (minutesDiff > 0 && minutesDiff <= 15) {
                    const notifiedKey = `notified_${task.id}_${dueDate.getTime()}`;
                    if (!localStorage.getItem(notifiedKey)) {
                        new Notification('Task Reminder', { body: `"${task.title}" is due soon!` });
                        localStorage.setItem(notifiedKey, 'true');
                    }
                }
            }
        });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                if (e.key === 'Escape') e.target.blur();
                return;
            }

            if (e.key === 'n' || e.key === 'N') {
                if (!elements.taskModal.classList.contains('active')) { e.preventDefault(); openModal(); }
            }

            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); elements.searchInput.focus(); }

            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); if (deletedTask) undoDelete(); }

            if (e.ctrlKey && e.key === 'a') { e.preventDefault(); selectAllVisible(); }

            if (e.key === 'f' || e.key === 'F') {
                if (!elements.taskModal.classList.contains('active')) { e.preventDefault(); toggleFocusMode(); }
            }

            if (e.key === 'Escape') {
                if (elements.taskModal.classList.contains('active')) closeModal();
                else if (elements.statsModal.classList.contains('active')) elements.statsModal.classList.remove('active');
                else if (elements.archiveModal.classList.contains('active')) elements.archiveModal.classList.remove('active');
                else if (elements.exportModal.classList.contains('active')) elements.exportModal.classList.remove('active');
                else if (elements.listsModal.classList.contains('active')) elements.listsModal.classList.remove('active');
                else if (elements.shareModal.classList.contains('active')) elements.shareModal.classList.remove('active');
                else if (elements.pomodoroOverlay.classList.contains('active')) elements.pomodoroOverlay.classList.remove('active');
            }
        });
    }

    function setupEventListeners() {
        loadTheme();

        elements.addTaskBtn.addEventListener('click', () => openModal());
        elements.modalClose.addEventListener('click', closeModal);
        elements.cancelBtn.addEventListener('click', closeModal);
        elements.taskForm.addEventListener('submit', handleFormSubmit);
        document.querySelector('#taskModal .modal-overlay').addEventListener('click', closeModal);

        elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });

        elements.searchInput.addEventListener('input', renderTasks);
        elements.statusFilter.addEventListener('change', renderTasks);
        elements.categoryFilter.addEventListener('change', renderTasks);
        elements.tagFilter.addEventListener('change', renderTasks);
        elements.sortFilter.addEventListener('change', renderTasks);
        elements.dateFrom.addEventListener('change', renderTasks);
        elements.dateTo.addEventListener('change', renderTasks);

        elements.taskTags.addEventListener('change', (e) => addTag(e.target.value));

        elements.subtasksContainer.querySelector('.subtask-add-btn').addEventListener('click', () => {
            addSubtask(elements.subtasksContainer.querySelector('.subtask-input').value);
        });
        elements.subtasksContainer.querySelector('.subtask-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addSubtask(e.target.value);
        });

        elements.taskList.addEventListener('click', (e) => {
            const checkbox = e.target.closest('.task-checkbox');
            const editBtn = e.target.closest('.task-action-btn.edit');
            const archiveBtn = e.target.closest('.task-action-btn.archive');
            const deleteBtn = e.target.closest('.task-action-btn.delete');

            if (checkbox) toggleComplete(checkbox.dataset.id);
            else if (editBtn) editTask(editBtn.dataset.id);
            else if (archiveBtn) archiveTask(archiveBtn.dataset.id);
            else if (deleteBtn) deleteTask(deleteBtn.dataset.id);
        });

        elements.taskList.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-select')) {
                toggleTaskSelection(e.target.closest('.task-item').dataset.id);
            }
        });

        elements.statsBtn.addEventListener('click', showStats);
        elements.statsClose.addEventListener('click', () => elements.statsModal.classList.remove('active'));
        document.querySelector('#statsModal .modal-overlay').addEventListener('click', () => elements.statsModal.classList.remove('active'));

        elements.archiveBtn.addEventListener('click', showArchive);
        elements.archiveClose.addEventListener('click', () => elements.archiveModal.classList.remove('active'));
        document.querySelector('#archiveModal .modal-overlay').addEventListener('click', () => elements.archiveModal.classList.remove('active'));

        elements.archiveList.addEventListener('click', (e) => {
            const restoreBtn = e.target.closest('.task-action-btn.restore');
            const deleteBtn = e.target.closest('.task-action-btn.delete');
            if (restoreBtn) restoreTask(restoreBtn.dataset.id);
            else if (deleteBtn) deleteTask(deleteBtn.dataset.id, true);
        });

        elements.exportBtn.addEventListener('click', showExportModal);
        elements.exportClose.addEventListener('click', () => elements.exportModal.classList.remove('active'));
        document.querySelector('#exportModal .modal-overlay').addEventListener('click', () => elements.exportModal.classList.remove('active'));
        elements.exportJsonBtn.addEventListener('click', exportData);
        elements.importJsonBtn.addEventListener('click', () => elements.importFile.click());
        elements.importFile.addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
        elements.shareLinkBtn.addEventListener('click', generateShareLink);

        elements.listsClose.addEventListener('click', () => elements.listsModal.classList.remove('active'));
        document.querySelector('#listsModal .modal-overlay').addEventListener('click', () => elements.listsModal.classList.remove('active'));
        elements.addListBtn.addEventListener('click', () => addList(elements.newListName.value));
        elements.newListName.addEventListener('keypress', (e) => { if (e.key === 'Enter') addList(e.target.value); });

        elements.focusModeBtn.addEventListener('click', toggleFocusMode);
        elements.clearFocusMode.addEventListener('click', clearFocusMode);

        elements.pomodoroBtn.addEventListener('click', () => {
            resetPomodoro();
            elements.pomodoroOverlay.classList.add('active');
        });
        elements.pomodoroClose.addEventListener('click', () => { resetPomodoro(); elements.pomodoroOverlay.classList.remove('active'); });
        document.querySelector('#pomodoroOverlay .modal-overlay').addEventListener('click', () => { resetPomodoro(); elements.pomodoroOverlay.classList.remove('active'); });
        elements.pomodoroStart.addEventListener('click', startPomodoro);
        elements.pomodoroReset.addEventListener('click', resetPomodoro);

        elements.shareClose.addEventListener('click', () => elements.shareModal.classList.remove('active'));
        document.querySelector('#shareModal .modal-overlay').addEventListener('click', () => elements.shareModal.classList.remove('active'));
        elements.copyShareLink.addEventListener('click', () => {
            elements.shareLinkInput.select();
            document.execCommand('copy');
            showToast('Link copied!');
        });

        elements.batchComplete.addEventListener('click', batchComplete);
        elements.batchDelete.addEventListener('click', batchDelete);
        elements.batchArchive.addEventListener('click', batchArchive);

        elements.toastUndo.addEventListener('click', undoDelete);

        window.app = { toggleSubtask, deleteSubtask, removeTag, deleteList };
    }

    document.addEventListener('DOMContentLoaded', () => { init(); checkForSharedLink(); });
})();