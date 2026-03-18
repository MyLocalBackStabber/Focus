// ═══════════════════════════════════════
//  PERSISTENCE HELPERS
// ═══════════════════════════════════════
const ls = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ═══════════════════════════════════════
//  RESTORE SAVED SETTINGS ON LOAD
// ═══════════════════════════════════════
const savedDark    = ls.get('ss_dark', 50);
const savedPomo    = ls.get('ss_pomo', 25);
const savedAmbVol  = ls.get('ss_ambVol', 70);
const savedLofiVol = ls.get('ss_lofiVol', 60);

document.getElementById('darkSlider').value    = savedDark;
document.getElementById('pomoSlider').value    = savedPomo;
document.getElementById('ambVolSlider').value  = savedAmbVol;
document.getElementById('lofiVolSlider').value = savedLofiVol;

document.getElementById('darkVal').textContent    = savedDark + '%';
document.getElementById('pomoVal').textContent    = savedPomo + ' min';
document.getElementById('ambVolVal').textContent  = savedAmbVol + '%';
document.getElementById('lofiVolVal').textContent = savedLofiVol + '%';

applyDark(savedDark);

function applyDark(v) {
    document.getElementById('bgDimmer').style.background = `rgba(0,0,0,${v / 100})`;
}

document.getElementById('darkSlider').oninput = e => {
    const v = +e.target.value;
    applyDark(v);
    document.getElementById('darkVal').textContent = v + '%';
    ls.set('ss_dark', v);
};
document.getElementById('pomoSlider').oninput = e => {
    const v = +e.target.value;
    document.getElementById('pomoVal').textContent = v + ' min';
    ls.set('ss_pomo', v);
    if (!pomoTimer) { pomoTimeLeft = v * 60; pomoTotal = pomoTimeLeft; renderPomo(); }
};

// ═══════════════════════════════════════
//  MODE SWITCHING
// ═══════════════════════════════════════
function switchMode(mode, index) {
    document.getElementById('indicator').style.transform = `translateX(${index * 130}px)`;
    document.querySelectorAll('.toggle-item').forEach((el, i) => el.classList.toggle('active', i === index));
    document.querySelectorAll('.glass-panel').forEach(p => {
        p.classList.remove('active-view');
        p.style.display = 'none';
    });
    const el = document.getElementById(`${mode}-view`);
    el.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('active-view')));
}

