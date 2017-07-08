class Search {
  /**
   * @param {!Element} searchHeader
   * @param {!Element} resultsElement
   */
  constructor(searchHeader, resultsElement) {
    this._searchInput = searchHeader.querySelector('input');
    /** @type {!Array<!Search.Item>} */
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
          event.consume();
          this._cancelSearch();
          app.navigate(node.__route);
          return;
        }
        node = node.parentElement;
      }
      this._cancelSearch();
    });
  }

  setDomains(domains) {
    this._items = [];
    for (var domain of domains) {
      for (var command of (domain.commands || [])) {
        let item = new Search.Item(domain.domain /* domainName */,
          command.name /* domainEntry */,
          Search.ItemType.Method /* itemType */,
          command.description /* description */);
        this._items.push(item);
      }
      for (var event of (domain.events || [])) {
        let item = new Search.Item(domain.domain /* domainName */,
          event.name /* domainEntry */,
          Search.ItemType.Event /* itemType */,
          event.description /* description */);
        this._items.push(item);
      }
      for (var type of (domain.types || [])) {
        let item = new Search.Item(domain.domain /* domainName */,
          type.id /* domainEntry */,
          Search.ItemType.Type /* itemType */,
          type.description /* description */);
        this._items.push(item);
      }
    }
  }

  _cancelSearch() {
    this._searchInput.blur();
    this._results.style.setProperty('display', 'none');
    this._searchInput.value = '';
    app.focusContent();
  }

  _onInput() {
    this._selectedElement = null;
    let query = this._searchInput.value;
    let results = [];
    for (let item of this._items) {
      let result = Search.SearchResult.create(item, query);
      if (result)
        results.push(result);
    }
    results.sort((a, b) => b.score - a.score);
    this._results.innerHTML = '';
    for (let i = 0; i < Math.min(results.length, 50); ++i)
      this._results.appendChild(renderSearchResult(results[i]));

    this._selectedElement = this._results.firstChild;
    this._results.style.setProperty('display', 'block');
    if (this._selectedElement)
      this._selectedElement.classList.add('selected');
  }

  _onKeyDown(event) {
    if (event.key === "Escape" || event.keyCode === 27) {
      event.consume();
      this._cancelSearch();
    } else if (event.key === "ArrowDown") {
      this._selectNext(event);
    } else if (event.key === "ArrowUp") {
      this._selectPrevious(event);
    } else if (event.key === "Enter") {
      event.consume();
      this._cancelSearch();
      app.navigate(this._selectedElement.__route);
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
 * @param {!Search.SearchResult} searchResult
 * @return {!Element}
 */
function renderSearchResult(searchResult) {
  let item = searchResult.item;
  let main = E.hbox('search-item');
  {
    // Render icon
    let icon = main.span('search-item-icon');
    if (item.type === Search.ItemType.Method) {
      icon.textContent = 'M';
      icon.title = 'Method';
      icon.classList.add('icon-method');
    } else if (item.type === Search.ItemType.Type) {
      icon.textContent = 'T';
      icon.title = 'Type';
      icon.classList.add('icon-type');
    } else if (item.type === Search.ItemType.Event) {
      icon.textContent = 'E';
      icon.title = 'Event';
      icon.classList.add('icon-event');
    }
  }
  {
    // Render Name and Description
    let container = main.div('search-item-main');
    let p1 = container.el('div', 'search-item-title monospace');
    p1.appendChild(renderTextWithMatches(item.domainEntry, searchResult.domainEntryMatches));
    let p2 = container.el('div',  'search-item-description');
    p2.innerHTML = item.description;
  }
  {
    // Render domain
    // Render Name and Description
    let container = main.vbox('search-item-domain');
    container.text(item.domainName, 'parameter-name monospace opttonal');
  }
  main.__route = item.route;
  return main;
}

/**
 * @param {string} text
 * @param {!Set<number>} matches
 * @return {!DocumentFragment}
 */
function renderTextWithMatches(text, matches) {
  let result = document.createDocumentFragment();
  let insideMatch = false;
  let currentIndex = 0;
  for (let i = 0; i < text.length; ++i) {
    if (insideMatch !== matches.has(i)) {
      add(currentIndex, i, insideMatch);
      insideMatch = matches.has(i);
      currentIndex = i;
    }
  }
  add(currentIndex, text.length, insideMatch);
  return result;

  /**
   * @param {number} from
   * @param {number} to
   * @param {boolean} isHighlight
   */
  function add(from, to, isHighlight) {
    if (to === from)
      return;
    if (isHighlight)
      result.span('search-highlight', text.substring(from, to));
    else
      result.textNode(text.substring(from, to));
  }
}

/** @enum */
Search.ItemType = {
  Method: Symbol('Method'),
  Type: Symbol('Type'),
  Event: Symbol('Event'),
}

Search.Item = class {
  /**
   * @param {string} domainName
   * @param {string} domainEntry
   * @param {!Search.ItemType} itemType
   * @param {string} description
   * @param {string} route
   */
  constructor(domainName, domainEntry, itemType, description) {
    this.domainName = domainName;
    this.domainEntry = domainEntry;
    this.type = itemType;
    this.description = description || '';
    this.route = `#${domainName}.${domainEntry}`
  }
}

Search.SearchResult = class {
  /**
   * @param {!Search.Item} item
   * @param {number} score
   * @param {!Set<number>} domainEntryMatches
   */
  constructor(item, score, domainEntryMatches) {
    this.item = item;
    this.score = score;
    this.domainEntryMatches = domainEntryMatches;
  }

  /**
   * @param {!Search.Item} item
   * @param {string} query
   * @param {?Search.SearchResult}
   */
  static create(item, query) {
    let index = item.domainEntry.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1)
      return null;
    let matches = new Set();
    // The shorter item length, the better.
    let score = -item.domainEntry.length;
    for (let i = index; i < index + query.length; ++i)
      matches.add(i);
    // Promote items which have matches.
    score += 1000;
    return new Search.SearchResult(item, score, matches);
  }
}
