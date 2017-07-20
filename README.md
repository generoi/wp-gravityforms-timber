# wp-gravityforms-timber

> A wordpress plugin to ease timber integration with Gravity Forms by suggesting twig templates and providing a JS layer to create submissions using the `gravityformsrestapi` plugin.

## Requirements

- [gravityformsrestapi](https://github.com/gravityforms/gravityformsrestapi)

## Features

- Provide `form.twig`, `form--ID.twig` template suggestions for all shortcode forms
- Provides a _Machine name_ setting for Gravity Form fields that can be used to fetch field meta easier than by ID
- Supports both Gravity Form endpoints as well as general WP REST endpoints.
- Provides inline field validation using Foundation markup.
- Provides an option on a per-form basis to disable the Timber integration and use core Gravity Form logic instead.

## Markup and Timber integration

The plugin does not come with any front-end, instead the theme should provide it. See [`generoi/sage`](https://github.com/generoi/sage/blob/genero/resources/views/forms/form.twig) for an example.

## Other REST endpoints

You can use the AJAX form submission feature on any WP REST API endpoint. If you set `data-ajax` it will be initialized automatically, otherwise you can initialize it yourself through the JS constructor.

```html
<form action="/wp-json/sage/v1/experiences" method="POST" data-ajax id="form--experiences">
  <!-- where error messages will be displayed (overridable) -->
  <div class="form__messages"></div>

  <p class="form__element">
    <label for="name">Name <span class="form-required">*</span></label>
    <input name="name" type="text" required>
  </p>
  <p class="form__element">
    <label for="email">Email <span class="form-required">*</span></label>
    <input name="email" type="email" required>
  </p>
  <input type="hidden" name="_wpnonce" value="{{fn('wp_create_nonce', 'wp_rest')}}">
  <input type="submit" value="Send">
</form>

<div class="form__confirmation is-hidden callout succcess">
  If available, this will be shown after the form has been submitted.
</div>

<script>
  // Alternative to the `form__confirmation` container, you can provide a JS
  // option specifying the confirmation action.
  window.formConfirmation = window.formConfirmation || {};
  window.formConfirmation['form--experiences'] = {
    // one of redirect|page|message
    'type': 'redirect',
    // where to redirect if `type` is set to `redirect` or `page`.
    'redirect': 'http://google.com',
    // Confirmation message to display (as an alternative to having it in the markup directly)
    'message': '<div class="callout">Success</div>'
  };
</script>
```

## Options

Options can be passed in various ways. You can:

1. Use the AjaxForm constructor directly

    ```js
    new WP_Gravityforms_Timber.AjaxForm(el, options)
    ```

2. Set options as data-arguments on the `<form>` element

    ```html
    <form data-recaptcha>
    ```

3. Filter the options through `gravityforms-timber/options` (see below).

## Filter API

```php
// Load recaptcha script.
add_filter('gravityforms-timber/options', function ($options) {
  $options['recaptcha'] = true;
});

/// Filter the template suggestions.
add_filter('gravityforms-timber/templates', function ($templates) {
  $templates[] = 'form--gform.twig';
  return $templates;
});
```
