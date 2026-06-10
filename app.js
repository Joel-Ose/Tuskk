/* ==========================================
   Tusk — Application Logic
   ========================================== */

(function () {
  'use strict';

  // ─── State ────────────────────────────────
  let tasks = [];
  let currentFilter = 'all';
  let taskIdCounter = 0;
  let editingTaskId = null;
  const reminderTimers = {};

  // ─── Category Config ──────────────────────
  const CATEGORIES = {
    none:     { label: 'None',     color: null },
    work:     { label: 'Work',     color: '#3B82F6' },
    personal: { label: 'Personal', color: '#8B5CF6' },
    health:   { label: 'Health',   color: '#22C55E' },
    shopping: { label: 'Shopping', color: '#F59E0B' },
    finance:  { label: 'Finance',  color: '#14B8A6' },
  };

  // ─── DOM Elements ─────────────────────────
  const $ = id => document.getElementById(id);

  const taskList       = $('task-list');
  const emptyState     = $('empty-state');
  const totalCountEl   = $('total-count');
  const completedEl    = $('completed-count');
  const progressPctEl  = $('progress-percent');
  const progressBar    = $('progress-bar');
  const filterContainer = $('tasks-filter');
  const toastContainer = $('toast-container');

  // Modal
  const modalOverlay   = $('modal-overlay');
  const modalTitle     = $('modal-title');
  const taskForm       = $('task-form');
  const editIdInput    = $('task-edit-id');
  const nameInput      = $('task-name');
  const descInput      = $('task-desc');
  const categoryPicker = $('category-picker');
  const dueInput       = $('task-due');
  const reminderInput  = $('task-reminder');
  const reminderLabel  = $('reminder-label');
  const saveBtnText    = $('modal-save-btn');

  // Buttons
  const addTaskBtn     = $('add-task-btn');
  const emptyAddBtn    = $('empty-add-btn');
  const modalCloseBtn  = $('modal-close-btn');
  const modalCancelBtn = $('modal-cancel-btn');

  // ═══════════════════════════════════════════
  //  TOAST NOTIFICATION SYSTEM
  // ═══════════════════════════════════════════

  const TOAST_ICONS = {
    success:  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error:    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4L10 10M10 4L4 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    warning:  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 4V7.5M7 9.5V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    info:     '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4" r="1" fill="currentColor"/><path d="M7 6.5V10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    reminder: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11.5C5 11.5 5.5 12.5 7 12.5C8.5 12.5 9 11.5 9 11.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M3 9.5C3 9.5 3.5 8.5 3.5 6.5C3.5 4.567 5.067 3 7 3C8.933 3 10.5 4.567 10.5 6.5C10.5 8.5 11 9.5 11 9.5H3Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function showToast(type, title, message, duration = 4000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
      <div class="toast-body">
        <div class="toast-title">${esc(title)}</div>
        ${message ? `<div class="toast-message">${esc(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;
    el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));
    toastContainer.appendChild(el);
    const t = setTimeout(() => dismissToast(el), duration);
    el._timer = t;
  }

  function dismissToast(el) {
    if (el._gone) return;
    el._gone = true;
    clearTimeout(el._timer);
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  // ═══════════════════════════════════════════
  //  MODAL — Open / Close
  // ═══════════════════════════════════════════

  function openModal(mode, task) {
    editingTaskId = null;
    taskForm.reset();
    setActiveCategory('none');
    updateReminderLabel();

    if (mode === 'edit' && task) {
      editingTaskId = task.id;
      editIdInput.value = task.id;
      modalTitle.textContent = 'Edit Task';
      saveBtnText.innerHTML = `
        <svg class="btn-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8L7 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Update Task`;
      nameInput.value = task.title;
      descInput.value = task.description || '';
      setActiveCategory(task.category || 'none');
      dueInput.value = task.dueDate || '';
      reminderInput.checked = !!task.reminder;
      updateReminderLabel();
    } else {
      editIdInput.value = '';
      modalTitle.textContent = 'Add Task';
      saveBtnText.innerHTML = `
        <svg class="btn-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8L7 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Save Task`;
    }

    modalOverlay.classList.add('open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus the name field after animation
    setTimeout(() => nameInput.focus(), 350);
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    editingTaskId = null;
  }

  // ─── Category picker logic ────────────────
  function setActiveCategory(cat) {
    categoryPicker.querySelectorAll('.cat-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === cat);
    });
  }

  function getActiveCategory() {
    const active = categoryPicker.querySelector('.cat-pill.active');
    return active ? active.dataset.category : 'none';
  }

  categoryPicker.addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    setActiveCategory(pill.dataset.category);
  });

  // ─── Reminder toggle label ────────────────
  function updateReminderLabel() {
    const on = reminderInput.checked;
    reminderLabel.textContent = on ? '5 min before' : 'Off';
    reminderLabel.classList.toggle('on', on);
  }
  reminderInput.addEventListener('change', updateReminderLabel);

  // Auto-enable reminder when due date is set
  dueInput.addEventListener('change', function () {
    if (this.value && !reminderInput.checked) {
      reminderInput.checked = true;
      updateReminderLabel();
    }
  });

  // ═══════════════════════════════════════════
  //  DATE & REMINDER UTILITIES
  // ═══════════════════════════════════════════

  function formatDueDate(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    const isToday = due.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = due.toDateString() === tomorrow.toDateString();

    const time = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffMs < 0) {
      if (diffMins > -60)  return `${Math.abs(diffMins)}m overdue`;
      if (diffHours > -24) return `${Math.abs(diffHours)}h overdue`;
      return `${Math.abs(diffDays)}d overdue`;
    }
    if (diffMins < 60)    return `in ${diffMins}m`;
    if (isToday)          return `Today, ${time}`;
    if (isTomorrow)       return `Tomorrow, ${time}`;
    if (diffDays <= 7) {
      return `${due.toLocaleDateString([], { weekday: 'short' })}, ${time}`;
    }
    return due.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${time}`;
  }

  function getDueStatus(dueDate) {
    const diffMs = new Date(dueDate) - new Date();
    if (diffMs < 0) return 'overdue';
    if (diffMs / 3600000 <= 1) return 'due-soon';
    return '';
  }

  function scheduleReminder(task) {
    clearReminder(task.id);
    if (!task.dueDate || !task.reminder || task.completed) return;

    const dueTime = new Date(task.dueDate).getTime();
    const delay = (dueTime - 5 * 60000) - Date.now();

    if (delay > 0) {
      reminderTimers[task.id] = setTimeout(() => {
        if (!task.completed) {
          showToast('reminder', '⏰ Reminder', `"${task.title}" is due in 5 minutes!`, 8000);
        }
        delete reminderTimers[task.id];
      }, delay);
    } else if (dueTime > Date.now()) {
      showToast('reminder', '⏰ Due Soon', `"${task.title}" is due very soon!`, 6000);
    }
  }

  function clearReminder(id) {
    if (reminderTimers[id]) {
      clearTimeout(reminderTimers[id]);
      delete reminderTimers[id];
    }
  }

  // Refresh due badges every minute
  setInterval(() => renderTasks(), 60000);

  // ═══════════════════════════════════════════
  //  TASK CRUD
  // ═══════════════════════════════════════════

  function addTask(data) {
    const task = {
      id: ++taskIdCounter,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      completed: false,
      createdAt: Date.now(),
      dueDate: data.dueDate || null,
      reminder: data.reminder || false,
    };
    tasks.unshift(task);
    if (task.reminder && task.dueDate) scheduleReminder(task);
    updateUI();

    const extra = task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : task.title;
    showToast('success', 'Task added', extra);
    return task;
  }

  function updateTask(id, data) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.title = data.title.trim();
    task.description = data.description.trim();
    task.category = data.category;
    task.dueDate = data.dueDate || null;
    task.reminder = data.reminder || false;

    clearReminder(id);
    if (task.reminder && task.dueDate && !task.completed) {
      scheduleReminder(task);
    }

    updateUI();
    showToast('info', 'Task updated', task.title);
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;

    if (task.completed) {
      clearReminder(id);
      showToast('success', 'Task completed! 🎉', task.title);
    } else {
      if (task.reminder && task.dueDate) scheduleReminder(task);
      showToast('info', 'Task reopened', task.title);
    }
    updateUI();
  }

  function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    clearReminder(id);

    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (el) {
      el.classList.add('removing');
      el.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        updateUI();
      }, { once: true });
    } else {
      tasks = tasks.filter(t => t.id !== id);
      updateUI();
    }
    if (task) showToast('error', 'Task deleted', task.title);
  }

  // ═══════════════════════════════════════════
  //  FILTERING & RENDERING
  // ═══════════════════════════════════════════

  function getFiltered() {
    if (currentFilter === 'active')    return tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  }

  function renderTasks() {
    const list = getFiltered();
    if (list.length === 0) {
      taskList.innerHTML = '';
      emptyState.classList.add('visible');
    } else {
      emptyState.classList.remove('visible');
      taskList.innerHTML = list.map(taskHTML).join('');
    }
  }

  function taskHTML(task) {
    const cls = task.completed ? ' completed' : '';
    const chk = task.completed ? ' checked' : '';

    // Build meta badges
    let badges = '';
    if (task.category && task.category !== 'none') {
      const cat = CATEGORIES[task.category];
      badges += `<span class="task-badge badge-${task.category}">
        <span class="cat-dot" style="background:${cat.color}"></span>${cat.label}
      </span>`;
    }
    if (task.dueDate) {
      const status = task.completed ? '' : getDueStatus(task.dueDate);
      badges += `<span class="task-badge badge-due ${status}">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8L10.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${esc(formatDueDate(task.dueDate))}
      </span>`;
    }
    if (task.reminder && task.dueDate) {
      badges += `<span class="task-badge badge-reminder">
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M5 11.5C5 11.5 5.5 12.5 7 12.5C8.5 12.5 9 11.5 9 11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M3 9.5C3 9.5 3.5 8.5 3.5 6.5C3.5 4.567 5.067 3 7 3C8.933 3 10.5 4.567 10.5 6.5C10.5 8.5 11 9.5 11 9.5H3Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Reminder
      </span>`;
    }
    const metaRow = badges ? `<div class="task-meta">${badges}</div>` : '';

    const descRow = task.description
      ? `<p class="task-description">${esc(task.description)}</p>`
      : '';

    return `
      <li class="task-item${cls}" data-task-id="${task.id}" role="listitem">
        <label class="task-checkbox">
          <input type="checkbox" ${chk}
            aria-label="Mark '${esc(task.title)}' as ${task.completed ? 'active' : 'completed'}"
            data-action="toggle" data-id="${task.id}" />
          <span class="checkmark">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </label>
        <div class="task-content">
          <span class="task-title-text">${esc(task.title)}</span>
          ${descRow}
          ${metaRow}
        </div>
        <div class="task-actions">
          <button class="task-action-btn edit-btn" data-action="edit" data-id="${task.id}" aria-label="Edit task" title="Edit">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 4L12 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="task-action-btn delete-btn" data-action="delete" data-id="${task.id}" aria-label="Delete task" title="Delete">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 4H13M5.5 4V3C5.5 2.44772 5.94772 2 6.5 2H9.5C10.0523 2 10.5 2.44772 10.5 3V4M6.5 7V11.5M9.5 7V11.5M4 4L4.65 12.65C4.7 13.16 5.13 13.56 5.64 13.56H10.36C10.87 13.56 11.3 13.16 11.35 12.65L12 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </li>`;
  }

  function updateStats() {
    const total = tasks.length;
    const done  = tasks.filter(t => t.completed).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

    animateVal(totalCountEl, parseInt(totalCountEl.textContent) || 0, total, 250);
    animateVal(completedEl,  parseInt(completedEl.textContent)  || 0, done,  250);
    progressPctEl.textContent = `${pct}%`;
    progressBar.style.width = `${pct}%`;
  }

  function animateVal(el, from, to, dur) {
    if (from === to) return;
    const range = to - from;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + range * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function updateUI() {
    renderTasks();
    updateStats();
  }

  // ═══════════════════════════════════════════
  //  EVENT HANDLERS
  // ═══════════════════════════════════════════

  // Open modal: Add Task buttons
  addTaskBtn.addEventListener('click', () => openModal('add'));
  emptyAddBtn.addEventListener('click', () => openModal('add'));

  // Close modal
  modalCloseBtn.addEventListener('click', closeModal);
  modalCancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
      closeModal();
    }
  });

  // Form submit (Add or Update)
  taskForm.addEventListener('submit', e => {
    e.preventDefault();

    const title = nameInput.value.trim();
    if (!title) {
      nameInput.focus();
      nameInput.style.animation = 'none';
      nameInput.offsetHeight;
      nameInput.style.animation = 'shake 0.4s ease';
      showToast('warning', 'Task name required', 'Please enter a name for the task.');
      return;
    }

    const dueDate  = dueInput.value || null;
    const reminder = reminderInput.checked;

    if (reminder && !dueDate) {
      showToast('warning', 'Due date required', 'Set a due date to enable reminders.');
      dueInput.focus();
      return;
    }

    if (dueDate && new Date(dueDate) < new Date()) {
      showToast('warning', 'Past due date', 'The due date is in the past.');
    }

    const data = {
      title,
      description: descInput.value,
      category: getActiveCategory(),
      dueDate,
      reminder,
    };

    if (editingTaskId) {
      updateTask(editingTaskId, data);
    } else {
      addTask(data);
    }

    closeModal();
  });

  // Task list delegated clicks
  taskList.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = parseInt(target.dataset.id, 10);

    if (action === 'toggle') {
      toggleTask(id);
    } else if (action === 'delete') {
      deleteTask(id);
    } else if (action === 'edit') {
      const task = tasks.find(t => t.id === id);
      if (task) openModal('edit', task);
    }
  });

  // Checkbox change (keyboard)
  taskList.addEventListener('change', e => {
    if (e.target.dataset.action === 'toggle') {
      toggleTask(parseInt(e.target.dataset.id, 10));
    }
  });

  // Filter tabs
  filterContainer.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    filterContainer.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    renderTasks();
  });

  // ─── Utilities ────────────────────────────
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ─── Init ─────────────────────────────────
  updateUI();

})();
