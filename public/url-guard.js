(function () {
  var PLACEHOLDER_LINK = /^(?:#|https?:\/+#?|https?:\/\/#?)$/i;

  function resolveExternalUrl(raw) {
    if (raw == null) return null;
    var value = String(raw).trim();
    if (!value || PLACEHOLDER_LINK.test(value)) return null;

    if (/^https?:\/+/i.test(value)) {
      try {
        var absolute = new URL(value);
        if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return null;
        if (!absolute.hostname) return null;
        return absolute.href;
      } catch (error) {
        return null;
      }
    }

    try {
      var url = new URL(value, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      if (!url.hostname) return null;
      return url.href;
    } catch (error) {
      return null;
    }
  }

  function isIgnorableOpenError(message) {
    var text = String(message || "");
    return (
      /Failed to execute ['"]open['"] on ['"]Window['"]/i.test(text) &&
      /invalid URL/i.test(text)
    );
  }

  var nativeOpen = window.open;
  window.open = function (url, target, features) {
    var safe = resolveExternalUrl(url);
    if (!safe) return null;
    try {
      return nativeOpen.call(window, safe, target, features);
    } catch (error) {
      console.warn("Blocked window.open for invalid URL:", url, error);
      return null;
    }
  };

  document.addEventListener(
    "click",
    function (event) {
      var anchor =
        event.target && event.target.closest
          ? event.target.closest('a[target="_blank"]')
          : null;
      if (!anchor) return;

      var href = anchor.getAttribute("href");
      // Missing/empty href: let React onClick handlers run (preview/details).
      if (href == null || String(href).trim() === "") return;

      var safe = resolveExternalUrl(href);
      if (!safe) {
        // Block only the navigation; do not stopPropagation so ad click handlers still fire.
        event.preventDefault();
      }
    },
    true
  );

  // Keep the app mounted if a stray invalid open still throws in a WebView.
  window.addEventListener(
    "error",
    function (event) {
      var message =
        (event && event.message) ||
        (event && event.error && event.error.message) ||
        "";
      if (isIgnorableOpenError(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn("Ignored invalid window.open error:", message);
      }
    },
    true
  );
})();
