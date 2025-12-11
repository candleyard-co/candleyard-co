import { Component } from '@theme/component';
import { fetchConfig, debounce, onAnimationEnd, prefersReducedMotion, resetShimmer } from '@theme/utilities';
import { morphSection, sectionRenderer } from '@theme/section-renderer';
import {
  ThemeEvents,
  CartUpdateEvent,
  QuantitySelectorUpdateEvent,
  CartAddEvent,
  DiscountUpdateEvent,
} from '@theme/events';
import { cartPerformance } from '@theme/performance';

/** @typedef {import('./utilities').TextComponent} TextComponent */

/**
 * A custom element that displays a cart items component.
 *
 * @typedef {object} Refs
 * @property {HTMLElement[]} quantitySelectors - The quantity selector elements.
 * @property {HTMLTableRowElement[]} cartItemRows - The cart item rows.
 * @property {TextComponent} cartTotal - The cart total.
 *
 * @extends {Component<Refs>}
 */
class CartItemsComponent extends Component {
  #debouncedOnChange = debounce(this.#onQuantityChange, 300).bind(this);

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate);
    document.addEventListener(ThemeEvents.discountUpdate, this.handleDiscountUpdate);
    document.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate);
    document.removeEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
  }

  /**
   * Handles QuantitySelectorUpdateEvent change event.
   * @param {QuantitySelectorUpdateEvent} event - The event.
   */
  #onQuantityChange(event) {
    const { quantity, cartLine: line } = event.detail;

    if (!line) return;

    if (quantity === 0) {
      return this.onLineItemRemove(line);
    }

    this.updateQuantity({
      line,
      quantity,
      action: 'change',
    });
    const lineItemRow = this.refs.cartItemRows[line - 1];

    if (!lineItemRow) return;

    const textComponent = /** @type {TextComponent | undefined} */ (lineItemRow.querySelector('text-component'));
    textComponent?.shimmer();
  }

  /**
   * Handles the line item removal.
   * @param {number} line - The line item index.
   */
  onLineItemRemove(line) {
    const cartItemRowToRemove = this.refs.cartItemRows[line - 1];

    if (!cartItemRowToRemove) return;

    // Check if this is a parent item with connected gifts
    const hasConnectedGifts = cartItemRowToRemove.hasAttribute('data-connected-gift');

    if (hasConnectedGifts) {
      // Get parent variant ID and connected gift IDs
      const parentVariantId = cartItemRowToRemove.dataset.variantId;
      const giftVariantId = cartItemRowToRemove.dataset.connectedGift;
      
      if (parentVariantId && giftVariantId) {
        // Find ALL gift items with this variant ID
        const allGiftVariantIds = new Set([giftVariantId]);
        
        // Add any other gifts with the same variant ID
        this.refs.cartItemRows.forEach(row => {
          if (row.dataset.variantId === giftVariantId && row !== cartItemRowToRemove) {
            allGiftVariantIds.add(row.dataset.variantId);
          }
        });

        // Create updates object for batch removal
        const updates = {};
        updates[parentVariantId] = 0; // Remove parent
        
        // Remove all gift variants
        allGiftVariantIds.forEach(variantId => {
          updates[variantId] = 0;
        });

        // Use batch update API
        return this.#updateBatchQuantity({
          updates: updates,
          action: 'clear'
        }, cartItemRowToRemove);
      }
    }

    // Original code for non-gift items
    this.updateQuantity({
      line,
      quantity: 0,
      action: 'clear',
    });

    const rowsToRemove = [
      cartItemRowToRemove,
      // Get all nested lines of the row to remove
      ...this.refs.cartItemRows.filter((row) => row.dataset.parentKey === cartItemRowToRemove.dataset.key),
    ];

    // Add class to the row to trigger the animation
    rowsToRemove.forEach((row) => {
      const remove = () => row.remove();

      if (prefersReducedMotion()) return remove();

      row.style.setProperty('--row-height', `${row.clientHeight}px`);
      row.classList.add('removing');

      // Remove the row after the animation ends
      onAnimationEnd(row, remove);
    });
  }

  /**
   * Updates the quantity.
   * @param {Object} config - The config.
   * @param {number} config.line - The line.
   * @param {number} config.quantity - The quantity.
   * @param {string} config.action - The action.
   */
  updateQuantity(config) {
    const cartPerformaceUpdateMarker = cartPerformance.createStartingMarker(`${config.action}:user-action`);

    this.#disableCartItems();

    const { line, quantity } = config;
    const { cartTotal } = this.refs;

    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    const sectionsToUpdate = new Set([this.sectionId]);
    cartItemsComponents.forEach((item) => {
      if (item instanceof HTMLElement && item.dataset.sectionId) {
        sectionsToUpdate.add(item.dataset.sectionId);
      }
    });

    const body = JSON.stringify({
      line: line,
      quantity: quantity,
      sections: Array.from(sectionsToUpdate).join(','),
      sections_url: window.location.pathname,
    });

    cartTotal?.shimmer();

    fetch(`${Theme.routes.cart_change_url}`, fetchConfig('json', { body }))
      .then((response) => {
        return response.text();
      })
      .then((responseText) => {
        const parsedResponseText = JSON.parse(responseText);

        resetShimmer(this);

        if (parsedResponseText.errors) {
          this.#handleCartError(line, parsedResponseText);
          return;
        }

        const newSectionHTML = new DOMParser().parseFromString(
          parsedResponseText.sections[this.sectionId],
          'text/html'
        );

        // Grab the new cart item count from a hidden element
        const newCartHiddenItemCount = newSectionHTML.querySelector('[ref="cartItemCount"]')?.textContent;
        const newCartItemCount = newCartHiddenItemCount ? parseInt(newCartHiddenItemCount, 10) : 0;

        // Update data-cart-quantity for all matching variants
        this.#updateQuantitySelectors(parsedResponseText);

        this.dispatchEvent(
          new CartUpdateEvent({}, this.sectionId, {
            itemCount: newCartItemCount,
            source: 'cart-items-component',
            sections: parsedResponseText.sections,
          })
        );

        morphSection(this.sectionId, parsedResponseText.sections[this.sectionId]);

        this.#updateCartQuantitySelectorButtonStates();
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        this.#enableCartItems();
        cartPerformance.measureFromMarker(cartPerformaceUpdateMarker);
      });
  }

