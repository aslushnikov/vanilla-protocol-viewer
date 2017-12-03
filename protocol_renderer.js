class ProtocolRenderer {
  static titleId(domainName, domainEntry) {
    return domainName + '_' + domainEntry;
  }

  renderDomain(domain) {
    let result = E.div();
    let main = result.div('domain');
    this.applyBackground(domain, main);
    let padding = result.div('domain-padding', '\u2606');
    {
      // Render domain main description.
      let container = main.div('box');
      let header = container.div('box-content');

      let title = header.el('h2');
      title.textContent = domain.domain;

      let description = header.el('p');
      description.innerHTML = domain.description || '';
      this.applyMarks(domain, title);
    }

    if (domain.commands && domain.commands.length) {
      // Render methods.
      let title = main.el('h3');
      title.textContent = 'Methods';
      let container = main.box('box');
      for (let method of domain.commands)
        container.appendChild(this.renderEventOrMethod(domain, method));
    }

    if (domain.events && domain.events.length) {
      // Render events.
      let title = main.el('h3');
      title.textContent = 'Events';
      let container = main.box('box');
      for (let event of domain.events)
        container.appendChild(this.renderEventOrMethod(domain, event));
    }

    if (domain.types && domain.types.length) {
      // Render events.
      let title = main.el('h3');
      title.textContent = 'Types';
      let container = main.box('box');
      for (let type of domain.types)
        container.appendChild(this.renderDomainType(domain, type));
    }

    return result;
  }

  renderDomainType(domain, type) {
    let main = E.div('type');
    this.applyBackground(type, main);
    this.applyBackground(domain, main);
    main.appendChild(this.renderTitle(domain.domain, type.id, type));
    {
      // Render description.
      let p = main.el('p');
      p.innerHTML = type.description || '';
    }
    if (type.properties && type.properties.length) {
      // Render parameters.
      let title = main.el('h5');
      title.textContent = 'Properties';
      let container = main.el('dl', 'parameter-list');
      for (let parameter of type.properties)
        container.appendChild(this.renderParameter(domain, parameter));
    }
    if (type.type) {
      main.el('p', '', 'Type: ')
        .text(type.type, 'parameter-type');
    }
    if (type.enum) {
      main.el('h5', '', 'Allowed values');
      main.el('p', '', type.enum.join(', '));
    }
    return main;
  }

  renderTitle(domainName, title, item) {
    // Render heading.
    let heading = E.el('h4', 'monospace text-overflow');
    let id = `${domainName}.${title}`;
    heading.setAttribute('id', ProtocolRenderer.titleId(domainName, title));
    heading.text(domainName + '.', 'method-domain');
    heading.text(title, 'method-name');
    this.applyMarks(item, heading);
    heading.a('#' + id, '#').classList.add('title-link');
    return heading;
  }

  renderEventOrMethod(domain, method) {
    let main = E.div('method');
    this.applyBackground(method, main);
    this.applyBackground(domain, main);
    main.appendChild(this.renderTitle(domain.domain, method.name, method));
    {
      // Render description.
      let p = main.el('p');
      p.innerHTML = method.description || '';
    }
    if (method.parameters && method.parameters.length) {
      // Render parameters.
      let title = main.el('h5');
      title.textContent = 'Parameters';
      let container = main.el('dl', 'parameter-list');
      for (let parameter of method.parameters)
        container.appendChild(this.renderParameter(domain, parameter));
    }
    if (method.returns && method.returns.length) {
      // Render return values.
      let title = main.el('h5');
      title.textContent = 'RETURN OBJECT';
      let container = main.el('dl', 'parameter-list');
      for (let parameter of method.returns)
        container.appendChild(this.renderParameter(domain, parameter));
    }
    return main;
  }

  renderParameter(domain, parameter) {
    let main = document.createDocumentFragment();
    {
      // Render parameter name.
      let name = main.div('parameter-name monospace');
      this.applyBackground(parameter, name);
      if (parameter.optional)
        name.classList.add('optional');
      name.textContent = parameter.name;
    }
    {
      // Render parameter value.
      let container = main.vbox('parameter-value');
      this.applyBackground(parameter, container);
      container.appendChild(this.renderTypeLink(domain, parameter));
      let description = container.span('parameter-description');
      let descriptions = [];
      if (parameter.description)
        descriptions.push(parameter.description);
      if (parameter.enum)
        descriptions.push('Allowed values: ' + parameter.enum.map(value => '<code>' + value + '</code>').join(', ') + '.');
      description.innerHTML = descriptions.join(' ');
      this.applyMarks(parameter, description);
    }
    return main;
  }

  renderTypeLink(domain, parameter) {
    const primitiveTypes = new Set([
      "string",
      "integer",
      "boolean",
      "number",
      "object",
      "any"
    ]);

    if (primitiveTypes.has(parameter.type))
      return E.span('parameter-type', parameter.type);
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
      generic.text('array [ ');
      generic.appendChild(this.renderTypeLink(domain, parameter.items));
      generic.text(' ]');
      return generic;
    }
    return E.el('span', 'parameter-type', '<TYPE>');
  }

  applyBackground(item, element) {
    if (item.experimental)
      element.classList.add('experimental-bg');
    else if (item.deprecated)
      element.classList.add('deprecated-bg');
  }

  applyMarks(item, element) {
    if (item.experimental) {
      let e = element.span('experimental', 'experimental');
      e.title = 'This may be changed, moved or removed';
      element.appendChild(e);
    } else if (item.deprecated) {
      let e = element.span('deprecated', 'deprecated');
      e.title = 'Deprecated, will be removed';
      element.appendChild(e);
    }
  }
};

