class ProtocolRenderer {
  static titleId(domainName, domainEntry) {
    return domainName + '_' + domainEntry;
  }

  static renderDomain(domain) {
    let result = E.div();
    let main = result.div('domain');
    ProtocolRenderer.applyBackground(domain, main);
    let padding = result.div('domain-padding', '\u2606');
    {
      // Render domain main description.
      let container = main.div('box');
      let header = container.div('box-content');

      let title = header.el('h2');
      title.textContent = domain.domain;

      let description = header.el('p');
      description.innerHTML = domain.description || '';
      ProtocolRenderer.applyMarks(domain, title);
    }

    if (domain.commands && domain.commands.length) {
      // Render methods.
      let title = main.el('h3');
      title.textContent = 'Methods';
      let container = main.box('box');
      for (let method of domain.commands)
        container.appendChild(ProtocolRenderer.renderEventOrMethod(domain, method, false));
    }

    if (domain.events && domain.events.length) {
      // Render events.
      let title = main.el('h3');
      title.textContent = 'Events';
      let container = main.box('box');
      for (let event of domain.events)
        container.appendChild(ProtocolRenderer.renderEventOrMethod(domain, event, true));
    }

    if (domain.types && domain.types.length) {
      // Render events.
      let title = main.el('h3');
      title.textContent = 'Types';
      let container = main.box('box');
      for (let type of domain.types)
        container.appendChild(ProtocolRenderer.renderDomainType(domain, type));
    }

    return result;
  }

  static renderDomainType(domain, type) {
    let main = E.div('type');
    ProtocolRenderer.applyBackground(type, main);
    ProtocolRenderer.applyBackground(domain, main);
    main.appendChild(ProtocolRenderer.renderTitle(domain.domain, type.id, type, 'type'));
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
        container.appendChild(ProtocolRenderer.renderParameter(domain, parameter));
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

  static renderTitle(domainName, title, item, titleType) {
    // Render heading.
    let heading = E.el('h4', 'monospace text-overflow');

    if (titleType === 'type')
      heading.appendChild(ProtocolRenderer.renderTypeIcon());
    else if (titleType === 'event')
      heading.appendChild(ProtocolRenderer.renderEventIcon());
    else if (titleType === 'method')
      heading.appendChild(ProtocolRenderer.renderMethodIcon());

    let id = `${domainName}.${title}`;
    heading.setAttribute('id', ProtocolRenderer.titleId(domainName, title));
    heading.text(domainName + '.', 'method-domain');
    heading.text(title, 'method-name');
    ProtocolRenderer.applyMarks(item, heading);
    heading.a('#' + id, '#').classList.add('title-link');
    return heading;
  }

  static renderEventOrMethod(domain, method, isEvent) {
    let main = E.div('method');
    ProtocolRenderer.applyBackground(method, main);
    ProtocolRenderer.applyBackground(domain, main);
    main.appendChild(ProtocolRenderer.renderTitle(domain.domain, method.name, method, isEvent ? 'event' : 'method'));
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
        container.appendChild(ProtocolRenderer.renderParameter(domain, parameter));
    }
    if (method.returns && method.returns.length) {
      // Render return values.
      let title = main.el('h5');
      title.textContent = 'RETURN OBJECT';
      let container = main.el('dl', 'parameter-list');
      for (let parameter of method.returns)
        container.appendChild(ProtocolRenderer.renderParameter(domain, parameter));
    }
    return main;
  }

  static renderParameter(domain, parameter) {
    let main = document.createDocumentFragment();
    {
      // Render parameter name.
      let name = main.div('parameter-name monospace');
      ProtocolRenderer.applyBackground(parameter, name);
      if (parameter.optional)
        name.classList.add('optional');
      name.textContent = parameter.name;
    }
    {
      // Render parameter value.
      let container = main.vbox('parameter-value');
      ProtocolRenderer.applyBackground(parameter, container);
      container.appendChild(ProtocolRenderer.renderTypeLink(domain, parameter));
      let description = container.span('parameter-description');
      let descriptions = [];
      if (parameter.description)
        descriptions.push(parameter.description);
      if (parameter.enum)
        descriptions.push('Allowed values: ' + parameter.enum.map(value => '<code>' + value + '</code>').join(', ') + '.');
      description.innerHTML = descriptions.join(' ');
      ProtocolRenderer.applyMarks(parameter, description);
    }
    return main;
  }

  static renderTypeLink(domain, parameter) {
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
      generic.appendChild(ProtocolRenderer.renderTypeLink(domain, parameter.items));
      generic.text(' ]');
      return generic;
    }
    return E.el('span', 'parameter-type', '<TYPE>');
  }

  static applyBackground(item, element) {
    if (item.experimental)
      element.classList.add('experimental-bg');
    else if (item.deprecated)
      element.classList.add('deprecated-bg');
  }

  static applyMarks(item, element) {
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

  static renderMethodIcon() {
    let icon = E.span('entity-icon');
    icon.textContent = 'Method';
    icon.title = 'Method';
    icon.classList.add('entity-icon-method');
    return icon;
  }

  static renderTypeIcon() {
    let icon = E.span('entity-icon');
    icon.textContent = 'Type';
    icon.title = 'Type';
    icon.classList.add('entity-icon-type');
    return icon;
  }

  static renderEventIcon() {
    let icon = E.span('entity-icon');
    icon.textContent = 'Event';
    icon.title = 'Event';
    icon.classList.add('entity-icon-event');
    return icon;
  }
};

