import * as yup from 'yup';

export default (urls, url) => (
  yup.string()
    .url()
    .notOneOf(urls)
    .validateSync(url)
);
