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

      const segmentTemplate = segment => `
        <div part="segment__wrapper" data-${segment}>
          <span part="segment__digits" data-value>--</span>
          <span part="segment__label" data-label>${segment}s</span>
        </div>
      `;

      const template = document.createElement('template');
      segmentsList.forEach(segment => {
        template.innerHTML = segmentTemplate(segment);
        container.appendChild(template.content.cloneNode(true));
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
        let day = this.padNum(Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
        let hour = this.padNum(
          Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        );
        let minute = this.padNum(
          Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        );
        let second = this.padNum(Math.floor((timeDiff % (1000 * 60)) / 1000));

        return {
          day,
          hour,
          minute,
          second,
        };
      };

      this.updateSegments = segmentData => {
        for (const [segmentType, value] of Object.entries(
          segmentData
        ).reverse()) {
          const segmentWrapper = this.segmentSelectors[segmentType];
          const segmentValue = segmentWrapper.querySelector('[data-value]');
          segmentValue.textContent = value;
        }
      };

      this.printTime = (time, now, timerStart, targetDateTime) => {
        let diffTime = targetDateTime
          ? targetDateTime - (time + now)
          : time - timerStart;
        this.updateSegments(this.formatTime(diffTime));
      };

      this.init = () => {
        /**
         * We call abort() first to abort any previously-running timer
         * before creating our new controller. This ensures that we don't
         * have multiple timers running when the `target` attribute is changed.
         *
         * By creating the controller in the constructor initially, it also
         * allows us to abort the timer when the component is removed, through
         * the disconnectedCallback();
         */
        this.controller.abort();
        this.controller = new AbortController();

        const targetAttr = this.getAttribute('target');
        const target = targetAttr !== '' ? new Date(targetAttr) : null;
        if (target instanceof Date && isNaN(target)) return;

        const targetDateTime = target ? Date.parse(target) : null;
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

    attributeChangedCallback(name, oldValue, newValue) {
      if (name !== 'target') return;
      this.init();
    }
  }
);
