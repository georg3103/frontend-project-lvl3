import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import resources from './locales';
import parse from './parser';
import render from './render';
import validate from './validator';
import ELEMENTS from './elements';

const TIMEOUT = 30000;

const onFormSubmit = (handler) => {
  ELEMENTS.form.addEventListener('submit', (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-undef
    const formData = new FormData(e.target);
    const url = formData.get('url');
    handler(url);
  });
};

const onInputChange = (handler) => {
  ELEMENTS.input.addEventListener('input', (e) => {
    e.preventDefault();
    const { target: { value } } = e;
    handler(value);
  });
};

const state = {
  form: {
    state: 'filling',
    error: '',
  },
  rss: {
    urls: [],
    channels: [],
    news: [],
    error: '',
  },
};

const addRSSData = (url, state, data) => {
  const { rss } = state;
  const { title, description, items } = data;
  const uuid = _.uniqueId();
  rss.urls = [...rss.urls, { url, uuid }];
  rss.channels = [...rss.channels, {
    title,
    description,
    uuid,
    id: _.uniqueId('channel_'),
  }];
  rss.news = [...rss.news, { items, uuid, id: _.uniqueId('news_') }];
};

const updateRSSNewsData = (url, state, data) => {
  const { rss } = state;
  const { items } = data;
  const { uuid: urlID } = _.find(rss.urls, (item) => item.url === url);
  const newsToUpdate = _.find(rss.news, (item) => item.uuid === urlID);
  const newNews = _.differenceBy(items, newsToUpdate.items, 'title');
  if (newNews.length !== 0) {
    newsToUpdate.items = [...newsToUpdate.items, ...newNews];
  }
};

const getRSSData = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  return axios({
    method: 'get',
    url: `${proxy}/${url}`,
  }).then((res) => {
    const { data } = res;
    const parsedData = parse(data);
    return parsedData;
  });
};

const handleRSSErrors = (state, rssFn) => (...args) => rssFn(args)
  .catch((error) => {
    console.log(error);
    state.rss.error = 'network';
    // TODO: should check, which error
    state.form.state = 'error';
    throw new Error('Network error');
  });


const getStream = (state, url) => handleRSSErrors(state, getRSSData)(url)
  .then((data) => {
    addRSSData(url, state, data);
  });


const updateStream = (state, url) => handleRSSErrors(state, getRSSData)(url)
  .then((data) => {
    updateRSSNewsData(url, state, data);
    setTimeout(() => {
      updateStream(state, url);
    }, TIMEOUT);
  });

const validateHandler = (state) => (url) => {
  const { rss: { urls }, form } = state;
  const list = urls.map(({ url }) => url);
  try {
    validate(list, url);
    form.error = '';
    form.state = 'ready';
  } catch ({ type }) {
    form.error = type;
    form.state = 'filling';
  }
};

const formSubmitHandler = (state) => (url) => {
  getStream(state, url)
    .then(() => {
      state.form.state = 'finished';
      setTimeout(() => {
        updateStream(state, url);
      }, TIMEOUT);
    });
};

export default () => {
  onInputChange(validateHandler(state));
  onFormSubmit(formSubmitHandler(state));
  i18next.init({
    lng: 'en',
    debug: false,
    resources,
  }).then((texts) => {
    render(state, texts);
  });
};
