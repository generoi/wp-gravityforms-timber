import AjaxForm from './ajax-form';
import objectAssign from 'es6-object-assign';

objectAssign.polyfill();

$(document).on('ready', () => {
  $('form[data-ajax]').each((i, el) => {
    if (!el.ajaxForm) {
      el.ajaxForm = new AjaxForm(el);
    }
  });
});

// Expose so other forms can use it.
window.WP_Gravityforms_Timber.AjaxForm = AjaxForm;
