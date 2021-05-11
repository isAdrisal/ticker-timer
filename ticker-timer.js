customElements.define(
  'ticker-timer',
  class TickerTimer extends HTMLElement {
    // Specify observed attributes so that attributeChangedCallback will work
    static get observedAttributes() {
      return ['target', 'direction'];
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
        <div part="segment__wrapper">
          <span part="segment__digits" data-${segment}>--</span>
          <span part="segment__label">${segment}</span>
        </div>
      `;

      segmentsList.forEach(segment => {
        const fragment = document
          .createRange()
          .createContextualFragment(segmentTemplate(segment).trim());
        container.appendChild(fragment);
      });

      const style = document.createElement('style');
      style.textContent = `
        [part="container"] {
          display: flex;
          flex-flow: row nowrap;
        }

        [part="segment__wrapper"] {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        [part="segment__wrapper"]:not(:last-of-type) {
          margin-right: 1rem;
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
        let hour = this.padNum(Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
        let minute = this.padNum(Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)));
        let second = this.padNum(Math.floor((timeDiff % (1000 * 60)) / 1000));
      
        return {
          day,
          hour,
          minute,
          second,
        };
      };

      this.printTime = (time, now, targetDateTime) => {
        let diffTime = targetDateTime ? targetDateTime - time + now : time;
        const {day, hour, minute, second} = this.formatTime(diffTime);
        // console.log(day, hour, minute, second);
        // TODO: update DOM with current time
        // TODO: use IntlLocale stuff to dynamically set labels
      };
    }

    connectedCallback() {
      /**
       * Get settings from element attributes.
       * target — date-time string in the format: yyyy-mm-ddThh:mm:ss.mmm+hh:mm
       */
      const targetAttr = this.getAttribute('target');
      const target = targetAttr && targetAttr !== '' ? targetAttr : null;
      const targetDateTime = target ? Date.parse(targetAttr) : null;

      const now = targetDateTime ? Date.now() : null;
      const timerStart = Math.floor(
        document.timeline ? document.timeline.currentTime : performance.now()
      );

      // Create an animation callback every second
      const controller = new AbortController();
      this.animationInterval(1000, timerStart, controller.signal, time =>
        this.printTime(time)
      );
    }

    disconnectedCallback() {}

    adoptedCallback() {}

    attributeChangedCallback(name, oldValue, newValue) {}
  }
);
