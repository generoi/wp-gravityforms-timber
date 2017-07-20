!(function(t) {
  function e(i) {
    if (o[i]) return o[i].exports;
    var s = (o[i] = { i: i, l: !1, exports: {} });
    return t[i].call(s.exports, s, s.exports, e), (s.l = !0), s.exports;
  }
  var o = {};
  (e.m = t), (e.c = o), (e.d = function(t, o, i) {
    e.o(t, o) ||
      Object.defineProperty(t, o, { configurable: !1, enumerable: !0, get: i });
  }), (e.n = function(t) {
    var o =
      t && t.__esModule
        ? function() {
            return t.default;
          }
        : function() {
            return t;
          };
    return e.d(o, 'a', o), o;
  }), (e.o = function(t, e) {
    return Object.prototype.hasOwnProperty.call(t, e);
  }), (e.p = ''), e((e.s = 1));
})([
  function(t, e) {
    t.exports = jQuery;
  },
  function(t, e, o) {
    'use strict';
    Object.defineProperty(e, '__esModule', { value: !0 }), function(t) {
      var e = o(2),
        i = o(3);
      o.n(i).a.polyfill(), t('form[data-ajax]').each(function(t, o) {
        o.ajaxForm || (o.ajaxForm = new e.a(o, options));
      }), (window.WP_Gravityforms_Timber.AjaxForm = e.a);
    }.call(e, o(0));
  },
  function(t, e, o) {
    'use strict';
    (function(t) {
      var o = function(e, o) {
        void 0 === o && (o = {}), (this.options = Object.assign(
          {
            recaptcha: !1,
            messageSelector: '.form__messages',
            confirmationSelector: '.form__confirmation',
            elementSelector: '.form__element',
            honeypot: 'form-question-answer',
            honeypotMinDuration: 1e3,
            showTopErrorMessage: !0,
            language: 'en',
            l10n: {},
          },
          window.WP_Gravityforms_Timber,
          o,
          t(this.form).data()
        )), (this.form = e), (this.id = this.form.id.replace(
          'form--',
          ''
        )), (this.$context = t(this.form)), (this.$submit = this.$context.find(
          'input[type="submit"]'
        )), (this.$messageContainer = this.$context.find(
          this.options.messageSelector
        )), this.setStartTime(Date.now()), this.options.recaptcha &&
          this.loadRecaptcha(), this.$context.on(
          'submit',
          this.submit.bind(this)
        );
      };
      (o.prototype.setStartTime = function(t) {
        this.startTime = t;
      }), (o.prototype.submit = function() {
        var e = this;
        if (!this.formSubmitted) {
          (this.formSubmitted = !0), this.$submit
            .prop('disabled', 'disabled')
            .addClass('spinner');
          var o = new FormData(this.form);
          if (!this.validateHoneypot(o.get(this.options.honeypot)))
            throw new Error('Bot detection');
          o.delete(this.options.honeypot), t
            .ajax({
              url: this.form.action,
              method: (this.form.method || 'get').toUpperCase(),
              data: o,
              dataType: 'json',
              enctype: this.form.enctype,
              processData: !1,
              contentType: !1,
              beforeSend: function(t) {
                e.options.nonce &&
                  t.setRequestHeader('X-WP-Nonce', e.options.nonce);
              },
            })
            .done(this.done.bind(this))
            .fail(this.fail.bind(this));
        }
      }), (o.prototype.fail = function(t, e, o) {
        console.error(e + ': ' + o), this.$submit
          .removeProp('disabled')
          .removeClass(
            'spinner'
          ), (this.formSubmitted = !1), this.addInlineErrorMessages(t), this
          .options.showTopErrorMessage
          ? (
              this.$messageContainer
                .show()
                .removeClass('is-hidden')
                .html('<p>' + this.getErrorMessage(t) + '</p>'),
              this.scrollTo(this.$messageContainer)
            )
          : this.scrollTo(
              this.$context.find('.is-invalid-label').first()
            ), window.grecaptcha && window.grecaptcha.reset();
      }), (o.prototype.done = function(t, e, o) {
        if (t.hasOwnProperty('is_valid') && !t.is_valid)
          return this.fail(o, e, 'ValidationFailure');
        var i = this.$context.data();
        i.generoAnalytics && i.category && window.Gevent
          ? window.Gevent(
              i.category,
              'Confirmation',
              i.label,
              this.applyConfirmation.bind(this)
            )
          : this.applyConfirmation();
      }), (o.prototype.applyConfirmation = function() {
        var t =
          window.formConfirmation && window.formConfirmation[this.form.id];
        if ((console.log(t), t && t.type))
          switch (t.type) {
            case 'page':
            case 'redirect':
              window.location = t.redirect;
              break;
            case 'message':
              this.$context.html(t.html), this.scrollTo(this.$context);
          }
        else {
          var e = this.$context
            .find(this.confirmationSelector)
            .show()
            .removeClass('is-hidden');
          this.$context.hide(), this.scrollTo(e);
        }
      }), (o.prototype.scrollTo = function(e) {
        t.scrollTo &&
          t.scrollTo(e, { offset: { top: -150, left: 0 }, duration: 200 });
      }), (o.prototype.addInlineErrorMessages = function(t) {
        var e = this;
        if (
          (
            this.$context
              .find('.is-invalid-label, .is-invalid-input')
              .removeClass('is-invalid-label')
              .removeClass('is-invalid-input'),
            this.$context.find('.form-error').remove(),
            t.responseJSON && t.responseJSON.data
          )
        ) {
          var o = t.responseJSON.data;
          o.params &&
            (Array.isArray(o.params)
              ? o.params.forEach(function(t) {
                  e.setInputAsInvalid(t, o.message);
                })
              : Object.keys(o.params).forEach(function(t) {
                  e.setInputAsInvalid(t, o.params[t]);
                }));
        }
        if (t.responseJSON && t.responseJSON.validation_messages) {
          var i = t.responseJSON.validation_messages;
          Object.keys(i).forEach(function(t) {
            e.setInputAsInvalid('input_' + t, i[t]);
          });
        }
      }), (o.prototype.setInputAsInvalid = function(t, e) {
        var o = this.$context.find('[name="' + t + '"]'),
          i = this.$context.find('label[for="' + t + '"]'),
          s = i.closest(this.options.elementSelector);
        if (
          (
            s.find('label').addClass('is-invalid-label'),
            s.find('input').addClass('is-invalid-input'),
            o.addClass('is-invalid-input'),
            i.addClass('is-invalid-label'),
            e
          )
        ) {
          var n = '<span class="form-error is-visible">' + e + '</span>';
          o.is('[type=radio]') || o.is('[type=checkbox]') || !o.length
            ? s.append(n)
            : o.after(n);
        }
      }), (o.prototype.getErrorMessage = function(t) {
        if (t.responseJSON && t.responseJSON.code) {
          var e = t.responseJSON,
            o = e.data.params;
          switch (e.code) {
            case 'rest_invalid_param':
            case 'rest_missing_callback_param':
              return o.hasOwnProperty('g-recaptcha-response')
                ? this.options.l10n.error_recaptcha
                : this.options.l10n.error_form_param;
          }
        }
        return this.options.l10n.error_form_general;
      }), (o.prototype.validateHoneypot = function(t) {
        return (
          !t &&
          !(this.startTime + this.options.honeypotMinDuration > Date.now())
        );
      }), (o.prototype.loadRecaptcha = function() {
        var e = this.options.language;
        (e = e.replace(/^([a-z]{2})-([a-z]{2})/, '$2')), t.ajax({
          url: 'https://www.google.com/recaptcha/api.js?hl=' + e,
          cache: !0,
          dataType: 'script',
        });
      }), (e.a = o);
    }.call(e, o(0)));
  },
  function(t, e, o) {
    'use strict';
    function i(t, e) {
      if (void 0 === t || null === t)
        throw new TypeError('Cannot convert first argument to object');
      for (var o = Object(t), i = 1; i < arguments.length; i++) {
        var s = arguments[i];
        if (void 0 !== s && null !== s)
          for (
            var n = Object.keys(Object(s)), r = 0, a = n.length;
            r < a;
            r++
          ) {
            var c = n[r],
              l = Object.getOwnPropertyDescriptor(s, c);
            void 0 !== l && l.enumerable && (o[c] = s[c]);
          }
      }
      return o;
    }
    function s() {
      Object.assign ||
        Object.defineProperty(Object, 'assign', {
          enumerable: !1,
          configurable: !0,
          writable: !0,
          value: i,
        });
    }
    t.exports = { assign: i, polyfill: s };
  },
]);
//# sourceMappingURL=wp-gravityforms-timber.js.map
