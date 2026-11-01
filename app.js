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

const EMPTY_RECORDS_HTML =
	'<tr class="empty-row"><td colspan="3">هیچ داده‌ای ثبت نشده است.</td></tr>';

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
        </tr>
      `,
		)
		.join("");
}

function getStartOfWeek(date) {
	const copy = new Date(date);
	const day = copy.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	copy.setHours(0, 0, 0, 0);
	copy.setDate(copy.getDate() + diff);
	return copy;
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

function renderWeeklyReport() {
	const records = getStorageRecords();

	if (!records.length) {
		weeklyReport.innerHTML = "<p>هنوز گزارشی برای هفته جاری وجود ندارد.</p>";
		return;
	}

	const map = new Map();

	records.forEach((record) => {
		const date = new Date(record.timestamp);
		const weekKey = getWeekKey(date);

		if (!map.has(weekKey)) {
			const start = getStartOfWeek(date);
			const end = new Date(start);
			end.setDate(start.getDate() + 6);
			map.set(weekKey, {
				start,
				end,
				totals: Object.fromEntries(CATEGORY_ITEMS.map((item) => [item.key, 0])),
			});
		}

		const bucket = map.get(weekKey);
		const key = getCategory(Number(record.value)).key;
		bucket.totals[key] += 1;
	});

	const rows = [...map.values()]
		.sort((a, b) => b.start - a.start)
		.map((data) => {
			const total = CATEGORY_ITEMS.reduce(
				(sum, item) => sum + data.totals[item.key],
				0,
			);
			return `
        <tr>
          <td data-label="هفته">${formatWeekRange(data.start, data.end)}</td>
          ${CATEGORY_ITEMS.map((item) => `<td data-label="${item.label}">${data.totals[item.key]}</td>`).join("")}
          <td data-label="جمع">${total}</td>
        </tr>
      `;
		})
		.join("");

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
        ${rows || '<tr><td colspan="8">هیچ داده‌ای وجود ندارد.</td></tr>'}
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

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = numberInput.value.trim();

	if (!value) {
		return;
	}

	addRecord(value);
	numberInput.value = "";
	numberInput.focus();
});

clearDataBtn.addEventListener("click", () => {
	if (
		!window.confirm("آیا مطمئن هستید که می‌خواهید همه داده‌ها را پاک کنید؟")
	) {
		return;
	}

	localStorage.removeItem(STORAGE_KEY);
	recordsTableBody.innerHTML = EMPTY_RECORDS_HTML;
	weeklyReport.innerHTML = "<p>هنوز گزارشی برای هفته جاری وجود ندارد.</p>";
	categoryLabel.textContent = "-";
	timestampLabel.textContent = "-";
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
