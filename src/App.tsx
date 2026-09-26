import { useEffect, useState, type ComponentType } from 'react';
import routes from 'virtual:print-assets/routes';

const stageStyle = {
  padding: '16mm',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8mm',
} as const;

const catalogStyle = {
  width: '210mm',
  padding: '24mm',
  background: '#ffffff',
  borderRadius: '4mm',
  display: 'flex',
  flexDirection: 'column',
  gap: '10mm',
  fontFamily: "'Inter', 'LINE Seed JP', 'Noto Sans JP', sans-serif",
} as const;

const titleStyle = { fontSize: '9mm', fontWeight: 700, color: '#1a1a1a' } as const;
const descStyle = { fontSize: '4.5mm', lineHeight: 1.7, color: '#6b7280' } as const;
const listStyle = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '6mm',
} as const;
const itemStyle = { display: 'flex', flexDirection: 'column', gap: '2mm' } as const;
const linkStyle = {
  display: 'block',
  fontSize: '6mm',
  fontWeight: 700,
  color: '#2563eb',
  textDecoration: 'none',
  border: '1px solid #e5e7eb',
  borderRadius: '3mm',
  padding: '6mm 8mm',
} as const;

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

function Catalog() {
  return (
    <section style={catalogStyle}>
      <h1 style={titleStyle}>プリント素材カタログ</h1>
      <p style={descStyle}>出力したい素材を選んでください。</p>
      <ul style={listStyle}>
        {routes.map((r) => (
          <li key={r.path} style={itemStyle}>
            <a style={linkStyle} href={`#${r.path}`}>
              {r.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function App({ themeClass }: { themeClass?: string }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onHash = () => setPath(currentPath());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const route = routes.find((r) => r.path === path);
  const Component: ComponentType = route ? route.Component : Catalog;

  return (
    <div className={themeClass} data-stage style={stageStyle}>
      <Component />
    </div>
  );
}
