/* eslint-disable no-undef */
const getNodeTextContent = (node, tagName) => {
  return node.querySelector(tagName).textContent || null;
};

export default (data) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(data, 'application/xml');
  const isRSS = doc.contains(doc.querySelector('rss'));
  if (!isRSS) {
    throw new Error('Wrong document type!');
  }
  const [...items] = doc.querySelectorAll('item');
  const parsedItems = items.map((item) => ({
    title: getNodeTextContent(item, 'title'),
    description: getNodeTextContent(item, 'description'),
    link: getNodeTextContent(item, 'link'),
    pubDate: getNodeTextContent(item, 'pubDate'),
    guid: getNodeTextContent(item, 'guid'),
  }));
  return ({
    title: getNodeTextContent(doc, 'title'),
    description: getNodeTextContent(doc, 'description'),
    items: parsedItems,
  });
};
