(function () {
  function resolveExternalUrl(raw) {
    if (raw == null) return null;
    var value = String(raw).trim();
    if (!value || value === "#") return null;

    try {
      var url = new URL(value, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      if (!url.hostname || url.hostname === "#") return null;
      return url.href;
    } catch (error) {
      if (!/^https?:\/\//i.test(value)) return null;
      if (/^https?:\/\/#?$/i.test(value) || /^https?:\/#$/i.test(value)) return null;
      return value;
    }
  }

  var nativeOpen = window.open;
  window.open = function (url, target, features) {
    var safe = resolveExternalUrl(url);
    if (!safe) return null;
    return nativeOpen.call(window, safe, target, features);
  };

  document.addEventListener(
    "click",
    function (event) {
      var anchor =
        event.target && event.target.closest
          ? event.target.closest('a[target="_blank"]')
          : null;
      if (!anchor) return;

      var safe = resolveExternalUrl(anchor.getAttribute("href"));
      if (!safe) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
})();
