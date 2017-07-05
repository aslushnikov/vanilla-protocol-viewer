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
    let e = renderDomain(domains.get(domain));
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

function renderDomain(domain) {
  let main = E.div('domain');

  {
    // Render domain main description.
    let container = main.div('box');

    let title = container.el('h2');
    title.textContent = domain.domain;

    let description = container.el('p');
    description.innerHTML = domain.description || '';
    if (domain.experimental)
      description.appendChild(experimentalMark());
  }

  if (domain.commands && domain.commands.length) {
    // Render methods.
    let title = main.el('h3');
    title.textContent = 'Methods';
    let container = main.box('box');
    for (let i = 0; i < domain.commands.length; ++i) {
      if (i !== 0)
        container.div('boundary');
      let method = domain.commands[i];
      container.appendChild(renderEventOrMethod(domain, method));
    }
  }

  if (domain.events && domain.events.length) {
    // Render events.
    let title = main.el('h3');
    title.textContent = 'Events';
    let container = main.box('box');
    for (let i = 0; i < domain.events.length; ++i) {
      if (i !== 0)
        container.div('boundary');
      let event = domain.events[i];
      container.appendChild(renderEventOrMethod(domain, event));
    }
  }

  if (domain.types && domain.types.length) {
    // Render events.
    let title = main.el('h3');
    title.textContent = 'Types';
    let container = main.box('box');
    for (let i = 0; i < domain.types.length; ++i) {
      if (i !== 0)
        container.div('boundary');
      let type = domain.types[i];
      container.appendChild(renderType(domain, type));
    }
  }

  return main;
}

function renderType(domain, type) {
  let main = E.div('type');
  main.appendChild(renderTitle(domain.domain, type.id));
  {
    // Render description.
    let p = main.el('p');
    p.textContent = type.description || '';
    if (type.experimental)
      p.appendChild(experimentalMark());
  }
  if (type.properties && type.properties.length) {
    // Render parameters.
    let title = main.el('h5');
    title.textContent = 'Properties';
    let container = main.el('dl', 'parameter-list');
    for (let parameter of type.properties)
      container.appendChild(renderParameter(domain, parameter));
  }
  if (type.type) {
    let container = main.el('p');
    container.addText('Type: ');
    container.addText(type.type, 'parameter-type');
  }
  if (type.enum) {
    let title = main.el('h5');
    title.textContent = 'Allowed values';
    let p = main.el('p');
    p.textContent = type.enum.join(', ');
  }
  return main;
}

function renderTitle(domainName, domainEntry) {
    // Render heading.
    let heading = E.el('h4', 'monospace');
    let id = `${domainName}.${domainEntry}`;
    heading.setAttribute('id', id);
    heading.addText(domainName + '.', 'method-domain');
    heading.addText(domainEntry, 'method-name');
    let ref = heading.el('a', 'title-link');
    ref.href = '#' + id;
    ref.textContent = '#';
    return heading;
}

function renderEventOrMethod(domain, method) {
  let main = E.div('method');
  main.appendChild(renderTitle(domain.domain, method.name));
  {
    // Render description.
    let p = main.el('p');
    p.innerHTML = method.description || '';
    if (method.experimental)
      p.appendChild(experimentalMark());
  }
  if (method.parameters && method.parameters.length) {
    // Render parameters.
    let title = main.el('h5');
    title.textContent = 'Parameters';
    let container = main.el('dl', 'parameter-list');
    for (let parameter of method.parameters)
      container.appendChild(renderParameter(domain, parameter));
  }
  if (method.returns && method.returns.length) {
    // Render return values.
    let title = main.el('h5');
    title.textContent = 'RETURN OBJECT';
    let container = main.el('dl', 'parameter-list');
    for (let parameter of method.returns)
      container.appendChild(renderParameter(domain, parameter));
  }
  return main;
}

function renderParameter(domain, parameter) {
  let main = E.hbox('parameter');
  {
    // Render parameter name.
    let name = main.div('parameter-name monospace');
    if (parameter.optional)
      name.classList.add('optional');
    name.textContent = parameter.name;
  }
  {
    // Render parameter value.
    let container = main.vbox('parameter-value');
    container.appendChild(renderTypeLink(domain, parameter));
    let description = container.span('parameter-description');
    description.innerHTML = parameter.description || '';
    if (parameter.experimental)
      description.appendChild(experimentalMark());
  }
  return main;
}

