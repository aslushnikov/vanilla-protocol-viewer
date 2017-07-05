let PROTOCOLS = {
  'browser_protocol.json':  './browser_protocol.json',
  'js_protocol.json':  './js_protocol.json',
/**
 * these could be pointing to local versions of protocol:
  'browser_protocol.json':  'https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json',
  'js_protocol.json':  'https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json',
 * */
}

document.addEventListener('DOMContentLoaded', () => {
  let sidebar = document.getElementById('sidebar');
  let content = document.getElementById('content');

  window.app = new App(sidebar, content);
});

class App {
  constructor(sidebarElement, contentElement) {
    this._sidebarElement = sidebarElement;
    this._contentElement = contentElement;
    this._domains = new Map();
    this._search = new Search(document.getElementById('search'), document.getElementById('sresults'));
    this._initialize();
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

    this.doRoute();
    let elem = document.getElementById(window.location.hash.substring(1));
    if (elem)
      elem.scrollIntoView();
    window.addEventListener("popstate", () => this.doRoute());

    window.revealHash = (hash) => {
      if (window.location.hash === hash)
        this.doRoute();
      else
        window.location.hash = hash;
    }

  }

  doRoute() {
    let route = (window.location.hash || '#').substring(1);
    if (!route) {
      this._contentElement.innerHTML = '';
      let e = renderLanding();
      this._contentElement.appendChild(e);
      return;
    }
    let [domain, method] = route.split('.');
    if (!this._domains.has(domain)) {
      this._contentElement.innerHTML = '';
      let e = renderError('Unknown location: ' + route);
      this._contentElement.appendChild(e);
      return;
    }
    this._search.cancelSearch();
    var active = this._sidebarElement.querySelector('.active-link');
    if (active)
      active.classList.remove('active-link');
    let link = this._sidebarElement.querySelector(`[href='#${domain}']`);
    if (link)
      link.classList.add('active-link');

    this._contentElement.innerHTML = '';
    let e = Renderer.renderDomain(this._domains.get(domain));
    this._contentElement.appendChild(e);
    let elem = document.getElementById(route);
    if (elem)
      elem.scrollIntoView();
    else if (!method)
      this._contentElement.scrollTop = 0;
    this._contentElement.focus();
    document.title = route;
  }
}

function renderSidebar(domainNames) {
  domainNames.sort();
  let sidebar = document.getElementById('sidebar');
  for (let name of domainNames) {
    let a = sidebar.el('a', 'domain-link');
    a.href = '#' + name;
    a.textContent = name;
  }
}

function renderError(error) {
  let main = E.box();
  main.el('h2', '', 'Error');
  main.p('', error);
  return main;
}

function renderLanding() {
  let main = E.div();
  {
    let e = main.box();
    let h2 = e.el('h2');
    h2.textContent = 'Vanilla Protocol Viewer';
    let div = e.div();
    div.text('Protocols fetched from ');
    div.a('ChromeDevTools/devtools-protocol', 'https://github.com/ChromeDevTools/devtools-protocol');
    let ul = div.el('ul');
    var protocolNames = Object.keys(PROTOCOLS);
    for (let protocolName in PROTOCOLS) {
      let li = ul.el('li');
      let a = li.el('a');
      a.href = PROTOCOLS[protocolName];
      a.textContent = protocolName;
      a.target = '_blank';
    }
  }
  {
    e = main.box();
    let h4 = e.el('h4');
    h4.textContent = 'Features';
    let ul = e.el('ul');
    let li = ul.el('li');
    li.code('Blazingly fast ');
    li.text('There are no roundtrips to the server to perform search or to render a page.');
    li = ul.el('li');
    li.code('Instant Search ');
    li.text('Start typing anywhere to initiate searching.');
    li = ul.el('li');
    li.code('Zero-Dependency ')
    li.text('This is a small self-contained project in less then 1000LOC.');
    li = ul.el('li');
    li.code('No Buildsteps ');
    li.text('Written in vanilla JavaScript / HTML / CSS.');
    e.text('Inspired by ');
    e.a('Chrome DevTools Protocol Viewer', 'https://chromedevtools.github.io/devtools-protocol/');
  }
  return main;
}
