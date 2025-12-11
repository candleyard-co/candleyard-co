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
    
    /** 
     * @type {Array<Object>} 
     */
    this.productList = [];

    const productDataEl = document.querySelector('.product-list-data');
    if (productDataEl && productDataEl.textContent) {
      try {
        this.productList = JSON.parse(productDataEl.textContent);
      } catch (error) {
        console.error('Invalid JSON in .product-list-data', error);
      }
    }

    // Show flip panel only if no free gift selected yet
    if (!this.hasFreeGiftSelection() && !Shopify.designMode) {
      this.classList.add('active');
    }

    // Ensure button starts disabled
    if (this.submitButton) {
      this.submitButton.setAttribute('disabled', '');
      this.submitButton.addEventListener('click', () => {
        this.classList.remove('active');

        // Only assign random product if no free gift selected
        if (!this.hasFreeGiftSelection() && this.productList.length > 0) {
          const randomIndex = Math.floor(Math.random() * this.productList.length);
          const randomProductId = this.productList[randomIndex].id;
          const randomVariantId = this.productList[randomIndex].variants[0].id;
          const randomProductHandle = this.productList[randomIndex].handle;

          // Store using the new structure
          this.setFreeGiftSelection(randomProductId, randomVariantId, randomProductHandle);
        }
      });
    }

    // Add click listener for each card
    this.cards.forEach((card) => {
      card.addEventListener('click', () => this.handleFlip(card));
    });

    document.body.classList.add('shop-show')
  }

  /**
   * Check if free gift has been selected
   * @returns {boolean}
   */
  hasFreeGiftSelection() {
    const selection = this.getFreeGiftSelection();
    return !!selection?.freeGift?.id;
  }

  /**
   * Get free gift selection from sessionStorage
   * @returns {Object|null}
   */
  getFreeGiftSelection() {
    try {
      const storedData = sessionStorage.getItem('free-gift-selection');
      if (!storedData) return null;
      
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Error parsing free gift selection:', error);
      return null;
    }
  }

  /**
   * Store free gift selection
   * @param {string} productId
   * @param {string} variantId
   * @param {string} handle
   */
  setFreeGiftSelection(productId, variantId, handle) {
    sessionStorage.setItem(
      'free-gift-selection',
      JSON.stringify({
        freeGift: {
          timestamp: Date.now(),
          id: productId,
          variantId: variantId,
          handle: handle
        }
      })
    );
  }

  /**
   * Get currently selected free gift product ID
   * @returns {string|null}
   */
  getSelectedProductId() {
    const selection = this.getFreeGiftSelection();
    return selection?.freeGift?.id || null;
  }

  /**
   * Get currently selected free gift product handle
   * @returns {string|null}
   */
  getSelectedProductHandle() {
    const selection = this.getFreeGiftSelection();
    return selection?.freeGift?.handle || null;
  }

  /**
   * @param {FlipCard} card
   */
  handleFlip(card) {
    const isActive = card.classList.contains('active');

    // Ignore if already active (no unflip)
    if (isActive) return;

    // Enforce pick limit
    if (this.selectedCards.size >= this.pickLimit) return;

    // Activate card
    card.classList.add('active');
    this.selectedCards.add(card);

    // If no free gift selected yet, pick a random product now
    const selectedProductId = this.getSelectedProductId();
    if (!selectedProductId && this.productList.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.productList.length);
      const randomProductId = this.productList[randomIndex].id;
      const randomProductHandle = this.productList[randomIndex].handle;

      // Store the selection temporarily (will be finalized on submit)
      this.setFreeGiftSelection(
        randomProductId, 
        this.productList[randomIndex].variants[0].id, 
        randomProductHandle
      );
    }

    // Update card content with selected product
    const currentProductId = this.getSelectedProductId();
    if (currentProductId) {
      const product = this.productList.find(p => Number(p.id) === Number(currentProductId));

      if (product) {
        const cardTitle = card.querySelector('.flip-card-title');
        if (cardTitle) {
          cardTitle.textContent = product.title
            .replace(/free/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        }

        if (product.featured_image) {
          const imageBlock = card.querySelector('.image-flip-card');
          
          if (imageBlock) {
            const img = document.createElement('img');
            img.src = product.featured_image;
            img.alt = product.title || 'Product image';
            img.loading = 'lazy';
            img.classList.add('image-block__image');
            imageBlock.appendChild(img);
          }
        }
      }
    }

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

    if (this.submitButton) {
      if (isFull) {
        this.submitButton.removeAttribute('disabled');
      } else {
        this.submitButton.setAttribute('disabled', '');
      }
    }

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