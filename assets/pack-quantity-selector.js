import { Component } from '@theme/component';
import { QuantitySelectorUpdateEvent } from '@theme/events';

/**
 * A custom element that allows the user to select a quantity within a pack picker.
 *
 * @typedef {Object} Refs
 * @property {HTMLInputElement} quantityInput
 * @property {HTMLButtonElement} minusButton
 * @property {HTMLButtonElement} plusButton
 *
 * @extends {Component<Refs>}
 */
export class PackSelectorComponent extends Component {
  requiredRefs = ['quantityInput', 'minusButton', 'plusButton'];
  serverDisabledMinus = false;
  serverDisabledPlus = false;
  initialized = false;

  connectedCallback() {
    super.connectedCallback();

    // Capture server-disabled state on first load
    const { minusButton, plusButton } = this.refs;

    if (minusButton.disabled) {
      this.serverDisabledMinus = true;
    }
    if (plusButton.disabled) {
      this.serverDisabledPlus = true;
    }

    this.initialized = true;
    this.updateButtonStates();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  /**
   * Gets the parent pack picker element
   * @returns {HTMLElement | null} The parent pack-picker or null
   */
  getPackPicker() {
    return this.closest('pack-picker');
  }

  /**
   * Gets the pack limit from the parent pack-picker
   * @returns {number | null} The pack limit or null if no limit
   */
  getPackLimit() {
    const packPicker = this.getPackPicker();
    if (!packPicker) return null;
    
    const limit = packPicker.dataset.limit;
    return limit ? parseInt(limit) : null;
  }

  /**
   * Gets the current total quantity across all selectors in the pack
   * @returns {number} The total quantity
   */
  getTotalPackQuantity() {
    const packPicker = this.getPackPicker();
    if (!packPicker) return 0;

    let total = 0;
    const selectors = packPicker.querySelectorAll('pack-selector-component');
    
    selectors.forEach(selector => {
      if (selector instanceof PackSelectorComponent) {
        total += selector.getCurrentValues().value;
      }
    });

    return total;
  }

  /**
   * Gets the current quantity value
   * @returns {string} The current value
   */
  getValue() {
    return this.refs.quantityInput.value;
  }

  /**
   * Sets the current quantity value
   * @param {string} value - The value to set
   */
  setValue(value) {
    this.refs.quantityInput.value = value;
    this.updateButtonStates();
  }

  /**
   * Updates min/max/step constraints and snaps value to valid increment
   * @param {string} min - Minimum value
   * @param {string|null} max - Maximum value (null if no max)
   * @param {string} step - Step increment
   */
  updateConstraints(min, max, step) {
    const { quantityInput } = this.refs;
    const currentValue = parseInt(quantityInput.value) || 0;

    quantityInput.min = min;
    if (max) {
      quantityInput.max = max;
    } else {
      quantityInput.removeAttribute('max');
    }
    quantityInput.step = step;

    const newMin = min === '' ? 1 : parseInt(min);
    const newStep = parseInt(step) || 1;
    const effectiveMax = this.getEffectiveMax();

    // Snap to valid increment if not already aligned
    let newValue = currentValue;
    if ((currentValue - newMin) % newStep !== 0) {
      // Snap DOWN to closest valid increment
      newValue = newMin + Math.floor((currentValue - newMin) / newStep) * newStep;
    }

    // Ensure value is within bounds
    newValue = Math.max(newMin, Math.min(effectiveMax ?? Infinity, newValue));

    if (newValue !== currentValue) {
      quantityInput.value = newValue.toString();
    }

    this.updateButtonStates();
  }

  /**
   * Gets current values from DOM (fresh read every time)
   * @returns {{min: number, max: number|null, step: number, value: number}}
   */
  getCurrentValues() {
    const { quantityInput } = this.refs;
    return {
      min: quantityInput.min === '' ? 1 : parseInt(quantityInput.min),
      max: quantityInput.max ? parseInt(quantityInput.max) : null,
      step: parseInt(quantityInput.step) || 1,
      value: parseInt(quantityInput.value) || 0,
    };
  }

  /**
   * Gets the effective maximum value for this quantity selector
   * Considers both the individual max and the pack limit
   * @returns {number | null} The effective max, or null if no max
   */
  getEffectiveMax() {
    const { max, value } = this.getCurrentValues();
    const packLimit = this.getPackLimit();
    const totalPackQuantity = this.getTotalPackQuantity();

    if (max === null && packLimit === null) return null;

    let effectiveMax = max;
    
    if (packLimit !== null) {
      // Calculate how many more items can be added to this selector
      // based on the pack limit and current total
      const remainingInPack = packLimit - (totalPackQuantity - value);
      effectiveMax = effectiveMax !== null ? 
        Math.min(effectiveMax, remainingInPack) : 
        remainingInPack;
    }

    return effectiveMax;
  }

  /**
   * Updates button states based on current value, limits, and pack constraints
   */
  updateButtonStates() {
    const { minusButton, plusButton } = this.refs;
    const { min, value } = this.getCurrentValues();
    const effectiveMax = this.getEffectiveMax();
    const packLimit = this.getPackLimit();
    const totalPackQuantity = this.getTotalPackQuantity();

    // Only manage buttons that weren't server-disabled
    if (!this.serverDisabledMinus) {
      minusButton.disabled = value <= min;
    }

    if (!this.serverDisabledPlus) {
      // Disable plus button if:
      // 1. We have an effective max and we're at or above it
      // 2. OR pack is full (total quantity >= pack limit)
      const atIndividualMax = effectiveMax !== null && value >= effectiveMax;
      const packFull = packLimit !== null && totalPackQuantity >= packLimit;
      
      plusButton.disabled = atIndividualMax || packFull;
    }
  }

  /**
   * Updates quantity by a given step
   * @param {number} stepMultiplier - Positive for increase, negative for decrease
   */
  updateQuantity(stepMultiplier) {
    const { quantityInput } = this.refs;
    const { min, step, value } = this.getCurrentValues();
    const effectiveMax = this.getEffectiveMax();

    const newValue = Math.min(
      effectiveMax ?? Infinity,
      Math.max(min, value + step * stepMultiplier)
    );

    quantityInput.value = newValue.toString();
    this.onQuantityChange();
    this.updateButtonStates();
  }

  /**
   * Handles the quantity increase event.
   * @param {Event} event - The event.
   */
  increaseQuantity(event) {
    if (!(event.target instanceof HTMLElement)) return;
    event.preventDefault();
    this.updateQuantity(1);
  }

  /**
   * Handles the quantity decrease event.
   * @param {Event} event - The event.
   */
  decreaseQuantity(event) {
    if (!(event.target instanceof HTMLElement)) return;
    event.preventDefault();
    this.updateQuantity(-1);
  }

  /**
   * When our input gets focused, we want to fully select the value.
   * @param {FocusEvent} event
   */
  selectInputValue(event) {
    const { quantityInput } = this.refs;
    if (!(event.target instanceof HTMLInputElement) || document.activeElement !== quantityInput) return;

    quantityInput.select();
  }

  /**
   * Handles the quantity set event (on blur).
   * Validates and snaps to valid values.
   * @param {Event} event - The event.
   */
  setQuantity(event) {
    if (!(event.target instanceof HTMLInputElement)) return;

    event.preventDefault();
    const { quantityInput } = this.refs;
    const { min, step } = this.getCurrentValues();
    const effectiveMax = this.getEffectiveMax();

    // Snap to bounds
    const quantity = Math.min(
      effectiveMax ?? Infinity,
      Math.max(min, parseInt(event.target.value) || 0)
    );

    // Validate step increment
    if ((quantity - min) % step !== 0) {
      // Set the invalid value and trigger native HTML validation
      quantityInput.value = quantity.toString();
      quantityInput.reportValidity();
      return;
    }

    quantityInput.value = quantity.toString();
    this.onQuantityChange();
    this.updateButtonStates();
  }

  /**
   * Handles the quantity change event.
   */
  onQuantityChange() {
    const { quantityInput } = this.refs;
    const newValue = parseInt(quantityInput.value);

    quantityInput.dispatchEvent(new QuantitySelectorUpdateEvent(newValue, Number(quantityInput.dataset.line)));

    // Update all other selectors in the same pack to reflect new totals
    this.updateAllPackSelectors();
  }

  /**
   * Updates all selectors in the same pack to reflect new button states
   */
  updateAllPackSelectors() {
    const packPicker = this.getPackPicker();
    if (!packPicker) return;

    const selectors = packPicker.querySelectorAll('pack-selector-component');
    
    selectors.forEach(selector => {
      if (selector instanceof PackSelectorComponent && selector !== this) {
        selector.updateButtonStates();
      }
    });
  }

  /**
   * Gets the quantity input.
   * @returns {HTMLInputElement} The quantity input.
   */
  get quantityInput() {
    if (!this.refs.quantityInput) {
      throw new Error('Missing <input ref="quantityInput" /> inside <pack-selector-component />');
    }

    return this.refs.quantityInput;
  }
}

if (!customElements.get('pack-selector-component')) {
  customElements.define('pack-selector-component', PackSelectorComponent);
}