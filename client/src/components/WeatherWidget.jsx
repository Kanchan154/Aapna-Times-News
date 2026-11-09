import { useEffect, useState } from 'react';
import { CloudSun, Droplets, Wind } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Live data from Open-Meteo (free, no API key). Fails quietly if the network blocks it.
const CITIES = {
  Delhi: [28.61, 77.21], Mumbai: [19.08, 72.88], Kolkata: [22.57, 88.36], Chennai: [13.08, 80.27], Bengaluru: [12.97, 77.59],
  Hyderabad: [17.39, 78.49], Lucknow: [26.85, 80.95], Jaipur: [26.91, 75.79], Patna: [25.59, 85.14], Dehradun: [30.32, 78.03],
  Almora: [29.6, 79.66], Haldwani: [29.22, 79.51], Nainital: [29.39, 79.45],
};
const WMO = (c) => (c === 0 ? 'साफ़ आसमान' : c <= 2 ? 'आंशिक बादल' : c === 3 ? 'बादल छाए' : c <= 48 ? 'कोहरा' : c <= 57 ? 'बूँदाबाँदी' : c <= 67 ? 'बारिश' : c <= 77 ? 'बर्फ़बारी' : c <= 82 ? 'बौछारें' : 'आँधी-तूफ़ान');
const HI = { Delhi: 'दिल्ली', Mumbai: 'मुंबई', Kolkata: 'कोलकाता', Chennai: 'चेन्नई', Bengaluru: 'बेंगलुरु', Hyderabad: 'हैदराबाद', Lucknow: 'लखनऊ', Jaipur: 'जयपुर', Patna: 'पटना', Dehradun: 'देहरादून', Almora: 'अल्मोड़ा', Haldwani: 'हल्द्वानी', Nainital: 'नैनीताल' };
const day = (d) => new Date(d).toLocaleDateString('hi-IN', { weekday: 'short' });

export default function WeatherWidget() {
  const { user } = useAuth();
  const initial = Object.keys(CITIES).find((c) => c.toLowerCase() === user?.city?.toLowerCase() || HI[c] === user?.city?.trim()) || localStorage.getItem('aapna_city') || 'Delhi';
  const [city, setCity] = useState(CITIES[initial] ? initial : 'Delhi');
  const [w, setW] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const [lat, lon] = CITIES[city];
    const ctl = new AbortController();
    setW(null); setFailed(false);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`, { signal: ctl.signal })
      .then((r) => r.json()).then(setW).catch((e) => e.name !== 'AbortError' && setFailed(true));
    return () => ctl.abort();
  }, [city]);

  return (
    <section className="panel overflow-hidden" aria-label="मौसम">
      <div className="flex items-center justify-between bg-gradient-to-r from-sky-700 to-cyan-600 px-4 py-2.5 text-white">
        <h2 className="flex items-center gap-2 text-sm font-bold"><CloudSun size={16} /> मौसम</h2>
        <select value={city} onChange={(e) => { setCity(e.target.value); localStorage.setItem('aapna_city', e.target.value); }} aria-label="शहर चुनें"
          className="rounded bg-white/15 px-2 py-0.5 text-xs font-semibold text-white focus:outline-none [&>option]:text-ink">
          {Object.keys(CITIES).map((c) => <option key={c} value={c}>{HI[c]}</option>)}
        </select>
      </div>
      <div className="p-4">
        {failed && <p className="text-sm text-ink-soft">अभी मौसम की जानकारी उपलब्ध नहीं है।</p>}
        {!w && !failed && <div className="h-24 animate-pulse rounded bg-mist" />}
        {w?.current && (
          <>
            <div className="flex items-end justify-between">
              <div><div className="font-display text-4xl font-extrabold">{Math.round(w.current.temperature_2m)}°C</div><div className="text-sm text-ink-soft">{WMO(w.current.weather_code)}</div></div>
              <div className="space-y-1 text-xs text-ink-soft"><div className="flex items-center gap-1"><Droplets size={13} />{w.current.relative_humidity_2m}% नमी</div><div className="flex items-center gap-1"><Wind size={13} />{Math.round(w.current.wind_speed_10m)} किमी/घंटा</div></div>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 border-t border-mist-line pt-3 text-center text-xs">
              {w.daily.time.slice(1, 4).map((d, i) => (
                <li key={d}><div className="font-semibold">{day(d)}</div><div className="text-ink-faint">{WMO(w.daily.weather_code[i + 1])}</div><div>{Math.round(w.daily.temperature_2m_max[i + 1])}° / {Math.round(w.daily.temperature_2m_min[i + 1])}°</div></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
