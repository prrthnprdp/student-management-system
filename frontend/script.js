/* =============================================================
   StudentHub - script.js
   One JavaScript file shared by all three pages.
   The <body data-page="..."> attribute tells us which page we are on.
   All data comes from the PHP API using fetch().
   ============================================================= */

// Path to the PHP API, relative to the frontend folder
const API_URL = '../backend/api/students.php';

/* ---------------------------------------------------------------
   Small helpers
--------------------------------------------------------------- */
const $ = (selector) => document.querySelector(selector);

/** Escape text before putting it into HTML (prevents XSS). */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Show a small notification in the top-right corner. type: 'success' | 'error' */
function showToast(message, type = 'success') {
  let area = $('.toast-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toast-area';
    area.setAttribute('aria-live', 'polite');
    document.body.appendChild(area);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  area.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/** Save a message to show on the next page (used after redirects). */
function flash(message) {
  try { sessionStorage.setItem('flash', message); } catch (e) { /* ignore */ }
}
function showFlash() {
  try {
    const message = sessionStorage.getItem('flash');
    if (message) {
      sessionStorage.removeItem('flash');
      showToast(message, 'success');
    }
  } catch (e) { /* ignore */ }
}

/**
 * Send a request to the API and return the parsed JSON.
 * Throws an object { message, errors, status } when something goes wrong.
 */
async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkError) {
    throw { message: 'Cannot reach the server. Make sure Apache is running in XAMPP.', errors: {}, status: 0 };
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw { message: 'The server sent an invalid response. Check the PHP files and the XAMPP error log.', errors: {}, status: response.status };
  }

  if (!response.ok || !data.success) {
    throw { message: data.message || 'Request failed', errors: data.errors || {}, status: response.status };
  }
  return data;
}

/** "2004-01-18" -> "18 Jan 2004" */
function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value.replace(' ', 'T'));
  if (isNaN(date)) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Mobile sidebar open/close. */
function setupSidebar() {
  const sidebar = $('#sidebar');
  const backdrop = $('#backdrop');
  const toggle = $('#menuToggle');
  if (!sidebar || !toggle) return;

  const close = () => { sidebar.classList.remove('open'); backdrop.classList.remove('show'); };
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  });
  backdrop.addEventListener('click', close);
}

/* ---------------------------------------------------------------
   Start the right code for the current page
--------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  showFlash();

  const page = document.body.dataset.page;
  if (page === 'dashboard') initDashboard();
  if (page === 'form') initForm();
  if (page === 'details') initDetails();
});

/* ===============================================================
   DASHBOARD PAGE  (index.html)
   =============================================================== */
