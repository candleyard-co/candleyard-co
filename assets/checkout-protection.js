import { Component } from '@theme/component';
import { ThemeEvents, CartUpdateEvent } from '@theme/events';

export class ProtectionButtons extends Component {
  constructor() {
    super();
    this.#abortController = new AbortController();
    this.#isProcessing = false;
  }

  #abortController;
  #isProcessing;

  connectedCallback() {
    super.connectedCallback?.();
    
    const { signal } = this.#abortController;

    // Listen for cart updates to sync button states
    document.addEventListener(ThemeEvents.cartUpdate, this.#onCartUpdate, { signal });
    
    // Setup button listeners
    this.setupEventListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.#abortController.abort();
  }

  /**
   * Handle cart update events from other components
   * @param {CartUpdateEvent} event
   */
  #onCartUpdate = (event) => {
    // Update button states when cart changes
    const cart = event.detail?.resource;
    
    if (cart?.items) {
      // Check if protection is still in cart
      const protectionButton = this.querySelector('.protection__checkout-button');
      const variantId = protectionButton?.getAttribute('data-protection-id');

      if (variantId) {
        const protectionItem = cart.items.find(item => 
          item.variant_id.toString() === variantId.toString()
        );

        const isInCart = !!protectionItem;
        this.#updateUIState(isInCart);
      }
    }
  };

  /**
   * Update UI state based on whether protection is in cart
   * @param {boolean} isInCart
   */
  #updateUIState(isInCart) {
    const protectionButton = this.querySelector('.protection__checkout-button');
    const normalButton = this.querySelector('.normal__checkout-button');
    
    if (isInCart) {
      protectionButton?.setAttribute('data-in-cart', 'true');
      normalButton?.setAttribute('data-in-cart', 'true');
    } else {
      protectionButton?.removeAttribute('data-in-cart');
      normalButton?.removeAttribute('data-in-cart');
    }
  }

  setupEventListeners() {
    // Protection checkout button
    const protectionButton = this.querySelector('.protection__checkout-button');
    if (protectionButton) {
      protectionButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleProtectionButtonClick(protectionButton);
      });
    }

    // Normal checkout button  
    const normalButton = this.querySelector('.normal__checkout-button');
    if (normalButton) {
      normalButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNormalButtonClick(normalButton);
      });
    }
  }

  async handleProtectionButtonClick(button) {
    // Prevent multiple clicks
    if (this.#isProcessing || button.disabled) return;
    this.#isProcessing = true;
    
    // Show loading state
    button.classList.add('is-loading');
    button.disabled = true;
    
    try {
      const variantId = button.getAttribute('data-protection-id');
      const hasInCart = button.hasAttribute('data-in-cart');
      
      if (!hasInCart) {
        // No data-in-cart attr: add to cart then redirect
        await this.addToCart(variantId);
      }
      
      // Redirect to checkout
      window.location.href = '/checkout';
      
    } catch (error) {
      // Hide loading state on error
      button.classList.remove('is-loading');
      button.disabled = false;
      this.#isProcessing = false;
    }
  }

  async handleNormalButtonClick(button) {
    // Prevent multiple clicks
    if (this.#isProcessing || button.disabled) return;
    this.#isProcessing = true;
    
    // Show loading state
    button.classList.add('is-loading');
    button.disabled = true;
    
    try {
      const hasInCart = button.hasAttribute('data-in-cart');
      
      if (hasInCart) {
        // Has data-in-cart: remove protection then redirect
        const protectionButton = this.querySelector('.protection__checkout-button');
        const lineKey = protectionButton?.getAttribute('data-in-cart');
        
        if (lineKey) {
          await this.removeFromCart(lineKey);
        }
      }
      
      // Redirect to checkout
      window.location.href = '/checkout';
      
    } catch (error) {
      // Hide loading state on error
      button.classList.remove('is-loading');
      button.disabled = false;
      this.#isProcessing = false;
    }
  }

  async addToCart(variantId) {
    // Add protection to cart
    await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ id: parseInt(variantId), quantity: 1 }]
      })
    });
  }

  async removeFromCart(lineKey) {
    // Remove protection from cart using line key
    await fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        updates: { [lineKey]: 0 }
      })
    });
  }
}

customElements.define('protection-buttons', ProtectionButtons);