// ============= ADD BATCH UPDATE METHOD =============
/**
 * Updates multiple quantities at once using Shopify's batch API
 * @param {Object} config - The config with updates object
 * @param {HTMLTableRowElement} parentRow - The parent row being removed
 */
#updateBatchQuantity(config, parentRow) {
  const cartPerformanceUpdateMarker = cartPerformance.createStartingMarker(`${config.action}:user-action`);

  this.#disableCartItems();

  const { updates } = config;
  const { cartTotal } = this.refs;

  const cartItemsComponents = document.querySelectorAll('cart-items-component');
  const sectionsToUpdate = new Set([this.sectionId]);
  cartItemsComponents.forEach((item) => {
    if (item instanceof HTMLElement && item.dataset.sectionId) {
      sectionsToUpdate.add(item.dataset.sectionId);
    }
  });

  // Shopify's batch update format
  const body = JSON.stringify({
    updates: updates,
    sections: Array.from(sectionsToUpdate).join(','),
    sections_url: window.location.pathname,
  });

  cartTotal?.shimmer();

  // Use cart/update.js for batch operations
  fetch(`${Theme.routes.cart_update_url}`, fetchConfig('json', { body }))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then((parsedResponseText) => {
      resetShimmer(this);

      if (parsedResponseText.errors) {
        console.error('Batch removal error:', parsedResponseText.errors);
        // Fallback to individual removal
        this.#fallbackIndividualRemoval(updates, parentRow);
        return;
      }

      // Update data-cart-quantity for all matching variants
      this.#updateQuantitySelectors(parsedResponseText);

      this.dispatchEvent(
        new CartUpdateEvent({}, this.sectionId, {
          itemCount: parsedResponseText.item_count || 0,
          source: 'cart-items-component',
          sections: parsedResponseText.sections,
        })
      );

      morphSection(this.sectionId, parsedResponseText.sections[this.sectionId]);

      this.#updateCartQuantitySelectorButtonStates();
      
      // Handle UI removal after successful batch removal
      this.#removeUIRows(parentRow);
    })
    .catch((error) => {
      console.error('Batch removal failed:', error);
      // Fallback to individual removal
      this.#fallbackIndividualRemoval(updates, parentRow);
    })
    .finally(() => {
      this.#enableCartItems();
      cartPerformance.measureFromMarker(cartPerformanceUpdateMarker);
    });
}

// ============= ADD HELPER METHODS =============
/**
 * Fallback to individual removal if batch fails
 * @param {Object} updates - Updates object with variantId: 0
 * @param {HTMLTableRowElement} parentRow - Parent row
 */
#fallbackIndividualRemoval(updates, parentRow) {
  console.warn('Falling back to individual removal');
  
  const variantIds = Object.keys(updates);
  const parentVariantId = parentRow.dataset.variantId;
  
  // Remove parent first
  const parentLine = Array.from(this.refs.cartItemRows).indexOf(parentRow) + 1;
  this.updateQuantity({
    line: parentLine,
    quantity: 0,
    action: 'clear',
  });

  // Remove gifts with delays
  variantIds.forEach((variantId, index) => {
    if (variantId !== parentVariantId) {
      setTimeout(() => {
        // Find and remove all rows with this gift variant ID
        this.refs.cartItemRows.forEach((row, rowIndex) => {
          if (row.dataset.variantId === variantId) {
            this.updateQuantity({
              line: rowIndex + 1,
              quantity: 0,
              action: 'clear',
            });
          }
        });
      }, (index + 1) * 300);
    }
  });

  // Still remove UI
  this.#removeUIRows(parentRow);
}

