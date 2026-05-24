import { useState, useEffect } from 'react';

const WMO = {
  0: ['맑음', '☀️'], 1: ['대체로 맑음', '🌤️'], 2: ['구름 조금', '⛅'], 3: ['흐림', '☁️'],
  45: ['안개', '🌫️'], 48: ['안개', '🌫️'],
  51: ['이슬비', '🌦️'], 53: ['이슬비', '🌦️'], 55: ['이슬비', '🌦️'],
  61: ['비', '🌧️'], 63: ['비', '🌧️'], 65: ['강한 비', '🌧️'],
  71: ['눈', '❄️'], 73: ['눈', '❄️'], 75: ['강한 눈', '❄️'],
  80: ['소나기', '🌦️'], 81: ['소나기', '🌦️'], 82: ['강한 소나기', '⛈️'],
  95: ['뇌우', '⛈️'], 96: ['뇌우+우박', '⛈️'], 99: ['뇌우+우박', '⛈️'],
};

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="widget-card">
      <div className="widget-label">현재 시각</div>
      <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '2px', fontVariantNumeric: 'tabular-nums', color: 'var(--primary)', lineHeight: 1.1 }}>
        {hh}<span style={{ opacity: 0.5, animation: 'blink 1s step-start infinite' }}>:</span>{mm}
        <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '4px' }}>{ss}</span>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>{dateStr}</div>
    </div>
  );
}

function Calendar() {
  const today = new Date();
  const [viewing, setViewing] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const firstDay = new Date(viewing.y, viewing.m, 1).getDay();
  const daysInMonth = new Date(viewing.y, viewing.m + 1, 0).getDate();
  const isToday = (d) => d === today.getDate() && viewing.m === today.getMonth() && viewing.y === today.getFullYear();

  const prev = () => setViewing(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  const next = () => setViewing(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="widget-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button onClick={prev} className="cal-nav">‹</button>
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
          {viewing.y}년 {viewing.m + 1}월
        </div>
        <button onClick={next} className="cal-nav">›</button>
      </div>
      <div className="cal-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className="cal-head" style={{ color: i === 0 ? 'var(--error)' : i === 6 ? 'var(--primary)' : 'var(--text-muted)' }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className={`cal-cell ${d && isToday(d) ? 'cal-today' : ''}`}
            style={{ color: d && (i % 7 === 0) ? 'var(--error)' : d && (i % 7 === 6) ? 'var(--primary)' : '' }}>
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function Weather() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) { setError('위치 정보를 지원하지 않는 브라우저입니다.'); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      try {
        const [meteo, geo] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`).then(r => r.json()),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`).then(r => r.json()),
        ]);
        setWeather(meteo.current);
        const addr = geo.address;
        setCity(addr.city || addr.town || addr.county || addr.state || '');
      } catch {
        setError('날씨 정보를 불러올 수 없습니다.');
      }
    }, () => setError('위치 접근이 거부되었습니다.'));
  }, []);

  const [desc, icon] = WMO[weather?.weather_code] || ['알 수 없음', '❓'];

  return (
    <div className="widget-card">
      <div className="widget-label">현재 날씨 {city && `— ${city}`}</div>
      {error ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>{error}</div>
      ) : !weather ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>위치 정보 로딩 중...</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{icon}</span>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                {Math.round(weather.temperature_2m)}°C
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>💧 습도 {weather.relative_humidity_2m}%</span>
            <span>💨 풍속 {Math.round(weather.wind_speed_10m)} km/h</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardWidgets() {
  return (
    <div className="widget-row">
      <Clock />
      <Calendar />
      <Weather />
    </div>
  );
}
