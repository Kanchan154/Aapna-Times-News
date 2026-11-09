import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <Seo title="पेज नहीं मिला" noindex />
      <p className="font-display text-7xl font-extrabold text-indigo-700">404</p>
      <h1 className="mt-2 text-2xl font-bold">यह पेज हमें मिला नहीं</h1>
      <p className="mt-2 text-ink-soft">हो सकता है लिंक पुराना हो या खबर हटा दी गई हो।</p>
      <Link to="/" className="btn-primary mt-6">होम पर लौटें</Link>
    </div>
  );
}
