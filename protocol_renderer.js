class ProtocolRenderer {
  static titleId(domainName, domainEntry) {
    return domainName + '_' + domainEntry;
  }

  renderDomain(domain) {
    let main = E.div('domain');
    {
      // Render domain main description.
      let container = main.div('box');

      let title = container.el('h2');
      title.textContent = domain.domain;

      let description = container.el('p');
      description.innerHTML = domain.description || '';
      if (domain.experimental)
        description.appendChild(this.experimentalMark());
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
        container.appendChild(this.renderEventOrMethod(domain, method));
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
        container.appendChild(this.renderEventOrMethod(domain, event));
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
        container.appendChild(this.renderDomainType(domain, type));
      }
    }

    return main;
  }

  renderDomainType(domain, type) {
    let main = E.div('type');
    main.appendChild(this.renderTitle(domain.domain, type.id));
    {
      // Render description.
      let p = main.el('p');
      p.textContent = type.description || '';
      if (type.experimental)
        p.appendChild(this.experimentalMark());
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

  renderTitle(domainName, title) {
    // Render heading.
    let heading = E.el('h4', 'monospace');
    let id = `${domainName}.${title}`;
    heading.setAttribute('id', ProtocolRenderer.titleId(domainName, title));
    heading.text(domainName + '.', 'method-domain');
    heading.text(title, 'method-name');
    heading.a('#' + id, '#').classList.add('title-link');
    return heading;
  }

  renderEventOrMethod(domain, method) {
    let main = E.div('method');
    main.appendChild(this.renderTitle(domain.domain, method.name));
    {
      // Render description.
      let p = main.el('p');
      p.innerHTML = method.description || '';
      if (method.experimental)
        p.appendChild(this.experimentalMark());
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
      container.appendChild(this.renderTypeLink(domain, parameter));
      let description = container.span('parameter-description');
      let descriptions = [];
      if (parameter.description)
        descriptions.push(parameter.description);
      if (parameter.enum)
        descriptions.push('Allowed values: ' + parameter.enum.map(value => '<code>' + value + '</code>').join(', ') + '.');
      description.innerHTML = descriptions.join(' ');
      if (parameter.experimental)
        description.appendChild(this.experimentalMark());
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

  experimentalMark() {
    let e = E.el('span', 'experimental', 'experimental');
    e.title = 'This may be changed, moved or removed';
    return e;
  }
};

