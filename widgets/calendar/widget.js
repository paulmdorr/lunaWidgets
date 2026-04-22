const { icalUrl } = widget.config;

const MAX_LANES = 3;
const BAR_COLORS = ['#5B8AF0', '#E07B4F', '#52B67A', '#C770E0', '#E0B534'];

function eventColor(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) & 0xffff;
  return BAR_COLORS[hash % BAR_COLORS.length];
}

function toDayNumber(date) {
  return Math.floor(date.getTime() / 86400000);
}

function assignLanes(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const laneEndDays = [];

  sorted.forEach(event => {
    const eventStartDay = toDayNumber(event.start);
    const eventEndDay = Math.max(toDayNumber(event.end), eventStartDay + 1);

    let lane = laneEndDays.findIndex(laneEndDay => laneEndDay <= eventStartDay);
    if (lane === -1) lane = laneEndDays.length;

    laneEndDays[lane] = eventEndDay;
    event.lane = lane;
  });

  return sorted;
}

let icalLibraryLoaded = false;

async function ensureIcalLoaded() {
  if (icalLibraryLoaded) return;
  await new Promise((resolve, reject) => {
    const scriptElement = document.createElement('script');
    scriptElement.src = 'ical.min.js';
    scriptElement.onload = resolve;
    scriptElement.onerror = reject;
    document.head.appendChild(scriptElement);
  });
  icalLibraryLoaded = true;
}

function parseCurrentMonthEvents(icalText) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const calendarComponent = new ICAL.Component(ICAL.parse(icalText));
  const events = [];

  calendarComponent.getAllSubcomponents('vevent').forEach(veventComponent => {
    const icalEvent = new ICAL.Event(veventComponent);

    if (icalEvent.isRecurring()) {
      const expansion = new ICAL.RecurExpansion({
        component: veventComponent,
        dtstart: veventComponent.getFirstPropertyValue('dtstart'),
      });

      let nextOccurrence;
      let iterations = 0;
      while ((nextOccurrence = expansion.next()) && iterations++ < 100) {
        const startDate = nextOccurrence.toJSDate();
        if (startDate > monthEnd) break;
        if (startDate >= monthStart) {
          events.push({ title: icalEvent.summary, start: startDate, end: startDate });
        }
      }
    } else {
      const startDate = icalEvent.startDate.toJSDate();
      const endDate = icalEvent.endDate.toJSDate();

      if (startDate <= monthEnd && endDate > monthStart) {
        events.push({ title: icalEvent.summary, start: startDate, end: endDate });
      }
    }
  });

  return events;
}

function buildCalendarStore(events) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstWeekdayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsWithLanes = assignLanes(events);
  const cells = [];

  for (let i = 0; i < firstWeekdayOfMonth; i++) {
    cells.push({ empty: true });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const dayStartNumber = toDayNumber(new Date(year, month, dayNumber));
    const dayEndNumber = dayStartNumber + 1;

    const dayEvents = eventsWithLanes.filter(event => {
      const eventStartDay = toDayNumber(event.start);
      const eventEndDay = Math.max(toDayNumber(event.end), eventStartDay + 1);
      return eventStartDay < dayEndNumber && eventEndDay > dayStartNumber;
    });

    const bars = Array.from({ length: MAX_LANES }, (_, lane) => {
      const event = dayEvents.find(e => e.lane === lane);
      return event
        ? { color: eventColor(event.title), title: event.title, isEmpty: false }
        : { color: '', title: '', isEmpty: true };
    });

    cells.push({
      number: dayNumber,
      isToday: dayNumber === today.getDate(),
      eventTitles: dayEvents.map(event => event.title).join('\n\n'),
      bars,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ empty: true });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push({ days: cells.slice(i, i + 7) });
  }

  return {
    monthName: today.toLocaleDateString([], { month: 'long' }),
    year,
    weeks,
  };
}

let tooltipListenerController = null;

widget.renderWithCallback(() => {
  if (tooltipListenerController) tooltipListenerController.abort();
  tooltipListenerController = new AbortController();
  const { signal } = tooltipListenerController;

  const calendarElement = document.querySelector('.calendar');
  const tooltipElement = document.querySelector('.tooltip');

  document.querySelectorAll('.day[data-events]:not([data-events=""])').forEach(dayElement => {
    dayElement.addEventListener(
      'mouseenter',
      () => {
        tooltipElement.textContent = dayElement.dataset.events;
        tooltipElement.classList.add('visible');

        const dayRect = dayElement.getBoundingClientRect();
        const calendarRect = calendarElement.getBoundingClientRect();
        const centerX = dayRect.left + dayRect.width / 2 - calendarRect.left;
        const isTopHalf = dayRect.top - calendarRect.top < calendarRect.height / 2;

        tooltipElement.style.left = `${centerX}px`;
        if (isTopHalf) {
          tooltipElement.style.top = `${dayRect.bottom - calendarRect.top + 4}px`;
          tooltipElement.style.transform = 'translateX(-50%)';
        } else {
          tooltipElement.style.top = `${dayRect.top - calendarRect.top - 4}px`;
          tooltipElement.style.transform = 'translate(-50%, -100%)';
        }

        requestAnimationFrame(() => {
          const tooltipRect = tooltipElement.getBoundingClientRect();
          const rightOverflow = tooltipRect.right - calendarRect.right;
          const leftOverflow = calendarRect.left - tooltipRect.left;
          if (rightOverflow > 0) tooltipElement.style.left = `${centerX - rightOverflow}px`;
          else if (leftOverflow > 0) tooltipElement.style.left = `${centerX + leftOverflow}px`;
        });
      },
      { signal }
    );

    dayElement.addEventListener(
      'mouseleave',
      () => {
        tooltipElement.classList.remove('visible');
      },
      { signal }
    );
  });
});

widget.onRefresh(async () => {
  try {
    await ensureIcalLoaded();
    const response = await widget.fetch(icalUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const icalText = await response.text();
    const events = parseCurrentMonthEvents(icalText);
    widget.store = buildCalendarStore(events);
  } catch (e) {
    widget.setError(widget.config.debug ? e.message : 'Failed to load calendar');
  }
});
