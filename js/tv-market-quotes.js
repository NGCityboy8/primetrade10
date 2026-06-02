(function () {
  function configFor(wrap) {
    if (wrap.classList.contains('tv-mq-indices') || wrap.classList.contains('tv-indices-quotes')) {
      return { maxW: 960, height: 330 };
    }
    if (wrap.classList.contains('tv-mq-8')) {
      return { maxW: 680, height: 500 };
    }
    if (wrap.classList.contains('tv-mq-6')) {
      return { maxW: 680, height: 400 };
    }
    return { maxW: 680, height: 440 };
  }

  function fitWrap(wrap) {
    const { maxW, height } = configFor(wrap);
    const w = Math.min(maxW, wrap.clientWidth || maxW);
    wrap.style.height = height + 'px';
    wrap.style.minHeight = height + 'px';
    wrap.style.maxWidth = maxW + 'px';

    const iframe = wrap.querySelector('iframe');
    if (!iframe) return;

    iframe.style.width = w + 'px';
    iframe.style.height = height + 'px';
    iframe.style.maxWidth = '100%';
    iframe.style.marginLeft = 'auto';
    iframe.style.marginRight = 'auto';
    iframe.style.display = 'block';
  }

  function fitAll() {
    document.querySelectorAll('.tv-market-quotes').forEach(fitWrap);
  }

  function start() {
    fitAll();
    window.addEventListener('resize', fitAll);
    let n = 0;
    const poll = setInterval(() => {
      fitAll();
      if (++n > 24) clearInterval(poll);
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
