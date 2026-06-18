/* ============================================================
   BigQuery Release Notes — Frontend Logic
   ============================================================ */

/** @type {Array<{title:string, content_html:string, summary:string, published:string, link:string}>} */
let allEntries = [];
let selectedIndex = -1;

/* ── DOM refs ── */
const refreshBtn     = document.getElementById('refreshBtn');
const refreshIcon    = document.getElementById('refreshIcon');
const statusBadge    = document.getElementById('statusBadge');
const statusText     = statusBadge.querySelector('.status-text');
const loadingState   = document.getElementById('loadingState');
const errorState     = document.getElementById('errorState');
const errorMsg       = document.getElementById('errorMsg');
const feedContainer  = document.getElementById('feedContainer');
const entriesGrid    = document.getElementById('entriesGrid');
const statsBar       = document.getElementById('statsBar');
const totalCount     = document.getElementById('totalCount');
const latestDate     = document.getElementById('latestDate');
const tweetModal     = document.getElementById('tweetModal');
const tweetTextArea  = document.getElementById('tweetText');
const charCountEl    = document.getElementById('charCount');
const charProgress   = document.getElementById('charProgress');
const tweetSrcLink   = document.getElementById('tweetSourceLink');

/* ── Helpers ── */

/**
 * Format an ISO/RFC date string into a readable short date.
 * @param {string} raw
 */
function formatDate(raw) {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw.slice(0, 10);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return raw.slice(0, 10);
  }
}

/**
 * Strip HTML tags from a string (for tweet text fallback).
 * @param {string} html
 */
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

/**
 * Truncate a string to maxLen, appending ellipsis if needed.
 * @param {string} str
 * @param {number} maxLen
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/** Set the status badge state */
function setStatus(state, text) {
  statusBadge.className = 'status-badge ' + (state || '');
  statusText.textContent = text;
}

/** Toggle loading spinner on the refresh button */
function setLoading(loading) {
  refreshBtn.disabled = loading;
  if (loading) {
    refreshIcon.classList.add('spinning');
  } else {
    refreshIcon.classList.remove('spinning');
  }
}

/* ── Fetch ── */

async function loadNotes() {
  setLoading(true);
  setStatus('loading', 'Fetching…');

  // Hide everything, show spinner
  feedContainer.style.display  = 'none';
  errorState.style.display     = 'none';
  statsBar.style.display       = 'none';
  loadingState.style.display   = 'flex';

  try {
    const res  = await fetch('/api/release-notes');
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    allEntries = data.entries || [];
    renderEntries(allEntries);

    totalCount.textContent = allEntries.length;
    latestDate.textContent = allEntries.length ? formatDate(allEntries[0].published) : '—';
    statsBar.style.display = 'flex';

    setStatus('', 'Live');
  } catch (err) {
    loadingState.style.display = 'none';
    errorState.style.display   = 'flex';
    errorMsg.textContent       = err.message || 'Unknown error';
    setStatus('error', 'Error');
  } finally {
    setLoading(false);
    loadingState.style.display = 'none';
  }
}

/* ── Render ── */

function renderEntries(entries) {
  entriesGrid.innerHTML = '';
  selectedIndex = -1;

  if (entries.length === 0) {
    entriesGrid.innerHTML = `
      <div style="text-align:center;padding:60px 0;color:var(--text-muted);font-size:0.9rem;">
        No release notes found.
      </div>`;
  }

  entries.forEach((entry, i) => {
    const card = buildCard(entry, i);
    entriesGrid.appendChild(card);
  });

  feedContainer.style.display = 'block';
}

