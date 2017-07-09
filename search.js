// Number of search results to render immediately.
const SEARCH_RENDER_COUNT = 50;

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
    this._resultsElement = resultsElement;

    // Activate search on any keypress
    document.addEventListener('keypress', event => {
      if (this._searchInput === document.activeElement)
        return;
      if (/\S/.test(event.key)) {
        if (event.key !== '.')
          this._searchInput.value = '';
        this._searchInput.focus();
      }
    });
    // Activate search on backspace
    document.addEventListener('keydown', event => {
      if (this._searchInput === document.activeElement)
        return;
      if (event.keyCode === 8 || event.keyCode === 46)
        this._searchInput.focus();
    });
    document.addEventListener('click', event => {
      if (this._searchInput.contains(event.target))
        return;
      let searchItem = event.target.selfOrParentWithClass('search-item');
      if (searchItem) {
        event.consume();
        this.cancelSearch();
        app.navigate(searchItem.__route);
        return;
      }
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

  cancelSearch() {
    this._searchInput.blur();
    this._resultsElement.style.setProperty('display', 'none');
    this._searchInput.value = this._defaultValue;
    app.focusContent();
  }

  setDefaultValue(value) {
    this._defaultValue = value;
  }

  _onInput() {
    this._selectedElement = null;
    this._resultsElement.style.setProperty('display', 'block');
    let query = this._searchInput.value.trim();
    let items = this._items;
    let results = this._doSearch(items, query);
    if (results.length === 0) {
      this._renderMessage('Nothing is found.');
      return;
    }
    this._resultsElement.innerHTML = '';
    if (!query)
      this._addNavigateHomeItem();
    for (let i = 0; i < Math.min(results.length, SEARCH_RENDER_COUNT); ++i)
      this._resultsElement.appendChild(renderSearchResult(results[i]));
    this._addAllResultsButtonIfNeeded(results);
    this._selectedElement = this._resultsElement.firstChild;
    if (this._selectedElement)
      this._selectedElement.classList.add('selected');
  }

  _addNavigateHomeItem() {
    let main = this._resultsElement.hbox('search-item', `Navigate Home`);
    main.classList.add('custom-search-result');
    main.classList.add('monospace');
    main.__route = '';
    return main;
  }

  _addAllResultsButtonIfNeeded(results) {
    let remainingResults = results.length - SEARCH_RENDER_COUNT;
    if (remainingResults <= 0)
      return;
    let main = this._resultsElement.hbox('search-item', `Show Remaining ${remainingResults} Results...`);
    main.classList.add('custom-search-result');
    main.classList.add('monospace');
    main.addEventListener('click', event => {
      event.consume();
      for (let i = SEARCH_RENDER_COUNT; i < results.length; ++i)
        this._resultsElement.appendChild(renderSearchResult(results[i]));
      let next = main.nextSibling;
      main.remove();
      this._selectElement(next);
      this._searchInput.focus();
    }, false);
    return main;
  }

  /**
   * @param {string} text
   */
  _renderMessage(text) {
    this._resultsElement.innerHTML = '';
    this._resultsElement.box('search-results-message')
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
        results.push(new Search.SearchResult(item, 0, [], []));
      return results;
    }

    let fuzzyEntrySearch = null;
    let fuzzyDomainSearch = null;
    let dotIndex = query.indexOf('.');
    if (dotIndex !== -1) {
      fuzzyDomainSearch = new FuzzySearch(query.substring(0, dotIndex));
      fuzzyEntrySearch = new FuzzySearch(query.substring(dotIndex + 1));
    } else {
      fuzzyEntrySearch = new FuzzySearch(query);
    }
    for (let item of items) {
      let entryMatches = [];
      let domainMatches = [];
      let entryScore = fuzzyEntrySearch.score(item.domainEntry, entryMatches);
      if (entryScore === 0 && fuzzyEntrySearch.query().length)
        continue;
      let domainScore = 0;
      if (fuzzyDomainSearch) {
        domainScore = fuzzyDomainSearch.score(item.domainName, domainMatches);
        if (domainScore === 0)
          continue;
      }
      let score = 100 * domainScore + entryScore;
      results.push(new Search.SearchResult(item, score, entryMatches, domainMatches));
    }
    results.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff)
        return scoreDiff;
      // Prefer left-most search results.
      const startDiff = a.domainEntryMatches[0] - b.domainEntryMatches[0];
      if (startDiff)
        return startDiff;
      return a.item.domainEntry.length - b.item.domainEntry.length;
    });
    return results;
  }

  _onKeyDown(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
      event.consume();
      this.cancelSearch();
    } else if (event.key === 'ArrowDown') {
      this._selectNext(event);
    } else if (event.key === 'ArrowUp') {
      this._selectPrevious(event);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.consume();
      if (this._selectedElement);
        this._selectedElement.click();
    }
  }

  _selectNext(event) {
    if (!this._selectedElement)
      return;
    event.consume();
    let next = this._selectedElement.nextSibling;
    if (!next)
      next = this._resultsElement.firstChild;
    this._selectElement(next);
  }

  _selectPrevious(event) {
    if (!this._selectedElement)
      return;
    event.consume();
    let previous = this._selectedElement.previousSibling;
    if (!previous)
      previous = this._resultsElement.lastChild;
    this._selectElement(previous);
  }

  _selectElement(item) {
    if (this._selectedElement)
      this._selectedElement.classList.remove('selected');
    this._selectedElement = item;
    if (this._selectedElement) {
      this._selectedElement.scrollIntoViewIfNeeded(false);
      this._selectedElement.classList.add('selected');
    }
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
    let domainElement = p1.span('search-item-title-domain');
    domainElement.appendChild(renderTextWithMatches(item.domainName, searchResult.domainNameMatches));
    domainElement.textNode('.');
    p1.appendChild(renderTextWithMatches(item.domainEntry, searchResult.domainEntryMatches));
    let p2 = container.el('div',  'search-item-description');
    p2.innerHTML = item.description;
  }
  main.__route = item.route;
  return main;
}

/**
 * @param {string} text
 * @param {!Array<number>} matches
 * @return {!Element}
 */
function renderTextWithMatches(text, matches) {
  if (!matches.length)
    return E.textNode(text);
  let result = document.createDocumentFragment();
  let insideMatch = false;
  let currentIndex = 0;
  let matchIndex = new Set(matches);
  for (let i = 0; i < text.length; ++i) {
    if (insideMatch !== matchIndex.has(i)) {
      add(currentIndex, i, insideMatch);
      insideMatch = matchIndex.has(i);
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
   * @param {!Array<number>} domainEntryMatches
   * @param {!Array<number>} domainNameMatches
   */
  constructor(item, score, domainEntryMatches, domainNameMatches) {
    this.item = item;
    this.score = score;
    this.domainEntryMatches = domainEntryMatches;
    this.domainNameMatches = domainNameMatches;
  }
}

