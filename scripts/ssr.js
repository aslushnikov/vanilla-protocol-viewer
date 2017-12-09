
const fs = require('fs');
const path = require('path');

const usus = require('usus');
const mkdirp = require('mkdirp');

const protocols = [
  require('devtools-protocol/json/browser_protocol.json'),
  require('devtools-protocol/json/js_protocol.json')
];


(async function() {
  const chrome = await usus.launchChrome();
  const ususConfig = {inlineStyles: true, chromePort: chrome.port, delay: 500};


  const domainList = [];
  protocols.forEach(protocolFile => protocolFile.domains.forEach(d => domainList.push(d.domain)));

  for (const domainid of domainList.slice(2)) {
    const url = `http://localhost:8000/#${domainid}`;
    console.log(`Loading ${url}...`);
    const html = await usus.render(url, ususConfig);

    await usus.render('data:text/html,<h3>clearing state</h3>', ususConfig);

    const filename = path.resolve(__dirname, '../tot/', `${domainid}/index.html`);
    mkdirp.sync(path.dirname(filename));
    fs.writeFileSync(filename, html, 'utf8');
    console.log(`Wrote ${html.length} bytes to ${filename}\n`);
  }

  await chrome.kill();
})();
