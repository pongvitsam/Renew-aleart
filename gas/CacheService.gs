var PayloadCache = (function () {
  var KEY = 'payload_v1';
  var TTL = 600;

  function get() {
    var raw = CacheService.getScriptCache().get(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function set(payload) {
    CacheService.getScriptCache().put(KEY, JSON.stringify(payload), TTL);
  }

  function clear() {
    CacheService.getScriptCache().remove(KEY);
  }

  return { get: get, set: set, clear: clear };
})();
