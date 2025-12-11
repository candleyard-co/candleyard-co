import { morph } from '@theme/morph';
import { Component } from '@theme/component';
import { CartUpdateEvent, ThemeEvents } from '@theme/events';
import { DialogComponent, DialogCloseEvent } from '@theme/dialog';
import { mediaQueryLarge, isMobileBreakpoint, getIOSVersion } from '@theme/utilities';

/**
 * A custom element that displays a product card.
 *
 * @typedef {object} Refs
 * @property {HTMLAnchorElement} productCardLink - The product card link element.
 * @extends {Component<Refs>}
 */
export class PackCard extends Component {
  /** @type {AbortController | null} */
  #abortController = null;
  /** @type {Map<string, Element>} */
  #cachedContent = new Map();

  get productPageUrl() {
    const link = this.getProductCardLink();
    if (!link) return '';

    const url = new URL(link.href);

    if (url.searchParams.has('variant')) {
      return url.toString();
    }

    const selectedVariantId = this.#getSelectedVariantId();
    if (selectedVariantId) {
      url.searchParams.set('variant', selectedVariantId);
    }

    return url.toString();
  }

  /**
   * Gets the product card link element
   * @returns {HTMLAnchorElement | null} The product card link or null
   */
  getProductCardLink() {
    return this.refs.productCardLink || null;
  }