/** Build a single entry card element */
function buildCard(entry, index) {
  const card = document.createElement('article');
  card.className = 'entry-card';
  card.id = `entry-${index}`;
  card.setAttribute('data-index', index);
  // Stagger the slide-up animation
  card.style.animationDelay = `${Math.min(index * 0.04, 0.5)}s`;

  card.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">${escapeHtml(entry.title)}</h2>
      <div class="card-meta">
        <span class="card-date">${formatDate(entry.published)}</span>
      </div>
    </div>
    <div class="card-body">${sanitiseContent(entry.content_html)}</div>
    <div class="card-footer">
      <div class="selected-chip">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="5" cy="5" r="2" fill="currentColor"/>
        </svg>
        Selected
      </div>
      <a class="read-more-link" href="${escapeHtml(entry.link)}" target="_blank" rel="noopener">
        Read more →
      </a>
      <button class="tweet-this-btn" aria-label="Tweet this update">
        <svg class="x-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
        </svg>
        Tweet
      </button>
    </div>
  `;

  // Click card → select it
  card.addEventListener('click', (e) => {
    // Don't trigger select when clicking footer buttons/links
    if (e.target.closest('.tweet-this-btn') || e.target.closest('.read-more-link')) return;
    selectCard(index);
  });

  // Tweet button
  card.querySelector('.tweet-this-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    selectCard(index);
    openTweetModal(index);
  });

  return card;
}

/** Escape HTML for safe injection */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Light sanitisation — allow safe HTML subset from the feed.
 * Strips script/style/iframe etc.
 */
function sanitiseContent(html) {
  if (!html) return '<em style="color:var(--text-muted)">No details available.</em>';
  // Remove dangerous tags
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
  return clean;
}

/** Highlight / select a card */
function selectCard(index) {
  // Deselect previous
  if (selectedIndex !== -1) {
    const prev = document.getElementById(`entry-${selectedIndex}`);
    if (prev) prev.classList.remove('selected');
  }
  selectedIndex = index;
  const card = document.getElementById(`entry-${index}`);
  if (card) {
    card.classList.add('selected');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ── Tweet Modal ── */

function openTweetModal(index) {
  const entry = allEntries[index];
  if (!entry) return;

  const summary = entry.summary || stripHtml(entry.content_html);
  const title   = entry.title || '';
  const link    = entry.link  || '';

  // Compose default tweet text
  const linkPart  = link ? ` ${link}` : '';
  const tag       = ' #BigQuery #GoogleCloud';
  const maxBody   = 280 - linkPart.length - tag.length - 2;

  let body = title;
  if (summary && summary !== title) {
    const combined = `${title}\n\n${summary}`;
    body = combined.length <= maxBody ? combined : truncate(title, maxBody);
  }

  const fullText = `${body}${linkPart}${tag}`;

  tweetTextArea.value = truncate(fullText, 280);
  tweetSrcLink.href        = link || '#';
  tweetSrcLink.textContent = link || '—';

  updateCharCount();
  tweetModal.style.display = 'flex';
  // Focus textarea
  setTimeout(() => tweetTextArea.focus(), 60);
}

function closeTweetModal(e) {
  // If clicking the overlay itself (not the card), close
  if (e && e.target !== tweetModal) return;
  tweetModal.style.display = 'none';
}

window.closeTweetModal = function(e) {
  tweetModal.style.display = 'none';
};

function updateCharCount() {
  const len  = tweetTextArea.value.length;
  const pct  = (len / 280) * 100;

  charCountEl.textContent = len;

  // Color classes
  charCountEl.classList.toggle('near-limit', len >= 240 && len < 280);
  charCountEl.classList.toggle('at-limit', len >= 280);

  charProgress.style.width = `${Math.min(pct, 100)}%`;
  charProgress.classList.toggle('near-limit', pct >= 85 && pct < 100);
  charProgress.classList.toggle('at-limit', pct >= 100);
}

function postTweet() {
  const text = tweetTextArea.value.trim();
  if (!text) return;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=550');
  tweetModal.style.display = 'none';
}

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    tweetModal.style.display = 'none';
  }
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'TEXTAREA') {
    loadNotes();
  }
});

/* ── Boot ── */
window.addEventListener('DOMContentLoaded', loadNotes);
