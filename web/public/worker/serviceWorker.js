const CACHE_NAME = 'vpubfs';

// self.addEventListener('install', function (event) {});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // caches.match() is always resolved
      if (response !== undefined) {
        return response;
      } else {
        return fetch(event.request).then(function (response) {
          return response;
        });
      }
    }),
  );
});