  /**
   * Gets the currently selected variant ID from the product card
   * @returns {string | null} The variant ID or null
   */
  #getSelectedVariantId() {
    return this.dataset.variantId || null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.handleClick);
    mediaQueryLarge.addEventListener('change', this.#closeQuickAddModal);
    
    // Clear cache when dialog closes
    document.addEventListener(DialogCloseEvent.eventName, this.#clearCache);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    mediaQueryLarge.removeEventListener('change', this.#closeQuickAddModal);
    document.removeEventListener(DialogCloseEvent.eventName, this.#clearCache);
    this.#abortController?.abort();
  }

  #clearCache = () => {
    // Clear the cache when dialog closes
    this.#cachedContent.clear();
  };

  /**
   * Handles quick add button click
   * @param {Event} event - The click event
   */
  handleClick = async (event) => {
    event.preventDefault();

    const currentUrl = this.productPageUrl;

    // Check if we have cached content for this URL
    let productGrid = this.#cachedContent.get(currentUrl);

    if (!productGrid) {
      // Fetch and cache the content
      const html = await this.fetchProductPage(currentUrl);
      if (html) {
        const gridElement = html.querySelector('[data-product-grid-content]');
        if (gridElement) {
          // Cache the cloned element to avoid modifying the original
          productGrid = /** @type {Element} */ (gridElement.cloneNode(true));
          this.#cachedContent.set(currentUrl, productGrid);
        }
      }
    }

    if (productGrid) {
      // Use a fresh clone from the cache
      const freshContent = /** @type {Element} */ (productGrid.cloneNode(true));
      await this.updateQuickAddModal(freshContent);
    }

    this.#openQuickAddModal();
  };

  /** @param {PackCardDialog} dialogComponent */
  #stayVisibleUntilDialogCloses(dialogComponent) {
    this.toggleAttribute('stay-visible', true);

    dialogComponent.addEventListener(DialogCloseEvent.eventName, () => this.toggleAttribute('stay-visible', false), {
      once: true,
    });
  }

  #openQuickAddModal = () => {
    const dialogComponent = document.getElementById('pack-card-dialog');
    if (!(dialogComponent instanceof PackCardDialog)) return;

    this.#stayVisibleUntilDialogCloses(dialogComponent);

    dialogComponent.showDialog();
  };

  #closeQuickAddModal = () => {
    const dialogComponent = document.getElementById('pack-card-dialog');
    if (!(dialogComponent instanceof PackCardDialog)) return;

    dialogComponent.closeDialog();
  };

  /**
   * Fetches the product page content
   * @param {string} productPageUrl - The URL of the product page to fetch
   * @returns {Promise<Document | null>}
   */
  async fetchProductPage(productPageUrl) {
    if (!productPageUrl) return null;

    // We use this to abort the previous fetch request if it's still pending.
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    try {
      const response = await fetch(productPageUrl, {
        signal: this.#abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product page: HTTP error ${response.status}`);
      }

      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, 'text/html');

      return html;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      } else {
        throw error;
      }
    } finally {
      this.#abortController = null;
    }
  }

  /**
   * Re-renders the variant picker.
   * @param {Element} productGrid - The product grid element
   */
  async updateQuickAddModal(productGrid) {
    const modalContent = document.getElementById('pack-add-modal-content');

    if (!productGrid || !modalContent) return;

    if (isMobileBreakpoint()) {
      const productDetails = productGrid.querySelector('.product-details');
      const packPicker = productGrid.querySelector('pack-picker');
      const productFormComponent = productGrid.querySelector('product-form-component');
      const variantPicker = productGrid.querySelector('variant-picker');
      const productPrice = productGrid.querySelector('product-price');
      const productTitle = document.createElement('a');
      productTitle.textContent = this.dataset.productTitle || '';

      // Make product title as a link to the product page
      productTitle.href = this.productPageUrl;

      const productHeader = document.createElement('div');
      productHeader.classList.add('product-header');

      productHeader.appendChild(productTitle);
      if (productPrice) {
        productHeader.appendChild(productPrice);
      }
      productGrid.appendChild(productHeader);

      if (variantPicker) {
        productGrid.appendChild(variantPicker);
      }

      if (packPicker) {
        productGrid.appendChild(packPicker);
      }

      if (productFormComponent) {
        productGrid.appendChild(productFormComponent);
      }

      productDetails?.remove();
    }

    morph(modalContent, productGrid);

    // Manually trigger FreeGift initialization after morphing
    this.#initializeFreeGiftElements(modalContent);

    this.#syncVariantSelection(modalContent);
  }

  /**
   * Syncs the variant selection from the product card to the modal
   * @param {Element} modalContent - The modal content element
   */
  #syncVariantSelection(modalContent) {
    const selectedVariantId = this.#getSelectedVariantId();
    if (!selectedVariantId) return;

    // Find and check the corresponding input in the modal
    const modalInputs = modalContent.querySelectorAll('input[type="radio"][data-variant-id]');
    for (const input of modalInputs) {
      if (input instanceof HTMLInputElement && input.dataset.variantId === selectedVariantId && !input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }

  /**
   * Manually initialize FreeGift elements after morphing
   * @param {Element} container
   */
  #initializeFreeGiftElements(container) {
    // Wait a bit for the DOM to settle after morphing
    setTimeout(() => {
      const freeGiftElements = container.querySelectorAll('free-gift');
      
      freeGiftElements.forEach(freeGift => {
        // Dispatch reinitialize event to trigger loadFreeGiftTitle
        freeGift.dispatchEvent(new CustomEvent('reinitialize'));
      });
    }, 0);
  }
}

if (!customElements.get('pack-card')) {
  customElements.define('pack-card', PackCard);
}

class PackCardDialog extends DialogComponent {
  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();
    // document.querySelector('main').appendChild(this);

