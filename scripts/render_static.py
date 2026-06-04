#!/usr/bin/env python3
"""Generate self-contained Bootstrap marketing pages (no fetch partials)."""
import html
import json
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
T = "d" + "iv"  # HTML container tag name
LOGO_SRC = "assets/images/logo.png"
CERTIFICATE_SRC = "assets/images/cert.png"

THEME_INIT = """<script>
(function(){var k="ptc-theme",s=localStorage.getItem(k),m=window.matchMedia("(prefers-color-scheme: light)").matches,t=s||(m?"light":"dark");document.documentElement.setAttribute("data-theme",t),document.documentElement.style.colorScheme=t})();
</script>"""


def tags(html: str) -> str:
    """Expand <{T}> placeholders in non–f-string templates."""
    return html.replace("<{T}", f"<{T}").replace("</{T}>", f"</{T}>")


CRYPTO_MQ_ROWS = [
    {"name": "Bitcoin", "cg": "bitcoin"},
    {"name": "Ethereum", "cg": "ethereum"},
    {"name": "Solana", "cg": "solana"},
    {"name": "XRP", "cg": "ripple"},
    {"name": "Cardano", "cg": "cardano"},
    {"name": "Dogecoin", "cg": "dogecoin"},
]

TRENDING_MQ_ROWS = [
    {"name": "Tesla", "yahoo": "TSLA"},
    {"name": "GameStop", "yahoo": "GME"},
    {"name": "Netflix", "yahoo": "NFLX"},
    {"name": "Meta", "yahoo": "META"},
    {"name": "Alibaba", "yahoo": "BABA"},
    {"name": "Apple", "yahoo": "AAPL"},
    {"name": "McDonald's", "yahoo": "MCD"},
    {"name": "Germany 40", "yahoo": "^GDAXI"},
]


def mq_table_panel(rows, extra_class=""):
    n = len(rows)
    sk = "".join(
        f'<tr class="mq-skeleton-row"><td colspan="8"><span class="sk-line sk-w-80"></span></td></tr>'
        for _ in range(n)
    )
    rows_attr = html.escape(json.dumps(rows), quote=True)
    cls = f"mq-table-panel {extra_class}".strip()
    return f"""<{T} class="{cls}" data-mq-rows="{rows_attr}">
          <{T} class="mq-table-scroll">
            <table class="mq-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th class="num">Value</th>
                  <th class="num">Change</th>
                  <th class="num">Chg%</th>
                  <th class="num">Open</th>
                  <th class="num">High</th>
                  <th class="num">Low</th>
                  <th class="num">Prev</th>
                </tr>
              </thead>
              <tbody class="mq-tbody">{sk}</tbody>
            </table>
          </{T}>
        </{T}>"""

# TradingView widgets — live data & charts (https://www.tradingview.com/widget-docs/)
TV_TAPE = """
<div class="tv-tape-bar">
  <div class="tradingview-widget-container">
    <div class="tradingview-widget-container__widget"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js" async>
{
  "symbols": [
    { "proName": "BINANCE:BTCUSDT", "title": "BTC" },
    { "proName": "BINANCE:ETHUSDT", "title": "ETH" },
    { "proName": "FOREXCOM:EURUSD", "title": "EUR/USD" },
    { "proName": "FOREXCOM:GBPUSD", "title": "GBP/USD" },
    { "proName": "FOREXCOM:XAUUSD", "title": "Gold" },
    { "proName": "CAPITALCOM:OIL_CRUDE", "title": "WTI" },
    { "proName": "NASDAQ:TSLA", "title": "TSLA" },
    { "proName": "OANDA:SPX500USD", "title": "US500" }
  ],
  "showSymbolLogo": true,
  "colorTheme": "dark",
  "isTransparent": true,
  "displayMode": "compact",
  "locale": "en"
}
    </script>
  </div>
</div>
"""

TV_HOME_CHART = f"""
    <section class="section-darker py-5">
      <{T} class="container">
        <{T} class="section-heading-wrap">
          <h2 class="section-title">Live chart — Bitcoin / USDT</h2>
          <p class="text-muted-ptc mb-0">Interactive chart powered by TradingView</p>
          <{T} class="section-divider"></{T}>
        </{T}>
        <{T} class="tv-widget-wrap tv-h-440">
          <{T} class="tradingview-widget-container" style="height:100%;width:100%">
            <{T} class="tradingview-widget-container__widget" style="height:100%;width:100%"></{T}>
            <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
{{
  "autosize": true,
  "symbol": "BINANCE:BTCUSDT",
  "interval": "D",
  "timezone": "Etc/UTC",
  "theme": "dark",
  "style": "1",
  "locale": "en",
  "enable_publishing": false,
  "allow_symbol_change": true,
  "calendar": false,
  "support_host": "https://www.tradingview.com"
}}
            </script>
          </{T}>
        </{T}>
        <p class="tv-caption text-center">Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a></p>
      </{T}>
    </section>
"""

TV_PLATFORM_CHART = f"""
    <section class="section-darker py-5">
      <{T} class="container">
        <{T} class="section-heading-wrap">
          <h2 class="section-title">Try the chart — EUR/USD</h2>
          <p class="text-muted-ptc mb-0">Same charting experience as MetaTrader integrations</p>
          <{T} class="section-divider"></{T}>
        </{T}>
        <{T} class="tv-widget-wrap tv-h-440">
          <{T} class="tradingview-widget-container" style="height:100%;width:100%">
            <{T} class="tradingview-widget-container__widget" style="height:100%;width:100%"></{T}>
            <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
{{
  "autosize": true,
  "symbol": "FOREXCOM:EURUSD",
  "interval": "60",
  "timezone": "Etc/UTC",
  "theme": "dark",
  "style": "1",
  "locale": "en",
  "enable_publishing": false,
  "allow_symbol_change": true,
  "calendar": false,
  "support_host": "https://www.tradingview.com"
}}
            </script>
          </{T}>
        </{T}>
        <p class="tv-caption text-center">Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a></p>
      </{T}>
    </section>
"""

TV_CRYPTO_MARKET = f"""
      <{T} class="section-darker py-5">
        <{T} class="container">
          <{T} class="section-heading-wrap">
            <h2 class="section-title">Cryptocurrency quotes</h2>
            <p class="text-muted-ptc mb-0">Live prices — updated regularly</p>
            <{T} class="section-divider"></{T}>
          </{T}>
          {mq_table_panel(CRYPTO_MQ_ROWS)}
          <p class="tv-caption text-center">Prices via <a href="https://www.coingecko.com/" target="_blank" rel="noopener nofollow">CoinGecko</a></p>
        </{T}>
      </{T}>
"""

TV_FOREX_RATES = f"""
      <{T} class="section-darker py-5">
        <{T} class="container">
          <{T} class="section-heading-wrap">
            <h2 class="section-title">Forex cross rates</h2>
            <p class="text-muted-ptc mb-0">Live FX matrix — TradingView</p>
            <{T} class="section-divider"></{T}>
          </{T}>
          <{T} class="tv-widget-wrap tv-h-560">
            <{T} class="tradingview-widget-container" style="height:100%;width:100%">
              <{T} class="tradingview-widget-container__widget" style="height:100%;width:100%"></{T}>
              <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js" async>
{{
  "width": "100%",
  "height": "100%",
  "currencies": ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD", "CNY"],
  "isTransparent": false,
  "colorTheme": "dark",
  "locale": "en"
}}
              </script>
            </{T}>
          </{T}>
          <p class="tv-caption text-center">Data by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a></p>
        </{T}>
      </{T}>
"""

TV_STOCKS_HOTLIST = f"""
      <{T} class="section-darker py-5">
        <{T} class="container">
          <{T} class="section-heading-wrap">
            <h2 class="section-title">US stock movers</h2>
            <p class="text-muted-ptc mb-0">Live market movers — TradingView</p>
            <{T} class="section-divider"></{T}>
          </{T}>
          <{T} class="tv-widget-wrap tv-h-600">
            <{T} class="tradingview-widget-container" style="height:100%;width:100%">
              <{T} class="tradingview-widget-container__widget" style="height:100%;width:100%"></{T}>
              <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js" async>
{{
  "colorTheme": "dark",
  "dateRange": "1D",
  "exchange": "US",
  "countDown": false,
  "locale": "en",
  "largeChartUrl": "",
  "isTransparent": true,
  "showSymbolLogo": true,
  "showFloatingTooltip": false,
  "width": "100%",
  "height": "100%",
  "autosize": true,
  "fontFamily": "Inter, Trebuchet MS, sans-serif"
}}
              </script>
            </{T}>
          </{T}>
          <p class="tv-caption text-center">Data by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a></p>
        </{T}>
      </{T}>
"""

def tv_single_quote(tv_symbol: str, height: int = 130) -> str:
    return f"""<div class="tv-single-quote">
            <div class="tradingview-widget-container" style="height:100%;width:100%">
              <motion class="tradingview-widget-container__widget" style="height:100%;width:100%"></motion>
              <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js" async>
{{
  "symbol": "{tv_symbol}",
  "colorTheme": "dark",
  "isTransparent": true,
  "locale": "en",
  "width": "100%"
}}
              </script>
            </div>
          </div>""".replace("<motion", f"<{T}").replace("</motion>", f"</{T}>")


FEATURED_STOCK_CARDS = [
    ("NASDAQ:NFLX", "Netflix", "NFLX", "#141414"),
    ("NYSE:SPOT", "Spotify", "SPOT", "#1DB954"),
    ("NASDAQ:TSLA", "Tesla", "TSLA", "#E82127"),
    ("NASDAQ:META", "Meta", "META", "#1877F2"),
    ("NASDAQ:AMZN", "Amazon", "AMZN", "#FF9900"),
    ("NASDAQ:GOOGL", "Google", "GOOGL", "#1a1a2e"),
]