// ═══════════════════════════════════════
//  CLOCK
// ═══════════════════════════════════════
function updateClock() {
    const now = new Date();
    document.getElementById('digital-clock').textContent =
        now.toLocaleTimeString([], { hour12: false });
    document.getElementById('clock-date').textContent =
        now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
updateClock();
setInterval(updateClock, 1000);

// ═══════════════════════════════════════
//  POMODORO
// ═══════════════════════════════════════
let pomoTimer = null, pomoTimeLeft = null, pomoTotal = null, pomoSession = 0;

const POMO_SESSIONS = [
    { label: 'FOCUS SESSION', dur: () => ls.get('ss_pomo', 25) * 60 },
    { label: 'SHORT BREAK',   dur: () => 5 * 60 },
    { label: 'LONG BREAK',    dur: () => 15 * 60 },
];

function renderPomo() {
    if (pomoTimeLeft === null) {
        pomoTimeLeft = POMO_SESSIONS[0].dur();
        pomoTotal = pomoTimeLeft;
    }
    const m = Math.floor(pomoTimeLeft / 60);
    const s = pomoTimeLeft % 60;
    document.getElementById('pomo-timer').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    const pct = pomoTotal > 0 ? (pomoTimeLeft / pomoTotal) * 100 : 100;
    document.getElementById('pomoBar').style.width = pct + '%';
    document.getElementById('pomo-timer').classList.toggle('urgent', pomoTimeLeft <= 60 && pomoTimeLeft > 0);
}
renderPomo();

function startPomo() {
    if (pomoTimer) return;
    if (!pomoTimeLeft) { pomoTimeLeft = POMO_SESSIONS[pomoSession].dur(); pomoTotal = pomoTimeLeft; }
    document.getElementById('pomo-label').textContent = POMO_SESSIONS[pomoSession].label;
    pomoTimer = setInterval(() => {
        pomoTimeLeft--;
        renderPomo();
        if (pomoTimeLeft <= 0) {
            clearInterval(pomoTimer); pomoTimer = null;
            document.getElementById('alarm').play().catch(() => {});
            pomoSession = (pomoSession + 1) % POMO_SESSIONS.length;
            pomoTimeLeft = POMO_SESSIONS[pomoSession].dur();
            pomoTotal = pomoTimeLeft;
            document.getElementById('pomo-label').textContent = POMO_SESSIONS[pomoSession].label;
            renderPomo();
        }
    }, 1000);
}
function stopPomo()  { clearInterval(pomoTimer); pomoTimer = null; }
function resetPomo() {
    stopPomo();
    pomoSession = 0;
    pomoTimeLeft = POMO_SESSIONS[0].dur();
    pomoTotal = pomoTimeLeft;
    document.getElementById('pomo-label').textContent = 'FOCUS SESSION';
    document.getElementById('pomo-timer').classList.remove('urgent');
    renderPomo();
}

// ═══════════════════════════════════════
//  FLIP CLOCK
// ═══════════════════════════════════════
let fH = 0, fM = 0, fS = 0, flipTimer = null;

function renderFlipUnit(id, val) {
    const el = document.getElementById(id);
    const newTxt = String(val).padStart(2, '0');
    if (el.textContent !== newTxt) {
        el.textContent = newTxt;
        el.classList.remove('animating');
        void el.offsetWidth;
        el.classList.add('animating');
    }
}
function renderFlip() {
    renderFlipUnit('flip-h', fH);
    renderFlipUnit('flip-m', fM);
    renderFlipUnit('flip-s', fS);
}
function adjustFlip(u, v) {
    if (flipTimer) return;
    if (u === 'h') fH = Math.max(0, fH + v);
    if (u === 'm') fM = Math.max(0, Math.min(59, fM + v));
    if (u === 's') fS = Math.max(0, Math.min(59, fS + v));
    renderFlip();
}
function startFlip() {
    if (flipTimer) return;
    if (fH === 0 && fM === 0 && fS === 0) return;
    flipTimer = setInterval(() => {
        if      (fS > 0) { fS--; }
        else if (fM > 0) { fM--; fS = 59; }
        else if (fH > 0) { fH--; fM = 59; fS = 59; }
        else {
            clearInterval(flipTimer); flipTimer = null;
            document.getElementById('alarm').play().catch(() => {});
            return;
        }
        renderFlip();
    }, 1000);
}
function stopFlip()  { clearInterval(flipTimer); flipTimer = null; }
function resetFlip() { stopFlip(); fH = 0; fM = 0; fS = 0; renderFlip(); }

// ═══════════════════════════════════════
//  PANEL CONTROLS
// ═══════════════════════════════════════
function closeAllPanels() {
    ['sidebar', 'ambientPanel', 'lofiPanel'].forEach(id => {
        document.getElementById(id).classList.remove('open');
    });
    document.getElementById('ambientBtn').classList.remove('active');
    document.getElementById('lofiBtn').classList.remove('active');
}
function toggleSidebar(e) {
    if (e) e.stopPropagation();
    const wasOpen = document.getElementById('sidebar').classList.contains('open');
    closeAllPanels();
    if (!wasOpen) document.getElementById('sidebar').classList.add('open');
}
function toggleAmbientPanel(e) {
    if (e) e.stopPropagation();
    const wasOpen = document.getElementById('ambientPanel').classList.contains('open');
    closeAllPanels();
    if (!wasOpen) {
        document.getElementById('ambientPanel').classList.add('open');
        document.getElementById('ambientBtn').classList.add('active');
    }
}
function toggleLofiPanel(e) {
    if (e) e.stopPropagation();
    const wasOpen = document.getElementById('lofiPanel').classList.contains('open');
    closeAllPanels();
    if (!wasOpen) {
        document.getElementById('lofiPanel').classList.add('open');
        document.getElementById('lofiBtn').classList.add('active');
    }
}
window.addEventListener('click', e => {
    const inPanel = ['sidebar','ambientPanel','lofiPanel'].some(id => document.getElementById(id).contains(e.target));
    const inBtn   = ['settingsBtn','ambientBtn','lofiBtn'].some(id => document.getElementById(id).contains(e.target));
    if (!inPanel && !inBtn) closeAllPanels();
});

// ═══════════════════════════════════════
//  AMBIENT SOUNDS  (an1.mp3 → an20.mp3)
// ═══════════════════════════════════════
const AMBIENT_SOUNDS = [
    { id:'an1',  label:'Thunderstorm',    icon:'⛈️' },
    { id:'an2',  label:'Forest',  icon:'🌲'  },
    { id:'an3',  label:'Ocean',   icon:'🌊'  },
    { id:'an4',  label:'Fire',    icon:'🔥'  },
    { id:'an5',  label:'Wind',    icon:'💨'  },
    { id:'an6',  label:'Coffeeshop music',  icon:'☕'  },
    { id:'an7',  label:'Stream',  icon:'🏞️' },
    { id:'an8',  label:'Brown Noise',   icon:'🟫'  },
    { id:'an9', label:'Birds',   icon:'🐦'  },
    { id:'an10', label:'Space',   icon:'🌌'  },
    { id:'an11', label:'Fan',     icon:'🌀'  },
    { id:'an12', label:'Train',   icon:'🚂'  },
    { id:'an13', label:'Typing',  icon:'⌨️' },
    { id:'an14', label:'Waves',   icon:'🏄'  },
    { id:'an15', label:'City',    icon:'🏙️' },
    { id:'an16', label:'Library', icon:'📚'  },
    { id:'an17', label:'Cave',    icon:'🪨'  },
    { id:'an18', label:'Garden',  icon:'🌸'  },
    { id:'an19', label:'Snow',    icon:'❄️'  },
];

const ambientAudioEls = {};
const ambientContainer = document.getElementById('ambientAudios');

AMBIENT_SOUNDS.forEach(s => {
    const a = document.createElement('audio');
    a.src = `${s.id}.mp3`;
    a.loop = true;
    a.preload = 'none';
    a.volume = savedAmbVol / 100;
    ambientContainer.appendChild(a);
    ambientAudioEls[s.id] = a;
});

const ambGrid = document.getElementById('ambGrid');
AMBIENT_SOUNDS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'amb-btn';
    btn.id = 'ambBtn_' + s.id;
    btn.innerHTML = `<span class="amb-icon">${s.icon}</span>${s.label}`;
    btn.onclick = () => {
        const audio = ambientAudioEls[s.id];
        if (btn.classList.contains('playing')) {
            audio.pause();
            audio.currentTime = 0;
            btn.classList.remove('playing');
        } else {
            audio.play().catch(() => {});
            btn.classList.add('playing');
        }
    };
    ambGrid.appendChild(btn);
});

