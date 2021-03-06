customElements.define(
  'ticker-timer',
  class TickerTimer extends HTMLElement {
    // Specify observed attributes so that attributeChangedCallback will work
    static get observedAttributes() {
      return ['target'];
    }

    constructor() {
      super();

      /**
       * Create shadowDOM and add internal HTML. attachShadow() returns
       * the shadowRoot which we use to append DOM and styles.
       */
      const shadowRoot = this.attachShadow({ mode: 'open' });

      // Create container <div>
      const container = document.createElement('div');
      container.setAttribute('part', 'container');

      // Create ticker segment HTML
      const segmentsList = ['day', 'hour', 'minute', 'second'];

      const template = document.createElement('template');
      const segmentTemplate = segment => `
        <div part="segment__wrapper" data-${segment}>
          <span part="segment__digits" data-value>--</span>
          <span part="segment__label" data-label>${segment}s</span>
        </div>
      `;

      const separatorTemplate = document.createElement('template');
      separatorTemplate.innerHTML = `<div part="separator">:</div>`;

      segmentsList.forEach((segment, index) => {
        template.innerHTML = segmentTemplate(segment);
        container.appendChild(template.content.cloneNode(true));
        if (index < 3)
          container.appendChild(separatorTemplate.content.cloneNode(true));
      });

      const style = document.createElement('style');
      style.textContent = `
        [part="container"] {
          display: flex;
        }

        [part="segment__wrapper"] {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `;

      shadowRoot.appendChild(style);
      shadowRoot.appendChild(container);

      // Set up selectors
      this.segmentSelectors = {
        day: this.shadowRoot.querySelector('[data-day]'),
        hour: this.shadowRoot.querySelector('[data-hour]'),
        minute: this.shadowRoot.querySelector('[data-minute]'),
        second: this.shadowRoot.querySelector('[data-second]'),
      };

      // Timer logic
      this.controller = new AbortController();

      this.animationInterval = (ms, timerStart, signal, callback) => {
        const frame = time => {
          if (signal.aborted) return;
          callback(time);
          scheduleFrame(time);
        };

        const scheduleFrame = time => {
          const elapsed = time - timerStart;
          const roundedElapsed = Math.round(elapsed / ms) * ms;
          const targetNext = timerStart + roundedElapsed + ms;
          const delay = targetNext - performance.now();
          setTimeout(() => requestAnimationFrame(frame), delay);
        };

        scheduleFrame(timerStart);
      };

      this.padNum = number => String(number).padStart(2, '0');

      this.formatTime = timeDiff => {
        const formatter = new Date(0);
        formatter.setUTCMilliseconds(timeDiff);

        let day = Math.floor(timeDiff / 86400000);
        let hour = formatter.getUTCHours(timeDiff);
        let minute = formatter.getUTCMinutes(timeDiff);
        let second = formatter.getUTCSeconds(timeDiff);

        return {
          second,
          minute,
          hour,
          day,
        };
      };

      this.printTime = (time, now, timerStart, targetDateTime) => {
        let diffTime = targetDateTime
          ? targetDateTime - (time + now)
          : time - timerStart;
        const formattedTime = this.formatTime(diffTime);

        Object.entries(formattedTime).forEach(entry => {
          const [segmentType, value] = entry;
          const segmentWrapper = this.segmentSelectors[segmentType];
          const segmentValue = segmentWrapper.querySelector('[data-value]');
          segmentValue.textContent = this.padNum(value);
        });
      };

      this.init = () => {
        /**
         * We call abort() first to abort any previously-running timers
         * before creating our new controller. This ensures that we don't
         * have multiple timers running when the `target` attribute is changed.
         *
         * By creating the controller in the constructor initially, it also
         * allows us to abort the timer when the component is removed, through
         * the disconnectedCallback();
         */
        this.controller.abort();
        this.controller = new AbortController();

        /**
         * Retrieve the target date passed as an attribute.
         * Early return if it's an invalid date format.
         */
        const targetAttr = this.getAttribute('target');
        const target = targetAttr !== '' ? new Date(targetAttr) : null;
        if (target instanceof Date && isNaN(target)) return;

        /**
         * Make the element more accessible by adding an aria-label
         * and allowing it to be focusable with tabIndex="0".
         */
        this.ariaLabel = target ? 'Countdown' : 'Timer';

        this.tabIndex = this.getAttribute('tabIndex')
          ? this.getAttribute('tabIndex')
          : 0;

        /**
         * Set up and start the timer functionality.
         */
        const targetDateTime = target?.getTime();
        const now = Date.now();
        const timerStart = Math.floor(
          document.timeline ? document.timeline.currentTime : performance.now()
        );

        // Create an animation callback every second
        this.animationInterval(1000, timerStart, this.controller.signal, time =>
          this.printTime(time, now, timerStart, targetDateTime)
        );
      };
    }

    connectedCallback() {
      this.init();
    }

    disconnectedCallback() {
      this.controller.abort();
    }

    attributeChangedCallback(name) {
      if (name !== 'target') return;
      this.init();
    }
  }
);
