let PROTOCOLS = {
/**
  'browser_protocol.json':  './browser_protocol.json',
  'js_protocol.json':  './js_protocol.json',
 * */
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

  async _initialize() {
    let protocols = await Promise.all(Object.values(PROTOCOLS).map(url => fetch(url).then(r => r.json())));

    this._domains.clear();
    for (let protocol of protocols) {
      for (let domain of protocol.domains)
        this._domains.set(domain.domain, domain);
    }
    this._search.setDomains(Array.from(this._domains.values()));
    renderSidebar(Array.from(this._domains.keys()));

    this._router.navigate(this._router.route());
  }

  _onNavigateDomain(route, domain, method) {
    document.title = route;
    this._search.setDefaultValue(route);
    this._search.cancelSearch();
    this._contentElement.innerHTML = '';
    var active = this._sidebarElement.querySelector('.active-link');
    if (active)
      active.classList.remove('active-link');
    if (!this._domains.has(domain)) {
      this._contentElement.appendChild(renderError('Unknown domain: ' + domain));
      return;
    }
    let link = this._sidebarElement.querySelector(`[href='#${domain}']`);
    if (link)
      link.classList.add('active-link');
    let render = this._protocolRenderer.renderDomain(this._domains.get(domain));
    this._contentElement.appendChild(render);
    let elem = render.querySelector('#' + ProtocolRenderer.titleId(domain, method));
    if (elem)
      elem.scrollIntoView();
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


function renderSidebar(domainNames) {
  domainNames.sort();
  let sidebar = document.getElementById('sidebar');
  for (let name of domainNames) {
    let a = sidebar.a('#' + name, name);
    a.classList.add('domain-link');
  }
}

function renderError(error) {
  let main = E.box();
  main.el('h2', '', 'Error');
  main.p('', error);
  return main;
}