STOCK_FEATURED_GRID = "".join(
    f"""<div class="col-6 col-md-4">
          <a href="markets/shares.html" class="stock-feature-card" style="--card-bg:{color}">
            <span class="stock-feature-invest">Invest</span>
            <span class="stock-feature-tag">Stocks</span>
            <span class="stock-feature-live" aria-hidden="true"></span>
            {tv_single_quote(tv)}
            <div class="stock-feature-footer">
              <h3>{name}</h3>
              <span class="stock-feature-symbol">{sym}</span>
            </div>
          </a>
        </div>"""
    for tv, name, sym, color in FEATURED_STOCK_CARDS
)

TV_US_TRENDING_QUOTES = f"""
        {mq_table_panel(TRENDING_MQ_ROWS, "trending-mq-quotes")}
        <p class="tv-caption text-center mb-0">Live quotes — market data providers</p>
"""

TV_INDICES_QUOTES = f"""
      <{T} class="section-darker py-5">
        <{T} class="container">
          <{T} class="section-heading-wrap">
            <h2 class="section-title">Major indices</h2>
            <p class="text-muted-ptc mb-0">Global benchmarks — TradingView</p>
            <{T} class="section-divider"></{T}>
          </{T}>
          <{T} class="tv-widget-wrap tv-market-quotes tv-mq-indices tv-indices-quotes">
            <{T} class="tradingview-widget-container" style="height:100%;width:100%">
              <{T} class="tradingview-widget-container__widget" style="height:100%;width:100%"></{T}>
              <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js" async>
{{
  "width": 960,
  "height": 330,
  "symbolsGroups": [
    {{
      "name": "Indices",
      "symbols": [
        {{ "name": "CAPITALCOM:US100", "displayName": "US Tech 100" }},
        {{ "name": "CAPITALCOM:US500", "displayName": "US 500" }},
        {{ "name": "CAPITALCOM:UK100", "displayName": "UK 100" }},
        {{ "name": "CAPITALCOM:GER40", "displayName": "Germany 40" }},
        {{ "name": "CAPITALCOM:J225", "displayName": "Japan 225" }},
        {{ "name": "CAPITALCOM:HK50", "displayName": "Hong Kong 50" }}
      ]
    }}
  ],
  "showSymbolLogo": true,
  "colorTheme": "dark",
  "isTransparent": true,
  "locale": "en"
}}
              </script>
            </{T}>
          </{T}>
          <p class="tv-caption text-center">Quotes by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a></p>
        </{T}>
      </{T}>
"""


def nav(base: str, active: str = "") -> str:
    def act(key):
        return " active" if active == key else ""

    markets_open = active in ("cryptocurrencies", "forex", "shares", "indices")
    trading_open = active in ("platform", "pricing", "faq", "swaps", "spreads", "specs")

    return f"""
<nav class="navbar navbar-expand-lg navbar-dark navbar-ptc sticky-top">
  <{T} class="container">
    <a class="navbar-brand d-flex align-items-center gap-2" href="{base}index.html">
      <img class="site-logo" src="{base}{LOGO_SRC}" alt="" width="72" height="72" />
      <span class="site-logo-text">Prime Trade Capitals</span>
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <{T} class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
        <li class="nav-item"><a class="nav-link{act('home')}" href="{base}index.html">Home</a></li>
        <li class="nav-item"><a class="nav-link{act('about')}" href="{base}about.html">About Us</a></li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle{' active' if markets_open else ''}" href="#" data-bs-toggle="dropdown">Markets</a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item{' active' if active == 'cryptocurrencies' else ''}" href="{base}markets/cryptocurrencies.html">Cryptocurrencies</a></li>
            <li><a class="dropdown-item{' active' if active == 'forex' else ''}" href="{base}markets/forex.html">Forex Trading</a></li>
            <li><a class="dropdown-item{' active' if active == 'shares' else ''}" href="{base}markets/shares.html">Shares</a></li>
            <li><a class="dropdown-item{' active' if active == 'indices' else ''}" href="{base}markets/indices.html">Indices</a></li>
          </ul>
        </li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle{' active' if trading_open else ''}" href="#" data-bs-toggle="dropdown">Trading Info</a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item{' active' if active == 'platform' else ''}" href="{base}platform.html">Platform</a></li>
            <li><a class="dropdown-item{' active' if active == 'swaps' else ''}" href="{base}swaps.html">Swaps</a></li>
            <li><a class="dropdown-item{' active' if active == 'spreads' else ''}" href="{base}spreads-commissions.html">Spreads and Commissions</a></li>
            <li><a class="dropdown-item{' active' if active == 'specs' else ''}" href="{base}trading-specifications.html">Trading Specifications</a></li>
            <li><a class="dropdown-item{' active' if active == 'pricing' else ''}" href="{base}pricing.html">Pricing</a></li>
            <li><a class="dropdown-item{' active' if active == 'faq' else ''}" href="{base}faq.html">Help Centre / FAQ</a></li>
          </ul>
        </li>
        <li class="nav-item"><a class="nav-link{act('contact')}" href="{base}contact.html">Contact</a></li>
      </ul>
      <{T} class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-theme-toggle" data-theme-toggle aria-label="Switch to light mode" title="Switch to light mode">
          <i class="bi bi-sun-fill theme-icon-light" aria-hidden="true"></i>
          <i class="bi bi-moon-fill theme-icon-dark" aria-hidden="true"></i>
        </button>
        <a class="nav-link px-2" href="{base}auth/login.html">Login</a>
        <a class="btn btn-gradient btn-sm" href="{base}auth/register.html">Register Now</a>
      </{T}>
    </{T}>
  </{T}>
</nav>
"""


def footer(base: str) -> str:
    sections = [
        ("MARKETS", [("Forex", "markets/forex.html"), ("Cryptos", "markets/cryptocurrencies.html"), ("Shares", "markets/shares.html"), ("Indices", "markets/indices.html")]),
        ("TRADING", [("Platform", "platform.html"), ("Pricing", "pricing.html"), ("Help Centre/FAQ", "faq.html")]),
        ("COMPANY", [("About Us", "about.html"), ("Contact Us", "contact.html")]),
        ("ACCOUNT", [("Login", "auth/login.html"), ("Sign Up", "auth/register.html")]),
        ("LEGAL", [("Privacy Policy", "legal/privacy-policy.html"), ("Terms of Service", "legal/terms.html"), ("Company Certificate", "legal/company-certificate.html")]),
    ]
    cols = []
    for title, links in sections:
        lis = "".join(f"<li><a href=\"{base}{h}\">{n}</a></li>" for n, h in links)
        cols.append(f'<{T} class="col-6 col-md-3 col-lg-2"><h5>{title}</h5><ul>{lis}</ul></{T}>')
    body = f"""
<footer class="footer-ptc">
  <{T} class="container">
    <{T} class="row g-4">{"".join(cols)}</{T}>
    <p class="footer-disclaimer mb-2"><strong>Address:</strong> 18/2 Royston Mains Street, Edinburgh, Scotland, EH5 1LB</p>
    <p class="footer-disclaimer small">This website can be accessed worldwide however the information on the website is related to Prime Trade Capitals A/S. All clients engage with Prime Trade Capitals A/S, incorporated in Denmark (CVR 37 12 74 07), Hammerensgade 1, 1267 Copenhagen K, Denmark.</p>
    <p class="footer-disclaimer small">Forex and CFDs are leveraged products and can result in losses that exceed your deposits. Please ensure you fully understand all of the risks.</p>
    <p class="footer-disclaimer mb-0 text-center mt-3">Copyright &copy; Prime Trade Capitals. All Rights Reserved.</p>
  </{T}>
</footer>
"""
    return body


def shell(title, base, active, body, coingecko=False, tv_tape=False, stocks=False, contact_form=False, mq_table=False, tv_market_quotes=False):
    tape = TV_TAPE if tv_tape else ""
    scripts = []
    if coingecko:
        scripts.append(f'<script src="{base}js/market-ticker.js"></script>')
    if stocks:
        scripts.append(f'<script src="{base}js/stock-widgets.js"></script>')
    if mq_table:
        scripts.append(f'<script src="{base}js/market-quotes-table.js"></script>')
    if tv_market_quotes:
        scripts.append(f'<script src="{base}js/tv-market-quotes.js"></script>')
    if contact_form:
        scripts.append(f'<script src="{base}js/config.js"></script>')
        scripts.append('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>')
        scripts.append(f'<script src="{base}js/supabase.js"></script>')
        scripts.append(f'<script src="{base}js/contact-form.js"></script>')
    extra_js = "\n  ".join(scripts)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Prime Trade Capitals</title>
  <link rel="icon" type="image/png" href="{base}assets/images/logo.png" />
  <link rel="apple-touch-icon" href="{base}assets/images/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="{base}css/theme.css" rel="stylesheet" />
  {THEME_INIT}
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  {nav(base, active)}
  {tape}
  <main id="main">
{body}
  </main>
  {footer(base)}
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="{base}js/theme.js"></script>
  {extra_js}
</body>
</html>"""


def hero(title, subtitle="", *, heading_id=""):
    sub = f'<p class="text-muted-ptc lead mt-2">{subtitle}</p>' if subtitle else ""
    h1_id = f' id="{heading_id}"' if heading_id else ""
    return f"""
    <section class="page-hero">
      <{T} class="container"><h1{h1_id}>{title}</h1>{sub}</{T}>
    </section>
