const CACHE = "bina-cmd-v3";
const ASSETS = [
	"./",
	"./index.html",
	"./styles.css?v=3",
	"./app.js?v=3",
	"./manifest.json",
	"./icon.svg",
];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// Network first, so updates show immediately; cache is the offline fallback.
self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET" || new URL(req.url).origin !== location.origin)
		return;

	event.respondWith(
		fetch(req)
			.then((res) => {
				const copy = res.clone();
				caches.open(CACHE).then((c) => c.put(req, copy));
				return res;
			})
			.catch(() =>
				caches.match(req).then((hit) => hit || caches.match("./index.html")),
			),
	);
});