document.getElementById('ambVolSlider').oninput = e => {
    const v = +e.target.value / 100;
    Object.values(ambientAudioEls).forEach(a => a.volume = v);
    document.getElementById('ambVolVal').textContent = e.target.value + '%';
    ls.set('ss_ambVol', +e.target.value);
};

// ═══════════════════════════════════════
//  LOFI PLAYER  (lofi1.mp3, lofi2.mp3, lofi3.mp3)
// ═══════════════════════════════════════
const LOFI_TRACKS = [
    { name: 'Track 1', sub: 'lofi / chill', src: 'lofi1.mp3' },
    { name: 'Track 2', sub: 'lofi / rain',  src: 'lofi2.mp3' },
    { name: 'Track 3', sub: 'lofi / night', src: 'lofi3.mp3' },
];

let lofiCurrent = 0, lofiPlaying = false;
const lofiAudio = document.getElementById('lofiAudio');
lofiAudio.volume = savedLofiVol / 100;
lofiAudio.src = LOFI_TRACKS[0].src;

function fmtTime(s) {
    s = Math.floor(s || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function lofiLoadTrack(idx) {
    lofiCurrent = idx;
    const t = LOFI_TRACKS[idx];
    lofiAudio.src = t.src;
    document.getElementById('lofiTrackName').textContent = t.name;
    document.getElementById('lofiTrackSub').textContent  = t.sub;
    document.getElementById('lofiProgressBar').style.width = '0%';
    document.getElementById('lofiCurrentTime').textContent = '0:00';
    document.getElementById('lofiDuration').textContent    = '0:00';
    document.querySelectorAll('.lofi-track-item').forEach((el, i) => el.classList.toggle('playing', i === idx));
}
function lofiToggle() {
    if (lofiPlaying) {
        lofiAudio.pause();
        lofiPlaying = false;
        document.getElementById('lofiPlayBtn').textContent = '▶';
    } else {
        lofiAudio.play().catch(() => {});
        lofiPlaying = true;
        document.getElementById('lofiPlayBtn').textContent = '⏸';
    }
}
function lofiNext() { lofiLoadTrack((lofiCurrent + 1) % LOFI_TRACKS.length); if (lofiPlaying) lofiAudio.play().catch(() => {}); }
function lofiPrev() { lofiLoadTrack((lofiCurrent - 1 + LOFI_TRACKS.length) % LOFI_TRACKS.length); if (lofiPlaying) lofiAudio.play().catch(() => {}); }

lofiAudio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = lofiAudio;
    if (!isNaN(duration) && duration > 0) {
        document.getElementById('lofiProgressBar').style.width = (currentTime / duration * 100) + '%';
        document.getElementById('lofiCurrentTime').textContent = fmtTime(currentTime);
        document.getElementById('lofiDuration').textContent    = fmtTime(duration);
    }
});
lofiAudio.addEventListener('ended', lofiNext);

