customElements.define(
  'ticker-timer',
  class TickerTimer extends HTMLElement {
    // Specify observed attributes so that attributeChangedCallback will work
    static get observedAttributes() {
      return ['target', 'direction', 'segments'];
    }

    /**
     * Pass the value of `segments` attribute to this function.
     * Returns an array with the segments that should be displayed.
     * If no `segment` attribute exists or the value is empty, default
     * to the full `segments` array.
     */
    getSegmentsList = segments => {
      const segmentsOrder = ['days', 'hours', 'minutes', 'seconds'];
      if (!segments || '') {
        return segmentsOrder;
      }

      const segmentsInput = segments.toLowercase();
      const segmentsOutput = segmentsOrder.map(segment =>
        segmentsInput.includes(segment) ? segment : null
      );

      return segmentsOutput.filter(Boolean);
    };

    constructor() {
      super();

      /**
       * Create shadowDOM and add internal HTML. attachShadow() returns
       * the shadowRoot which we use to append DOM and styles.
       */
      const shadowRoot = this.attachShadow({ mode: 'open' });

      // Get settings from element attributes
      const target = this.getAttribute('target');
      const direction = this.getAttribute('direction');
      const segments = this.getAttribute('segments');

      // Create container <div>
      const container = document.createElement('div');
      container.setAttribute('part', 'container');

      // Create ticker segment HTML
      const segmentsList = this.getSegmentsList(segments);

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
    }

    connectedCallback() {
      console.log('ticker-timer element added to page.');
    }

    disconnectedCallback() {
      console.log('ticker-timer element removed from page.');
    }

    adoptedCallback() {
      console.log('ticker-timer element moved to new page.');
    }

    attributeChangedCallback(name, oldValue, newValue) {
      console.log('ticker-timer element attributes changed.');
    }
  }
);
