(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const StringUtil = TMS.String = TMS.String || {};

  function slugify(s) {
    s = (s || '');
    return s.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  }

  StringUtil.slugify = slugify;
})(window);
