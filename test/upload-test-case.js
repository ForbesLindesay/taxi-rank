import request from 'sync-request';
import {readFileSync} from 'fs';

function doReplacements(source: string, replacements: {[key: string]: string}): string {
  Object.keys(replacements).forEach(key => {
    source = source.split(key).join(replacements[key]);
  });
  return source;
}

function createPage(filename: string, replacements?: {[key: string]: string}): string {
  let html = readFileSync(filename, 'utf8');
  if (replacements) {
    html = doReplacements(html, replacements);
  }
  const res = request('POST', 'https://tempjs.org/create', {json: {html}}).getBody('utf8');
  const parsed = JSON.parse(res);
  return 'https://tempjs.org' + parsed.path;
}


const location = createPage(__dirname + '/demoPage.html', {
  '{{linked-page}}': createPage(__dirname + '/linkedTo.html'),
});

export default location;
