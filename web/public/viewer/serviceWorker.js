const CACHE_NAME = 'vpubfs';

window.onmessage = function (e) {
  const id = e.data.id;

  try {
    self.caches
      .open(CACHE_NAME)
      .then(function (cache) {
        self.caches.delete(name);
        window.parent.postMessage({id: id, result: 'allowed'}, '*');
      })
      .catch(function (e) {
        window.parent.postMessage(
          {id: id, result: 'denied', name: e.name, message: e.message},
          '*',
        );
      });
  } catch (e) {
    window.parent.postMessage(
      {id: id, result: 'unexpecteddenied', name: e.name, message: e.message},
      '*',
    );
  }
};
