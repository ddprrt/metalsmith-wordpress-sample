const fetch = require('isomorphic-fetch');
const Metalsmith = require('metalsmith');
const layouts = require('metalsmith-layouts');
const { URL } = require('url');
const mainURL = 'http://your-url';


const wordpress = (url) => (files, smith, done) => {
  fetch(url, {
    'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages'
  })
    .then(res => {
      const noPages = res.headers.get('X-WP-TotalPages') || 1;
      const pagesToFetch = new Array(noPages - 1)
        .fill(0)
        .map((el, id) => fetch(`${url}&page=${id+2}`));
      return Promise.all([res, ...(pagesToFetch)]);
    })
    .then(results => Promise.all(results.map(el => el.json())))
    .then(pages => [].concat(...pages))
    .then(allPages => {
      allPages.forEach(page => {
        const key = `./${new URL(page.link).pathname}/index.html`;
        const content = page;
        let value = content;
        value.layout = 'post.hbs';
        value.contents = new Buffer(page.content.rendered, encoding='utf8');
        files[key] = value;
      });
      done();
    });
}

Metalsmith('.')
  .use(wordpress(`${mainURL}/wp-json/wp/v2/posts?_embed&per_page=100`))
  .use(layouts({
    engine: 'handlebars'
  }))
  .source('./source')
  .destination('./build')
  .build((err) => {
    if (err) throw err;
    console.log('Finished');
  });
