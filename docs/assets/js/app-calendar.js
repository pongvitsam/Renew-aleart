App.calYear = new Date().getFullYear();
App.calMonth = new Date().getMonth();

function renderCalendarPanel(container) {
  const wrap = document.createElement('section');
  wrap.className = 'cal-wrap mb-8';
  wrap.id = 'calendar-panel';

  const header = document.createElement('div');
  header.className = 'cal-header';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30';
  prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

  const center = document.createElement('div');
  center.className = 'text-center';
  const titleEl = document.createElement('p');
  titleEl.id = 'cal-title';
  titleEl.className = 'text-lg font-bold';
  const sub = document.createElement('p');
  sub.className = 'text-xs opacity-80';
  sub.id = 'cal-subtitle';
  sub.textContent = 'ปฏิทินหมดอายุใบอนุญาต';
  center.append(titleEl, sub);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30';
  next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

  header.append(prev, center, next);

  const dow = document.createElement('div');
  dow.className = 'cal-grid border-b border-slate-100';
  Utils.TH_DOW.forEach(d => {
    const c = document.createElement('div');
    c.className = 'cal-dow';
    c.textContent = d;
    dow.appendChild(c);
  });

  const grid = document.createElement('div');
  grid.className = 'cal-grid';
  grid.id = 'cal-days-grid';

  wrap.append(header, dow, grid);
  container.appendChild(wrap);

  prev.onclick = () => {
    App.calMonth--;
    if (App.calMonth < 0) { App.calMonth = 11; App.calYear--; }
    paintCalendarDays();
  };
  next.onclick = () => {
    App.calMonth++;
    if (App.calMonth > 11) { App.calMonth = 0; App.calYear++; }
    paintCalendarDays();
  };
  paintCalendarDays();
}

function paintCalendarDays() {
  const title = document.getElementById('cal-title');
  const grid = document.getElementById('cal-days-grid');
  if (!title || !grid) return;

  title.textContent = Utils.formatMonthYear(App.calYear, App.calMonth);
  const sub = document.getElementById('cal-subtitle');
  if (sub) sub.textContent = 'พ.ศ. ' + Utils.toBE(App.calYear) + ' · คลิกรายการเพื่อเปิดโครงการ';

  const first = new Date(App.calYear, App.calMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(App.calYear, App.calMonth + 1, 0).getDate();
  const prevDays = new Date(App.calYear, App.calMonth, 0).getDate();

  const eventsByDay = {};
  (App.expiryEvents || []).forEach(ev => {
    const d = new Date(ev.date + 'T12:00:00');
    if (d.getFullYear() === App.calYear && d.getMonth() === App.calMonth) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const today = new Date();
  grid.replaceChildren();

  for (let i = 0; i < startDow; i++) {
    grid.appendChild(makeCalCell(prevDays - startDow + i + 1, true, [], false));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d && today.getMonth() === App.calMonth && today.getFullYear() === App.calYear;
    grid.appendChild(makeCalCell(d, false, eventsByDay[d] || [], isToday));
  }
  const total = startDow + daysInMonth;
  const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= rem; i++) {
    grid.appendChild(makeCalCell(i, true, [], false));
  }
}

function makeCalCell(dayNum, otherMonth, events, isToday) {
  const cell = document.createElement('div');
  cell.className = 'cal-day' + (otherMonth ? ' other-month' : '') + (isToday ? ' today' : '');

  const num = document.createElement('div');
  num.className = 'cal-day-num';
  if (isToday) {
    num.innerHTML = String(dayNum) + ' <span class="cal-today-tag">วันนี้</span>';
  } else {
    num.textContent = String(dayNum);
  }
  cell.appendChild(num);

  events.slice(0, 3).forEach(ev => {
    const el = document.createElement('div');
    const st = ev.status === 'expired' ? 'expired' : ev.status === 'warning' ? 'warn' : 'safe';
    el.className = 'cal-event ' + st;
    el.textContent = ev.license.name;
    el.title = ev.project.name + ' — ' + Utils.formatDate(ev.date);
    el.onclick = (e) => { e.stopPropagation(); renderProjectView(ev.project.id); };
    cell.appendChild(el);
  });
  if (events.length > 3) {
    const more = document.createElement('div');
    more.className = 'text-[10px] text-slate-400 mt-0.5';
    more.textContent = '+' + (events.length - 3) + ' รายการ';
    cell.appendChild(more);
  }
  return cell;
}

window.renderCalendarPanel = renderCalendarPanel;
