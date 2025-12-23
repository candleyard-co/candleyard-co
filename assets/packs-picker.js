import { Component } from '@theme/component';
import { morph, MORPH_OPTIONS } from '@theme/morph';
import { ThemeEvents, VariantUpdateEvent } from '@theme/events';

export default class PacksPicker extends Component {
  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();
    
    const { signal } = this.#abortController;
    const target = this.closest('.shopify-section, dialog, product-card');
    target?.addEventListener(ThemeEvents.variantUpdate, this.handleVariantUpdate.bind(this), { signal });
    
    // Listen for change events on the packs picker
    this.addEventListener('change', this.handlePackChange.bind(this));
    
    // Update price on initial load
    this.updatePriceFromSelected();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
    this.removeEventListener('change', this.handlePackChange.bind(this));
  }

  /**
   * Updates price from the currently selected radio button
   */
  updatePriceFromSelected() {
    const selectedRadio = this.querySelector('input[type="radio"]:checked');
    const price = selectedRadio?.dataset.price;
    const comparePrice = selectedRadio?.dataset.comparePrice;
    
    if (price) {
      // Update all price elements (including sticky bar)
      this.updateAllPriceElements(price, comparePrice);
    }
  }

  /**
   * Updates all price elements on the page
   * @param {string} price - The sale price to set
   * @param {string} comparePrice - The compare price to set
   */
  updateAllPriceElements(price, comparePrice) {
    // 1. Update main add-to-cart button price (with dot-price)
    const priceElements = document.querySelectorAll('.add-to-cart-price');
    priceElements.forEach(element => {
      element.textContent = price;
    });

    // 2. Update sticky bar sale price display (.price in .sticky-add-to-cart__price)
    const stickyPriceElements = document.querySelectorAll('sticky-add-to-cart .sticky-add-to-cart__price .price');
    stickyPriceElements.forEach(element => {
      element.textContent = price;
    });

    // 3. Update sticky bar compare price display (.compare-at-price in .sticky-add-to-cart__price)
    if (comparePrice) {
      const stickyComparePriceElements = document.querySelectorAll('sticky-add-to-cart .sticky-add-to-cart__price .compare-at-price');
      stickyComparePriceElements.forEach(element => {
        element.textContent = comparePrice;
      });
    }

    // 4. Update main product price display (product-price component)
    const productPriceElements = document.querySelectorAll('product-price .price');
    productPriceElements.forEach(element => {
      element.textContent = price;
    });

    // 5. Update main product compare price display
    if (comparePrice) {
      const productComparePriceElements = document.querySelectorAll('product-price .compare-at-price');
      productComparePriceElements.forEach(element => {
        element.textContent = comparePrice;
      });
    }
  }

  /**
   * Handles pack change events
   * @param {Event} event - The change event
   */
  handlePackChange(event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    
    const selectedRadio = event.target;
    const price = selectedRadio.dataset.price;
    const comparePrice = selectedRadio.dataset.comparePrice;
    
    if (price) {
      // Update all price elements including sticky bar
      this.updateAllPriceElements(price, comparePrice);
    }
  }

  /**
   * Handles variant update events
   * @param {VariantUpdateEvent} event - The variant update event
   */
  handleVariantUpdate(event) {
    if (!event.detail?.data) return;
    
    // Check if this packs picker belongs to the same product
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (event.detail.data.productId !== this.dataset.productId) {
      return;
    }
    
    const { html } = event.detail.data;
    this.updatePacksPicker(html);
  }

  /**
   * Re-renders the packs picker.
   * @param {Document | Element} newHtml - The new HTML.
   */
  updatePacksPicker(newHtml) {
    // Find the new packs picker by block ID, similar to product-price.js
    const blockId = this.dataset.blockId;
    let newPacksPickerSource;
    
    if (blockId) {
      // Try to find by block ID first (most specific)
      newPacksPickerSource = newHtml.querySelector(`packs-picker[data-block-id="${blockId}"]`);
    }
    
    // If not found by block ID, try to find by section ID
    if (!newPacksPickerSource) {
      const sectionId = this.dataset.sectionId;
      if (sectionId) {
        newPacksPickerSource = newHtml.querySelector(`#${sectionId} packs-picker`);
      }
    }
    
    // If still not found, try generic selector
    if (!newPacksPickerSource) {
      newPacksPickerSource = newHtml.querySelector('packs-picker');
    }

    if (!newPacksPickerSource) return;

    // Save the currently selected radio button value BEFORE morphing
    const currentSelected = this.querySelector('input[type="radio"]:checked');
    const selectedValue = currentSelected?.value;
    const selectedPrice = currentSelected?.dataset.price;
    const selectedComparePrice = currentSelected?.dataset.comparePrice;

    morph(this, newPacksPickerSource, {
      ...MORPH_OPTIONS,
      getNodeKey: (node) => {
        if (!(node instanceof HTMLElement)) return undefined;
        const key = node.dataset.key;
        return key;
      },
    });

    // After morphing, restore the selected radio button if we had one
    if (selectedValue) {
      const radioToSelect = this.querySelector(`input[type="radio"][value="${selectedValue}"]`);
      if (radioToSelect) {
        radioToSelect.checked = true;

        // Use the prices from the restored selection
        const priceToUse = radioToSelect.dataset.price || selectedPrice;
        const comparePriceToUse = radioToSelect.dataset.comparePrice || selectedComparePrice;
        
        if (priceToUse) {
          this.updateAllPriceElements(priceToUse, comparePriceToUse);
        }
      }
    }
    
    // If no selection was restored, update price from whatever is selected in new DOM
    else {
      this.updatePriceFromSelected();
    }
  }
}

if (!customElements.get('packs-picker')) {
  customElements.define('packs-picker', PacksPicker);
}