function initDashboard() {
  const searchInput = $('#searchInput');
  const deptFilter = $('#deptFilter');
  const semFilter = $('#semFilter');
  const tableBody = $('#studentTable');
  let studentsCache = [];        // the rows currently displayed
  let deleteTarget = null;       // student chosen for deletion

  /** Build the query string from the search box and the two filters. */
  function buildQuery() {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (deptFilter.value) params.set('department', deptFilter.value);
    if (semFilter.value) params.set('semester', semFilter.value);
    return params.toString();
  }

  /** GET the list of students and draw the table. */
  async function loadStudents() {
    $('#loadingState').hidden = false;
    $('#emptyState').hidden = true;
    try {
      const query = buildQuery();
      const result = await apiRequest(API_URL + (query ? '?' + query : ''));
      studentsCache = result.data;
      renderTable(studentsCache, query !== '');
    } catch (err) {
      tableBody.innerHTML = '';
      $('#resultCount').textContent = '';
      showToast(err.message, 'error');
    } finally {
      $('#loadingState').hidden = true;
    }
  }

  /** GET the dashboard numbers. */
  async function loadStats() {
    try {
      const query = semFilter.value ? '&semester=' + encodeURIComponent(semFilter.value) : '';
      const { data } = await apiRequest(API_URL + '?stats=1' + query);
      $('#statTotal').textContent = data.total;
      $('#statCse').textContent = data.cse;
      $('#statEce').textContent = data.ece;
      $('#statSem').textContent = data.semester_count;
      $('#statSemLabel').textContent = 'Semester ' + data.semester + ' Students';
      $('#statSemIcon').textContent = 'S' + data.semester;
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /** Draw the table rows (or the empty state). */
  function renderTable(students, isFiltered) {
    if (students.length === 0) {
      tableBody.innerHTML = '';
      $('#emptyState').hidden = false;
      $('#emptyText').textContent = isFiltered
        ? 'No student matches your search or filters. Try changing them.'
        : 'Add your first student to get started.';
      $('#resultCount').textContent = '';
      return;
    }

    tableBody.innerHTML = students.map((s) => `
      <tr>
        <td>${escapeHtml(s.student_id)}</td>
        <td class="name">${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.email)}</td>
        <td>${escapeHtml(s.phone)}</td>
        <td><span class="badge">${escapeHtml(s.department)}</span></td>
        <td>${escapeHtml(s.semester)}</td>
        <td>
          <div class="actions">
            <a class="btn btn-sm btn-ghost" href="student.html?id=${s.id}">View</a>
            <a class="btn btn-sm btn-ghost-neutral" href="add-student.html?id=${s.id}">Edit</a>
            <button class="btn btn-sm btn-ghost-danger" type="button" data-delete="${s.id}">Delete</button>
          </div>
        </td>
      </tr>`).join('');

    $('#resultCount').textContent = `Showing ${students.length} student${students.length === 1 ? '' : 's'}`;
  }

  // ----- Search and filters (update the table without reloading the page) -----
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);                    // wait until the user stops typing
    searchTimer = setTimeout(loadStudents, 300);
  });
  deptFilter.addEventListener('change', loadStudents);
  semFilter.addEventListener('change', () => { loadStudents(); loadStats(); });
  $('#clearFilters').addEventListener('click', () => {
    searchInput.value = ''; deptFilter.value = ''; semFilter.value = '';
    loadStudents(); loadStats();
  });

  // ----- Delete flow: click Delete -> confirm modal -> DELETE request -----
  const modal = $('#deleteModal');
  const closeModal = () => { modal.hidden = true; deleteTarget = null; };

  tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    deleteTarget = studentsCache.find((s) => String(s.id) === button.dataset.delete);
    if (!deleteTarget) return;
    $('#deleteName').textContent = `${deleteTarget.name} (${deleteTarget.student_id})`;
    modal.hidden = false;
    $('#cancelDelete').focus();
  });

  $('#cancelDelete').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  $('#confirmDelete').addEventListener('click', async () => {
    if (!deleteTarget) return;
    const button = $('#confirmDelete');
    button.disabled = true;
    try {
      const result = await apiRequest(`${API_URL}?id=${deleteTarget.id}`, { method: 'DELETE' });
      showToast(result.message, 'success');
      closeModal();
      loadStudents();     // refresh the list
      loadStats();        // refresh the cards
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  // First load
  loadStudents();
  loadStats();
}

/* ===============================================================
   ADD / EDIT FORM PAGE  (add-student.html)
   Add mode:   add-student.html
   Edit mode:  add-student.html?id=3
   =============================================================== */
function initForm() {
  const form = $('#studentForm');
  const fields = ['student_id', 'name', 'email', 'phone', 'department', 'semester', 'gender', 'dob', 'address'];
  const editId = new URLSearchParams(location.search).get('id');

  // A birth date cannot be in the future
  $('#dob').max = new Date().toISOString().split('T')[0];

  /** Show or clear an error message under one field. */
  function setError(field, message) {
    const box = document.querySelector(`[data-error-for="${field}"]`);
    box.textContent = message || '';
    $('#' + field).closest('.field').classList.toggle('has-error', Boolean(message));
  }
  function clearErrors() { fields.forEach((f) => setError(f, '')); }

  /** Read all form values into an object. */
  function getFormData() {
    const data = {};
    fields.forEach((f) => { data[f] = $('#' + f).value.trim(); });
    return data;
  }

  /** Browser-side validation (the server validates again). Returns {field: message}. */
  function validate(d) {
    const errors = {};
    const labels = {
      student_id: 'Student ID', name: 'Full name', email: 'Email', phone: 'Phone',
      department: 'Department', semester: 'Semester', gender: 'Gender', dob: 'Date of birth', address: 'Address',
    };
    fields.forEach((f) => { if (!d[f]) errors[f] = labels[f] + ' is required'; });

    if (!errors.student_id && !/^[A-Za-z0-9-]{3,20}$/.test(d.student_id)) errors.student_id = 'Use 3-20 letters, numbers or hyphens';
    if (!errors.name && !/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(d.name)) errors.name = 'Enter a valid name (letters and spaces only)';
    if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.email = 'Enter a valid email address';
    if (!errors.phone && !/^\+?[0-9]{10,13}$/.test(d.phone.replace(/[\s-]/g, ''))) errors.phone = 'Enter a valid phone number (10-13 digits)';
    if (!errors.dob && new Date(d.dob) > new Date()) errors.dob = 'Date of birth cannot be in the future';
    return errors;
  }

  // Clear a field's error as soon as the user edits it
  fields.forEach((f) => $('#' + f).addEventListener('input', () => setError(f, '')));

  // ----- Edit mode: load the existing student into the form -----
  async function loadForEdit() {
    $('#formTitle').textContent = 'Edit Student';
    $('#formSubtitle').textContent = 'Update the details and save your changes.';
    document.title = 'Edit Student | StudentHub';
    $('#submitBtn').textContent = 'Update student';
    try {
      const { data } = await apiRequest(`${API_URL}?id=${encodeURIComponent(editId)}`);
      fields.forEach((f) => { $('#' + f).value = data[f] ?? ''; });
    } catch (err) {
      showToast(err.message, 'error');
      form.querySelectorAll('input, select, textarea, button').forEach((el) => { el.disabled = true; });
    }
  }
  if (editId) loadForEdit();

  // ----- Submit: POST (add) or PUT (update) -----
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const data = getFormData();
    const errors = validate(data);
    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([f, msg]) => setError(f, msg));
      $('#' + Object.keys(errors)[0]).focus();
      return;
    }

    const button = $('#submitBtn');
    button.disabled = true;
    try {
      const url = editId ? `${API_URL}?id=${encodeURIComponent(editId)}` : API_URL;
      const result = await apiRequest(url, {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      });
      flash(result.message);
      location.href = 'index.html';       // back to the list, which shows the notification
    } catch (err) {
      // Show server-side errors (e.g. duplicate Student ID) under the matching fields
      Object.entries(err.errors || {}).forEach(([f, msg]) => { if (fields.includes(f)) setError(f, msg); });
      showToast(err.message, 'error');
      button.disabled = false;
    }
  });
}

