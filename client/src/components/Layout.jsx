import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Bookmark, Sparkles, Rss, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useLive } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import Ticker from './Ticker';
import SearchBar from './SearchBar';
import NewsletterBox from './NewsletterBox';
import { Avatar } from './ui';
import { catName } from '../lib/format';

export const Logo = ({ light }) => (
  <Link to="/" className="inline-flex items-center gap-2" aria-label="अपना टाइम्स न्यूज़ होम">
    <img
      src="/logo.png"
      alt="Aapna Times News"
      className="h-14 w-auto shrink-0 object-contain sm:h-20"
    />
    <span className="flex flex-col">
      <span className={`flex items-center gap-1 whitespace-nowrap font-display text-[19px] font-extrabold leading-tight sm:text-[27px] ${light ? 'text-white' : 'text-ink'}`}>अपना टाइम्स <span className="rounded bg-marigold-500 px-1.5 text-ink">न्यूज़</span></span>
      <span className={`hidden text-[9px] font-bold uppercase tracking-[0.22em] sm:block ${light ? 'text-slate-400' : 'text-ink-faint'}`}>Aapna Times News</span>
    </span>
  </Link>
);

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  if (!user) return (
    <div className="flex items-center gap-2">
      <Link to="/login" className="btn-ghost px-2 sm:px-4">लॉग इन</Link>
      <Link to="/register" className="btn-primary px-3 sm:px-4">साइन अप</Link>
    </div>
  );
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-mist" aria-haspopup="menu" aria-expanded={open}>
        <Avatar user={user} size={32} /><span className="hidden text-sm font-semibold sm:inline">{user.name.split(' ')[0]}</span><ChevronDown size={14} className="text-ink-faint" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-56 animate-pop overflow-hidden rounded-lg border border-mist-line bg-white shadow-lg">
          <div className="border-b border-mist-line px-4 py-3"><div className="truncate text-sm font-bold">{user.name}</div><div className="truncate text-xs capitalize text-ink-faint">{user.role} · {user.email}</div></div>
          <Link role="menuitem" to="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-mist"><LayoutDashboard size={15} /> डैशबोर्ड</Link>
          <Link role="menuitem" to="/feed" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-mist"><Sparkles size={15} /> मेरा फ़ीड</Link>
          <Link role="menuitem" to="/bookmarks" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-mist"><Bookmark size={15} /> बुकमार्क</Link>
          <button role="menuitem" onClick={() => { logout(); nav('/'); }} className="flex w-full items-center gap-2 border-t border-mist-line px-4 py-2.5 text-left text-sm text-signal-600 hover:bg-mist"><LogOut size={15} /> लॉग आउट</button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { categories } = useCategories();
  const { user } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  useEffect(() => { setDrawer(false); }, [loc.pathname]);
  const today = new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tab = ({ isActive }) => `whitespace-nowrap border-b-[3px] px-3 py-3 text-sm font-bold transition-colors ${isActive ? 'border-marigold-500 text-indigo-700' : 'border-transparent text-ink-soft hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="hidden border-b border-mist-line bg-mist text-xs text-ink-soft md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5"><span>{today}</span><a href="/rss.xml" className="inline-flex items-center gap-1 hover:text-ink"><Rss size={12} /> RSS फ़ीड</a></div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <button className="btn-ghost -ml-1 px-1.5 lg:hidden" onClick={() => setDrawer(true)} aria-label="मेनू खोलें"><Menu size={22} /></button>
        <Logo />
        <div className="ml-auto hidden w-72 md:block lg:w-96"><SearchBar /></div>
        <div className="ml-auto md:ml-2"><UserMenu /></div>
      </div>
      <nav className="border-t border-mist-line" aria-label="श्रेणियाँ">
        <div className="no-scrollbar mx-auto flex max-w-7xl overflow-x-auto px-2">
          <NavLink to="/" end className={tab}>होम</NavLink>
          {categories.map((c) => <NavLink key={c._id} to={`/category/${c.slug}`} className={tab}>{catName(c)}</NavLink>)}
          {user && <NavLink to="/feed" className={tab}>आपके लिए</NavLink>}
        </div>
      </nav>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-pop overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><Logo /><button onClick={() => setDrawer(false)} aria-label="मेनू बंद करें"><X /></button></div>
            <SearchBar onDone={() => setDrawer(false)} className="mb-4 md:hidden" />
            <ul className="space-y-1 text-sm font-semibold">
              <li><NavLink to="/" end className="block rounded px-3 py-2 hover:bg-mist">होम</NavLink></li>
              {categories.map((c) => <li key={c._id}><NavLink to={`/category/${c.slug}`} className="flex justify-between rounded px-3 py-2 hover:bg-mist"><span>{catName(c)}</span><span className="text-xs text-ink-faint">{c.name}</span></NavLink></li>)}
              {user && <><li><NavLink to="/feed" className="block rounded px-3 py-2 hover:bg-mist">आपके लिए</NavLink></li><li><NavLink to="/bookmarks" className="block rounded px-3 py-2 hover:bg-mist">बुकमार्क</NavLink></li></>}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const { categories } = useCategories();
  return (
    <footer className="mt-16 bg-ink text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-md text-sm text-slate-400">अपना टाइम्स न्यूज़ — सीधी बात, सही खबर। ब्रेकिंग न्यूज़, रोज़ के अपडेट और आपके शहर का मौसम, आसान भाषा में।</p>
          <div className="mt-5 max-w-md"><NewsletterBox compact /></div>
        </div>
        <div><h3 className="mb-3 text-sm font-bold text-white">सेक्शन</h3><ul className="space-y-2 text-sm">{categories.map((c) => <li key={c._id}><Link className="hover:text-white" to={`/category/${c.slug}`}>{catName(c)}</Link></li>)}</ul></div>
        <div><h3 className="mb-3 text-sm font-bold text-white">अपना टाइम्स न्यूज़</h3><ul className="space-y-2 text-sm"><li><Link className="hover:text-white" to="/search">सारी खबरें</Link></li><li><Link className="hover:text-white" to="/register">पाठक बनकर जुड़ें</Link></li><li><a className="hover:text-white" href="/rss.xml">RSS फ़ीड</a></li><li><a className="hover:text-white" href="/sitemap.xml">साइटमैप</a></li></ul></div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} अपना टाइम्स न्यूज़ (Aapna Times News)। सर्वाधिकार सुरक्षित।</div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]); // braces: newer browsers return a Promise from scrollTo
  useLive('article:reviewed', (p) => user && toast[p.status === 'published' ? 'success' : 'error'](p.status === 'published' ? `आपकी खबर पब्लिश हो गई: ${p.title}` : `आपकी खबर में बदलाव चाहिए: ${p.title}`, { to: '/dashboard/articles' }));
  useLive('article:pending', (p) => user?.role === 'admin' && toast.info(`समीक्षा के लिए नई खबर आई: ${p.title}`, { to: '/dashboard/review' }));
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2">मुख्य सामग्री पर जाएँ</a>
      <Header />
      <Ticker />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
