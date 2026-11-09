# Browser end-to-end test (Python + Playwright) for the Hindi UI.
# Needs the app running on :5000 with seeded data (npm run seed).
#   pip install playwright && playwright install chromium && python tests/e2e_browser.py   (from project root)
import time, re, os
from playwright.sync_api import sync_playwright, expect
B = os.environ.get('APP_URL', 'http://localhost:5000')
COVER = os.path.join(os.path.dirname(__file__), 'cover.png')
TITLE = f'ब्राउज़र टेस्ट: नई मेट्रो लाइन तय समय से पहले चालू {int(time.time()) % 100000}'
errs, ok = [], []
def step(name): ok.append(name); print('PASS', name)
def login(pg, email, pw):
    pg.goto(B + '/login'); pg.get_by_label('ईमेल', exact=True).fill(email); pg.get_by_label('पासवर्ड', exact=True).fill(pw)
    pg.get_by_role('button', name='लॉग इन', exact=True).click(); pg.wait_for_url('**/dashboard')
with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(w=1366, h=900):
        c = b.new_context(viewport={'width': w, 'height': h}); pg = c.new_page()
        pg.on('console', lambda m: errs.append(m.text[:140]) if m.type == 'error' and 'ERR_NAME_NOT_RESOLVED' not in m.text and '401' not in m.text and '422' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)[:200])); return c, pg
    # ---------- Public / reader ----------
    rc, rp = ctx()
    rp.goto(B + '/'); expect(rp.locator('html')).to_have_attribute('lang', 'hi'); expect(rp.get_by_label('अपना टाइम्स न्यूज़ होम').first).to_be_visible(); step('site is Hindi (lang=hi) with अपना टाइम्स न्यूज़ branding')
    for name in ['राजनीति', 'खेल', 'तकनीक', 'कारोबार', 'शिक्षा', 'मनोरंजन', 'मौसम']:
        expect(rp.get_by_role('navigation', name='श्रेणियाँ').get_by_role('link', name=name)).to_be_visible()
    step('all 7 Hindi category tabs in navigation')
    rp.goto(B + '/login'); rp.get_by_label('ईमेल', exact=True).fill('reader@aapnatimes.com'); rp.get_by_label('पासवर्ड', exact=True).fill('wrong-pass1')
    rp.get_by_role('button', name='लॉग इन', exact=True).click(); expect(rp.get_by_role('alert')).to_contain_text('ईमेल या पासवर्ड गलत है'); step('wrong password -> Hindi error message')
    login(rp, 'reader@aapnatimes.com', 'Reader@123'); expect(rp.get_by_text('स्वागत है, नेहा')).to_be_visible(); step('reader login -> reader dashboard')
    rp.goto(B + '/'); rp.get_by_role('link', name=re.compile('संसद में डिजिटल रिकॉर्ड बिल पास')).first.click()
    expect(rp.locator('h1')).to_contain_text('संसद में डिजिटल रिकॉर्ड'); step('article page renders (Hindi slug URL)')
    like = rp.get_by_role('button', name=re.compile(r'^\s*\d+\s*$')).first
    before = int(like.inner_text().strip()); like.click(); rp.wait_for_timeout(600)
    after = int(rp.get_by_role('button', name=re.compile(r'^\s*\d+\s*$')).first.inner_text().strip()); assert after != before; step(f'like toggles ({before}->{after})')
    rp.get_by_role('button', name=re.compile('सेव करें')).click(); expect(rp.get_by_role('button', name='सेव हो गई')).to_be_visible(); step('bookmark saved')
    rp.get_by_label('कमेंट लिखें').fill('ब्राउज़र टेस्ट का कमेंट: बहुत काम की जानकारी।'); rp.get_by_role('button', name='कमेंट करें').click()
    expect(rp.locator('p', has_text='ब्राउज़र टेस्ट का कमेंट')).to_be_visible(); step('comment posted and shown')
    rp.screenshot(path='/tmp/shots/hi-article.png')
    rp.goto(B + '/bookmarks'); expect(rp.locator('main').get_by_text('संसद में डिजिटल रिकॉर्ड').first).to_be_visible(); step('bookmarks page lists saved story')
    rp.goto(B + '/search?q=' + 'क्रिकेट'); expect(rp.get_by_text(re.compile(r'\d+ नतीजे'))).to_be_visible(); expect(rp.locator('main').get_by_text('आख़िरी ओवर').first).to_be_visible(); step('Hindi keyword search returns results')
    rp.goto(B + '/category/sports'); expect(rp.locator('h1')).to_contain_text('खेल'); step('category page shows Hindi name')
    rp.goto(B + '/feed'); expect(rp.get_by_text('आपके चुने हुए सेक्शन की खबरें')).to_be_visible(); step('personalised feed')
    rp.goto(B + '/'); rp.wait_for_timeout(1500)

    # ---------- Reporter ----------
    pc, pp = ctx(); login(pp, 'riya@aapnatimes.com', 'Reporter@123'); expect(pp.get_by_text('नमस्ते, रिया')).to_be_visible(); step('reporter dashboard (Hindi)')
    pp.goto(B + '/dashboard/articles/new'); pp.get_by_role('button', name='मंज़ूरी के लिए भेजें').click()
    expect(pp.get_by_text(re.compile('हेडलाइन 8–220')).first).to_be_visible(); step('editor validation shows Hindi messages')
    pp.get_by_placeholder('साफ़ और सटीक हेडलाइन').fill(TITLE)
    pp.locator('textarea').first.fill('नई लाइन हवाई अड्डे को पुराने शहर से जोड़ती है और रोज़ सफ़र करने वालों का समय लगभग आधा कर देगी।')
    pp.get_by_role('textbox', name='खबर का मुख्य हिस्सा').click(); pp.keyboard.type('अधिकारियों ने शुक्रवार को नया मेट्रो कॉरिडोर तय समय से हफ़्तों पहले खोल दिया। सुबह से ही यात्री पहली ट्रेन के लिए कतार में दिखे।')
    pp.get_by_role('button', name='मोटा').click()
    pp.locator('select').first.select_option(label='तकनीक')
    pp.locator('input[type=file]').nth(1).set_input_files(COVER)
    pp.get_by_placeholder('क्रिकेट, सीरीज़').fill('मेट्रो, परिवहन')
    pp.screenshot(path='/tmp/shots/hi-editor.png', full_page=True)
    pp.get_by_role('button', name='मंज़ूरी के लिए भेजें').click(); pp.wait_for_url('**/dashboard/articles'); expect(pp.get_by_text(TITLE)).to_be_visible(); step('reporter submits Hindi article with cover image')
    expect(pp.locator('tr', has_text=TITLE).get_by_text('समीक्षा में')).to_be_visible(); step('article shows as "समीक्षा में" (pending)')
    pp.goto(B + '/'); expect(pp.locator('main').get_by_text(TITLE)).to_have_count(0); step('pending article NOT visible on public home')

    # ---------- Admin ----------
    ac, ap = ctx(); login(ap, 'admin@aapnatimes.com', 'Admin@12345'); expect(ap.get_by_text('साइट एनालिटिक्स')).to_be_visible(); step('admin analytics dashboard (Hindi)')
    ap.wait_for_timeout(800); ap.screenshot(path='/tmp/shots/hi-admin.png', full_page=True)
    ap.goto(B + '/dashboard/review'); row = ap.locator('tr', has_text=TITLE); expect(row).to_be_visible(); step('article appears in admin review queue')
    ap.screenshot(path='/tmp/shots/hi-review.png')
    row.get_by_role('button', name=re.compile('मंज़ूर करें')).click(); ap.wait_for_timeout(800); step('admin approved')
    expect(rp.get_by_text(re.compile('नई खबर: ब्राउज़र टेस्ट'))).to_be_visible(timeout=6000); step('REAL-TIME: reader got live "नई खबर" toast')
    expect(rp.locator('main').get_by_text(TITLE).first).to_be_visible(timeout=6000); step('REAL-TIME: story appears on reader home without reload')
    rp.screenshot(path='/tmp/shots/hi-live.png')
    expect(pp.get_by_text(re.compile('आपकी खबर पब्लिश हो गई: ब्राउज़र टेस्ट'))).to_be_visible(timeout=6000); step('REAL-TIME: reporter notified of approval')
    pp.goto(B + '/dashboard/articles/new'); pp.get_by_placeholder('साफ़ और सटीक हेडलाइन').fill('यह खबर सुधार के लिए वापस भेजी जाएगी')
    pp.locator('textarea').first.fill('इस टेस्ट के लिए पर्याप्त लंबा सार, ताकि सत्यापन के नियम पास हो जाएँ।')
    pp.get_by_role('textbox', name='खबर का मुख्य हिस्सा').click(); pp.keyboard.type('इस खबर में काफ़ी अक्षर हैं ताकि अस्वीकार करने के टेस्ट में सत्यापन आसानी से पास हो सके।')
    pp.locator('select').first.select_option(label='कारोबार'); pp.get_by_role('button', name='मंज़ूरी के लिए भेजें').click(); pp.wait_for_url('**/dashboard/articles')
    ap.goto(B + '/dashboard/review'); r2 = ap.locator('tr', has_text='यह खबर सुधार के लिए वापस'); r2.get_by_role('button', name=re.compile('अस्वीकार करें')).click()
    ap.get_by_label('कारण').fill('एक नामित सूत्र ज़रूरी है।'); ap.get_by_role('button', name='सुझाव के साथ अस्वीकार करें').click(); ap.wait_for_timeout(700)
    pp.goto(B + '/dashboard/articles'); expect(pp.get_by_text('संपादक की टिप्पणी: एक नामित सूत्र ज़रूरी है।')).to_be_visible(); step('rejection feedback visible to reporter')
    for path, txt in [('users', 'यूज़र'), ('categories', 'श्रेणियाँ'), ('comments', 'कमेंट'), ('ads', 'विज्ञापन'), ('subscribers', 'न्यूज़लेटर सब्सक्राइबर')]:
        ap.goto(B + '/dashboard/' + path); expect(ap.locator('h1')).to_contain_text(txt); ap.wait_for_timeout(500)
    step('admin pages: users, categories, comments, ads, subscribers load')
    ap.goto(B + '/dashboard/users'); ap.screenshot(path='/tmp/shots/hi-users.png')
    rp.goto(B + '/dashboard/review'); rp.wait_for_url('**/dashboard'); step('reader redirected away from admin page')
    mc, mp = ctx(390, 844); mp.goto(B + '/'); mp.wait_for_timeout(1500)
    assert not mp.evaluate('document.documentElement.scrollWidth > window.innerWidth'); step('mobile: no horizontal overflow on home')
    mp.goto(B + '/category/weather'); mp.wait_for_timeout(1200)
    assert not mp.evaluate('document.documentElement.scrollWidth > window.innerWidth'); step('mobile: no horizontal overflow on category page')
    b.close()
print('\nconsole/page errors (excluding blocked external hosts and intentional 401/422):', errs)
print(len(ok), 'UI checks passed')
