# Release Notes - Version 3.2.0

This release adds five new sections, a comparison slider block, and expanded product settings. It also features significant performance improvements and various bug fixes across the theme.

## What's Changed

### Added

- [Product] Added support for volume pricing
- [Product] Added width setting for Review stars
- [Product] Thumbnail pagination option for mobile product galleries
- [Product] New SKU block
- [Product] Added "sticky add to cart" feature
- [New section] Carousel section
- [New section] Featured product
- [New section] Quick order list
- [New section] Product hotspots
- [New block] Comparison slider
- [Recommended products] New settings: color scheme, corner radius, horizontal padding
- [Custom section] New image compare preset
- [Password] Added support to show message to visitors

### Changed

- [Header] Updated logged in account icon size
- [Product card] Quick Add button now reads "Choose" instead of "Add" when a product has several variants
- [Slideshow] Refinements, new preset
- [Product] Added to cart animations
- [Footer] Updated layout

### Fixes and improvements

- [Accordion] Icons now match theme text color
- [Announcement] Added default text style
- [Carousel] Included text and made a more attractive default state
- [Cart] Updating the quantity in the cart no longer triggers extra requests
- [Cart] Fixed count disappearing when using browser back button
- [Collections] Product count communicates "more than" when 25,000 platform limit is reached
- [Collections] Fixed specific cases of the mobile keyboard opening automatically when opening filters
- [Collections] Removed color overrides from "Clear all" button in filters
- [Collections] Improved filter hover states
- [Collections] Fixed "Sort By" filter on mobile
- [Search] Show most relevant variant image in search results
- [Collections] Quick-add will prioritize in-stock variants on page load
- [Footer] Copyright text content wraps to stay in viewport
- [Header] Fixed incorrect height on header dropdown
- [Product] Fixed variant picker on iOS devices
- [Product] Improved Quick add modal
- [Performance] Various updates to account for increased product variant limits
- [Performance] Faster style recalculations across multiple components
- [Performance] Improved css selectors for better performance
- [Performance] Prefetch search page URL on clear button hover
- [Text] Fixed word break and overflowing text not being visible in some cases
