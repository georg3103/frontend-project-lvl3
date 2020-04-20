import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import resources from './locales';
import parse from './parser';
import render from './render';
import validate from './validator';

const timeout = 30000;
const elements = {
  form: document.querySelector('#form'),
  input: document.querySelector('#url-address'),
};

const onFormSubmit = (cb) => {
  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    cb(url);
  });
};

const onInputChange = (cb) => {
  elements.input.addEventListener('input', (e) => {
    e.preventDefault();
    const { target: { value } } = e;
    cb(value);
  });
};

const state = {
  form: {
    state: 'filling',
    error: '',
  },
  feed: {
    urls: [],
    channels: [],
    news: [],
    error: '',
  },
};

const addRSSData = (url, state, data) => {
  const { feed } = state;
  const { title, description, items } = data;
  const uuid = _.uniqueId();
  feed.urls = [...feed.urls, { url, uuid }];
  feed.channels = [...feed.channels, {
    title,
    description,
    uuid,
    id: _.uniqueId('channel_'),
  }];
  feed.news = [...feed.news, { items, uuid, id: _.uniqueId('news_') }];
};

const updateRSSNewsData = (url, state, data) => {
  const { feed } = state;
  const { items } = data;
  const { uuid: urlID } = _.find(feed.urls, (item) => item.url === url);
  const newsToUpdate = _.find(feed.news, (item) => item.uuid === urlID);
  const newNews = _.differenceBy(items, newsToUpdate.items, 'title');
  if (newNews.length !== 0) {
    newsToUpdate.items.unshift(newsToUpdate.items);
  }
};

const getRSSData = (url, state) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  const { feed, form } = state;
  form.state = 'loading';
  return axios.get(`${proxy}/${url}`)
    .then((res) => {
      const { data } = res;
      const parsedData = parse(data);
      return parsedData;
    }).catch((error) => {
      if (error.request) {
        feed.error = error.request.status === 0 ? 'network' : 'access';
      } else {
        feed.error = error.type;
      }
      form.state = 'error';
      throw new Error(`Network error ${error}`);
    });
};

const addFeed = (state, url) => getRSSData(url, state)
  .then((data) => {
    addRSSData(url, state, data);
  });


const updateFeed = (state, url) => getRSSData(url, state)
  .then((data) => {
    updateRSSNewsData(url, state, data);
    setTimeout(() => {
      updateFeed(state, url);
    }, timeout);
  });

const updateValidationState = (state) => (url) => {
  const { feed: { urls }, form } = state;
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

const getRSS = (state) => (url) => {
  addFeed(state, url)
    .then(() => {
      state.form.state = 'finished';
      setTimeout(() => {
        updateFeed(state, url);
      }, timeout);
    });
};

export default () => {
  onInputChange(updateValidationState(state));
  onFormSubmit(getRSS(state));
  i18next.init({
    lng: 'en',
    debug: false,
    resources,
  }).then((texts) => {
    render(state, texts);
  });
};