"""


INDEX = f"""
    <section class="hero-section">
      <{T} class="container">
        <{T} class="row align-items-center">
          <{T} class="col-lg-7">
            <span class="hero-badge">Trade and Invest in STOCKS, CRYPTO, FOREX , GOLD, and other Assets.</span>
            <h1 class="hero-title">A World-Class Trading Experience</h1>
            <p class="hero-subtitle">Unlock empowered trading with cutting-edge tools, expert support, and top-tier security.</p>
            <{T} class="d-flex flex-wrap gap-3 mt-4">
              <a href="auth/register.html" class="btn btn-gradient btn-lg">Create an Account</a>
              <a href="auth/login.html" class="btn btn-outline-light-ptc btn-lg">Login</a>
            </{T}>
          </{T}>
          <{T} class="col-lg-5 mt-4 mt-lg-0">
            <{T} class="market-widget">
              <h3>Live crypto</h3>
              <p class="text-muted-ptc small mb-2">Spot prices from CoinGecko · refreshes every minute</p>
              <{T} id="market-ticker"><p class="text-muted-ptc small mb-0">Loading markets...</p></{T}>
            </{T}>
          </{T}>
        </{T}>
      </{T}>
    </section>
    <section class="section-darker py-5">
      <{T} class="container">
        <{T} class="section-heading-wrap">
          <h2 class="section-title">Trade the coins of the future</h2>
          <{T} class="section-divider"></{T}>
        </{T}>
        <{T} class="row g-4 mt-2 justify-content-center">
          <{T} class="col-md-3"><{T} class="card-ptc text-center p-4 card-feature"><{T} class="feature-icon"><i class="bi bi-grid-3x3-gap" aria-hidden="true"></i></{T}><h4>Lots of Options</h4></{T}></{T}>
          <{T} class="col-md-3"><{T} class="card-ptc text-center p-4 card-feature"><{T} class="feature-icon"><i class="bi bi-receipt" aria-hidden="true"></i></{T}><h4>No Hidden Fees</h4></{T}></{T}>
          <{T} class="col-md-3"><{T} class="card-ptc text-center p-4 card-feature"><{T} class="feature-icon"><i class="bi bi-shield-check" aria-hidden="true"></i></{T}><h4>Safety First</h4></{T}></{T}>
          <{T} class="col-md-3"><{T} class="card-ptc text-center p-4 card-feature"><{T} class="feature-icon"><i class="bi bi-currency-bitcoin" aria-hidden="true"></i></{T}><h4>Cryptos and Fiat Currencies</h4></{T}></{T}>
        </{T}>
      </{T}>
    </section>
    <section class="section-dark py-5">
      <{T} class="container">
        <h2 class="section-title text-center mb-4">Markets we offer</h2>
        <{T} class="row g-3 text-center">
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Forex</h4></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Stocks</h4></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Commodities</h4></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Cryptocurrencies</h4></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Indices</h4></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>ETFs</h4></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Bonds</h4></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>FxOptions</h4></{T}></{T}>
        </{T}>
      </{T}>
    </section>
    <section class="section-darker py-5">
      <{T} class="container text-center">
        <h2 class="section-title">Trading Conditions &amp; Charges</h2>
        <ul class="list-unstyled mt-3 text-muted-ptc"><li>Zero fees</li><li>No commissions</li><li>Up to 400:1 leverage</li><li>Instant execution</li></ul>
      </{T}>
    </section>
    <section class="section-dark py-5" id="stocks-showcase">
      <{T} class="container">
        <{T} class="section-heading-wrap text-center">
          <h2 class="section-title">Discover Top-performing Stocks</h2>
          <p class="text-muted-ptc mb-0">Live quotes powered by TradingView</p>
          <{T} class="section-divider"></{T}>
        </{T}>
        <{T} class="row g-3 mt-3">{STOCK_FEATURED_GRID}</{T}>
        <h2 class="section-title text-center mt-5 mb-2">Trending Stocks</h2>
        <p class="text-center text-muted-ptc mb-4">Discover the most popular Stocks available on Prime Trade Capitals</p>
        <{T} class="trending-stocks-panel trending-stocks-panel--tv card-ptc p-3">{TV_US_TRENDING_QUOTES}</{T}>
      </{T}>
    </section>
    {TV_HOME_CHART}
    <section class="section-darker py-5" id="plans">
      <{T} class="container">
        <h2 class="section-title text-center">Trading Packages</h2>
        <p class="text-center text-muted-ptc mb-4">Invest in Crypto, Forex, NFT, and other Assets.</p>
        <{T} class="row g-4">
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card h-100"><h3 class="plan-name">Basic Plan</h3><ul><li>Min. Deposit: $1,000</li><li>Max. Deposit: $4,999</li><li>Trade Duration: 14 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card featured h-100"><h3 class="plan-name">Silver Plan</h3><ul><li>Min. Deposit: $5,000</li><li>Max. Deposit: $9,999</li><li>Trade Duration: 21 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card h-100"><h3 class="plan-name">Gold Plan</h3><ul><li>Min. Deposit: $10,000</li><li>Max. Deposit: $49,999</li><li>Trade Duration: 60 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card h-100"><h3 class="plan-name">Platinum Plan</h3><ul><li>Min. Deposit: $50,000</li><li>Max. Deposit: $100,000</li><li>Trade Duration: 60 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
        </{T}>
      </{T}>
    </section>
    <section class="section-dark py-5">
      <{T} class="container text-center">
        <h2 class="section-title">Switch to Prime Trade Capitals</h2>
        <p class="text-muted-ptc mx-auto" style="max-width:800px">At Prime Trade Capitals we work hard to enhance your trading experience. As a global, 5 star rated broker, our client's satisfaction is in the center of our focus.</p>
        <{T} class="row g-4 mt-4 text-start">
          <{T} class="col-md-4"><{T} class="card-ptc h-100"><h4>2100+ instruments</h4><p class="text-muted-ptc small mb-0">Wide range of global markets, including Forex, Indices, Commodities, ETFs and more.</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc h-100"><h4>Safe &amp; Secure</h4><p class="text-muted-ptc small mb-0">Regulated by major supervision authorities, including the Financial Conduct Authority.</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc h-100"><h4>Comprehensive education</h4><p class="text-muted-ptc small mb-0">Extensive video library to learn more about trading.</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc h-100"><h4>Innovative platform</h4><p class="text-muted-ptc small mb-0">Constantly improving our trading platform.</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc h-100"><h4>450,000+ customers</h4><p class="text-muted-ptc small mb-0">Years of activity in financial markets with thousands of customers worldwide.</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc h-100"><h4>Fast &amp; highly qualified support</h4><p class="text-muted-ptc small mb-0">Multilingual customer support 24 hours a day.</p></{T}></{T}>
        </{T}>
      </{T}>
    </section>
    <section class="section-darker py-5">
      <{T} class="container">
        <h2 class="section-title text-center">Trusted for more than 7 years</h2>
        <p class="text-muted-ptc">Prime Trade Capitals operates as an international digital trading management platform offering automated, algorithm-driven financial services and diversified investment opportunities in Forex and Capital markets.</p>
        <h3 class="mt-4 text-center">Multi-award winner</h3>
        <{T} class="row g-3 mt-3 text-center">
          <{T} class="col-md-4"><{T} class="card-ptc"><h4>Best CFD Broker</h4><p class="text-muted-ptc small">TradeON Summit</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc"><h4>Best Trading Experience</h4><p class="text-muted-ptc small">Jordan Forex EXPO</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc"><h4>Best Execution Broker</h4><p class="text-muted-ptc small">Forex EXPO Dubai</p></{T}></{T}>
        </{T}>
      </{T}>
    </section>
    <section class="section-dark py-5">
      <{T} class="container">
        <h2 class="section-title text-center">Four Steps to Get Started</h2>
        <{T} class="row g-4 mt-3">
          <{T} class="col-md-3"><{T} class="step-card"><span class="step-number">1</span><h4>Registration</h4><p class="text-muted-ptc small">Open your live trading account after registration</p></{T}></{T}>
          <{T} class="col-md-3"><{T} class="step-card"><span class="step-number">2</span><h4>Verify</h4><p class="text-muted-ptc small">Upload your documents to activate your account</p></{T}></{T}>
          <{T} class="col-md-3"><{T} class="step-card"><span class="step-number">3</span><h4>Fund</h4><p class="text-muted-ptc small">Log in and make a deposit</p></{T}></{T}>
          <{T} class="col-md-3"><{T} class="step-card"><span class="step-number">4</span><h4>Trade</h4><p class="text-muted-ptc small">Trade using over 250 different trading tools</p></{T}></{T}>
        </{T}>
        <p class="text-center mt-5 h5">Connect with over 450,000 investors in the world's leading investment company</p>
        <p class="text-center"><a href="auth/register.html" class="btn btn-gradient btn-lg">Register Now</a></p>
      </{T}>
    </section>
