import { useDashboardData } from '@/hooks/useDashboardData';
import type { Test123 } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Test123Dialog } from '@/components/dialogs/Test123Dialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch,
  IconHash, IconCalendar, IconCircleCheck, IconCircle,
  IconListDetails,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a02072333e615ca5f81b038';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const { test123, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Test123 | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Test123 | null>(null);
  const [filterStatus, setFilterStatus] = useState<'alle' | 'aktiv' | 'inaktiv'>('alle');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return test123.filter(r => {
      const matchSearch = !q ||
        (r.fields.titel ?? '').toLowerCase().includes(q) ||
        (r.fields.beschreibung ?? '').toLowerCase().includes(q) ||
        String(r.fields.nummer ?? '').includes(q);
      const matchStatus =
        filterStatus === 'alle' ? true :
        filterStatus === 'aktiv' ? r.fields.aktiv === true :
        !r.fields.aktiv;
      return matchSearch && matchStatus;
    });
  }, [test123, search, filterStatus]);

  const aktiv = useMemo(() => test123.filter(r => r.fields.aktiv === true).length, [test123]);
  const inaktiv = useMemo(() => test123.filter(r => !r.fields.aktiv).length, [test123]);
  const mitDatum = useMemo(() => test123.filter(r => !!r.fields.datum).length, [test123]);

  const handleCreate = async (fields: Test123['fields']) => {
    await LivingAppsService.createTest123Entry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: Test123['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateTest123Entry(editRecord.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteTest123Entry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* KPI-Leiste */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(test123.length)}
          description="Alle Einträge"
          icon={<IconListDetails size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktiv"
          value={String(aktiv)}
          description="Aktive Einträge"
          icon={<IconCircleCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Inaktiv"
          value={String(inaktiv)}
          description="Inaktive Einträge"
          icon={<IconCircle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit Datum"
          value={String(mitDatum)}
          description="Terminierten Einträge"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Aktionsleiste */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center min-w-0">
          <div className="relative">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 w-52"
            />
          </div>
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
            {(['alle', 'aktiv', 'inaktiv'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                  filterStatus === s
                    ? 'bg-white shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'alle' ? 'Alle' : s === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
              </button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditRecord(null); setDialogOpen(true); }}
          className="shrink-0"
        >
          <IconPlus size={16} className="shrink-0 mr-1" />
          <span>Neu anlegen</span>
        </Button>
      </div>

      {/* Karten-Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl border bg-muted/20">
          <IconListDetails size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="text-muted-foreground text-sm">
            {search || filterStatus !== 'alle' ? 'Keine Einträge gefunden.' : 'Noch keine Einträge vorhanden.'}
          </p>
          {!search && filterStatus === 'alle' && (
            <Button size="sm" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
              <IconPlus size={16} className="mr-1" /> Ersten Eintrag erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(record => (
            <div
              key={record.record_id}
              className="group relative rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              {/* Status-Streifen */}
              <div className={`h-1 w-full ${record.fields.aktiv ? 'bg-primary' : 'bg-muted-foreground/30'}`} />

              <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Titel + Status-Badge */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <h3 className="font-semibold text-sm leading-snug truncate min-w-0">
                    {record.fields.titel ?? <span className="text-muted-foreground italic">Kein Titel</span>}
                  </h3>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    record.fields.aktiv
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {record.fields.aktiv ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>

                {/* Beschreibung */}
                {record.fields.beschreibung && (
                  <p className="text-xs text-muted-foreground line-clamp-2 min-w-0">
                    {record.fields.beschreibung}
                  </p>
                )}

                {/* Meta-Infos */}
                <div className="flex flex-wrap gap-3 mt-auto pt-1">
                  {record.fields.nummer != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <IconHash size={13} className="shrink-0" />
                      {record.fields.nummer}
                    </span>
                  )}
                  {record.fields.datum && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <IconCalendar size={13} className="shrink-0" />
                      {formatDate(record.fields.datum)}
                    </span>
                  )}
                </div>
              </div>

              {/* Aktionen */}
              <div className="flex gap-1 px-3 pb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => { setEditRecord(record); setDialogOpen(true); }}
                >
                  <IconPencil size={13} className="shrink-0 mr-1" />
                  Bearbeiten
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget(record)}
                >
                  <IconTrash size={14} className="shrink-0" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialoge */}
      <Test123Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Test123']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Test123']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Soll "${deleteTarget?.fields.titel ?? 'dieser Eintrag'}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" /> Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
