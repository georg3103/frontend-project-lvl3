import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import resources from './locales';
import parse from './parser';
import render from './render';
import validate from './validator';

const timeout = 30000;

const state = {
  form: {
    state: 'filling',
    error: '',
  },
  feed: {
    channels: [],
    news: [],
    error: '',
  },
};

const addRSSData = (url, state, data) => {
  const { feed } = state;
  const { title, description, items } = data;
  const uuid = _.uniqueId();
  feed.channels = [...feed.channels, {
    url,
    uuid,
    title,
    description,
    id: _.uniqueId('channel_'),
  }];
  feed.news = [...feed.news, { items, uuid, id: _.uniqueId('news_') }];
};

const updateRSSNewsData = (url, state, data) => {
  const { feed } = state;
  const { items } = data;
  const { uuid: urlID } = _.find(feed.channels, (item) => item.url === url);
  const newsToUpdate = _.find(feed.news, (item) => item.uuid === urlID);
  const newNews = _.differenceBy(items, newsToUpdate.items, 'title');
  if (newNews.length !== 0) {
    newsToUpdate.items.unshift(...newNews);
  }
};

const getRSSData = (url, state) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  const { feed, form } = state;
  return axios.get(`${proxy}/${url}`)
    .then((res) => {
      const { data } = res;
      const parsedData = parse(data);
      feed.error = '';
      form.state = 'ready';
      return parsedData;
    }).catch((error) => {
      if (error.request) {
        feed.error = error.request.status === 0 ? 'network' : 'access';
      } else {
        feed.error = error.type;
      }
      form.state = 'ready';
      throw new Error(`Network error ${error}`);
    });
};

const updateFeed = (state, url) => getRSSData(url, state)
  .then((data) => {
    updateRSSNewsData(url, state, data);
    setTimeout(() => {
      updateFeed(state, url);
    }, timeout);
  });

const updateValidationState = (state, url) => {
  const { feed: { channels }, form } = state;
  const list = channels.map(({ url }) => url);
  try {
    validate(list, url);
    form.error = '';
    form.state = 'ready';
  } catch ({ type }) {
    form.error = type;
    form.state = 'filling';
  }
};

const getRSS = (state, url) => {
  getRSSData(url, state)
    .then((data) => {
      addRSSData(url, state, data);
      state.form.state = 'finished';
    })
    .then(() => {
      setTimeout(() => {
        updateFeed(state, url);
      }, timeout);
    });
};

export default () => {
  const elements = {
    form: document.querySelector('#form'),
    input: document.querySelector('#url-address'),
  };

  elements.input.addEventListener('input', (e) => {
    e.preventDefault();
    const { target: { value } } = e;
    updateValidationState(state, value);
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    state.form.state = 'loading';
    getRSS(state, url);
  });

  i18next.init({
    lng: 'en',
    debug: false,
    resources,
  }).then((texts) => {
    render(state, texts);
  });
};
