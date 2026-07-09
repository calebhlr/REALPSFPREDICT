import { useCallback, useEffect, useState } from 'react';
import type { MatchSnapshot, RankingEntrySnapshot } from '../../shared/types/domain';


const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://api.psfes.space';

export function AdminArea() {
  const [token, setToken] = useState(() => localStorage.getItem('psfpredict_admin_token') || '');
  const [route, setRoute] = useState(() => window.location.pathname.replace('/admin', '') || '/');

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname.replace('/admin', '') || '/');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', `/admin${path}`);
    setRoute(path);
  };

  const logout = () => {
    localStorage.removeItem('psfpredict_admin_token');
    setToken('');
    navigate('/login');
  };

  if (!token) {
    return <AdminLogin onLogin={(t) => { setToken(t); localStorage.setItem('psfpredict_admin_token', t); navigate('/dashboard'); }} />;
  }

  return (
    <div className="min-h-screen bg-[#080b14] text-[#e9eefb] font-sans pb-16">
      <header className="sticky top-0 z-50 bg-[#080b14]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5ea8ff] to-[#34d8c4] flex items-center justify-center shadow-[0_0_15px_rgba(94,168,255,0.2)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04101f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          PSFAdmin
        </div>
        <nav className="flex gap-4">
          <button onClick={() => navigate('/dashboard')} className={`text-sm font-medium transition-colors ${route === '/dashboard' ? 'text-[#34d8c4]' : 'text-[#8893ab] hover:text-[#e9eefb]'}`}>Dashboard</button>
          <button onClick={() => navigate('/sync')} className={`text-sm font-medium transition-colors ${route === '/sync' ? 'text-[#34d8c4]' : 'text-[#8893ab] hover:text-[#e9eefb]'}`}>Sync</button>
          <button onClick={logout} className="text-sm font-medium text-[#fb7185] hover:text-white transition-colors">Logout</button>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-8">
        {route === '/dashboard' && <AdminDashboard token={token} />}
        {route === '/sync' && <AdminSync token={token} />}
      </main>
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(String(data.error) || 'Failed to login');
      onLogin(String(data.token));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-6 text-[#e9eefb] font-sans">
      <div className="w-full max-w-sm bg-[#0e1422] border border-white/10 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        {error && <div className="bg-[#fb7185]/20 text-[#fb7185] p-3 rounded-lg text-sm mb-4 text-center">{error}</div>}
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono text-[#8893ab] uppercase tracking-wider mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#121a2c] border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#5ea8ff] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-mono text-[#8893ab] uppercase tracking-wider mb-1">Password / Token</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#121a2c] border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#5ea8ff] transition-colors" />
          </div>
          <button disabled={loading} className="mt-2 bg-gradient-to-r from-[#5ea8ff] to-[#4a93f0] text-[#04101f] font-bold rounded-lg py-3 hover:brightness-110 transition-all disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({ token }: { token: string }) {
  const [data, setData] = useState<{ matches: number; finalizedMatches: number; participants: number; predictions: number; leader?: RankingEntrySnapshot | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/sync/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then((d: unknown) => { setData(d as { matches: number; finalizedMatches: number; participants: number; predictions: number; leader?: RankingEntrySnapshot | null }); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-[#8893ab] animate-pulse">Carregando métricas...</div>;
  if (!data) return <div className="text-[#fb7185]">Erro ao carregar dashboard.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Visão Geral</h2>
        <p className="text-sm text-[#8893ab]">Resumo da operação do bolão no banco de dados Postgres.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total de Partidas" value={data.matches} />
        <MetricCard label="Partidas Finalizadas" value={data.finalizedMatches} />
        <MetricCard label="Participantes" value={data.participants} />
        <MetricCard label="Palpites Salvos" value={data.predictions} />
      </div>

      {data.leader && (
        <div className="bg-[#121a2c] border border-white/10 rounded-2xl p-5 mt-8">
          <h3 className="text-xs font-mono text-[#8893ab] uppercase tracking-wider mb-2">Líder Atual do Ranking</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#16203a] flex items-center justify-center font-black text-lg">
              {data.leader.initials}
            </div>
            <div>
              <p className="font-bold text-lg">{data.leader.displayName}</p>
              <p className="text-sm text-[#34d8c4] font-mono">{data.leader.points} pontos · {data.leader.accuracy}% acerto</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#0e1422] border border-white/10 rounded-2xl p-5">
      <div className="text-xs font-mono text-[#8893ab] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-black font-mono">{value}</div>
    </div>
  );
}

function AdminSync({ token }: { token: string }) {
  const [matches, setMatches] = useState<MatchSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/matches`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json() as Record<string, unknown>;
      setMatches((data.matches as MatchSnapshot[]) || []);
    } catch {
      setMsg({ type: 'error', text: 'Erro ao carregar partidas.' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMatches();
  }, [loadMatches]);

  const handleAction = async (endpoint: string) => {
    setActionLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(String(data.error) || 'Erro na operação');
      setMsg({ type: 'success', text: `Operação "${endpoint}" concluída com sucesso.` });
      loadMatches();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Controle Operacional</h2>
          <p className="text-sm text-[#8893ab]">Acione integrações com ESPN e recalcule rankings.</p>
        </div>
        <div className="flex gap-3">
          <button disabled={actionLoading} onClick={() => handleAction('sync')} className="bg-[#121a2c] hover:bg-[#16203a] border border-white/10 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors disabled:opacity-50">
            {actionLoading ? 'Processando...' : 'Sincronizar ESPN'}
          </button>
          <button disabled={actionLoading} onClick={() => handleAction('recalculate-ranking')} className="bg-[#121a2c] hover:bg-[#16203a] border border-[#fbbf24]/50 text-[#fbbf24] font-bold py-2 px-4 rounded-xl text-sm transition-colors disabled:opacity-50">
            {actionLoading ? 'Processando...' : 'Recalcular Ranking'}
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-bold ${msg.type === 'error' ? 'bg-[#fb7185]/20 text-[#fb7185]' : 'bg-[#34d399]/20 text-[#34d399]'}`}>
          {msg.text}
        </div>
      )}

      <div className="bg-[#0e1422] border border-white/10 rounded-[1.5rem] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#121a2c]">
              <th className="p-4 font-mono text-xs text-[#8893ab] uppercase tracking-wider">Data / Status</th>
              <th className="p-4 font-mono text-xs text-[#8893ab] uppercase tracking-wider">Partida</th>
              <th className="p-4 font-mono text-xs text-[#8893ab] uppercase tracking-wider text-center">Placar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="p-4 text-center text-[#8893ab]">Carregando...</td></tr>
            ) : matches.length === 0 ? (
              <tr><td colSpan={3} className="p-4 text-center text-[#8893ab]">Nenhuma partida encontrada no banco. Rode o Sync ESPN.</td></tr>
            ) : matches.map(m => (
              <tr key={m.externalId} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="p-4">
                  <div className="font-bold">{new Date(m.kickoffAt).toLocaleDateString('pt-BR')}</div>
                  <div className={`text-xs mt-1 ${m.status === 'final' ? 'text-[#34d8c4]' : m.status === 'in_progress' ? 'text-[#fbbf24]' : 'text-[#8893ab]'}`}>
                    {m.status.toUpperCase()}
                  </div>
                </td>
                <td className="p-4 font-bold">{m.homeTeam.name} vs {m.awayTeam.name}</td>
                <td className="p-4 text-center font-mono font-black text-lg">
                  {m.homeScore ?? '-'} : {m.awayScore ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
