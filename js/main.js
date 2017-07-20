import AjaxForm from './wp-gravityforms-timber';
import objectAssign from 'es6-object-assign';

objectAssign.polyfill();

$('form[data-ajax]').each((i, el) => {
  if (!el.ajaxForm) {
    el.ajaxForm = new AjaxForm(el, options);
  }
});

// Expose so other forms can use it.
window.WP_Gravityforms_Timber.AjaxForm = AjaxForm;
