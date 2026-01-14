import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { getXNavItems } from '../../../lib/org-nav';
import { fetchIntentAttachments, type IntentAttachment } from '../../../lib/org-attachments';
import { fetchOrgMembers, type OrgMemberOption } from '../../../lib/org-members';
import { listShareLinks, revokeShareLink, type ShareLink } from '../../../lib/share-links';
import { fetchNdaCurrent, fetchNdaStatus, type NdaCurrent, type NdaStatus } from '../../../lib/org-nda';
import { formatDateTime } from '../../../lib/date-format';
import { getTheme, resolveSystemTheme, setTheme } from '../../../lib/theme';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

type IntentDetail = {
  id: string;
  intentName: string;
  shortId: string;
  goal: string;
  client: string | null;
  stage: string;
  language: string;
  lastActivityAt: string;
  deadlineAt: string | null;
  ownerUserId: string | null;
  context: string | null;
  scope: string | null;
  kpi: string | null;
  risks: string | null;
  sourceTextRaw: string | null;
  hasL2: boolean;
  owner?: { id: string; email: string } | null;
};

type IntentEvent = {
  id: string;
  type: string;
  occurredAt: string;
  actorUserId?: string | null;
  payload?: Record<string, any> | null;
};

type OverviewDraft = {
  client: string;
  ownerUserId: string;
  deadlineAt: string;
  stage: string;
  language: string;
  goal: string;
  context: string;
  scope: string;
  kpi: string;
  risks: string;
};

type IntentDetailProps = {
  user: OrgUser;
  org: OrgInfo;
  intent: IntentDetail;
  attachments: IntentAttachment[];
  members: OrgMemberOption[];
  events: IntentEvent[];
  shareLinks: ShareLink[];
  ndaCurrent: NdaCurrent | null;
  ndaStatus: NdaStatus | null;
};

