class Search {
  /**
   * @param {!Element} searchHeader
   * @param {!Element} resultsElement
   */
  constructor(searchHeader, resultsElement) {
    this._searchInput = searchHeader.querySelector('input');
    /** @type {!Array<!Search.Item>} */
    this._items = [];
    /** @type {!Set<string>} */
    this._domainNames = new Set();
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
    this._domainNames.clear();
    this._items = [];
    for (var domain of domains) {
      this._domainNames.add(domain.domain.toLowerCase());
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
    let query = this._searchInput.value.trim();
    let items = this._items;
    let dotIndex = query.indexOf('.');
    if (dotIndex !== -1) {
      let domainName = query.substring(0, dotIndex).toLowerCase();
      if (!this._domainNames.has(domainName)) {
        this._renderMessage('Domain not found: ' + domainName);
        return;
      }
      items = items.filter(item => item.domainName.toLowerCase() === domainName);
      query = query.substring(dotIndex + 1);
    }
    let results = this._doSearch(items, query);
    if (results.length === 0) {
      this._renderMessage('Nothing is found.');
      return;
    }
    this._results.innerHTML = '';
    for (let i = 0; i < Math.min(results.length, 50); ++i)
      this._results.appendChild(renderSearchResult(results[i]));
    this._selectedElement = this._results.firstChild;
    this._results.style.setProperty('display', 'block');
    if (this._selectedElement)
      this._selectedElement.classList.add('selected');
  }

  /**
   * @param {string} text
   */
  _renderMessage(text) {
    this._results.innerHTML = '';
    this._results.box('search-results-message')
      .el('h4', '', text);
  }

  /**
   * @param {!Array<!Search.Item>} items
   * @param {string} query
   * @return {!Array<!Search.SearchResult>}
   */
  _doSearch(items, query) {
    let results = [];
    if (!query) {
      for (let item of items)
        results.push(new Search.SearchResult(item, 0, new Set()));
      return results;
    }

    let fuzzySearch = new FuzzySearch(query);
    for (let item of items) {
      let matches = [];
      let score = fuzzySearch.score(item.domainEntry, matches);
      if (score > 0)
        results.push(new Search.SearchResult(item, score, new Set(matches)));
    }
    results.sort((a, b) => {
      if (b.score !== a.score)
        return b.score - a.score;
      // Prefer left-most search results.
      return a.domainEntryMatches.first() - b.domainEntryMatches.first();
    });
    return results;
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
}

