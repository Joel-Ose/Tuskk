/* ==========================================
   Tusk — Application Logic
   ========================================== */

(function () {
  'use strict';

  // --- State ---
  let tasks = [];
  let currentFilter = 'all';
  let taskIdCounter = 0;

  // --- DOM Elements ---
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const totalCountEl = document.getElementById('total-count');
  const completedCountEl = document.getElementById('completed-count');
  const progressPercentEl = document.getElementById('progress-percent');
  const progressBar = document.getElementById('progress-bar');
  const filterContainer = document.getElementById('tasks-filter');

  // --- Task CRUD ---

  function createTask(title) {
    const task = {
      id: ++taskIdCounter,
      title: title.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    tasks.unshift(task);
    updateUI();
    return task;
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      updateUI();
    }
  }

  function deleteTask(id) {
    const taskEl = document.querySelector(`[data-task-id="${id}"]`);
    if (taskEl) {
      taskEl.classList.add('removing');
      taskEl.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        updateUI();
      }, { once: true });
    } else {
      tasks = tasks.filter(t => t.id !== id);
      updateUI();
    }
  }

  // --- Filtering ---

  function getFilteredTasks() {
    switch (currentFilter) {
      case 'active':
        return tasks.filter(t => !t.completed);
      case 'completed':
        return tasks.filter(t => t.completed);
      default:
        return tasks;
    }
  }

  // --- Rendering ---

  function renderTasks() {
    const filtered = getFilteredTasks();

    // Show/hide empty state
    if (filtered.length === 0) {
      taskList.innerHTML = '';
      emptyState.classList.add('visible');
    } else {
      emptyState.classList.remove('visible');
      taskList.innerHTML = filtered.map(task => createTaskHTML(task)).join('');
    }
  }

  function createTaskHTML(task) {
    const completedClass = task.completed ? ' completed' : '';
    const checkedAttr = task.completed ? ' checked' : '';

    return `
      <li class="task-item${completedClass}" data-task-id="${task.id}" role="listitem">
        <label class="task-checkbox">
          <input
            type="checkbox"
            ${checkedAttr}
            aria-label="Mark '${escapeHTML(task.title)}' as ${task.completed ? 'active' : 'completed'}"
            data-action="toggle"
            data-id="${task.id}"
          />
          <span class="checkmark">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </label>
        <span class="task-title">${escapeHTML(task.title)}</span>
        <button
          class="task-delete"
          data-action="delete"
          data-id="${task.id}"
          aria-label="Delete '${escapeHTML(task.title)}'"
          title="Delete task"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4H13M5.5 4V3C5.5 2.44772 5.94772 2 6.5 2H9.5C10.0523 2 10.5 2.44772 10.5 3V4M6.5 7V11.5M9.5 7V11.5M4 4L4.65 12.65C4.69644 13.1632 5.12917 13.5556 5.64444 13.5556H10.3556C10.8708 13.5556 11.3036 13.1632 11.35 12.65L12 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </li>
    `;
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Animate count changes
    animateValue(totalCountEl, parseInt(totalCountEl.textContent), total, 250);
    animateValue(completedCountEl, parseInt(completedCountEl.textContent), completed, 250);
    progressPercentEl.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
  }

  function animateValue(el, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + range * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function updateUI() {
    renderTasks();
    updateStats();
  }

  // --- Event Handlers ---

  // Form submit
  taskForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) {
      taskInput.focus();
      // Quick shake animation
      taskInput.style.animation = 'none';
      taskInput.offsetHeight; // trigger reflow
      taskInput.style.animation = 'shake 0.4s ease';
      return;
    }
    createTask(title);
    taskInput.value = '';
    taskInput.focus();
  });

  // Task list click delegation
  taskList.addEventListener('click', function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = parseInt(target.dataset.id, 10);

    if (action === 'toggle') {
      toggleTask(id);
    } else if (action === 'delete') {
      deleteTask(id);
    }
  });

  // Handle checkbox change (for keyboard)
  taskList.addEventListener('change', function (e) {
    if (e.target.dataset.action === 'toggle') {
      const id = parseInt(e.target.dataset.id, 10);
      toggleTask(id);
    }
  });

  // Filter buttons
  filterContainer.addEventListener('click', function (e) {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    currentFilter = btn.dataset.filter;

    // Update active state
    filterContainer.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    renderTasks();
  });

  // --- Utilities ---

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Shake animation (injected dynamically) ---
  const shakeStyle = document.createElement('style');
  shakeStyle.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(shakeStyle);

  // --- Initial render ---
  updateUI();
})();
