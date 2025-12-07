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

    // Show flip panel only if no product picked yet
    if (!sessionStorage.getItem('pickedProductId') && !Shopify.designMode) {
      this.classList.add('active');
    }

    // Ensure button starts disabled
    if (this.submitButton) {
      this.submitButton.setAttribute('disabled', '');
      this.submitButton.addEventListener('click', () => {
        this.classList.remove('active');

        // Only assign random product ID if session is empty
        if (!sessionStorage.getItem('pickedProductId') && this.productList.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.productList.length);
            const randomProductId = this.productList[randomIndex].id;
            sessionStorage.setItem('pickedProductId', randomProductId);

            console.log('Random product ID stored in session:', randomProductId);
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

    // If pickedProductId doesn't exist, pick a random product now
    let pickedId = sessionStorage.getItem('pickedProductId');
    if (!pickedId && this.productList.length > 0) {
        const randomIndex = Math.floor(Math.random() * this.productList.length);
        const randomProductId = this.productList[randomIndex].id;
        sessionStorage.setItem('pickedProductId', randomProductId);
        pickedId = randomProductId;

        console.log('Random product ID stored in session:', randomProductId);
    }

    
    if (pickedId) {
        const product = this.productList.find(p => Number(p.id) === Number(pickedId));

        if (product) {
            const cardTitle = card.querySelector('.flip-card-title');
            if (cardTitle) {
                cardTitle.textContent = product.title;
            }
 
            if (product.featured_image) {
                const imageBlock = card.querySelector('.image-flip-card');
                
                if (imageBlock) {
                    const img = document.createElement('img');   // create img element
                    img.src = product.featured_image;           // set source
                    img.alt = product.title || 'Product image'; // optional alt text
                    img.loading = 'lazy';                        // optional lazy loading
                    img.classList.add('image-block__image');
                    imageBlock.appendChild(img);                 // insert into imageBlock
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
