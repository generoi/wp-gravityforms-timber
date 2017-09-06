<?php
/*
Plugin Name:        Gravity Forms Timber
Plugin URI:         http://genero.fi
Description:        Some Timber integrations for Gravity Forms.
Version:            0.0.1
Author:             Genero
Author URI:         http://genero.fi/
License:            MIT License
License URI:        http://opensource.org/licenses/MIT
*/

if (!defined('ABSPATH')) {
  exit;
}

class WP_Gravityforms_Timber
{

    private static $instance = null;
    public $version = '1.0.0';

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    protected $gform_form_args = [];
    protected $gform_validation_messages = [];

    public function init()
    {
        register_activation_hook(__FILE__, [__CLASS__, 'activate']);

        add_filter('gform_form_settings', [$this, 'form_settings'], 10, 2);
        add_filter('gform_pre_form_settings_save', [$this, 'form_settings_save'], 10, 2);
        add_filter('gform_get_form_filter', [$this, 'get_form'], 10, 2);
        add_filter('gform_form_args', [$this, 'save_form_args'], 10, 1);
        add_action('gform_field_standard_settings', [$this, 'field_general_settings'], 10, 2);
        add_action('gform_editor_js', [$this, 'editor_js']);
        add_action('wp_enqueue_scripts', [$this, 'register_scripts']);
        add_action('timber/twig', [$this, 'twig']);
    }

    public function register_scripts() {
        $path = plugin_dir_url(__FILE__);
        wp_register_script('wp-gravityforms-timber/js', $path . 'dist/wp-gravityforms-timber.js', ['jquery'], $this->version, true);

        $options = apply_filters('gravityforms-timber/options', [
            'language' => get_locale(),
            'honeypot' => 'form-question-answer',
            'l10n' => [
                'error_recaptcha' => __('The CAPTCHA challenge did not validate', 'wp-gravtyforms-timber'),
                'error_form_param' => __('There was a problem with your submitted data, please verify your fields.', 'wp-gravityforms-timber'),
                'error_form_general' => __('Something went wrong. Your form could not be submitted.', 'wp-gravityforms-timber'),
            ],
        ]);
        wp_localize_script('wp-gravityforms-timber/js', 'WP_Gravityforms_Timber', $options);
    }

    /**
     * Attach a Form settings option to disable twig templating.
     */
    public function form_settings($settings, $form) {
        $settings['Timber']['timber_disable'] = '
            <tr>
            <th><label for="timber_disable">' . __('Disable timber template and use core Gravityform functionality', 'wp-gravityforms-timber') . '</label></th>
            <td><input type="checkbox" value="1"' . (!empty($form['timber_disable']) ? ' checked' : '') . ' name="timber_disable"></td>
            </tr>
        ';
        return $settings;
    }

    /**
     * Save custom Form settings.
     */
    public function form_settings_save($form) {
        $form['timber_disable'] = rgpost('timber_disable');
        return $form;
    }

    /**
     * Attach settings to General settings section of a Field.
     */
    public function field_general_settings($position, $form_id) {
        if ($position == 10) {
            ?>
            <li class="machine_name_setting field_setting">
                <label for="field_machine_name" class="section_label">
                    <?php _e('Machine name', 'gravityforms'); ?>
                    <a href="#" onclick="return false;" onkeypress="return false;" class="gf_tooltip tooltip tooltip_form_field_label" title="<h6>Machine name</h6>Enter the machine name of the form field. This can be used when referencing the field in code."><i class="fa fa-question-circle"></i></a>
                </label>
                <input type="text" id="field_machine_name" class="fieldwidth-3" />
            </li>
            <?php
        }
    }

    /**
     * Process the new settings added to Fields.
     * @see field_general_settings().
     */
    public function editor_js() {
        ?>
        <script>
            fieldSettings.text += ', .machine_name_setting';

            jQuery('#field_machine_name').on('input propertychange', function(){
                SetFieldProperty('machineName', this.value);
            });
            jQuery(document).bind('gform_load_field_settings', function(event, field, form) {
                jQuery('#field_machine_name').val(field.machineName);
            });
        </script>
        <?php
    }