/* ===============================================================
   DETAILS PAGE  (student.html?id=3)
   =============================================================== */
function initDetails() {
  const id = new URLSearchParams(location.search).get('id');

  async function load() {
    try {
      if (!id) throw { message: 'No student selected' };
      const { data: s } = await apiRequest(`${API_URL}?id=${encodeURIComponent(id)}`);

      $('#pInitial').textContent = s.name.charAt(0).toUpperCase();
      $('#pName').textContent = s.name;
      $('#pStudentId').textContent = s.student_id;
      $('#dStudentId').textContent = s.student_id;
      $('#dName').textContent = s.name;
      $('#dEmail').textContent = s.email;
      $('#dPhone').textContent = s.phone;
      $('#dDepartment').textContent = s.department;
      $('#dSemester').textContent = s.semester;
      $('#dGender').textContent = s.gender;
      $('#dDob').textContent = formatDate(s.dob);
      $('#dAddress').textContent = s.address;
      $('#dCreated').textContent = formatDate(s.created_at);
      $('#editBtn').href = 'add-student.html?id=' + s.id;

      $('#detailsLoading').hidden = true;
      $('#profile').hidden = false;
    } catch (err) {
      $('#detailsLoading').textContent = err.message || 'Could not load the student.';
      showToast(err.message || 'Could not load the student.', 'error');
    }
  }
  load();
}
