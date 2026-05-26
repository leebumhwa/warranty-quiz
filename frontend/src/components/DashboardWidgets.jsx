import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const MEDAL = ['🥇', '🥈', '🥉'];

export function LeaderboardWidget() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get('/results/leaderboard').then(r => setData(r.data.leaderboard.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <div className="widget-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div className="widget-label">🏆 랭킹</div>
        <Link to="/leaderboard" style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none' }}>전체 보기 →</Link>
      </div>
      {data.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>아직 데이터가 없습니다.</div>
      ) : (
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.map(r => (
            <li key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: r.rank <= 3 ? '1rem' : '0.75rem', minWidth: '22px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                {r.rank <= 3 ? MEDAL[r.rank - 1] : `${r.rank}`}
              </span>
              <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.user_name}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: r.avg_accuracy >= 80 ? 'var(--success)' : r.avg_accuracy >= 60 ? 'var(--warning)' : 'var(--error)', flexShrink: 0 }}>
                {r.avg_accuracy}%
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const WMO = {
  0: ['맑음', '☀️'], 1: ['대체로 맑음', '🌤️'], 2: ['구름 조금', '⛅'], 3: ['흐림', '☁️'],
  45: ['안개', '🌫️'], 48: ['안개', '🌫️'],
  51: ['이슬비', '🌦️'], 53: ['이슬비', '🌦️'], 55: ['이슬비', '🌦️'],
  61: ['비', '🌧️'], 63: ['비', '🌧️'], 65: ['강한 비', '🌧️'],
  71: ['눈', '❄️'], 73: ['눈', '❄️'], 75: ['강한 눈', '❄️'],
  80: ['소나기', '🌦️'], 81: ['소나기', '🌦️'], 82: ['강한 소나기', '⛈️'],
  95: ['뇌우', '⛈️'], 96: ['뇌우+우박', '⛈️'], 99: ['뇌우+우박', '⛈️'],
};

export function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekdays[now.getDay()]})`;

  return (
    <div className="widget-card">
      <div className="widget-label">현재 시각</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginTop: '4px' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '1px', fontVariantNumeric: 'tabular-nums', color: 'var(--primary)' }}>
          {hh}<span style={{ opacity: 0.4, animation: 'blink 1s step-start infinite' }}>:</span>{mm}
        </span>
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '2px', fontVariantNumeric: 'tabular-nums' }}>{ss}</span>
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{dateStr}</div>
    </div>
  );
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function CalendarWidget({ scheduleDates }) {
  const today = new Date();
  const [viewing, setViewing] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const firstDay = new Date(viewing.y, viewing.m, 1).getDay();
  const daysInMonth = new Date(viewing.y, viewing.m + 1, 0).getDate();
  const isToday = (d) => d === today.getDate() && viewing.m === today.getMonth() && viewing.y === today.getFullYear();
  const hasSchedule = (d) => {
    if (!scheduleDates || !d) return false;
    const key = `${viewing.y}-${String(viewing.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return scheduleDates.has(key);
  };

  const prev = () => setViewing(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  const next = () => setViewing(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });

  const flat = [];
  for (let i = 0; i < firstDay; i++) flat.push(null);
  for (let d = 1; d <= daysInMonth; d++) flat.push(d);
  while (flat.length % 7 !== 0) flat.push(null);
  const rows = [];
  for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));

  return (
    <div className="widget-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button onClick={prev} className="cal-nav">‹</button>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>
          {viewing.y}년 {viewing.m + 1}월
        </span>
        <button onClick={next} className="cal-nav">›</button>
      </div>
      <div className="cal-grid">
        <div className="cal-head" style={{ color: 'var(--primary)', opacity: 0.5 }}>W</div>
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className="cal-head" style={{ color: i === 0 ? 'var(--error)' : i === 6 ? 'var(--primary)' : 'var(--text-muted)' }}>{d}</div>
        ))}
        {rows.map((row, ri) => {
          const firstNonNull = row.find(d => d !== null);
          const weekNum = firstNonNull ? getISOWeek(new Date(viewing.y, viewing.m, firstNonNull)) : '';
          return (
            <>
              <div key={`w${ri}`} className="cal-week">{weekNum}</div>
              {row.map((d, ci) => (
                <div key={`${ri}-${ci}`} className={`cal-cell${d && isToday(d) ? ' cal-today' : ''}`}
                  style={{ color: d ? (ci === 0 ? 'var(--error)' : ci === 6 ? 'var(--primary)' : 'var(--text)') : '', position: 'relative' }}>
                  {d || ''}
                  {hasSchedule(d) && (
                    <span style={{
                      position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)',
                      width: '4px', height: '4px', borderRadius: '50%',
                      background: isToday(d) ? 'white' : 'var(--primary)', display: 'block',
                    }} />
                  )}
                </div>
              ))}
            </>
          );
        })}
      </div>
    </div>
  );
}

export function AdminScheduleWidget({ schedules }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = schedules
    .filter(s => new Date(s.date) >= today)
    .slice(0, 5);
  const past = schedules
    .filter(s => new Date(s.date) < today)
    .slice(-2)
    .reverse();

  const fmtDate = (dateStr) => {
    const d = new Date(dateStr);
    const diff = Math.round((d - today) / 86400000);
    const label = diff === 0 ? '오늘' : diff === 1 ? '내일' : diff === 2 ? '모레' : null;
    const dateLabel = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
    return label ? <><strong style={{ color: 'var(--primary)' }}>{label}</strong> · {dateLabel}</> : dateLabel;
  };

  return (
    <div className="widget-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div className="widget-label">📅 관리자 일정</div>
        <a href="/admin" style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none' }}>관리 →</a>
      </div>
      {schedules.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>등록된 일정이 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {past.map(s => (
            <div key={s.id} style={{ opacity: 0.45, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingTop: '1px', minWidth: '60px' }}>
                {new Date(s.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{s.title}</span>
            </div>
          ))}
          {upcoming.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingTop: '2px', minWidth: '60px' }}>
                {fmtDate(s.date)}
              </span>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{s.title}</div>
                {s.note && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>{s.note}</div>}
              </div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>예정된 일정이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) { setError('위치 정보 미지원'); return; }
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
        setError('날씨를 불러올 수 없습니다.');
      }
    }, () => setError('위치 접근이 거부됐습니다.'));
  }, []);

  const [desc, icon] = WMO[weather?.weather_code] || ['알 수 없음', '❓'];

  return (
    <div className="widget-card">
      <div className="widget-label">날씨 {city && `— ${city}`}</div>
      {error ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>{error}</div>
      ) : !weather ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>위치 확인 중...</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{icon}</span>
            <div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                {Math.round(weather.temperature_2m)}°C
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>💧 {weather.relative_humidity_2m}%</span>
            <span>💨 {Math.round(weather.wind_speed_10m)} km/h</span>
          </div>
        </>
      )}
    </div>
  );
}

export function NoticesWidget() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    api.get('/notices').then(r => setNotices(r.data.notices)).catch(() => {});
  }, []);

  const fmt = (d) => new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

  return (
    <div className="widget-card">
      <div className="widget-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        📢 보증 소식
      </div>
      {notices.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', padding: '8px 0' }}>
          등록된 소식이 없습니다.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notices.map(n => (
            <li key={n.id} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{n.content}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{fmt(n.created_at)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
