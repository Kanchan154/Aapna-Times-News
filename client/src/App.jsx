import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import ArticleDetail from './pages/ArticleDetail';
import { Login, Register } from './pages/Auth';
import { Feed, Bookmarks } from './pages/Personal';
import NotFound from './pages/NotFound';

// Dashboards are code-split: readers never download admin code.
const Dashboard = lazy(() => import('./pages/dashboard/DashboardRoutes'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="category/:slug" element={<Category />} />
        <Route path="search" element={<Search />} />
        <Route path="article/:slug" element={<ArticleDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="dashboard/*" element={<ProtectedRoute><Suspense fallback={<Spinner />}><Dashboard /></Suspense></ProtectedRoute>} />
    </Routes>
  );
}