var primitiveTypes = new Set([
  "string",
  "integer",
  "boolean",
  "number",
  "object",
  "any"
]);

function renderTypeLink(domain, parameter) {
  if (primitiveTypes.has(parameter.type))
    return E.el('span', 'parameter-type', parameter.type);
  if (parameter.$ref) {
    let a = E.el('a', 'parameter-type');
    if (parameter.$ref.includes('.'))
      a.href = '#' + parameter.$ref;
    else
      a.href = '#' + domain.domain + '.' + parameter.$ref;
    a.textContent = parameter.$ref;
    return a;
  }
  if (parameter.type === 'array') {
    let generic = E.span('parameter-type');
    generic.addText('array [ ');
    generic.appendChild(renderTypeLink(domain, parameter.items));
    generic.addText(' ]');
    return generic;
  }
  return E.el('span', 'parameter-type', '<TYPE>');
}

function experimentalMark() {
  let e = E.el('span', 'experimental', 'experimental');
  e.title = 'This may be changed, moved or removed';
  return e;
}

function renderError(error) {
  let main = E.div();
  {
    let e = main.box();
    let h2 = e.el('h2');
    h2.addText('Error');
    let p = e.el('p');
    p.addText(error);
  }
  return main;
}

function renderLanding(loadingTime, protocols) {
  let main = E.div();
  {
    let e = main.box();
    let h2 = e.el('h2');
    h2.textContent = 'Vanilla Protocol Viewer';
    let div = e.div();
    div.addText('Protocols fetched from ');
    div.a('ChromeDevTools/devtools-protocol', 'https://github.com/ChromeDevTools/devtools-protocol');
    div.addText(' in ' + (((loadingTime * 1000)|0) / 1000) + 'ms:');
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
      li.addText(` v${protocol.version.major}.${protocol.version.minor}`);
    }
  }
  {
    e = main.box();
    let h4 = e.el('h4');
    h4.textContent = 'Features';
    let ul = e.el('ul');
    let li = ul.el('li');
    li.code('Blazingly fast ');
    li.addText('There are no roundtrips to the server to perform search or to render a page.');
    li = ul.el('li');
    li.code('Instant Search ');
    li.addText('Start typing anywhere to initiate searching.');
    li = ul.el('li');
    li.code('Zero-Dependency ')
    li.addText('This is a small self-contained project in less then 1000LOC.');
    li = ul.el('li');
    li.code('No Buildsteps ');
    li.addText('Written in vanilla JavaScript / HTML / CSS.');
    e.addText('Inspired by ');
    e.a( 'Chrome DevTools Protocol Viewer', 'https://chromedevtools.github.io/devtools-protocol/');
  }
  return main;
}

// HELPERS

const E = {
  el: function(name, className, textContent) {
    let e = document.createElement(name);
    if (className)
      e.className = className;
    if (textContent)
      e.textContent = textContent;
    return e;
  },

  text: function(text, className, tagName = 'span') {
    let e = E.el(tagName, className);
    e.textContent = text;
    return e;
  },

  div: function(className) {
    return E.el('div', className);
  },

  span: function(className) {
    return E.el('span', className);
  },

  box: function(className) {
    let e = E.el('div', className);
    e.classList.add('box');
    return e;
  },

  hbox: function(className) {
    let e = E.el('div', className);
    e.classList.add('hbox');
    return e;
  },

  vbox: function(className) {
    let e = E.el('div', className);
    e.classList.add('vbox');
    return e;
  },

  strong: function(text) {
    return E.el('strong', '', text);
  },

  code: function(text) {
    return E.el('code', '', text);
  },

  a: function(text, href) {
    let link = E.el('a', '', text);
    link.href = href;
    return link;
  },
};

// Install helpers on Node.prototype
for (let helper in E) {
  Node.prototype[helper] = function(...args) {
    let element = E[helper].apply(null, args);
    this.appendChild(element);
    return element;
  };
}

Node.prototype.addText = function(text, className) {
  let t = E.el('span', className, text);
  this.appendChild(t);
  return t;
}

