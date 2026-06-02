import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def w(path, html):
    p = os.path.join(ROOT, path.replace("/", os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(html)
    print("OK", path)

THEME_INIT = """  <script>
(function(){var k="ptc-theme",s=localStorage.getItem(k),m=window.matchMedia("(prefers-color-scheme: light)").matches,t=s||(m?"light":"dark");document.documentElement.setAttribute("data-theme",t),document.documentElement.style.colorScheme=t})();
  </script>"""

def head(title, pre="", portal=False):
    extra = f'  <link href="{pre}css/portal.css" rel="stylesheet" />\n' if portal else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Prime Trade Capitals</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="{pre}css/theme.css" rel="stylesheet" />
{THEME_INIT}
{extra}</head>"""

def foot(pre, *extra_js):
    lines = [
        '  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>',
        f'  <script src="{pre}js/theme.js"></script>',
        f'  <script src="{pre}js/auth.js"></script>',
        f'  <script src="{pre}js/components.js"></script>',
    ]
    for j in extra_js:
        lines.append(f'  <script src="{pre}js/{j}"></script>')
    lines.append("</body>\n</html>")
    return "\n".join(lines)

def public_page(path, title, body_attr, main_html, pre="", *js):
    w(
        path,
        head(title, pre)
        + f"""
<body {body_attr}>
  <a href="#main" class="skip-link">Skip to content</a>
  <div id="site-header"></div>
  <main id="main">
{main_html}
  </main>
  <div id="site-footer"></div>
"""
        + foot(pre, *js),
    )

def portal_page(path, title, portal_key, main_html):
    w(
        path,
        head(title, "../", portal=True)
        + f"""
<body data-portal-page="{portal_key}">
  <a href="#main" class="skip-link">Skip to content</a>
  <div></motion>
  <div class="portal-layout">
    <div id="portal-sidebar"></div>
    <main class="portal-main" id="main">
{main_html}
    </main>
  </div>
  <div id="site-footer"></div>
"""
        + foot("../", "portal.js"),
    )

def ph(t, s):
    return f'    <section class="page-hero"><div class="container"><h1>{t}</h1><p class="text-muted-ptc">{s}</p></div></section>\n'

def sec(inner):
    return f'    <section class="section-dark py-5"><div></motion></section>\n'.replace(
        "<div></motion>", f'<div class="container">{inner}</div>'
    )

# Fix portal header line - run replace on output
def portal_page_fixed(path, title, portal_key, main_html):
    html = (
        head(title, "../", portal=True)
        + f"""
<body data-portal-page="{portal_key}">
  <a href="#main" class="skip-link">Skip to content</a>
  <div id="site-header"></div>
  <div class="portal-layout">
    <div id="portal-sidebar"></div>
    <main class="portal-main" id="main">
{main_html}
    </main>
  </div>
  <div id="site-footer"></div>
"""
        + foot("../", "portal.js")
    )
    w(path, html)

INDEX = """
    <section class="hero-section">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-7">
            <span class="hero-badge">Trade and Invest in STOCKS, CRYPTO, FOREX, GOLD, and other Assets.</span>
            <h1 class="hero-title">A World-Class Trading Experience</h1>
            <p class="hero-subtitle">Unlock empowered trading with cutting-edge tools, expert support, and top-tier security.</p>
            <div class="d-flex flex-wrap gap-3 mt-4">
              <a href="auth/register.html" class="btn btn-gradient btn-lg">Create an Account</a>
              <a href="auth/login.html" class="btn btn-outline-light-ptc btn-lg">Login</a>
            </div>
          </div>
          <div class="col-lg-5 mt-4 mt-lg-0">
            <div class="market-widget" id="market-ticker"><p class="text-muted-ptc small">Loading markets...</p></div>
          </div>
        </div>
      </div>
    </section>
    <section class="section-darker py-5">
      <div class="container">
        <h2 class="section-title text-center">Trade the coins of the future</h2>
        <div></motion>
      </div>
    </section>
"""

INDEX = INDEX.replace(
    "<div></motion>",
    """<div class="row g-4 mt-3 justify-content-center">
          <div class="col-md-3"><div class="card-ptc text-center p-3"><h4>Lots of Options</h4></div></div>
          <div class="col-md-3"><div class="card-ptc text-center p-3"><h4>No Hidden Fees</h4></div></motion>
          <div class="col-md-3"><div class="card-ptc text-center p-3"><h4>Safety First</h4></div></motion>
          <div></motion>
        </div>""",
).replace("</motion>", "</div>")

public_page("index.html", "Home", 'data-page="home"', INDEX, "", "market-ticker.js")

public_page(
    "about.html",
    "About Us",
    'data-page="about"',
    ph("About Us", "We're one of the largest FX & CFD brokers in the world")
    + sec(
        "<p class='text-muted-ptc'>Prime Trade Capitals is a licensed industry leader. We enhance our platform continually and are regulated by leading financial authorities.</p>"
        "<p class='text-muted-ptc mt-3'>Our registered digital asset investment firm leverages advanced technical analysis for high-return performance with diversified strategies.</p>"
    ),
)

CONTACT_FORM = """
    <form id="contact-form" class="card-ptc">
      <div id="contact-alert" class="alert-ptc d-none mb-3"></div>
      <div class="mb-3"><label class="form-label-ptc">Name</label><input name="name" class="form-control form-control-ptc" required /></div>
      <div class="mb-3"><label class="form-label-ptc">Email</label><input type="email" name="email" class="form-control form-control-ptc" required /></div>
      <div class="mb-3"><label class="form-label-ptc">Subject</label><input name="subject" class="form-control form-control-ptc" /></div>
      <div class="mb-3"><label class="form-label-ptc">Message</label><textarea name="message" rows="5" class="form-control form-control-ptc" required></textarea></div>
      <button type="submit" class="btn btn-gradient">Send Message</button>
    </form>
"""

public_page(
    "contact.html",
    "Contact",
    'data-page="contact"',
    ph("How can we help?", "support@primetradecapitals.com")
    + sec('<div></motion>'.replace("<div></motion>", f'<div class="row justify-content-center"><div class="col-lg-8">{CONTACT_FORM}</div></div>')),
    "",
    "contact-form.js",
)

public_page(
    "platform.html",
    "Platform",
    "",
    ph("Trading Platforms", "GET MORE FROM METATRADER WITH Prime Trade Capitals")
    + sec(
        "<p class='text-muted-ptc'>Our MT4 and MT5 platforms combine charting power with raw spreads and rapid execution. Available on PC, Mac, web and mobile.</p>"
        "<ul class='text-muted-ptc mt-3'><li>Professional technical analysis</li><li>Automatic trading using expert advisors</li><li>Chart trading and market execution</li></ul>"
    ),
)

for slug, title, desc in [
    ("cryptocurrencies", "Cryptocurrencies", "Trade Bitcoin, Ethereum and leading digital assets."),
    ("forex", "Forex Trading", "Access major and minor currency pairs with tight spreads."),
    ("shares", "Shares", "Invest in top global stocks including NFLX, TSLA, AMZN."),
    ("indices", "Indices", "Trade global indices with leverage up to 400:1."),
]:
    public_page(
        f"markets/{slug}.html",
        title,
        "",
        ph(title, desc)
        + sec(f"<p class='text-muted-ptc'>{desc} Open an account to start trading today.</p><a href='../auth/register.html' class='btn btn-gradient mt-3'>Register Now</a>"),
        "../",
    )

for slug, title, body in [
    ("pricing", "Pricing", "<p class='text-muted-ptc'>Competitive spreads and transparent pricing across all asset classes. Contact support for VIP tiers.</p>"),
    ("swaps", "Swaps", "<p class='text-muted-ptc'>Overnight swap rates apply to positions held past market close. Rates vary by instrument.</p>"),
    ("spreads-commissions", "Spreads and Commissions", "<p class='text-muted-ptc'>Zero commission on standard accounts. Raw spreads from 0.0 pips on major pairs for qualified clients.</p>"),
    ("trading-specifications", "Trading Specifications", "<p class='text-muted-ptc'>Leverage up to 400:1. Minimum lot size 0.01. Instant execution on supported instruments.</p>"),
]:
    public_page(slug + ".html", title, "", ph(title, "") + sec(body))

FAQ = """
    <div class="accordion accordion-ptc" id="faqAccordion">
      <div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#f1">How do I open an account?</button></h2><div id="f1" class="accordion-collapse collapse show" data-bs-parent="#faqAccordion"><div></motion></div></div>
    </div>
"""
FAQ = FAQ.replace("<div></motion>", '<div class="accordion-body">Register online, complete KYC verification, fund your account, and start trading.</div>')
public_page("faq.html", "Help Centre / FAQ", "", ph("Help Centre", "Frequently asked questions") + sec(FAQ))

public_page(
    "legal/privacy-policy.html",
    "Privacy Policy",
    "",
    ph("Privacy Policy", "")
    + sec("<p class='text-muted-ptc'>At Prime Trade Capitals, we are committed to protecting your privacy under GDPR and applicable data protection laws. We collect personal data you provide and usage data via cookies. You may request access, correction, or deletion of your data by contacting support.</p>"),
    "../",
)

public_page(
    "legal/terms.html",
    "Terms of Service",
    "",
    ph("Terms of Service", "")
    + sec("<p class='text-muted-ptc'>By using our services you agree to these terms. Trading leveraged products involves substantial risk. Ensure you understand risks before trading.</p>"),
    "../",
)

public_page(
    "legal/company-certificate.html",
    "Company Certificate",
    "",
    ph("Company Certificate", "Corporate registration and compliance")
    + sec(
        """<div class="certificate-display card-ptc p-3 p-md-4 mb-4">
          <a href="../assets/images/cert.png" target="_blank" rel="noopener noreferrer" class="certificate-link">
            <img src="../assets/images/cert.png" alt="Prime Trade Capitals company registration certificate" class="certificate-img" width="960" loading="lazy" />
          </a>
          <p class="text-muted-ptc small text-center mt-3 mb-0">Click the image to open the full certificate in a new tab.</p>
        </div>
        <div class="content-prose">
        <p class="text-muted-ptc">Prime Trade Capitals operates as an international digital trading management platform. Clients engage with <strong>Prime Trade Capitals A/S</strong>, incorporated in Denmark.</p>
        <ul class="text-muted-ptc mt-3">
          <li><strong>Company:</strong> Prime Trade Capitals A/S</li>
          <li><strong>CVR:</strong> 37 12 74 07</li>
          <li><strong>Registered address:</strong> Hammerensgade 1, 1267 Copenhagen K, Denmark</li>
        </ul>
        </div>"""
    ),
    "../",
)

AUTH_WRAP = """
<div class="auth-wrapper">
  <div class="auth-card">
    {body}
  </div>
</motion>
"""

def auth_page(path, title, form_html, extra_js="auth-pages.js"):
    public_page(
        path,
        title,
        "",
        AUTH_WRAP.format(body=form_html).replace("</motion>", "</div>"),
        "../",
        extra_js,
    )

# Auth pages (verify, login, register, forgot) are maintained as hand-edited HTML under auth/.
# See auth/verify.html, auth/login.html, auth/register.html, auth/forgot-password.html

portal_page_fixed(
    "portal/dashboard.html",
    "Dashboard",
    "dashboard",
    """<h1 class="mb-4">Dashboard</h1>
    <div id="kyc-banner" class="kyc-status-banner pending mb-4"></div>
    <div class="row g-4 mb-4">
      <div class="col-md-4"><div class="stat-card"><div class="stat-label">Balance</div><div class="stat-value" id="dash-balance">$0.00</div></div></div>
      <div class="col-md-4"><div class="stat-card"><div class="stat-label">KYC Status</motion><div class="stat-value text-capitalize" id="dash-kyc">pending</div></div></div>
      <div class="col-md-4"><div class="stat-card"><div class="stat-label">Active Plan</div><div class="stat-value" id="dash-plan">None</div></div></div>
    </div>
    <div class="card-ptc"><h5>Pending Transactions</h5><div id="pending-transactions" class="mt-3"></div></div>
    <div class="mt-4 d-flex flex-wrap gap-2">
      <a href="deposit.html" class="btn btn-gradient">Deposit</a>
      <a href="withdraw.html" class="btn btn-outline-light-ptc">Withdraw</a>
      <a href="plans.html" class="btn btn-outline-light-ptc">Plans</a>
    </div>""".replace(
        '<div></motion>', '<div class="stat-label">KYC Status</motion>'
    ).replace("</motion>", "</div>"),
)

# fix dashboard kyc label
DASH = open(os.path.join(ROOT, "portal/dashboard.html"), encoding="utf-8").read() if False else ""

portal_page_fixed(
    "portal/dashboard.html",
    "Dashboard",
    "dashboard",
    """<h1 class="mb-4">Dashboard</h1>
    <div id="kyc-banner" class="kyc-status-banner pending mb-4"></div>
    <div class="row g-4 mb-4">
      <div class="col-md-4"><div class="stat-card"><div class="stat-label">Balance</div><div></motion></div></div>
      <div class="col-md-4"><div class="stat-card"><div class="stat-label">KYC Status</div><div class="stat-value text-capitalize" id="dash-kyc">pending</div></div></div>
      <div class="col-md-4"><div class="stat-card"><div class="stat-label">Active Plan</div><div class="stat-value" id="dash-plan">None</div></div></div>
    </div>
    <div class="card-ptc"><h5>Pending Transactions</h5><div id="pending-transactions" class="mt-3"></div></div>
    <div class="mt-4 d-flex flex-wrap gap-2">
      <a href="deposit.html" class="btn btn-gradient">Deposit</a>
      <a href="withdraw.html" class="btn btn-outline-light-ptc">Withdraw</a>
      <a href="plans.html" class="btn btn-outline-light-ptc">Plans</a>
    </div>""".replace(
        "<div></motion>", '<div></motion>'
    ).replace("<div></motion>", '<div class="stat-value" id="dash-balance">$0.00</div>'),
)

portal_page_fixed(
    "portal/profile.html",
    "Profile",
    "profile",
    """<h1 class="mb-4">Profile</h1>
    <form id="profile-form" class="card-ptc" style="max-width:480px">
      <div class="mb-3"><label class="form-label-ptc">Full Name</label><input name="full_name" class="form-control form-control-ptc" /></div>
      <div class="mb-3"><label class="form-label-ptc">Phone</label><input name="phone" class="form-control form-control-ptc" /></div>
      <div class="mb-3"><label class="form-label-ptc">Country</label><input name="country" class="form-control form-control-ptc" /></div>
      <button type="submit" class="btn btn-gradient">Save</button>
    </form>""",
)

portal_page_fixed(
    "portal/kyc.html",
    "KYC",
    "kyc",
    """<h1 class="mb-4">KYC Verification</h1>
    <p class="text-muted-ptc">Upload government ID and proof of address to activate deposits and plan subscriptions.</p>
    <form id="kyc-form" class="card-ptc mt-4" style="max-width:480px">
      <div class="mb-3"><label class="form-label-ptc">Document Type</label>
        <select name="document_type" class="form-select form-control-ptc" required>
          <option value="passport">Passport</option>
          <option value="id_card">National ID</option>
          <option value="proof_of_address">Proof of Address</option>
        </select></div>
      <div class="mb-3"><label class="form-label-ptc">File</label><input type="file" name="document" class="form-control form-control-ptc" accept="image/*,.pdf" required /></div>
      <button type="submit" class="btn btn-gradient">Upload</button>
    </form>""",
)

portal_page_fixed(
    "portal/plans.html",
    "Plans",
    "plans",
    '<h1 class="mb-4">Investment Plans</h1><div class="row g-4" id="plans-container"></div>',
)

portal_page_fixed(
    "portal/deposit.html",
    "Deposit",
    "deposit",
    """<h1 class="mb-4">Deposit</h1>
    <form id="deposit-form" class="card-ptc" style="max-width:480px">
      <div></motion>
    </form>""".replace(
        "<div></motion>",
        """<div></motion>""",
    ),
)

print("Run cleanup motion tags manually if any remain")
