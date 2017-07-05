let PROTOCOLS = {
  'browser_protocol.json':  './browser_protocol.json',
  'js_protocol.json':  './js_protocol.json',
/**
 * these could be pointing to local versions of protocol:
  'browser_protocol.json':  'https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json',
  'js_protocol.json':  'https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json',
 * */
}

document.addEventListener('DOMContentLoaded', main);

async function main() {
  let sidebar = document.getElementById('sidebar');
  let content = document.getElementById('content');

  let startLoading = Date.now();
  let protocols = await Promise.all(Object.values(PROTOCOLS).map(url => fetch(url).then(r => r.json())));
  let endLoading = Date.now();
  let loadingTime = endLoading - startLoading;

  let allDomains = [];
  for (let protocol of protocols)
    allDomains.push(...protocol.domains);
  var search = new Search(allDomains, document.getElementById('search'), document.getElementById('sresults'));
  let domains = new Map();
  for (let domain of allDomains)
    domains.set(domain.domain, domain);
  renderSidebar(Array.from(domains.keys()));

  doRoute();
  let elem = document.getElementById(window.location.hash.substring(1));
  if (elem)
    elem.scrollIntoView();
  window.addEventListener("popstate", doRoute);

  window.revealHash = function(hash) {
    if (window.location.hash === hash)
      doRoute();
    else
      window.location.hash = hash;
  }

  function doRoute() {
    let route = (window.location.hash || '#').substring(1);
    if (!route) {
      content.innerHTML = '';
      let e = renderLanding(loadingTime, protocols);
      content.appendChild(e);
      return;
    }
    let [domain, method] = route.split('.');
    if (!domains.has(domain)) {
      content.innerHTML = '';
      let e = renderError('Unknown location: ' + route);
      content.appendChild(e);
      return;
    }
    search.cancelSearch();
    var active = sidebar.querySelector('.active-link');
    if (active)
      active.classList.remove('active-link');
    let link = sidebar.querySelector(`[href='#${domain}']`);
    if (link)
      link.classList.add('active-link');

    content.innerHTML = '';
    let e = Renderer.renderDomain(domains.get(domain));
    content.appendChild(e);
    let elem = document.getElementById(route);
    if (elem)
      elem.scrollIntoView();
    else if (!method)
      content.scrollTop = 0;
    content.focus();
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

function renderLanding(loadingTime, protocols) {
  let main = E.div();
  {
    let e = main.box();
    let h2 = e.el('h2');
    h2.textContent = 'Vanilla Protocol Viewer';
    let div = e.div();
    div.text('Protocols fetched from ');
    div.a('ChromeDevTools/devtools-protocol', 'https://github.com/ChromeDevTools/devtools-protocol');
    div.text(' in ' + (((loadingTime * 1000)|0) / 1000) + 'ms:');
    let ul = div.el('ul');
    var protocolNames = Object.keys(PROTOCOLS);
    protocols = protocols.slice();
    for (let protocolName in PROTOCOLS) {
      let li = ul.el('li');
      let a = li.el('a');
      a.href = PROTOCOLS[protocolName];
      a.textContent = protocolName;
      a.target = '_blank';
      let protocol = protocols.shift();
      li.text(` v${protocol.version.major}.${protocol.version.minor}`);
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
