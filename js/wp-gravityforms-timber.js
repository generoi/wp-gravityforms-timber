class AjaxForm {
  constructor(form, options = {}) {
    this.options = Object.assign(
      {
        recaptcha: false,
        messageSelector: '.form__messages',
        confirmationSelector: '.form__confirmation',
        elementSelector: '.form__element',
        honeypot: 'form-question-answer',
        honeypotMinDuration: 1000,
        showTopErrorMessage: true,
        language: 'en',
        l10n: {},
      },
      // options set through wp_localize_script.
      window.WP_Gravityforms_Timber,
      // options passed directly to the constructor.
      options,
      // options set through data-attributes.
      $(this.form).data()
    );

    this.form = form;
    this.id = this.form.id.replace('form--', '');
    this.$context = $(this.form);
    this.$submit = this.$context.find('input[type="submit"]');
    this.$messageContainer = this.$context.find(this.options.messageSelector);

    this.setStartTime(Date.now());
    // Load reCaptcha script.
    if (this.options.recaptcha) {
      this.loadRecaptcha();
    }
    // Submit handler
    this.$context.on('submit', this.submit.bind(this));
  }

  setStartTime(timestamp) {
    this.startTime = timestamp;
  }

  /**
   * Trigger the form submit.
   */
  submit() {
    if (this.formSubmitted) {
      return false;
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
        if (this.options.nonce) {
          xhr.setRequestHeader('X-WP-Nonce', this.options.nonce);
        }
      },
    })
      .done(this.done.bind(this))
      .fail(this.fail.bind(this));

    return false;
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
      this.$messageContainer
        .show()
        .removeClass('is-hidden')
        .html(`<p>${this.getErrorMessage(jqXHR)}</p>`);

      this.scrollTo(this.$messageContainer);
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
  applyConfirmation() {
    const confirmation =
      window.formConfirmation && window.formConfirmation[this.form.id];
    console.log(confirmation);

    // If a global JS variable defines the confirmation
    if (confirmation && confirmation.type) {
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
    } else {
      // If there's hidden confirmation message in the form.
      const $confirmation = this.$context
        .find(this.confirmationSelector)
        .show()
        .removeClass('is-hidden');

      this.$context.hide();
      this.scrollTo($confirmation);
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
    // Clean up old error classes and messages.
    this.$context
      .find('.is-invalid-label, .is-invalid-input')
      .removeClass('is-invalid-label')
      .removeClass('is-invalid-input');
    this.$context.find('.form-error').remove();

    if (jqXHR.responseJSON && jqXHR.responseJSON.data) {
      const data = jqXHR.responseJSON.data;
      if (data.params) {
        // List of invalid fields (required).
        if (Array.isArray(data.params)) {
          data.params.forEach(field => {
            this.setInputAsInvalid(field, data.message);
          });
        } else {
          // Object with invalid fields and their error message (invalid value).
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

  /**
   * Mark an input and it's label as invalid.
   */
  setInputAsInvalid(field, message) {
    const $field = this.$context.find(`[name="${field}"]`);
    const $label = this.$context.find(`label[for="${field}"]`);
    const $element = $label.closest(this.options.elementSelector);

    // Find all child labels and input fields, in some cases such as checkbox
    // lists with Gravityforms the field name doesn't match the labels.
    $element.find('label').addClass('is-invalid-label');
    $element.find('input').addClass('is-invalid-input');
    // Make sure the corretly referenced elements are marked as invalid.
    // Primarily for custom forms.
    $field.addClass('is-invalid-input');
    $label.addClass('is-invalid-label');

    if (message) {
      // Remove old inline error messages and add the current one.
      const html = `<span class="form-error is-visible">${message}</span>`;

      if (
        $field.is('[type=radio]') ||
        $field.is('[type=checkbox]') ||
        !$field.length
      ) {
        // If it's a checkbox or radio input, it's possible that the label
        // is positioned after the input. Alternatively in the case of
        // Gravityform checkbox lists, the field name doesn't match the labels.
        $element.append(html);
      } else {
        // As long as it's not a multiple list checkbox/radio, output directly
        // after the field
        $field.after(html);
      }
    }
  }

  /**
   * Return a translated error message to inform the user what went wrong.
   * @see src/custom/rest-experiences.php
   */
  getErrorMessage(jqXHR) {
    // REST API validation messages.
    if (jqXHR.responseJSON && jqXHR.responseJSON.code) {
      const response = jqXHR.responseJSON;
      const params = response.data.params;

      switch (response.code) {
        case 'rest_invalid_param':
        case 'rest_missing_callback_param':
          if (params.hasOwnProperty('g-recaptcha-response')) {
            return this.options.l10n.error_recaptcha;
          }
          return this.options.l10n.error_form_param;
      }
    }
    return this.options.l10n.error_form_general;
  }

  /**
   * Validate the honeypot if it exists.
   */
  validateHoneypot(value) {
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
    let language = this.options.language;
    language = language.replace(/^([a-z]{2})-([a-z]{2})/, '$2');

    $.ajax({
      url: `https://www.google.com/recaptcha/api.js?hl=${language}`,
      cache: true,
      dataType: 'script',
    });
  }
}

export default AjaxForm;