export default function IntentDetail({
  user,
  org,
  intent,
  attachments,
  members,
  events,
  shareLinks: initialShareLinks,
  ndaCurrent,
  ndaStatus,
}: IntentDetailProps) {
  const navItems = useMemo(() => getXNavItems(org.slug, 'intents'), [org.slug]);
  const [intentState, setIntentState] = useState(intent);
  const [overviewDraft, setOverviewDraft] = useState(() => buildOverviewDraft(intent));
  const [nameDraft, setNameDraft] = useState(intent.intentName || 'Intent name');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editNameMode, setEditNameMode] = useState(false);
  const [editOverviewMode, setEditOverviewMode] = useState(false);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [shareLinks, setShareLinks] = useState(initialShareLinks);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [attachmentList, setAttachmentList] = useState(attachments);
  const [uploadFileName, setUploadFileName] = useState('Choose a file...');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLevel, setUploadLevel] = useState<'L1' | 'L2'>('L1');
  const [uploading, setUploading] = useState(false);

  const hasL2 = useMemo(() => {
    const hasL2Attachment = attachmentList.some((item) => item.confidentialityLevel === 'L2');
    return hasL2Attachment || Boolean(intentState.sourceTextRaw && intentState.sourceTextRaw.trim());
  }, [attachmentList, intentState.sourceTextRaw]);

  const ownerEmail = useMemo(
    () => resolveOwnerEmail(intentState, members, user.email),
    [intentState, members, user.email],
  );
  const goalValue = intentState.goal?.trim() ? intentState.goal : '[SMOKE] Paste intent';
  const contextValue = intentState.context?.trim() ? intentState.context : 'Not provided.';
  const scopeValue = intentState.scope?.trim() ? intentState.scope : 'Not provided.';
  const kpiValue = intentState.kpi?.trim() ? intentState.kpi : 'Not provided.';
  const risksValue = intentState.risks?.trim() ? intentState.risks : 'Not provided.';
  const lastActivityText = formatDateTime(intentState.lastActivityAt);
  const deadlineText = intentState.deadlineAt ? formatDateShort(intentState.deadlineAt) : 'Not set';
  const activeShareLink = useMemo(() => findActiveShareLink(shareLinks), [shareLinks]);
  const shareTtlDays = activeShareLink
    ? computeTtlDays(activeShareLink.createdAt, activeShareLink.expiresAt)
    : null;
  const shareTtlLabel = shareTtlDays ? `${shareTtlDays} days` : 'set by server';
  const shareUrlValue = activeShareLink
    ? shareUrl ?? 'Open Share tab to copy link.'
    : 'No active link yet.';
  const shareExpires = activeShareLink ? formatDateShort(activeShareLink.expiresAt) : '—';
  const shareAccessed = activeShareLink ? `${activeShareLink.accessCount}x` : '0x';
  const canCopyShare = Boolean(activeShareLink && shareUrl);
  const ndaAccepted = ndaStatus?.accepted ? 'Accepted' : 'Not accepted';
  const ndaVersion = ndaCurrent?.ndaVersion ?? 'mutual_nda_v0.1_en';
  const ndaHash = ndaCurrent?.enHashSha256 ? shortHash(ndaCurrent.enHashSha256) : '2b5c...9a1f';
  const timelineItems = useMemo(() => buildTimeline(events, members), [events, members]);

  useEffect(() => {
    const stored = getTheme();
    const resolved = stored === 'system' ? resolveSystemTheme() : stored;
    setThemeState(resolved === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    setTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.body.dataset.hasL2 = hasL2 ? 'true' : 'false';
    const pill = document.getElementById('pill-l2');
    if (pill) {
      pill.style.display = hasL2 ? '' : 'none';
    }
  }, [hasL2]);

  useEffect(() => {
    document.body.classList.toggle('editNameMode', editNameMode);
    document.body.classList.toggle('editOverviewMode', editOverviewMode);
    return () => {
      document.body.classList.remove('editNameMode');
      document.body.classList.remove('editOverviewMode');
    };
  }, [editNameMode, editOverviewMode]);

  useEffect(() => {
    const handleDocClick = () => setOpenMenuId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
        setEditNameMode(false);
        setEditOverviewMode(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(`share:url:${intentState.id}`);
    if (stored) {
      setShareUrl(stored);
    }
  }, [intentState.id]);

  const handleMenuToggle = (id: string) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const handleMenuPanelClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleThemeToggle = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const handleNameEdit = () => {
    setNameDraft(intentState.intentName || 'Intent name');
    setEditNameMode(true);
    setEditOverviewMode(false);
    setOpenMenuId(null);
  };

  const handleNameCancel = () => {
    setNameDraft(intentState.intentName || 'Intent name');
    setEditNameMode(false);
  };

  const handleNameSave = async () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      return;
    }
    const updated = await patchIntent(intentState.id, { intentName: nextName });
    if (updated) {
      setIntentState((prev) => ({
        ...prev,
        intentName: updated.intentName ?? nextName,
        lastActivityAt: updated.lastActivityAt ?? prev.lastActivityAt,
      }));
      setNameDraft(updated.intentName ?? nextName);
    }
    setEditNameMode(false);
  };

  const handleOverviewEdit = (fieldId?: string) => {
    if (!editOverviewMode) {
      setOverviewDraft(buildOverviewDraft(intentState));
    }
    setEditOverviewMode(true);
    setEditNameMode(false);
    if (fieldId) {
      setTimeout(() => document.getElementById(fieldId)?.focus(), 0);
    }
  };

  const handleOverviewCancel = () => {
    setOverviewDraft(buildOverviewDraft(intentState));
    setEditOverviewMode(false);
  };

  const handleOverviewSave = async () => {
    const payload = {
      client: overviewDraft.client,
      ownerUserId: overviewDraft.ownerUserId,
      language: overviewDraft.language,
      goal: overviewDraft.goal,
      context: overviewDraft.context,
      scope: overviewDraft.scope,
      kpi: overviewDraft.kpi,
      risks: overviewDraft.risks,
      deadlineAt: overviewDraft.deadlineAt || null,
      pipelineStage: overviewDraft.stage,
    };
    const updated = await patchIntent(intentState.id, payload);
    if (updated) {
      const owner = members.find((member) => member.id === updated.ownerUserId) ?? null;
      const nextIntent = {
        ...intentState,
        client: updated.client ?? intentState.client,
        ownerUserId: updated.ownerUserId ?? intentState.ownerUserId,
        owner: owner ? { id: owner.id, email: owner.email } : intentState.owner,
        language: updated.language ?? intentState.language,
        stage: updated.stage ?? intentState.stage,
        goal: updated.goal ?? intentState.goal,
        context: updated.context ?? intentState.context,
        scope: updated.scope ?? intentState.scope,
        kpi: updated.kpi ?? intentState.kpi,
        risks: updated.risks ?? intentState.risks,
        deadlineAt: updated.deadlineAt ?? intentState.deadlineAt,
        lastActivityAt: updated.lastActivityAt ?? intentState.lastActivityAt,
      };
      setIntentState(nextIntent);
      setOverviewDraft(buildOverviewDraft(nextIntent));
      setEditOverviewMode(false);
    }
  };

  const handleQuickStageChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStage = event.target.value;
    const updated = await patchIntent(intentState.id, { pipelineStage: nextStage });
    if (updated?.stage) {
      setIntentState((prev) => ({
        ...prev,
        stage: updated.stage,
        lastActivityAt: updated.lastActivityAt ?? prev.lastActivityAt,
      }));
      setOverviewDraft((prev) => ({ ...prev, stage: updated.stage }));
    }
    setOpenMenuId(null);
  };

  const handleCopyIntentId = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpenMenuId(null);
    await navigator.clipboard.writeText(intentState.id);
  };

  const handleUploadLevelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setUploadLevel(value.startsWith('L2') ? 'L2' : 'L1');
  };

  const handlePickFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        setUploadFile(file);
        setUploadFileName(file.name);
      }
    };
    input.click();
  };

  const handleUpload = async () => {
    if (!uploadFile || uploading) {
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('confidentiality', uploadLevel);
    try {
      const res = await fetch(`/api/intents/${intentState.id}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleShareCopy = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!activeShareLink || !shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
  };

  const handleShareRevoke = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!activeShareLink) {
      return;
    }
    const ok = await revokeShareLink(undefined, intentState.id, activeShareLink.id);
    if (ok) {
      const refreshed = await listShareLinks(undefined, intentState.id);
      setShareLinks(refreshed);
      try {
        window.localStorage.removeItem(`share:url:${intentState.id}`);
      } catch {
        // ignore
      }
    }
  };

  const handleAttachmentCopy = (id: string) => async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(`/api/attachments/${id}`);
    setOpenMenuId(null);
  };

  const handleAttachmentToggle = (attachment: IntentAttachment) => async () => {
    const nextLevel = attachment.confidentialityLevel === 'L2' ? 'L1' : 'L2';
    const res = await fetch(`/api/attachments/${attachment.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confidentiality: nextLevel }),
    });
    if (res.ok) {
      setAttachmentList((prev) =>
        prev.map((item) =>
          item.id === attachment.id ? { ...item, confidentialityLevel: nextLevel } : item,
        ),
      );
    }
    setOpenMenuId(null);
  };

  const handleAttachmentDelete = (id: string) => async () => {
    const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAttachmentList((prev) => prev.filter((item) => item.id !== id));
    }
    setOpenMenuId(null);
  };

  return (
    <>
      <Head>
        <title>{org.name} - {intentState.intentName || 'Intent'}</title>
      </Head>
      <style jsx global>{`
    :root{
      --bg:#0b1220;
      --border:rgba(255,255,255,.10);
      --text:rgba(255,255,255,.92);
      --muted:rgba(255,255,255,.68);
      --muted2:rgba(255,255,255,.55);

      --ocean:#126e82;
      --green:#38a169;
      --gold:#fdba45;
      --danger:#f87171;

      --shadow:0 10px 30px rgba(0,0,0,.35);
      --r:14px;
      --r2:18px;
      --gap:14px;
      --control-scheme: dark;
      --control-bg: rgba(0,0,0,.22);
      --control-border: rgba(255,255,255,.12);
      --control-text: rgba(255,255,255,.90);
      --dropdown-bg: rgba(9,13,22,.98);
      --dropdown-border: rgba(255,255,255,.18);
      --dropdown-text: rgba(255,255,255,.96);
      --dropdown-item-bg: rgba(255,255,255,.10);
      --dropdown-item-hover: rgba(255,255,255,.16);
      --warn-bg: rgba(253,186,69,.10);
      --warn-border: rgba(253,186,69,.30);

      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
    }

    html,body{height:100%;}
    body{
    margin:0;
    font-family:var(--sans);
    color:var(--text);
    letter-spacing:.1px;
    min-height:100vh;
    background:
        radial-gradient(70vmax 40vmax at 18% 0%, rgba(18,110,130,.30), transparent 55%),
        radial-gradient(60vmax 36vmax at 85% 5%, rgba(56,161,105,.22), transparent 60%),
        radial-gradient(55vmax 42vmax at 60% 100%, rgba(253,186,69,.10), transparent 55%),
        var(--bg);
    }
    html,body{color-scheme:dark;color-scheme:var(--control-scheme);}

    html[data-theme="light"]{
      --bg:#F6F8FB;
      --border:rgba(11,34,57,.12);
      --text:rgba(11,34,57,.92);
      --muted:rgba(11,34,57,.70);
      --muted2:rgba(11,34,57,.55);
      --shadow:0 10px 30px rgba(0,0,0,.15);
      --control-scheme: light;
      --control-bg: rgba(255,255,255,.92);
      --control-border: rgba(0,0,0,.12);
      --control-text: rgba(0,0,0,.88);
      --dropdown-bg: rgba(255,255,255,.99);
      --dropdown-border: rgba(0,0,0,.18);
      --dropdown-text: rgba(11,18,32,.94);
      --dropdown-item-bg: rgba(0,0,0,.04);
      --dropdown-item-hover: rgba(0,0,0,.08);
      --warn-bg: rgba(253,186,69,.18);
      --warn-border: rgba(253,186,69,.45);
    }


    .app{max-width:1220px;margin:0 auto;padding:22px 16px 40px;}
    a{color:inherit;text-decoration:none;}
    .muted{color:var(--muted);}
    .muted2{color:var(--muted2);}
    .mono{font-family:var(--mono);}
    .small{font-size:12px;color:var(--muted);}

    /* Topbar */
    .topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;}
    .brand{display:flex;align-items:center;gap:10px;font-weight:650;}
    .mark{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,var(--ocean),var(--green));box-shadow:0 10px 25px rgba(0,0,0,.35);position:relative;}
    .mark:after{content:"";position:absolute;inset:8px;border-radius:8px;background:rgba(253,186,69,.95);box-shadow:0 0 0 1px rgba(255,255,255,.28);}
    .crumbs{font-size:12px;color:var(--muted);}

    .kbd{
      font-family:var(--mono);
      font-size:11px;
      color:var(--muted);
      border:1px solid var(--border);
      background:rgba(0,0,0,.20);
      padding:2px 6px;border-radius:8px;
    }

    /* Buttons */
    .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;}
    .btn{
      border:1px solid var(--border);
      background:rgba(255,255,255,.06);
      color:var(--text);
      padding:9px 12px;border-radius:12px;
      font-size:13px;
      display:inline-flex;align-items:center;gap:8px;
      user-select:none;
      cursor:pointer;
    }
    .btn:hover{background:rgba(255,255,255,.09);}
    .btn:active{transform:translateY(.5px);}
    .btnPrimary{
      background:linear-gradient(135deg,rgba(18,110,130,.95),rgba(56,161,105,.95));
      border-color:rgba(255,255,255,.14);
    }
    .btnWarn{
      border-color:var(--warn-border);
      background:var(--warn-bg);
    }
    .btnDanger{
      border-color:rgba(248,113,113,.35);
      background:rgba(248,113,113,.10);
    }
    .btnGhost{background:transparent;}
    .btnSmall{padding:7px 10px;border-radius:10px;font-size:12px;}

    /* Header */
    .header{
      border:1px solid var(--border);
      background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.04));
      border-radius:var(--r2);
      box-shadow:var(--shadow);
      padding:16px 16px 14px;
      margin-bottom:var(--gap);
    }
    .headerRow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;}
    .titleBlock{min-width:260px;flex:1;}
    .hTitle{margin:0;font-size:18px;font-weight:760;line-height:1.25;}
    .hSub{margin:6px 0 0;font-size:13px;color:var(--muted);line-height:1.35;}

    /* Pills */
    .pillRow{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
    .pill{
      display:inline-flex;align-items:center;gap:6px;
      padding:6px 10px;border-radius:999px;
      border:1px solid var(--border);
      background:rgba(255,255,255,.05);
      font-size:12px;color:var(--muted);
      white-space:nowrap;
    }
    .dot{width:8px;height:8px;border-radius:999px;background:var(--muted2);box-shadow:0 0 0 2px rgba(255,255,255,.05);}
    .pill--stage .dot{background:var(--green);}
    .pill--lang .dot{background:var(--ocean);}
    .pill--l2 .dot{background:var(--gold);}
    .pill--l2{color:var(--text);border-color:rgba(253,186,69,.26);background:rgba(253,186,69,.07);}

    /* Tabs */
    .tabs{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;}
    .tab{
      padding:8px 10px;
      font-size:12px;
      border:1px solid var(--border);
      border-radius:999px;
      background:rgba(255,255,255,.04);
      color:var(--muted);
    }
    .tab--active{
      color:var(--text);
      border-color:rgba(56,161,105,.35);
      background:rgba(56,161,105,.12);
    }

    /* Layout grid */
    .grid{display:grid;grid-template-columns:1fr;gap:var(--gap);}
    @media (min-width:1024px){
      .grid{grid-template-columns:2fr 1fr;align-items:start;}
      .sticky{position:sticky;top:14px;}
    }

    /* Cards */
    .card{
      border:1px solid var(--border);
      background:rgba(255,255,255,.05);
      border-radius:var(--r2);
      box-shadow:var(--shadow);
      overflow:hidden;
    }
    .cardHeader{
      padding:14px 14px 10px;
      border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;gap:10px;
    }
    .cardTitle{margin:0;font-size:13px;font-weight:720;color:var(--text);letter-spacing:.2px;}
    .cardBody{padding:14px;}

    /* Meta grid */
    .metaGrid{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:14px;}
    @media (min-width:700px){.metaGrid{grid-template-columns:repeat(3,1fr);}}
    .metaItem{
      background:rgba(0,0,0,.18);
      border:1px solid rgba(255,255,255,.06);
      border-radius:14px;
      padding:10px;
      min-height:52px;
    }
    .metaLabel{font-size:11px;color:var(--muted2);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .metaValue{font-size:13px;font-weight:650;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

    .badge{
      font-size:11px;padding:2px 8px;border-radius:999px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.05);
      color:var(--muted);
      font-weight:600;
    }
    .badgeWarn{
      border-color:rgba(253,186,69,.35);
      background:rgba(253,186,69,.12);
      color:var(--text);
    }

    /* Content blocks */
    .section{margin-top:12px;}
    .sectionHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;}
    .section h3{margin:0;font-size:12px;letter-spacing:.2px;color:var(--text);}
    .section p{margin:0;font-size:13px;line-height:1.55;color:var(--muted);}
    .bullets{margin:0;padding-left:18px;color:var(--muted);font-size:13px;line-height:1.55;}
    .bullets li{margin:4px 0;}

    /* Editable controls */
    .editPencil{
      display:inline-flex;align-items:center;justify-content:center;
      width:26px;height:26px;border-radius:10px;
      border:1px solid var(--border);
      background:rgba(255,255,255,.05);
      color:var(--muted);
      font-size:13px;
      cursor:pointer;
    }
    .editPencil:hover{background:rgba(255,255,255,.09);}

    .fieldRow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
    .input,.select,.textarea{
      width:100%;
      padding:9px 10px;border-radius:12px;
      border:1px solid var(--control-border);
      background:var(--control-bg);
      color:var(--control-text);
      font-size:12px;outline:none;
    }
    .select{
      color-scheme:var(--control-scheme);
    }
    .select option{
      background:var(--dropdown-bg);
      color:var(--dropdown-text);
    }
    .select option:checked{
      background:var(--dropdown-item-hover);
      color:var(--dropdown-text);
    }
    .textarea{min-height:92px;resize:vertical;line-height:1.45;}
    .textareaSmall{min-height:78px;}
    .help{font-size:11px;color:var(--muted2);margin-top:6px;}

    .viewOnly{display:block;}
    .editOnly{display:none;}
    body.editOverviewMode .viewOnly{display:none;}
    body.editOverviewMode .editOnly{display:block;}

    .nameViewOnly{display:block;}
    .nameEditOnly{display:none;}
    body.editNameMode .nameViewOnly{display:none;}
    body.editNameMode .nameEditOnly{display:block;}

    /* Attachments */
    .formRow{
      display:grid;grid-template-columns:1fr;gap:10px;
      padding:12px;border:1px dashed rgba(255,255,255,.14);
      border-radius:14px;background:rgba(0,0,0,.14);
      margin-bottom:12px;
    }
    @media (min-width:720px){.formRow{grid-template-columns:minmax(0,.75fr) minmax(0,195px) auto;align-items:center;}}
    .formRow .input,.formRow .select{
      width:90%;
      min-width:0;
      white-space:nowrap;
      text-overflow:ellipsis;
      overflow:hidden;
      justify-self:start;
    }
    .hint{margin-top:8px;font-size:11px;color:var(--muted2);}

    /* Tables */
    table{width:100%;border-collapse:collapse;}
    th{text-align:left;font-size:11px;color:var(--muted2);font-weight:650;padding:10px;border-bottom:1px solid var(--border);}
    td{font-size:12px;color:var(--text);padding:10px;border-bottom:1px solid var(--border);vertical-align:middle;}
    .cellRight{text-align:right;}
    .tableActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;}

    /* Right rail */
    .kv{
      display:grid;grid-template-columns:1fr auto;gap:8px;
      padding:10px 12px;border-radius:14px;
      background:rgba(0,0,0,.16);
      border:1px solid var(--border);
      margin-bottom:10px;
      align-items:center;
    }
    .kv .k{font-size:11px;color:var(--muted2);}
    .kv .v{font-size:12px;color:var(--text);font-weight:650;}

    .timeline{display:grid;gap:10px;}
    .titem{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;}
    .tmark{width:10px;height:10px;border-radius:999px;margin-top:5px;background:var(--muted2);box-shadow:0 0 0 3px var(--border);}
    .ttext{font-size:12px;color:var(--text);line-height:1.35;}
    .tmeta{display:block;font-size:11px;color:var(--muted2);margin-top:2px;}

    html[data-theme="light"] .metaItem,
    html[data-theme="light"] .kv,
    html[data-theme="light"] .formRow{
      background:var(--surface-2);
      border-color:var(--border);
    }
    html[data-theme="light"] .kbd{
      background:var(--surface-2);
      border-color:var(--border);
      color:var(--muted);
    }

    /* Edit bar */
    .editBar{
      margin-top:10px;
      padding:10px 12px;
      border-radius:14px;
      border:1px solid rgba(56,161,105,.30);
      background:rgba(56,161,105,.10);
      display:none;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }
    body.editOverviewMode .editBar{display:flex;}
    .editBar .left{font-size:12px;color:var(--muted);}
    .footer{margin-top:18px;color:var(--muted2);font-size:11px;text-align:center;}

    /* Shell + left nav */
    .appShell{display:flex;gap:18px;align-items:flex-start;}
    .sideNav{width:220px;flex:0 0 220px;}
    .sideNavCard{
      border:1px solid var(--border);
      background:rgba(255,255,255,.05);
      border-radius:var(--r2);
      box-shadow:var(--shadow);
      padding:12px;
    }
    .sideNavTitle{
      font-size:12px;
      color:var(--muted2);
      text-transform:uppercase;
      letter-spacing:.18em;
      margin:4px 0 10px;
      font-weight:650;
    }
    .sideNavItem{
      display:flex;align-items:center;gap:8px;
      padding:8px 10px;border-radius:12px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      font-size:12px;color:var(--text);
      margin-bottom:8px;
    }
    .sideNavItem--active{
      border-color:rgba(56,161,105,.35);
      background:rgba(56,161,105,.12);
    }
    .mainCol{flex:1;min-width:0;}
    @media (max-width: 1023px){
      .appShell{flex-direction:column;}
      .sideNav{width:100%;}
    }


    /* Menus */
    .menuWrap{position:relative;display:inline-flex;}
    .menuPanel{
      position:absolute;right:0;top:calc(100% + 8px);
      min-width:200px;padding:10px;border-radius:12px;
      border:1px solid var(--dropdown-border);
      background:var(--dropdown-bg);
      box-shadow:var(--shadow);
      display:none;flex-direction:column;gap:8px;
      z-index:30;
    }
    .menuPanel.open{display:flex;}
    .menuLabel{font-size:11px;color:var(--muted2);margin-top:2px;}
    .menuPanel .btn{
      background:var(--dropdown-item-bg);
      border-color:var(--dropdown-border);
      color:var(--dropdown-text);
    }
    .menuPanel .btn:hover{background:var(--dropdown-item-hover);}
    .menuPanel .btnDanger{
      border-color:rgba(248,113,113,.35);
      background:rgba(248,113,113,.10);
      color:var(--dropdown-text);
    }
    .menuPanel--up{
      top:auto;
      bottom:calc(100% + 8px);
    }

    .selectWarn{
      border-color:var(--warn-border);
      background:var(--warn-bg);
      color:var(--control-text);
    }
    .selectWarn option{
      background:var(--dropdown-bg);
      color:var(--dropdown-text);
    }

    .nameEditRow{
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
    }
    .nameEditRow .input{
      flex:1 1 66%;
      max-width:66%;
      min-width:220px;
    }
    .nameEditRow .actions{
      flex:0 0 auto;
    }
      `}</style>
      <div className="app appShell">
        <aside className="sideNav" aria-label="Primary navigation">
          <div className="sideNavCard">
            <div className="sideNavTitle">Workspace</div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                className={`sideNavItem${item.active ? ' sideNavItem--active' : ''}`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </aside>

        <div className="mainCol">
          <div className="topbar">
            <div className="brand">
              <div className="mark" aria-hidden="true"></div>
              <div>
                <div>Enabion R1 (X view)</div>
                <div className="crumbs">Intents / Intent detail</div>
              </div>
            </div>
            <div className="actions">
              <Link className="btn btnGhost btnSmall" href={`/${org.slug}/intents`}>
                Back
              </Link>
              <button className="btn btnSmall" id="btn-theme" type="button" onClick={handleThemeToggle}>
                Dark / Light
              </button>
              <button
                className="btn btnSmall"
                id="btn-signout"
                type="button"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </div>
          <section className="header" aria-label="Intent header">
            <div className="headerRow">
              <div className="titleBlock">
                <div className="nameViewOnly">
                  <h1 className="hTitle">{intentState.intentName || 'Intent name'}</h1>
                </div>
                <div className="nameEditOnly">
                  <div className="small" style={{ marginBottom: '6px' }}>Title</div>
                  <div className="nameEditRow">
                    <input
                      className="input"
                      id="field-title"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                    />
                    <div className="actions" style={{ justifyContent: 'flex-start' }}>
                      <button className="btn btnPrimary btnSmall" id="btn-save-name" type="button" onClick={handleNameSave}>
                        Save
                      </button>
                      <button className="btn btnGhost btnSmall" id="btn-cancel-name" type="button" onClick={handleNameCancel}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>

                <p className="hSub">
                  Owner-org view. You can edit L1 content and manage L2 visibility for recipients (via NDA gating).
                </p>

                <div className="pillRow">
                  <span className="pill pill--stage">
                    <span className="dot"></span>
                    Stage: <b style={{ color: 'var(--text)' }}>{intentState.stage || 'MATCH'}</b>
                  </span>
                  <span className="pill pill--lang">
                    <span className="dot"></span>
                    Language: <b style={{ color: 'var(--text)' }}>{intentState.language || 'EN'}</b>
                  </span>
                  <span className="pill pill--l2" id="pill-l2">
                    <span className="dot"></span>Contains L2
                  </span>
                  <span className="pill">
                    <span className="dot"></span>Last activity:{' '}
                    <b style={{ color: 'var(--text)' }}>{lastActivityText}</b>
                  </span>
                </div>
              </div>

              <div className="actions" aria-label="Actions">
                <div className="menuWrap">
                  <button
                    className="btn btnWarn"
                    id="btn-export"
                    type="button"
                    data-menu-target="export-menu"
                    onClick={handleMenuToggle('export-menu')}
                  >
                    Export (L1) &#x25BC;
                  </button>
                  <div
                    className={`menuPanel${openMenuId === 'export-menu' ? ' open' : ''}`}
                    id="export-menu"
                    aria-label="Export menu"
                    onClick={handleMenuPanelClick}
                  >
                    <a className="btn btnSmall" href={`/api/intents/${intentState.id}/export?format=md`}>
                      Export MD
                    </a>
                    <a className="btn btnSmall" href={`/api/intents/${intentState.id}/export?format=pdf`}>
                      Export PDF
                    </a>
                    <a className="btn btnSmall" href={`/api/intents/${intentState.id}/export?format=docx`}>
                      Export DOCX
                    </a>
                  </div>
                </div>
                <Link className="btn btnWarn" href={`/${org.slug}/intents/${intentState.id}/nda`}>
                  NDA
                </Link>

                <div className="menuWrap">
                  <button
                    className="btn"
                    id="btn-more"
                    type="button"
                    data-menu-target="more-menu"
                    onClick={handleMenuToggle('more-menu')}
                  >
                    More &#x25BC;
                  </button>
                  <div
                    className={`menuPanel${openMenuId === 'more-menu' ? ' open' : ''}`}
                    id="more-menu"
                    aria-label="More actions"
                    onClick={handleMenuPanelClick}
                  >
                    <button className="btn btnSmall" id="btn-edit" type="button" onClick={handleNameEdit}>
                      Edit intent name
                    </button>
                    <button className="btn btnSmall" id="btn-copy-id" type="button" onClick={handleCopyIntentId}>
                      Copy Intent ID
                    </button>
                    <div className="menuLabel">Move stage</div>
                    <select
                      className="select selectWarn"
                      id="field-stage-quick"
                      value={intentState.stage || 'MATCH'}
                      onChange={handleQuickStageChange}
                    >
                      <option>NEW</option>
                      <option>CLARIFY</option>
                      <option>MATCH</option>
                      <option>COMMIT</option>
                      <option>WON</option>
                      <option>LOST</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="editBar" aria-label="Edit mode bar">
              <div className="left">
                Editing is enabled. Changes are local in this mock. In product: Save emits INTENT_UPDATED and updates lastActivityAt.
              </div>
              <div className="actions" style={{ justifyContent: 'flex-start' }}>
                <span className="kbd">Esc</span>
                <span className="small">to exit edit mode</span>
              </div>
            </div>

            <nav className="tabs" aria-label="Intent tabs">
              <Link className="tab tab--active" href={`/${org.slug}/intents/${intentState.id}`}>
                Overview
              </Link>
              <Link className="tab" href={`/${org.slug}/intents/${intentState.id}/coach`}>
                Coach
              </Link>
              <Link className="tab" href={`/${org.slug}/intents/${intentState.id}/matches`}>
                Matches
              </Link>
            </nav>
          </section>

          <section className="grid" aria-label="Intent layout">
            <div>
              <article className="card" aria-label="Intent overview">
                <header className="cardHeader">
                  <h2 className="cardTitle">Overview</h2>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div className="small">
                      Intent ID: <span className="mono">{intentState.id}</span>
                    </div>
                    <div className="editOnly">
                      <button
                        className="btn btnPrimary btnSmall"
                        id="btn-save-overview"
                        type="button"
                        onClick={handleOverviewSave}
                      >
                        Save
                      </button>
                      <button
                        className="btn btnGhost btnSmall"
                        id="btn-cancel-overview"
                        type="button"
                        onClick={handleOverviewCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </header>

                <div className="cardBody">
                  <div className="metaGrid" aria-label="Metadata">
                    <div className="metaItem">
                      <div className="metaLabel">
                        Client{' '}
                        <button
                          className="editPencil"
                          data-focus="field-client"
                          title="Edit"
                          type="button"
                          onClick={() => handleOverviewEdit('field-client')}
                        >
                          &#x270E;
                        </button>
                      </div>
                      <div className="viewOnly metaValue">
                        {intentState.client?.trim() ? intentState.client : 'Not set'}{' '}
                        <span className="badge">Editable</span>
                      </div>
                      <div className="editOnly">
                        <input
                          className="input"
                          id="field-client"
                          value={overviewDraft.client}
                          placeholder="Client name"
                          onChange={(event) =>
                            setOverviewDraft((prev) => ({ ...prev, client: event.target.value }))
                          }
                        />
                        <div className="help">Client name used in list/pipeline and exports.</div>
                      </div>
                    </div>

                    <div className="metaItem">
                      <div className="metaLabel">
                        Owner{' '}
                        <button
                          className="editPencil"
                          data-focus="field-owner"
                          title="Edit"
                          type="button"
                          onClick={() => handleOverviewEdit('field-owner')}
                        >
                          &#x270E;
                        </button>
                      </div>
                      <div className="viewOnly metaValue">
                        {ownerEmail} <span className="badge">Owner</span>
                      </div>
                      <div className="editOnly">
                        <select
                          className="select"
                          id="field-owner"
                          value={overviewDraft.ownerUserId || members[0]?.id || ''}
                          onChange={(event) =>
                            setOverviewDraft((prev) => ({ ...prev, ownerUserId: event.target.value }))
                          }
                        >
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.email}
                            </option>
                          ))}
                        </select>
                        <div className="help">Owner is responsible for Clarify/Commit progress.</div>
                      </div>
                    </div>

                    <div className="metaItem">
                      <div className="metaLabel">
                        Deadline{' '}
                        <button
                          className="editPencil"
                          data-focus="field-deadline"
                          title="Edit"
                          type="button"
                          onClick={() => handleOverviewEdit('field-deadline')}
                        >
                          &#x270E;
                        </button>
                      </div>
                      <div className="viewOnly metaValue">
                        {deadlineText} <span className="badge">Target</span>
                      </div>
                      <div className="editOnly">
                        <input
                          className="input"
                          id="field-deadline"
                          type="date"
                          value={overviewDraft.deadlineAt}
                          onChange={(event) =>
                            setOverviewDraft((prev) => ({ ...prev, deadlineAt: event.target.value }))
                          }
                        />
                        <div className="help">Used for reminders and prioritization.</div>
                      </div>
                    </div>

                    <div className="metaItem">
                      <div className="metaLabel">
                        Pipeline stage{' '}
                        <button
                          className="editPencil"
                          data-focus="field-stage"
                          title="Edit"
                          type="button"
                          onClick={() => handleOverviewEdit('field-stage')}
                        >
                          &#x270E;
                        </button>
                      </div>
                      <div className="viewOnly metaValue">
                        {intentState.stage || 'MATCH'} <span className="badge">Active</span>
                      </div>
                      <div className="editOnly">
                        <select
                          className="select"
                          id="field-stage"
                          value={overviewDraft.stage}
                          onChange={(event) =>
                            setOverviewDraft((prev) => ({ ...prev, stage: event.target.value }))
                          }
                        >
                          <option>NEW</option>
                          <option>CLARIFY</option>
                          <option>MATCH</option>
                          <option>COMMIT</option>
                          <option>WON</option>
                          <option>LOST</option>
                        </select>
                        <div className="help">Changing stage updates the Pipeline board.</div>
                      </div>
                    </div>

                    <div className="metaItem">
                      <div className="metaLabel">
                        Language{' '}
                        <button
                          className="editPencil"
                          data-focus="field-language"
                          title="Edit"
                          type="button"
                          onClick={() => handleOverviewEdit('field-language')}
                        >
                          &#x270E;
                        </button>
                      </div>
                      <div className="viewOnly metaValue">
                        {intentState.language || 'EN'} <span className="badge">Primary</span>
                      </div>
                      <div className="editOnly">
                        <select
                          className="select"
                          id="field-language"
                          value={overviewDraft.language}
                          onChange={(event) =>
                            setOverviewDraft((prev) => ({ ...prev, language: event.target.value }))
                          }
                        >
                          <option>EN</option>
                          <option>DE</option>
                          <option>PL</option>
                          <option>NL</option>
                        </select>
                        <div className="help">Used for UI and exports (fallback EN).</div>
                      </div>
                    </div>

                    <div className="metaItem">
                      <div className="metaLabel">Last activity</div>
                      <div className="metaValue">
                        {lastActivityText} <span className="badge">Exported at</span>
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <div className="sectionHead">
                      <h3>Goal</h3>
                      <button
                        className="editPencil"
                        data-focus="field-goal"
                        title="Edit"
                        type="button"
                        onClick={() => handleOverviewEdit('field-goal')}
                      >
                        ?
                      </button>
                    </div>
                    <div className="viewOnly">
                      <p>{goalValue}</p>
                    </div>
                    <div className="editOnly">
                      <textarea
                        className="textarea"
                        id="field-goal"
                        value={overviewDraft.goal}
                        onChange={(event) =>
                          setOverviewDraft((prev) => ({ ...prev, goal: event.target.value }))
                        }
                      ></textarea>
                    </div>
                  </div>

                  <div className="section">
                    <div className="sectionHead">
                      <h3>Context</h3>
                      <button
                        className="editPencil"
                        data-focus="field-context"
                        title="Edit"
                        type="button"
                        onClick={() => handleOverviewEdit('field-context')}
                      >
                        ?
                      </button>
                    </div>
                    <div className="viewOnly">
                      <p>{contextValue}</p>
                    </div>
                    <div className="editOnly">
                      <textarea
                        className="textarea"
                        id="field-context"
                        value={overviewDraft.context}
                        onChange={(event) =>
                          setOverviewDraft((prev) => ({ ...prev, context: event.target.value }))
                        }
                      ></textarea>
                    </div>
                  </div>

                  <div className="section">
                    <div className="sectionHead">
                      <h3>Scope (high level)</h3>
                      <button
                        className="editPencil"
                        data-focus="field-scope"
                        title="Edit"
                        type="button"
                        onClick={() => handleOverviewEdit('field-scope')}
                      >
                        ?
                      </button>
                    </div>
                    <div className="viewOnly">
                      <p>{scopeValue}</p>
                    </div>
                    <div className="editOnly">
                      <div className="small">One item per line</div>
                      <textarea
                        className="textarea textareaSmall"
                        id="field-scope"
                        value={overviewDraft.scope}
                        onChange={(event) =>
                          setOverviewDraft((prev) => ({ ...prev, scope: event.target.value }))
                        }
                      ></textarea>
                    </div>
                  </div>

                  <div className="section">
                    <div className="sectionHead">
                      <h3>KPIs</h3>
                      <button
                        className="editPencil"
                        data-focus="field-kpis"
                        title="Edit"
                        type="button"
                        onClick={() => handleOverviewEdit('field-kpis')}
                      >
                        ?
                      </button>
                    </div>
                    <div className="viewOnly">
                      <p>{kpiValue}</p>
                    </div>
                    <div className="editOnly">
                      <div className="small">One item per line</div>
                      <textarea
                        className="textarea textareaSmall"
                        id="field-kpis"
                        value={overviewDraft.kpi}
                        onChange={(event) =>
                          setOverviewDraft((prev) => ({ ...prev, kpi: event.target.value }))
                        }
                      ></textarea>
                    </div>
                  </div>

                  <div className="section">
                    <div className="sectionHead">
                      <h3>Risks / Open questions</h3>
                      <button
                        className="editPencil"
                        data-focus="field-risks"
                        title="Edit"
                        type="button"
                        onClick={() => handleOverviewEdit('field-risks')}
                      >
                        ?
                      </button>
                    </div>
                    <div className="viewOnly">
                      <p>{risksValue}</p>
                    </div>
                    <div className="editOnly">
                      <div className="small">One item per line</div>
                      <textarea
                        className="textarea textareaSmall"
                        id="field-risks"
                        value={overviewDraft.risks}
                        onChange={(event) =>
                          setOverviewDraft((prev) => ({ ...prev, risks: event.target.value }))
                        }
                      ></textarea>
                    </div>
                  </div>
                </div>
              </article>

              <article className="card" style={{ marginTop: 'var(--gap)' }} aria-label="Attachments">
                <header className="cardHeader">
                  <h2 className="cardTitle">Attachments</h2>
                  <div className="small">Owner view: you can download/manage L1 and L2</div>
                </header>

                <div className="cardBody">
                  <div className="formRow" aria-label="Attachment upload row">
                    <input
                      className="input"
                      type="text"
                      value={uploadFileName}
                      aria-label="File picker placeholder"
                      onChange={(event) => setUploadFileName(event.target.value)}
                      onClick={handlePickFile}
                    />
                    <select
                      className="select"
                      aria-label="Confidentiality level"
                      value={uploadLevel === 'L1' ? 'L1 (public / matching)' : 'L2 (confidential / NDA)'}
                      onChange={handleUploadLevelChange}
                    >
                      <option>L1 (public / matching)</option>
                      <option>L2 (confidential / NDA)</option>
                    </select>
                    <button className="btn btnPrimary" type="button" onClick={handleUpload} disabled={uploading}>
                      Upload
                    </button>
                  </div>
                  <div className="hint">
                    Tip: set L2 for files you only want shared after Mutual NDA. All files are encrypted at rest.
                  </div>

                  <div style={{ height: '10px' }}></div>

                  <table aria-label="Attachments table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Level</th>
                        <th>Uploaded by</th>
                        <th>Date</th>
                        <th className="cellRight">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachmentList.map((attachment) => {
                        const manageId = `manage-${attachment.id}`;
                        const badgeClass =
                          attachment.confidentialityLevel === 'L2' ? 'badge badgeWarn' : 'badge';
                        return (
                          <tr key={attachment.id}>
                            <td>{attachment.originalName}</td>
                            <td>{formatBytes(attachment.sizeBytes)}</td>
                            <td>
                              <span className={badgeClass}>{attachment.confidentialityLevel}</span>
                            </td>
                            <td>{attachment.uploadedBy?.email ?? '-'}</td>
                            <td>{formatDateShort(attachment.createdAt)}</td>
                            <td className="cellRight">
                              <div className="tableActions">
                                <div className="menuWrap">
                                  <button
                                    className="btn btnSmall"
                                    type="button"
                                    data-menu-target={manageId}
                                    onClick={handleMenuToggle(manageId)}
                                  >
                                    Manage &#x25BC;
                                  </button>
                                  <div
                                    className={`menuPanel menuPanel--up${openMenuId === manageId ? ' open' : ''}`}
                                    id={manageId}
                                    aria-label="Manage attachment"
                                    onClick={handleMenuPanelClick}
                                  >
                                    <a className="btn btnSmall" href={`/api/attachments/${attachment.id}`}>
                                      Download
                                    </a>
                                    <a
                                      className="btn btnSmall"
                                      href={`/api/attachments/${attachment.id}?asInline=1`}
                                    >
                                      View inline
                                    </a>
                                    <button className="btn btnSmall" type="button" onClick={handleAttachmentCopy(attachment.id)}>
                                      Copy link
                                    </button>
                                    <button
                                      className="btn btnSmall"
                                      type="button"
                                      onClick={handleAttachmentToggle(attachment)}
                                    >
                                      Change L1&#x2194;L2
                                    </button>
                                    <button
                                      className="btn btnSmall btnDanger"
                                      type="button"
                                      onClick={handleAttachmentDelete(attachment.id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            <aside className="sticky" aria-label="Right rail">
              <section className="card" aria-label="NDA status">
                <header className="cardHeader">
                  <h2 className="cardTitle">Mutual NDA</h2>
                  <Link className="btn btnSmall" href={`/${org.slug}/intents/${intentState.id}/nda`}>
                    View
                  </Link>
                </header>
                <div className="cardBody">
                  <div className="kv">
                    <div>
                      <div className="k">Status (your org)</div>
                      <div className="v">{ndaAccepted}</div>
                    </div>
                    <span className="badge">Layer 1</span>
                  </div>
                  <div className="kv">
                    <div>
                      <div className="k">Version</div>
                      <div className="v mono">{ndaVersion}</div>
                    </div>
                    <span className="badge">Current</span>
                  </div>
                  <div className="kv">
                    <div>
                      <div className="k">EN hash</div>
                      <div className="v mono">{ndaHash}</div>
                    </div>
                    <span className="badge">SHA256</span>
                  </div>
                  <div className="small">
                    This status controls whether recipients can access L2 (after they accept, too).
                  </div>
                </div>
              </section>

              <section className="card" style={{ marginTop: 'var(--gap)' }} aria-label="Share link">
                <header className="cardHeader">
                  <h2 className="cardTitle">Share (L1-only)</h2>
                  <Link className="btn btnSmall" href={`/${org.slug}/intents/${intentState.id}/share`}>
                    Share link
                  </Link>
                </header>
                <div className="cardBody">
                  <div className="small">
                    Share links are L1-only. Default TTL: <b>{shareTtlLabel}</b>.
                  </div>
                  <div style={{ height: '10px' }}></div>
                  <div className="kv" style={{ gridTemplateColumns: '1fr', gap: '6px' }}>
                    <div className="k">Active link</div>
                    <div className="v mono" style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                      {shareUrlValue}
                    </div>
                    <div className="small">
                      Expires: {shareExpires} - Accessed: {shareAccessed}
                    </div>
                    <div className="actions" style={{ justifyContent: 'flex-start', marginTop: '6px' }}>
                      {canCopyShare ? (
                        <a className="btn btnSmall" href="#" onClick={handleShareCopy}>
                          Copy
                        </a>
                      ) : null}
                      {activeShareLink ? (
                        <a className="btn btnSmall btnWarn" href="#" onClick={handleShareRevoke}>
                          Revoke
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="card" style={{ marginTop: 'var(--gap)' }} aria-label="Activity">
                <header className="cardHeader">
                  <h2 className="cardTitle">Activity (latest)</h2>
                  <Link className="btn btnSmall" href={`/${org.slug}/intents/${intentState.id}/activity`}>
                    View all
                  </Link>
                </header>
                <div className="cardBody">
                  <div className="timeline">
                    {timelineItems.map((item) => (
                      <div className="titem" key={item.id}>
                        <div
                          className="tmark"
                          style={item.color ? { background: item.color } : undefined}
                        ></div>
                        <div className="ttext">
                          {item.text}
                          <span className="tmeta">{item.meta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </aside>
          </section>

          <div className="footer">Mock v4-X - Intent View (Owner org) - Editable state included</div>
        </div>
      </div>
    </>
  );
}

type TimelineItem = {
  id: string;
  text: string;
  meta: string;
  color?: string;
};

function buildOverviewDraft(intent: IntentDetail): OverviewDraft {
  return {
    client: intent.client ?? '',
    ownerUserId: intent.ownerUserId ?? '',
    deadlineAt: intent.deadlineAt ? formatDateInput(intent.deadlineAt) : '',
    stage: intent.stage || 'MATCH',
    language: intent.language || 'EN',
    goal: intent.goal ?? '',
    context: intent.context ?? '',
    scope: intent.scope ?? '',
    kpi: intent.kpi ?? '',
    risks: intent.risks ?? '',
  };
}

function resolveOwnerEmail(intent: IntentDetail, members: OrgMemberOption[], fallback: string) {
  if (intent.owner?.email) {
    return intent.owner.email;
  }
  const owner = members.find((member) => member.id === intent.ownerUserId);
  return owner?.email ?? fallback;
}

function formatDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function formatDateShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}

function computeTtlDays(createdAt: string, expiresAt: string) {
  const createdTime = new Date(createdAt).getTime();
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(createdTime) || Number.isNaN(expiresTime)) {
    return null;
  }
  const diffMs = Math.max(0, expiresTime - createdTime);
  if (!diffMs) {
    return null;
  }
  return Math.max(1, Math.ceil(diffMs / 86400000));
}

function shortHash(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return trimmed;
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function findActiveShareLink(links: ShareLink[]) {
  const now = Date.now();
  return (
    links.find((link) => !link.revokedAt && new Date(link.expiresAt).getTime() > now) ?? null
  );
}

function buildTimeline(events: IntentEvent[], members: OrgMemberOption[]): TimelineItem[] {
  if (!events.length) {
    return [
      {
        id: 'mock-1',
        text: 'INTENT_UPDATED - Edited fields saved',
        meta: '3h ago - by BD Owner',
        color: 'rgba(56,161,105,.9)',
      },
      {
        id: 'mock-2',
        text: 'EXPORT_GENERATED (L1) - PDF',
        meta: 'Yesterday - by BD Owner',
        color: 'rgba(18,110,130,.95)',
      },
      {
        id: 'mock-3',
        text: 'ATTACHMENT_UPLOADED - Full_RFP.pdf (L2)',
        meta: 'Yesterday - by BD Owner',
        color: 'rgba(253,186,69,.95)',
      },
      {
        id: 'mock-4',
        text: 'INTENT_CREATED - Source: PASTE',
        meta: '2 days ago - by BD Owner',
      },
    ];
  }

  return events.map((event) => {
    const note = formatEventNote(event);
    const text = note ? `${event.type} ${note}` : event.type;
    const meta = formatEventMeta(event, members);
    return {
      id: event.id,
      text,
      meta,
      color: resolveEventColor(event.type),
    };
  });
}

function formatEventNote(event: IntentEvent) {
  const payload = event.payload ?? {};
  if (event.type === 'INTENT_UPDATED') {
    return payload.changeSummary ? `- ${payload.changeSummary}` : '- Edited fields saved';
  }
  if (event.type === 'EXPORT_GENERATED') {
    if (payload.format) {
      return `(L1) - ${String(payload.format).toUpperCase()}`;
    }
    return '(L1) - Export';
  }
  if (event.type === 'ATTACHMENT_UPLOADED') {
    if (payload.filename) {
      return `- ${payload.filename}`;
    }
    return '- Attachment uploaded';
  }
  if (event.type === 'INTENT_CREATED') {
    if (payload.source) {
      return `- Source: ${String(payload.source).toUpperCase()}`;
    }
    return '- Source: PASTE';
  }
  if (event.type === 'ATTACHMENT_DELETED') {
    if (payload.filename) {
      return `- Deleted ${payload.filename}`;
    }
    return '- Attachment deleted';
  }
  if (event.type === 'ATTACHMENT_CONFIDENTIALITY_CHANGED') {
    if (payload.fromLevel && payload.toLevel) {
      return `- ${payload.fromLevel} -> ${payload.toLevel}`;
    }
    return '- Confidentiality updated';
  }
  if (event.type === 'INTENT_PIPELINE_STAGE_CHANGED') {
    if (payload.toStage) {
      return `- Moved to ${payload.toStage}`;
    }
    return '- Stage changed';
  }
  return '';
}

function formatEventMeta(event: IntentEvent, members: OrgMemberOption[]) {
  const when = formatDateTime(event.occurredAt);
  if (!event.actorUserId) {
    return when;
  }
  const actor = members.find((member) => member.id === event.actorUserId);
  return actor ? `${when} - by ${actor.email}` : when;
}

function resolveEventColor(type: string) {
  if (type === 'INTENT_UPDATED') {
    return 'rgba(56,161,105,.9)';
  }
  if (type === 'EXPORT_GENERATED') {
    return 'rgba(18,110,130,.95)';
  }
  if (type === 'ATTACHMENT_UPLOADED') {
    return 'rgba(253,186,69,.95)';
  }
  return undefined;
}

async function patchIntent(intentId: string, payload: Record<string, unknown>) {
  try {
    const res = await fetch(`/api/intents/${intentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { intent?: Record<string, any> };
    return data?.intent ?? null;
  } catch {
    return null;
  }
}

async function fetchIntentDetail(
  cookie: string | undefined,
  intentId: string,
): Promise<IntentDetail | null> {
  const res = await fetch(`${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}`, {
    headers: { cookie: cookie ?? '' },
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as { intent?: Record<string, any> } | null;
  const intent = data?.intent;
  if (!intent) {
    return null;
  }
  return {
    id: String(intent.id ?? ''),
    intentName: String(intent.intentName ?? ''),
    shortId: String(intent.shortId ?? ''),
    goal: String(intent.goal ?? ''),
    client: intent.client ?? null,
    stage: String(intent.stage ?? 'NEW'),
    language: String(intent.language ?? 'EN'),
    lastActivityAt: String(intent.lastActivityAt ?? ''),
    deadlineAt: intent.deadlineAt ? String(intent.deadlineAt) : null,
    ownerUserId: intent.ownerUserId ?? null,
    context: intent.context ?? null,
    scope: intent.scope ?? null,
    kpi: intent.kpi ?? null,
    risks: intent.risks ?? null,
    sourceTextRaw: intent.sourceTextRaw ?? null,
    hasL2: Boolean(intent.hasL2),
    owner: intent.owner
      ? {
          id: String(intent.owner.id ?? ''),
          email: String(intent.owner.email ?? ''),
        }
      : null,
  };
}

async function fetchIntentEvents(cookie: string | undefined, intentId: string): Promise<IntentEvent[]> {
  const params = new URLSearchParams({ subjectId: intentId, limit: '5' });
  const res = await fetch(`${BACKEND_BASE}/events?${params.toString()}`, {
    headers: { cookie: cookie ?? '' },
  });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as Array<Record<string, any>>;
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((row) => ({
    id: String(row.id ?? row.eventId ?? ''),
    type: String(row.type ?? ''),
    occurredAt: String(row.occurredAt ?? row.recordedAt ?? ''),
    actorUserId: row.actorUserId ?? null,
    payload: typeof row.payload === 'object' && row.payload !== null ? row.payload : null,
  }));
}

const formatBytes = (value: number) => {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const getServerSideProps: GetServerSideProps<IntentDetailProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : '';
  if (!intentId) {
    return { notFound: true };
  }

  const cookie = result.context!.cookie;
  const { listShareLinksServer } = await import('../../../lib/share-links.server');
  const intent = await fetchIntentDetail(cookie, intentId);
  if (!intent) {
    return { notFound: true };
  }

  const [attachmentsData, members, eventsData, shareLinks, ndaCurrent, ndaStatus] =
    await Promise.all([
      fetchIntentAttachments(cookie, intentId),
      fetchOrgMembers(cookie),
      fetchIntentEvents(cookie, intentId),
      listShareLinksServer(cookie, intentId),
      fetchNdaCurrent(cookie, intent.language),
      fetchNdaStatus(cookie),
    ]);

  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intent,
      attachments: attachmentsData,
      members,
      events: eventsData,
      shareLinks,
      ndaCurrent,
      ndaStatus,
    },
  };
};
