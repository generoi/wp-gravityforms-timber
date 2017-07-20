import objectAssign from 'es6-object-assign';

objectAssign.polyfill();

class AjaxForm {
  constructor(form, options = {}) {
    this.options = Object.assign(
      {
        recaptcha: false,
        errorMessageSelector: '.form-error-message',
        honeypot: 'form-question-answer',
        honeypotMinDuration: 1000,
        showTopErrorMessage: true,
      },
      options
    );

    this.form = form;
    this.id = this.form.id.replace('form--', '');
    this.$context = $(this.form);
    this.$submit = this.$context.find('input[type="submit"]');
    this.$errorMessageContainer = this.$context.find(
      this.options.errorMessageSelector
    );
    this.confirmation = window.formConfirmation[this.form.id];

    this.setStartTime(Date.now());
    // Load reCaptcha script.
    if (this.options.recaptcha) {
      this.loadRecaptcha();
    }
  }

  setStartTime(timestamp) {
    this.startTime = timestamp;
  }

  /**
   * Trigger the form submit.
   */
  submit() {
    if (this.formSubmitted) {
      return;
    }
    this.formSubmitted = true;

    this.$submit.prop('disabled', 'disabled').addClass('spinner');

    const formData = new FormData(this.form);
    if (!this.validateHoneypot(formData.get(this.options.honeypot))) {
      throw new Error('Bot detection');
    } else {
      formData.delete(this.options.honeypot);
    }

    $.ajax({
      url: this.form.action,
      method: (this.form.method || 'get').toUpperCase(),
      data: formData,
      dataType: 'json',
      enctype: this.form.enctype,
      processData: false,
      contentType: false,
      beforeSend: xhr => {
        if (window.Sage.nonce) {
          xhr.setRequestHeader('X-WP-Nonce', window.Sage.nonce);
        }
      },
    })
      .done(this.done.bind(this))
      .fail(this.fail.bind(this));
  }

  /**
   * Failure handler.
   */
  fail(jqXHR, textStatus, errorThrown) {
    console.error(`${textStatus}: ${errorThrown}`);

    this.$submit.removeProp('disabled').removeClass('spinner');
    this.formSubmitted = false;

    this.addInlineErrorMessages(jqXHR);

    if (this.options.showTopErrorMessage) {
      this.$errorMessageContainer
        .show()
        .removeClass('is-hidden')
        .html(`<p>${this.getErrorMessage(jqXHR)}</p>`);

      this.scrollTo(this.$errorMessageContainer);
    } else {
      this.scrollTo(this.$context.find('.is-invalid-label').first());
    }

    // Re-init reCaptcha.
    if (window.grecaptcha) {
      window.grecaptcha.reset();
    }
  }

  /**
   * Success handler.
   */
  done(data, textStatus, jqXHR) {
    // Gravityform returns a 200 status code
    if (data.hasOwnProperty('is_valid') && !data.is_valid) {
      return this.fail(jqXHR, textStatus, 'ValidationFailure');
    }
    const dataAttributes = this.$context.data();
    const hasAnalytics =
      dataAttributes.generoAnalytics && dataAttributes.category;

    if (hasAnalytics && window.Gevent) {
      window.Gevent(
        dataAttributes.category,
        'Confirmation',
        dataAttributes.label,
        this.applyConfirmation.bind(this)
      );
    } else {
      this.applyConfirmation();
    }
  }

  /**
   * Apply the confirmation action
   */
  applyConfirmation(confirmation = this.confirmation) {
    switch (confirmation.type) {
      case 'page':
      case 'redirect':
        window.location = confirmation.redirect;
        break;
      case 'message':
        this.$context.html(confirmation.html);

        this.scrollTo(this.$context);
        break;
    }
  }

  scrollTo(target) {
    if ($.scrollTo) {
      $.scrollTo(target, {
        offset: { top: -150, left: 0 },
        duration: 200,
      });
    }
  }

  /**
   * Display inline error messages next to form elements.
   */
  addInlineErrorMessages(jqXHR) {
    // Clean up old error classes.
    this.$context
      .find('.is-invalid-label, .is-invalid-input')
      .removeClass('is-invalid-label')
      .removeClass('is-invalid-input');

    if (jqXHR.responseJSON && jqXHR.responseJSON.data) {
      const data = jqXHR.responseJSON.data;
      if (data.params) {
        // List of invalid fields (required).
        if (Array.isArray(data.params)) {
          data.params.forEach(field => {
            this.setInputAsInvalid(field, data.message);
          });
          // Object with invalid fields and their error message (invalid value).
        } else {
          Object.keys(data.params).forEach(field => {
            this.setInputAsInvalid(field, data.params[field]);
          });
        }
      }
    }

    // Gravityform structure
    if (jqXHR.responseJSON && jqXHR.responseJSON.validation_messages) {
      const messages = jqXHR.responseJSON.validation_messages;
      Object.keys(messages).forEach(field => {
        this.setInputAsInvalid(`input_${field}`, messages[field]);
      });
    }
  }

  setInputAsInvalid(field, message) {
    const $field = this.$context.find(`[name="${field}"]`);
    const $label = this.$context.find(`label[for="${field}"]`);
    $field.addClass('is-invalid-input');
    $label.addClass('is-invalid-label');
    if (
      message &&
      $field.not('[type=radio]') &&
      $field.not('[type=checkbox]')
    ) {
      $field.after(`<span class="form-error is-visible">${message}</span>`);
    }
  }

  /**
   * Return a translated error message to inform the user what went wrong.
   * @see src/custom/rest-experiences.php
   */
  getErrorMessage(jqXHR) {
    if (jqXHR.responseJSON && jqXHR.responseJSON.code) {
      const response = jqXHR.responseJSON;
      const params = response.data.params;

      switch (response.code) {
        case 'rest_invalid_param':
        case 'rest_missing_callback_param':
          if (params.hasOwnProperty('g-recaptcha-response')) {
            return window.Sage.l10n.error_recaptcha;
          }
          if (
            params.hasOwnProperty('form_id') ||
            params.hasOwnProperty('_wpnonce')
          ) {
            console.error('internal fields are missing');
            console.error(params);
            break;
          }
          return window.Sage.l10n.error_form_param;
      }
    }
    return window.Sage.l10n.error_form_general;
  }

  validateHoneypot(value) {
    console.log(value);
    if (value) {
      return false;
    }
    if (this.startTime + this.options.honeypotMinDuration > Date.now()) {
      return false;
    }
    return true;
  }

  /**
   * Load reCaptcha in the users language.
   */
  loadRecaptcha() {
    let language = window.Sage.language || 'en';
    language = language.replace(/^([a-z]{2})-([a-z]{2})/, '$2');

    $.ajax({
      url: `https://www.google.com/recaptcha/api.js?hl=${language}`,
      cache: true,
      dataType: 'script',
    });
  }
}

export default function(selector = 'form[data-ajax]', options = {}) {
  const currentTime = Date.now();

  $(selector).each((i, el) => {
    if (!el.ajaxForm) {
      el.ajaxForm = new AjaxForm(el, options);
    }
  });

  $(document).on('submit', selector, e => {
    const form = e.target;
    if (!form.ajaxForm) {
      form.ajaxForm = new AjaxForm(form, options);
      form.ajaxForm.setStartTime(currentTime);
    }

    form.ajaxForm.submit();
    return false;
  });
}
