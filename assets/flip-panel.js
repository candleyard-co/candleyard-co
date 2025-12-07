import { Component } from '@theme/component';

/**
 * @typedef {HTMLElement & { classList: DOMTokenList }} FlipCard
 */

export default class FlipPanel extends Component {
  connectedCallback() {
    /** @type {number} */
    this.pickLimit = Number(this.dataset.pickLimit) || 1;

    /** @type {FlipCard[]} */
    this.cards = Array.from(this.querySelectorAll('.flip-card'));

    /** @type {Set<FlipCard>} */
    this.selectedCards = new Set();

    /** @type {HTMLButtonElement | null} */
    this.submitButton = this.querySelector('.flip-panel-button');

    // Ensure button starts disabled
    if (this.submitButton) {
      this.submitButton.setAttribute('disabled', '');
      // Reset all active cards on button click
      this.submitButton.addEventListener('click', () => {
        this.classList.remove('active');
      });
    }

    // Add click listener for each card
    this.cards.forEach((card) => {
      card.addEventListener('click', () => this.handleFlip(card));
    });
  }

  /**
   * @param {FlipCard} card
   */
  handleFlip(card) {
    const isActive = card.classList.contains('active');

    // Ignore if already active (no unflip here)
    if (isActive) return;

    // Enforce limit
    if (this.selectedCards.size >= this.pickLimit) return;

    // Activate
    card.classList.add('active');
    this.selectedCards.add(card);

    // After flip animation
    setTimeout(() => {
      this.updateDisabledState(card);
    }, 800);
  }

  /**
   * Update state after flipping
   * @param {FlipCard} [card]
   */
  updateDisabledState(card) {
    const isFull = this.selectedCards.size >= this.pickLimit;

    this.cards.forEach((cardEl) => {
      if (isFull) {
        if (!cardEl.classList.contains('active')) {
          cardEl.setAttribute('disabled', '');
        }
      } else {
        cardEl.removeAttribute('disabled');
      }
    });

    // Handle submit button state
    if (this.submitButton) {
      if (isFull) {
        this.submitButton.removeAttribute('disabled');
      } else {
        this.submitButton.setAttribute('disabled', '');
      }
    }

    // Trigger confetti from clicked card if provided
    if (card) {
      this.confetti(card);
    }
  }

  /**
   * Confetti burst from the clicked card position
   * @param {FlipCard} card
   */
  confetti(card) {
    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const rect = card.getBoundingClientRect();
    const origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight
    };

    confetti({
      angle: randomInRange(55, 125),
      spread: randomInRange(50, 70),
      particleCount: randomInRange(50, 100),
      origin
    });
  }
}

if (!customElements.get('flip-panel')) {
  customElements.define('flip-panel', FlipPanel);
}
