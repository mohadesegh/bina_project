const STORAGE_KEY = "bina_cmd_records_v1";

const CATEGORY_ITEMS = [
	{ key: "under8", label: "کمتر از 8" },
	{ key: "equal8", label: "8" },
	{ key: "between8And10", label: "بین 8 تا 10" },
	{ key: "equal10", label: "10" },
	{ key: "between10And12", label: "بیشتر از 10 تا 12" },
	{ key: "over12", label: "بیشتر از 12" },
];

const numberInput = document.getElementById("numberInput");
const form = document.getElementById("entryForm");
const categoryLabel = document.getElementById("categoryLabel");
const timestampLabel = document.getElementById("timestampLabel");
const recordsTableBody = document.getElementById("recordsTableBody");
const weeklyReport = document.getElementById("weeklyReport");
const clearDataBtn = document.getElementById("clearDataBtn");
const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const currentWeekLabel = document.getElementById("currentWeekLabel");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const submitBtn = form.querySelector(".primary-btn");

let currentWeekStart = getStartOfWeek(new Date());
let editingRecordId = null;

const EMPTY_RECORDS_HTML =
	'<tr class="empty-row"><td colspan="4">هیچ داده‌ای ثبت نشده است.</td></tr>';

function getStorageRecords() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch (error) {
		return [];
	}
}

