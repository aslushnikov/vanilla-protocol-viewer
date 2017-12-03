let PROTOCOLS = {
  'browser_protocol.json':  'https://cdn.rawgit.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json',
  'js_protocol.json':  'https://cdn.rawgit.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json',
};

document.addEventListener('DOMContentLoaded', () => {
  let sidebar = document.getElementById('sidebar');
  let content = document.getElementById('content');

  window.app = new App(sidebar, content);
});

class App {
  /**
   * @param {!Element} sidebarElement
   * @param {!Element} contentElement
   */
  constructor(sidebarElement, contentElement) {
    this._sidebarElement = sidebarElement;
    this._contentElement = contentElement;
    /** @type {!Map<string, !Object>} */
    this._domains = new Map();
    /** @type {!Map<string, !Object>} */
    this._allDomains = new Map();
    /** @type {!Map<string, !Object>} */
    this._stableDomains = new Map();
    this._search = new Search(document.getElementById('search'), document.getElementById('sresults'));
    this._protocolRenderer = new ProtocolRenderer();
    this._router = new Router(route => this._renderError);
    this._router.setRoute(/^(\w+)(?:\.(\w+))?$/, (route, domain, method) => this._onNavigateDomain(route, domain, method));
    this._router.setRoute(/^$/, this._onNavigateHome.bind(this));
    this._initialize();

    let homeButton = document.querySelector('.home');
    homeButton.addEventListener('click', event => {
      event.consume();
      this._router.navigate('');
    }, false);
  }

  focusContent() {
    this._contentElement.focus();
  }

  /**
   * @param {string} route
   */
  navigate(route) {
    this._router.navigate(route);
  }

  static _nameProperty(collectionName) {
    switch (collectionName) {
      case 'domains':
        return 'domain';
      case 'types':
        return 'id';
      case 'commands':
      case 'events':
      case 'parameters':
      case 'returns':
        return 'name';
    }
    return null;
  }

  /**
   * @param {*} object
   * @param {boolean} alreadyExperimental
   */
  static _normalize(object, alreadyExperimental) {
    if (typeof object !== 'object')
      return object;
    const result = {};
    if (alreadyExperimental && object.experimental)
      delete object.experimental;
    for (let key in object) {
      let value = object[key];
      if (value instanceof Array) {
        result[key] = value.map(item => App._normalize(item, alreadyExperimental || object.experimental));
        let property = App._nameProperty(key);
        if (property !== null) {
          result[key].sort((a, b) => {
            if (a.experimental !== b.experimental)
              return a.experimental ? 1 : -1;
            if (a.deprecated !== b.deprecated)
              return a.deprecated ? 1 : -1;
            if (a.optional !== b.optional)
              return a.optional ? 1 : -1;
            if (!property)
              return 0;
            return a[property].localeCompare(b[property]);
          });
        }
      } else {
        result[key] = App._normalize(value, alreadyExperimental || object.experimental);
      }
    }
    return result;
  }

  /**
   * @param {*} object
   */
  static _stabilize(object) {
    if (typeof object !== 'object')
      return object;

    const result = {};
    for (let key in object) {
      let value = object[key];
      if (value instanceof Array)
        result[key] = value.filter(item => item.experimental !== true).map(App._stabilize);
      else
        result[key] = App._stabilize(value);
    }
    return result;
  }

  async _initialize() {
    let protocols = await Promise.all(Object.values(PROTOCOLS).map(url => fetch(url).then(r => r.json())));

    this._allDomains.clear();
    this._stableDomains.clear();

    let protocol = App._normalize({domains: [].concat(...protocols.map(p => p.domains))});
    for (let domain of protocol.domains) {
      this._allDomains.set(domain.domain, domain);
      if (!domain.experimental)
        this._stableDomains.set(domain.domain, App._stabilize(domain));
    }

    document.body.classList.toggle('experimental-enabled', window.localStorage['experimental'] !== 'false');
    document.getElementById('experimental').addEventListener('click', () => {
      window.localStorage['experimental'] = window.localStorage['experimental'] === 'false' ? 'true' : 'false';
      document.body.classList.toggle('experimental-enabled', window.localStorage['experimental'] !== 'false');
      this._renderDomains();
    });

    this._renderDomains();
  }

  _renderDomains() {
    this._domains = window.localStorage['experimental'] === 'false' ? this._stableDomains : this._allDomains;
    this._search.setDomains(Array.from(this._domains.values()));
    this._renderSidebar(this._domains);
    this._router.navigate(this._router.route());
  }

  _onNavigateDomain(route, domain, method) {
    document.title = route;
    this._search.setDefaultValue(route);
    this._search.cancelSearch();
    this._contentElement.textContent = '';
    var active = this._sidebarElement.querySelector('.active-link');
    if (active)
      active.classList.remove('active-link');
    if (!this._domains.has(domain)) {
      this._contentElement.appendChild(renderError(`Unknown domain: ${domain}. Enable experimental domains above?`));
      return;
    }
    let link = this._sidebarElement.querySelector(`[href='#${domain}']`);
    if (link)
      link.classList.add('active-link');
    let render = this._protocolRenderer.renderDomain(this._domains.get(domain));
    if (render) {
      this._contentElement.appendChild(render);
      let elem = render.querySelector('#' + ProtocolRenderer.titleId(domain, method));
      if (elem)
        elem.scrollIntoView();
      else
        this._contentElement.scrollTop = 0;
    }
    else if (!method)
      this._contentElement.scrollTop = 0;
    this._contentElement.focus();
  }

  _onNavigateHome() {
    document.title = 'Vanilla Protocol Viewer';
    this._search.setDefaultValue('');
    this._search.cancelSearch();
    this._contentElement.innerHTML = '';
    var template = document.querySelector('#landing');
    var clone = document.importNode(template.content, true);
    this._contentElement.appendChild(clone);
  }

  _renderSidebar(domains) {
    let domainNames = Array.from(domains.keys());
    let sidebar = document.getElementById('sidebar');
    sidebar.textContent = '';
    for (let name of domainNames) {
      let a = sidebar.a('#' + name, name);
      a.classList.add('domain-link');
      this._protocolRenderer.applyBackground(domains.get(name), a);
    }
  }
}

class Router {
  /**
   * @param {function(?)} unknownRouteHandler
   */
  constructor(unknownRouteHandler) {
    this._routes = new Map();
    this._unknownRouteHandler = unknownRouteHandler;
    window.addEventListener("popstate", () => this._processRoute());
  }

  /**
   * @param {!RegExp} regex
   * @param {function(?)} handler
   */
  setRoute(regex, handler) {
    this._routes.set(regex, handler)
  }

  /**
   * @param {string} route
   */
  navigate(route) {
    if (window.location.hash === route)
      this._processRoute();
    else
      window.location.hash = route;
  }

  /**
   * @return {string}
   */
  route() {
    return window.location.hash;
  }

  _processRoute() {
    let route = (window.location.hash || '#').substring(1);
    for (let regex of this._routes.keys()) {
      var matches = route.match(regex);
      if (matches) {
        this._routes.get(regex).call(null, route, ...matches.slice(1));
        return;
      }
    }
    this._unknownRouteHandler.call(null, route);
  }
}

function renderError(error) {
  let main = E.box();
  let box = main.div('box-content');
  box.el('h2', '', 'Error');
  box.p('', error);
  return main;
}