"""


def sec(inner, darker=False):
    cls = "section-darker" if darker else "section-dark"
    return f'    <section class="{cls} py-5">\n      <{T} class="container">\n{inner}\n      </{T}>\n    </section>\n'


def sec_legal(inner: str) -> str:
    return (
        f'    <section class="section-dark py-5 legal-page-section">\n'
        f'      <{T} class="container legal-page-container">\n'
        f"{inner}\n"
        f"      </{T}>\n"
        f"    </section>\n"
    )


def _legal_indent_block(fragment: str, spaces: int = 12) -> str:
    clean = textwrap.dedent(fragment).strip()
    pad = " " * spaces
    return "\n".join(f"{pad}{line}" if line.strip() else "" for line in clean.splitlines())


def legal_section_block(section_id: str, num: int, title: str, icon: str, body_html: str) -> str:
    body = _legal_indent_block(body_html, 12)
    safe_title = html.escape(title)
    return f"""        <article id="{section_id}" class="legal-section card-ptc">
          <header class="legal-section-header">
            <span class="legal-section-num" aria-hidden="true">{num:02d}</span>
            <{T} class="legal-section-heading">
              <i class="bi bi-{icon}" aria-hidden="true"></i>
              <h2 class="h4 mb-0">{safe_title}</h2>
            </{T}>
          </header>
          <{T} class="legal-section-body">
{body}
          </{T}>
        </article>"""


def legal_document(intro_html: str, sections: list, *, base: str = "") -> str:
    toc = "\n".join(
        f'                <li><a href="#{sid}"><span class="legal-toc-num">{num:02d}</span>{html.escape(title)}</a></li>'
        for sid, num, title, _icon, _body in sections
    )
    blocks = "\n".join(
        legal_section_block(sid, num, title, icon, body) for sid, num, title, icon, body in sections
    )
    intro = _legal_indent_block(intro_html, 12)
    return f"""        <{T} class="legal-doc-meta card-ptc mb-4">
          <{T} class="row g-3 align-items-center">
            <{T} class="col-12">
              <span class="legal-meta-label">Entity</span>
              <span class="legal-meta-value">Prime Trade Capitals A/S · CVR 37 12 74 07 · Hammerensgade 1, 1267 Copenhagen K, Denmark</span>
            </{T}>
          </{T}>
        </{T}>
        <{T} class="row g-4 align-items-start legal-doc-layout">
          <aside class="col-lg-4 col-xl-3">
            <nav class="legal-toc card-ptc" aria-label="Table of contents">
              <p class="legal-toc-title" id="legal-toc-label">On this page</p>
              <ol class="legal-toc-list" aria-labelledby="legal-toc-label">
{toc}
              </ol>
            </nav>
          </aside>
          <{T} class="col-lg-8 col-xl-9 legal-doc-main">
            <{T} class="legal-intro card-ptc mb-4">
{intro}
            </{T}>
            <{T} class="legal-sections">
{blocks}
            </{T}>
            <{T} class="legal-contact-banner card-ptc mt-4">
              <h2 class="h5 text-center mb-2">Questions about this document?</h2>
              <p class="text-muted-ptc text-center mb-3">Our compliance and support teams can help with privacy requests or contractual enquiries.</p>
              <{T} class="d-flex flex-wrap justify-content-center gap-2">
                <a href="mailto:support@primetradecapitals.com" class="btn btn-gradient btn-sm">Email support</a>
                <a href="{base}contact.html" class="btn btn-outline-light-ptc btn-sm">Contact form</a>
              </{T}>
            </{T}>
          </{T}>
        </{T}>"""


def data_table(headers, rows):
    ths = "".join(f"<th>{h}</th>" for h in headers)
    trs = ""
    for row in rows:
        tds = "".join(f"<td>{c}</td>" for c in row)
        trs += f"<tr>{tds}</tr>"
    return f"""<{T} class="table-responsive card-ptc p-0 overflow-hidden mt-4">
          <table class="table table-ptc mb-0">
            <thead><tr>{ths}</tr></thead>
            <tbody>{trs}</tbody>
          </table>
        </{T}>"""


def feature_row(items):
    cols = ""
    for icon, title, text in items:
        cols += f"""<{T} class="col-md-6 col-lg-4">
            <{T} class="card-ptc h-100 p-4 card-feature">
              <{T} class="feature-icon"><i class="bi bi-{icon}" aria-hidden="true"></i></{T}>
              <h4>{title}</h4>
              <p class="text-muted-ptc small mb-0">{text}</p>
            </{T}>
          </{T}>"""
    return f'<{T} class="row g-4 mt-2">{cols}</{T}>'


def stats_row(items):
    cols = ""
    for num, label in items:
        cols += f"""<{T} class="col-6 col-md-3">
            <{T} class="card-ptc text-center p-4 h-100">
              <p class="stat-number mb-1">{num}</p>
              <p class="text-muted-ptc small mb-0">{label}</p>
            </{T}>
          </{T}>"""
    return f'<{T} class="row g-3">{cols}</{T}>'


def cta_register(base: str = "") -> str:
    return sec(
        f"""<{T} class="section-heading-wrap text-center">
          <h2 class="section-title">Start trading today</h2>
          <p class="text-muted-ptc mb-0">Open your account in minutes and access global markets.</p>
          <{T} class="section-divider"></{T}>
        </{T}>
        <p class="text-center mt-4 mb-0"><a href="{base}auth/register.html" class="btn btn-gradient btn-lg">Create an Account</a></p>"""
    )


ABOUT = hero("About Us", "A global FX &amp; CFD broker focused on transparency and execution") + f"""
    <section class="section-dark py-5">
      <{T} class="container">
        <p class="text-muted-ptc">Prime Trade Capitals is a licensed industry leader, sourcing competitive products while increasing accessibility and transparency in online trading.</p>
        {stats_row([
            ("2100+", "Instruments"),
            ("450K+", "Clients worldwide"),
            ("400:1", "Max leverage"),
            ("24/7", "Support"),
        ])}
        <ul class="text-muted-ptc mt-4">
          <li>We continually enhance our trading platform to make it among the best in the market.</li>
          <li>We work with leading financial regulatory frameworks and compliance standards.</li>
          <li>Our award-winning trading solutions help you pursue your trading goals.</li>
        </ul>
        <h2 class="mt-5">Our company</h2>
        <p class="text-muted-ptc">Prime Trade Capitals is a registered digital asset investment firm leveraging advanced technical analysis across cryptocurrencies, forex, and traditional markets.</p>
        <p class="text-muted-ptc">Our team comprises seasoned professionals with experience managing substantial investments for private and institutional clients.</p>
        <h2 class="mt-4">Investment principles</h2>
        <ol class="text-muted-ptc">
          <li><strong>Create clear, appropriate investment goals</strong> — measurable and attainable.</li>
          <li><strong>Develop a suitable asset allocation</strong> — befitting the portfolio objective.</li>
          <li><strong>Minimize cost</strong> — lower costs mean a greater share of returns.</li>
          <li><strong>Maintain perspective and long-term discipline</strong> — stay disciplined through market turmoil.</li>
        </ol>
        <h2 class="mt-5">What our clients say</h2>
        <p class="text-muted-ptc">We have formed excellent partnerships with traders and investors around the world.</p>
        <{T} id="testimonialCarousel" class="carousel slide carousel-ptc mt-4" data-bs-ride="carousel">
          <{T} class="carousel-inner">
            <{T} class="carousel-item active"><{T} class="testimonial-card"><p>&ldquo;Prime Trade Capitals has transformed my trading experience.&rdquo;</p><strong>&mdash; Satisfied Client</strong></{T}></{T}>
            <{T} class="carousel-item"><{T} class="testimonial-card"><p>&ldquo;Excellent execution and transparent pricing.&rdquo;</p><strong>&mdash; Professional Trader</strong></{T}></{T}>
          </{T}>
          <button class="carousel-control-prev" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="prev"></button>
          <button class="carousel-control-next" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="next"></button>
        </{T}>
      </{T}>
    </section>
""" + cta_register()

PLATFORM = hero("Trading platforms", "MetaTrader 4 &amp; 5 with Prime Trade Capitals execution") + sec(
    """<p class="text-muted-ptc text-center mx-auto mb-0" style="max-width: 720px;">Our MT4 and MT5 platforms combine MetaTrader charting and analysis with Prime Trade Capitals spreads and rapid execution — on PC, Mac, web, and mobile.</p>"""
    + feature_row(
        [
            ("graph-up", "Advanced charting", "Dozens of indicators, drawing tools, and multiple timeframes."),
            ("cpu", "Expert advisors", "Automate strategies with EAs tailored to your rules."),
            ("phone", "Trade anywhere", "Desktop, browser, and mobile apps with synced watchlists."),
        ]
    )
) + sec(
    f"""<{T} class="section-heading-wrap text-center">
          <h2 class="section-title">Platform highlights</h2>
          <p class="text-muted-ptc mb-0">Built for speed, reliability, and control on every device</p>
          <{T} class="section-divider"></{T}>
        </{T}>"""
    + feature_row(
        [
            ("lightning-charge", "React rapidly", "Low-latency routing helps you act on price moves with precision timing."),
            ("bell", "Never miss a trade", "Alerts, one-click trading, and flexible order types on any device."),
            ("sliders", "Full order control", "Market, limit, stop, and stop-limit orders with partial fills supported."),
        ]
    )
    + f"""<{T} class="platform-mt-note mt-5 pt-5">
          <h3 class="h4 text-center mb-3">MetaTrader 4 &amp; 5</h3>
          <p class="text-muted-ptc text-center mb-0 mx-auto">Both platforms are supported. MT5 offers more timeframes and instruments; MT4 remains popular for legacy EAs. Our team can help you choose the right build for your strategy.</p>
        </{T}>""",
    darker=True,
) + TV_PLATFORM_CHART + cta_register()

PLANS_SECTION = f"""
    <section class="section-darker py-5" id="plans">
      <{T} class="container">
        <{T} class="section-heading-wrap">
          <h2 class="section-title text-center">Trading Packages</h2>
          <p class="text-center text-muted-ptc mb-0">Invest in Crypto, Forex, NFT, and other Assets.</p>
          <{T} class="section-divider"></{T}>
        </{T}>
        <{T} class="row g-4 mt-2">
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card h-100"><h3 class="plan-name">Basic Plan</h3><ul><li>Min. Deposit: $1,000</li><li>Max. Deposit: $4,999</li><li>Trade Duration: 14 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card featured h-100"><h3 class="plan-name">Silver Plan</h3><ul><li>Min. Deposit: $5,000</li><li>Max. Deposit: $9,999</li><li>Trade Duration: 21 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card h-100"><h3 class="plan-name">Gold Plan</h3><ul><li>Min. Deposit: $10,000</li><li>Max. Deposit: $49,999</li><li>Trade Duration: 60 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
          <{T} class="col-md-6 col-lg-3"><{T} class="card-ptc plan-card h-100"><h3 class="plan-name">Platinum Plan</h3><ul><li>Min. Deposit: $50,000</li><li>Max. Deposit: $100,000</li><li>Trade Duration: 60 Days</li></ul><a href="auth/register.html" class="btn btn-gradient w-100">Get Started</a></{T}></{T}>
        </{T}>
      </{T}>
    </section>