/**
 * Remove UI rows (common logic)
 * @param {HTMLTableRowElement} parentRow - Parent row
 */
#removeUIRows(parentRow) {
  const rowsToRemove = [
    parentRow,
    ...this.refs.cartItemRows.filter((row) => row.dataset.parentKey === parentRow.dataset.key),
  ];

  rowsToRemove.forEach((row) => {
    const remove = () => row.remove();

    if (prefersReducedMotion()) return remove();

    row.style.setProperty('--row-height', `${row.clientHeight}px`);
    row.classList.add('removing');

    onAnimationEnd(row, remove);
  });
}

  /**
   * Handles the discount update.
   * @param {DiscountUpdateEvent} event - The event.
   */
  handleDiscountUpdate = (event) => {
    this.#handleCartUpdate(event);
  };

  /**
   * Handles the cart error.
   * @param {number} line - The line.
   * @param {Object} parsedResponseText - The parsed response text.
   * @param {string} parsedResponseText.errors - The errors.
   */
  #handleCartError = (line, parsedResponseText) => {
    const quantitySelector = this.refs.quantitySelectors[line - 1];
    const quantityInput = quantitySelector?.querySelector('input');

    if (!quantityInput) throw new Error('Quantity input not found');

    quantityInput.value = quantityInput.defaultValue;

    const cartItemError = this.refs[`cartItemError-${line}`];
    const cartItemErrorContainer = this.refs[`cartItemErrorContainer-${line}`];

    if (!(cartItemError instanceof HTMLElement)) throw new Error('Cart item error not found');
    if (!(cartItemErrorContainer instanceof HTMLElement)) throw new Error('Cart item error container not found');

    cartItemError.textContent = parsedResponseText.errors;
    cartItemErrorContainer.classList.remove('hidden');
  };

  /**
   * Handles the cart update.
   *
   * @param {DiscountUpdateEvent | CartUpdateEvent | CartAddEvent} event
   */
  #handleCartUpdate = (event) => {
    if (event instanceof DiscountUpdateEvent) {
      sectionRenderer.renderSection(this.sectionId, { cache: false });
      return;
    }
    if (event.target === this) return;

    const cartItemsHtml = event.detail.data.sections?.[this.sectionId];
    if (cartItemsHtml) {
      morphSection(this.sectionId, cartItemsHtml);

      // Update button states for all cart quantity selectors after morph
      this.#updateCartQuantitySelectorButtonStates();
    } else {
      sectionRenderer.renderSection(this.sectionId, { cache: false });
    }
  };

  /**
   * Disables the cart items.
   */
  #disableCartItems() {
    this.classList.add('cart-items-disabled');
  }

  /**
   * Enables the cart items.
   */
  #enableCartItems() {
    this.classList.remove('cart-items-disabled');
  }

  /**
   * Updates quantity selectors for all matching variants in the cart.
   * @param {Object} updatedCart - The updated cart object.
   * @param {Array<{variant_id: number, quantity: number}>} [updatedCart.items] - The cart items.
   */
  #updateQuantitySelectors(updatedCart) {
    if (!updatedCart.items) return;

    for (const item of updatedCart.items) {
      const variantId = item.variant_id.toString();
      const selectors = document.querySelectorAll(
        `quantity-selector-component[data-variant-id="${variantId}"], cart-quantity-selector-component[data-variant-id="${variantId}"]`
      );

      for (const selector of selectors) {
        const input = selector.querySelector('input[data-cart-quantity]');
        if (!input) continue;

        input.setAttribute('data-cart-quantity', item.quantity.toString());

        // Update the quantity selector's internal state
        if ('updateCartQuantity' in selector && typeof selector.updateCartQuantity === 'function') {
          selector.updateCartQuantity();
        }
      }
    }
  }

  /**
   * Updates button states for all cart quantity selector components.
   */
  #updateCartQuantitySelectorButtonStates() {
    const cartQuantitySelectors = document.querySelectorAll('cart-quantity-selector-component');
    for (const selector of cartQuantitySelectors) {
      if ('updateButtonStates' in selector && typeof selector.updateButtonStates === 'function') {
        selector.updateButtonStates();
      }
    }
  }

  /**
   * Gets the section id.
   * @returns {string} The section id.
   */
  get sectionId() {
    const { sectionId } = this.dataset;

    if (!sectionId) throw new Error('Section id missing');

    return sectionId;
  }
}

if (!customElements.get('cart-items-component')) {
  customElements.define('cart-items-component', CartItemsComponent);
}