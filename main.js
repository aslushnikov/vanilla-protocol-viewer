document.addEventListener('DOMContentLoaded', main);

async function main() {
  let content = document.getElementById('content');
  let protocols = await Promise.all([
    fetch('./browser_protocol.json').then(r => r.json()),
    fetch('./js_protocol.json').then(r => r.json()),
  ]);
  let allDomains = [];
  for (let protocol of protocols)
    allDomains.push(...protocol.domains);
  let domains = new Map();
  for (let domain of allDomains)
    domains.set(domain.domain, domain);
  renderSidebar(Array.from(domains.keys()));

  doRoute();
  window.addEventListener("popstate", doRoute);

  function doRoute() {
    let route = (window.location.hash || '#').substring(1);
    if (!route)
      return;
    let [domain, method] = route.split('.');
    let e = renderDomain(domains.get(domain));
    content.innerHTML = '';
    content.appendChild(e);
    let elem = document.getElementById(route);
    if (elem)
      elem.scrollIntoView();
    else
      content.scrollTop = 0;
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
    description.textContent = domain.description;
    if (domain.experimental)
      description.appendChild(experimentalMark());
  }

  if (domain.commands && domain.commands.length) {
    // Render methods.
    let title = main.el('h3');
    title.textContent = 'Methods';
    let container = main.box('box');
    for (let i = 0; i < domain.commands.length; ++i) {
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
      let type = domain.types[i];
      container.appendChild(renderType(domain, type));
    }
  }

  return main;
}

function renderType(domain, type) {
  let main = E.div('type');
  {
    // Render heading.
    let heading = main.el('h4', 'monospace');
    heading.textContent = type.id;
    let id = `${domain.domain}.${type.id}`;
    heading.setAttribute('id', id);
    let ref = heading.el('a', 'title-link');
    ref.href = '#' + id;
    ref.textContent = '#';
  }
  {
    // Render description.
    let p = main.el('p');
    p.textContent = type.description;
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

function renderEventOrMethod(domain, method) {
  //let main = document.createDocumentFragment();//E.vbox('method');
  let main = E.div('method');
  {
    // Render heading.
    let heading = main.el('h4', 'monospace');
    let id = `${domain.domain}.${method.name}`;
    heading.setAttribute('id', id);
    heading.addText(domain.domain + '.', 'method-domain');
    heading.addText(method.name, 'method-name');
    let ref = heading.el('a', 'title-link');
    ref.href = '#' + id;
    ref.textContent = '#';
  }
  {
    // Render description.
    let p = main.el('p');
    p.textContent = method.description;
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
    let description = container.addText(parameter.description, 'parameter-description');
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
    return E.text(parameter.type, 'parameter-type');
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
  return E.text('<TYPE>', 'parameter-type');
}

function experimentalMark() {
  var e = E.text('experimental', 'experimental');
  e.title = 'This may be changed, moved or removed';
  return e;
}

// HELPERS

class E {
  static el(name, className) {
    let e = document.createElement(name);
    if (className)
      e.className = className;
    return e;
  }

  static box(className) {
    let e = E.el('div', className);
    e.classList.add('box');
    return e;
  }

  static div(className) {
    return E.el('div', className);
  }

  static span(className) {
    return E.el('span', className);
  }

  static hbox(className) {
    let e = E.el('div', className);
    e.classList.add('hbox');
    return e;
  }

  static vbox(className) {
    let e = E.el('div', className);
    e.classList.add('vbox');
    return e;
  }

  static text(text, className) {
    let e = E.el('span', className);
    e.textContent = text;
    return e;
  }
};

Node.prototype.div = function(className) {
  let div = E.div(className);
  this.appendChild(div);
  return div;
}

Node.prototype.span = function(className) {
  let span = E.span(className);
  this.appendChild(span);
  return span;
}


Node.prototype.box = function(className) {
  let box = E.box(className);
  this.appendChild(box);
  return box;
}

Node.prototype.hbox = function(className) {
  let box = E.hbox(className);
  this.appendChild(box);
  return box;
}

Node.prototype.vbox = function(className) {
  let box = E.vbox(className);
  this.appendChild(box);
  return box;
}

Node.prototype.addText = function(text, className) {
  let t = E.text(text, className);
  this.appendChild(t);
  return t;
}

Node.prototype.el = function(name, className) {
  let el = E.el(name, className);
  this.appendChild(el);
  return el;
}