"""

PRICING = hero("Pricing", "Competitive spreads and transparent account tiers") + sec(
    """<p class="text-muted-ptc">Prime Trade Capitals offers zero commission on standard accounts, raw spreads from 0.0 pips on major Forex pairs for qualified clients, and no hidden fees. Choose the package that matches your investment goals.</p>
        <ul class="text-muted-ptc mt-3">
          <li>Zero commission on standard accounts</li>
          <li>Raw spreads from 0.0 pips (majors, qualified clients)</li>
          <li>Up to 400:1 leverage on supported instruments</li>
          <li>Instant execution on supported markets</li>
        </ul>"""
    + data_table(
        ["Account type", "Min. deposit", "Max. deposit", "Duration", "Commission"],
        [
            ("Basic", "$1,000", "$4,999", "14 days", "0%"),
            ("Silver", "$5,000", "$9,999", "21 days", "0%"),
            ("Gold", "$10,000", "$49,999", "60 days", "0%"),
            ("Platinum", "$50,000", "$100,000", "60 days", "0%"),
        ],
    ),
    darker=True,
) + PLANS_SECTION + sec(
    """<h2 class="section-title text-center">Ready to start?</h2>
        <p class="text-center text-muted-ptc">Open your account in minutes and access global markets.</p>
        <p class="text-center mt-4"><a href="auth/register.html" class="btn btn-gradient btn-lg">Register Now</a></p>"""
)

FAQ_BODY = """
        <div class="accordion accordion-ptc" id="faqAccordion">
          <motion class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">How do I open an account?</button></h2>
            <motion id="faq1" class="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
              <motion class="accordion-body">Click <strong>Register Now</strong>, complete the registration form, verify your email, upload KYC documents in the client portal, and fund your account to start trading.</motion>
            </motion>
          </motion>
          <motion class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">What is the minimum deposit?</button></h2>
            <motion id="faq2" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <motion class="accordion-body">The Basic Plan requires a minimum deposit of <strong>$1,000</strong>. Silver, Gold, and Platinum plans have higher minimums — see our <a href="pricing.html">Pricing</a> page for details.</motion>
            </motion>
          </motion>
          <motion class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">How do I deposit and withdraw funds?</button></h2>
            <motion id="faq3" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <motion class="accordion-body">After logging in to the client portal, go to <strong>Deposit</strong> or <strong>Withdraw</strong>. Supported methods include bank transfer, cryptocurrency, and card (where available). All requests are reviewed by our team.</motion>
            </motion>
          </motion>
          <motion class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq4">What is KYC and why is it required?</button></h2>
            <motion id="faq4" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <motion class="accordion-body">Know Your Customer (KYC) verification confirms your identity with a government ID and proof of address. It is required before deposits and plan subscriptions are approved, in line with financial regulations.</motion>
            </motion>
          </motion>
          <motion class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq5">Which platforms can I use?</button></h2>
            <motion id="faq5" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <motion class="accordion-body">We support <strong>MetaTrader 4</strong> and <strong>MetaTrader 5</strong> on desktop, web, and mobile. See the <a href="platform.html">Platform</a> page for features and charting tools.</motion>
            </motion>
          </motion>
          <motion class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq6">What leverage is available?</button></h2>
            <motion id="faq6" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <motion class="accordion-body">Leverage up to <strong>400:1</strong> is available on supported instruments. Leverage increases both profit and loss potential — ensure you understand the risks before trading.</motion>
            </motion>
          </motion>
          <motion class="accordion-item">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq7">How can I contact support?</button></h2>
            <motion id="faq7" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
              <motion class="accordion-body">Email <a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a> or use the <a href="contact.html">Contact</a> form. Our team aims to respond within 24 hours on business days.</motion>
            </motion>
          </motion>
        </motion>
