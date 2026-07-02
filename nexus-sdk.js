/*!
 * Nexus SDK — by DevConnect
 * Trust & safety monitoring, 2 minutes d'intégration.
 *
 * Usage :
 *   <script src="https://cdn.jsdelivr.net/gh/VOTRE_ORG/nexus-sdk/nexus-sdk.min.js"></script>
 *   <script>
 *     Nexus.init('nx_live_VOTRE_CLE');
 *     Nexus.track('login_failed', { user_ref: 'user-42', severity: 'medium', details: { ip: '1.2.3.4' } });
 *   </script>
 *
 * Ou en module :
 *   import Nexus from 'nexus-sdk';
 *   Nexus.init('nx_live_...');
 */
(function (global) {
  'use strict';

  var DEFAULT_ENDPOINT = 'https://ekezdtageniidwjlgyys.supabase.co/functions/v1/nexus-ingest';

  var _apiKey = null;
  var _endpoint = DEFAULT_ENDPOINT;
  var _debug = false;
  var _defaultUserRef = null;

  function _warn() {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn.apply(console, ['[Nexus]'].concat(Array.prototype.slice.call(arguments)));
    }
  }
  function _log() {
    if (_debug && typeof console !== 'undefined' && console.log) {
      console.log.apply(console, ['[Nexus]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  /**
   * Initialise le SDK avec ta clé API de projet.
   * @param {string} apiKey - clé au format nx_live_xxx (Nexus > Paramètres > Projet & clé API)
   * @param {object} [opts]
   * @param {string} [opts.endpoint] - override de l'URL d'ingestion (avancé)
   * @param {string} [opts.userRef]  - identifiant par défaut attaché à chaque event si non précisé
   * @param {boolean} [opts.debug]  - logs console
   */
  function init(apiKey, opts) {
    opts = opts || {};
    if (!apiKey || typeof apiKey !== 'string' || apiKey.indexOf('nx_') !== 0) {
      _warn('init() attend une clé API valide (nx_live_... ou nx_test_...).');
    }
    _apiKey = apiKey;
    if (opts.endpoint) _endpoint = opts.endpoint;
    if (opts.userRef) _defaultUserRef = opts.userRef;
    _debug = !!opts.debug;
    _log('initialisé', { endpoint: _endpoint });
  }

  /**
   * Envoie un évènement à Nexus.
   * @param {string} eventType - ex: 'login_failed', 'spam_detected', 'signup', 'checkout_blocked'...
   * @param {object} [opts]
   * @param {string} [opts.user_ref]  - identifiant de l'utilisateur concerné
   * @param {'info'|'medium'|'high'|'critical'} [opts.severity] - défaut: laissé au moteur Nexus
   * @param {object} [opts.details]  - métadonnées libres (IP, contexte, payload...)
   * @returns {Promise<object>} résultat de l'ingestion ({ ok, remaining_quota } ou { error })
   */
  function track(eventType, opts) {
    opts = opts || {};
    if (!_apiKey) {
      _warn('Nexus.init(apiKey) doit être appelé avant track().');
      return Promise.resolve({ ok: false, error: 'not_initialized' });
    }
    if (!eventType) {
      _warn('track(eventType, ...) : eventType manquant.');
      return Promise.resolve({ ok: false, error: 'missing_event_type' });
    }

    var payload = {
      event_type: eventType,
      user_ref: opts.user_ref || _defaultUserRef || null,
      details: opts.details || {}
    };
    if (opts.severity) payload.severity = opts.severity;

    return fetch(_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Key': _apiKey
      },
      body: JSON.stringify(payload),
      keepalive: true // fiable même sur un unload de page
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok) {
            _warn('event rejeté (' + res.status + ')', json);
            return { ok: false, status: res.status, error: json.error || 'request_failed' };
          }
          _log('event envoyé', eventType, json);
          return Object.assign({ ok: true }, json);
        });
      })
      .catch(function (err) {
        _warn('échec réseau', err);
        return { ok: false, error: 'network_error' };
      });
  }

  /** Raccourci : identifie l'utilisateur courant pour les prochains track() sans le repréciser. */
  function identify(userRef) {
    _defaultUserRef = userRef || null;
  }

  var Nexus = { init: init, track: track, identify: identify };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Nexus;
  } else {
    global.Nexus = Nexus;
  }
})(typeof window !== 'undefined' ? window : this);
