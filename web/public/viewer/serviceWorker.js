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
          // Response can be used only once:
          // we have to make a clone to the response and put the first copy to the cache, then return the last copy to the client.
          let responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      }
    }),
  );
});