""".replace("<motion", f"<{T}").replace("</motion>", f"</{T}>")

FAQ = hero("Help Centre", "Frequently asked questions") + sec(FAQ_BODY) + sec(
    """<h3>Still need help?</h3>
        <p class="text-muted-ptc">Our support team is available to assist with account setup, funding, and platform questions.</p>
        <a href="contact.html" class="btn btn-gradient mt-2">Contact Us</a>"""
)

SWAPS = hero("Swaps", "Overnight financing on open positions") + sec(
    """<p class="text-muted-ptc">A swap (or rollover) is the interest applied to positions held open overnight. Rates depend on the instrument, position direction (long or short), and prevailing market interest rates. Swaps are credited or debited to your account at the end of each trading day.</p>
        <h3 class="mt-4">Triple swap day</h3>
        <p class="text-muted-ptc">On Wednesdays (or the broker's designated triple-swap day), swap charges for Forex and some CFDs are typically applied for three days to account for the weekend.</p>
        <h3 class="mt-4">Indicative swap rates (points per lot)</h3>
        <p class="text-muted-ptc small">Rates are indicative and may change without notice. Check your platform or contact support for current values.</p>"""
    + data_table(
        ["Instrument", "Long", "Short"],
        [
            ("EUR/USD", "-6.2", "+2.1"),
            ("GBP/USD", "-4.8", "+0.9"),
            ("USD/JPY", "+3.5", "-7.1"),
            ("XAU/USD (Gold)", "-12.0", "+4.5"),
            ("BTC/USD", "-18.0", "-18.0"),
            ("US500 (Index)", "-5.5", "-5.5"),
        ],
    ),
) + sec(
    """<p class="text-muted-ptc">Swap-free (Islamic) accounts may be available on request for eligible clients. Contact <a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a> for more information.</p>""",
    darker=True,
)

SPREADS = hero("Spreads and Commissions", "Transparent pricing with no hidden fees") + sec(
    """<p class="text-muted-ptc">Prime Trade Capitals charges <strong>zero commission</strong> on standard accounts. Our revenue comes primarily from the spread — the difference between bid and ask prices. Qualified clients may access raw spreads from 0.0 pips on major Forex pairs.</p>
        <h3 class="mt-4">Typical spreads (pips)</h3>
        <p class="text-muted-ptc small">Spreads vary with market conditions. Values below are typical during normal liquidity.</p>"""
    + data_table(
        ["Instrument", "Typical spread", "Commission"],
        [
            ("EUR/USD", "0.1 – 0.8", "None"),
            ("GBP/USD", "0.3 – 1.2", "None"),
            ("USD/JPY", "0.2 – 0.9", "None"),
            ("XAU/USD (Gold)", "0.20 – 0.50", "None"),
            ("BTC/USD", "Variable", "None"),
            ("US500", "0.4 – 1.0", "None"),
            ("TSLA (Share CFD)", "Variable", "None"),
        ],
    ),
) + sec(
    tags(
        """<{T} class="row g-4">
          <{T} class="col-md-4"><{T} class="card-ptc h-100 p-4"><h4>No hidden fees</h4><p class="text-muted-ptc small mb-0">What you see is what you pay — no surprise charges on standard trading.</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc h-100 p-4"><h4>Raw spreads</h4><p class="text-muted-ptc small mb-0">Eligible accounts can access institutional-grade pricing on majors.</p></{T}></{T}>
          <{T} class="col-md-4"><{T} class="card-ptc h-100 p-4"><h4>Instant execution</h4><p class="text-muted-ptc small mb-0">Fast order routing on supported instruments during market hours.</p></{T}></{T}>
        </{T}>"""
    ),
    darker=True,
)

SPECS = hero("Trading Specifications", "Contract details and trading conditions") + sec(
    """<p class="text-muted-ptc">Below is a summary of standard trading conditions. Specifications may differ by instrument and account type.</p>"""
    + data_table(
        ["Parameter", "Standard condition"],
        [
            ("Maximum leverage", "Up to 400:1 (instrument dependent)"),
            ("Minimum lot size", "0.01"),
            ("Maximum lot size", "50 (per order, instrument dependent)"),
            ("Order types", "Market, Limit, Stop, Stop Limit"),
            ("Execution", "Instant / market execution"),
            ("Hedging", "Allowed"),
            ("Negative balance protection", "Available where required by regulation"),
            ("Trading hours", "24/5 Forex; market hours for shares & indices"),
            ("Platforms", "MetaTrader 4, MetaTrader 5"),
        ],
    ),
) + sec(
    tags(
        """<h3>Instrument classes</h3>
        <{T} class="row g-3 mt-2 text-center">
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Forex</h4><p class="text-muted-ptc small mb-0">Majors, minors, exotics</p></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Indices</h4><p class="text-muted-ptc small mb-0">US, EU, Asia benchmarks</p></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Commodities</h4><p class="text-muted-ptc small mb-0">Gold, oil, metals</p></{T}></{T}>
          <{T} class="col-6 col-md-3"><{T} class="card-ptc p-3"><h4>Crypto</h4><p class="text-muted-ptc small mb-0">BTC, ETH, and more</p></{T}></{T}>
        </{T}>
        <p class="text-muted-ptc mt-4">For full contract specifications per symbol, log in to your trading platform or contact support.</p>"""
    ),
    darker=True,
)

PRIVACY_SECTIONS = [
    (
        "privacy-intro",
        1,
        "Introduction",
        "shield-lock",
        """<p>This Privacy Policy explains how <strong>Prime Trade Capitals A/S</strong> (&ldquo;Prime Trade Capitals&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, stores, and protects personal data when you visit our website, register for an account, use our client portal, or communicate with us.</p>
        <p>We process personal data in accordance with the EU General Data Protection Regulation (GDPR), the UK GDPR, and the Danish Data Protection Act, where applicable. By using our services, you acknowledge that you have read this policy.</p>""",
    ),
    (
        "privacy-controller",
        2,
        "Who we are",
        "building",
        """<p>The data controller responsible for your personal data is:</p>
        <ul>
          <li><strong>Prime Trade Capitals A/S</strong></li>
          <li>CVR: 37 12 74 07</li>
          <li>Registered address: Hammerensgade 1, 1267 Copenhagen K, Denmark</li>
          <li>Correspondence: 18/2 Royston Mains Street, Edinburgh, Scotland, EH5 1LB</li>
          <li>Email: <a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a></li>
        </ul>""",
    ),
    (
        "privacy-collect",
        3,
        "Information we collect",
        "folder2-open",
        """<p>Depending on how you interact with us, we may collect the following categories of personal data:</p>
        <ul>
          <li><strong>Identity data</strong> — full name, date of birth, nationality, government-issued ID numbers, photographs on documents</li>
          <li><strong>Contact data</strong> — email address, telephone number, residential address</li>
          <li><strong>Financial data</strong> — bank or wallet details, deposit and withdrawal records, trading history, account balances</li>
          <li><strong>Verification data</strong> — KYC documents, proof of address, source-of-funds information, screening results</li>
          <li><strong>Technical data</strong> — IP address, device identifiers, browser type, operating system, log files, session timestamps</li>
          <li><strong>Usage data</strong> — pages visited, features used, referral sources, cookie identifiers</li>
          <li><strong>Communications</strong> — support tickets, emails, chat transcripts, and call notes where recorded with consent</li>
        </ul>
        <p>We do not intentionally collect data from children under 18. If you believe a minor has provided us data, contact us immediately.</p>""",
    ),
    (
        "privacy-sources",
        4,
        "How we collect data",
        "download",
        """<p>We obtain personal data from several sources, including:</p>
        <ul>
          <li>Information you provide when registering, completing KYC, funding your account, or contacting support</li>
          <li>Automated collection through cookies, analytics tools, and server logs when you use our website or portal</li>
          <li>Trading platforms connected to your account (e.g. order history and login events)</li>
          <li>Identity verification and fraud-prevention providers acting on our instructions</li>
          <li>Payment processors and banking partners involved in deposits and withdrawals</li>
          <li>Public registers or regulatory databases where permitted by law</li>
        </ul>""",
    ),
    (
        "privacy-legal-basis",
        5,
        "Legal bases for processing",
        "scale",
        """<p>We only process personal data where we have a valid legal basis, including:</p>
        <ul>
          <li><strong>Contract</strong> — to open and administer your account and provide requested services</li>
          <li><strong>Legal obligation</strong> — anti-money laundering (AML), counter-terrorist financing (CTF), tax reporting, and regulatory record-keeping</li>
          <li><strong>Legitimate interests</strong> — fraud prevention, network security, service improvement, and proportionate direct marketing to existing clients</li>
          <li><strong>Consent</strong> — where required for optional cookies, certain marketing communications, or specific verification steps</li>
        </ul>
        <p>Where we rely on legitimate interests, we balance our needs against your rights and implement safeguards such as data minimisation and access controls.</p>""",
    ),
    (
        "privacy-use",
        6,
        "How we use your data",
        "gear",
        """<p>We use personal data to:</p>
        <ul>
          <li>Register, verify, and maintain your trading account</li>
          <li>Execute, record, and report your transactions and positions</li>
          <li>Process deposits, withdrawals, and internal transfers</li>
          <li>Monitor for suspicious activity, market abuse, and policy breaches</li>
          <li>Provide customer support and respond to enquiries or complaints</li>
          <li>Send service-related notices (security alerts, policy updates, account statements)</li>
          <li>Improve our website, platforms, and internal systems</li>
          <li>Defend legal claims and cooperate with competent authorities when required</li>
        </ul>""",
    ),
    (
        "privacy-sharing",
        7,
        "Sharing and disclosures",
        "share",
        """<p>We may share personal data with:</p>
        <ul>
          <li>Affiliated entities within the Prime Trade Capitals group, under appropriate data protection agreements</li>
          <li>Liquidity providers, prime brokers, and technology vendors that support order routing and platform hosting</li>
          <li>Payment service providers, banks, and blockchain analytics firms for transaction processing</li>
          <li>KYC/AML screening providers, credit reference agencies, and identity verification partners</li>
          <li>Professional advisers (lawyers, auditors, insurers) bound by confidentiality duties</li>
          <li>Regulators, courts, or law enforcement when we are legally required to do so</li>
        </ul>
        <p>We do not sell your personal data to third parties for their independent marketing purposes.</p>""",
    ),
    (
        "privacy-transfers",
        8,
        "International transfers",
        "globe2",
        """<p>Your data may be processed in countries outside your home jurisdiction, including Denmark, the United Kingdom, the European Economic Area, and other locations where our service providers operate.</p>
        <p>When we transfer data internationally, we implement appropriate safeguards such as Standard Contractual Clauses (SCCs), adequacy decisions, or other mechanisms recognised under applicable data protection law.</p>""",
    ),
    (
        "privacy-retention",
        9,
        "Data retention",
        "hourglass-split",
        """<p>We retain personal data only for as long as necessary to fulfil the purposes described in this policy, including:</p>
        <ul>
          <li>Active account data — for the duration of your relationship with us plus any statutory limitation period</li>
          <li>KYC and AML records — typically at least five (5) years after account closure, or longer where law requires</li>
          <li>Marketing preferences — until you withdraw consent or object, plus a short suppression record</li>
          <li>Server logs and security data — generally up to twelve (12) months unless needed for investigations</li>
        </ul>
        <p>When data is no longer required, we securely delete or anonymise it in line with our retention schedule.</p>""",
    ),
    (
        "privacy-security",
        10,
        "Security measures",
        "lock",
        """<p>We apply technical and organisational measures designed to protect personal data, including encryption in transit (TLS), access controls, role-based permissions, secure development practices, and staff training on confidentiality.</p>
        <p>No method of transmission or storage is completely secure. You are responsible for keeping your login credentials confidential and notifying us promptly of any suspected unauthorised access.</p>""",
    ),
    (
        "privacy-rights",
        11,
        "Your rights",
        "person-check",
        """<p>Subject to applicable law, you may have the right to:</p>
        <ul>
          <li>Request access to the personal data we hold about you</li>
          <li>Request correction of inaccurate or incomplete data</li>
          <li>Request erasure in certain circumstances (&ldquo;right to be forgotten&rdquo;)</li>
          <li>Restrict or object to certain processing, including direct marketing</li>
          <li>Request data portability where processing is based on consent or contract and carried out by automated means</li>
          <li>Withdraw consent at any time where processing is consent-based (without affecting prior lawful processing)</li>
          <li>Lodge a complaint with a supervisory authority (e.g. the Danish Data Protection Agency or the UK ICO)</li>
        </ul>
        <p>To exercise your rights, email <a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a>. We may need to verify your identity before responding and will reply within the timeframes required by law.</p>""",
    ),
    (
        "privacy-cookies",
        12,
        "Cookies and similar technologies",
        "cookie",
        """<p>We use cookies and similar technologies to operate the website, remember preferences, analyse traffic, and improve user experience. Types include:</p>
        <ul>
          <li><strong>Strictly necessary</strong> — required for security, authentication, and core functionality</li>
          <li><strong>Functional</strong> — remember settings such as language or theme</li>
          <li><strong>Analytics</strong> — help us understand how visitors use the site (often aggregated)</li>
        </ul>
        <p>You can manage cookies through your browser settings. Disabling certain cookies may limit site functionality. Where required, we will request consent before placing non-essential cookies.</p>""",
    ),
    (
        "privacy-marketing",
        13,
        "Marketing communications",
        "envelope",
        """<p>With your consent or where permitted by law, we may send promotional emails or messages about products, promotions, or educational content. You can opt out at any time using the unsubscribe link in emails or by contacting support.</p>
        <p>Service-related communications (e.g. security notices or account changes) are not marketing and may still be sent while you hold an account.</p>""",
    ),
    (
        "privacy-changes",
        14,
        "Changes to this policy",
        "arrow-repeat",
        """<p>We may update this Privacy Policy from time to time to reflect legal, technical, or business changes.</p>
        <p>Material changes will be communicated via the website, email, or your client portal where appropriate. Continued use of our services after changes take effect constitutes acceptance of the updated policy.</p>""",
    ),
]

TERMS_SECTIONS = [
    (
        "terms-intro",
        1,
        "Agreement and acceptance",
        "file-text",
        """<p>These Terms of Service (&ldquo;Terms&rdquo;) constitute a binding agreement between you (&ldquo;Client&rdquo;, &ldquo;you&rdquo;) and <strong>Prime Trade Capitals A/S</strong> (CVR 37 12 74 07) governing access to our website, client portal, trading services, and related products.</p>
        <p>By clicking &ldquo;Register&rdquo;, opening an account, depositing funds, or placing a trade, you confirm that you have read, understood, and agree to these Terms, our Privacy Policy, risk disclosures, and any product-specific schedules we provide.</p>
        <p>If you do not agree, you must not use our services.</p>""",
    ),
    (
        "terms-services",
        2,
        "Our services",
        "graph-up-arrow",
        """<p>Prime Trade Capitals provides online access to trading in contracts for difference (CFDs), spot and derivative instruments on Forex, indices, commodities, shares, and cryptocurrencies, subject to availability in your jurisdiction.</p>
        <p>Execution may occur through MetaTrader 4, MetaTrader 5, or other platforms we designate. We act as principal or agent as disclosed in your account documentation. We do not provide investment, tax, or legal advice; all trading decisions are yours alone.</p>""",
    ),
    (
        "terms-eligibility",
        3,
        "Eligibility",
        "person-badge",
        """<p>To open an account you must:</p>
        <ul>
          <li>Be at least 18 years of age (or the age of majority in your jurisdiction, if higher)</li>
          <li>Have full legal capacity to enter into binding contracts</li>
          <li>Not be resident in a jurisdiction where our services are prohibited</li>
          <li>Provide accurate, complete, and up-to-date registration information</li>
          <li>Complete identity verification (KYC) and any enhanced due diligence we require</li>
        </ul>
        <p>We may decline applications or restrict services at our discretion, including for regulatory, reputational, or risk-management reasons, without obligation to provide detailed reasons.</p>""",
    ),
    (
        "terms-account",
        4,
        "Account opening and KYC",
        "person-vcard",
        """<p>You may hold only one personal account unless we approve additional accounts in writing. You must notify us immediately of any change to your contact details, employment, financial situation, or political exposure status.</p>
        <p>KYC documentation (government ID, proof of address, and source-of-funds evidence where requested) must be genuine and current. Submitting false or misleading information may result in immediate account suspension, forfeiture of profits obtained through abuse, and reporting to authorities.</p>""",
    ),
    (
        "terms-trading",
        5,
        "Trading, orders, and execution",
        "bar-chart",
        """<p>Orders are submitted at your instruction via the trading platform. We endeavour to execute orders promptly but do not guarantee specific prices, slippage limits, or fill rates, particularly during volatile or illiquid market conditions.</p>
        <ul>
          <li>Market orders may be filled at prices different from quoted levels</li>
          <li>Pending orders may not trigger if price gaps through your level</li>
          <li>We may widen spreads, impose trading halts, or reject orders during news events or technical failures</li>
          <li>Expert advisors (EAs) and automated strategies remain your responsibility; we are not liable for coding errors or third-party tools</li>
        </ul>
        <p>Contract specifications, leverage, margin requirements, and trading hours are published on our website and may change with notice where permitted.</p>""",
    ),
    (
        "terms-fees",
        6,
        "Fees, spreads, and swaps",
        "currency-exchange",
        """<p>You agree to pay applicable spreads, commissions, swaps (overnight financing), conversion fees, inactivity charges, and third-party costs disclosed on our Pricing and Swaps pages or in your account agreement.</p>
        <p>Fees may change with reasonable notice. It is your responsibility to review costs before trading. Negative balance protection may apply on retail accounts where required by regulation in your jurisdiction.</p>""",
    ),
    (
        "terms-payments",
        7,
        "Deposits and withdrawals",
        "wallet2",
        """<p>Deposits must originate from accounts or wallets in your name. We do not accept third-party payments. All deposit and withdrawal requests are subject to AML review and may be delayed or refused if documentation is insufficient.</p>
        <ul>
          <li>Withdrawals are generally returned to the original funding method where technically possible</li>
          <li>Processing times depend on payment method, banking partners, and verification status</li>
          <li>We may request additional information before releasing funds</li>
          <li>Chargebacks or reversed payments may result in account closure and recovery of associated costs</li>
        </ul>""",
    ),
    (
        "terms-risk",
        8,
        "Risk disclosure",
        "exclamation-triangle",
        """<p><strong>Trading leveraged products is high risk.</strong> You may lose all of your deposited capital and, in some cases, owe additional funds if negative balance protection does not apply. Leverage magnifies both gains and losses.</p>
        <p>Markets can move rapidly due to economic data, geopolitical events, liquidity shortages, or platform outages. Past performance is not indicative of future results. You should only trade with money you can afford to lose and seek independent advice if unsure.</p>
        <p>By trading, you confirm that you understand these risks and that our services are not suitable for everyone.</p>""",
    ),
    (
        "terms-ip",
        9,
        "Intellectual property",
        "c-circle",
        """<p>All website content, logos, software, charts, and documentation are owned by Prime Trade Capitals or our licensors. You receive a limited, non-exclusive, revocable licence to use the client portal and platforms for personal trading purposes only.</p>
        <p>You may not copy, reverse engineer, scrape, resell, or redistribute our materials without prior written consent.</p>""",
    ),
    (
        "terms-prohibited",
        10,
        "Prohibited conduct",
        "slash-circle",
        """<p>You must not:</p>
        <ul>
          <li>Use the services for money laundering, terrorist financing, fraud, or sanctions evasion</li>
          <li>Manipulate prices, abuse latency, exploit platform errors, or engage in coordinated pump-and-dump schemes</li>
          <li>Allow third parties to trade on your account or use VPNs to misrepresent your location</li>
          <li>Harass staff or submit malicious code to our systems</li>
          <li>Circumvent leverage limits, hedging restrictions, or bonus terms</li>
        </ul>
        <p>We may close positions, cancel profits, freeze balances, and report conduct to regulators where appropriate.</p>""",
    ),
    (
        "terms-termination",
        11,
        "Suspension and termination",
        "x-octagon",
        """<p>Either party may terminate the relationship subject to outstanding obligations. We may suspend or close your account immediately if you breach these Terms, fail KYC, pose a regulatory risk, or if we discontinue services in your region.</p>
        <p>Upon closure, you must close open positions and withdraw remaining funds (minus lawful deductions). We may retain data as required by AML and tax laws.</p>""",
    ),
    (
        "terms-liability",
        12,
        "Limitation of liability",
        "shield-exclamation",
        """<p>To the fullest extent permitted by applicable law, Prime Trade Capitals and its directors, employees, and agents shall not be liable for indirect, incidental, special, or consequential damages, including loss of profits, data, or goodwill, arising from use of our services.</p>
        <p>Our aggregate liability for any claim shall not exceed the net deposits you paid to us in the twelve (12) months preceding the event giving rise to the claim, except where liability cannot be limited by law (e.g. death or personal injury caused by negligence, or fraud).</p>
        <p>We are not responsible for failures of internet connectivity, third-party platforms, liquidity providers, or force majeure events.</p>""",
    ),
    (
        "terms-disputes",
        13,
        "Complaints and governing law",
        "bank",
        """<p>If you have a complaint, contact <a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a> with your account number and a clear description of the issue. We will acknowledge receipt and aim to resolve matters fairly and promptly.</p>
        <p>These Terms are governed by the laws of Denmark, without regard to conflict-of-law principles. Courts in Copenhagen shall have exclusive jurisdiction, unless mandatory consumer protection rules in your country require otherwise.</p>
        <p>If any provision is held invalid, the remaining provisions continue in full force.</p>""",
    ),
    (
        "terms-misc",
        14,
        "General provisions",
        "list-check",
        """<ul>
          <li><strong>Entire agreement</strong> — These Terms, together with policies referenced herein, constitute the entire agreement between you and us regarding the services.</li>
          <li><strong>Assignment</strong> — We may assign our rights and obligations to an affiliate or successor; you may not assign without our consent.</li>
          <li><strong>Language</strong> — The English version prevails if translations conflict.</li>
          <li><strong>Amendments</strong> — We may update these Terms by posting a revised version on the website. Material changes will be notified via email or the portal where practicable.</li>
        </ul>""",
    ),
]

PRIVACY = hero(
    "Privacy Policy",
    "How we collect, use, and protect your data",
    heading_id="legal-page-title",
) + sec_legal(
    legal_document(
        """<p class="legal-intro-lead mb-0">Your privacy matters. This policy describes what we collect, why we need it, and the choices available to you under data protection law.</p>""",
        PRIVACY_SECTIONS,
        base="../",
    )
)

TERMS = hero(
    "Terms of Service",
    "Agreement for use of Prime Trade Capitals services",
    heading_id="legal-page-title",
) + sec_legal(
    legal_document(
        f"""<p class="legal-intro-lead mb-0">Please read these Terms carefully before opening an account or trading. They set out your rights and obligations when using Prime Trade Capitals services. See also our <a href="../legal/privacy-policy.html">Privacy Policy</a>.</p>
        <{T} class="legal-risk-callout mt-3" role="note">
          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
          <p class="mb-0"><strong>Risk warning:</strong> Trading leveraged products can result in losses that exceed your deposits. Ensure you understand the risks before trading.</p>
        </{T}>""",
        TERMS_SECTIONS,
        base="../",
    )
)

def certificate_section(base: str) -> str:
    src = f"{base}{CERTIFICATE_SRC}"
    return hero("Company Certificate", "Corporate registration and compliance") + sec(
        f"""<{T} class="certificate-display card-ptc p-3 p-md-4 mb-4">
          <a href="{src}" target="_blank" rel="noopener noreferrer" class="certificate-link">
            <img src="{src}" alt="Prime Trade Capitals company registration certificate" class="certificate-img" width="960" height="auto" loading="lazy" />
          </a>
          <p class="text-muted-ptc small text-center mt-3 mb-0">Click the image to open the full certificate in a new tab.</p>
        </{T}>
        <{T} class="content-prose">
        <p class="text-muted-ptc">Prime Trade Capitals operates as an international digital trading management platform. Clients engage with <strong>Prime Trade Capitals A/S</strong>, incorporated in Denmark.</p>
        <ul class="text-muted-ptc mt-3">
          <li><strong>Company:</strong> Prime Trade Capitals A/S</li>
          <li><strong>CVR:</strong> 37 12 74 07</li>
          <li><strong>Registered address:</strong> Hammerensgade 1, 1267 Copenhagen K, Denmark</li>
          <li><strong>Correspondence:</strong> 18/2 Royston Mains Street, Edinburgh, Scotland, EH5 1LB</li>
        </ul>
        <p class="text-muted-ptc mt-4">Questions about our registration? Email <a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a>.</p>
        </{T}>"""
    )


MARKET_FEATURES = {
    "cryptocurrencies.html": [
        ("currency-bitcoin", "24/7 markets", "Trade leading digital assets around the clock on supported pairs."),
        ("lightning-charge", "Fast execution", "Low-latency order routing on major crypto CFDs."),
        ("shield-check", "Secure custody", "Client funds held with regulated payment partners."),
    ],
    "forex.html": [
        ("globe2", "Major & minor pairs", "Trade EUR/USD, GBP/USD, USD/JPY, and dozens more."),
        ("graph-up-arrow", "Tight spreads", "Competitive pricing on the world's most liquid market."),
        ("clock", "24/5 trading", "Access global FX sessions from Sunday evening to Friday night."),
    ],
    "shares.html": [
        ("building", "Global equities", "CFDs on US and international stocks including tech leaders."),
        ("pie-chart", "Diversify", "Build a portfolio across sectors and regions."),
        ("bar-chart", "Real-time data", "Live quotes and charts via MT4/MT5 and TradingView."),
    ],
    "indices.html": [
        ("flag", "Global benchmarks", "US500, US100, UK100, GER40, and Asian indices."),
        ("speedometer2", "Leverage", "Trade index CFDs with flexible leverage up to 400:1."),
        ("layers", "One platform", "Manage indices alongside Forex, crypto, and commodities."),
    ],
}

CONTACT = hero("Contact us", "We typically reply within 24 hours on business days") + f"""
    <section class="section-dark py-5">
      <{T} class="container">
        <{T} class="row g-4 align-items-start">
          <{T} class="col-lg-5">
            <h3 class="mb-3">Get in touch</h3>
            <{T} class="row g-3">
              <{T} class="col-12">
                <{T} class="card-ptc contact-info-card">
                  <{T} class="feature-icon"><i class="bi bi-envelope" aria-hidden="true"></i></{T}>
                  <{T}>
                    <h4 class="h6 mb-1">Email</h4>
                    <p class="text-muted-ptc small mb-0"><a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a></p>
                  </{T}>
                </{T}>
              </{T}>
              <{T} class="col-12">
                <{T} class="card-ptc contact-info-card">
                  <{T} class="feature-icon"><i class="bi bi-geo-alt" aria-hidden="true"></i></{T}>
                  <{T}>
                    <h4 class="h6 mb-1">Address</h4>
                    <p class="text-muted-ptc small mb-0">18/2 Royston Mains Street, Edinburgh, Scotland, EH5 1LB</p>
                  </{T}>
                </{T}>
              </{T}>
              <{T} class="col-12">
                <{T} class="card-ptc contact-info-card">
                  <{T} class="feature-icon"><i class="bi bi-clock" aria-hidden="true"></i></{T}>
                  <{T}>
                    <h4 class="h6 mb-1">Hours</h4>
                    <p class="text-muted-ptc small mb-0">Monday&ndash;Friday, 9:00&ndash;18:00 GMT</p>
                  </{T}>
                </{T}>
              </{T}>
            </{T}>
          </{T}>
          <{T} class="col-lg-7">
            <form id="contact-form" class="card-ptc p-4">
              <{T} id="contact-alert" class="alert-ptc d-none mb-3" role="alert"></{T}>
              <{T} class="mb-3"><label class="form-label-ptc" for="contact-name">Name</label><input id="contact-name" name="name" class="form-control form-control-ptc" required autocomplete="name"></{T}>
              <{T} class="mb-3"><label class="form-label-ptc" for="contact-email">Email</label><input id="contact-email" type="email" name="email" class="form-control form-control-ptc" required autocomplete="email"></{T}>
              <{T} class="mb-3"><label class="form-label-ptc" for="contact-subject">Subject</label><input id="contact-subject" name="subject" class="form-control form-control-ptc" required></{T}>
              <{T} class="mb-3"><label class="form-label-ptc" for="contact-message">Message</label><textarea id="contact-message" name="message" rows="5" class="form-control form-control-ptc" required></textarea></{T}>
              <button type="submit" class="btn btn-gradient">Send Message</button>
              <p class="text-muted-ptc small mt-3 mb-0">Prefer email? Write to <a href="mailto:support@primetradecapitals.com">support@primetradecapitals.com</a> directly.</p>
            </form>
          </{T}>
        </{T}>
      </{T}>
    </section>
"""

PAGES = [
    ("index.html", "", "home", "Home", INDEX, True, True, False, False),
    ("about.html", "", "about", "About Us", ABOUT, False, True, False, False),
    ("platform.html", "", "platform", "Platform", PLATFORM, False, True, False, False),
    ("contact.html", "", "contact", "Contact", CONTACT, False, True, False, True),
    ("pricing.html", "", "pricing", "Pricing", PRICING, False, True, False, False),
    ("faq.html", "", "faq", "Help Centre", FAQ, False, True, False, False),
    ("swaps.html", "", "swaps", "Swaps", SWAPS + cta_register(), False, True, False, False),
    ("spreads-commissions.html", "", "spreads", "Spreads", SPREADS + cta_register(), False, True, False, False),
    ("trading-specifications.html", "", "specs", "Specifications", SPECS + cta_register(), False, True, False, False),
    ("legal/privacy-policy.html", "../", "", "Privacy Policy", PRIVACY, False, False, False, False),
    ("legal/terms.html", "../", "", "Terms", TERMS, False, False, False, False),
    ("legal/company-certificate.html", "../", "", "Certificate", certificate_section("../"), False, False, False, False),
]

MARKET_INTROS = {
    "cryptocurrencies.html": "Go long or short on Bitcoin, Ethereum, and leading altcoins with competitive conditions and 24/7 access on supported pairs.",
    "forex.html": "Access the world's most liquid market with tight spreads, deep liquidity, and leverage up to 400:1 on majors, minors, and exotics.",
    "shares.html": "Trade CFDs on US and international equities — from tech leaders to blue chips — with live quotes and flexible position sizing.",
    "indices.html": "Speculate on US, European, and Asian benchmarks including US500, US100, UK100, and GER40 from a single account.",
}

TRENDING_STOCKS_BLOCK = f"""
    <section class="section-darker py-5">
      <{T} class="container">
        <h2 class="section-title text-center">Trending Stocks</h2>
        <p class="text-center text-muted-ptc mb-4">Live market movers — TradingView</p>
        <{T} class="trending-stocks-panel trending-stocks-panel--tv card-ptc p-3">{TV_US_TRENDING_QUOTES}</{T}>
      </{T}>
    </section>
"""

MARKET_WIDGETS = {
    "cryptocurrencies.html": TV_CRYPTO_MARKET,
    "forex.html": TV_FOREX_RATES,
    "shares.html": TV_STOCKS_HOTLIST,
    "indices.html": TV_INDICES_QUOTES,
}

for fname, title, desc in [
    ("cryptocurrencies.html", "Cryptocurrencies", "Trade Bitcoin, Ethereum and leading digital assets."),
    ("forex.html", "Forex Trading", "Major, minor and exotic pairs with leverage up to 400:1."),
    ("shares.html", "Shares", "Global equities including NFLX, TSLA, AMZN, GOOGL."),
    ("indices.html", "Indices", "US, European and Asian index benchmarks."),
]:
    features = feature_row(MARKET_FEATURES.get(fname, []))
    intro_text = MARKET_INTROS.get(fname, desc)
    market_key = fname.replace(".html", "")
    intro = sec(
        f"""<p class="text-muted-ptc">{intro_text}</p>
        <h3 class="mt-4">Why trade with Prime Trade Capitals?</h3>
        {features}
        <p class="mt-4"><a href="../auth/register.html" class="btn btn-gradient">Register Now</a></p>"""
    )
    extra = TRENDING_STOCKS_BLOCK if fname == "shares.html" else ""
    body = hero(title, desc) + intro + MARKET_WIDGETS.get(fname, "") + extra + cta_register("../")
    PAGES.append((f"markets/{fname}", "../", market_key, title, body, False, True, False, False))


if __name__ == "__main__":
    for path, base, active, title, body, coingecko, tv_tape, stocks, contact_form in PAGES:
        out = ROOT / path
        out.parent.mkdir(parents=True, exist_ok=True)
        mq_table = "mq-table-panel" in body
        tv_market_quotes = "tv-market-quotes" in body
        out.write_text(
            shell(
                title,
                base,
                active,
                body,
                coingecko,
                tv_tape,
                stocks,
                contact_form,
                mq_table,
                tv_market_quotes,
            ),
            encoding="utf-8",
        )
        print("wrote", path)
