window.onmessage = function (e: {data: {id: any}}) {
  const id = e.data.id;

  try {
    const name = 'checkallowed';
    self.caches
      .open(name)
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
