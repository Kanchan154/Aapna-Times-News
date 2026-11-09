import { useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, PenSquare, User, Users, Tags, MessageSquare, Megaphone, Mail, ClipboardCheck, Bookmark, Sparkles, Home, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Layout';
import { Avatar, Badge, STATUS_HI } from '../../components/ui';
import { useLive } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import Seo from '../../components/Seo';
import Overview from './Overview';
import Profile from './Profile';
import MyArticles from './MyArticles';
import ArticleEditor from './ArticleEditor';
import Review from './admin/Review';
import UsersAdmin from './admin/Users';
import Categories from './admin/Categories';
import CommentsAdmin from './admin/CommentsAdmin';
import Ads from './admin/Ads';
import Subscribers from './admin/Subscribers';

// [path, label, icon, exact?]
const MENU = {
  reader: [
    ['/dashboard', 'ओवरव्यू', LayoutDashboard, true], ['/feed', 'मेरा फ़ीड', Sparkles], ['/bookmarks', 'बुकमार्क', Bookmark], ['/dashboard/profile', 'प्रोफ़ाइल और पसंद', User],
  ],
  reporter: [
    ['/dashboard', 'ओवरव्यू', LayoutDashboard, true], ['/dashboard/articles/new', 'खबर लिखें', PenSquare], ['/dashboard/articles', 'मेरी खबरें', FileText, true], ['/dashboard/profile', 'प्रोफ़ाइल', User],
  ],
  admin: [
    ['/dashboard', 'एनालिटिक्स', LayoutDashboard, true], ['/dashboard/review', 'खबरें और समीक्षा', ClipboardCheck], ['/dashboard/articles/new', 'खबर लिखें', PenSquare],
    ['/dashboard/users', 'यूज़र', Users], ['/dashboard/categories', 'श्रेणियाँ', Tags], ['/dashboard/comments', 'कमेंट', MessageSquare],
    ['/dashboard/ads', 'विज्ञापन', Megaphone], ['/dashboard/subscribers', 'न्यूज़लेटर', Mail], ['/dashboard/profile', 'प्रोफ़ाइल', User],
  ],
};

const only = (roles, role, el) => (roles.includes(role) ? el : <Navigate to="/dashboard" replace />);

export default function DashboardRoutes() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const role = user.role;

  useLive('article:reviewed', (p) => toast[p.status === 'published' ? 'success' : 'error'](p.status === 'published' ? `पब्लिश: ${p.title}` : `बदलाव माँगे गए: ${p.title}`));
  useLive('article:pending', (p) => role === 'admin' && toast.info(`समीक्षा बाकी: ${p.title}`, { to: '/dashboard/review' }));

  const linkCls = ({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-indigo-700 text-white' : 'text-ink-soft hover:bg-mist'}`;
  const menu = (
    <nav className="space-y-1" aria-label="डैशबोर्ड">
      {MENU[role].map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} className={linkCls} onClick={() => setOpen(false)}><Icon size={17} />{label}</NavLink>
      ))}
      <button onClick={() => { logout(); nav('/'); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-signal-600 hover:bg-mist"><LogOut size={17} /> लॉग आउट</button>
    </nav>
  );
  const who = (
    <div className="mb-3 flex items-center gap-3 border-b border-mist-line px-2 pb-3">
      <Avatar user={user} size={40} />
      <div className="min-w-0"><div className="truncate text-sm font-bold">{user.name}</div><Badge value={role} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mist">
      <Seo title="डैशबोर्ड" noindex />
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-mist-line bg-white px-4 py-2.5">
        <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="मेनू खोलें"><Menu /></button>
        <Logo />
        <span className="hidden text-sm font-semibold capitalize text-ink-faint sm:inline">/ {STATUS_HI[role]} डैशबोर्ड</span>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/" className="btn-ghost btn-sm"><Home size={15} /> <span className="hidden sm:inline">वेबसाइट देखें</span></Link>
          <Avatar user={user} size={32} />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-pop overflow-auto bg-white p-4">
            <button className="mb-3" onClick={() => setOpen(false)} aria-label="मेनू बंद करें"><X /></button>
            {who}{menu}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block"><div className="panel sticky top-20 p-3">{who}{menu}</div></aside>
        <main className="min-w-0 flex-1">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="profile" element={<Profile />} />
            <Route path="articles" element={only(['reporter', 'admin'], role, <MyArticles />)} />
            <Route path="articles/new" element={only(['reporter', 'admin'], role, <ArticleEditor />)} />
            <Route path="articles/:id/edit" element={only(['reporter', 'admin'], role, <ArticleEditor />)} />
            <Route path="review" element={only(['admin'], role, <Review />)} />
            <Route path="users" element={only(['admin'], role, <UsersAdmin />)} />
            <Route path="categories" element={only(['admin'], role, <Categories />)} />
            <Route path="comments" element={only(['admin'], role, <CommentsAdmin />)} />
            <Route path="ads" element={only(['admin'], role, <Ads />)} />
            <Route path="subscribers" element={only(['admin'], role, <Subscribers />)} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