    /**
     * Render forms with twig.
     */
    public function get_form($form_string, $form)
    {
        if (!empty($form['timber_disable'])) {
            return $form_string;
        }

        array_map([__CLASS__, 'prepopulate_field'], $form['fields']);

        $args = $this->get_form_args($form['id']);
        $context['form'] = $form;
        $context['form_id'] = $form['id'];
        $context['form_title'] = !empty($args['display_title']) ? $form['title'] : false;
        $context['form_description'] = !empty($args['display_description']) ? $form['description'] : false;

        $templates = [
            'form--' . sanitize_html_class($form['title']) . '.twig',
            'form--' . sanitize_html_class($form['title']) . '.php',
            'form--' . $form['id'] . '.twig',
            'form--' . $form['id'] . '.php',
            'form.twig',
            'form.php',
        ];
        $templates = apply_filters('gravityforms-timber/templates', array_merge($templates, array_map(function ($template) {
            return 'forms/' . $template;
        }, $templates)));

        $html = Timber::fetch($templates, $context);

        if (!$html) {
            return $form_string;
        }

        wp_enqueue_script('wp-gravityforms-timber/js');

        return $html;
    }

    /**
    * Store the arguments passed by shortcode attributes and inject them again
    * in `gform_get_form_filter`.
    */
    public function save_form_args($args)
    {
        $form_id = $args['form_id'];
        $this->gform_form_args[$form_id] = $args;
        return $args;
    }

    /**
     * Retrieve the arguments passed by shortcode attribtues.
     */
    protected function get_form_args($form_id)
    {
        return $this->gform_form_args[$form_id];
    }

    public function twig($twig)
    {
        $twig->addFunction(new Timber\Twig_Function('gform_field', [__CLASS__, 'gform_field']));
        $twig->addFunction(new Timber\Twig_Function('gform', [__CLASS__, 'gform']));
        return $twig;
    }

    public static function gform_field($machine_name, $form_id)
    {
        $form = GFFormsModel::get_form_meta($form_id);
        if (!isset($form['fields'])) {
            return 'form-not-found';
        }
        $field = wp_list_filter($form['fields'], ['machineName' => $machine_name]);
        if (empty($field)) {
            return 'field-not-found';
        }

        $field = reset($field);
        self::prepopulate_field($field);

        return $field;
    }

    /**
     * Get the form model.
     *
     * @param int $form_id
     * @return array
     */
    public static function gform($form_id)
    {
        $form = GFFormsModel::get_form_meta($form_id);
        array_map([__CLASS__, 'prepopulate_field'], $form['fields']);
        return $form;
    }

    /**
     * Prepopulate default values based on Gravity form hooks.
     *
     * @param GF_Field $field
     */
    public static function prepopulate_field($field)
    {
        if ($field->allowsPrepopulate) {
            $field_values = [];
            $input_type = $field->get_input_type();

            if (in_array($input_type, ['checkbox', 'radio'])) {
                $field_val = RGFormsModel::get_parameter_value($field->inputName, $field_values, $field);
                if (!is_array($field_val)) {
                    $field_val = explode(',', $field_val);
                }

                foreach ($field_val as $val) {
                    foreach ($field->choices as $idx => $choice) {
                        if ($choice['value'] === trim($val)) {
                            $field->choices[$idx]['isSelected'] = TRUE;
                        }
                    }
                }
            } else {
                $field->defaultValue = RGFormsModel::get_parameter_value($field->inputName, $field_values, $field);
            }
        }
    }

    /**
     * Ensure required plugins are available.
     */
    public static function activate()
    {
        if (!is_plugin_active('gravityformsrestapi/restapi.php') && current_user_can('activate_plugins')) {
            wp_die('Sorry, but this plugin requires the Gravity Forms REST API plugin to be installed and active. <br><a href="' . admin_url('plugins.php') . '">&laquo; Return to Plugins</a>');
        }
    }
}

WP_Gravityforms_Timber::get_instance()->init();
