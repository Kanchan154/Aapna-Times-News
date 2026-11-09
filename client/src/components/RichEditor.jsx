import { useEffect, useRef } from 'react';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, ImagePlus, Undo2, Eraser } from 'lucide-react';
import { api, errMsg, img } from '../lib/api';
import { useToast } from '../context/ToastContext';

// Lightweight WYSIWYG editor (contentEditable). The server sanitises the HTML again before saving.
export default function RichEditor({ initial = '', onChange }) {
  const ref = useRef(null);
  const file = useRef(null);
  const toast = useToast();

  useEffect(() => { if (ref.current) ref.current.innerHTML = initial; /* set once */ // eslint-disable-next-line
  }, []);

  const emit = () => onChange(ref.current.innerHTML);
  const run = (cmd, val) => { ref.current.focus(); document.execCommand(cmd, false, val); emit(); };
  const addLink = () => {
    const url = window.prompt('लिंक का पता (https://…)');
    if (url && /^https?:\/\//i.test(url)) run('createLink', url); else if (url) toast.error('लिंक http:// या https:// से शुरू होना चाहिए');
  };
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('image', f);
    try { const r = await api.post('/upload', fd); run('insertImage', img(r.data.url)); }
    catch (err) { toast.error(errMsg(err)); } finally { e.target.value = ''; }
  };

  const B = ({ icon: Icon, label, onClick }) => (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={label} aria-label={label} className="rounded p-1.5 text-ink-soft hover:bg-mist hover:text-ink"><Icon size={16} /></button>
  );

  return (
    <div className="overflow-hidden rounded-md border border-mist-line focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-200">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-mist-line bg-mist/60 px-2 py-1" role="toolbar" aria-label="फ़ॉर्मैटिंग">
        <B icon={Bold} label="मोटा" onClick={() => run('bold')} />
        <B icon={Italic} label="तिरछा" onClick={() => run('italic')} />
        <B icon={Heading2} label="शीर्षक" onClick={() => run('formatBlock', 'h2')} />
        <B icon={Heading3} label="उप-शीर्षक" onClick={() => run('formatBlock', 'h3')} />
        <B icon={List} label="बुलेट सूची" onClick={() => run('insertUnorderedList')} />
        <B icon={ListOrdered} label="क्रमांकित सूची" onClick={() => run('insertOrderedList')} />
        <B icon={Quote} label="उद्धरण" onClick={() => run('formatBlock', 'blockquote')} />
        <B icon={Link2} label="लिंक जोड़ें" onClick={addLink} />
        <B icon={ImagePlus} label="फ़ोटो जोड़ें" onClick={() => file.current.click()} />
        <B icon={Eraser} label="सामान्य पैराग्राफ़" onClick={() => run('formatBlock', 'p')} />
        <B icon={Undo2} label="पहले जैसा करें" onClick={() => run('undo')} />
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={upload} />
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit} onBlur={emit} role="textbox" aria-multiline="true" aria-label="खबर का मुख्य हिस्सा"
        data-placeholder="पूरी खबर यहाँ लिखिए…" className="editor article-body max-h-[60vh] min-h-[320px] overflow-auto bg-white px-4 py-3 focus:outline-none" />
    </div>
  );
}