    this.addEventListener(ThemeEvents.cartUpdate, this.handleCartUpdate, { signal: this.#abortController.signal });
    this.addEventListener(ThemeEvents.variantUpdate, this.#updateProductTitleLink);

    this.addEventListener(DialogCloseEvent.eventName, this.#handleDialogClose);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController.abort();
    this.removeEventListener(DialogCloseEvent.eventName, this.#handleDialogClose);
  }

  /**
   * Closes the dialog
   * @param {CartUpdateEvent} event - The cart update event
   */
  handleCartUpdate = (event) => {
    if (event.detail.data.didError) return;
    this.closeDialog();
  };

  #updateProductTitleLink = (/** @type {CustomEvent} */ event) => {
    const anchorElement = /** @type {HTMLAnchorElement} */ (
      event.detail.data.html?.querySelector('.view-product-title a')
    );
    const viewMoreDetailsLink = /** @type {HTMLAnchorElement} */ (this.querySelector('.view-product-title a'));
    const mobileProductTitle = /** @type {HTMLAnchorElement} */ (this.querySelector('.product-header a'));

    if (!anchorElement) return;

    if (viewMoreDetailsLink) viewMoreDetailsLink.href = anchorElement.href;
    if (mobileProductTitle) mobileProductTitle.href = anchorElement.href;
  };

  #handleDialogClose = () => {
    const iosVersion = getIOSVersion();
    /**
     * This is a patch to solve an issue with the UI freezing when the dialog is closed.
     * To reproduce it, use iOS 16.0.
     */
    if (!iosVersion || iosVersion.major >= 17 || (iosVersion.major === 16 && iosVersion.minor >= 4)) return;

    requestAnimationFrame(() => {
      /** @type {HTMLElement | null} */
      const grid = document.querySelector('#ResultsList [product-grid-view]');
      if (grid) {
        const currentWidth = grid.getBoundingClientRect().width;
        grid.style.width = `${currentWidth - 1}px`;
        requestAnimationFrame(() => {
          grid.style.width = '';
        });
      }
    });
  };
}

if (!customElements.get('pack-card-dialog')) {
  customElements.define('pack-card-dialog', PackCardDialog);
}

export class FreeGift extends Component {
  constructor() {
    super();
    // Listen for reinitialize event
    this.addEventListener('reinitialize', () => {
      this.loadFreeGiftTitle();
    });
  }

  connectedCallback() {
    super.connectedCallback();
    // Initialize immediately
    this.loadFreeGiftTitle();
  }

  async loadFreeGiftTitle() {
      const handle = this.dataset.productHandle || sessionStorage.getItem('pickedProductHandle');
      
      if (!handle) {
        console.warn('FreeGift: No product handle found');
        return;
      }

      try {
        // Fetch product data
        const response = await fetch(
          `${window.Shopify.routes.root}products/${handle}.js`
        );

        if (!response.ok) {
          return;
        }

        const product = await response.json();

        // Fetch current cart data
        const cartResponse = await fetch(`${window.Shopify.routes.root}cart.js`);
        const cart = await cartResponse.json();
        
        // Check if the first variant is already in the cart
        const variantId = product.variants?.[0]?.id;
        const isVariantInCart = variantId ? 
          cart.items.some(item => item.variant_id === variantId) : 
          false;

        // Update title
        const cleanTitle = product.title
          .replace(/free/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        const titleEl = this.querySelector('.free-gift-title');
        if (titleEl) titleEl.textContent = cleanTitle;
        
        // Update image
        const image = this.querySelector('.gift-image-preview');
        if (image && !image.querySelector('.img-gift') && product.featured_image) {
            const img = document.createElement('img');
            img.classList.add('img-gift');
            
            const originalSrc = product.featured_image.src || product.featured_image;
            img.src = originalSrc.replace(/\/([^/]+)\.(png|jpg|jpeg|webp|gif)/i, '/$1_60x.png');
            
            if (product.featured_image.alt) {
                img.alt = product.featured_image.alt;
            }
            
            image.appendChild(img);
        }

        // Create hidden input ONLY if variant is NOT in cart
        const formId = this.dataset.formId;
        if (formId && product.variants && product.variants.length > 0 && !isVariantInCart) {
          // Remove any existing inputs first
          const existingInputs = this.querySelectorAll('input[name="gift_id"]');
          existingInputs.forEach(input => input.remove());
          
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'gift_id';
          input.classList.add('input-gift-id');
          input.value = variantId;
          
          if (formId) {
            input.setAttribute('form', formId);
          }

          this.appendChild(input);
        } else if (isVariantInCart) {
          // Variant is already in cart, remove any existing gift inputs
          const existingInputs = this.querySelectorAll('input[name="gift_id"]');
          existingInputs.forEach(input => input.remove());
          console.log(`FreeGift: Variant ${variantId} is already in cart, not adding gift input`);
        }

        // Success! Remove the hidden attribute to show the component
        this.removeAttribute('hidden');
        
      } catch (err) {
        console.error('FreeGift failed to load:', err);
      }
  }
}

if (!customElements.get('free-gift')) {
  customElements.define('free-gift', FreeGift);
}