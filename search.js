class Search {
  constructor(searchHeader, resultsElement) {
    this._searchInput = searchHeader.querySelector('input');
    this._items = [];
    this._selectedElement = null;
    this._searchInput.addEventListener('input', this._onInput.bind(this), false);
    this._searchInput.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this._results = resultsElement;

    // Activate search on any keypress
    document.addEventListener('keypress', event => {
      if (/[a-zA-Z]/.test(event.key))
        this._searchInput.focus();
    });
    // Activate search on any keypress
    document.addEventListener('click', event => {
      var node = event.target;
      while (node) {
        if (node === this._searchInput)
          return;
        if (node.classList.contains('search-item')) {
          app.navigate(node.__url);
          return;
        }
        node = node.parentElement;
      }
      this.cancelSearch();
    });
  }

  setDomains(domains) {
    this._items = [];
    for (var domain of domains) {
      for (var command of (domain.commands || [])) {
        this._items.push({
          domain: domain.domain,
          entry: command.name,
          type: 'method',
          description: command.description,
          url: `#${domain.domain}.${command.name}`
        });
      }
      for (var event of (domain.events || [])) {
        this._items.push({
          domain: domain.domain,
          entry: event.name,
          type: 'event',
          description: event.description,
          url: `#${domain.domain}.${event.name}`
        });
      }
      for (var type of (domain.types || [])) {
        this._items.push({
          domain: domain.domain,
          entry: type.id,
          type: 'type',
          description: type.description,
          url: `#${domain.domain}.${type.id}`
        });
      }
    }
  }

  cancelSearch() {
    this._searchInput.blur();
    this._results.style.setProperty('display', 'none');
    this._searchInput.value = '';
    app.focusContent();
  }

  _onInput() {
    this._selectedElement = null;
    let query = this._searchInput.value;
    for (let item of this._items)
      item.searchResult = searchInText(item.entry, query);

    let matched = this._items.filter(item => !!item.searchResult.length);
    matched.sort((a, b) => {
      let index1 = a.searchResult[0].text.length;
      let index2 = b.searchResult[0].text.length;
      if (index1 === index2)
        return a.entry.length - b.entry.length;
      return index1 - index2;
    });
    this._results.innerHTML = '';
    for (let i = 0; i < Math.min(matched.length, 50); ++i) {
      this._results.appendChild(renderItem(matched[i]));
    }
    this._selectedElement = this._results.firstChild;
    this._results.style.setProperty('display', 'block');
    if (this._selectedElement)
      this._selectedElement.classList.add('selected');
  }

  _onKeyDown(event)
  {
      if (event.key === "Escape" || event.keyCode === 27) {
          event.consume();
          this.cancelSearch();
      } else if (event.key === "ArrowDown") {
          this._selectNext(event);
      } else if (event.key === "ArrowUp") {
          this._selectPrevious(event);
      } else if (event.key === "Enter") {
          event.consume();
          this.cancelSearch();
          app.navigate(this._selectedElement.__url);
      }
  }

  _selectNext(event) {
    if (!this._selectedElement)
      return;
    event.consume();
    this._selectedElement.classList.remove('selected');
    this._selectedElement = this._selectedElement.nextSibling;
    if (!this._selectedElement)
      this._selectedElement = this._results.firstChild;
    this._selectedElement.scrollIntoViewIfNeeded(false);
    this._selectedElement.classList.add('selected');
  }

  _selectPrevious(event) {
    if (!this._selectedElement)
      return;
    event.consume();
    this._selectedElement.classList.remove('selected');
    this._selectedElement = this._selectedElement.previousSibling;
    if (!this._selectedElement)
      this._selectedElement = this._results.lastChild;
    this._selectedElement.scrollIntoViewIfNeeded(false);
    this._selectedElement.classList.add('selected');
  }
}

/**
 * @param {string} text
 * @param {string} query
 * @return {!Array<!{text: string, bold: boolean}>}
 */
function searchInText(text, query)
{
    var index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1)
        return [];
    var result = [];
    result.push({
        text: text.substring(0, index),
        bold: false
    });
    result.push({
        text: text.substring(index, index + query.length),
        bold: true
    });
    result.push({
        text: text.substring(index + query.length),
        bold: false
    });
    return result;
}

function renderItem(item) {
  let main = E.hbox('search-item');
  {
    // Render icon
    let icon = main.span('search-item-icon');
    if (item.type === 'method') {
      icon.textContent = 'M';
      icon.title = 'Method';
      icon.classList.add('icon-method');
    } else if (item.type === 'type') {
      icon.textContent = 'T';
      icon.title = 'Type';
      icon.classList.add('icon-type');
    } else if (item.type === 'event') {
      icon.textContent = 'E';
      icon.title = 'Event';
      icon.classList.add('icon-event');
    }
  }
  {
    // Render Name and Description
    let container = main.div('search-item-main');
    let p1 = container.el('div',  'search-item-title monospace');
    if (item.searchResult[0].text.length)
      p1.text(item.searchResult[0].text);
    if (item.searchResult[1].text.length)
      p1.text(item.searchResult[1].text, 'search-highlight');
    if (item.searchResult[2].text.length)
      p1.text(item.searchResult[2].text);
    //p1.textContent = item.entry;
    let p2 = container.el('div',  'search-item-description');
    p2.innerHTML = item.description;
  }
  {
    // Render domain
    // Render Name and Description
    let container = main.vbox('search-item-domain');
    container.text(item.domain, 'parameter-name monospace opttonal');
  }
  main.__url = item.url;
  return main;
}

Event.prototype.consume = function()
{
    this.preventDefault();
    this.stopPropagation();
}