function saveStorageRecords(records) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDateTime(dateValue) {
	const value = new Date(dateValue);
	return new Intl.DateTimeFormat("fa-IR", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(value);
}

function getCategory(value) {
	if (value < 8) {
		return { key: "under8", label: "کمتر از 8" };
	}

	if (value === 8) {
		return { key: "equal8", label: "8" };
	}

	if (value > 8 && value < 10) {
		return { key: "between8And10", label: "بین 8 تا 10" };
	}

	if (value === 10) {
		return { key: "equal10", label: "10" };
	}

	if (value > 10 && value <= 12) {
		return { key: "between10And12", label: "بیشتر از 10 تا 12" };
	}

	return { key: "over12", label: "بیشتر از 12" };
}

function getStartOfWeek(date) {
	const copy = new Date(date);
	const day = copy.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	copy.setHours(0, 0, 0, 0);
	copy.setDate(copy.getDate() + diff);
	return copy;
}

function getOffsetWeekStart(baseDate, offsetDays) {
	const copy = new Date(baseDate);
	copy.setDate(copy.getDate() + offsetDays * 7);
	return getStartOfWeek(copy);
}

function getWeekKey(date) {
	const start = getStartOfWeek(date);
	return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function formatWeekRange(start, end) {
	const fmt = new Intl.DateTimeFormat("fa-IR", {
		month: "numeric",
		day: "numeric",
	});
	return `${fmt.format(start)} تا ${fmt.format(end)}`;
}

function resetFormState() {
	editingRecordId = null;
	numberInput.value = "";
	submitBtn.textContent = "ثبت و دسته‌بندی";
	cancelEditBtn.hidden = true;
	numberInput.focus();
}

function startEditingRecord(recordId) {
	const record = getStorageRecords().find((item) => item.id === recordId);
	if (!record) {
		return;
	}

	editingRecordId = recordId;
	numberInput.value = record.value;
	submitBtn.textContent = "ذخیره تغییرات";
	cancelEditBtn.hidden = false;
	numberInput.focus();
}

function renderRecords() {
	const records = getStorageRecords().sort(
		(a, b) => new Date(b.timestamp) - new Date(a.timestamp),
	);

	if (!records.length) {
		recordsTableBody.innerHTML = EMPTY_RECORDS_HTML;
		return;
	}

	recordsTableBody.innerHTML = records
		.map(
			(record) => `
        <tr>
          <td data-label="تاریخ و زمان">${formatDateTime(record.timestamp)}</td>
          <td data-label="عدد">${Number(record.value).toFixed(record.value % 1 === 0 ? 0 : 1)}</td>
          <td data-label="دسته‌بندی"><span class="report-tag">${record.category}</span></td>
          <td data-label="عملیات">
            <div class="row-actions">
              <button class="mini-btn edit-btn" type="button" data-id="${record.id}">ویرایش</button>
              <button class="mini-btn danger-btn delete-btn" type="button" data-id="${record.id}">حذف</button>
            </div>
          </td>
        </tr>
      `,
		)
		.join("");
}

function renderWeeklyReport() {
	const records = getStorageRecords();
	const recordsForWeek = records.filter((record) => {
		const date = new Date(record.timestamp);
		return getWeekKey(date) === getWeekKey(currentWeekStart);
	});
	const previousWeekStart = getOffsetWeekStart(currentWeekStart, -1);
	const nextWeekStart = getOffsetWeekStart(currentWeekStart, 1);
	const hasPreviousWeek = records.some(
		(record) =>
			getWeekKey(new Date(record.timestamp)) === getWeekKey(previousWeekStart),
	);
	const hasNextWeek = records.some(
		(record) =>
			getWeekKey(new Date(record.timestamp)) === getWeekKey(nextWeekStart),
	);

	prevWeekBtn.disabled = !hasPreviousWeek;
	nextWeekBtn.disabled = !hasNextWeek;

	const endOfWeek = new Date(currentWeekStart);
	endOfWeek.setDate(currentWeekStart.getDate() + 6);
	currentWeekLabel.textContent = formatWeekRange(currentWeekStart, endOfWeek);

	if (!recordsForWeek.length) {
		weeklyReport.innerHTML =
			'<div class="empty-week">هیچ داده‌ای برای این هفته ثبت نشده است.</div>';
		return;
	}

	const totals = Object.fromEntries(
		CATEGORY_ITEMS.map((item) => [item.key, 0]),
	);
	recordsForWeek.forEach((record) => {
		const key = getCategory(Number(record.value)).key;
		totals[key] += 1;
	});

	const total = CATEGORY_ITEMS.reduce((sum, item) => sum + totals[item.key], 0);

	weeklyReport.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>هفته</th>
          ${CATEGORY_ITEMS.map((item) => `<th>${item.label}</th>`).join("")}
          <th>جمع</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="هفته">${formatWeekRange(currentWeekStart, endOfWeek)}</td>
          ${CATEGORY_ITEMS.map((item) => `<td data-label="${item.label}">${totals[item.key]}</td>`).join("")}
          <td data-label="جمع">${total}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderCurrentClassification(value) {
	const category = getCategory(Number(value));
	categoryLabel.textContent = category.label;
	timestampLabel.textContent = formatDateTime(new Date());
}

function addRecord(value) {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) {
		return;
	}

	const records = getStorageRecords();
	const category = getCategory(numericValue);

	records.push({
		id: crypto.randomUUID
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random()}`,
		value: numericValue,
		category: category.label,
		timestamp: new Date().toISOString(),
	});

	saveStorageRecords(records);
	renderRecords();
	renderWeeklyReport();
	renderCurrentClassification(numericValue);
}

function updateRecord(recordId, value) {
	const records = getStorageRecords();
	const index = records.findIndex((record) => record.id === recordId);
	if (index === -1) {
		return;
	}

	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) {
		return;
	}

	const category = getCategory(numericValue);
	records[index].value = numericValue;
	records[index].category = category.label;
	records[index].timestamp = new Date().toISOString();

	saveStorageRecords(records);
	renderRecords();
	renderWeeklyReport();
	renderCurrentClassification(numericValue);
	resetFormState();
}

function deleteRecord(recordId) {
	const records = getStorageRecords().filter(
		(record) => record.id !== recordId,
	);
	saveStorageRecords(records);

	if (editingRecordId === recordId) {
		resetFormState();
	}

	renderRecords();
	renderWeeklyReport();
	categoryLabel.textContent = "-";
	timestampLabel.textContent = "-";
}

recordsTableBody.addEventListener("click", (event) => {
	const button = event.target.closest("button");
	if (!button) {
		return;
	}

	const recordId = button.dataset.id;
	if (!recordId) {
		return;
	}

	if (button.classList.contains("delete-btn")) {
		if (!window.confirm("آیا مطمئن هستید که این رکورد حذف شود؟")) {
			return;
		}
		deleteRecord(recordId);
		return;
	}

	if (button.classList.contains("edit-btn")) {
		startEditingRecord(recordId);
	}
});

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = numberInput.value.trim();

	if (!value) {
		return;
	}

	if (editingRecordId) {
		updateRecord(editingRecordId, value);
		return;
	}

	addRecord(value);
	numberInput.value = "";
	numberInput.focus();
});

cancelEditBtn.addEventListener("click", () => {
	resetFormState();
});

prevWeekBtn.addEventListener("click", () => {
	currentWeekStart = getOffsetWeekStart(currentWeekStart, -1);
	renderWeeklyReport();
});

nextWeekBtn.addEventListener("click", () => {
	currentWeekStart = getOffsetWeekStart(currentWeekStart, 1);
	renderWeeklyReport();
});

clearDataBtn.addEventListener("click", () => {
	if (
		!window.confirm("آیا مطمئن هستید که می‌خواهید همه داده‌ها را پاک کنید؟")
	) {
		return;
	}

	localStorage.removeItem(STORAGE_KEY);
	recordsTableBody.innerHTML = EMPTY_RECORDS_HTML;
	weeklyReport.innerHTML =
		'<div class="empty-week">هیچ داده‌ای برای این هفته ثبت نشده است.</div>';
	categoryLabel.textContent = "-";
	timestampLabel.textContent = "-";
	currentWeekStart = getStartOfWeek(new Date());
	resetFormState();
	renderWeeklyReport();
});

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("./sw.js").catch(() => {
			// Ignore registration errors; offline behavior still works in browser modes.
		});
	});
}

renderRecords();
renderWeeklyReport();