document.getElementById('lofiProgressWrap').addEventListener('click', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    if (!isNaN(lofiAudio.duration)) lofiAudio.currentTime = pct * lofiAudio.duration;
});

document.getElementById('lofiVolSlider').oninput = e => {
    lofiAudio.volume = +e.target.value / 100;
    document.getElementById('lofiVolVal').textContent = e.target.value + '%';
    ls.set('ss_lofiVol', +e.target.value);
};

// Build track list UI
const trackListEl = document.getElementById('lofiTrackList');
LOFI_TRACKS.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'lofi-track-item' + (i === 0 ? ' playing' : '');
    div.innerHTML = `
        <span style="font-size:1rem">🎵</span>
        <div>
            <div class="lofi-track-name">${t.name}</div>
            <div class="lofi-track-meta">${t.sub}</div>
        </div>`;
    div.onclick = () => { lofiLoadTrack(i); if (lofiPlaying) lofiAudio.play().catch(() => {}); };
    trackListEl.appendChild(div);
});
// ═══════════════════════════════════════
//  BACKGROUND UPLOAD
// ═══════════════════════════════════════
document.getElementById('bgUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        document.body.style.backgroundImage = `url('${ev.target.result}')`;
        ls.set('ss_bg', ev.target.result);
    };
    reader.readAsDataURL(file);
});

// restore saved background on load
const savedBg = ls.get('ss_bg', null);
if (savedBg) document.body.style.backgroundImage = `url('${savedBg}')`;
// ═══════════════════════════════════════
//  TODO LIST
// ═══════════════════════════════════════
let todos = ls.get('ss_todos', []);

function saveTodos() { ls.set('ss_todos', todos); }

function renderTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';
    todos.forEach((todo, i) => {
        const item = document.createElement('div');
        item.className = 'todo-item' + (todo.done ? ' done' : '');
        item.innerHTML = `<div class="todo-check"></div><span class="todo-item-text">${todo.text}</span>`;
        item.onclick = () => {
            todos[i].done = !todos[i].done;
            saveTodos();
            renderTodos();
        };
        list.appendChild(item);
    });
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) return;
    todos.push({ text, done: false });
    saveTodos();
    renderTodos();
    input.value = '';
}

function clearDoneTodos() {
    todos = [];
    saveTodos();
    renderTodos();
}
// allow pressing Enter to add
document.getElementById('todoInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
});

renderTodos();
// ═══════════════════════════════════════
//  STREAK COUNTER
// ═══════════════════════════════════════
function updateStreak() {
    const today = new Date().toDateString();
    const lastVisit = ls.get('ss_lastVisit', null);
    let streak = ls.get('ss_streak', 0);

    if (lastVisit === today) {
        // already visited today, just show
    } else if (lastVisit === new Date(Date.now() - 86400000).toDateString()) {
        // visited yesterday, increment
        streak += 1;
        ls.set('ss_streak', streak);
        ls.set('ss_lastVisit', today);
    } else if (lastVisit === null) {
        // first ever visit
        streak = 1;
        ls.set('ss_streak', streak);
        ls.set('ss_lastVisit', today);
    } else {
        // streak broken
        streak = 1;
        ls.set('ss_streak', streak);
        ls.set('ss_lastVisit', today);
    }

    const label = streak === 1 ? 'day streak' : 'day streak';
    document.getElementById('streakText').textContent = `${streak} 🔥 ${label}`;
    document.getElementById('streakBadge').title = `You've visited ${streak} day(s) in a row`;
}

updateStreak();
// ═══════════════════════════════════════
//  FULLSCREEN
// ═══════════════════════════════════════
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        document.getElementById('fullscreenBtn').innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`;
    } else {
        document.exitFullscreen().catch(() => {});
        document.getElementById('fullscreenBtn').innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
    }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.getElementById('fullscreenBtn').innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
    }
});

