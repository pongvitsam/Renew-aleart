/**
 * ปฏิทินเลือกวัน — เดือน/ปี ไทย พ.ศ.
 */
const ThaiDatePicker = {
  _map: {},

  parseIso(iso) {
    if (!iso) return null;
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  },

  toIso(d) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  mount(host, options) {
    const id = options.id;
    if (!host || !id) return null;

    const initial = this.parseIso(options.value || '');
    const state = {
      viewYear: initial ? initial.getFullYear() : new Date().getFullYear(),
      viewMonth: initial ? initial.getMonth() : new Date().getMonth(),
      selected: initial
    };

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = id;
    hidden.value = options.value || '';

    const root = document.createElement('div');
    root.className = 'thai-dp';

    const display = document.createElement('button');
    display.type = 'button';
    display.className = 'thai-dp-display';
    display.innerHTML = '<i class="fa-regular fa-calendar-days"></i> <span class="thai-dp-display-text">เลือกวันที่</span>';

    const pop = document.createElement('div');
    pop.className = 'thai-dp-pop hidden';

    const head = document.createElement('div');
    head.className = 'thai-dp-head';
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'thai-dp-nav';
    prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    const title = document.createElement('p');
    title.className = 'thai-dp-title';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'thai-dp-nav';
    next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    head.append(prev, title, next);

    const dow = document.createElement('div');
    dow.className = 'thai-dp-dow';
    ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => {
      const c = document.createElement('span');
      c.textContent = d;
      dow.appendChild(c);
    });

    const grid = document.createElement('div');
    grid.className = 'thai-dp-grid';

    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.className = 'thai-dp-today';
    todayBtn.textContent = 'วันนี้';

    pop.append(head, dow, grid, todayBtn);
    pop.onclick = e => e.stopPropagation();
    root.append(display, pop, hidden);
    host.replaceChildren(root);

    const updateDisplay = () => {
      const span = display.querySelector('.thai-dp-display-text');
      if (state.selected) {
        span.textContent = Utils.formatDate(ThaiDatePicker.toIso(state.selected));
        display.classList.add('has-value');
      } else {
        span.textContent = options.placeholder || 'เลือกวันที่';
        display.classList.remove('has-value');
      }
    };

    const paint = () => {
      title.textContent = Utils.formatMonthYear(state.viewYear, state.viewMonth);
      grid.replaceChildren();
      const first = new Date(state.viewYear, state.viewMonth, 1);
      const startDow = first.getDay();
      const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
      const prevDays = new Date(state.viewYear, state.viewMonth, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const addCell = (day, other, dateObj) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thai-dp-day' + (other ? ' other' : '');
        if (state.selected && dateObj &&
          dateObj.getFullYear() === state.selected.getFullYear() &&
          dateObj.getMonth() === state.selected.getMonth() &&
          dateObj.getDate() === state.selected.getDate()) {
          btn.classList.add('selected');
        }
        if (!other && dateObj && dateObj.getTime() === today.getTime()) btn.classList.add('today');
        btn.textContent = String(day);
        if (!other && dateObj) {
          btn.onclick = () => {
            state.selected = dateObj;
            hidden.value = ThaiDatePicker.toIso(dateObj);
            updateDisplay();
            pop.classList.add('hidden');
            if (options.onChange) options.onChange(hidden.value);
          };
        }
        grid.appendChild(btn);
      };

      for (let i = 0; i < startDow; i++) {
        const d = prevDays - startDow + i + 1;
        addCell(d, true, null);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        addCell(d, false, new Date(state.viewYear, state.viewMonth, d));
      }
      const total = startDow + daysInMonth;
      const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
      for (let i = 1; i <= rem; i++) addCell(i, true, null);
    };

    display.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.thai-dp-pop').forEach(p => { if (p !== pop) p.classList.add('hidden'); });
      pop.classList.toggle('hidden');
      if (!pop.classList.contains('hidden') && state.selected) {
        state.viewYear = state.selected.getFullYear();
        state.viewMonth = state.selected.getMonth();
        paint();
      }
    };

    prev.onclick = (e) => {
      e.stopPropagation();
      state.viewMonth--;
      if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
      paint();
    };
    next.onclick = (e) => {
      e.stopPropagation();
      state.viewMonth++;
      if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
      paint();
    };
    todayBtn.onclick = (e) => {
      e.stopPropagation();
      const t = new Date();
      state.selected = t;
      state.viewYear = t.getFullYear();
      state.viewMonth = t.getMonth();
      hidden.value = ThaiDatePicker.toIso(t);
      updateDisplay();
      paint();
      pop.classList.add('hidden');
      if (options.onChange) options.onChange(hidden.value);
    };

    document.addEventListener('click', () => pop.classList.add('hidden'));

    paint();
    updateDisplay();
    this._map[id] = { hidden, state, paint, updateDisplay };
    return this._map[id];
  },

  getValue(id) {
    return document.getElementById(id)?.value || '';
  },

  setValue(id, iso) {
    const inst = this._map[id];
    if (!inst) return;
    inst.state.selected = this.parseIso(iso);
    if (inst.state.selected) {
      inst.state.viewYear = inst.state.selected.getFullYear();
      inst.state.viewMonth = inst.state.selected.getMonth();
    }
    inst.hidden.value = iso || '';
    inst.paint();
    inst.updateDisplay();
  },

  mountBySelector(selector, options) {
    document.querySelectorAll(selector).forEach(el => {
      const id = el.dataset.inputId || options.id;
      if (id) this.mount(el, { ...options, id });
    });
  }
};
